import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { AlertCircle, FileUp, Loader2, MessageSquare, RefreshCw, Settings, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { KnowledgeFileIcon } from '@/components/KnowledgeFileIcon';
import {
  KnowledgeFileImportDialog,
  type KnowledgeImportMode,
  type KnowledgeImportPreviewItem,
} from '@/components/KnowledgeFileImportDialog';
import { Routes } from '@/routes';
import { useToast } from '@/contexts/ToastContext';
import {
  createParseTask,
  deleteKnowledgeFile,
  enrichKnowledgeFilesWithParseResults,
  getDataset,
  getDocumentFileCapabilities,
  getKnowledgeFiles,
  uploadKnowledgeFile,
} from '@/services/dataset';
import { deleteConversation, getConversations } from '@/services/chat';
import type { ConversationDTO, DatasetDTO, KnowledgeFileDTO } from '@/types/api';
import { useParseResultPolling } from '@/hooks/useParseResultPolling';
import { KNOWLEDGE_FILE_UNSUPPORTED_MESSAGE, isFailedKnowledgeFile } from '@/lib/knowledge-file';
import { extractDatasetZip } from '@/lib/dataset-zip';
import {
  buildDocumentPackage,
  listKnowledgeDocuments,
  virtualFilesFromFolder,
  type MarkdownDocumentPackage,
  type VirtualFile,
} from '@/lib/virtual-file-tree';
import { ApiError } from '@/lib/api-client';

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes)) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(value: string) {
  if (!value) return '-';
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? value : time.toLocaleString('zh-CN');
}

function normalizeFilename(value: string) {
  return value.trim().toLowerCase();
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = { status: 'fulfilled', value: await run(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

type FileStatusVariant = 'empty' | 'queued' | 'parsing' | 'done' | 'failed';

interface PendingKnowledgeImport {
  mode: KnowledgeImportMode;
  sourceLabel: string;
  items: Array<KnowledgeImportPreviewItem & { uploadPackage: MarkdownDocumentPackage }>;
  selectedPaths: Set<string>;
}

interface MissingAssetsPrompt {
  files: KnowledgeFileDTO[];
  items: Array<{
    fileId: number;
    filename: string;
    missingAssets: string[];
  }>;
}

const fileStatusMeta: Record<FileStatusVariant, { label: string; className: string; dotClassName: string }> = {
  empty: {
    label: '未上传',
    className: 'text-muted',
    dotClassName: 'bg-[#a8a49a]',
  },
  queued: {
    label: '待解析',
    className: 'text-muted',
    dotClassName: 'bg-muted-soft',
  },
  parsing: {
    label: '解析中',
    className: 'text-[#9a6b18]',
    dotClassName: 'animate-pulse bg-[#d4901f]',
  },
  done: {
    label: '已完成',
    className: 'text-[#3f8a55]',
    dotClassName: 'bg-[#5db872]',
  },
  failed: {
    label: '失败',
    className: 'text-[#a83838]',
    dotClassName: 'bg-[#c64545]',
  },
};

function getFileStatusVariant(file: KnowledgeFileDTO): FileStatusVariant {
  if (isFailedKnowledgeFile(file)) return 'failed';
  if (file.frontendStatus === 'parsing') return 'parsing';
  if (file.frontendStatus === 'parse_success') return 'done';
  if (file.frontendStatus === 'parse_waiting' || file.uploadStatus === 'UPLOAD_SUCCESS' || file.parseStatus) {
    return 'queued';
  }
  return 'empty';
}

function FileStatusPill({ file }: { file: KnowledgeFileDTO }) {
  const meta = fileStatusMeta[getFileStatusVariant(file)];
  return (
    <span
      className={cn(
        'inline-flex h-7 w-auto shrink-0 items-center gap-1.5 px-1 text-xs font-semibold leading-none transition-colors duration-200 ease-out lg:w-[74px] lg:gap-[7px] lg:px-0 lg:text-[13px]',
        meta.className,
      )}
    >
      <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dotClassName)} />
      {meta.label}
    </span>
  );
}

function canSubmitParse(file: KnowledgeFileDTO) {
  return (
    file.isUploadSuccess &&
    file.uploadStatus === 'UPLOAD_SUCCESS' &&
    !file.failureReason &&
    file.frontendStatus !== 'parsing'
  );
}

function canSubmitBulkParse(file: KnowledgeFileDTO) {
  return canSubmitParse(file) && file.frontendStatus !== 'parse_success';
}

function getMissingAssetsPromptItem(file: KnowledgeFileDTO, result: Awaited<ReturnType<typeof createParseTask>>) {
  const missingAssets = result.assetSummary?.issues
    .filter((issue) => issue.resolution !== 'MATCHED')
    .map((issue) => issue.normalizedTarget);
  const paths = missingAssets?.length ? missingAssets : result.missingAssets;
  if (result.frontendStatus !== 'asset_missing' || !paths?.length) return null;

  return {
    fileId: file.id,
    filename: file.originalFilename,
    missingAssets: paths,
  };
}

function getMissingAssetsPromptItemFromError(file: KnowledgeFileDTO, error: unknown) {
  if (!(error instanceof ApiError) || error.code !== 30020 || !error.data || typeof error.data !== 'object')
    return null;
  const summary = (error.data as { assetSummary?: KnowledgeFileDTO['assetSummary'] }).assetSummary;
  const paths = summary?.issues
    .filter((issue) => issue.resolution !== 'MATCHED')
    .map((issue) => issue.normalizedTarget);
  if (!paths?.length) return null;
  return { fileId: file.id, filename: file.originalFilename, missingAssets: paths };
}

function ParseAfterUploadSwitch({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => onToggle(event)}
      role="switch"
      aria-checked={checked}
      className="inline-flex h-9 items-center gap-2.5 rounded-lg px-1 text-sm font-semibold text-text-secondary transition-colors hover:text-ink"
    >
      <span>上传后立即解析</span>
      <span
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors duration-200',
          checked ? 'bg-primary/25' : 'bg-muted-soft/70',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow-sm transition-all duration-200',
            checked ? 'translate-x-5 bg-primary' : 'translate-x-0 bg-white',
          )}
        />
      </span>
    </button>
  );
}

