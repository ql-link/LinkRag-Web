import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertCircle, FileText, Loader2, MessageSquare, Plus, RefreshCw, Trash2, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Routes } from '@/routes';
import { useToast } from '@/contexts/ToastContext';
import {
  createParseTask,
  deleteDataset,
  deleteKnowledgeFile,
  enrichKnowledgeFilesWithParseResults,
  getDataset,
  getKnowledgeFiles,
  uploadKnowledgeFile,
} from '@/services/dataset';
import { getConversations } from '@/services/chat';
import type { ConversationDTO, DatasetDTO, KnowledgeFileDTO } from '@/types/api';
import { useTheme } from '@/contexts/ThemeContext';

const SUPPORTED_FILE_SUFFIXES = ['md', 'markdown', 'pdf', 'docx', 'txt'];
const FILE_ACCEPT = SUPPORTED_FILE_SUFFIXES.map((suffix) => `.${suffix}`).join(',');
const SUPPORTED_FILE_HINT = `支持 ${SUPPORTED_FILE_SUFFIXES.join(' / ')}`;

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
  if (file.frontendStatus === 'upload_failed' || file.frontendStatus === 'parse_failed' || file.failureReason || file.parseFailureReason) {
    return 'text-red-500';
  }
  if (file.frontendStatus === 'parsing') return 'text-blue-500';
  if (file.frontendStatus === 'parse_success') return 'text-emerald-500';
  return '';
}

function canSubmitParse(file: KnowledgeFileDTO) {
  return file.isUploadSuccess
    && file.uploadStatus === 'UPLOAD_SUCCESS'
    && !file.failureReason
    && file.frontendStatus !== 'parsing';
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
            ? darkMode ? 'border-[#3b82f6]/45 bg-[#3b82f6]/18' : 'border-primary/35 bg-primary/18'
            : darkMode ? 'border-[#3c3c3c] bg-[#2d2d2d]' : 'border-border-subtle bg-bg-base'
        )}
      >
        <span
          className={cn(
            'absolute left-[3px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
            checked ? darkMode ? 'bg-[#3b82f6]' : 'bg-primary' : darkMode ? 'bg-[#858585]' : 'bg-text-main/35'
          )}
        />
      </span>
      <span className={cn(checked ? (darkMode ? 'text-[#3b82f6]' : 'text-primary') : (darkMode ? 'text-[#cccccc]' : 'text-text-main/70'))}>
        上传后立即解析
      </span>
    </button>
  );
}

