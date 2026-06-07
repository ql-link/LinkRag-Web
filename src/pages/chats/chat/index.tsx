import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, ArrowUpDown, ChevronDown, FileText, Loader2, Search, Send, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { getMessages, getConversations } from '@/services/chat';
import { getDataset, getKnowledgeFiles, uploadKnowledgeFile } from '@/services/dataset';
import { getLLMConfigs } from '@/services/llm';
import { recall, isRecallError, isRecallAborted, type RecallError } from '@/services/recall';
import type { MessageDTO, ConversationDTO, KnowledgeFileDTO, LLMConfigDTO, RecallHit } from '@/types/api';
import { useTheme } from '@/contexts/ThemeContext';

type ConversationLoadStatus = 'loading' | 'success' | 'not-found' | 'error';

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
  className,
}: {
  darkMode?: boolean;
  recalling: boolean;
  hits: RecallHit[] | null;
  failedSources: string[];
  error: string | null;
  onAbort: () => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        'rounded-3xl border overflow-hidden flex flex-col',
        className,
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
                {(() => {
                  // 某召回路未命中该 chunk 时分值为 null，过滤掉避免 null.toFixed 崩溃。
                  const scored = Object.entries(hit.scores ?? {}).filter(
                    (entry): entry is [string, number] => entry[1] != null,
                  );
                  if (scored.length === 0) return null;
                  return (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {scored.map(([source, score]) => (
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
                  );
                })()}
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
  const modelMenuRef = useRef<HTMLDivElement | null>(null);
  const [conversation, setConversation] = useState<ConversationDTO | null>(null);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [files, setFiles] = useState<KnowledgeFileDTO[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [conversationLoadStatus, setConversationLoadStatus] = useState<ConversationLoadStatus>('loading');
  const [loadedConversationId, setLoadedConversationId] = useState<number | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [parseAfterUpload, setParseAfterUpload] = useState(false);
  const [fileSortBy, setFileSortBy] = useState<'createdAt' | 'updatedAt'>('updatedAt');
  const [chatModels, setChatModels] = useState<LLMConfigDTO[]>([]);
  const [loadingChatModels, setLoadingChatModels] = useState(false);
  const [selectedModelConfigId, setSelectedModelConfigId] = useState<number | null>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [datasetName, setDatasetName] = useState('');
  // 召回（直连 Python SSE）状态
  const [recalling, setRecalling] = useState(false);
  const [recallHits, setRecallHits] = useState<RecallHit[] | null>(null);
  const [recallFailedSources, setRecallFailedSources] = useState<string[]>([]);
  const [recallError, setRecallError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'files' | 'recall' | null>(null);
  const recallAbortRef = useRef<AbortController | null>(null);

  const conversationId = Number(id);
  const hasValidConversationId = Number.isFinite(conversationId);

  // 离开页面时取消进行中的召回，释放 Python 并发名额
  useEffect(() => {
    return () => recallAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setModelMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!hasValidConversationId) {
      setConversation(null);
      setMessages([]);
      setFiles([]);
      setDatasetName('');
      setLoadedConversationId(null);
      setConversationLoadStatus('not-found');
      return;
    }

    let cancelled = false;

    const loadConversation = async () => {
      setConversationLoadStatus('loading');
      setLoadedConversationId(null);
      setConversation(null);
      setMessages([]);
      setFiles([]);
      setDatasetName('');

      try {
        const convList = await getConversations(1, 100);
        if (cancelled) return;

        const conv = convList.items.find((c) => c.id === conversationId);
        if (!conv) {
          setLoadedConversationId(conversationId);
          setConversationLoadStatus('not-found');
          return;
        }

        const [msgResult, fileResult, dataset] = await Promise.all([
          getMessages(conv.id, 1, 100),
          getKnowledgeFiles(conv.datasetId, 1, 100),
          getDataset(conv.datasetId).catch((error) => {
            console.error('Failed to load dataset name:', error);
            return null;
          }),
        ]);
        if (cancelled) return;

        setConversation(conv);
        setMessages(msgResult.items);
        setFiles(fileResult.items.sort((a, b) => b.id - a.id));
        setDatasetName(dataset?.name ?? `知识库 #${conv.datasetId}`);
        setLoadedConversationId(conversationId);
        setConversationLoadStatus('success');
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load conversation:', error);
        setConversation(null);
        setMessages([]);
        setFiles([]);
        setDatasetName('');
        setLoadedConversationId(conversationId);
        setConversationLoadStatus('error');
      }
    };

    void loadConversation();

    return () => {
      cancelled = true;
    };
  }, [conversationId, hasValidConversationId]);

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

  // 对话即召回：发送提问直连 Python 拉 SSE，候选展示在右侧面板，答案流式渲染到对话区。
  const handleSend = async () => {
    if (!conversation) return;
    const content = inputValue.trim();
    if (!content || recalling) return;

    // 无可用 / 未选模型时禁止对话——模型为本次生成必备，前端前置拦截，后端再做兜底校验。
    if (!selectedModelConfigId) {
      addToast('error', '请先在上方配置并选择对话模型');
      return;
    }
    const configId = selectedModelConfigId;

    // 本地追加用户提问 + 助手答案占位（召回链路不经 Java 持久化）
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
    const assistantId = Date.now() + 1;
    const assistantMsg: MessageDTO = {
      id: assistantId,
      conversationId: conversation.id,
      role: 'assistant',
      content: '',
      configId,
      modelName: chatModels.find((m) => m.id === configId)?.modelName ?? null,
      tokenCount: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInputValue('');

    const appendAnswerDelta = (text: string) => {
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + text } : m)));
    };

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
        configId,
        signal: controller.signal,
        onAnswerDelta: appendAnswerDelta,
      });
      setRecallHits(result.hits);
      setRecallFailedSources(result.failed_sources);
      // 空命中（recall_done 无 answer）时给出占位提示；非空答案以流式增量为准。
      if (!result.answer && result.hits.length === 0) {
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: '未召回到相关内容' } : m)));
      }
    } catch (error) {
      if (isRecallAborted(error)) return; // 主动取消，静默
      const message = recallErrorMessage(error);
      setRecallError(message);
      // 失败时移除答案占位，避免残留空气泡
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
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
  const selectedChatModel = chatModels.find((model) => model.id === selectedModelConfigId);

  const isConversationLoading =
    hasValidConversationId && (conversationLoadStatus === 'loading' || loadedConversationId !== conversationId);

  if (isConversationLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 size={16} className={cn('animate-spin', darkMode ? 'text-[#858585]' : 'text-text-main/45')} />
          <div className={cn('mono-label', darkMode ? 'text-[#858585]' : '')}>加载中...</div>
        </div>
      </div>
    );
  }

  if (conversationLoadStatus === 'error' || !conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className={cn('text-lg mb-4', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
          {conversationLoadStatus === 'error' ? '对话加载失败' : '对话不存在'}
        </p>
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
    <div className={cn('relative flex h-full flex-col', darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base')}>
      <header
        className={cn(
          'h-16 px-8 flex shrink-0 items-center justify-between gap-3 border-b backdrop-blur-md',
          darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => navigate(Routes.Chats)}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
              darkMode ? 'text-[#858585] hover:bg-[#2d2d2d]' : 'text-text-main/45 hover:bg-primary/5',
            )}
            aria-label="返回对话列表"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h2
              className={cn(
                'truncate text-sm font-semibold tracking-tight',
                darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
              )}
            >
              {conversation.title}
            </h2>
            <p className={cn('mono-label mt-0.5 truncate', darkMode && 'text-[#858585]')}>
              {datasetName || `知识库 #${conversation.datasetId}`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setActivePanel((panel) => (panel === 'files' ? null : 'files'))}
            className={cn(
              'flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors',
              activePanel === 'files'
                ? darkMode
                  ? 'border-[#3b82f6] text-[#3b82f6]'
                  : 'border-primary text-primary'
                : darkMode
                  ? 'border-[#3c3c3c] text-[#cccccc] hover:bg-[#2d2d2d]'
                  : 'border-border-subtle text-text-main/65 hover:bg-primary/5',
            )}
            title="查看关联文件"
          >
            <FileText size={14} />
            <span className="hidden sm:inline">文件</span>
            <span className="font-mono">{files.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePanel((panel) => (panel === 'recall' ? null : 'recall'))}
            className={cn(
              'flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors',
              activePanel === 'recall'
                ? darkMode
                  ? 'border-[#3b82f6] text-[#3b82f6]'
                  : 'border-primary text-primary'
                : darkMode
                  ? 'border-[#3c3c3c] text-[#cccccc] hover:bg-[#2d2d2d]'
                  : 'border-border-subtle text-text-main/65 hover:bg-primary/5',
            )}
            title="查看召回候选"
          >
            <Search size={14} />
            <span className="hidden sm:inline">召回</span>
            {recalling ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <span className="font-mono">{recallHits?.length ?? 0}</span>
            )}
          </button>
        </div>
      </header>

      {activePanel === 'files' && (
        <div className="absolute right-4 top-20 z-30 w-[min(420px,calc(100vw-2rem))]">
          <div
            className={cn(
              'flex max-h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-md',
              darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white/90',
            )}
          >
            <div
              className={cn(
                'flex items-center justify-between gap-3 border-b px-5 py-4',
                darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
              )}
            >
              <div>
                <p className={cn('text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>关联文件</p>
                <p className={cn('mono-label mt-0.5', darkMode && 'text-[#858585]')}>{files.length} files</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFileSortBy((prev) => (prev === 'createdAt' ? 'updatedAt' : 'createdAt'))}
                  className={cn(
                    'flex h-8 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-bold transition-colors',
                    darkMode
                      ? 'border-[#3c3c3c] text-[#cccccc] hover:bg-[#2d2d2d]'
                      : 'border-border-subtle text-text-main/65 hover:bg-primary/5',
                  )}
                  title="点击切换文件排序方式"
                >
                  <ArrowUpDown size={13} />
                  {fileSortLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel(null)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                    darkMode ? 'text-[#858585] hover:bg-[#2d2d2d]' : 'text-text-main/45 hover:bg-primary/5',
                  )}
                  aria-label="关闭文件面板"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {loadingFiles ? (
                <div className="flex h-36 items-center justify-center">
                  <Loader2
                    size={18}
                    className={cn('animate-spin', darkMode ? 'text-[#858585]' : 'text-text-main/45')}
                  />
                </div>
              ) : files.length === 0 ? (
                <div
                  className={cn(
                    'flex h-36 items-center justify-center px-4 text-center text-xs',
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
                        'rounded-2xl border px-3 py-3',
                        darkMode ? 'border-[#3c3c3c] bg-[#2d2d2d]' : 'border-border-subtle bg-white/70',
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText
                          size={14}
                          className={cn('shrink-0', darkMode ? 'text-[#858585]' : 'text-text-main/45')}
                        />
                        <p
                          className={cn('truncate text-sm font-medium', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}
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
            <div className={cn('border-t p-4', darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle')}>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  if (!uploading) fileInputRef.current?.click();
                }}
                className={cn(
                  'cursor-pointer rounded-2xl border border-dashed p-4 transition-colors',
                  dragging
                    ? darkMode
                      ? 'border-[#3b82f6] bg-[#3b82f6]/10'
                      : 'border-primary bg-primary/5'
                    : darkMode
                      ? 'border-[#3c3c3c] bg-[#1e1e1e]'
                      : 'border-border-subtle bg-bg-base/40',
                )}
              >
                <div className="mb-3 flex flex-col items-center justify-center gap-2">
                  <Upload size={16} className={darkMode ? 'text-[#858585]' : 'text-text-main/45'} />
                  <p
                    className={cn(
                      'text-center text-xs leading-tight',
                      darkMode ? 'text-[#858585]' : 'text-text-main/60',
                    )}
                  >
                    {uploading ? '上传中...' : '拖拽或点击上传文件'}
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
              <div className="mt-3 flex items-center justify-between gap-2">
                <ParseAfterUploadSwitch
                  darkMode={darkMode}
                  checked={parseAfterUpload}
                  onToggle={() => setParseAfterUpload((prev) => !prev)}
                />
                <span
                  className={cn(
                    'text-[8px] font-medium whitespace-nowrap',
                    darkMode ? 'text-[#858585]' : 'text-text-main/45',
                  )}
                >
                  md/pdf/docx/txt
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activePanel === 'recall' && (
        <div className="absolute right-4 top-20 z-30 w-[min(420px,calc(100vw-2rem))]">
          <RecallPanel
            className="h-[min(620px,calc(100vh-9rem))] shadow-2xl"
            darkMode={darkMode}
            recalling={recalling}
            hits={recallHits}
            failedSources={recallFailedSources}
            error={recallError}
            onAbort={() => recallAbortRef.current?.abort()}
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center pb-24">
              <div className="text-center">
                <p
                  className={cn(
                    'mb-3 text-2xl font-medium tracking-tight sm:text-3xl',
                    darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
                  )}
                >
                  {displayName}，今天想聊点什么？
                </p>
                <p className={cn('text-sm', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                  选择模型后直接提问，文件和召回信息可从右上角查看。
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-7 pb-6">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[86%] whitespace-pre-wrap text-sm leading-7 sm:max-w-[78%]',
                        isUser
                          ? cn(
                              'rounded-[1.35rem] px-4 py-3',
                              darkMode ? 'bg-[#2d2d2d] text-white' : 'bg-white/80 text-text-main shadow-sm',
                            )
                          : cn('px-1 py-1', darkMode ? 'text-[#e0e0e0]' : 'text-text-main'),
                      )}
                    >
                      {msg.content || (msg.role === 'assistant' && recalling ? '正在生成...' : '')}
                      <p
                        className={cn('mono-label mt-2 text-[8px]', darkMode ? 'text-[#6b6b6b]' : 'text-text-main/30')}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className={cn('shrink-0 px-4 pb-4 pt-2', darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base')}>
        <div className="mx-auto w-full max-w-3xl">
          <div
            className={cn(
              'rounded-[1.75rem] border p-2 shadow-sm backdrop-blur-md',
              darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white/80',
            )}
          >
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setActivePanel((panel) => (panel === 'files' ? null : 'files'))}
                className={cn(
                  'mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
                  darkMode ? 'text-[#858585] hover:bg-[#2d2d2d]' : 'text-text-main/45 hover:bg-primary/5',
                )}
                title="上传或查看文件"
              >
                <Upload size={17} />
              </button>
              <div className="min-w-0 flex-1">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="输入提问..."
                  disabled={recalling}
                  rows={1}
                  className={cn(
                    'max-h-36 min-h-11 w-full resize-none bg-transparent px-1 py-2.5 text-sm leading-6 focus:outline-none',
                    darkMode
                      ? 'text-[#e0e0e0] placeholder:text-[#6b6b6b]'
                      : 'text-text-main placeholder:text-text-main/40',
                  )}
                />
                <div className="flex items-center gap-3 px-1 pb-1">
                  <div className="relative min-w-0" ref={modelMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!loadingChatModels && chatModels.length > 0) {
                          setModelMenuOpen((open) => !open);
                        }
                      }}
                      disabled={loadingChatModels || chatModels.length === 0}
                      className={cn(
                        'flex h-7 max-w-[180px] items-center gap-1.5 rounded-full px-2 text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-[220px]',
                        darkMode
                          ? 'text-[#cccccc] hover:bg-[#2d2d2d]'
                          : 'text-text-main/60 hover:bg-primary/5 hover:text-text-main/75',
                      )}
                      title="选择对话模型"
                      aria-haspopup="listbox"
                      aria-expanded={modelMenuOpen}
                    >
                      <span className="truncate">
                        {loadingChatModels
                          ? '模型加载中'
                          : chatModels.length === 0
                            ? '暂无模型'
                            : (selectedChatModel?.modelName ?? '选择模型')}
                      </span>
                      <ChevronDown
                        size={12}
                        className={cn(
                          'shrink-0 transition-transform',
                          modelMenuOpen && 'rotate-180',
                          darkMode ? 'text-[#858585]' : 'text-text-main/40',
                        )}
                      />
                    </button>

                    {modelMenuOpen && (
                      <div
                        className={cn(
                          'absolute bottom-full left-0 z-40 mb-2 w-[min(260px,calc(100vw-4rem))] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md',
                          darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white/95',
                        )}
                      >
                        <div
                          className={cn('border-b px-3 py-2', darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle')}
                        >
                          <p className={cn('mono-label', darkMode && 'text-[#858585]')}>选择模型</p>
                        </div>
                        <div className="max-h-[180px] overflow-y-auto p-1" role="listbox">
                          {chatModels.map((model) => {
                            const selected = model.id === selectedModelConfigId;
                            return (
                              <button
                                key={model.id}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                  setSelectedModelConfigId(model.id);
                                  setModelMenuOpen(false);
                                }}
                                className={cn(
                                  'flex h-9 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-xs transition-colors',
                                  selected
                                    ? darkMode
                                      ? 'bg-[#3b82f6]/15 text-[#3b82f6]'
                                      : 'bg-primary/10 text-primary'
                                    : darkMode
                                      ? 'text-[#cccccc] hover:bg-[#2d2d2d]'
                                      : 'text-text-main/70 hover:bg-primary/5',
                                )}
                              >
                                <span className="min-w-0 truncate font-bold">{model.modelName}</span>
                                {selected && (
                                  <span
                                    className={cn(
                                      'h-1.5 w-1.5 shrink-0 rounded-full',
                                      darkMode ? 'bg-[#3b82f6]' : 'bg-primary',
                                    )}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => void handleSend()}
                disabled={recalling || !inputValue.trim() || !selectedModelConfigId}
                title={!selectedModelConfigId ? '请先配置并选择对话模型' : undefined}
                className={cn(
                  'mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                  darkMode ? 'bg-[#094771] text-white hover:bg-[#0a5280]' : 'bg-text-main text-white hover:opacity-90',
                )}
              >
                {recalling ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              </button>
            </div>
            <div className="flex items-center justify-end gap-3 px-3 pb-1 pt-1 sm:hidden">
              <button
                type="button"
                onClick={() => setActivePanel((panel) => (panel === 'recall' ? null : 'recall'))}
                className={cn(
                  'text-[11px] font-bold',
                  activePanel === 'recall'
                    ? darkMode
                      ? 'text-[#3b82f6]'
                      : 'text-primary'
                    : darkMode
                      ? 'text-[#858585]'
                      : 'text-text-main/45',
                )}
              >
                召回 {recallHits?.length ?? 0}
              </button>
            </div>
          </div>
          <p className={cn('mt-2 text-center text-[10px]', darkMode ? 'text-[#6b6b6b]' : 'text-text-main/35')}>
            Enter 发送，Shift + Enter 换行
          </p>
        </div>
      </div>
    </div>
  );
}