export default function DatasetPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const [dataset, setDataset] = useState<DatasetDTO | null>(null);
  const [files, setFiles] = useState<KnowledgeFileDTO[]>([]);
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'conversations'>(() =>
    searchParams.get('tab') === 'conversations' ? 'conversations' : 'files',
  );
  const [uploading, setUploading] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [preparingImport, setPreparingImport] = useState(false);
  const [parseAfterUpload, setParseAfterUpload] = useState(true);
  const [deletingFileIds, setDeletingFileIds] = useState<number[]>([]);
  const [clearFailedFilesOpen, setClearFailedFilesOpen] = useState(false);
  const [clearingFailedFiles, setClearingFailedFiles] = useState(false);
  const [deletingConversationIds, setDeletingConversationIds] = useState<number[]>([]);
  const [filePendingDelete, setFilePendingDelete] = useState<KnowledgeFileDTO | null>(null);
  const [conversationPendingDelete, setConversationPendingDelete] = useState<ConversationDTO | null>(null);
  const [pendingKnowledgeImport, setPendingKnowledgeImport] = useState<PendingKnowledgeImport | null>(null);
  const [missingAssetsPrompt, setMissingAssetsPrompt] = useState<MissingAssetsPrompt | null>(null);
  const [submittingParseFileIds, setSubmittingParseFileIds] = useState<number[]>([]);
  const { addPollingFiles, removePollingFiles } = useParseResultPolling({
    datasetId: dataset?.id ?? null,
    files,
    setFiles,
  });

  const loadDataset = useCallback(
    async (showRefreshing = false) => {
      if (!id) return;
      const datasetId = Number(id);
      if (Number.isNaN(datasetId)) {
        setDataset(null);
        setErrorMessage('数据集地址不正确。');
        setLoading(false);
        return;
      }

      setErrorMessage('');
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const ds = await getDataset(datasetId);
        setDataset(ds);

        const filesResult = await getKnowledgeFiles(ds.id, 1, 100);
        const enrichedFiles = await enrichKnowledgeFilesWithParseResults(ds.id, filesResult.items);

        setFiles(enrichedFiles);

        try {
          const convResult = await getConversations(1, 100);
          setConversations(convResult.items.filter((item) => item.datasetId === ds.id));
        } catch (error) {
          console.error('Failed to load dataset conversations:', error);
          setConversations([]);
        }
      } catch (error) {
        console.error('Failed to load dataset:', error);
        setErrorMessage('知识库详情加载失败，请检查后端服务或稍后重试。');
        setDataset(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (id) {
      void loadDataset();
    }
  }, [id, loadDataset]);

  function openImportDialog() {
    if (!uploading) setImportDialogOpen(true);
  }

  function closeImportDialog() {
    if (uploading) return;
    setImportDialogOpen(false);
    setPendingKnowledgeImport(null);
  }

  async function uploadKnowledgeFiles(packages: MarkdownDocumentPackage[], skippedCount: number) {
    if (!dataset) return;

    setUploading(true);
    try {
      const shouldPollParse = parseAfterUpload;
      const results = await mapWithConcurrency(packages, 3, (item) =>
        uploadKnowledgeFile(dataset.id, item.file, parseAfterUpload, {
          matchMode: item.matchMode,
          documentPath: item.documentPath,
          assets: item.assets,
          inventoryPaths: item.inventoryPaths,
        }),
      );
      const uploadedFiles = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
      const failedCount = results.length - uploadedFiles.length;
      const blockingCount = uploadedFiles.filter((file) => file.assetSummary?.blockingIssues).length;
      addToast(
        failedCount > 0 ? (uploadedFiles.length > 0 ? 'info' : 'error') : 'success',
        [
          uploadedFiles.length > 0 ? `${uploadedFiles.length} 个文件已提交` : '',
          failedCount > 0 ? `${failedCount} 个失败` : '',
          blockingCount > 0 ? `${blockingCount} 个文件存在缺图，已暂停自动解析` : '',
          skippedCount > 0 ? `已跳过 ${skippedCount} 个重复文件` : '',
        ]
          .filter(Boolean)
          .join('，'),
      );
      await Promise.all(uploadedFiles.map((file) => pollUntilUploadSettled(file.id, dataset.id, shouldPollParse)));
    } finally {
      setUploading(false);
    }
  }

  async function prepareKnowledgeImport(
    mode: KnowledgeImportMode,
    sourceLabel: string,
    getTree: () => Promise<VirtualFile[]>,
  ) {
    setImportDialogOpen(true);
    setPendingKnowledgeImport(null);
    setPreparingImport(true);
    try {
      const tree = await getTree();
      const documents = listKnowledgeDocuments(tree);
      if (documents.length === 0) {
        throw new Error(mode === 'zip' ? 'ZIP 中没有可上传文档' : KNOWLEDGE_FILE_UNSUPPORTED_MESSAGE);
      }

      const packages = await Promise.all(documents.map((document) => buildDocumentPackage(document, tree)));
      const existingFilenames = new Set(files.map((file) => normalizeFilename(file.originalFilename)));
      const items = documents.map((document, index) => {
        const duplicateName = mode === 'files' ? document.file.name : document.path;
        const uploadPackage = packages[index];
        return {
          key: document.path,
          name: document.file.name,
          path: document.path,
          size: document.file.size,
          assetCount: uploadPackage.assets.length,
          localReferenceCount: uploadPackage.localReferenceCount,
          duplicate: existingFilenames.has(normalizeFilename(duplicateName)),
          uploadPackage,
        };
      });

      setPendingKnowledgeImport({
        mode,
        sourceLabel,
        items,
        selectedPaths: new Set(items.filter((item) => !item.duplicate).map((item) => item.key)),
      });
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : '文件读取失败');
    } finally {
      setPreparingImport(false);
    }
  }

  async function handleImportSourceSelection(mode: KnowledgeImportMode, selected: File[]) {
    if (selected.length === 0) return;

    if (mode === 'files') {
      await prepareKnowledgeImport(
        'files',
        selected.length === 1 ? selected[0].name : `${selected.length} 个已选文件`,
        async () => virtualFilesFromFolder(selected),
      );
      return;
    }

    if (mode === 'folder') {
      const relativePath = (selected[0] as File & { webkitRelativePath?: string }).webkitRelativePath ?? '';
      const folderName = relativePath.split('/').filter(Boolean)[0] || '所选文件夹';
      await prepareKnowledgeImport('folder', folderName, async () => virtualFilesFromFolder(selected));
      return;
    }

    await prepareZipImport(selected[0]);
  }

  async function prepareZipImport(zip: File) {
    await prepareKnowledgeImport('zip', zip.name, async () => {
      const capabilities = await getDocumentFileCapabilities();
      if (!capabilities.featureEnabled) throw new Error('当前环境未启用 Markdown 图片资源包');
      return extractDatasetZip(zip, capabilities.zip);
    });
  }

  async function handleDroppedImportFiles(droppedFiles: File[]) {
    const zipFiles = droppedFiles.filter((file) => file.name.toLowerCase().endsWith('.zip'));
    if (zipFiles.length > 0) {
      if (droppedFiles.length !== 1) {
        addToast('error', '一次只能拖入一个 ZIP，或拖入多个普通文件');
        return;
      }
      await prepareZipImport(zipFiles[0]);
      return;
    }

    const hasRelativePath = droppedFiles.some((file) =>
      Boolean((file as File & { webkitRelativePath?: string }).webkitRelativePath),
    );
    await prepareKnowledgeImport(
      hasRelativePath ? 'folder' : 'files',
      droppedFiles.length === 1 ? droppedFiles[0].name : `${droppedFiles.length} 个拖入文件`,
      async () => virtualFilesFromFolder(droppedFiles),
    );
  }

  function togglePendingImportItem(key: string) {
    setPendingKnowledgeImport((current) => {
      if (!current) return current;
      const item = current.items.find((candidate) => candidate.key === key);
      if (!item || item.duplicate) return current;
      const selectedPaths = new Set(current.selectedPaths);
      if (selectedPaths.has(key)) selectedPaths.delete(key);
      else selectedPaths.add(key);
      return { ...current, selectedPaths };
    });
  }

  function removePendingImportItem(key: string) {
    setPendingKnowledgeImport((current) => {
      if (!current) return current;
      const selectedPaths = new Set(current.selectedPaths);
      selectedPaths.delete(key);
      return {
        ...current,
        items: current.items.filter((item) => item.key !== key),
        selectedPaths,
      };
    });
  }

  function toggleAllPendingImportItems(selected: boolean) {
    setPendingKnowledgeImport((current) => {
      if (!current) return current;
      return {
        ...current,
        selectedPaths: selected
          ? new Set(current.items.filter((item) => !item.duplicate).map((item) => item.key))
          : new Set(),
      };
    });
  }

  async function handleConfirmKnowledgeImport() {
    const pending = pendingKnowledgeImport;
    if (!pending) return;
    const selectedPackages = pending.items
      .filter((item) => pending.selectedPaths.has(item.key) && !item.duplicate)
      .map((item) => item.uploadPackage);
    if (selectedPackages.length === 0) return;

    const duplicateCount = pending.items.filter((item) => item.duplicate).length;
    await uploadKnowledgeFiles(selectedPackages, duplicateCount);
    setPendingKnowledgeImport(null);
    setImportDialogOpen(false);
  }

  async function pollUntilUploadSettled(fileId: number, datasetId: number, shouldPollParse: boolean) {
    const maxAttempts = 20;
    const intervalMs = 1000;
    for (let i = 0; i < maxAttempts; i++) {
      const filesResult = await getKnowledgeFiles(datasetId, 1, 100);
      const target = filesResult.items.find((f) => f.id === fileId);
      if (target && target.uploadStatus !== 'UPLOADING') {
        const enrichedFiles = await enrichKnowledgeFilesWithParseResults(datasetId, filesResult.items);
        const shouldStartParsePolling = shouldPollParse && target.uploadStatus === 'UPLOAD_SUCCESS';
        const nextFiles = shouldStartParsePolling
          ? enrichedFiles.map((item) => {
              if (
                item.id !== fileId ||
                item.frontendStatus === 'asset_missing' ||
                item.frontendStatus === 'parse_success' ||
                item.frontendStatus === 'parse_failed'
              ) {
                return item;
              }

              return {
                ...item,
                frontendStatus: 'parsing' as const,
                parseStatus: item.parseStatus ?? 'created',
                parseFailureReason: null,
              };
            })
          : enrichedFiles;
        const nextTarget = nextFiles.find((item) => item.id === fileId);
        setFiles(nextFiles);
        if (nextTarget?.frontendStatus === 'parsing') {
          addPollingFiles(fileId);
        }
        return;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    await loadDataset(true);
  }

  async function handleConfirmDeleteFile() {
    if (!filePendingDelete || deletingFileIds.includes(filePendingDelete.id)) return;
    const fileId = filePendingDelete.id;
    removePollingFiles(fileId);
    setDeletingFileIds((prev) => [...prev, fileId]);
    try {
      await deleteKnowledgeFile(fileId);
      setFiles((prev) => prev.filter((item) => item.id !== fileId));
      setFilePendingDelete(null);
      addToast('success', '文件已删除');
    } catch (error) {
      console.error('Failed to delete knowledge file:', error);
    } finally {
      setDeletingFileIds((prev) => prev.filter((item) => item !== fileId));
    }
  }

  async function handleClearFailedFiles() {
    if (clearingFailedFiles) return;

    const candidates = files.filter(isFailedKnowledgeFile).filter((file) => !deletingFileIds.includes(file.id));
    if (candidates.length === 0) {
      setClearFailedFilesOpen(false);
      return;
    }

    const candidateIds = candidates.map((file) => file.id);
    const candidateIdSet = new Set(candidateIds);
    removePollingFiles(candidateIds);
    setClearingFailedFiles(true);
    setDeletingFileIds((prev) => Array.from(new Set([...prev, ...candidateIds])));

    try {
      const results = await mapWithConcurrency(candidates, 3, (file) => deleteKnowledgeFile(file.id));
      const deletedIds = new Set(
        candidates.filter((_, index) => results[index].status === 'fulfilled').map((file) => file.id),
      );
      const failedCount = candidates.length - deletedIds.size;

      results.forEach((result) => {
        if (result.status === 'rejected') {
          console.error('Failed to delete failed knowledge file:', result.reason);
        }
      });

      if (deletedIds.size > 0) {
        setFiles((prev) => prev.filter((file) => !deletedIds.has(file.id)));
      }
      setClearFailedFilesOpen(false);

      if (failedCount === 0) {
        addToast('success', `已清除 ${deletedIds.size} 个失败文件`);
      } else if (deletedIds.size > 0) {
        addToast('info', `已清除 ${deletedIds.size} 个失败文件，${failedCount} 个删除失败`);
      } else {
        addToast('error', '失败文件清除失败，请稍后重试');
      }
    } finally {
      setClearingFailedFiles(false);
      setDeletingFileIds((prev) => prev.filter((id) => !candidateIdSet.has(id)));
    }
  }

  async function handleConfirmDeleteConversation() {
    if (!conversationPendingDelete || deletingConversationIds.includes(conversationPendingDelete.id)) return;
    const conversationId = conversationPendingDelete.id;
    setDeletingConversationIds((prev) => [...prev, conversationId]);
    try {
      await deleteConversation(conversationId);
      setConversations((prev) => prev.filter((item) => item.id !== conversationId));
      setConversationPendingDelete(null);
      addToast('success', '对话已删除');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      addToast('error', '对话删除失败，请稍后重试');
    } finally {
      setDeletingConversationIds((prev) => prev.filter((item) => item !== conversationId));
    }
  }

  function markFilesParsing(fileIds: number[]) {
    if (fileIds.length === 0) return;

    setFiles((prev) =>
      prev.map((item) =>
        fileIds.includes(item.id)
          ? { ...item, frontendStatus: 'parsing', parseStatus: 'created', parseFailureReason: null }
          : item,
      ),
    );
    addPollingFiles(fileIds);
  }

  async function handleParseFile(fileId: number) {
    const file = files.find((item) => item.id === fileId);
    if (!file) return;

    setSubmittingParseFileIds((prev) => (prev.includes(fileId) ? prev : [...prev, fileId]));
    try {
      const result = await createParseTask(fileId);
      const missingAssetsItem = getMissingAssetsPromptItem(file, result);
      if (missingAssetsItem) {
        setMissingAssetsPrompt({
          files: [file],
          items: [missingAssetsItem],
        });
        return;
      }

      markFilesParsing([fileId]);
      addToast('success', '解析任务已提交');
    } catch (error) {
      const missingAssetsItem = getMissingAssetsPromptItemFromError(file, error);
      if (missingAssetsItem) {
        setMissingAssetsPrompt({ files: [file], items: [missingAssetsItem] });
        return;
      }
      console.error('Failed to create parse task:', error);
    } finally {
      setSubmittingParseFileIds((prev) => prev.filter((item) => item !== fileId));
    }
  }

  async function handleConfirmMissingAssetsParse() {
    const prompt = missingAssetsPrompt;
    if (!prompt) return;

    const fileIds = prompt.files.map((file) => file.id);
    setSubmittingParseFileIds((prev) => Array.from(new Set([...prev, ...fileIds])));
    try {
      const results = await Promise.allSettled(prompt.files.map((file) => createParseTask(file.id, true)));
      const successIds = prompt.files
        .filter((_, index) => results[index].status === 'fulfilled')
        .map((file) => file.id);
      const failedCount = results.length - successIds.length;

      if (successIds.length > 0) {
        markFilesParsing(successIds);
        setMissingAssetsPrompt(null);
      }

      if (successIds.length > 0 && failedCount === 0) {
        addToast('success', `${successIds.length} 个解析任务已提交`);
      } else if (successIds.length > 0) {
        addToast('info', `${successIds.length} 个解析任务已提交，${failedCount} 个提交失败`);
      } else {
        addToast('error', '解析任务提交失败，请稍后重试');
      }
    } catch (error) {
      console.error('Failed to continue parse with missing assets:', error);
      addToast('error', '解析任务提交失败，请稍后重试');
    } finally {
      setSubmittingParseFileIds((prev) => prev.filter((id) => !fileIds.includes(id)));
    }
  }

  async function handleParseAllFiles() {
    const candidates = files.filter(canSubmitBulkParse).filter((file) => !submittingParseFileIds.includes(file.id));
    if (candidates.length === 0) {
      addToast('info', '没有待解析文件');
      return;
    }

    const candidateIds = candidates.map((file) => file.id);
    setSubmittingParseFileIds((prev) => Array.from(new Set([...prev, ...candidateIds])));
    try {
      const results = await Promise.allSettled(candidates.map((file) => createParseTask(file.id)));
      const missingAssetsItems = [];
      const successIds = [];
      let failedCount = 0;

      results.forEach((result, index) => {
        const file = candidates[index];
        if (result.status === 'rejected') {
          const missingAssetsItem = getMissingAssetsPromptItemFromError(file, result.reason);
          if (missingAssetsItem) {
            missingAssetsItems.push(missingAssetsItem);
            return;
          }
          failedCount += 1;
          return;
        }

        const missingAssetsItem = getMissingAssetsPromptItem(file, result.value);
        if (missingAssetsItem) {
          missingAssetsItems.push(missingAssetsItem);
          return;
        }

        successIds.push(file.id);
      });

      if (successIds.length > 0) {
        markFilesParsing(successIds);
      }

      if (missingAssetsItems.length > 0) {
        setMissingAssetsPrompt({
          files: candidates.filter((file) => missingAssetsItems.some((item) => item.fileId === file.id)),
          items: missingAssetsItems,
        });
      }

      if (successIds.length > 0 && failedCount === 0) {
        addToast(
          missingAssetsItems.length > 0 ? 'info' : 'success',
          [
            `${successIds.length} 个解析任务已提交`,
            missingAssetsItems.length > 0 ? `${missingAssetsItems.length} 个文件缺少图片，确认后可继续解析` : '',
          ]
            .filter(Boolean)
            .join('，'),
        );
      } else if (successIds.length > 0) {
        addToast('info', `${successIds.length} 个解析任务已提交，${failedCount} 个提交失败`);
      } else if (missingAssetsItems.length > 0) {
        addToast('info', `${missingAssetsItems.length} 个文件缺少图片，确认后可继续解析`);
      } else {
        addToast('error', '解析任务提交失败，请稍后重试');
      }
    } catch (error) {
      console.error('Failed to create parse tasks:', error);
      addToast('error', '解析任务提交失败，请稍后重试');
    } finally {
      setSubmittingParseFileIds((prev) => prev.filter((id) => !candidateIds.includes(id)));
    }
  }

  const deletingPendingFile = filePendingDelete ? deletingFileIds.includes(filePendingDelete.id) : false;
  const deletingPendingConversation = conversationPendingDelete
    ? deletingConversationIds.includes(conversationPendingDelete.id)
    : false;
  const missingAssetsSubmitting = missingAssetsPrompt
    ? missingAssetsPrompt.files.some((file) => submittingParseFileIds.includes(file.id))
    : false;
  const failedFiles = files.filter(isFailedKnowledgeFile);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 size={24} className="mb-3 animate-spin text-ink" />
          <div className="mono-label text-muted">加载中...</div>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <AlertCircle size={30} className="mb-3 text-error" />
        <p className="text-lg mb-2 text-ink">数据集不可用</p>
        <p className="text-sm mb-4 text-muted">{errorMessage || '数据集不存在或无权访问'}</p>
        <button
          onClick={() => navigate(Routes.Datasets)}
          className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider bg-primary text-white hover:bg-primary-active"
        >
          返回数据集列表
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="shrink-0 px-4 pt-3 pb-2 lg:flex lg:h-16 lg:items-center lg:justify-between lg:gap-2 lg:border-b lg:border-border-subtle lg:px-8 lg:py-0">
        <div className="hidden min-w-0 shrink lg:block">
          <Breadcrumb
            items={[
              { label: '首页', path: Routes.Home },
              { label: '知识库', path: Routes.Datasets },
              { label: dataset.name },
            ]}
          />
        </div>
        <div className="lg:hidden">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-6 text-ink">{dataset.name}</h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              <span>{files.length} 个文件</span>
              <span className="h-1 w-1 rounded-full bg-muted-soft" aria-hidden="true" />
              <span>{conversations.length} 个对话</span>
            </div>
          </div>
          {dataset.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-text-secondary">{dataset.description}</p>
          )}
        </div>
        <div className="mt-3 grid grid-cols-[1fr_1fr_auto_auto] items-center gap-1.5 lg:mt-0 lg:flex lg:shrink-0 lg:gap-2 lg:overflow-x-auto">
          <button
            type="button"
            onClick={openImportDialog}
            disabled={uploading}
            className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-2 text-xs font-bold text-white transition-colors duration-200 ease-out hover:bg-primary-active disabled:cursor-wait disabled:opacity-70 lg:h-9 lg:flex-none lg:gap-2 lg:rounded-md lg:px-3"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
            {uploading ? '上传中' : '上传文件'}
          </button>
          <button
            onClick={() => navigate(Routes.Chats, { state: { datasetId: dataset.id } })}
            className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-2 text-xs font-bold text-white transition-colors duration-200 ease-out hover:bg-primary-active lg:h-9 lg:w-auto lg:gap-2 lg:rounded-md lg:border lg:border-border-subtle lg:bg-surface-soft lg:px-3 lg:text-text-secondary lg:hover:border-primary/30 lg:hover:bg-surface-card lg:hover:text-ink"
            aria-label="新建对话"
          >
            <MessageSquare size={14} className="lg:text-muted" />
            <span>新建对话</span>
          </button>
          <button
            onClick={() => void loadDataset(true)}
            disabled={refreshing}
            className={cn(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-soft text-text-secondary transition-colors duration-200 ease-out hover:border-primary/30 hover:bg-surface-card hover:text-ink disabled:cursor-not-allowed lg:h-9 lg:w-auto lg:gap-2 lg:rounded-md lg:px-3 lg:text-xs lg:font-bold',
              refreshing && 'opacity-60',
            )}
            title="刷新知识库"
            aria-label="刷新知识库"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden lg:inline">刷新</span>
          </button>
          <button
            onClick={() => navigate(`/datasets/${dataset.id}/parse-config`)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-soft text-text-secondary transition-colors duration-200 ease-out hover:border-primary/30 hover:bg-surface-card hover:text-ink lg:h-9 lg:w-auto lg:border-0 lg:bg-primary lg:px-4 lg:text-xs lg:font-bold lg:text-white lg:hover:bg-primary-active"
            aria-label="解析配置"
          >
            <Settings size={14} />
            <span className="hidden lg:inline">解析配置</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-canvas px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pt-8 lg:pb-8">
        <section>
          <div className="flex flex-col gap-3 px-0 py-3 lg:flex-row lg:items-center lg:justify-between lg:border-b lg:border-hairline lg:px-5 lg:py-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-soft p-1 lg:flex lg:items-center lg:gap-2 lg:bg-transparent lg:p-0">
              {[
                { key: 'files' as const, label: '知识文件', count: files.length },
                { key: 'conversations' as const, label: '历史对话', count: conversations.length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'relative inline-flex h-9 items-center justify-center overflow-hidden rounded-lg px-3 text-xs font-semibold transition-all duration-200 ease-out active:scale-[0.98]',
                    activeTab === tab.key
                      ? 'bg-canvas text-ink shadow-sm lg:bg-primary/10 lg:shadow-[inset_0_0_0_1px_rgba(212,163,115,0.12)]'
                      : 'text-muted hover:bg-canvas/70 hover:text-ink lg:hover:-translate-y-0.5 lg:hover:bg-surface-soft',
                  )}
                >
                  <span className="relative z-10">{tab.label}</span>
                  <span className="relative z-10 ml-1.5 opacity-70">{tab.count}</span>
                </button>
              ))}
            </div>
            {activeTab === 'files' && (
              <div className="flex items-center gap-2.5 px-1 lg:px-0">
                <ParseAfterUploadSwitch
                  checked={parseAfterUpload}
                  onToggle={(event) => {
                    event.stopPropagation();
                    setParseAfterUpload((prev) => !prev);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setClearFailedFilesOpen(true)}
                  disabled={
                    clearingFailedFiles ||
                    deletingFileIds.length > 0 ||
                    submittingParseFileIds.length > 0 ||
                    failedFiles.length === 0
                  }
                  className="inline-flex h-9 items-center px-1 text-sm font-semibold text-error transition-colors hover:text-[#a83838] disabled:cursor-not-allowed disabled:text-muted-soft"
                >
                  {clearingFailedFiles ? '清除中' : '清除全部失败文件'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleParseAllFiles()}
                  disabled={
                    clearingFailedFiles ||
                    submittingParseFileIds.length > 0 ||
                    files.filter(canSubmitBulkParse).length === 0
                  }
                  className="inline-flex h-9 items-center px-1 text-sm font-semibold text-primary transition-colors hover:text-primary-active disabled:cursor-not-allowed disabled:text-muted-soft"
                >
                  {submittingParseFileIds.length > 0 ? '提交中' : '全部解析'}
                </button>
              </div>
            )}
          </div>

          <div className="pt-1 lg:p-5">
            {activeTab === 'files' ? (
              <div key="files" className="space-y-2 [animation:datasetTabIn_240ms_ease-out] lg:space-y-3">
                {files.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-hairline px-5 py-10 text-center text-sm text-muted transition-colors duration-200 hover:border-primary/25 hover:bg-surface-soft/60">
                    暂无知识文件，点击顶部上传文件添加内容。
                  </div>
                ) : (
                  <div className="space-y-1 lg:space-y-2">
                    {files.map((file) => {
                      const parseSubmitting = submittingParseFileIds.includes(file.id);
                      const parseInProgress = file.frontendStatus === 'parsing';
                      const deleting = deletingFileIds.includes(file.id);
                      const canParse = canSubmitParse(file);

                      return (
                        <div
                          key={file.id}
                          className="group/file flex items-center justify-between gap-3 rounded-lg px-1 py-2.5 transition-all duration-200 ease-out active:bg-surface-soft/55 lg:gap-4 lg:px-3 lg:py-3 lg:hover:-translate-y-0.5 lg:hover:bg-surface-soft/70"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <KnowledgeFileIcon suffix={file.fileSuffix} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">{file.originalFilename}</p>
                              <p className="mono-label mt-1 truncate text-[10px] text-muted">
                                {file.fileSuffix.toUpperCase()} · {formatSize(file.fileSize)}
                              </p>
                              {(file.failureReason || file.parseFailureReason) && (
                                <p className="mt-1 text-xs text-error">
                                  {file.failureReason || file.parseFailureReason}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5 lg:gap-2">
                            <FileStatusPill file={file} />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => void handleParseFile(file.id)}
                                disabled={!canParse || parseSubmitting || parseInProgress}
                                className="inline-flex h-8 items-center rounded-md bg-primary/10 px-2.5 text-xs font-semibold text-primary transition-all duration-200 ease-out hover:bg-primary/15 hover:text-primary-active active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-transparent disabled:text-muted-soft lg:px-3"
                              >
                                {parseSubmitting ? '提交中' : parseInProgress ? '解析中' : '解析'}
                              </button>
                              <button
                                onClick={() => setFilePendingDelete(file)}
                                disabled={deleting}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-all duration-200 ease-out hover:bg-error/10 hover:text-error active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="删除文件"
                              >
                                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div key="conversations" className="space-y-1 [animation:datasetTabIn_240ms_ease-out] lg:space-y-2">
                {conversations.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-hairline px-5 py-10 text-center text-sm text-muted transition-colors duration-200 hover:border-primary/25 hover:bg-surface-soft/60">
                    暂无历史对话，可点击顶部新建对话。
                  </div>
                ) : (
                  conversations.map((conversation) => {
                    const deleting = deletingConversationIds.includes(conversation.id);

                    return (
                      <div
                        key={conversation.id}
                        onClick={() => navigate(`/chats/${conversation.id}`)}
                        className="group/conversation flex cursor-pointer items-center justify-between gap-4 rounded-lg px-1 py-2.5 transition-all duration-200 ease-out active:scale-[0.995] active:bg-surface-soft/55 lg:px-3 lg:py-3.5 lg:hover:-translate-y-0.5 lg:hover:bg-surface-soft/70 lg:active:translate-y-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold leading-5 text-ink">
                            {(conversation.title ?? '新对话').trim() || '新对话'}
                          </p>
                          <p className="mt-1 text-[11px] leading-4 text-muted-soft">
                            更新于 {formatTime(conversation.updatedAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 opacity-75 transition-opacity duration-200 group-hover/conversation:opacity-100">
                          {conversation.isPinned && (
                            <span className="rounded-lg bg-surface-soft px-2 py-1 text-[10px] font-semibold text-text-secondary">
                              已置顶
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setConversationPendingDelete(conversation);
                            }}
                            disabled={deleting}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-all duration-200 ease-out hover:bg-error/10 hover:text-error active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="删除对话"
                            title="删除对话"
                          >
                            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <KnowledgeFileImportDialog
        open={importDialogOpen}
        sourceLabel={pendingKnowledgeImport?.sourceLabel ?? ''}
        items={pendingKnowledgeImport?.items ?? []}
        selectedKeys={pendingKnowledgeImport?.selectedPaths ?? new Set()}
        preparing={preparingImport}
        uploading={uploading}
        onClose={closeImportDialog}
        onSelectFiles={(mode, selected) => void handleImportSourceSelection(mode, selected)}
        onDropFiles={(droppedFiles) => void handleDroppedImportFiles(droppedFiles)}
        onRemoveItem={removePendingImportItem}
        onToggleItem={togglePendingImportItem}
        onToggleAll={toggleAllPendingImportItems}
        onUpload={() => void handleConfirmKnowledgeImport()}
      />

      <ConfirmDialog
        open={Boolean(missingAssetsPrompt)}
        title="仍有图片未上传"
        confirmLabel="继续解析"
        cancelLabel="取消"
        confirmVariant="primary"
        loading={missingAssetsSubmitting}
        loadingLabel="提交中"
        onCancel={() => {
          if (!missingAssetsSubmitting) setMissingAssetsPrompt(null);
        }}
        onConfirm={() => void handleConfirmMissingAssetsParse()}
      >
        <p>当前文档仍有部分图片未上传，解析后这些图片可能无法读取。是否继续解析？</p>
        <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border border-hairline bg-surface-soft px-3 py-3">
          {missingAssetsPrompt?.items.map((item) => (
            <div key={item.fileId}>
              <p className="truncate text-xs font-semibold text-ink">{item.filename}</p>
              <ul className="mt-2 space-y-1 font-mono text-xs text-text-secondary">
                {item.missingAssets.map((asset) => (
                  <li key={asset} className="truncate">
                    {asset}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={clearFailedFilesOpen}
        title="清除全部失败文件？"
        confirmLabel="清除"
        loading={clearingFailedFiles}
        loadingLabel="清除中"
        disabled={failedFiles.length === 0}
        onCancel={() => {
          if (!clearingFailedFiles) setClearFailedFilesOpen(false);
        }}
        onConfirm={() => void handleClearFailedFiles()}
      >
        <p>
          将删除当前 <strong className="font-bold text-ink">{failedFiles.length}</strong> 个失败文件。
        </p>
        <p className="text-muted">删除后，相关解析结果与召回内容也会一并移除。</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(filePendingDelete)}
        title="删除文件？"
        confirmLabel="删除"
        loading={deletingPendingFile}
        onCancel={() => {
          if (!deletingPendingFile) setFilePendingDelete(null);
        }}
        onConfirm={() => void handleConfirmDeleteFile()}
      >
        <p>
          这会删除 <strong className="font-bold text-ink">{filePendingDelete?.originalFilename}</strong>。
        </p>
        <p className="text-muted">文件删除后，相关解析结果与召回内容将不再用于知识库问答。</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(conversationPendingDelete)}
        title="删除对话？"
        confirmLabel="删除"
        loading={deletingPendingConversation}
        onCancel={() => {
          if (!deletingPendingConversation) setConversationPendingDelete(null);
        }}
        onConfirm={() => void handleConfirmDeleteConversation()}
      >
        <p>
          这会删除 <strong className="font-bold text-ink">{conversationPendingDelete?.title || '新对话'}</strong>。
        </p>
        <p className="text-muted">对话删除后，历史问答记录将不再显示。</p>
      </ConfirmDialog>
    </div>
  );
}
