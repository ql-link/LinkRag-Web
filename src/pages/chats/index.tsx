import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Copy, Files, Info, Loader2, MessageSquare, Search, Send, Upload, X } from 'lucide-react';
import aiGeneratingActiveIconUrl from '@/assets/icons/ai-generating-active.svg';
import aiGeneratingActiveOnDarkIconUrl from '@/assets/icons/ai-generating-active-on-dark.svg';
import aiGeneratingIconUrl from '@/assets/icons/ai-generating.svg';
import aiGeneratingOnDarkIconUrl from '@/assets/icons/ai-generating-on-dark.svg';
import { Breadcrumb } from '@/components/Breadcrumb';
import { KnowledgeFileIcon } from '@/components/KnowledgeFileIcon';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import {
  RAG_QUERY_MAX_LENGTH,
  RAG_QUERY_MAX_LENGTH_MESSAGE,
  isRagQueryTooLong,
  limitRagQueryLength,
} from '@/lib/rag-query';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import {
  createConversation,
  getConversations,
  getMessages,
  deleteConversation,
  updateConversation,
  toUiMessages,
} from '@/services/chat';
import { getChunkDetails } from '@/services/chunk';
import { getDatasets, getKnowledgeFiles, uploadKnowledgeFile } from '@/services/dataset';
import { getLLMConfigs } from '@/services/llm';
import { isRecallAborted, isRecallError, recall, type RecallError } from '@/services/recall';
import {
  KNOWLEDGE_FILE_ACCEPT,
  KNOWLEDGE_FILE_HINT,
  KNOWLEDGE_FILE_UNSUPPORTED_MESSAGE,
  isSupportedKnowledgeFile,
} from '@/lib/knowledge-file';
import { usePublishChatWorkspace, type ChatWorkspaceSnapshot } from '@/contexts/chatWorkspace';
import { getCachedConversations, setCachedConversations } from '@/lib/conversationsCache';
import { getProviderIcon, isProviderIconMonochrome, normalizeProviderToken } from '@/lib/provider-icons';
import { getModelDisplayName } from '@/lib/model-display';
import type {
  ConversationDTO,
  DatasetDTO,
  KnowledgeFileDTO,
  LLMConfigDTO,
  RecallChunk,
  RecallHit,
  UiChatMessage,
} from '@/types/api';

const INITIAL_QUESTION_STORAGE_PREFIX = 'linkrag.initialQuestion.';
const COMPOSER_TEXTAREA_MAX_HEIGHT = 132;
const SIDE_PANEL_ANIMATION_MS = 180;
const RIGHT_PANEL_LAYOUT_RELEASE_DELAY_MS = 60;
const RIGHT_PANEL_WIDTH = 333;
const RIGHT_PANEL_OFFSET = RIGHT_PANEL_WIDTH + 16;
const RIGHT_PANEL_MIN_SPLIT_RATIO = 0.28;
const RIGHT_PANEL_MAX_SPLIT_RATIO = 0.72;

type ChatRouteState = {
  datasetId?: unknown;
  initialQuestion?: unknown;
};

interface LocalMessage extends UiChatMessage {
  recallChunks?: RecallChunk[];
}

type ResourcePanelMode = 'files' | 'datasets';

interface ConversationDraft {
  messages: LocalMessage[];
  sending: boolean;
  updatedAt: number;
}

type ConversationDraftListener = (conversationId: number, draft: ConversationDraft) => void;

const conversationDrafts = new Map<number, ConversationDraft>();
const conversationDraftListeners = new Set<ConversationDraftListener>();
let activeChatConversationId: number | null = null;
let displayedChatConversationId: number | null = null;
let cachedChatWorkspace: {
  datasets: DatasetDTO[];
  chatModels: LLMConfigDTO[];
  selectedModelConfigId: number | null;
} | null = null;

