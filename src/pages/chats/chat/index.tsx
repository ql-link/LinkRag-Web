import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, ArrowUpDown, ChevronDown, FileText, Loader2, Search, Send, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Routes } from '@/routes';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { getMessages, getConversations } from '@/services/chat';
import { getDataset, getKnowledgeFiles, uploadKnowledgeFile } from '@/services/dataset';
import { getLLMConfigs } from '@/services/llm';
import { recall, isRecallError, isRecallAborted, type RecallError } from '@/services/recall';
import type { MessageDTO, ConversationDTO, KnowledgeFileDTO, LLMConfigDTO, RecallHit } from '@/types/api';
import { useTheme } from '@/contexts/ThemeContext';

function ParseAfterUploadSwitch({
  darkMode,
  checked,
  onToggle,
}: {
  darkMode?: boolean;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} className="inline-flex items-center gap-2 rounded-full text-xs font-bold">
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
          'whitespace-nowrap leading-none',
          checked ? (darkMode ? 'text-[#3b82f6]' : 'text-primary') : darkMode ? 'text-[#cccccc]' : 'text-text-main/70',
        )}
      >
        上传后立即解析
      </span>
    </button>
  );
}

/** 把召回错误码翻译成给用户看的中文提示。 */
function recallErrorMessage(error: unknown): string {
  if (isRecallError(error)) {
    const e = error as RecallError;
    switch (e.code) {
      case 'RECALL_SESSION_UNAUTHORIZED':
        return '登录已过期，请重新登录后重试';
      case 'RECALL_SCOPE_FORBIDDEN':
        return '无权访问所选知识库';
      case 'RECALL_INVALID_REQUEST':
        return '请求参数有误，请修改后重试';
      case 'RECALL_RATE_LIMITED':
        return '召回请求过于频繁，请稍后重试';
      case 'RECALL_TIMEOUT':
        return '召回超时，请稍后重试';
      case 'RECALL_ALL_SOURCES_FAILED':
        return '召回失败：所有检索路均不可用';
      case 'RECALL_NETWORK_ERROR':
        return '网络异常，请稍后重试';
      default:
        return e.message || '召回失败';
    }
  }
  return error instanceof Error ? error.message : '召回失败';
}

