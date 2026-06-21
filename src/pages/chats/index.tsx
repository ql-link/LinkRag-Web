import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import {
  ChevronDown,
  Database,
  FileText,
  Files,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { createConversation, getConversations, getMessages, toUiMessages } from '@/services/chat';
import { getDatasets, getDataset, getKnowledgeFiles, uploadKnowledgeFile } from '@/services/dataset';
import { getDefaultLLMConfig, getLLMConfigs } from '@/services/llm';
import { isRecallAborted, isRecallError, recall, type RecallError } from '@/services/recall';
import {
  KNOWLEDGE_FILE_ACCEPT,
  KNOWLEDGE_FILE_HINT,
  KNOWLEDGE_FILE_UNSUPPORTED_MESSAGE,
  isSupportedKnowledgeFile,
} from '@/lib/knowledge-file';
import { getProviderIcon, isProviderIconMonochrome, normalizeProviderToken } from '@/lib/provider-icons';
import type {
  ConversationDTO,
  DatasetDTO,
  KnowledgeFileDTO,
  LLMConfigDTO,
  RecallHit,
  UiChatMessage,
} from '@/types/api';

type LeftTab = 'history' | 'files';
const INITIAL_QUESTION_STORAGE_PREFIX = 'linkrag.initialQuestion.';

type ChatRouteState = {
  datasetId?: unknown;
  initialQuestion?: unknown;
};

interface RecallChunk {
  id: string;
  fileName: string;
  score: number;
  snippet: string;
}

interface SendOptions {
  onStarted?: () => void;
}

function parseRouteDatasetId(value: unknown) {
  const datasetId = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(datasetId) && datasetId > 0 ? datasetId : null;
}

function formatTime(value: string) {
  if (!value) return '-';
  const time = new Date(value);
  return Number.isNaN(time.getTime())
    ? value
    : time.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes)) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
      default:
        return e.message || '召回失败';
    }
  }
  return error instanceof Error ? error.message : '召回失败';
}

function hitsToRecallChunks(hits: RecallHit[], files: KnowledgeFileDTO[]): RecallChunk[] {
  return hits.map((hit) => {
    const file = files.find((item) => item.id === hit.doc_id);
    const content = hit.content?.trim();
    return {
      id: hit.chunk_id,
      fileName: file?.originalFilename ?? `文档 #${hit.doc_id}`,
      score: Math.round(hit.fused_score * 100),
      snippet: content || `命中 chunk ${hit.chunk_id}，来自知识库 #${hit.dataset_id}（该片段暂无可用正文）。`,
    };
  });
}

const INSET_MODEL_ICON_KEYS = ['mimo', 'xiaomi', 'xiaomimimo', 'xai', 'jina'];

function shouldInsetModelIcon(model: LLMConfigDTO | null | undefined, iconUrl: string) {
  const token = normalizeProviderToken(`${model?.providerType ?? ''} ${model?.modelName ?? ''} ${iconUrl}`);
  return INSET_MODEL_ICON_KEYS.some((key) => token.includes(key));
}

function ModelProviderIcon({ model, size = 'sm' }: { model: LLMConfigDTO | null | undefined; size?: 'xs' | 'sm' }) {
  const iconUrl = model ? getProviderIcon(model.providerType, model.providerType, model.modelName) : '';
  const iconIsMonochrome = isProviderIconMonochrome(iconUrl);
  const sizeClass = size === 'xs' ? 'h-5 w-5' : 'h-6 w-6';
  const iconInsetClass = shouldInsetModelIcon(model, iconUrl) ? 'p-1' : 'p-0';

  return (
    <span className={cn(sizeClass, 'flex shrink-0 items-center justify-center overflow-hidden rounded-md')}>
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={model?.providerType ?? '模型'}
          className={cn('block h-full w-full object-contain', iconInsetClass, iconIsMonochrome && 'opacity-80')}
        />
      ) : (
        <MessageSquare size={size === 'xs' ? 12 : 14} className="text-muted" />
      )}
    </span>
  );
}

