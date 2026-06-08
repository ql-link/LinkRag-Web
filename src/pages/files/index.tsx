import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Presentation,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';

import { useToast } from '@/contexts/ToastContext';
import {
  createParseTask,
  deleteKnowledgeFile,
  enrichKnowledgeFilesWithParseResults,
  getDatasets,
  getKnowledgeFiles,
  uploadKnowledgeFile,
} from '@/services/dataset';
import type { DatasetDTO, KnowledgeFileDTO } from '@/types/api';

const FILE_TYPES: Record<string, typeof FileText> = {
  PDF: FileText,
  DOCX: FileText,
  PPTX: Presentation,
  XLSX: FileSpreadsheet,
};
const SUPPORTED_FILE_SUFFIXES = ['md', 'markdown', 'pdf', 'docx', 'txt'];
const FILE_ACCEPT = SUPPORTED_FILE_SUFFIXES.map((suffix) => `.${suffix}`).join(',');
const SUPPORTED_FILE_HINT = `支持 ${SUPPORTED_FILE_SUFFIXES.join(' / ')}`;

interface FileWithDataset extends KnowledgeFileDTO {
  dataset: DatasetDTO;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN');
}

function getFileStatus(file: KnowledgeFileDTO) {
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
    return 'text-red-500';
  }
  if (file.frontendStatus === 'parsing') return 'text-primary';
  if (file.frontendStatus === 'parse_success') return 'text-emerald-500';
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

function ParseAfterUploadSwitch({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="inline-flex items-center gap-2 rounded-full text-sm">
      <span
        className={cn(
          'relative h-5 w-9 rounded-full border transition-colors',
          checked ? 'border-primary/35 bg-primary/18' : 'border-border-subtle bg-bg-base',
        )}
      >
        <span
          className={cn(
            'absolute left-[3px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform',
            checked ? 'translate-x-4 bg-primary' : 'translate-x-0 bg-text-main/35',
          )}
        />
      </span>
      <span className={cn(checked ? 'text-primary font-bold' : 'text-text-main/70')}>上传后立即解析</span>
    </button>
  );
}

