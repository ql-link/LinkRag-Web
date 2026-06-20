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
import { useTheme } from '@/contexts/ThemeContext';
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
    return 'text-red-500';
  }
  if (file.frontendStatus === 'parsing') return 'text-blue-500';
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

function ParseAfterUploadSwitch({
  darkMode,
  checked,
  onToggle,
}: {
  darkMode?: boolean;
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
          checked
            ? darkMode
              ? 'border-[#3b82f6]/45 bg-[#3b82f6]/18'
              : 'border-primary/35 bg-primary/18'
            : darkMode
              ? 'border-[#3c3c3c] bg-[#2d2d2d]'
              : 'border-border-subtle bg-bg-base',
        )}
      >
        <span
          className={cn(
            'absolute left-[3px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
            checked ? (darkMode ? 'bg-[#3b82f6]' : 'bg-primary') : darkMode ? 'bg-[#858585]' : 'bg-text-main/35',
          )}
        />
      </span>
      <span
        className={cn(
          checked ? (darkMode ? 'text-[#3b82f6]' : 'text-primary') : darkMode ? 'text-[#cccccc]' : 'text-text-main/70',
        )}
      >
        上传后立即解析
      </span>
    </button>
  );
}

export default function DatasetPage() {
  const { darkMode } = useTheme();
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
  const [parsingFileIds, setParsingFileIds] = useState<number[]>([]);

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
      const uploaded = await uploadKnowledgeFile(dataset.id, file, parseAfterUpload);
      addToast('success', parseAfterUpload ? '文件已上传，解析任务已提交' : '文件已上传');
      await pollUntilUploadSettled(uploaded.id, dataset.id);
    } catch (error) {
      console.error('Failed to upload knowledge file:', error);
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
        const enrichedFiles = await enrichKnowledgeFilesWithParseResults(datasetId, filesResult.items);
        setFiles(enrichedFiles);
        return;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    await loadDataset(true);
  }

  async function handleDeleteFile(fileId: number) {
    if (!confirm('确定删除这个文件吗？')) return;
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
    setParsingFileIds((prev) => [...prev, fileId]);
    try {
      await createParseTask(fileId);
      setFiles((prev) =>
        prev.map((item) =>
          item.id === fileId ? { ...item, frontendStatus: 'parsing', parseStatus: 'created' } : item,
        ),
      );
      addToast('success', '解析任务已提交');
      await loadDataset(true);
    } catch (error) {
      console.error('Failed to create parse task:', error);
    } finally {
      setParsingFileIds((prev) => prev.filter((item) => item !== fileId));
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 size={24} className={cn('mb-3 animate-spin', darkMode ? 'text-[#d4d4d4]' : 'text-[#1f1f1f]')} />
          <div className={cn('mono-label', darkMode ? 'text-[#858585]' : '')}>加载中...</div>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <AlertCircle size={30} className="mb-3 text-red-500" />
        <p className={cn('text-lg mb-2', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>数据集不可用</p>
        <p className={cn('text-sm mb-4', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
          {errorMessage || '数据集不存在或无权访问'}
        </p>
        <button
          onClick={() => navigate(Routes.Datasets)}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider',
            darkMode ? 'bg-[#8A7662] text-white hover:bg-[#7B6B5D]' : 'bg-[#7B6B5D] text-white hover:opacity-90',
          )}
        >
          返回数据集列表
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header
        className={cn(
          'flex h-16 shrink-0 items-center justify-between border-b px-8 backdrop-blur-md',
          darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white/80',
        )}
      >
        <div className="min-w-0">
          <Breadcrumb
            items={[
              { label: '首页', path: Routes.Home },
              { label: '知识库', path: Routes.Datasets },
              { label: dataset.name },
            ]}
            darkMode={darkMode}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/datasets/${dataset.id}/parse-config`)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold transition-opacity hover:opacity-90',
              darkMode ? 'bg-[#8A7662] text-white hover:bg-[#7B6B5D]' : 'bg-[#7B6B5D] text-white hover:opacity-90',
            )}
          >
            <Settings size={14} className="text-[#4F7FA8]" />
            解析配置
          </button>
          <button
            onClick={() => navigate(Routes.Chats, { state: { datasetId: dataset.id } })}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors',
              darkMode
                ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]'
                : 'border-border-subtle bg-white text-text-main hover:border-[#1f1f1f]',
            )}
          >
            <MessageSquare size={14} className="text-[#7B6B5D]" />
            新建对话
          </button>
          <button
            onClick={() => void loadDataset(true)}
            disabled={refreshing}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed',
              darkMode
                ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]'
                : 'border-border-subtle bg-white text-text-main hover:bg-gray-100',
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

      <main className={cn('flex-1 overflow-y-auto p-8', darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base')}>
        <section
          className={cn(
            'overflow-hidden rounded-[18px] border shadow-sm',
            darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white/55',
          )}
        >
          <div
            className={cn(
              'flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between',
              darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
            )}
          >
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
                    'inline-flex h-9 items-center rounded-md px-3 text-xs font-semibold transition-colors',
                    activeTab === tab.key
                      ? darkMode
                        ? 'bg-[#8A7662] text-white'
                        : 'bg-[#7B6B5D] text-white'
                      : darkMode
                        ? 'text-[#858585] hover:bg-[#2d2d2d] hover:text-[#cccccc]'
                        : 'text-text-main/55 hover:bg-bg-base hover:text-text-main',
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
                    'flex cursor-pointer flex-col gap-3 rounded-[14px] border border-dashed px-4 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between',
                    darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]/45' : 'border-border-subtle bg-bg-base/45',
                    uploading && 'cursor-wait opacity-70',
                  )}
                >
                  <div className="min-w-0">
                    <p className={cn('text-sm font-semibold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                      文件上传
                    </p>
                    <p className={cn('mono-label mt-1 truncate', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
                      {KNOWLEDGE_FILE_HINT}
                    </p>
                  </div>
                  <ParseAfterUploadSwitch
                    darkMode={darkMode}
                    checked={parseAfterUpload}
                    onToggle={(event) => {
                      event.stopPropagation();
                      setParseAfterUpload((prev) => !prev);
                    }}
                  />
                </div>

                {files.length === 0 ? (
                  <div
                    className={cn(
                      'rounded-[14px] border border-dashed px-5 py-10 text-center text-sm',
                      darkMode ? 'border-[#3c3c3c] text-[#858585]' : 'border-border-subtle text-text-main/45',
                    )}
                  >
                    暂无知识文件
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => {
                      const parsing = parsingFileIds.includes(file.id);
                      const deleting = deletingFileIds.includes(file.id);
                      const canParse = canSubmitParse(file);
                      const statusTone = getFileStatusTone(file);

                      return (
                        <div
                          key={file.id}
                          className={cn(
                            'flex items-center justify-between gap-4 rounded-[14px] border px-4 py-3 transition-colors',
                            darkMode
                              ? 'border-[#3c3c3c] bg-[#1f1f1f] hover:border-[#4a4a4a]'
                              : 'border-border-subtle bg-white hover:border-[#1f1f1f]',
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <FileText size={17} className="text-[#5E9B73]" />
                            <div className="min-w-0">
                              <p className={cn('truncate text-sm font-semibold', darkMode ? 'text-[#e0e0e0]' : '')}>
                                {file.originalFilename}
                              </p>
                              <p
                                className={cn(
                                  'mono-label mt-1 text-[10px]',
                                  darkMode ? 'text-[#858585]' : 'text-text-main/50',
                                )}
                              >
                                {file.fileSuffix.toUpperCase()} · {formatSize(file.fileSize)} · 上传于{' '}
                                {formatTime(file.createdAt)}
                              </p>
                              {(file.failureReason || file.parseFailureReason) && (
                                <p className="mt-1 text-xs text-red-500">
                                  {file.failureReason || file.parseFailureReason}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={cn('mono-label text-[10px]', statusTone)}>{getFileStatusLabel(file)}</span>
                            <button
                              onClick={() => void handleParseFile(file.id)}
                              disabled={!canParse || parsing}
                              className={cn(
                                'inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45',
                                darkMode ? 'bg-[#8A7662] text-white' : 'bg-[#7B6B5D] text-white',
                              )}
                            >
                              {parsing ? '提交中' : '解析'}
                            </button>
                            <button
                              onClick={() => void handleDeleteFile(file.id)}
                              disabled={deleting}
                              className={cn(
                                'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                                darkMode
                                  ? 'text-[#858585] hover:bg-[#2d2d2d] hover:text-red-400'
                                  : 'text-text-main/45 hover:bg-red-50 hover:text-red-500',
                              )}
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
                  <div
                    className={cn(
                      'rounded-[14px] border border-dashed px-5 py-10 text-center text-sm',
                      darkMode ? 'border-[#3c3c3c] text-[#858585]' : 'border-border-subtle text-text-main/45',
                    )}
                  >
                    暂无关联对话，可从当前知识库新建对话。
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => navigate(`/chats/${conversation.id}`)}
                      className={cn(
                        'flex cursor-pointer items-center justify-between gap-4 rounded-[14px] border px-4 py-3 transition-colors',
                        darkMode
                          ? 'border-[#3c3c3c] bg-[#1f1f1f] hover:border-[#4a4a4a]'
                          : 'border-border-subtle bg-white hover:border-[#1f1f1f]',
                      )}
                    >
                      <div className="min-w-0">
                        <p className={cn('truncate text-sm font-semibold', darkMode ? 'text-[#e0e0e0]' : '')}>
                          {conversation.title}
                        </p>
                        <p
                          className={cn(
                            'mono-label mt-1 text-[10px]',
                            darkMode ? 'text-[#858585]' : 'text-text-main/50',
                          )}
                        >
                          更新于 {formatTime(conversation.updatedAt)}
                        </p>
                      </div>
                      {conversation.isPinned && (
                        <span
                          className={cn(
                            'shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold',
                            darkMode ? 'bg-[#2d2d2d] text-[#cccccc]' : 'bg-bg-base text-text-main/60',
                          )}
                        >
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