function RecallPanel({
  darkMode,
  recalling,
  hits,
  failedSources,
  error,
  onAbort,
}: {
  darkMode?: boolean;
  recalling: boolean;
  hits: RecallHit[] | null;
  failedSources: string[];
  error: string | null;
  onAbort: () => void;
}) {
  return (
    <aside
      className={cn(
        'rounded-3xl border overflow-hidden flex flex-col',
        darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle',
      )}
    >
      <div
        className={cn(
          'px-5 py-4 border-b flex items-center justify-between gap-2',
          darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
        )}
      >
        <div className="flex items-center gap-2">
          <Search size={15} className={darkMode ? 'text-[#858585]' : 'text-text-main/45'} />
          <p className={cn('text-sm font-bold tracking-wide', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
            召回候选
          </p>
          {hits && (
            <span className={cn('text-[11px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
              · {hits.length}
            </span>
          )}
        </div>
        {recalling && (
          <button
            type="button"
            onClick={onAbort}
            className={cn(
              'h-7 flex items-center gap-1 px-2 rounded-lg text-[11px] font-bold border transition-colors',
              darkMode
                ? 'text-[#cccccc] hover:bg-[#2d2d2d] border-[#3c3c3c]'
                : 'text-text-main/70 hover:bg-bg-base/60 border-border-subtle',
            )}
            title="停止召回"
          >
            <X size={12} />
            停止
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {recalling ? (
          <div
            className={cn(
              'h-full flex flex-col items-center justify-center gap-2 text-xs',
              darkMode ? 'text-[#858585]' : 'text-text-main/50',
            )}
          >
            <Loader2 size={18} className="animate-spin" />
            召回中...
          </div>
        ) : error ? (
          <div
            className={cn(
              'rounded-xl border px-3 py-3 text-xs leading-relaxed',
              darkMode ? 'border-[#5a2d2d] bg-[#3a2020] text-[#f0a0a0]' : 'border-red-200 bg-red-50 text-red-600',
            )}
          >
            {error}
          </div>
        ) : hits === null ? (
          <div
            className={cn(
              'h-full flex items-center justify-center text-xs text-center px-2',
              darkMode ? 'text-[#858585]' : 'text-text-main/50',
            )}
          >
            发送提问后，这里展示召回到的候选
          </div>
        ) : hits.length === 0 ? (
          <div
            className={cn(
              'h-full flex items-center justify-center text-xs text-center px-2',
              darkMode ? 'text-[#858585]' : 'text-text-main/50',
            )}
          >
            未召回到候选
          </div>
        ) : (
          <div className="space-y-2">
            {failedSources.length > 0 && (
              <div
                className={cn(
                  'rounded-xl border px-3 py-2 text-[11px] leading-relaxed',
                  darkMode
                    ? 'border-[#5a4a20] bg-[#3a3020] text-[#e0c080]'
                    : 'border-amber-200 bg-amber-50 text-amber-700',
                )}
              >
                部分检索路降级：{failedSources.join('、')}
              </div>
            )}
            {hits.map((hit) => (
              <div
                key={hit.chunk_id}
                className={cn(
                  'rounded-xl border px-3 py-2',
                  darkMode ? 'bg-[#2d2d2d] border-[#3c3c3c]' : 'bg-white border-border-subtle',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn('text-xs font-bold truncate', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}
                    title={`chunk ${hit.chunk_id}`}
                  >
                    #{hit.chunk_id}
                  </p>
                  <span className={cn('text-[11px] font-mono shrink-0', darkMode ? 'text-[#3b82f6]' : 'text-primary')}>
                    {hit.fused_score.toFixed(3)}
                  </span>
                </div>
                <div className={cn('mt-1 text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                  doc {hit.doc_id} · 知识库 {hit.dataset_id}
                </div>
                {hit.scores && Object.keys(hit.scores).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(hit.scores).map(([source, score]) => (
                      <span
                        key={source}
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[9px] font-mono',
                          darkMode ? 'bg-[#1e1e1e] text-[#858585]' : 'bg-bg-base/60 text-text-main/55',
                        )}
                      >
                        {source} {score.toFixed(2)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

export default function ChatPage() {
  const { darkMode } = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [conversation, setConversation] = useState<ConversationDTO | null>(null);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [files, setFiles] = useState<KnowledgeFileDTO[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [parseAfterUpload, setParseAfterUpload] = useState(false);
  const [fileSortBy, setFileSortBy] = useState<'createdAt' | 'updatedAt'>('updatedAt');
  const [chatModels, setChatModels] = useState<LLMConfigDTO[]>([]);
  const [loadingChatModels, setLoadingChatModels] = useState(false);
  const [selectedModelConfigId, setSelectedModelConfigId] = useState<number | null>(null);
  const [datasetName, setDatasetName] = useState('');
  // 召回（直连 Python SSE）状态
  const [recalling, setRecalling] = useState(false);
  const [recallHits, setRecallHits] = useState<RecallHit[] | null>(null);
  const [recallFailedSources, setRecallFailedSources] = useState<string[]>([]);
  const [recallError, setRecallError] = useState<string | null>(null);
  const recallAbortRef = useRef<AbortController | null>(null);

  // 离开页面时取消进行中的召回，释放 Python 并发名额
  useEffect(() => {
    return () => recallAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (id) {
      void loadConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    void loadChatModels();
  }, []);

  function formatTime(value: string) {
    if (!value) return '-';
    const time = new Date(value);
    return Number.isNaN(time.getTime()) ? value : time.toLocaleString('zh-CN');
  }

  function formatSize(bytes: number) {
    if (!Number.isFinite(bytes)) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const loadFiles = async (datasetId: number) => {
    setLoadingFiles(true);
    try {
      const result = await getKnowledgeFiles(datasetId, 1, 100);
      setFiles(result.items.sort((a, b) => b.id - a.id));
    } catch (error) {
      console.error('Failed to load knowledge files:', error);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadConversation = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const convList = await getConversations(1, 100);
      const conv = convList.items.find((c) => c.id === Number(id));
      setConversation(conv || null);

      if (conv) {
        const [msgResult] = await Promise.all([getMessages(conv.id, 1, 100), loadFiles(conv.datasetId)]);
        setMessages(msgResult.items);
        try {
          const dataset = await getDataset(conv.datasetId);
          setDatasetName(dataset.name);
        } catch (error) {
          console.error('Failed to load dataset name:', error);
          setDatasetName(`知识库 #${conv.datasetId}`);
        }
      } else {
        setMessages([]);
        setFiles([]);
        setDatasetName('');
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChatModels = async () => {
    setLoadingChatModels(true);
    try {
      const configs = await getLLMConfigs({ capability: 'CHAT', isActive: true });
      setChatModels(configs);
    } catch (error) {
      console.error('Failed to load chat models:', error);
      setChatModels([]);
    } finally {
      setLoadingChatModels(false);
    }
  };

  useEffect(() => {
    if (!conversation || chatModels.length === 0) {
      if (chatModels.length === 0) {
        setSelectedModelConfigId(null);
      }
      return;
    }

    const matchedByConversation =
      conversation.lastConfigId && chatModels.some((config) => config.id === conversation.lastConfigId);
    if (matchedByConversation) {
      setSelectedModelConfigId(conversation.lastConfigId);
      return;
    }

    setSelectedModelConfigId((prev) => {
      if (prev && chatModels.some((config) => config.id === prev)) {
        return prev;
      }
      const defaultModel = chatModels.find((config) => config.isDefault) ?? chatModels[0];
      return defaultModel ? defaultModel.id : null;
    });
  }, [conversation, chatModels]);

  // 对话即召回：发送提问直连 Python 拉 SSE，候选展示在右侧面板。
  const handleSend = async () => {
    if (!conversation) return;
    const content = inputValue.trim();
    if (!content || recalling) return;

    // 本地追加用户提问（召回链路不经 Java 持久化）
    const userMsg: MessageDTO = {
      id: Date.now(),
      conversationId: conversation.id,
      role: 'user',
      content,
      configId: null,
      modelName: null,
      tokenCount: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');

    // 重连前先 abort 旧召回，避免占用并发名额
    recallAbortRef.current?.abort();
    const controller = new AbortController();
    recallAbortRef.current = controller;

    setRecalling(true);
    setRecallError(null);
    setRecallHits(null);
    setRecallFailedSources([]);

    try {
      const result = await recall({
        query: content,
        datasetIds: [conversation.datasetId],
        signal: controller.signal,
      });
      setRecallHits(result.hits);
      setRecallFailedSources(result.failed_sources);
    } catch (error) {
      if (isRecallAborted(error)) return; // 主动取消，静默
      const message = recallErrorMessage(error);
      setRecallError(message);
      // RecallError 自行提示；ApiError（申请 token 失败）已由 apiClient 弹过 toast
      if (isRecallError(error)) addToast('error', message);
    } finally {
      if (recallAbortRef.current === controller) {
        recallAbortRef.current = null;
        setRecalling(false);
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!conversation) return;
    setUploading(true);
    try {
      await uploadKnowledgeFile(conversation.datasetId, file, parseAfterUpload);
      addToast('success', parseAfterUpload ? '文件上传成功，解析任务已提交' : '文件上传成功');
      await loadFiles(conversation.datasetId);
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setUploading(false);
      setDragging(false);
    }
  };

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await handleFileUpload(file);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      setDragging(false);
      return;
    }
    await handleFileUpload(file);
  };

  const displayName = user?.nickname || user?.username || '用户';
  const fileSortLabel = fileSortBy === 'createdAt' ? '按创建时间排序' : '按更新时间排序';
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      const timeA = new Date(a[fileSortBy] || '').getTime();
      const timeB = new Date(b[fileSortBy] || '').getTime();
      return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
    });
  }, [files, fileSortBy]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={cn('mono-label', darkMode ? 'text-[#858585]' : '')}>加载中...</div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className={cn('text-lg mb-4', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>对话不存在</p>
        <button
          onClick={() => navigate(Routes.Chats)}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider',
            darkMode ? 'bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]' : 'bg-text-main text-white hover:opacity-90',
          )}
        >
          返回对话列表
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header
        className={cn(
          'h-20 pl-6 pr-8 flex items-center justify-between shrink-0 backdrop-blur-md border-b',
          darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle',
        )}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(Routes.Chats)}
            className={cn(
              'p-2 rounded-xl transition-colors',
              darkMode ? 'hover:bg-[#2d2d2d] text-[#858585]' : 'hover:bg-gray-100 text-text-main/40',
            )}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col gap-1">
            <Breadcrumb
              items={[
                { label: '首页', path: Routes.Home },
                { label: '对话', path: Routes.Chats },
                { label: conversation.title },
              ]}
              darkMode={darkMode}
            />
            <h2 className={cn('text-xl serif-heading', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
              #{datasetName || `知识库 #${conversation.datasetId}`}-{conversation.title}
            </h2>
          </div>
        </div>
        <div />
      </header>

      <div className="flex-1 px-0 py-5 min-h-0">
        <div className="h-full grid grid-cols-[250px_minmax(0,1fr)_300px] gap-2">
          <aside
            className={cn(
              'rounded-3xl border overflow-hidden flex flex-col',
              darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle',
            )}
          >
            <div className={cn('px-5 py-4 border-b', darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle')}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className={cn('text-sm font-bold tracking-wide', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                    关联文件
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFileSortBy((prev) => (prev === 'createdAt' ? 'updatedAt' : 'createdAt'))}
                  className={cn(
                    'h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-bold transition-colors border',
                    darkMode
                      ? 'text-[#cccccc] hover:bg-[#2d2d2d] border-[#3c3c3c]'
                      : 'text-text-main/70 hover:bg-bg-base/60 border-border-subtle',
                  )}
                  title="点击切换文件排序方式"
                >
                  <ArrowUpDown size={14} className={darkMode ? 'text-[#858585]' : 'text-text-main/45'} />
                  <span>{fileSortLabel}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
              {loadingFiles ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2
                    size={18}
                    className={cn('animate-spin', darkMode ? 'text-[#858585]' : 'text-text-main/45')}
                  />
                </div>
              ) : files.length === 0 ? (
                <div
                  className={cn(
                    'h-full flex items-center justify-center text-xs text-center px-2',
                    darkMode ? 'text-[#858585]' : 'text-text-main/50',
                  )}
                >
                  当前知识库还没有文件
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedFiles.map((file) => (
                    <div
                      key={file.id}
                      className={cn(
                        'rounded-xl border px-3 py-2',
                        darkMode ? 'bg-[#2d2d2d] border-[#3c3c3c]' : 'bg-white border-border-subtle',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={14} className={darkMode ? 'text-[#858585]' : 'text-text-main/45'} />
                        <p
                          className={cn('text-sm font-medium truncate', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}
                        >
                          {file.originalFilename}
                        </p>
                      </div>
                      <div className={cn('mt-1 text-[11px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                        {formatSize(file.fileSize)} · {formatTime(file.updatedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={cn('p-4 border-t', darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle')}>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  if (!uploading) fileInputRef.current?.click();
                }}
                className={cn(
                  'rounded-2xl border border-dashed p-4 transition-colors cursor-pointer',
                  dragging
                    ? darkMode
                      ? 'border-[#3b82f6] bg-[#3b82f6]/10'
                      : 'border-primary bg-primary/5'
                    : darkMode
                      ? 'border-[#3c3c3c] bg-[#1e1e1e]'
                      : 'border-border-subtle bg-bg-base/40',
                )}
              >
                <div className="flex flex-col items-center justify-center gap-2 mb-3">
                  <Upload size={16} className={darkMode ? 'text-[#858585]' : 'text-text-main/45'} />
                  <p
                    className={cn(
                      'text-xs text-center leading-tight',
                      darkMode ? 'text-[#858585]' : 'text-text-main/60',
                    )}
                  >
                    {uploading ? (
                      '上传中...'
                    ) : (
                      <>
                        <span className="block">拖拽文件到此处上传</span>
                        <span className="block">或点击此区域上传</span>
                      </>
                    )}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".md,.markdown,.pdf,.docx,.txt"
                  onChange={handleFileInputChange}
                />
              </div>
              <div className="mt-3 flex items-center justify-start gap-2">
                <ParseAfterUploadSwitch
                  darkMode={darkMode}
                  checked={parseAfterUpload}
                  onToggle={() => setParseAfterUpload((prev) => !prev)}
                />
                <span
                  className={cn(
                    'text-[8px] font-medium whitespace-nowrap leading-none',
                    darkMode ? 'text-[#858585]' : 'text-text-main/45',
                  )}
                >
                  支持 md/pdf/docx/txt
                </span>
              </div>
            </div>
          </aside>

          <section
            className={cn(
              'rounded-3xl border overflow-hidden flex flex-col',
              darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle',
            )}
          >
            <div className="flex-1 overflow-y-auto p-6">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p
                      className={cn(
                        'text-2xl mb-3 font-sans font-medium',
                        darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
                      )}
                    >
                      {displayName}，今天想聊点什么？
                    </p>
                    <p className={cn('text-sm', darkMode ? 'text-[#858585]' : 'text-text-main/55')}>
                      可以上传文件，或者直接提问我。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'rounded-2xl p-4',
                        msg.role === 'user'
                          ? darkMode
                            ? 'bg-[#2d2d2d] border border-[#3c3c3c] ml-12'
                            : 'bg-bg-base/70 border border-border-subtle mr-12'
                          : darkMode
                            ? 'bg-[#2d2d2d] border border-[#3c3c3c] mr-12'
                            : 'art-card ml-12',
                      )}
                    >
                      <p
                        className={cn(
                          'text-sm leading-relaxed',
                          msg.role === 'user'
                            ? darkMode
                              ? 'text-white'
                              : 'text-text-main'
                            : darkMode
                              ? 'text-[#e0e0e0]'
                              : 'text-text-main',
                        )}
                      >
                        {msg.content}
                      </p>
                      <p
                        className={cn('mono-label mt-2 text-[8px]', darkMode ? 'text-[#6b6b6b]' : 'text-text-main/30')}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className={cn(
                'p-4 shrink-0 border-t',
                darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle',
              )}
            >
              <div className="max-w-3xl mx-auto flex items-center gap-3">
                <div
                  className={cn(
                    'flex-1 h-12 rounded-xl border flex items-center px-2 gap-2',
                    darkMode ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-bg-base/50 border-border-subtle',
                  )}
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="输入提问，回车开始召回..."
                    disabled={recalling}
                    className={cn(
                      'flex-1 bg-transparent text-sm focus:outline-none',
                      darkMode
                        ? 'text-[#e0e0e0] placeholder:text-[#6b6b6b]'
                        : 'text-text-main placeholder:text-text-main/40',
                    )}
                  />
                  <div className={cn('h-5 w-px shrink-0', darkMode ? 'bg-[#3c3c3c]' : 'bg-border-subtle')} />
                  <div className="relative shrink-0">
                    <select
                      value={selectedModelConfigId ?? ''}
                      onChange={(event) =>
                        setSelectedModelConfigId(event.target.value ? Number(event.target.value) : null)
                      }
                      disabled={loadingChatModels || chatModels.length === 0}
                      className={cn(
                        'appearance-none bg-transparent pl-1 pr-5 text-xs focus:outline-none min-w-[92px] max-w-[120px] truncate',
                        darkMode ? 'text-[#cccccc]' : 'text-text-main/75',
                        (loadingChatModels || chatModels.length === 0) && 'opacity-60',
                      )}
                      title="选择对话模型"
                    >
                      <option value="">
                        {loadingChatModels ? '加载中' : chatModels.length === 0 ? '暂无模型' : '选择模型'}
                      </option>
                      {chatModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.modelName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className={cn(
                        'pointer-events-none absolute right-0 top-1/2 -translate-y-1/2',
                        darkMode ? 'text-[#858585]' : 'text-text-main/45',
                      )}
                    />
                  </div>
                </div>
                <button
                  onClick={handleSend}
                  disabled={recalling || !inputValue.trim()}
                  className={cn(
                    'p-3 rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    'bg-text-main text-white hover:opacity-90',
                  )}
                >
                  {recalling ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </section>

          <RecallPanel
            darkMode={darkMode}
            recalling={recalling}
            hits={recallHits}
            failedSources={recallFailedSources}
            error={recallError}
            onAbort={() => recallAbortRef.current?.abort()}
          />
        </div>
      </div>
    </div>
  );
}
