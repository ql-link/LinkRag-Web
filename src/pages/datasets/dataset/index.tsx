import { useCallback, useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { AlertCircle, FileText, Loader2, MessageSquare, RefreshCw, Settings, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Routes } from '@/routes';
import { useToast } from '@/contexts/ToastContext';
import {
  createParseTask,
  deleteKnowledgeFile,
  enrichKnowledgeFilesWithParseResults,
  getDataset,
  getKnowledgeFiles,
  uploadKnowledgeFile,
} from '@/services/dataset';
import { getConversations } from '@/services/chat';
import type { ConversationDTO, DatasetDTO, KnowledgeFileDTO } from '@/types/api';
import { useParseResultPolling } from '@/hooks/useParseResultPolling';
import {
  KNOWLEDGE_FILE_ACCEPT,
  KNOWLEDGE_FILE_HINT,
  KNOWLEDGE_FILE_UNSUPPORTED_MESSAGE,
  isSupportedKnowledgeFile,
} from '@/lib/knowledge-file';

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

function getFileStatusLabel(file: KnowledgeFileDTO) {
  if (file.frontendStatus === 'upload_failed' || file.failureReason) {
    return '上传失败';
  }
  if (file.frontendStatus === 'parse_waiting') return '待解析';
  if (file.frontendStatus === 'parsing') return '解析中';
  if (file.frontendStatus === 'parse_success') return '解析完成';
  if (file.frontendStatus === 'parse_failed') return '解析失败';
  if (file.parseStatus) {
    return file.parseStatus;
  }
  if (file.uploadStatus === 'UPLOAD_SUCCESS') return '上传成功';
  if (file.uploadStatus === 'UPLOAD_FAILED') return '上传失败';
  return '上传中';
}

function getFileStatusTone(file: KnowledgeFileDTO) {
  if (
    file.frontendStatus === 'upload_failed' ||
    file.frontendStatus === 'parse_failed' ||
    file.failureReason ||
    file.parseFailureReason
  ) {
    return 'text-error';
  }
  if (file.frontendStatus === 'parsing') return 'text-primary';
  if (file.frontendStatus === 'parse_success') return 'text-success';
  return '';
}

function canSubmitParse(file: KnowledgeFileDTO) {
  return (
    file.isUploadSuccess &&
    file.uploadStatus === 'UPLOAD_SUCCESS' &&
    !file.failureReason &&
    file.frontendStatus !== 'parsing'
  );
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
      className="inline-flex items-center gap-2 rounded-full text-xs font-bold transition-opacity"
    >
      <span
        className={cn(
          'relative h-5 w-9 rounded-full border transition-colors',
          checked ? 'border-primary/40 bg-primary/10' : 'border-hairline bg-surface-soft',
        )}
      >
        <span
          className={cn(
            'absolute left-[3px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
            checked ? 'bg-primary' : 'bg-muted',
          )}
        />
      </span>
      <span className={cn(checked ? 'text-primary' : 'text-text-secondary')}>上传后立即解析</span>
    </button>
  );
}