function RecallEvidencePanel({
  recallQuery,
  recallLoading,
  recallChunks,
  onHide,
  compact = false,
}: {
  recallQuery: string;
  recallLoading: boolean;
  recallChunks: RecallChunk[];
  onHide: () => void;
  compact?: boolean;
}) {
  return (
    <aside
      className={cn(
        'flex min-h-0 flex-col overflow-hidden bg-surface-soft',
        compact
          ? 'mx-4 mb-3 max-h-60 rounded-2xl border border-hairline sm:mx-6'
          : 'h-full w-full border-l border-hairline',
      )}
      aria-label="召回证据"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">召回证据</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            {recallLoading ? '正在检索知识片段' : `${recallChunks.length} 个片段`}
          </p>
        </div>
        <button
          type="button"
          onClick={onHide}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/8 hover:text-ink"
          aria-label="隐藏召回证据"
        >
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {recallQuery && (
          <div className="rounded-xl border border-hairline bg-canvas px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-soft">本轮问题</p>
            <p className="mt-1 line-clamp-2 text-xs text-body">{recallQuery}</p>
          </div>
        )}
        {recallLoading ? (
          <div className="flex min-h-28 flex-col items-center justify-center gap-3 text-muted">
            <Loader2 size={18} className="animate-spin" />
            <p className="text-xs">正在召回知识片段...</p>
          </div>
        ) : recallChunks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-hairline px-4 py-8 text-center text-xs text-muted">
            发送问题后，这里会展示本轮召回到的片段。
          </div>
        ) : (
          recallChunks.map((chunk, index) => (
            <div key={`${chunk.id}-${index}`} className="rounded-xl border border-hairline bg-canvas px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-xs font-semibold text-ink">{chunk.fileName}</p>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {chunk.score}%
                </span>
              </div>
              <p className="mt-1 truncate text-[10px] text-muted-soft">chunk {chunk.id}</p>
              <MarkdownRenderer
                content={chunk.snippet}
                className={cn(
                  compact ? 'line-clamp-3' : 'line-clamp-6',
                  'mt-2 text-xs leading-relaxed text-body',
                  '[&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p]:my-0',
                  '[&_strong]:font-bold',
                )}
              />
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function ThinkingBubble() {
  return (
    <div className="chat-rise flex items-start gap-3">
      <div className="mt-1 flex h-8 w-8 items-center justify-center">
        <Sparkles size={15} className="text-primary" />
      </div>
      <div className="mt-1 flex h-9 items-center gap-2 rounded-full border border-hairline bg-surface-soft px-4 text-xs font-medium text-muted">
        <span>检索与组织回答</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((item) => (
            <span
              key={item}
              className="chat-thinking-dot h-1.5 w-1.5 rounded-full bg-muted-soft"
              style={{ animationDelay: `${item * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HeaderButton({
  active = false,
  onClick,
  icon: Icon,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  icon: typeof Search;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 text-ink'
          : 'border-hairline bg-canvas text-text-secondary hover:border-primary/30 hover:text-ink',
      )}
    >
      <Icon size={14} className={cn(active ? 'text-primary' : 'text-muted')} />
      {children}
    </button>
  );
}

export default function ChatsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as ChatRouteState | null;
  const routeDatasetId = parseRouteDatasetId(routeState?.datasetId);
  const { user } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const recallAbortRef = useRef<AbortController | null>(null);
  const initialQuestionSentRef = useRef<string | null>(null);
  const kbSelectorRef = useRef<HTMLDivElement | null>(null);
  const modelSelectorRef = useRef<HTMLDivElement | null>(null);
  // 镜像会话列表：loadConversation 只查找用，不作为重跑触发器（避免覆盖本地消息）。
  const conversationsRef = useRef<ConversationDTO[]>([]);

  const [leftTab, setLeftTab] = useState<LeftTab>('history');
  const [resourcePanelOpen, setResourcePanelOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [datasets, setDatasets] = useState<DatasetDTO[]>([]);
  const [files, setFiles] = useState<KnowledgeFileDTO[]>([]);
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [conversation, setConversation] = useState<ConversationDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(() => routeDatasetId);
  const [chatModels, setChatModels] = useState<LLMConfigDTO[]>([]);
  const [selectedModelConfigId, setSelectedModelConfigId] = useState<number | null>(null);
  const [kbOpen, setKbOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [recallChunks, setRecallChunks] = useState<RecallChunk[]>([]);
  const [recallLoading, setRecallLoading] = useState(false);
  const [recallQuery, setRecallQuery] = useState('');
  const [evidencePanelVisible, setEvidencePanelVisible] = useState(false);
  const [pendingInitialQuestion, setPendingInitialQuestion] = useState('');

  const activeConversationId = id ? Number(id) : null;

  useEffect(() => {
    if (!kbOpen && !modelOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (kbSelectorRef.current?.contains(target)) return;
      if (modelSelectorRef.current?.contains(target)) return;
      setKbOpen(false);
      setModelOpen(false);
    }

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [kbOpen, modelOpen]);
  const routeInitialQuestion = typeof routeState?.initialQuestion === 'string' ? routeState.initialQuestion.trim() : '';
  const storedInitialQuestion = activeConversationId
    ? (sessionStorage.getItem(`${INITIAL_QUESTION_STORAGE_PREFIX}${activeConversationId}`)?.trim() ?? '')
    : '';
  const initialQuestion = routeInitialQuestion || storedInitialQuestion;
  const displayName = user?.nickname || user?.username || '用户';
  const datasetById = useMemo(() => new Map(datasets.map((dataset) => [dataset.id, dataset])), [datasets]);
  const selectedDataset = selectedDatasetId ? datasetById.get(selectedDatasetId) : null;
  const selectedModel = selectedModelConfigId ? chatModels.find((model) => model.id === selectedModelConfigId) : null;
  const showEvidencePanel = evidencePanelVisible;

  useEffect(() => {
    return () => recallAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      try {
        const [convResult, dsResult, modelResult, defaultChatModel] = await Promise.all([
          getConversations(1, 100),
          getDatasets(1, 100),
          getLLMConfigs({ capability: 'CHAT', isActive: true }),
          getDefaultLLMConfig('CHAT').catch(() => null),
        ]);
        setConversations(convResult.items);
        setDatasets(dsResult.items);
        const chatModelItems =
          defaultChatModel && !modelResult.some((model) => model.id === defaultChatModel.id)
            ? [defaultChatModel, ...modelResult]
            : modelResult;
        setChatModels(chatModelItems);
        const defaultModel =
          (defaultChatModel ? chatModelItems.find((model) => model.id === defaultChatModel.id) : null) ??
          chatModelItems.find((model) => model.isDefault) ??
          chatModelItems[0];
        setSelectedModelConfigId(defaultModel?.id ?? null);
      } catch (error) {
        console.error('Failed to load chat workspace:', error);
      } finally {
        setLoading(false);
      }
    };
    void loadInitial();
  }, []);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // 仅在会话 id 变化时加载一次会话/消息。不要依赖 conversations / chatModels，
  // 否则它们异步到位后会重跑此 effect，用后端的空消息列表覆盖掉首轮乐观/流式消息。
  useEffect(() => {
    if (!activeConversationId || !Number.isFinite(activeConversationId)) {
      setConversation(null);
      setMessages([]);
      setFiles([]);
      setSelectedDatasetId(routeDatasetId);
      setRecallChunks([]);
      setRecallLoading(false);
      setRecallQuery('');
      setEvidencePanelVisible(false);
      return;
    }

    let cancelled = false;
    const loadConversation = async () => {
      setLoadingConversation(true);
      try {
        const conv =
          conversationsRef.current.find((item) => item.id === activeConversationId) ??
          (await getConversations(1, 100)).items.find((item) => item.id === activeConversationId);
        if (!conv) {
          if (!cancelled) {
            setConversation(null);
            setMessages([]);
          }
          return;
        }
        const [msgResult, fileResult] = await Promise.all([
          getMessages(conv.id, 1, 100),
          getKnowledgeFiles(conv.datasetId, 1, 100),
          getDataset(conv.datasetId).catch(() => null),
        ]);
        if (cancelled) return;
        setConversation(conv);
        setSelectedDatasetId(conv.datasetId);
        setMessages(toUiMessages(msgResult.items));
        setFiles(fileResult.items.sort((a, b) => b.id - a.id));
        setRecallChunks([]);
        setRecallLoading(false);
        setRecallQuery('');
        setEvidencePanelVisible(false);
      } catch (error) {
        if (!cancelled) console.error('Failed to load conversation:', error);
      } finally {
        if (!cancelled) setLoadingConversation(false);
      }
    };
    void loadConversation();
    return () => {
      cancelled = true;
    };
  }, [activeConversationId, routeDatasetId]);

  // 模型预选独立于消息加载：会话与模型列表都就绪后，按会话的 lastConfigId 预选，
  // 只设置模型、绝不触碰 messages，因此不会覆盖首轮消息。
  useEffect(() => {
    if (!conversation?.lastConfigId) return;
    if (chatModels.some((model) => model.id === conversation.lastConfigId)) {
      setSelectedModelConfigId(conversation.lastConfigId);
    }
  }, [conversation, chatModels]);

  useEffect(() => {
    if (!selectedDatasetId) return;
    let cancelled = false;
    const loadFiles = async () => {
      setLoadingFiles(true);
      try {
        const result = await getKnowledgeFiles(selectedDatasetId, 1, 100);
        if (!cancelled) setFiles(result.items.sort((a, b) => b.id - a.id));
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load files:', error);
          setFiles([]);
        }
      } finally {
        if (!cancelled) setLoadingFiles(false);
      }
    };
    void loadFiles();
    return () => {
      cancelled = true;
    };
  }, [selectedDatasetId]);

  useEffect(() => {
    const el = messageScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const filteredConversations = conversations
    .filter((item) =>
      ((item.title ?? '新对话').trim() || '新对话').toLowerCase().includes(historySearch.trim().toLowerCase()),
    )
    .sort((a, b) => new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime());
  const filteredFiles = files.filter((file) =>
    file.originalFilename.toLowerCase().includes(fileSearch.trim().toLowerCase()),
  );
  const historyGroup = { label: '对话', items: filteredConversations };

  useEffect(() => {
    if (!activeConversationId || !initialQuestion) return;
    const sendKey = `${activeConversationId}:${initialQuestion}`;
    if (initialQuestionSentRef.current === sendKey) return;
    setPendingInitialQuestion(initialQuestion);
    setInputValue(initialQuestion);
  }, [activeConversationId, initialQuestion]);

  const beginNewConversation = () => {
    recallAbortRef.current?.abort();
    setConversation(null);
    setMessages([]);
    setFiles([]);
    setSelectedDatasetId(null);
    setInputValue('');
    setRecallChunks([]);
    setRecallLoading(false);
    setRecallQuery('');
    setEvidencePanelVisible(false);
    navigate(Routes.Chats, { state: null });
  };

  const handleSend = useCallback(
    async (overrideContent?: string, options?: SendOptions) => {
      const content = (overrideContent ?? inputValue).trim();
      if (!content || sending) return false;
      if (!selectedDatasetId) {
        setKbOpen(true);
        return false;
      }
      if (!selectedModelConfigId) {
        addToast('error', '请先选择对话模型');
        setModelOpen(true);
        return false;
      }

      let activeConversation = conversation;
      try {
        if (!activeConversation) {
          activeConversation = await createConversation({
            title: content.slice(0, 28) || '新的对话',
            datasetId: selectedDatasetId,
            lastConfigId: selectedModelConfigId,
          });
          setConversation(activeConversation);
          setConversations((prev) => [
            activeConversation!,
            ...prev.filter((item) => item.id !== activeConversation!.id),
          ]);
        }
      } catch (error) {
        console.error('Failed to create conversation:', error);
        addToast('error', '创建对话失败');
        return false;
      }

      const userMsg: UiChatMessage = {
        id: `${Date.now()}:user`,
        conversationId: activeConversation.id,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };
      const assistantId = `${Date.now() + 1}:assistant`;
      const assistantMsg: UiChatMessage = {
        id: assistantId,
        conversationId: activeConversation.id,
        role: 'assistant',
        content: '',
        configId: selectedModelConfigId,
        modelName: selectedModel?.modelName ?? null,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInputValue('');
      setSending(true);
      setRecallQuery(content);
      setRecallChunks([]);
      setRecallLoading(true);
      setEvidencePanelVisible(true);
      recallAbortRef.current?.abort();
      const controller = new AbortController();
      recallAbortRef.current = controller;
      options?.onStarted?.();

      try {
        const result = await recall({
          query: content,
          datasetIds: [selectedDatasetId],
          configId: selectedModelConfigId,
          conversationId: activeConversation.id,
          signal: controller.signal,
          onAnswerDelta: (text) => {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === assistantId ? { ...msg, content: `${msg.content ?? ''}${text}` } : msg)),
            );
          },
        });
        setRecallChunks(hitsToRecallChunks(result.hits, files));
        if (!result.answer && result.hits.length === 0) {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantId ? { ...msg, content: '未召回到相关内容。' } : msg)),
          );
        }
      } catch (error) {
        if (!isRecallAborted(error)) {
          const message = recallErrorMessage(error);
          setMessages((prev) => prev.map((msg) => (msg.id === assistantId ? { ...msg, content: message } : msg)));
          if (isRecallError(error)) addToast('error', message);
        }
      } finally {
        if (recallAbortRef.current === controller) recallAbortRef.current = null;
        setRecallLoading(false);
        setSending(false);
      }
      return true;
    },
    [
      addToast,
      conversation,
      files,
      inputValue,
      selectedDatasetId,
      selectedModel?.modelName,
      selectedModelConfigId,
      sending,
    ],
  );

  useEffect(() => {
    if (
      !pendingInitialQuestion ||
      !activeConversationId ||
      !conversation ||
      conversation.id !== activeConversationId ||
      !selectedDatasetId ||
      !selectedModelConfigId ||
      loadingConversation ||
      sending
    ) {
      return;
    }

    const sendKey = `${activeConversationId}:${pendingInitialQuestion}`;
    if (initialQuestionSentRef.current === sendKey) return;
    initialQuestionSentRef.current = sendKey;
    let started = false;
    void handleSend(pendingInitialQuestion, {
      onStarted: () => {
        started = true;
        sessionStorage.removeItem(`${INITIAL_QUESTION_STORAGE_PREFIX}${activeConversationId}`);
        setPendingInitialQuestion('');
        if (routeInitialQuestion) {
          navigate(location.pathname, { replace: true, state: {} });
        }
      },
    }).then((sent) => {
      if (!sent && !started) {
        initialQuestionSentRef.current = null;
      }
    });
  }, [
    activeConversationId,
    conversation,
    handleSend,
    loadingConversation,
    location.pathname,
    navigate,
    pendingInitialQuestion,
    routeInitialQuestion,
    selectedDatasetId,
    selectedModelConfigId,
    sending,
  ]);

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const promptSelectDatasetForUpload = () => {
    addToast('error', '请先选择知识库后再上传文件');
    setKbOpen(true);
    setResourcePanelOpen(false);
    setDragging(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedDatasetId) {
      promptSelectDatasetForUpload();
      return;
    }
    if (!isSupportedKnowledgeFile(file)) {
      addToast('error', KNOWLEDGE_FILE_UNSUPPORTED_MESSAGE);
      setDragging(false);
      return;
    }
    setUploading(true);
    try {
      await uploadKnowledgeFile(selectedDatasetId, file, false);
      addToast('success', '文件上传成功');
      const result = await getKnowledgeFiles(selectedDatasetId, 1, 100);
      setFiles(result.items.sort((a, b) => b.id - a.id));
    } catch (error) {
      console.error('Failed to upload file:', error);
      addToast('error', '文件上传失败，请稍后重试');
    } finally {
      setUploading(false);
      setDragging(false);
    }
  };

  const onFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await handleFileUpload(file);
  };

  const welcomeSuggestions = ['从知识库检索要点', '总结上传的文档', '对比两份资料的差异'];

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-canvas">
      <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3 sm:px-8">
        <div className="min-w-0 flex-1">
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '对话' }]} />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {(['history', 'files'] as LeftTab[]).map((tab) => {
            const active = resourcePanelOpen && leftTab === tab;
            const label = tab === 'history' ? '历史' : `文件 ${files.length}`;
            return (
              <HeaderButton
                key={tab}
                active={active}
                icon={tab === 'history' ? MessageSquare : Files}
                onClick={() => {
                  setLeftTab(tab);
                  setResourcePanelOpen((open) => (leftTab === tab ? !open : true));
                }}
              >
                {label}
              </HeaderButton>
            );
          })}
          <HeaderButton
            active={showEvidencePanel}
            icon={Search}
            onClick={() => setEvidencePanelVisible((visible) => !visible)}
          >
            召回片段
          </HeaderButton>
          <div className="ml-1 flex shrink-0 items-center gap-2">
            <HeaderButton icon={Plus} onClick={beginNewConversation}>
              新建对话
            </HeaderButton>
            <div ref={kbSelectorRef} className="relative">
              <button
                type="button"
                onClick={() => setKbOpen((value) => !value)}
                className="flex h-9 max-w-[280px] items-center gap-2 rounded-lg border border-hairline bg-canvas px-3 text-xs font-medium text-text-secondary transition-colors hover:border-primary/30 hover:text-ink"
              >
                <Database size={14} className="text-muted" />
                <span className="truncate">{selectedDataset?.name ?? '选择知识库'}</span>
                <ChevronDown size={13} className={cn('transition-transform', kbOpen && 'rotate-180')} />
              </button>
              {kbOpen && (
                <div className="popover-scrollbar absolute right-0 top-full z-30 mt-2 max-h-72 w-72 overflow-y-auto rounded-2xl border border-hairline bg-canvas p-2 pr-1.5 (--)]">
                  {datasets.length === 0 ? (
                    <p className="px-3 py-5 text-center text-xs text-muted">暂无可选知识库</p>
                  ) : (
                    datasets.map((dataset) => (
                      <button
                        key={dataset.id}
                        type="button"
                        onClick={() => {
                          setSelectedDatasetId(dataset.id);
                          setKbOpen(false);
                        }}
                        className={cn(
                          'w-full rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors',
                          dataset.id === selectedDatasetId
                            ? 'bg-primary/10 text-ink'
                            : 'text-text-secondary hover:bg-primary/5 hover:text-ink',
                        )}
                      >
                        {dataset.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {resourcePanelOpen && (
        <div className="fixed inset-0 z-50 bg-transparent" onMouseDown={() => setResourcePanelOpen(false)}>
          <section
            className="absolute right-6 top-[92px] flex h-[min(420px,calc(100vh-116px))] w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-hairline bg-canvas (--)] lg:right-8"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={leftTab === 'history' ? '对话历史' : '知识库文件'}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-ink">{leftTab === 'history' ? '对话历史' : '知识库文件'}</h2>
                <p className="mt-1 text-[11px] text-muted">
                  {leftTab === 'history' ? '搜索并切换最近的对话。' : '查看当前知识库文件，或上传新文件。'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResourcePanelOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/8 hover:text-ink"
                aria-label="关闭弹窗"
              >
                <X size={17} />
              </button>
            </div>
            <div className="min-h-0 flex-1 p-4">
              {leftTab === 'history' ? (
                <div className="flex h-full min-h-0 flex-col gap-3">
                  <div className="flex h-9 shrink-0 items-center gap-2 rounded-xl border border-hairline bg-surface-soft px-3">
                    <Search size={13} className="text-muted" />
                    <input
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="搜索对话..."
                      className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs text-ink outline-none placeholder:text-muted-soft"
                    />
                  </div>
                  {loading ? (
                    <div className="flex h-24 items-center justify-center text-muted">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  ) : historyGroup.items.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-hairline px-4 py-6 text-center text-xs text-muted">
                      暂无历史对话
                    </p>
                  ) : (
                    <div className="popover-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1.5">
                      {historyGroup.items.map((item) => {
                        const active = conversation?.id === item.id || activeConversationId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setResourcePanelOpen(false);
                              navigate(`/chats/${item.id}`);
                            }}
                            title={datasetById.get(item.datasetId)?.name ?? `知识库 #${item.datasetId}`}
                            className={cn(
                              'w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
                              active
                                ? 'border-primary/50 bg-primary/8'
                                : 'border-hairline bg-canvas hover:border-primary/30',
                            )}
                          >
                            <span className="block truncate text-xs font-semibold text-ink">
                              {(item.title ?? '新对话').trim() || '新对话'}
                            </span>
                            <span className="mt-1 block truncate text-[10px] text-muted">
                              {datasetById.get(item.datasetId)?.name ?? `知识库 #${item.datasetId}`} ·{' '}
                              {formatTime(item.updatedAt)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full min-h-0 flex-col gap-3">
                  <div className="flex min-h-0 flex-1 flex-col gap-3">
                    <div className="flex h-9 shrink-0 items-center gap-2 rounded-xl border border-hairline bg-surface-soft px-3">
                      <Search size={13} className="text-muted" />
                      <input
                        value={fileSearch}
                        onChange={(e) => setFileSearch(e.target.value)}
                        placeholder="搜索文件..."
                        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs text-ink outline-none placeholder:text-muted-soft"
                      />
                    </div>
                    {loadingFiles ? (
                      <div className="flex h-24 items-center justify-center text-muted">
                        <Loader2 size={16} className="animate-spin" />
                      </div>
                    ) : filteredFiles.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-hairline px-4 py-5 text-center text-xs text-muted">
                        <p>{selectedDatasetId ? '当前知识库还没有文件' : '选择知识库后显示文件'}</p>
                        {!selectedDatasetId && (
                          <button
                            type="button"
                            onClick={promptSelectDatasetForUpload}
                            className="mt-3 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-active"
                          >
                            选择知识库
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="popover-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1.5">
                        {filteredFiles.map((file) => (
                          <div key={file.id} className="rounded-xl border border-hairline bg-canvas px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <FileText size={13} className="text-muted" />
                              <p className="truncate text-xs font-semibold text-ink">{file.originalFilename}</p>
                            </div>
                            <p className="mt-1 text-[10px] text-muted">
                              {formatSize(file.fileSize)} · {formatTime(file.updatedAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    onDragOver={(event: DragEvent<HTMLDivElement>) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setDragging(false);
                    }}
                    onDrop={async (event) => {
                      event.preventDefault();
                      const file = event.dataTransfer.files?.[0];
                      if (file) await handleFileUpload(file);
                    }}
                    onClick={() => {
                      if (uploading) return;
                      if (!selectedDatasetId) {
                        promptSelectDatasetForUpload();
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    className={cn(
                      'flex shrink-0 cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-4 py-3 text-left transition-colors',
                      dragging ? 'border-primary bg-primary/8' : 'border-hairline bg-surface-soft',
                    )}
                  >
                    <Upload size={16} className="shrink-0 text-muted" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-body">{uploading ? '上传中...' : '拖拽或点击上传'}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted">
                        {KNOWLEDGE_FILE_HINT || 'MD / DOCX / PDF'}
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={KNOWLEDGE_FILE_ACCEPT}
                      className="hidden"
                      onChange={onFileInputChange}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Body: single clean message column; evidence is a slide-over drawer */}
      <div className="relative flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col">
          <div ref={messageScrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {loadingConversation ? (
              <div className="flex h-full items-center justify-center text-muted">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="w-full max-w-[760px] text-center">
                  <h2 className="text-3xl text-ink">
                    <span className="serif-heading">{displayName}</span>，今天想聊点什么？
                  </h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">
                    基于已关联的知识库召回片段作答，资料可在右上角「文件」中管理。
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {welcomeSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setInputValue(suggestion)}
                        className="rounded-full border border-hairline px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-ink"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5">
                {messages.map((message) =>
                  message.role === 'user' ? (
                    <div key={message.id} className="chat-rise flex justify-end">
                      <div className="max-w-[88%] rounded-[18px_18px_4px_18px] bg-surface-cream-strong px-4 py-3 text-sm leading-relaxed text-ink">
                        {message.content ?? ''}
                      </div>
                    </div>
                  ) : (message.content ?? '').trim() === '' ? (
                    <ThinkingBubble key={message.id} />
                  ) : (
                    <div key={message.id} className="chat-rise flex items-start gap-3">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center">
                        <Sparkles size={15} className="text-primary" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <MarkdownRenderer
                          content={message.content ?? ''}
                          className={cn(
                            'text-base leading-8 text-text-main',
                            '[&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p]:my-3',
                            'prose-p:text-base prose-li:text-base',
                            '[&_ul]:my-3 [&_ol]:my-3 [&_li]:my-1',
                            '[&_pre]:my-3 [&_blockquote]:my-3',
                          )}
                        />
                      </div>
                    </div>
                  ),
                )}
                {sending && messages[messages.length - 1]?.role === 'user' && <ThinkingBubble />}
              </div>
            )}
          </div>

          {/* Mobile evidence — inline collapsible */}
          <div
            className={cn(
              'overflow-hidden transition-[max-height,opacity] duration-300 ease-out lg:hidden',
              showEvidencePanel ? 'max-h-72 opacity-100' : 'pointer-events-none max-h-0 opacity-0',
            )}
          >
            <RecallEvidencePanel
              compact
              recallQuery={recallQuery}
              recallLoading={recallLoading}
              recallChunks={recallChunks}
              onHide={() => setEvidencePanelVisible(false)}
            />
          </div>

          <div className="shrink-0 px-4 pb-6 pt-3 sm:px-6 sm:pb-8">
            <div className="mx-auto flex max-w-[760px] items-center gap-2 rounded-2xl border border-hairline bg-canvas p-2 (--)]">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                rows={1}
                disabled={sending}
                placeholder="输入提问，回车开始召回…"
                className="h-9 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-5 text-text-main outline-none placeholder:text-muted-soft"
              />
              <div ref={modelSelectorRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setModelOpen((value) => !value)}
                  className="flex h-10 max-w-[156px] items-center gap-2 rounded-lg border border-hairline bg-canvas px-3 text-xs font-medium text-text-secondary transition-colors hover:border-primary/30 sm:max-w-[200px]"
                  title={selectedModel?.modelName ?? '选择模型'}
                  aria-label={selectedModel?.modelName ?? '选择模型'}
                >
                  <ModelProviderIcon model={selectedModel} size="sm" />
                  <span className="min-w-0 truncate">{selectedModel?.modelName ?? '选择模型'}</span>
                </button>
                {modelOpen && (
                  <div className="popover-scrollbar absolute bottom-full right-0 z-20 mb-2 max-h-64 w-64 overflow-y-auto rounded-xl border border-hairline bg-canvas p-2 pr-1.5 (--)]">
                    {chatModels.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          setSelectedModelConfigId(model.id);
                          setModelOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition-colors',
                          model.id === selectedModelConfigId
                            ? 'bg-primary/10 text-ink'
                            : 'text-text-secondary hover:bg-primary/5 hover:text-ink',
                        )}
                      >
                        <ModelProviderIcon model={model} size="xs" />
                        <span className="min-w-0 flex-1 truncate">{model.modelName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || !inputValue.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              </button>
            </div>
          </div>
        </section>

        {/* Desktop evidence — slide-over drawer (does not split the column) */}
        <div
          className={cn(
            'absolute inset-y-0 right-0 z-20 hidden w-[360px] transform (--)] transition-transform duration-300 ease-out lg:block',
            showEvidencePanel ? 'translate-x-0' : 'pointer-events-none translate-x-full',
          )}
        >
          <RecallEvidencePanel
            recallQuery={recallQuery}
            recallLoading={recallLoading}
            recallChunks={recallChunks}
            onHide={() => setEvidencePanelVisible(false)}
          />
        </div>
      </div>
    </div>
  );
}