export default function FilesPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { addToast } = useToast();
  const [searchString, setSearchString] = useState('');
  const [files, setFiles] = useState<FileWithDataset[]>([]);
  const [datasets, setDatasets] = useState<DatasetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [uploadDatasetId, setUploadDatasetId] = useState<number | null>(null);
  const [parseAfterUpload, setParseAfterUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deletingFileIds, setDeletingFileIds] = useState<number[]>([]);
  const [parsingFileIds, setParsingFileIds] = useState<number[]>([]);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setErrorMessage('');
    try {
      const dsResult = await getDatasets(1, 100);
      setDatasets(dsResult.items);

      const nestedResults = await Promise.all(
        dsResult.items.map(async (dataset) => {
          const filesResult = await getKnowledgeFiles(dataset.id, 1, 100);
          const enrichedFiles = await enrichKnowledgeFilesWithParseResults(dataset.id, filesResult.items);
          return enrichedFiles.map((file) => ({ ...file, dataset }));
        }),
      );

      const merged = nestedResults.flat().sort((a, b) => b.id - a.id);
      setFiles(merged);
    } catch (error) {
      console.error('Failed to load files:', error);
      setErrorMessage('文件列表加载失败，请检查后端服务或稍后重试。');
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    setSelectedFile(file);
  }

  async function handleSubmitUpload() {
    if (!selectedFile || !uploadDatasetId) return;
    setUploading(true);
    try {
      const uploaded = await uploadKnowledgeFile(uploadDatasetId, selectedFile, parseAfterUpload);
      addToast('success', parseAfterUpload ? '文件已上传，解析任务已提交' : '文件已上传');
      setSelectedFile(null);
      setUploadDialogOpen(false);
      await pollUntilUploadSettled(uploaded.id, uploadDatasetId);
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setUploading(false);
    }
  }

  async function pollUntilUploadSettled(fileId: number, datasetId: number) {
    const maxAttempts = 20;
    const intervalMs = 1000;
    for (let i = 0; i < maxAttempts; i++) {
      const filesResult = await getKnowledgeFiles(datasetId, 1, 100);
      const target = filesResult.items.find((f) => f.id === fileId);
      if (target && target.uploadStatus !== 'UPLOADING') {
        await loadData();
        return;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    await loadData();
  }

  async function handleDelete(fileId: number) {
    if (!confirm('确定删除这个文件吗？')) return;
    setDeletingFileIds((prev) => [...prev, fileId]);
    try {
      await deleteKnowledgeFile(fileId);
      setFiles((prev) => prev.filter((item) => item.id !== fileId));
      addToast('success', '文件已删除');
    } catch (error) {
      console.error('Failed to delete file:', error);
    } finally {
      setDeletingFileIds((prev) => prev.filter((id) => id !== fileId));
    }
  }

  async function handleParse(fileId: number) {
    setParsingFileIds((prev) => [...prev, fileId]);
    try {
      await createParseTask(fileId);
      addToast('success', '解析任务已提交');
      await loadData();
    } catch (error) {
      console.error('Failed to parse file:', error);
    } finally {
      setParsingFileIds((prev) => prev.filter((id) => id !== fileId));
    }
  }

  const visibleFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesSearch = file.originalFilename.toLowerCase().includes(searchString.toLowerCase());
      const matchesDataset = selectedDatasetId === null || file.dataset.id === selectedDatasetId;
      return matchesSearch && matchesDataset;
    });
  }, [files, searchString, selectedDatasetId]);

  return (
    <div className="h-full flex flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-frosted px-8 backdrop-blur-md">
        <div className="flex flex-col gap-1">
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '文件' }]} />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-main/30" />
            <input
              type="text"
              placeholder="搜索文件..."
              value={searchString}
              onChange={(event) => setSearchString(event.target.value)}
              className="h-9 w-48 rounded-lg border border-border-subtle bg-bg-base/50 pl-9 pr-3 text-xs text-text-main outline-none transition-colors placeholder:text-text-main/35 focus:border-primary/50"
            />
          </div>
          <select
            value={selectedDatasetId ?? ''}
            onChange={(event) => setSelectedDatasetId(event.target.value ? Number(event.target.value) : null)}
            className="h-9 rounded-lg border border-border-subtle bg-bg-base/50 px-3 text-xs text-text-main outline-none transition-colors focus:border-primary/50"
          >
            <option value="">全部知识库</option>
            {datasets.map((dataset) => (
              <option key={dataset.id} value={dataset.id}>
                {dataset.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => void loadData()}
            disabled={loading}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg text-text-main/40 transition-colors hover:bg-text-main/5 hover:text-text-main/70',
              loading && 'opacity-60',
            )}
            title="刷新文件"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-4 flex items-center gap-4 mono-label">
          <span className="text-text-main/70">共 {visibleFiles.length} 个文件</span>
          <span className="text-border-subtle">|</span>
          <span className="text-text-main/50">{SUPPORTED_FILE_HINT}</span>
        </div>

        {loading ? (
          <div className="art-card flex h-56 flex-col items-center justify-center rounded-2xl">
            <Loader2 size={24} className="mb-3 animate-spin text-primary" />
            <p className="mono-label text-text-main/50">正在加载文件</p>
          </div>
        ) : errorMessage ? (
          <div className="art-card flex h-56 flex-col items-center justify-center rounded-2xl text-center">
            <AlertCircle size={26} className="mb-3 text-red-500" />
            <p className="mb-4 text-sm text-text-main">{errorMessage}</p>
            <button
              onClick={() => void loadData()}
              className="rounded-xl bg-text-main px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 dark:bg-[#094771]"
            >
              重试
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              onClick={() => setUploadDialogOpen(true)}
              className="group art-card flex cursor-pointer items-center gap-4 rounded-2xl border-dashed p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary"
            >
              <div className="icon-tile flex h-10 w-10 shrink-0 items-center justify-center shadow-sm transition-transform group-hover:scale-105">
                <Plus size={18} strokeWidth={2} className="text-text-main/50 group-hover:text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-wide text-text-main transition-colors group-hover:text-primary">
                  上传文件
                </p>
                <p className="mono-label mt-1 text-text-main/45">先选择目标知识库，再添加文件，可选择上传后立即解析</p>
              </div>
            </div>

            {visibleFiles.length === 0 ? (
              <div className="art-card flex h-48 flex-col items-center justify-center rounded-2xl border-dashed bg-bg-base/30 text-center">
                <FileText size={30} className="mb-3 text-text-main/20" />
                <p className="mb-2 text-sm font-bold text-text-main">
                  {searchString ? '没有匹配的文件' : '此地仍是留白，等待建立你的第一份档案'}
                </p>
                <p className="text-sm text-text-main/50">
                  {searchString ? '换个关键词试试' : '点击上方卡片上传文件，开始积累知识'}
                </p>
              </div>
            ) : (
              visibleFiles.map((file) => {
                const fileType = file.originalFilename.split('.').pop()?.toUpperCase() || file.fileSuffix.toUpperCase();
                const FileIcon = FILE_TYPES[fileType] || FileText;
                const parsing = parsingFileIds.includes(file.id);
                const deleting = deletingFileIds.includes(file.id);
                const parseDisabled = !canSubmitParse(file) || parsing;

                return (
                  <div
                    key={file.id}
                    className="group art-card flex items-center justify-between gap-4 rounded-2xl p-4 transition-all duration-300 hover:border-primary"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="icon-tile flex h-10 w-10 shrink-0 items-center justify-center shadow-sm transition-transform group-hover:scale-105">
                        <FileIcon size={18} strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="truncate text-sm font-bold tracking-wide text-text-main">
                            {file.originalFilename}
                          </span>
                          <span
                            className={cn(
                              'mono-label shrink-0 text-[10px] font-bold leading-none px-2 py-1 rounded-full border border-border-subtle bg-bg-base/70',
                              getFileStatusTone(file) || 'text-text-main/60',
                            )}
                          >
                            {getFileStatus(file)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-text-main/50 uppercase tracking-wider">
                          <span className="truncate max-w-[120px] text-primary/70 font-semibold">
                            {file.dataset.name}
                          </span>
                          <span>•</span>
                          <span className="shrink-0">{fileType}</span>
                          <span>•</span>
                          <span className="shrink-0">{formatFileSize(file.fileSize)}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden shrink-0 sm:inline">{formatDate(file.createdAt)}</span>
                        </div>
                        {(file.failureReason || file.parseFailureReason) && (
                          <p className="mt-1.5 truncate text-xs text-red-500">
                            {file.failureReason || file.parseFailureReason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => void handleParse(file.id)}
                        disabled={parseDisabled}
                        className="control-surface inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-text-main/65 transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:border-text-main/20 hover:bg-text-main/5 hover:text-text-main"
                        title={parsing ? '解析中...' : '解析文件'}
                      >
                        {parsing && <Loader2 size={14} className="animate-spin" />}
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {parsing ? '提交中' : '解析'}
                        </span>
                      </button>
                      <button
                        onClick={() => void handleDelete(file.id)}
                        disabled={deleting}
                        className="control-surface inline-flex h-8 w-8 items-center justify-center rounded-xl text-text-main/55 transition-colors disabled:cursor-not-allowed disabled:opacity-60 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                        title="删除文件"
                      >
                        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      {uploadDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setUploadDialogOpen(false)} />
          <div className="relative w-[480px] overflow-hidden rounded-2xl border border-border-subtle bg-bg-base shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
              <h3 className="text-lg font-bold text-text-main">上传文件</h3>
              <button
                onClick={() => setUploadDialogOpen(false)}
                className="rounded-xl p-2 text-text-main/50 transition-colors hover:bg-text-main/5"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-6 p-6">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-main">
                  目标知识库
                </label>
                <select
                  value={uploadDatasetId ?? ''}
                  onChange={(event) => setUploadDatasetId(event.target.value ? Number(event.target.value) : null)}
                  className="w-full rounded-xl border border-border-subtle bg-bg-base/50 px-4 py-2.5 text-sm text-text-main outline-none transition-colors focus:border-primary/50"
                >
                  <option value="">选择目标知识库</option>
                  {datasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-main">选择文件</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => inputRef.current?.click()}
                    disabled={!uploadDatasetId}
                    className="flex items-center gap-1.5 rounded-xl border border-border-subtle bg-bg-base/50 px-4 py-2 text-sm text-text-main transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-text-main/5"
                  >
                    <Upload size={14} />
                    选择文件
                  </button>
                  <span className="truncate text-xs text-text-main/60">
                    {selectedFile ? selectedFile.name : '未选择文件'}
                  </span>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={FILE_ACCEPT}
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
                <p className="mono-label mt-2 text-text-main/40">{SUPPORTED_FILE_HINT}</p>
              </div>
              <div className="pt-2">
                <ParseAfterUploadSwitch
                  checked={parseAfterUpload}
                  onToggle={() => setParseAfterUpload((prev) => !prev)}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border-subtle bg-bg-base/30 px-6 py-4">
              <button
                onClick={() => setUploadDialogOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-main transition-colors hover:bg-text-main/5"
              >
                取消
              </button>
              <button
                onClick={() => void handleSubmitUpload()}
                disabled={!uploadDatasetId || !selectedFile || uploading}
                className="rounded-xl bg-text-main px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-90 dark:bg-[#094771]"
              >
                {uploading ? '上传中...' : '上传'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