export default function DatasetPage() {
  const { darkMode } = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dataset, setDataset] = useState<DatasetDTO | null>(null);
  const [files, setFiles] = useState<KnowledgeFileDTO[]>([]);
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'conversations'>('conversations');
  const [uploading, setUploading] = useState(false);
  const [parseAfterUpload, setParseAfterUpload] = useState(false);
  const [deletingDataset, setDeletingDataset] = useState(false);
  const [deletingFileIds, setDeletingFileIds] = useState<number[]>([]);
  const [parsingFileIds, setParsingFileIds] = useState<number[]>([]);

  useEffect(() => {
    if (id) {
      void loadDataset();
    }
  }, [id]);

  async function loadDataset() {
    if (!id) return;
    const datasetId = Number(id);
    if (Number.isNaN(datasetId)) {
      setDataset(null);
      setErrorMessage('数据集地址不正确。');
      setLoading(false);
      return;
    }

    setErrorMessage('');
    if (dataset) {
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
  }

  async function handleDeleteDataset() {
    if (!dataset) return;
    if (!confirm('确定要删除这个数据集吗？删除后无法恢复。')) return;
    setDeletingDataset(true);
    try {
      await deleteDataset(dataset.id);
      addToast('success', '知识库已删除');
      navigate(Routes.Datasets);
    } catch (error) {
      console.error('Failed to delete dataset:', error);
    } finally {
      setDeletingDataset(false);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !dataset) {
      return;
    }

    setUploading(true);
    try {
      await uploadKnowledgeFile(dataset.id, file, parseAfterUpload);
      addToast('success', parseAfterUpload ? '文件已上传，解析任务已提交' : '文件已上传');
      await loadDataset();
    } catch (error) {
      console.error('Failed to upload knowledge file:', error);
    } finally {
      setUploading(false);
    }
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
      setFiles((prev) => prev.map((item) => item.id === fileId ? { ...item, frontendStatus: 'parsing', parseStatus: 'created' } : item));
      addToast('success', '解析任务已提交');
      await loadDataset();
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
          <Loader2 size={24} className={cn('mb-3 animate-spin', darkMode ? 'text-[#3b82f6]' : 'text-primary')} />
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
            darkMode ? 'bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]' : 'bg-text-main text-white hover:opacity-90'
          )}
        >
          返回数据集列表
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header
        className={cn(
          'h-20 px-8 flex items-center justify-between shrink-0 border-b',
          darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle'
        )}
      >
        <div className="flex flex-col gap-1">
          <Breadcrumb
            items={[
              { label: '首页', path: Routes.Home },
              { label: '知识库', path: Routes.Datasets },
              { label: dataset.name },
            ]}
            darkMode={darkMode}
          />
          <h2 className={cn('text-xl serif-heading', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
            {dataset.name}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(Routes.Chats, { state: { datasetId: dataset.id } })}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors',
              darkMode
                ? 'bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c] border border-[#3c3c3c]'
                : 'bg-white border border-border-subtle hover:border-primary'
            )}
          >
              <MessageSquare size={14} />
              新建对话
            </button>
          <button
            onClick={() => void loadDataset()}
            disabled={refreshing}
            className={cn(
              'p-2 rounded-xl transition-colors',
              darkMode ? 'hover:bg-[#2d2d2d] text-[#858585]' : 'hover:bg-gray-100 text-text-main/40',
              refreshing && 'opacity-60'
            )}
            title="刷新知识库"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleDeleteDataset}
            disabled={deletingDataset}
            className={cn(
              'p-2 rounded-xl transition-colors',
              darkMode ? 'hover:bg-[#2d2d2d] text-[#858585]' : 'hover:bg-gray-100 text-text-main/40',
              deletingDataset && 'opacity-60'
            )}
            title="删除知识库"
          >
            {deletingDataset ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
          </button>
          <input ref={fileInputRef} type="file" accept={FILE_ACCEPT} className="hidden" onChange={handleUpload} />
        </div>
      </header>

      <div
        className={cn(
          'px-8 flex gap-4 shrink-0 border-b',
          darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/50 border-border-subtle'
        )}
      >
        <button
          onClick={() => setActiveTab('conversations')}
          className={cn(
            'py-3 px-1 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors',
            activeTab === 'conversations'
              ? 'border-[#3b82f6] text-[#3b82f6]'
              : darkMode
                ? 'border-transparent text-[#858585] hover:text-[#cccccc]'
                : 'border-transparent text-text-main/50 hover:text-text-main'
          )}
        >
          关联对话 ({conversations.length})
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={cn(
            'py-3 px-1 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors',
            activeTab === 'files'
              ? 'border-[#3b82f6] text-[#3b82f6]'
              : darkMode
                ? 'border-transparent text-[#858585] hover:text-[#cccccc]'
                : 'border-transparent text-text-main/50 hover:text-text-main'
          )}
        >
          知识文件 ({files.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'files' ? (
          <div className="space-y-3">
            <div
              onClick={() => {
                if (!uploading) {
                  fileInputRef.current?.click();
                }
              }}
              className={cn(
                'rounded-2xl border border-dashed p-4 cursor-pointer transition-colors',
                darkMode ? 'bg-[#2d2d2d]/60 border-[#3c3c3c]' : 'bg-white border-border-subtle border-dashed',
                uploading && 'opacity-70'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', darkMode ? 'bg-[#094771]/30' : 'bg-primary/10')}>
                    <Plus size={18} className={darkMode ? 'text-[#3b82f6]' : 'text-primary'} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn('text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>上传文件</p>
                    <p className={cn('mono-label mt-1 truncate', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
                      {SUPPORTED_FILE_HINT}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <ParseAfterUploadSwitch
                    darkMode={darkMode}
                    checked={parseAfterUpload}
                    onToggle={(event) => {
                      event.stopPropagation();
                      setParseAfterUpload((prev) => !prev);
                    }}
                  />
                </div>
              </div>
            </div>
            {files.length === 0 ? (
              <p className={cn('mono-label px-1', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
                暂无知识文件
              </p>
            ) : (
              files.map((file) => {
                const parsing = parsingFileIds.includes(file.id);
                const deleting = deletingFileIds.includes(file.id);
                const canParse = canSubmitParse(file);
                const statusTone = getFileStatusTone(file);

                return (
                <div
                  key={file.id}
                  className={cn(
                    'rounded-xl px-4 py-3 flex items-center justify-between gap-4 transition-colors',
                    darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c] hover:border-[#3b82f6]' : 'art-card hover:border-primary'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                        darkMode ? 'bg-[#3c3c3c]' : 'bg-primary/10'
                      )}
                    >
                      <FileText size={16} className={darkMode ? 'text-[#858585]' : 'text-primary'} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-bold truncate', darkMode ? 'text-[#e0e0e0]' : '')}>
                        {file.originalFilename}
                      </p>
                      <p className={cn('mono-label text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                        {file.fileSuffix.toUpperCase()} · {formatSize(file.fileSize)} ·{' '}
                        <span className={statusTone}>{getFileStatusLabel(file)}</span>
                      </p>
                      <p className={cn('mono-label text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
                        上传于 {formatTime(file.createdAt)}
                      </p>
                      {(file.failureReason || file.parseFailureReason) && (
                        <p className="text-xs text-red-500 mt-1">{file.failureReason || file.parseFailureReason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => void handleParseFile(file.id)}
                      disabled={!canParse || parsing}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50',
                        darkMode ? 'bg-[#094771] text-white hover:bg-[#0a5280]' : 'bg-primary text-white hover:bg-primary/90'
                      )}
                    >
                      {parsing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      {parsing ? '提交中' : '解析'}
                    </button>
                    <button
                      onClick={() => void handleDeleteFile(file.id)}
                      disabled={deleting}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        darkMode ? 'hover:bg-[#3c3c3c] text-[#858585]' : 'hover:bg-gray-100 text-text-main/40'
                      )}
                    >
                      {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.length === 0 ? (
              <div
                className={cn(
                  'text-center py-12 rounded-2xl',
                  darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c]' : 'art-card'
                )}
              >
                <MessageSquare size={32} className={cn('mx-auto mb-3', darkMode ? 'text-[#6b6b6b]' : 'text-text-main/20')} />
                <p className={cn('mono-label mb-2', darkMode ? 'text-[#858585]' : '')}>暂无关联对话</p>
                <p className={cn('text-sm', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>可从当前知识库直接创建</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => navigate(`/chats/${conversation.id}`)}
                  className={cn(
                    'rounded-xl p-4 flex items-center justify-between cursor-pointer transition-colors',
                    darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c] hover:border-[#3b82f6]' : 'art-card hover:border-primary'
                  )}
                >
                  <div>
                    <p className={cn('text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : '')}>{conversation.title}</p>
                    <p className={cn('mono-label text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                      更新于 {formatTime(conversation.updatedAt)}
                    </p>
                  </div>
                  {conversation.isPinned && (
                    <span
                      className={cn(
                        'px-2 py-1 rounded-lg text-[10px] font-bold uppercase',
                        darkMode ? 'bg-[#094771] text-blue-400' : 'bg-blue-100 text-blue-600'
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
    </div>
  );
}
