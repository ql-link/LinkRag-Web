import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { FileText, MessageSquare, RefreshCw, Trash2, Upload, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Routes } from '@/routes';
import {
  createParseTask,
  deleteDataset,
  deleteKnowledgeFile,
  getDataset,
  getKnowledgeFiles,
  uploadKnowledgeFile,
} from '@/services/dataset';
import { getConversations } from '@/services/chat';
import type { ConversationDTO, DatasetDTO, KnowledgeFileDTO } from '@/types/api';

interface DatasetPageProps {
  darkMode?: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

function getFileStatusLabel(file: KnowledgeFileDTO) {
  if (file.failureReason) {
    return '上传失败';
  }
  if (file.parseStatus) {
    return file.parseStatus;
  }
  return file.uploadStatus;
}

export default function DatasetPage({ darkMode }: DatasetPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dataset, setDataset] = useState<DatasetDTO | null>(null);
  const [files, setFiles] = useState<KnowledgeFileDTO[]>([]);
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'files' | 'conversations'>('files');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (id) {
      void loadDataset();
    }
  }, [id]);

  async function loadDataset() {
    if (!id) return;
    try {
      const ds = await getDataset(Number(id));
      setDataset(ds);

      const [filesResult, convResult] = await Promise.all([
        getKnowledgeFiles(ds.id, 1, 100),
        getConversations(1, 100),
      ]);

      setFiles(filesResult.items);
      setConversations(convResult.items.filter((item) => item.datasetId === ds.id));
    } catch (error) {
      console.error('Failed to load dataset:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDataset() {
    if (!dataset) return;
    if (!confirm('确定要删除这个数据集吗？删除后无法恢复。')) return;
    try {
      await deleteDataset(dataset.id);
      navigate(Routes.Datasets);
    } catch (error) {
      console.error('Failed to delete dataset:', error);
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
      await uploadKnowledgeFile(dataset.id, file);
      await loadDataset();
    } catch (error) {
      console.error('Failed to upload knowledge file:', error);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteFile(fileId: number) {
    if (!confirm('确定删除这个文件吗？')) return;
    try {
      await deleteKnowledgeFile(fileId);
      setFiles((prev) => prev.filter((item) => item.id !== fileId));
    } catch (error) {
      console.error('Failed to delete knowledge file:', error);
    }
  }

  async function handleParseFile(fileId: number) {
    try {
      await createParseTask(fileId);
      await loadDataset();
    } catch (error) {
      console.error('Failed to create parse task:', error);
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={cn('mono-label', darkMode ? 'text-[#858585]' : '')}>加载中...</div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className={cn('text-lg mb-4', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>数据集不存在</p>
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
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors',
              darkMode ? 'bg-[#094771] text-white hover:bg-[#0a5280]' : 'bg-text-main text-white hover:opacity-90',
              uploading && 'opacity-70'
            )}
          >
            <Upload size={14} />
            {uploading ? '上传中' : '上传文件'}
          </button>
          <button
            onClick={() => void loadDataset()}
            className={cn(
              'p-2 rounded-xl transition-colors',
              darkMode ? 'hover:bg-[#2d2d2d] text-[#858585]' : 'hover:bg-gray-100 text-text-main/40'
            )}
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handleDeleteDataset}
            className={cn(
              'p-2 rounded-xl transition-colors',
              darkMode ? 'hover:bg-[#2d2d2d] text-[#858585]' : 'hover:bg-gray-100 text-text-main/40'
            )}
          >
            <Trash2 size={18} />
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
      </header>

      <div
        className={cn(
          'px-8 flex gap-4 shrink-0 border-b',
          darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/50 border-border-subtle'
        )}
      >
        <button
          onClick={() => setActiveTab('files')}
          className={cn(
            'py-3 px-1 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors',
            activeTab === 'files'
              ? 'border-[#c586c0] text-[#c586c0]'
              : darkMode
                ? 'border-transparent text-[#858585] hover:text-[#cccccc]'
                : 'border-transparent text-text-main/50 hover:text-text-main'
          )}
        >
          知识文件 ({files.length})
        </button>
        <button
          onClick={() => setActiveTab('conversations')}
          className={cn(
            'py-3 px-1 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors',
            activeTab === 'conversations'
              ? 'border-[#c586c0] text-[#c586c0]'
              : darkMode
                ? 'border-transparent text-[#858585] hover:text-[#cccccc]'
                : 'border-transparent text-text-main/50 hover:text-text-main'
          )}
        >
          关联对话 ({conversations.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'files' ? (
          <div className="space-y-3">
            {files.length === 0 ? (
              <div
                className={cn(
                  'text-center py-12 rounded-2xl',
                  darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c]' : 'art-card'
                )}
              >
                <FileText size={32} className={cn('mx-auto mb-3', darkMode ? 'text-[#6b6b6b]' : 'text-text-main/20')} />
                <p className={cn('mono-label mb-2', darkMode ? 'text-[#858585]' : '')}>暂无知识文件</p>
                <p className={cn('text-sm', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>点击右上角开始上传</p>
              </div>
            ) : (
              files.map((file) => (
                <div
                  key={file.id}
                  className={cn(
                    'rounded-xl p-4 flex items-center justify-between gap-4',
                    darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c]' : 'art-card'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        darkMode ? 'bg-[#3c3c3c]' : 'bg-primary/10'
                      )}
                    >
                      <FileText size={18} className={darkMode ? 'text-[#858585]' : 'text-primary'} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-bold truncate', darkMode ? 'text-[#e0e0e0]' : '')}>
                        {file.originalFilename}
                      </p>
                      <p className={cn('mono-label text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                        {file.fileSuffix.toUpperCase()} · {formatSize(file.fileSize)} · {getFileStatusLabel(file)}
                      </p>
                      {file.failureReason && (
                        <p className="text-xs text-red-500 mt-1">{file.failureReason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => void handleParseFile(file.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider',
                        darkMode ? 'bg-[#094771] text-white hover:bg-[#0a5280]' : 'bg-primary text-white hover:bg-primary/90'
                      )}
                    >
                      <Wand2 size={12} />
                      解析
                    </button>
                    <button
                      onClick={() => void handleDeleteFile(file.id)}
                      className={cn(
                        'p-2 rounded-xl transition-colors',
                        darkMode ? 'hover:bg-[#3c3c3c] text-[#858585]' : 'hover:bg-gray-100 text-text-main/40'
                      )}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
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
                    darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c] hover:border-[#c586c0]' : 'art-card hover:border-primary'
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