export default function DatasetPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
  const [parseAfterUpload, setParseAfterUpload] = useState(false);
  const [deletingFileIds, setDeletingFileIds] = useState<number[]>([]);
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

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !dataset) {
      return;
    }
    if (!isSupportedKnowledgeFile(file)) {
      addToast('error', KNOWLEDGE_FILE_UNSUPPORTED_MESSAGE);
      return;
    }

    setUploading(true);
    try {
      const shouldPollParse = parseAfterUpload;
      const uploaded = await uploadKnowledgeFile(dataset.id, file, parseAfterUpload);
      addToast('success', parseAfterUpload ? '文件已上传，解析任务已提交' : '文件已上传');
      await pollUntilUploadSettled(uploaded.id, dataset.id, shouldPollParse);
    } catch (error) {
      console.error('Failed to upload knowledge file:', error);
    } finally {
      setUploading(false);
    }
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

  async function handleDeleteFile(fileId: number) {
    if (!confirm('确定删除这个文件吗？')) return;
    removePollingFiles(fileId);
    setDeletingFileIds((prev) => [...prev, fileId]);
    try {
      await deleteKnowledgeFile(fileId);
      setFiles((prev) => prev.filter((item) => item.id !== fileId));
      addToast('success', '文件已删除');
    } catch (error) {
      console.error('Failed to delete knowledge file:', error);
    } finally {
      setDeletingFileIds((prev) => prev.filter((item) => item !== fileId));
    }
  }

  async function handleParseFile(fileId: number) {
    setSubmittingParseFileIds((prev) => (prev.includes(fileId) ? prev : [...prev, fileId]));
    try {
      await createParseTask(fileId);
      setFiles((prev) =>
        prev.map((item) =>
          item.id === fileId
            ? { ...item, frontendStatus: 'parsing', parseStatus: 'created', parseFailureReason: null }
            : item,
        ),
      );
      addPollingFiles(fileId);
      addToast('success', '解析任务已提交');
    } catch (error) {
      console.error('Failed to create parse task:', error);
    } finally {
      setSubmittingParseFileIds((prev) => prev.filter((item) => item !== fileId));
    }
  }

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
    <div className="flex h-full flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-subtle px-8">
        <div className="min-w-0">
          <Breadcrumb
            items={[
              { label: '首页', path: Routes.Home },
              { label: '知识库', path: Routes.Datasets },
              { label: dataset.name },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/datasets/${dataset.id}/parse-config`)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white transition-colors hover:bg-primary-active"
          >
            <Settings size={14} />
            解析配置
          </button>
          <button
            onClick={() => navigate(Routes.Chats, { state: { datasetId: dataset.id } })}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-hairline bg-canvas px-3 text-xs font-bold text-text-secondary transition-colors hover:border-primary/30 hover:text-ink"
          >
            <MessageSquare size={14} className="text-muted" />
            新建对话
          </button>
          <button
            onClick={() => void loadDataset(true)}
            disabled={refreshing}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg border border-hairline bg-canvas px-3 text-xs font-bold text-text-secondary transition-colors hover:border-primary/30 hover:text-ink disabled:cursor-not-allowed',
              refreshing && 'opacity-60',
            )}
            title="刷新知识库"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            刷新
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={KNOWLEDGE_FILE_ACCEPT}
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 bg-canvas">
        <section className="overflow-hidden rounded-2xl border border-hairline bg-bg-card-solid (--)]">
          <div className="flex flex-col gap-3 border-b border-hairline px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {[
                { key: 'files' as const, label: '知识文件', count: files.length },
                { key: 'conversations' as const, label: '关联对话', count: conversations.length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold transition-colors',
                    activeTab === tab.key
                      ? 'bg-primary/10 text-ink'
                      : 'text-muted hover:bg-surface-soft hover:text-ink',
                  )}
                >
                  {tab.label}
                  <span className="ml-1.5 opacity-70">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {activeTab === 'files' ? (
              <div className="space-y-3">
                <div
                  onClick={() => {
                    if (!uploading) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={cn(
                    'flex cursor-pointer flex-col gap-3 rounded-xl border border-dashed border-hairline bg-surface-soft px-4 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between',
                    uploading && 'cursor-wait opacity-70',
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">文件上传</p>
                    <p className="mono-label mt-1 truncate text-muted">{KNOWLEDGE_FILE_HINT}</p>
                  </div>
                  <ParseAfterUploadSwitch
                    checked={parseAfterUpload}
                    onToggle={(event) => {
                      event.stopPropagation();
                      setParseAfterUpload((prev) => !prev);
                    }}
                  />
                </div>
                {files.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-hairline px-5 py-10 text-center text-sm text-muted">
                    暂无知识文件
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => {
                      const parseSubmitting = submittingParseFileIds.includes(file.id);
                      const parseInProgress = file.frontendStatus === 'parsing';
                      const deleting = deletingFileIds.includes(file.id);
                      const canParse = canSubmitParse(file);
                      const statusTone = getFileStatusTone(file);

                      return (
                        <div
                          key={file.id}
                          className="flex items-center justify-between gap-4 rounded-xl border border-hairline bg-bg-card-solid px-4 py-3 transition-colors hover:border-primary/30"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <FileText size={17} className="text-muted" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">{file.originalFilename}</p>
                              <p className="mono-label mt-1 text-[10px] text-muted">
                                {file.fileSuffix.toUpperCase()} · {formatSize(file.fileSize)} · 上传于{' '}
                                {formatTime(file.createdAt)}
                              </p>
                              {(file.failureReason || file.parseFailureReason) && (
                                <p className="mt-1 text-xs text-error">
                                  {file.failureReason || file.parseFailureReason}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={cn('mono-label text-[10px]', statusTone)}>{getFileStatusLabel(file)}</span>
                            <button
                              onClick={() => void handleParseFile(file.id)}
                              disabled={!canParse || parseSubmitting || parseInProgress}
                              className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              {parseSubmitting ? '提交中' : parseInProgress ? '解析中' : '解析'}
                            </button>
                            <button
                              onClick={() => void handleDeleteFile(file.id)}
                              disabled={deleting}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-hairline px-5 py-10 text-center text-sm text-muted">
                    暂无关联对话，可从当前知识库新建对话。
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => navigate(`/chats/${conversation.id}`)}
                      className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-hairline bg-bg-card-solid px-4 py-3 transition-colors hover:border-primary/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{conversation.title}</p>
                        <p className="mono-label mt-1 text-[10px] text-muted">
                          更新于 {formatTime(conversation.updatedAt)}
                        </p>
                      </div>
                      {conversation.isPinned && (
                        <span className="shrink-0 rounded-lg bg-surface-soft px-2 py-1 text-[10px] font-semibold text-text-secondary">
                          已置顶
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