function updateConversationDraft(
  conversationId: number,
  updater: (draft: ConversationDraft | null) => ConversationDraft,
) {
  const next = {
    ...updater(conversationDrafts.get(conversationId) ?? null),
    updatedAt: Date.now(),
  };
  conversationDrafts.set(conversationId, next);
  conversationDraftListeners.forEach((listener) => listener(conversationId, next));
  return next;
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

function normalizeFilename(value: string) {
  return value.trim().toLowerCase();
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

function normalizeChunkScore(score: number | null | undefined): number | null {
  if (score === null || score === undefined || !Number.isFinite(score)) return null;
  return Math.round(score <= 1 ? score * 100 : score);
}

function collectReferencedChunkIds(messages: UiChatMessage[]): string[] {
  return [
    ...new Set(
      messages.flatMap((message) =>
        message.role === 'assistant'
          ? (message.references ?? []).map((reference) => reference.trim()).filter(Boolean)
          : [],
      ),
    ),
  ];
}

function hydrateMessagesWithChunkDetails(messages: UiChatMessage[], chunks: RecallChunk[]): LocalMessage[] {
  if (chunks.length === 0) return messages;
  const chunkById = new Map(chunks.map((chunk) => [chunk.id, chunk]));

  return messages.map((message) => {
    if (message.role !== 'assistant' || !message.references || message.references.length === 0) {
      return message;
    }

    const recallChunks = message.references
      .map((reference) => chunkById.get(reference.trim()))
      .filter((chunk): chunk is RecallChunk => Boolean(chunk));

    return recallChunks.length > 0 ? { ...message, recallChunks } : message;
  });
}

const INSET_MODEL_ICON_KEYS = ['mimo', 'xiaomi', 'xiaomimimo', 'xai', 'jina'];

function shouldInsetModelIcon(model: LLMConfigDTO | null | undefined, iconUrl: string) {
  const token = normalizeProviderToken(`${model?.providerType ?? ''} ${model?.modelName ?? ''} ${iconUrl}`);
  return INSET_MODEL_ICON_KEYS.some((key) => token.includes(key));
}

function ModelProviderIcon({
  model,
  size = 'sm',
  darkMode = false,
}: {
  model: LLMConfigDTO | null | undefined;
  size?: 'xs' | 'sm';
  darkMode?: boolean;
}) {
  const isSystemConfiguredModel = Boolean(model?.isSystemPreset || model?.isEditable === false);
  const iconUrl = model
    ? getProviderIcon(
        isSystemConfiguredModel ? 'linkrag' : model.providerType,
        isSystemConfiguredModel ? 'LinkRag' : model.providerType,
        model.modelName,
        { darkMode },
      )
    : '';
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

function RecallEvidencePanel({ message, showHeader = true }: { message: LocalMessage | null; showHeader?: boolean }) {
  const chunks = message?.recallChunks ?? [];
  const references = (message?.references ?? []).filter((item) => item.trim().length > 0);

  return (
    <section className="flex h-full min-h-0 flex-col">
      {showHeader && (
        <div className="flex shrink-0 items-center justify-between gap-2 px-3 pb-2 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <Search size={14} className="shrink-0 text-muted" />
            <h2 className="truncate text-sm font-semibold text-text-secondary">召回片段</h2>
          </div>
          <span className="shrink-0 rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-muted">
            {chunks.length > 0 ? chunks.length : references.length}
          </span>
        </div>
      )}

      <div className={cn('popover-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-4', !showHeader && 'pt-1')}>
        {chunks.length > 0 ? (
          chunks.map((chunk, index) => (
            <article key={`${chunk.id}-${index}`} className="border-b border-border-subtle py-3 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-ink/[0.045] text-[10px] font-bold text-muted">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold leading-4 text-ink">{chunk.fileName}</p>
                    <p className="mt-0.5 truncate text-[10px] leading-3 text-muted-soft">chunk {chunk.id}</p>
                  </div>
                </div>
                {chunk.score !== null && (
                  <span className="shrink-0 font-mono text-[10px] font-bold text-muted">{chunk.score}%</span>
                )}
              </div>
              <div className="mt-2">
                <MarkdownRenderer
                  content={chunk.snippet}
                  compact
                  className={cn(
                    'text-[11px] leading-5 text-body',
                    'prose-headings:my-2 prose-h1:text-base prose-h2:text-sm prose-h3:text-sm prose-h4:text-xs prose-h5:text-xs prose-h6:text-xs',
                    'prose-h2:border-b-0 prose-h2:pb-0 prose-p:my-1.5 prose-p:leading-5 prose-li:my-0.5 prose-ul:my-2 prose-ol:my-2',
                    '[&_h1_a]:hidden [&_h2_a]:hidden [&_h3_a]:hidden [&_h4_a]:hidden [&_h5_a]:hidden [&_h6_a]:hidden',
                    '[&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
                    '[&_pre]:my-2 [&_blockquote]:my-2 [&_blockquote]:px-3 [&_blockquote]:py-2',
                    '[&_strong]:font-bold [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:text-xs',
                    '[&_.not-prose]:my-2 [&_code]:whitespace-pre [&_table]:min-w-max [&_table]:text-[11px] [&_th]:p-1 [&_td]:p-1',
                  )}
                />
              </div>
            </article>
          ))
        ) : references.length > 0 ? (
          <div className="rounded-xl border border-dashed border-hairline bg-canvas/70 p-3">
            <p className="text-xs font-semibold text-ink">历史消息仅包含 chunk 编号</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              当前消息接口尚未返回引用正文、文件名和匹配分数，暂时只能展示命中的 chunk id。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {references.map((reference, index) => (
                <span
                  key={`${reference}-${index}`}
                  className="max-w-full truncate rounded-full bg-surface-soft px-2.5 py-1 text-[11px] font-medium text-muted"
                  title={reference}
                >
                  chunk {reference}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-canvas/55 px-3 py-5 text-center text-xs leading-relaxed text-muted">
            <p>暂无片段</p>
            <p className="mt-1 text-[11px] text-muted-soft">发送问题后会在这里展示命中的资料片段。</p>
          </div>
        )}
      </div>
    </section>
  );
}

function RecallEvidencePopover({
  open,
  message,
  onClose,
  closeSignal = 0,
}: {
  open: boolean;
  message: LocalMessage | null;
  onClose: () => void;
  closeSignal?: number;
}) {
  const [shouldRender, setShouldRender] = useState(open);
  const [closing, setClosing] = useState(open);
  const closeSignalRef = useRef(closeSignal);

  useEffect(() => {
    if (open) {
      setClosing(true);
      setShouldRender(true);
      window.requestAnimationFrame(() => setClosing(false));
      return;
    }

    if (!shouldRender) return;
    setClosing(true);
    const timeoutId = window.setTimeout(() => setShouldRender(false), SIDE_PANEL_ANIMATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [open, shouldRender]);

  useEffect(() => {
    if (closeSignalRef.current === closeSignal) return;
    closeSignalRef.current = closeSignal;
    if (!open || !shouldRender) return;
    setClosing(true);
  }, [closeSignal, open, shouldRender]);

  const closeWithAnimation = useCallback(() => {
    setClosing(true);
    onClose();
  }, [onClose]);

  if (!shouldRender) return null;

  return (
    <section
      className="flex h-full min-h-0 origin-top flex-col overflow-hidden rounded-[12px] border border-hairline bg-bg-card-solid transition-[opacity,transform] duration-180 ease-out"
      style={{
        opacity: closing ? 0 : 1,
        transform: closing ? 'translateY(-10px) scale(0.985)' : 'translateY(0) scale(1)',
      }}
      role="dialog"
      aria-modal="false"
      aria-label="召回片段"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Search size={14} className="text-muted" />
          <h2 className="truncate text-sm font-semibold text-ink">召回片段</h2>
        </div>
        <button
          type="button"
          onClick={closeWithAnimation}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-ink/[0.035] hover:text-ink"
          aria-label="关闭召回片段"
          title="关闭召回片段"
        >
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <RecallEvidencePanel message={message} showHeader={false} />
      </div>
    </section>
  );
}

function MessageStatusNotice({ status }: { status?: string | null }) {
  if (status === 'failed') {
    return (
      <div className="mb-3 flex w-fit items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
        <Info size={13} />
        回答生成失败
      </div>
    );
  }

  if (status === 'partial') {
    return (
      <div className="mb-3 flex w-fit items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
        <Info size={13} />
        回答不完整
      </div>
    );
  }

  return null;
}

function AiGeneratingIcon({ active = false }: { active?: boolean }) {
  const [replayNonce, setReplayNonce] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const { darkMode } = useTheme();

  useEffect(() => {
    if (!isReplaying || active) return;

    const settleTimeoutId = window.setTimeout(() => {
      setIsSettling(true);
    }, 1120);

    const endTimeoutId = window.setTimeout(() => {
      setIsReplaying(false);
      setIsSettling(false);
    }, 1360);

    return () => {
      window.clearTimeout(settleTimeoutId);
      window.clearTimeout(endTimeoutId);
    };
  }, [active, isReplaying, replayNonce]);

  const showActiveIcon = active || (isReplaying && !isSettling);
  const showStaticIcon = !active && (!isReplaying || isSettling);
  const staticIconUrl = darkMode ? aiGeneratingOnDarkIconUrl : aiGeneratingIconUrl;
  const activeIconUrl = darkMode ? aiGeneratingActiveOnDarkIconUrl : aiGeneratingActiveIconUrl;

  return (
    <button
      type="button"
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-opacity duration-150 hover:opacity-80"
      aria-label={active ? '正在生成回答' : '播放生成动效'}
      onClick={() => {
        if (active) return;
        setIsSettling(false);
        setIsReplaying(true);
        setReplayNonce((nonce) => nonce + 1);
      }}
    >
      <img
        src={staticIconUrl}
        alt=""
        className={cn(
          'absolute h-[34px] w-[34px] transition-opacity duration-200 ease-out',
          showStaticIcon ? 'opacity-100' : 'opacity-0',
        )}
        draggable={false}
      />
      <img
        key={`${darkMode ? 'dark' : 'light'}-active-${replayNonce}`}
        src={activeIconUrl}
        alt=""
        className={cn(
          'absolute h-[34px] w-[34px] transition-opacity duration-200 ease-out',
          showActiveIcon ? 'opacity-100' : 'opacity-0',
        )}
        draggable={false}
      />
    </button>
  );
}

function ThinkingBubble() {
  return (
    <div className="chat-rise flex items-start gap-3">
      <div className="-mt-0.5">
        <AiGeneratingIcon active />
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

interface MessageNavItem {
  id: string;
  content: string;
  index: number;
}

function MessageAnchorRail({
  items,
  activeId,
  onSelect,
}: {
  items: MessageNavItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="当前对话消息导航"
      className="group absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-end gap-1.5 lg:flex"
    >
      <div
        role="tooltip"
        className={cn(
          'absolute right-12 top-1/2 w-64 -translate-y-1/2 translate-x-2 rounded-xl border border-hairline bg-canvas/98 p-1 text-left opacity-0 shadow-xl shadow-black/10 ring-1 ring-black/[0.03] backdrop-blur transition-[opacity,transform] duration-200 ease-out',
          'pointer-events-none group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100',
        )}
      >
        <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
          {items.map((item) => {
            const active = item.id === activeId;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  'block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-xs leading-5 transition-colors',
                  active ? 'bg-surface-soft text-ink' : 'text-text-main hover:bg-surface-soft/70',
                )}
                title={item.content}
              >
                {item.content}
              </button>
            );
          })}
        </div>
      </div>
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <div key={item.id} className="relative flex h-5 items-center justify-end">
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-label={`跳转到第 ${item.index + 1} 轮消息`}
              className="flex h-5 w-10 items-center justify-end rounded-md"
            >
              <span
                className={cn(
                  'block h-1.5 rounded-full transition-[width,background-color,opacity,transform] duration-200 ease-out',
                  active
                    ? 'w-8 bg-primary opacity-90'
                    : 'w-4 bg-muted-soft/45 opacity-70 group-hover:w-7 group-hover:bg-muted group-hover:opacity-90',
                )}
              />
            </button>
          </div>
        );
      })}
    </nav>
  );
}

export default function ChatsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as ChatRouteState | null;
  const routeDatasetId = parseRouteDatasetId(routeState?.datasetId);
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const publishChatWorkspace = usePublishChatWorkspace();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerResizeFrameRef = useRef<number | null>(null);
  const recallAbortRef = useRef<AbortController | null>(null);
  const initialQuestionSentRef = useRef<string | null>(null);
  const headerActionsRef = useRef<HTMLDivElement | null>(null);
  const filesPanelRef = useRef<HTMLElement | null>(null);
  const rightPanelsRef = useRef<HTMLDivElement | null>(null);
  const modelSelectorRef = useRef<HTMLDivElement | null>(null);
  // 镜像会话列表：loadConversation 只查找用，不作为重跑触发器（避免覆盖本地消息）。
  const conversationsRef = useRef<ConversationDTO[]>([]);

  const [conversations, setConversations] = useState<ConversationDTO[]>(() => getCachedConversations(user?.id) ?? []);
  const [datasets, setDatasets] = useState<DatasetDTO[]>(() => cachedChatWorkspace?.datasets ?? []);
  const [files, setFiles] = useState<KnowledgeFileDTO[]>([]);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [conversation, setConversation] = useState<ConversationDTO | null>(null);
  // 会话历史的加载态与数据集/模型分离：有缓存时初始即为 false，避免无谓的转圈
  const [loadingHistory, setLoadingHistory] = useState(() => getCachedConversations(user?.id) === null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filesPanelOpen, setFilesPanelOpen] = useState(false);
  const [filesPanelRendered, setFilesPanelRendered] = useState(false);
  const [filesPanelClosing, setFilesPanelClosing] = useState(false);
  const [resourcePanelMode, setResourcePanelMode] = useState<ResourcePanelMode>(() =>
    routeDatasetId ? 'files' : 'datasets',
  );
  const [fileSearch, setFileSearch] = useState('');
  const [dragging, setDragging] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(() => routeDatasetId);
  const [chatModels, setChatModels] = useState<LLMConfigDTO[]>(() => cachedChatWorkspace?.chatModels ?? []);
  const [selectedModelConfigId, setSelectedModelConfigId] = useState<number | null>(
    () => cachedChatWorkspace?.selectedModelConfigId ?? null,
  );
  const [modelOpen, setModelOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingInitialQuestion, setPendingInitialQuestion] = useState('');
  const [recallPanelOpen, setRecallPanelOpen] = useState(false);
  const [recallPanelRendered, setRecallPanelRendered] = useState(false);
  const [recallCloseSignal, setRecallCloseSignal] = useState(0);
  const [rightPanelLayoutOpen, setRightPanelLayoutOpen] = useState(false);
  const [rightPanelSplitRatio, setRightPanelSplitRatio] = useState(0.3);
  const [activeMessageAnchorId, setActiveMessageAnchorId] = useState<string | null>(null);
  const filesCloseTimeoutRef = useRef<number | null>(null);
  const recallCloseTimeoutRef = useRef<number | null>(null);

  const activeConversationId = id ? Number(id) : null;
  const rightPanelActive = recallPanelOpen || filesPanelOpen;

  useEffect(() => {
    activeChatConversationId = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    displayedChatConversationId = conversation?.id ?? activeConversationId;
  }, [activeConversationId, conversation?.id]);

  useEffect(() => {
    const listener: ConversationDraftListener = (conversationId, draft) => {
      if (activeChatConversationId === conversationId || displayedChatConversationId === conversationId) {
        setMessages(draft.messages);
        setSending(draft.sending);
      }
    };

    conversationDraftListeners.add(listener);
    return () => {
      conversationDraftListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!modelOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (modelSelectorRef.current?.contains(target)) return;
      setModelOpen(false);
    }

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [modelOpen]);

  useEffect(() => {
    return () => {
      if (filesCloseTimeoutRef.current !== null) window.clearTimeout(filesCloseTimeoutRef.current);
      if (recallCloseTimeoutRef.current !== null) window.clearTimeout(recallCloseTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (filesPanelOpen) {
      setFilesPanelRendered(true);
      return;
    }

    if (!filesPanelRendered) return;
    const timeoutId = window.setTimeout(() => setFilesPanelRendered(false), SIDE_PANEL_ANIMATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [filesPanelOpen, filesPanelRendered]);

  useEffect(() => {
    if (recallPanelOpen) {
      setRecallPanelRendered(true);
      return;
    }

    if (!recallPanelRendered) return;
    const timeoutId = window.setTimeout(() => setRecallPanelRendered(false), SIDE_PANEL_ANIMATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [recallPanelOpen, recallPanelRendered]);

  useEffect(() => {
    if (rightPanelActive) {
      setRightPanelLayoutOpen(true);
      return;
    }

    if (!rightPanelLayoutOpen) return;
    const timeoutId = window.setTimeout(() => setRightPanelLayoutOpen(false), RIGHT_PANEL_LAYOUT_RELEASE_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [rightPanelActive, rightPanelLayoutOpen]);

  const routeInitialQuestion = typeof routeState?.initialQuestion === 'string' ? routeState.initialQuestion.trim() : '';
  const storedInitialQuestion = activeConversationId
    ? (sessionStorage.getItem(`${INITIAL_QUESTION_STORAGE_PREFIX}${activeConversationId}`)?.trim() ?? '')
    : '';
  const initialQuestion = routeInitialQuestion || storedInitialQuestion;
  const displayName = user?.nickname || user?.username || '用户';
  const selectedDataset = selectedDatasetId ? datasets.find((dataset) => dataset.id === selectedDatasetId) : null;
  const selectedModel = selectedModelConfigId ? chatModels.find((model) => model.id === selectedModelConfigId) : null;

  useEffect(() => {
    if (!cachedChatWorkspace || !selectedModelConfigId) return;
    cachedChatWorkspace = {
      ...cachedChatWorkspace,
      selectedModelConfigId,
    };
  }, [selectedModelConfigId]);

  const messageTurnIdById = useMemo(() => {
    const turnIdById = new Map<string, string>();
    let currentTurnId: string | null = null;

    messages.forEach((message) => {
      if (message.role === 'user') currentTurnId = message.id;
      if (currentTurnId) turnIdById.set(message.id, currentTurnId);
    });

    return turnIdById;
  }, [messages]);
  const messageNavItems = useMemo<MessageNavItem[]>(
    () =>
      messages
        .filter((message) => message.role === 'user')
        .map((message, index) => {
          const content = (message.content ?? '').trim() || '空消息';

          return {
            id: message.id,
            content,
            index,
          };
        }),
    [messages],
  );
  const inputQuery = inputValue.trim();
  const inputQueryTooLong = isRagQueryTooLong(inputQuery);
  const inputLength = inputValue.length;

  const resizeComposerTextarea = useCallback(() => {
    const textarea = composerTextareaRef.current;
    if (!textarea) return;
    if (composerResizeFrameRef.current !== null) {
      window.cancelAnimationFrame(composerResizeFrameRef.current);
      composerResizeFrameRef.current = null;
    }

    const previousHeight = textarea.offsetHeight;
    textarea.style.height = 'auto';
    const nextHeight = Math.min(textarea.scrollHeight, COMPOSER_TEXTAREA_MAX_HEIGHT);
    const overflowY = textarea.scrollHeight > COMPOSER_TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
    if (Math.abs(previousHeight - nextHeight) <= 1) {
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY = overflowY;
      return;
    }

    textarea.style.height = `${previousHeight}px`;
    textarea.style.overflowY = 'hidden';
    composerResizeFrameRef.current = window.requestAnimationFrame(() => {
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY = overflowY;
      composerResizeFrameRef.current = null;
    });
  }, []);

  useLayoutEffect(() => {
    resizeComposerTextarea();
  }, [inputValue, resizeComposerTextarea]);

  useEffect(() => {
    window.addEventListener('resize', resizeComposerTextarea);
    return () => window.removeEventListener('resize', resizeComposerTextarea);
  }, [resizeComposerTextarea]);

  useEffect(() => {
    return () => {
      if (composerResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(composerResizeFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    // 会话历史独立加载：一返回就渲染，不被较慢的数据集/模型接口阻塞侧栏列表
    const loadHistory = async () => {
      try {
        const convResult = await getConversations(1, 100);
        if (!cancelled) setConversations(convResult.items);
      } catch (error) {
        if (!cancelled) console.error('Failed to load conversations:', error);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    // 数据集与模型配置：仅影响主区域（知识库/模型选择），与历史列表互不阻塞
    const loadWorkspace = async () => {
      try {
        const [dsResult, modelResult] = await Promise.all([
          getDatasets(1, 100),
          getLLMConfigs({ capability: 'CHAT', isActive: true }),
        ]);
        if (cancelled) return;
        setDatasets(dsResult.items);
        const chatModelItems = modelResult;
        setChatModels(chatModelItems);
        const defaultModel = chatModelItems.find((model) => model.isDefault) ?? chatModelItems[0];
        cachedChatWorkspace = {
          datasets: dsResult.items,
          chatModels: chatModelItems,
          selectedModelConfigId: defaultModel?.id ?? null,
        };
        setSelectedModelConfigId(defaultModel?.id ?? null);
      } catch (error) {
        if (!cancelled) console.error('Failed to load chat workspace:', error);
      }
    };

    void loadHistory();
    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    conversationsRef.current = conversations;
    setCachedConversations(user?.id, conversations);
  }, [conversations, user?.id]);

  // 会话标题以服务端为准（LINK-209）：列表刷新后若活动会话标题变化，同步到会话头。
  useEffect(() => {
    if (!conversation) return;
    const refreshed = conversations.find((item) => item.id === conversation.id);
    if (refreshed && refreshed.title !== conversation.title) {
      setConversation(refreshed);
    }
  }, [conversation, conversations]);

  // 仅在会话 id 变化时加载一次会话/消息。不要依赖 conversations / chatModels，
  // 否则它们异步到位后会重跑此 effect，用后端的空消息列表覆盖掉首轮乐观/流式消息。
  useEffect(() => {
    if (!activeConversationId || !Number.isFinite(activeConversationId)) {
      setConversation(null);
      setMessages([]);
      setSending(false);
      setSelectedDatasetId(routeDatasetId);
      return;
    }

    let cancelled = false;
    const loadConversation = async () => {
      const cachedDraft = conversationDrafts.get(activeConversationId);
      if (cachedDraft) {
        setMessages(cachedDraft.messages);
        setSending(cachedDraft.sending);
      }
      setLoadingConversation(!cachedDraft);
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
        const msgResult = await getMessages(conv.id, 1, 100);
        if (cancelled) return;
        const uiMessages = toUiMessages(msgResult.items);
        const latestDraft = conversationDrafts.get(conv.id);
        const shouldUseDraft = Boolean(
          latestDraft && (latestDraft.sending || uiMessages.length < latestDraft.messages.length),
        );
        setConversation(conv);
        setSelectedDatasetId(conv.datasetId);
        if (shouldUseDraft && latestDraft) {
          setMessages(latestDraft.messages);
          setSending(latestDraft.sending);
        } else {
          conversationDrafts.delete(conv.id);
          setMessages(uiMessages);
          setSending(false);
        }

        const referencedChunkIds = collectReferencedChunkIds(uiMessages);
        if (!shouldUseDraft && referencedChunkIds.length > 0) {
          void getChunkDetails(referencedChunkIds)
            .then((details) => {
              if (cancelled) return;
              const hydratedChunks: RecallChunk[] = details
                .map((detail) => {
                  const content = detail.content.trim();
                  if (!content) return null;

                  return {
                    id: detail.chunkId,
                    fileName: detail.fileName ?? `chunk ${detail.chunkId}`,
                    score: normalizeChunkScore(detail.score),
                    snippet: content,
                  };
                })
                .filter((chunk): chunk is RecallChunk => chunk !== null);

              setMessages((current) => hydrateMessagesWithChunkDetails(current, hydratedChunks));
            })
            .catch((error) => {
              if (!cancelled) console.error('Failed to load chunk details:', error);
            });
        }
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

  useEffect(() => {
    const latestItem = messageNavItems[messageNavItems.length - 1];
    setActiveMessageAnchorId((current) => {
      if (current && messageNavItems.some((item) => item.id === current)) return current;
      return latestItem?.id ?? null;
    });
  }, [messageNavItems]);

  useEffect(() => {
    const scrollEl = messageScrollRef.current;
    if (!scrollEl || messageNavItems.length === 0) return;

    const updateActiveAnchor = () => {
      const scrollRect = scrollEl.getBoundingClientRect();
      const viewportTop = scrollRect.top + 24;
      const viewportBottom = scrollRect.bottom - 24;
      const visibleByTurn = new Map<string, number>();

      scrollEl.querySelectorAll<HTMLElement>('[data-message-turn-id]').forEach((node) => {
        const turnId = node.dataset.messageTurnId;
        if (!turnId) return;

        const rect = node.getBoundingClientRect();
        const visibleTop = Math.max(rect.top, viewportTop);
        const visibleBottom = Math.min(rect.bottom, viewportBottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        if (visibleHeight <= 0) return;

        visibleByTurn.set(turnId, (visibleByTurn.get(turnId) ?? 0) + visibleHeight);
      });

      let activeId = activeMessageAnchorId;
      let maxVisibleHeight = 0;

      for (const item of messageNavItems) {
        const visibleHeight = visibleByTurn.get(item.id) ?? 0;
        if (visibleHeight > maxVisibleHeight) {
          maxVisibleHeight = visibleHeight;
          activeId = item.id;
        }
      }

      if (!activeId) activeId = messageNavItems[0]?.id ?? null;
      setActiveMessageAnchorId(activeId);
    };

    updateActiveAnchor();
    scrollEl.addEventListener('scroll', updateActiveAnchor, { passive: true });
    return () => scrollEl.removeEventListener('scroll', updateActiveAnchor);
  }, [activeMessageAnchorId, messageNavItems]);

  const scrollToMessageAnchor = useCallback((messageId: string) => {
    const scrollEl = messageScrollRef.current;
    const node = scrollEl?.querySelector<HTMLElement>(`[data-message-anchor-id="${CSS.escape(messageId)}"]`);
    if (!scrollEl || !node) return;

    scrollEl.scrollTo({
      top: node.offsetTop - 24,
      behavior: 'smooth',
    });
    setActiveMessageAnchorId(messageId);
  }, []);

  const copyMessageContent = useCallback(
    async (content: string | null | undefined) => {
      const text = (content ?? '').trim();
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        addToast('success', '已复制');
      } catch (error) {
        console.error('Failed to copy message:', error);
        addToast('error', '复制失败，请手动复制');
      }
    },
    [addToast],
  );

  useEffect(() => {
    if (!activeConversationId || !initialQuestion) return;
    const sendKey = `${activeConversationId}:${initialQuestion}`;
    if (initialQuestionSentRef.current === sendKey) return;
    setPendingInitialQuestion(initialQuestion);
    setInputValue(initialQuestion);
  }, [activeConversationId, initialQuestion]);

  const beginNewConversation = useCallback(() => {
    recallAbortRef.current?.abort();
    setConversation(null);
    setMessages([]);
    setInputValue('');
    navigate(Routes.Chats, {
      state: selectedDatasetId ? { datasetId: selectedDatasetId } : null,
    });
  }, [navigate, selectedDatasetId]);

  const handleDeleteConversation = useCallback(
    async (id: number) => {
      try {
        await deleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          beginNewConversation();
        }
        addToast('success', '对话已删除');
      } catch (err) {
        console.error('Failed to delete conversation:', err);
        addToast('error', '删除失败');
      }
    },
    [activeConversationId, addToast, beginNewConversation],
  );

  const handleRenameConversation = useCallback(
    async (conversationId: number, title: string) => {
      const nextTitle = title.trim();
      if (!nextTitle) return;

      const previousConversation = conversationsRef.current.find((item) => item.id === conversationId) ?? null;
      if ((previousConversation?.title ?? '').trim() === nextTitle) return;

      const optimisticConversation = previousConversation
        ? { ...previousConversation, title: nextTitle, updatedAt: new Date().toISOString() }
        : null;
      if (optimisticConversation) {
        setConversations((prev) => prev.map((item) => (item.id === conversationId ? optimisticConversation : item)));
        setConversation((prev) => (prev?.id === conversationId ? optimisticConversation : prev));
      }

      try {
        const updated = await updateConversation(conversationId, { title: nextTitle });
        setConversations((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setConversation((prev) => (prev?.id === updated.id ? updated : prev));
        addToast('success', '对话已重命名');
      } catch (error) {
        console.error('Failed to rename conversation:', error);
        if (previousConversation) {
          setConversations((prev) => prev.map((item) => (item.id === conversationId ? previousConversation : item)));
          setConversation((prev) => (prev?.id === conversationId ? previousConversation : prev));
        }
        addToast('error', '重命名失败');
      }
    },
    [addToast],
  );

  const handleSend = useCallback(
    async (overrideContent?: string, options?: SendOptions) => {
      const content = (overrideContent ?? inputValue).trim();
      if (!content || sending) return false;
      if (isRagQueryTooLong(content)) {
        addToast('error', RAG_QUERY_MAX_LENGTH_MESSAGE);
        return false;
      }
      const isFirstTurn = messages.length === 0;
      if (!selectedDatasetId) {
        setFilesPanelOpen(true);
        setResourcePanelMode('datasets');
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
            datasetId: selectedDatasetId,
            lastConfigId: selectedModelConfigId,
          });
          setConversation(activeConversation);
        }
        displayedChatConversationId = activeConversation.id;
      } catch (error) {
        console.error('Failed to create conversation:', error);
        addToast('error', '创建对话失败');
        return false;
      }

      // 新建或再次发言的会话都置顶：新会话加入列表，已有会话提到最前，体现“最近进行”。
      setConversations((prev) => [activeConversation!, ...prev.filter((item) => item.id !== activeConversation!.id)]);

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

      const nextMessages = [...messages, userMsg, assistantMsg];
      updateConversationDraft(activeConversation.id, () => ({
        messages: nextMessages,
        sending: true,
        updatedAt: Date.now(),
      }));
      setActiveMessageAnchorId(userMsg.id);
      setInputValue('');
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
          // LINK-209：仅会话首条用户消息带 is_first_turn=true，由 Python 基于 query 生成会话标题。
          isFirstTurn,
          signal: controller.signal,
          onAnswerDelta: (text) => {
            updateConversationDraft(activeConversation.id, (draft) => ({
              messages: (draft?.messages ?? nextMessages).map((msg) =>
                msg.id === assistantId ? { ...msg, content: `${msg.content ?? ''}${text}` } : msg,
              ),
              sending: true,
              updatedAt: Date.now(),
            }));
          },
          // LINK-209：conversation_title 事件即时刷新侧栏 + 会话头。到达时机不固定（可能在流式答案中途或结束后）。
          // 权威源仍是服务端会话列表/详情；这里只做即时展示，不再轮询 Java 猜标题。
          onConversationTitle: (title) => {
            setConversations((prev) =>
              prev.map((item) => (item.id === activeConversation!.id ? { ...item, title } : item)),
            );
            setConversation((prev) => (prev?.id === activeConversation!.id ? { ...prev, title } : prev));
          },
        });
        const chunks = hitsToRecallChunks(result.hits, files);
        updateConversationDraft(activeConversation.id, (draft) => ({
          messages: (draft?.messages ?? nextMessages).map((msg) =>
            msg.id === assistantId ? { ...msg, recallChunks: chunks } : msg,
          ),
          sending: true,
          updatedAt: Date.now(),
        }));
        if (!result.answer && result.hits.length === 0) {
          updateConversationDraft(activeConversation.id, (draft) => ({
            messages: (draft?.messages ?? nextMessages).map((msg) =>
              msg.id === assistantId ? { ...msg, content: '未召回到相关内容。' } : msg,
            ),
            sending: true,
            updatedAt: Date.now(),
          }));
        }
      } catch (error) {
        if (!isRecallAborted(error)) {
          const message = recallErrorMessage(error);
          updateConversationDraft(activeConversation.id, (draft) => ({
            messages: (draft?.messages ?? nextMessages).map((msg) =>
              msg.id === assistantId ? { ...msg, content: message } : msg,
            ),
            sending: true,
            updatedAt: Date.now(),
          }));
          if (isRecallError(error)) addToast('error', message);
        }
      } finally {
        if (recallAbortRef.current === controller) recallAbortRef.current = null;
        updateConversationDraft(activeConversation.id, (draft) => ({
          messages: draft?.messages ?? nextMessages,
          sending: false,
          updatedAt: Date.now(),
        }));
      }
      return true;
    },
    [
      addToast,
      conversation,
      files,
      inputValue,
      messages,
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
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const notifyQueryMaxLength = useCallback(() => {
    addToast('error', RAG_QUERY_MAX_LENGTH_MESSAGE);
  }, [addToast]);

  const handleComposerChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      if (nextValue.length > RAG_QUERY_MAX_LENGTH) {
        setInputValue(limitRagQueryLength(nextValue));
        notifyQueryMaxLength();
        return;
      }
      setInputValue(nextValue);
    },
    [notifyQueryMaxLength],
  );

  const promptSelectDatasetForUpload = () => {
    addToast('error', '请先选择知识库后再上传文件');
    setFilesPanelOpen(true);
    setResourcePanelMode('datasets');
    setDragging(false);
  };

  const handleFileUpload = async (fileList: FileList | File[]) => {
    const selectedFiles = Array.from(fileList);
    if (selectedFiles.length === 0) return;

    if (!selectedDatasetId) {
      promptSelectDatasetForUpload();
      return;
    }
    const unsupportedFiles = selectedFiles.filter((file) => !isSupportedKnowledgeFile(file));
    if (unsupportedFiles.length > 0) {
      addToast('error', KNOWLEDGE_FILE_UNSUPPORTED_MESSAGE);
      setDragging(false);
      return;
    }

    const existingFilenames = new Set(files.map((file) => normalizeFilename(file.originalFilename)));
    const incomingFilenames = new Set<string>();
    const uploadableFiles = selectedFiles.filter((file) => {
      const filename = normalizeFilename(file.name);
      if (existingFilenames.has(filename) || incomingFilenames.has(filename)) {
        return false;
      }
      incomingFilenames.add(filename);
      return true;
    });
    const skippedCount = selectedFiles.length - uploadableFiles.length;

    if (uploadableFiles.length === 0) {
      addToast('error', '选择的文件已存在，无需重复上传');
      setDragging(false);
      return;
    }

    setUploading(true);
    try {
      await Promise.all(uploadableFiles.map((file) => uploadKnowledgeFile(selectedDatasetId, file, false)));
      addToast(
        'success',
        [
          uploadableFiles.length > 1 ? `${uploadableFiles.length} 个文件上传成功` : '文件上传成功',
          skippedCount > 0 ? `已跳过 ${skippedCount} 个重复文件` : '',
        ]
          .filter(Boolean)
          .join('，'),
      );
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
    const fileList = event.target.files;
    event.target.value = '';
    if (fileList) await handleFileUpload(fileList);
  };

  const filteredFiles = files.filter((file) =>
    file.originalFilename.toLowerCase().includes(fileSearch.trim().toLowerCase()),
  );

  const chatWorkspaceSnapshot = useMemo<ChatWorkspaceSnapshot>(
    () => ({
      conversations,
      activeConversationId,
      // 仅在确无数据且仍在拉取时显示加载态；有缓存/已加载数据时后台静默刷新
      loadingConversations: loadingHistory && conversations.length === 0,
      onBeginNewConversation: beginNewConversation,
      onDeleteConversation: handleDeleteConversation,
      onRenameConversation: handleRenameConversation,
    }),
    [
      conversations,
      activeConversationId,
      loadingHistory,
      beginNewConversation,
      handleDeleteConversation,
      handleRenameConversation,
    ],
  );
  const evidenceMessage = useMemo<LocalMessage | null>(() => {
    if (activeMessageAnchorId) {
      const activeUserIndex = messages.findIndex(
        (message) => message.id === activeMessageAnchorId && message.role === 'user',
      );

      if (activeUserIndex >= 0) {
        const nextUserIndex = messages.findIndex(
          (message, index) => index > activeUserIndex && message.role === 'user',
        );
        const turnEndIndex = nextUserIndex >= 0 ? nextUserIndex : messages.length;
        return (
          messages.slice(activeUserIndex + 1, turnEndIndex).find((message) => message.role === 'assistant') ?? null
        );
      }
    }

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (
        message.role === 'assistant' &&
        ((message.recallChunks && message.recallChunks.length > 0) ||
          (message.references && message.references.length > 0))
      ) {
        return message;
      }
    }
    return null;
  }, [messages, activeMessageAnchorId]);
  const evidenceCount =
    (evidenceMessage?.recallChunks?.length ?? 0) > 0
      ? (evidenceMessage?.recallChunks?.length ?? 0)
      : (evidenceMessage?.references?.length ?? 0);

  const openFilesPanel = useCallback(() => {
    if (filesCloseTimeoutRef.current !== null) {
      window.clearTimeout(filesCloseTimeoutRef.current);
      filesCloseTimeoutRef.current = null;
    }
    if (!selectedDatasetId) {
      setResourcePanelMode('datasets');
    }
    setFilesPanelClosing(false);
    setFilesPanelOpen(true);
  }, [selectedDatasetId]);

  const closeFilesPanelWithAnimation = useCallback(() => {
    if (!filesPanelOpen) return;
    if (filesCloseTimeoutRef.current !== null) {
      window.clearTimeout(filesCloseTimeoutRef.current);
    }
    setFilesPanelClosing(true);
    filesCloseTimeoutRef.current = window.setTimeout(() => {
      setFilesPanelOpen(false);
      setFilesPanelClosing(false);
      filesCloseTimeoutRef.current = null;
    }, SIDE_PANEL_ANIMATION_MS);
  }, [filesPanelOpen]);

  const toggleFilesPanel = useCallback(() => {
    if (filesPanelOpen) {
      closeFilesPanelWithAnimation();
      return;
    }
    openFilesPanel();
  }, [closeFilesPanelWithAnimation, filesPanelOpen, openFilesPanel]);

  const openRecallPanel = useCallback(() => {
    if (recallCloseTimeoutRef.current !== null) {
      window.clearTimeout(recallCloseTimeoutRef.current);
      recallCloseTimeoutRef.current = null;
    }
    setRecallPanelOpen(true);
  }, []);

  const closeRecallPanelWithAnimation = useCallback(() => {
    if (!recallPanelOpen) return;
    if (recallCloseTimeoutRef.current !== null) {
      window.clearTimeout(recallCloseTimeoutRef.current);
    }
    setRecallCloseSignal((signal) => signal + 1);
    recallCloseTimeoutRef.current = window.setTimeout(() => {
      setRecallPanelOpen(false);
      recallCloseTimeoutRef.current = null;
    }, SIDE_PANEL_ANIMATION_MS);
  }, [recallPanelOpen]);

  const toggleRecallPanel = useCallback(() => {
    if (recallPanelOpen) {
      closeRecallPanelWithAnimation();
      return;
    }
    openRecallPanel();
  }, [closeRecallPanelWithAnimation, openRecallPanel, recallPanelOpen]);

  const resizeRightPanelSplit = useCallback((clientY: number) => {
    const panel = rightPanelsRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    if (rect.height <= 0) return;

    const ratio = (clientY - rect.top) / rect.height;
    setRightPanelSplitRatio(Math.min(RIGHT_PANEL_MAX_SPLIT_RATIO, Math.max(RIGHT_PANEL_MIN_SPLIT_RATIO, ratio)));
  }, []);

  const beginRightPanelSplitResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      resizeRightPanelSplit(event.clientY);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';

      const handlePointerMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault();
        resizeRightPanelSplit(moveEvent.clientY);
      };

      const handlePointerEnd = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [resizeRightPanelSplit],
  );

  // 兼容仍通过 ChatWorkspaceContext 读取历史快照的外层能力；右侧面板直接使用本页快照。
  useEffect(() => {
    if (!publishChatWorkspace) return;
    publishChatWorkspace(chatWorkspaceSnapshot);
    // 不在卸载时发布 null：/chats 与 /chats/:id 是不同的 lazy 组件，
    // 且外层 AnimatePresence(mode="sync") 切换时新旧实例会短暂并存，
    // 旧实例卸载的清理会把新实例刚发布的快照清空，导致侧栏一直转圈。
    // 历史面板仅在对话路由显示，离开时本就不渲染，保留上次快照无害（且避免闪烁），
    // 登出时由 ChatWorkspaceProvider 卸载兜底清理。
  }, [publishChatWorkspace, chatWorkspaceSnapshot]);

  const welcomeSuggestions = ['从知识库检索要点', '总结上传的文档', '对比两份资料的差异'];
  const rightPanelOpen = rightPanelLayoutOpen;
  const rightPanelRendered = recallPanelRendered || filesPanelRendered;
  const effectiveRecallPanelOpen = rightPanelActive ? recallPanelOpen : recallPanelRendered;
  const effectiveFilesPanelOpen = rightPanelActive ? filesPanelOpen : filesPanelRendered;
  const rightPanelSplitResizable = effectiveFilesPanelOpen && effectiveRecallPanelOpen;
  const filesPanelRowSize = rightPanelSplitResizable ? rightPanelSplitRatio : effectiveFilesPanelOpen ? 1 : 0;
  const recallPanelRowSize = rightPanelSplitResizable ? 1 - rightPanelSplitRatio : effectiveRecallPanelOpen ? 1 : 0;
  const rightPanelRows = [
    `minmax(0, ${filesPanelRowSize}fr)`,
    `${rightPanelSplitResizable ? 12 : 0}px`,
    `minmax(0, ${recallPanelRowSize}fr)`,
  ].join(' ');
  const showResourceDatasetList = resourcePanelMode === 'datasets' || !selectedDatasetId;
  const chatContentOffsetClass = rightPanelOpen ? '' : 'lg:-translate-x-8';
  const showInlineComposer = !loadingConversation && messages.length === 0;
  const renderComposer = (withOffset = true, maxWidthClass = 'max-w-[860px]') => (
    <div className={cn('mx-auto', maxWidthClass, withOffset && chatContentOffsetClass)}>
      <div
        className={cn(
          'flex items-end gap-2 rounded-2xl border bg-canvas p-2 (--)]',
          inputQueryTooLong ? 'border-error' : 'border-hairline',
        )}
      >
        <textarea
          ref={composerTextareaRef}
          value={inputValue}
          onChange={handleComposerChange}
          onKeyDown={handleComposerKeyDown}
          rows={1}
          disabled={sending}
          placeholder="输入提问，回车开始召回…"
          className="min-h-10 min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent px-2 py-2.5 text-sm leading-5 text-text-main transition-[height] duration-150 ease-out outline-none placeholder:text-muted-soft"
        />
        <div ref={modelSelectorRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setModelOpen((value) => !value)}
            className={cn(
              'flex h-10 shrink-0 items-center overflow-hidden rounded-lg text-xs font-medium text-text-secondary transition-[width,color] duration-180 ease-out hover:text-ink',
              modelOpen ? 'w-[132px] justify-start gap-2 px-2 sm:w-[164px]' : 'w-10 justify-center gap-0 px-0',
            )}
            title={getModelDisplayName(selectedModel) || '选择模型'}
            aria-label={getModelDisplayName(selectedModel) || '选择模型'}
            aria-expanded={modelOpen}
          >
            <ModelProviderIcon model={selectedModel} size="sm" darkMode={darkMode} />
            <span
              className={cn(
                'min-w-0 truncate transition-[opacity,transform] duration-150 ease-out',
                modelOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-1 opacity-0',
              )}
            >
              {getModelDisplayName(selectedModel) || '选择模型'}
            </span>
          </button>
          {modelOpen && (
            <div
              className={cn(
                'popover-scrollbar absolute right-0 z-20 max-h-64 w-[min(15rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-hairline bg-canvas/98 p-1.5 pr-1 shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.02] backdrop-blur',
                withOffset ? 'bottom-full mb-2' : 'top-full mt-3',
              )}
            >
              {chatModels.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    setSelectedModelConfigId(model.id);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors',
                    model.id === selectedModelConfigId
                      ? 'bg-ink/[0.045] text-ink'
                      : 'text-text-secondary hover:bg-ink/[0.035] hover:text-ink',
                  )}
                >
                  <ModelProviderIcon model={model} size="xs" darkMode={darkMode} />
                  <span className="min-w-0 flex-1 truncate">{getModelDisplayName(model)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !inputQuery || inputQueryTooLong}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
        </button>
      </div>
      <div
        className={cn(
          'mt-1 flex justify-end px-2 text-[11px] leading-5',
          inputQueryTooLong ? 'text-error' : 'text-muted-soft',
        )}
      >
        {inputQueryTooLong
          ? `${RAG_QUERY_MAX_LENGTH_MESSAGE} · ${inputLength}/${RAG_QUERY_MAX_LENGTH}`
          : `${inputLength}/${RAG_QUERY_MAX_LENGTH}`}
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-canvas">
      <header
        className={cn(
          'relative flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-3 transition-[padding] duration-180 ease-out sm:px-6',
          'after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-border-subtle after:transition-[right] after:duration-180 after:ease-out sm:after:left-6 sm:after:right-6',
          rightPanelOpen &&
            'lg:pr-[calc(1.5rem+var(--chat-right-panel-offset))] lg:after:right-[calc(1.5rem+var(--chat-right-panel-offset))]',
        )}
        style={{ '--chat-right-panel-offset': `${RIGHT_PANEL_OFFSET}px` } as React.CSSProperties}
      >
        {/* 面包屑：桌面端显示；移动端由外壳顶栏承担标题 */}
        <div className="hidden items-center gap-3 min-w-0 flex-1 lg:flex">
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '对话' }]} />
        </div>
        <div ref={headerActionsRef} className="flex shrink-0 items-center gap-2">
          <HeaderButton active={filesPanelOpen} icon={Files} onClick={toggleFilesPanel} title="管理知识库和文件">
            资料 {files.length}
          </HeaderButton>
          <HeaderButton active={recallPanelOpen} icon={Search} onClick={toggleRecallPanel} title="显示或隐藏召回片段">
            召回 {evidenceCount}
          </HeaderButton>
        </div>
      </header>

      {rightPanelRendered && (
        <div
          ref={rightPanelsRef}
          className="fixed bottom-3 right-3 top-20 z-40 grid w-[min(var(--chat-right-panel-width),calc(100vw-24px))] transition-[grid-template-rows] duration-180 ease-out lg:top-3"
          style={
            {
              '--chat-right-panel-width': `${RIGHT_PANEL_WIDTH}px`,
              gridTemplateRows: rightPanelRows,
            } as React.CSSProperties
          }
        >
          <div className="min-h-0 overflow-hidden">
            {filesPanelRendered && (
              <section
                ref={filesPanelRef}
                className="chat-side-panel-in flex h-full min-h-0 origin-top flex-col overflow-hidden rounded-[12px] border border-hairline bg-bg-card-solid transition-[opacity,transform] duration-180 ease-out"
                style={{
                  opacity: filesPanelOpen && !filesPanelClosing ? 1 : 0,
                  transform:
                    filesPanelOpen && !filesPanelClosing ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.985)',
                }}
                role="dialog"
                aria-modal="false"
                aria-label="资料"
              >
                <div className="flex shrink-0 items-center justify-between gap-3 px-3.5 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <Files size={14} className="text-muted" />
                    <h2 className="truncate text-sm font-semibold text-ink">资料</h2>
                    <span className="shrink-0 text-[11px] font-medium text-muted">{files.length} 个文件</span>
                  </div>
                  <button
                    type="button"
                    onClick={closeFilesPanelWithAnimation}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-ink/[0.035] hover:text-ink"
                    aria-label="关闭资料"
                    title="关闭资料"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-2.5">
                  <div className="mb-2.5 flex shrink-0 items-center gap-2 border-b border-border-subtle/70 pb-2.5">
                    <button
                      type="button"
                      onClick={() => setResourcePanelMode(showResourceDatasetList ? 'files' : 'datasets')}
                      className="min-w-0 flex-1 text-left transition-colors hover:text-ink"
                      title={selectedDataset?.name ?? '选择知识库'}
                    >
                      <p className="text-[10px] font-medium leading-4 text-muted">当前知识库</p>
                      <p className="truncate text-sm font-semibold leading-5 text-ink">
                        {selectedDataset?.name ?? '未选择'}
                      </p>
                    </button>
                    {!showResourceDatasetList && (
                      <div className="flex h-8 w-[126px] shrink-0 items-center gap-1.5 rounded-md border border-transparent bg-ink/[0.035] px-2 transition-colors focus-within:border-primary/25 focus-within:bg-bg-card-solid">
                        <Search size={13} className="shrink-0 text-muted" />
                        <input
                          value={fileSearch}
                          onChange={(e) => setFileSearch(e.target.value)}
                          placeholder="搜索"
                          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs text-ink outline-none placeholder:text-muted-soft"
                        />
                      </div>
                    )}
                  </div>

                  {showResourceDatasetList ? (
                    <div className="min-h-0 flex-1">
                      <div className="mb-2 flex items-center justify-between px-1">
                        <p className="text-xs font-semibold text-ink">选择知识库</p>
                        <span className="text-[10px] font-medium text-muted">{datasets.length} 个</span>
                      </div>
                      <div className="popover-scrollbar h-[calc(100%-1.5rem)] overflow-y-auto pr-1.5">
                        {datasets.length === 0 ? (
                          <div className="flex h-full min-h-24 items-center justify-center text-center text-xs text-muted">
                            暂无可选知识库
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {datasets.map((dataset) => {
                              const selected = dataset.id === selectedDatasetId;
                              return (
                                <button
                                  key={dataset.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedDatasetId(dataset.id);
                                    setResourcePanelMode('files');
                                  }}
                                  className={cn(
                                    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                                    selected
                                      ? 'bg-ink/[0.045] text-ink'
                                      : 'text-text-secondary hover:bg-ink/[0.035] hover:text-ink',
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'h-2 w-2 shrink-0 rounded-full transition-colors',
                                      selected ? 'bg-ink' : 'bg-muted-soft/45',
                                    )}
                                  />
                                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">{dataset.name}</span>
                                  {selected && (
                                    <span className="shrink-0 text-[10px] font-semibold text-muted">当前</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
                      {loadingFiles ? (
                        <div className="flex h-24 items-center justify-center text-muted">
                          <Loader2 size={16} className="animate-spin" />
                        </div>
                      ) : filteredFiles.length === 0 ? (
                        <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center text-xs text-muted">
                          <p>当前知识库还没有文件</p>
                        </div>
                      ) : (
                        <div className="popover-scrollbar min-h-0 flex-1 overflow-y-auto pr-1.5">
                          {filteredFiles.map((file) => (
                            <div
                              key={file.id}
                              className="group/file flex items-start gap-2.5 border-b border-border-subtle/70 px-1 py-2.5 last:border-b-0"
                            >
                              <div className="mt-0.5 shrink-0">
                                <KnowledgeFileIcon suffix={file.fileSuffix} compact />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold leading-5 text-ink">
                                  {file.originalFilename}
                                </p>
                                <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[10px] leading-4 text-muted">
                                  <span className="shrink-0">{formatSize(file.fileSize)}</span>
                                  <span className="h-1 w-1 shrink-0 rounded-full bg-muted-soft/60" />
                                  <span className="min-w-0 truncate">{formatTime(file.updatedAt)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
                          const fileList = event.dataTransfer.files;
                          if (fileList.length > 0) await handleFileUpload(fileList);
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
                          'flex shrink-0 cursor-pointer items-center gap-2.5 rounded-md border border-dashed px-2.5 py-2 text-left transition-colors',
                          dragging
                            ? 'border-primary/55 bg-primary/[0.045]'
                            : 'border-hairline bg-transparent hover:bg-ink/[0.025]',
                        )}
                      >
                        <Upload size={15} className="shrink-0 text-muted" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-body">
                            {uploading ? '上传中...' : '拖拽或点击上传'}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-muted">
                            {KNOWLEDGE_FILE_HINT || 'MD / DOCX / PDF'}
                          </p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept={KNOWLEDGE_FILE_ACCEPT}
                          className="hidden"
                          onChange={onFileInputChange}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          <div
            className={cn(
              'flex min-h-0 items-center justify-center overflow-hidden transition-opacity duration-150',
              rightPanelSplitResizable ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            <button
              type="button"
              onPointerDown={beginRightPanelSplitResize}
              className="group flex h-full w-full cursor-row-resize items-center justify-center rounded-md"
              aria-label="调整资料和召回面板高度"
              title="拖拽调整高度"
            >
              <span className="h-px w-16 rounded-full bg-border-subtle transition-colors group-hover:bg-primary/45" />
            </button>
          </div>

          <div className="min-h-0 overflow-hidden">
            {recallPanelRendered && (
              <RecallEvidencePopover
                open={recallPanelOpen}
                message={evidenceMessage}
                closeSignal={recallCloseSignal}
                onClose={closeRecallPanelWithAnimation}
              />
            )}
          </div>
        </div>
      )}

      {/* Body: single clean message column */}
      <div
        className={cn(
          'relative flex min-h-0 flex-1 transition-[padding] duration-180 ease-out',
          rightPanelOpen && 'lg:pr-[var(--chat-right-panel-offset)]',
        )}
        style={{ '--chat-right-panel-offset': `${RIGHT_PANEL_OFFSET}px` } as React.CSSProperties}
      >
        <MessageAnchorRail items={messageNavItems} activeId={activeMessageAnchorId} onSelect={scrollToMessageAnchor} />
        <section className="flex min-w-0 flex-1 flex-col">
          <div ref={messageScrollRef} className="popover-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div key={activeConversationId ?? 'new'} className="chat-conversation-swap h-full">
              {loadingConversation ? (
                <div className="flex h-full items-center justify-center text-muted">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className={cn('w-full max-w-[860px] text-center', chatContentOffsetClass)}>
                    <h2 className="text-3xl text-ink">
                      <span className="serif-heading not-italic">{displayName}</span>，今天想聊点什么？
                    </h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">
                      基于已关联的知识库召回片段作答，资料可在右上角「资料」中管理。
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {welcomeSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => void handleSend(suggestion)}
                          disabled={sending}
                          className="rounded-full border border-hairline px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 text-left">{renderComposer(false, 'max-w-[720px]')}</div>
                  </div>
                </div>
              ) : (
                <div className={cn('mx-auto flex w-full max-w-[860px] flex-col gap-5', chatContentOffsetClass)}>
                  {messages.map((message, index) => {
                    const isGeneratingAssistant =
                      sending && message.role === 'assistant' && index === messages.length - 1;

                    return message.role === 'user' ? (
                      <div
                        key={message.id}
                        data-message-anchor-id={message.id}
                        data-message-turn-id={message.id}
                        className="group/message chat-rise scroll-mt-6 flex items-end justify-end gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => void copyMessageContent(message.content)}
                          className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted opacity-0 transition-[background-color,color,opacity] hover:bg-primary/8 hover:text-ink group-hover/message:opacity-100 focus-visible:opacity-100"
                          aria-label="复制用户消息"
                          title="复制"
                        >
                          <Copy size={14} />
                        </button>
                        <div className="max-w-[88%] rounded-[18px_18px_4px_18px] bg-surface-cream-strong px-4 py-3 text-sm leading-relaxed text-ink">
                          {message.content ?? ''}
                        </div>
                      </div>
                    ) : (message.content ?? '').trim() === '' ? (
                      <ThinkingBubble key={message.id} />
                    ) : (
                      <div
                        key={message.id}
                        data-message-turn-id={messageTurnIdById.get(message.id)}
                        className="group/message chat-rise flex items-start gap-3"
                      >
                        <div className="-mt-0.5">
                          <AiGeneratingIcon active={isGeneratingAssistant} />
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <MessageStatusNotice status={message.status} />
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
                          <button
                            type="button"
                            onClick={() => void copyMessageContent(message.content)}
                            className="mt-2 flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted opacity-0 transition-[background-color,color,opacity] hover:bg-primary/8 hover:text-ink group-hover/message:opacity-100 focus-visible:opacity-100"
                            aria-label="复制 AI 消息"
                            title="复制"
                          >
                            <Copy size={13} />
                            复制
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {sending && messages[messages.length - 1]?.role === 'user' && <ThinkingBubble />}
                </div>
              )}
            </div>
          </div>

          {!showInlineComposer && (
            <div className="shrink-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 lg:pb-4">
              {renderComposer()}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
