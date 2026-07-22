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
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import {
  ChevronDown,
  Copy,
  Database,
  FileText,
  Files,
  Info,
  Loader2,
  MessageSquare,
  Search,
  Send,
  SquarePen,
  Upload,
  X,
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { KnowledgeFileIcon } from '@/components/KnowledgeFileIcon';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import linkRagThinkingMarkDarkUrl from '@/assets/brand/linkrag-mark-v4-merge-dark.svg';
import linkRagThinkingMarkUrl from '@/assets/brand/linkrag-mark-v4-merge.svg';
import linkRagStaticMarkDarkUrl from '@/assets/brand/linkrag-mark-v4-static-dark.svg';
import linkRagStaticMarkUrl from '@/assets/brand/linkrag-mark-v4-static.svg';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import {
  RAG_QUERY_MAX_LENGTH,
  RAG_QUERY_MAX_LENGTH_MESSAGE,
  isRagQueryTooLong,
  limitRagQueryLength,
} from '@/lib/rag-query';
import { useAuth } from '@/contexts/AuthContext';
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
import { getDatasetParseConfig, getDatasets, getKnowledgeFiles, uploadKnowledgeFile } from '@/services/dataset';
import { getLLMCapabilityDefault, getLLMConfigs } from '@/services/llm';
import { isRecallAborted, isRecallError, recall, type RecallError } from '@/services/recall';
import {
  KNOWLEDGE_FILE_ACCEPT,
  KNOWLEDGE_FILE_HINT,
  KNOWLEDGE_FILE_UNSUPPORTED_MESSAGE,
  isSupportedKnowledgeFile,
} from '@/lib/knowledge-file';
import { usePublishChatWorkspace, type ChatWorkspaceSnapshot } from '@/contexts/chatWorkspace';
import { useTheme } from '@/contexts/ThemeContext';
import { getCachedConversations, setCachedConversations } from '@/lib/conversationsCache';
import { getProviderIcon, isProviderIconMonochrome, normalizeProviderToken } from '@/lib/provider-icons';
import { copyTextToClipboard } from '@/lib/clipboard';
import { getModelDisplayName } from '@/lib/model-display';
import { extractLocalMarkdownImageReferences, isMarkdownKnowledgeFile } from '@/lib/markdown-assets';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import type {
  ConversationDTO,
  DatasetDTO,
  KnowledgeFileDTO,
  ExecutableLLMConfigDTO,
  RecallChunk,
  RecallHit,
  UiChatMessage,
} from '@/types/api';

const INITIAL_QUESTION_STORAGE_PREFIX = 'linkrag.initialQuestion.';
const COMPOSER_TEXTAREA_MAX_HEIGHT = 132;
const MESSAGE_SCROLL_BOTTOM_THRESHOLD = 96;
const RIGHT_PANEL_RESIZE_ROW_PX = 6;
const RIGHT_PANEL_TRANSITION_MS = 200;

type ChatRouteState = {
  datasetId?: unknown;
  initialQuestion?: unknown;
};

interface LocalMessage extends UiChatMessage {
  recallChunks?: RecallChunk[];
}

type ChatModel = ExecutableLLMConfigDTO;

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

const chineseRecallNumberMap: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

function parseRecallMentionNumber(value: string): number | null {
  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  if (normalized === '十') return 10;
  if (!/^[一二三四五六七八九十]+$/.test(normalized)) return null;

  const [tenPart, unitPart] = normalized.split('十');
  const tens = tenPart ? chineseRecallNumberMap[tenPart] : 1;
  const units = unitPart ? chineseRecallNumberMap[unitPart] : 0;
  if (!Number.isFinite(tens) || !Number.isFinite(units)) return null;
  return tens * 10 + units;
}

function linkifyRecallChunkMentions(content: string, chunks?: RecallChunk[]) {
  if (!content || !chunks || chunks.length === 0) return content;

  const replaceMentions = (text: string) =>
    text.replace(
      /(?:[［【[]\s*片段\s*([0-9]{1,3}|[一二三四五六七八九十]{1,3})\s*[\]］】]|片段\s*([0-9]{1,3}|[一二三四五六七八九十]{1,3}))/g,
      (match, bracketedNumber: string | undefined, plainNumber: string | undefined) => {
        const rawNumber = bracketedNumber ?? plainNumber;
        const index = rawNumber ? parseRecallMentionNumber(rawNumber) : null;
        if (!index || index < 1 || index > chunks.length) return match;
        return `[片段 ${index}](#recall-chunk-${index})`;
      },
    );

  let inCodeFence = false;

  return content
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inCodeFence = !inCodeFence;
        return line;
      }
      if (inCodeFence) return line;

      const protectedPattern = /(`[^`]*`|\[[^\]]+\]\([^)]+\))/g;
      let nextLine = '';
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = protectedPattern.exec(line))) {
        nextLine += replaceMentions(line.slice(lastIndex, match.index));
        nextLine += match[0];
        lastIndex = match.index + match[0].length;
      }

      nextLine += replaceMentions(line.slice(lastIndex));
      return nextLine;
    })
    .join('\n');
}

const INSET_MODEL_ICON_KEYS = ['mimo', 'xiaomi', 'xiaomimimo', 'xai', 'jina'];

function getModelProviderName(model: ChatModel | null | undefined) {
  if (model?.scope === 'SYSTEM') return 'LinkRag';
  return model?.providerName?.trim() || model?.providerType || '';
}

function getChatModelDisplayName(model: ChatModel | null | undefined) {
  return getModelDisplayName(model) || model?.modelName || '选择模型';
}

function getRightPanelGridRows(split: number) {
  return `minmax(0, ${split}fr) ${RIGHT_PANEL_RESIZE_ROW_PX}px minmax(0, ${1 - split}fr)`;
}

function getRightPanelGridRowsForState(filesOpen: boolean, recallOpen: boolean, split: number) {
  if (filesOpen && recallOpen) return getRightPanelGridRows(split);
  if (filesOpen) return 'minmax(0, 1fr) 0px minmax(0, 0fr)';
  if (recallOpen) return 'minmax(0, 0fr) 0px minmax(0, 1fr)';
  return 'minmax(0, 0fr) 0px minmax(0, 0fr)';
}

function shouldInsetModelIcon(model: ChatModel | null | undefined, iconUrl: string) {
  const token = normalizeProviderToken(
    `${model?.providerType ?? ''} ${getModelProviderName(model)} ${model?.modelName ?? ''} ${iconUrl}`,
  );
  return INSET_MODEL_ICON_KEYS.some((key) => token.includes(key));
}

function ModelProviderIcon({
  model,
  size = 'sm',
  darkMode: darkModeProp,
}: {
  model: ChatModel | null | undefined;
  size?: 'xs' | 'sm';
  darkMode?: boolean;
}) {
  const { darkMode: darkModeCtx } = useTheme();
  const darkMode = darkModeProp ?? darkModeCtx;
  const providerName = getModelProviderName(model);
  const iconUrl = model ? getProviderIcon(model.providerType, providerName, model.modelName, { darkMode }) : '';
  const iconIsMonochrome = isProviderIconMonochrome(iconUrl);
  const sizeClass = size === 'xs' ? 'h-5 w-5' : 'h-6 w-6';
  const iconInsetClass = shouldInsetModelIcon(model, iconUrl) ? 'p-1' : 'p-0';

  return (
    <span className={cn(sizeClass, 'flex shrink-0 items-center justify-center overflow-hidden rounded-md')}>
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={providerName || '模型'}
          className={cn('block h-full w-full object-contain', iconInsetClass, iconIsMonochrome && 'opacity-80')}
        />
      ) : (
        <MessageSquare size={size === 'xs' ? 12 : 14} className="text-muted" />
      )}
    </span>
  );
}

function RecallEvidencePanel({
  message,
  showHeader = true,
  activeChunkId,
  onClose,
}: {
  message: LocalMessage | null;
  showHeader?: boolean;
  activeChunkId?: string | null;
  onClose?: () => void;
}) {
  const chunks = useMemo(() => message?.recallChunks ?? [], [message?.recallChunks]);
  const references = useMemo(
    () => (message?.references ?? []).filter((item) => item.trim().length > 0),
    [message?.references],
  );
  const chunkNodeByIdRef = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!activeChunkId) return;
    chunkNodeByIdRef.current.get(activeChunkId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeChunkId, chunks]);

  return (
    <section className="flex h-full min-h-0 flex-col">
      {showHeader && (
        <div className="flex shrink-0 items-center justify-between gap-2 bg-bg-card/70 px-4 py-3 dark:bg-[#303030]/70">
          <div className="flex min-w-0 items-center gap-2">
            <Search size={14} className="shrink-0 text-muted" />
            <h2 className="truncate text-sm font-semibold text-ink">召回片段</h2>
            <span className="shrink-0 text-[10px] font-semibold text-muted">
              {chunks.length > 0 ? chunks.length : references.length}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/8 hover:text-ink"
                aria-label="关闭召回片段"
                title="关闭召回片段"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          'popover-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3',
          showHeader ? 'pt-3' : 'pt-1',
        )}
      >
        {chunks.length > 0 ? (
          chunks.map((chunk, index) => (
            <article
              key={`${chunk.id}-${index}`}
              ref={(node) => {
                if (node) {
                  chunkNodeByIdRef.current.set(chunk.id, node);
                } else {
                  chunkNodeByIdRef.current.delete(chunk.id);
                }
              }}
              className="scroll-mt-3 border-b border-hairline/70 px-1 py-2.5 last:border-b-0"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[10px] font-semibold leading-none text-text-secondary"
                    title={`片段 ${index + 1}`}
                  >
                    <span className="tabular-nums">{index + 1}</span>
                  </span>
                  <FileText size={12} className="shrink-0 text-muted-soft" />
                  <p className="min-w-0 truncate text-xs font-medium leading-4 text-primary">{chunk.fileName}</p>
                </div>
                {chunk.score !== null && (
                  <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-soft">{chunk.score}%</span>
                )}
              </div>
              <div className="pt-1.5">
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

function ThinkingBubble() {
  return (
    <div className="chat-rise flex items-start gap-3">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center">
        <LinkRagMessageMark animated className="h-9 w-9" />
      </div>
      <div className="mt-2 flex h-8 items-center rounded-full border border-hairline bg-surface-soft/85 px-3 text-xs font-medium text-muted shadow-sm shadow-black/[0.03] dark:bg-[#242424]/85 dark:text-[#c8c4bd]">
        <span>正在生成</span>
      </div>
    </div>
  );
}

function LinkRagMessageMark({ animated = false, className }: { animated?: boolean; className?: string }) {
  const { darkMode } = useTheme();
  const src = animated
    ? darkMode
      ? linkRagThinkingMarkDarkUrl
      : linkRagThinkingMarkUrl
    : darkMode
      ? linkRagStaticMarkDarkUrl
      : linkRagStaticMarkUrl;

  return <img src={src} alt="" aria-hidden="true" draggable={false} className={className} />;
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
          'absolute right-12 top-1/2 w-96 -translate-y-1/2 translate-x-2 rounded-2xl border border-hairline bg-canvas/98 p-1.5 text-left opacity-0 shadow-xl shadow-black/10 ring-1 ring-black/[0.03] backdrop-blur transition-[opacity,transform] duration-200 ease-out',
          'pointer-events-none group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100',
        )}
      >
        <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {items.map((item) => {
            const active = item.id === activeId;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  'block w-full truncate rounded-xl px-3 py-2 text-left text-sm leading-6 transition-colors',
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
  const { addToast } = useToast();
  const isDesktop = useIsDesktop();
  const publishChatWorkspace = usePublishChatWorkspace();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToMessageBottomRef = useRef(true);
  const messageAutoScrollFrameRef = useRef<number | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerResizeFrameRef = useRef<number | null>(null);
  const rightPanelRef = useRef<HTMLElement | null>(null);
  const rightPanelSplitRef = useRef(0.5);
  const recallAbortRef = useRef<AbortController | null>(null);
  const initialQuestionSentRef = useRef<string | null>(null);
  const kbSelectorRef = useRef<HTMLDivElement | null>(null);
  const modelSelectorRef = useRef<HTMLDivElement | null>(null);
  // 镜像会话列表：loadConversation 只查找用，不作为重跑触发器（避免覆盖本地消息）。
  const conversationsRef = useRef<ConversationDTO[]>([]);

  const [conversations, setConversations] = useState<ConversationDTO[]>(() => getCachedConversations(user?.id) ?? []);
  const [datasets, setDatasets] = useState<DatasetDTO[]>([]);
  const [files, setFiles] = useState<KnowledgeFileDTO[]>([]);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [conversation, setConversation] = useState<ConversationDTO | null>(null);
  // 会话历史的加载态与数据集/模型分离：有缓存时初始即为 false，避免无谓的转圈
  const [loadingHistory, setLoadingHistory] = useState(() => getCachedConversations(user?.id) === null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filesPanelOpen, setFilesPanelOpen] = useState(false);
  const [filesPanelMounted, setFilesPanelMounted] = useState(false);
  const [fileSearch, setFileSearch] = useState('');
  const [dragging, setDragging] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(() => routeDatasetId);
  const [chatModels, setChatModels] = useState<ChatModel[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [defaultChatConfigId, setDefaultChatConfigId] = useState<number | null>(null);
  const [kbOpen, setKbOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamingConversation, setStreamingConversation] = useState<{
    conversationId: number;
    requestId: string;
  } | null>(null);
  const [pendingInitialQuestion, setPendingInitialQuestion] = useState('');
  const [recallPanelOpen, setRecallPanelOpen] = useState(false);
  const [recallPanelMounted, setRecallPanelMounted] = useState(false);
  const [rightPanelSplit, setRightPanelSplit] = useState(0.5);
  const [activeMessageAnchorId, setActiveMessageAnchorId] = useState<string | null>(null);
  const [activeRecallChunkId, setActiveRecallChunkId] = useState<string | null>(null);

  const activeConversationId = id ? Number(id) : null;

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
  const selectedModel = selectedConfigId
    ? (chatModels.find((model) => model.configId === selectedConfigId) ?? null)
    : null;
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
      if (messageAutoScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(messageAutoScrollFrameRef.current);
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
        const [dsResult, modelResult, defaultSelection] = await Promise.all([
          getDatasets(1, 100),
          getLLMConfigs({ capability: 'CHAT', isActive: true }),
          getLLMCapabilityDefault('CHAT').catch(() => null),
        ]);
        if (cancelled) return;
        setDatasets(dsResult.items);
        const chatModelItems = modelResult;
        setChatModels(chatModelItems);
        const defaultModel =
          chatModelItems.find((model) => model.configId === defaultSelection?.effectiveConfigId) ?? chatModelItems[0];
        const defaultConfigId = defaultModel?.configId ?? null;
        setDefaultChatConfigId(defaultConfigId);
        setSelectedConfigId(defaultConfigId);
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
    shouldStickToMessageBottomRef.current = true;
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

  useEffect(() => {
    if (!defaultChatConfigId) return;
    setSelectedConfigId(defaultChatConfigId);
  }, [activeConversationId, defaultChatConfigId]);

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
    if (!el || !shouldStickToMessageBottomRef.current) return;

    if (messageAutoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(messageAutoScrollFrameRef.current);
    }
    messageAutoScrollFrameRef.current = window.requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      messageAutoScrollFrameRef.current = null;
    });
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

    const updateStickToBottom = () => {
      const distanceToBottom = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;
      shouldStickToMessageBottomRef.current = distanceToBottom <= MESSAGE_SCROLL_BOTTOM_THRESHOLD;
    };

    const updateActiveAnchor = () => {
      updateStickToBottom();
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

    shouldStickToMessageBottomRef.current = false;
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
        await copyTextToClipboard(text);
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
        setKbOpen(true);
        addToast('error', '请先选择知识库');
        return false;
      }
      if (!selectedConfigId) {
        addToast('error', '请先选择对话模型');
        setModelOpen(true);
        return false;
      }

      try {
        const parseConfig = await getDatasetParseConfig(selectedDatasetId);
        if (!parseConfig.sparse_embedding_config_id || !parseConfig.dense_embedding_config_id) {
          addToast('error', '该知识库缺少向量模型绑定，请先到知识库解析配置页补全');
          return false;
        }
      } catch (error) {
        console.error('Failed to verify dataset embedding binding:', error);
        return false;
      }

      let activeConversation = conversation;
      try {
        if (!activeConversation) {
          activeConversation = await createConversation({
            datasetId: selectedDatasetId,
            lastConfigId: selectedConfigId,
          });
          setConversation(activeConversation);
        }
        displayedChatConversationId = activeConversation.id;
      } catch (error) {
        console.error('Failed to create conversation:', error);
        addToast('error', '创建对话失败');
        return false;
      }

      // 乐观置顶：用户一发出消息就更新时间并移到最前，不等待后端会话列表回写。
      // ChatWorkspacePanel 仍按 updatedAt 排序，因此必须同时写入本地时间，避免刚置顶又被旧时间排回去。
      const optimisticUpdatedAt = new Date().toISOString();
      setConversations((prev) => [
        { ...activeConversation!, updatedAt: optimisticUpdatedAt },
        ...prev.filter((item) => item.id !== activeConversation!.id),
      ]);
      setConversation((prev) =>
        prev?.id === activeConversation!.id ? { ...prev, updatedAt: optimisticUpdatedAt } : prev,
      );

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
        configId: selectedConfigId,
        modelName: selectedModel?.modelName ?? null,
        createdAt: new Date().toISOString(),
      };

      const nextMessages = [...messages, userMsg, assistantMsg];
      shouldStickToMessageBottomRef.current = true;
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
      let streamRequestId: string | null = null;
      options?.onStarted?.();

      try {
        const result = await recall({
          query: content,
          datasetIds: [selectedDatasetId],
          configId: selectedConfigId,
          conversationId: activeConversation.id,
          // LINK-209：仅会话首条用户消息带 is_first_turn=true，由 Python 基于 query 生成会话标题。
          isFirstTurn,
          signal: controller.signal,
          onStreamStarted: ({ conversationId, requestId }) => {
            streamRequestId = requestId;
            setStreamingConversation({ conversationId, requestId });
          },
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
        if (streamRequestId) {
          setStreamingConversation((current) => (current?.requestId === streamRequestId ? null : current));
        }
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
      selectedConfigId,
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
      !selectedConfigId ||
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
    selectedConfigId,
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
    setKbOpen(true);
    setFilesPanelOpen(false);
    setRecallPanelOpen(false);
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

    for (const file of uploadableFiles) {
      if (isMarkdownKnowledgeFile(file)) {
        try {
          if (extractLocalMarkdownImageReferences(await file.text()).length > 0) {
            addToast('info', '该 Markdown 包含本地图片，请到知识库文件页使用 ZIP、文件夹或单文件补图导入');
            setDragging(false);
            return;
          }
        } catch (error) {
          addToast('error', error instanceof Error ? error.message : 'Markdown 图片路径无法识别');
          setDragging(false);
          return;
        }
      }
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
      streamingConversationId: streamingConversation?.conversationId ?? null,
      // 仅在确无数据且仍在拉取时显示加载态；有缓存/已加载数据时后台静默刷新
      loadingConversations: loadingHistory && conversations.length === 0,
      onBeginNewConversation: beginNewConversation,
      onDeleteConversation: handleDeleteConversation,
      onRenameConversation: handleRenameConversation,
    }),
    [
      conversations,
      activeConversationId,
      streamingConversation?.conversationId,
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
  const rightPanelOpen = filesPanelOpen || recallPanelOpen;
  const filesPanelVisible = filesPanelOpen || filesPanelMounted;
  const recallPanelVisible = recallPanelOpen || recallPanelMounted;

  useEffect(() => {
    if (!activeRecallChunkId) return;
    const hasActiveChunk = evidenceMessage?.recallChunks?.some((chunk) => chunk.id === activeRecallChunkId) ?? false;
    if (!hasActiveChunk) setActiveRecallChunkId(null);
  }, [activeRecallChunkId, evidenceMessage]);

  const handleRecallChunkLinkClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>, message: LocalMessage) => {
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest<HTMLAnchorElement>('a[href^="#recall-chunk-"]');
      if (!anchor || !event.currentTarget.contains(anchor)) return;

      const match = /^#recall-chunk-(\d+)$/.exec(anchor.getAttribute('href') ?? '');
      const chunkIndex = match ? Number(match[1]) - 1 : -1;
      const chunk = message.recallChunks?.[chunkIndex];
      if (!chunk) return;

      event.preventDefault();
      const turnId = messageTurnIdById.get(message.id);
      if (turnId) setActiveMessageAnchorId(turnId);
      setActiveRecallChunkId(chunk.id);
      setRecallPanelOpen(true);
      setKbOpen(false);
      setModelOpen(false);
      if (!isDesktop) setFilesPanelOpen(false);
    },
    [isDesktop, messageTurnIdById],
  );

  const toggleFilesPanel = useCallback(() => {
    setFilesPanelOpen((open) => {
      const nextOpen = !open;
      setKbOpen(false);
      if (nextOpen && !isDesktop) {
        setRecallPanelOpen(false);
      }
      return nextOpen;
    });
  }, [isDesktop]);

  const toggleRecallPanel = useCallback(() => {
    setRecallPanelOpen((open) => {
      const nextOpen = !open;
      if (nextOpen) {
        setKbOpen(false);
        if (!isDesktop) {
          setFilesPanelOpen(false);
        }
      }
      return nextOpen;
    });
  }, [isDesktop]);

  const toggleMobileSourcePanel = useCallback(() => {
    const nextOpen = !(filesPanelOpen || recallPanelOpen);
    setKbOpen(false);
    setFilesPanelOpen(false);
    setRecallPanelOpen(nextOpen);
  }, [filesPanelOpen, recallPanelOpen]);

  useEffect(() => {
    if (!isDesktop && filesPanelOpen && recallPanelOpen) {
      setRecallPanelOpen(false);
    }
  }, [filesPanelOpen, isDesktop, recallPanelOpen]);

  useEffect(() => {
    rightPanelSplitRef.current = rightPanelSplit;
  }, [rightPanelSplit]);

  useEffect(() => {
    if (filesPanelOpen) {
      setFilesPanelMounted(true);
      return;
    }

    const timeoutId = window.setTimeout(() => setFilesPanelMounted(false), RIGHT_PANEL_TRANSITION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [filesPanelOpen]);

  useEffect(() => {
    if (recallPanelOpen) {
      setRecallPanelMounted(true);
      return;
    }

    const timeoutId = window.setTimeout(() => setRecallPanelMounted(false), RIGHT_PANEL_TRANSITION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [recallPanelOpen]);

  const startRightPanelResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const panel = rightPanelRef.current;
    if (!panel) return;

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';

    let latestSplit = rightPanelSplitRef.current;
    let frameId: number | null = null;

    const applyLatestSplit = () => {
      frameId = null;
      panel.style.gridTemplateRows = getRightPanelGridRows(latestSplit);
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const rect = panel.getBoundingClientRect();
      if (rect.height <= 0) return;
      const nextSplit = (moveEvent.clientY - rect.top) / rect.height;
      latestSplit = Math.min(0.72, Math.max(0.28, nextSplit));
      rightPanelSplitRef.current = latestSplit;
      if (frameId === null) {
        frameId = window.requestAnimationFrame(applyLatestSplit);
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        panel.style.gridTemplateRows = getRightPanelGridRows(latestSplit);
      }
      setRightPanelSplit(latestSplit);
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, []);

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

  const renderComposer = (placement: 'center' | 'bottom') => (
    <div
      className={cn(
        'mx-auto w-full',
        placement === 'bottom' ? 'max-w-[840px]' : 'max-w-[900px]',
        placement === 'center' && 'mt-7',
        placement === 'bottom' && 'transition-transform duration-[140ms] ease-out',
      )}
    >
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
          placeholder="输入问题"
          className="min-h-9 min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent px-2 py-2 text-sm leading-5 text-text-main transition-[height] duration-150 ease-out outline-none placeholder:text-muted-soft lg:placeholder:text-muted-soft"
        />
        <div ref={kbSelectorRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setKbOpen((value) => !value);
              setModelOpen(false);
            }}
            className={cn(
              'group/kb flex h-10 w-10 max-w-10 items-center justify-start gap-2 overflow-hidden rounded-lg px-2 text-muted transition-[max-width,color] duration-200 hover:text-ink focus-visible:text-ink lg:w-max lg:hover:max-w-[14rem] lg:focus-visible:max-w-[14rem]',
              kbOpen && 'text-ink lg:max-w-[14rem]',
            )}
            title={selectedDataset?.name ?? '选择知识库'}
            aria-label={selectedDataset?.name ?? '选择知识库'}
          >
            <Database size={18} className={cn('shrink-0', selectedDataset ? 'text-primary' : 'text-muted')} />
            <span
              className={cn(
                'min-w-0 max-w-0 overflow-hidden truncate whitespace-nowrap text-xs font-medium opacity-0 transition-[max-width,opacity] duration-200',
                'hidden lg:block lg:group-hover/kb:max-w-[9rem] lg:group-hover/kb:opacity-100 lg:group-focus-visible/kb:max-w-[9rem] lg:group-focus-visible/kb:opacity-100',
                kbOpen && 'lg:max-w-[9rem] lg:opacity-100',
              )}
            >
              {selectedDataset?.name ?? '选择知识库'}
            </span>
            <ChevronDown
              size={13}
              className={cn(
                'hidden shrink-0 text-muted transition-transform lg:block',
                kbOpen && 'rotate-180 text-primary',
              )}
            />
          </button>
          {kbOpen && (
            <div
              className={cn(
                'popover-scrollbar absolute right-[-6rem] z-50 max-h-[180px] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-xl bg-canvas p-1.5 shadow-lg shadow-ink/12 animate-[modelMenuIn_160ms_ease-out] lg:right-0 lg:z-20 lg:max-h-72 lg:w-[min(22rem,calc(100vw-2rem))] lg:rounded-[10px] lg:border lg:border-hairline lg:p-2 lg:shadow-none',
                placement === 'bottom'
                  ? 'top-[calc(100%+0.85rem)] lg:top-auto lg:bottom-full lg:mb-2'
                  : 'top-[calc(100%+0.85rem)] lg:top-full lg:mt-2',
              )}
            >
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
                      'w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors',
                      dataset.id === selectedDatasetId
                        ? 'bg-primary/10 text-ink'
                        : 'text-text-secondary hover:bg-primary/5 hover:text-ink',
                    )}
                  >
                    <span className="block truncate">{dataset.name}</span>
                    {dataset.description && (
                      <span className="mt-0.5 block truncate text-[10px] font-normal text-muted-soft">
                        {dataset.description}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div ref={modelSelectorRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setModelOpen((value) => !value);
              setKbOpen(false);
            }}
            className={cn(
              'group/model flex h-10 w-10 items-center justify-start gap-2 overflow-hidden rounded-lg px-2 text-muted transition-[width,color] duration-200 hover:text-ink focus-visible:text-ink lg:hover:w-48 lg:focus-visible:w-48',
              modelOpen && 'text-ink lg:w-48',
            )}
            title={getChatModelDisplayName(selectedModel)}
            aria-label={getChatModelDisplayName(selectedModel)}
          >
            <ModelProviderIcon model={selectedModel} size="sm" />
            <span
              className={cn(
                'min-w-0 max-w-0 overflow-hidden truncate whitespace-nowrap text-xs font-medium opacity-0 transition-[max-width,opacity] duration-200',
                'hidden lg:block lg:group-hover/model:max-w-36 lg:group-hover/model:opacity-100 lg:group-focus-visible/model:max-w-36 lg:group-focus-visible/model:opacity-100',
                modelOpen && 'lg:max-w-36 lg:opacity-100',
              )}
            >
              {getChatModelDisplayName(selectedModel)}
            </span>
          </button>
          {modelOpen && (
            <div
              className={cn(
                'popover-scrollbar absolute right-[-3rem] z-50 max-h-[156px] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-xl bg-canvas p-1.5 shadow-lg shadow-ink/12 animate-[modelMenuIn_160ms_ease-out] lg:right-0 lg:z-20 lg:max-h-72 lg:w-[min(22rem,calc(100vw-2rem))] lg:rounded-[10px] lg:border lg:border-hairline lg:p-2 lg:shadow-none',
                placement === 'bottom'
                  ? 'top-[calc(100%+0.85rem)] lg:top-auto lg:bottom-full lg:mb-2'
                  : 'top-[calc(100%+0.85rem)] lg:top-full lg:mt-2',
              )}
            >
              {chatModels.map((model) => (
                <button
                  key={model.configId}
                  type="button"
                  onClick={() => {
                    setSelectedConfigId(model.configId);
                    setModelOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors',
                    model.configId === selectedConfigId
                      ? 'bg-primary/10 text-ink'
                      : 'text-text-secondary hover:bg-primary/5 hover:text-ink',
                  )}
                >
                  <ModelProviderIcon model={model} size="xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{getChatModelDisplayName(model)}</span>
                    <span className="mt-0.5 block truncate text-[10px] font-normal text-muted-soft">
                      {getModelProviderName(model)}
                    </span>
                  </span>
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
      {inputQueryTooLong && (
        <div className="mt-1 flex justify-end px-2 text-[11px] leading-5 text-error">
          {RAG_QUERY_MAX_LENGTH_MESSAGE} · {inputLength}/{RAG_QUERY_MAX_LENGTH}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden bg-canvas transition-[margin-right] duration-200 ease-out will-change-[margin-right]',
        rightPanelOpen && 'lg:mr-[356px]',
      )}
    >
      {activeConversationId ? (
        <div className="fixed right-2 z-30 flex h-10 items-center gap-0.5 rounded-xl bg-canvas/92 p-0.5 shadow-sm shadow-ink/5 backdrop-blur-md lg:hidden [top:calc(env(safe-area-inset-top)+0.5rem)]">
          <button
            type="button"
            onClick={() => {
              setFilesPanelOpen(false);
              setRecallPanelOpen(false);
              beginNewConversation();
            }}
            className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-primary/6 hover:text-ink"
            title="新建对话"
            aria-label="新建对话"
          >
            <SquarePen size={14} className="text-muted" />
            新建
          </button>
          <button
            type="button"
            onClick={toggleMobileSourcePanel}
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors',
              rightPanelOpen ? 'bg-primary/10 text-ink' : 'text-text-secondary hover:bg-primary/6 hover:text-ink',
            )}
            title="显示或隐藏来源"
            aria-label="显示或隐藏来源"
          >
            <Files size={14} className={cn(rightPanelOpen ? 'text-primary' : 'text-muted')} />
            来源
          </button>
        </div>
      ) : null}
      <header className="hidden min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3 sm:px-6 lg:flex">
        {/* 面包屑：桌面端显示；移动端由外壳顶栏承担标题 */}
        <div className="hidden items-center gap-3 min-w-0 flex-1 lg:flex">
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '对话' }]} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <HeaderButton active={filesPanelOpen} icon={Files} onClick={toggleFilesPanel}>
              文件 {files.length}
            </HeaderButton>
            <HeaderButton active={recallPanelOpen} icon={Search} onClick={toggleRecallPanel} title="显示或隐藏召回片段">
              召回 {evidenceCount}
            </HeaderButton>
          </div>
        </div>
      </header>

      {/* Body: single clean message column */}
      <div className="relative flex min-h-0 flex-1">
        <MessageAnchorRail items={messageNavItems} activeId={activeMessageAnchorId} onSelect={scrollToMessageAnchor} />
        <section className="flex min-w-0 flex-1 flex-col">
          <div ref={messageScrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            {loadingConversation ? (
              <div className="flex h-full items-center justify-center text-muted">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="w-full max-w-[760px] text-center lg:-translate-x-8">
                  <h2 className="text-3xl leading-tight text-ink">
                    <span className="lg:hidden">
                      <span className="serif-heading block">{displayName}</span>
                      <span className="mt-2 block">今天想聊点什么？</span>
                    </span>
                    <span className="hidden lg:inline">
                      <span className="serif-heading">{displayName}</span>，今天想聊点什么？
                    </span>
                  </h2>
                  <p className="mx-auto mt-3 max-w-xl truncate text-sm leading-relaxed text-muted lg:whitespace-normal">
                    <span className="lg:hidden">基于知识库资料回答</span>
                    <span className="hidden lg:inline">
                      基于已关联的知识库召回片段作答，资料可在右上角「文件」中管理。
                    </span>
                  </p>
                  {renderComposer('center')}
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
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
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  'mx-auto flex w-full max-w-[860px] flex-col gap-5 transition-transform duration-[140ms] ease-out lg:gap-5',
                )}
              >
                {messages.map((message) =>
                  message.role === 'user' ? (
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
                      <div className="max-w-[92%] rounded-[18px_18px_4px_18px] bg-surface-cream-strong px-3.5 py-2.5 text-[14px] leading-6 text-ink lg:max-w-[88%] lg:px-4 lg:py-3 lg:text-sm lg:leading-relaxed">
                        {message.content ?? ''}
                      </div>
                    </div>
                  ) : (message.content ?? '').trim() === '' ? (
                    <ThinkingBubble key={message.id} />
                  ) : (
                    <div
                      key={message.id}
                      data-message-turn-id={messageTurnIdById.get(message.id)}
                      className="group/message chat-rise flex flex-col gap-2 lg:flex-row lg:items-start lg:gap-3"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center lg:mt-1 lg:h-8 lg:w-8">
                        <LinkRagMessageMark className="h-7 w-7 lg:h-8 lg:w-8" />
                      </div>
                      <div className="min-w-0 flex-1 lg:pt-0.5">
                        <MessageStatusNotice status={message.status} />
                        <div onClickCapture={(event) => handleRecallChunkLinkClick(event, message)}>
                          <MarkdownRenderer
                            content={linkifyRecallChunkMentions(message.content ?? '', message.recallChunks)}
                            className={cn(
                              'text-[15px] leading-7 text-text-main lg:text-base lg:leading-8',
                              '[&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p]:my-2.5 lg:[&_p]:my-3',
                              'prose-p:text-[15px] prose-li:text-[15px] lg:prose-p:text-base lg:prose-li:text-base',
                              '[&_ul]:my-2.5 [&_ol]:my-2.5 [&_li]:my-1 lg:[&_ul]:my-3 lg:[&_ol]:my-3',
                              '[&_pre]:my-2.5 [&_blockquote]:my-2.5 lg:[&_pre]:my-3 lg:[&_blockquote]:my-3',
                              '[&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:min-w-max',
                              'lg:max-w-[780px] lg:prose-p:leading-7 lg:prose-li:leading-7',
                              'lg:prose-headings:mb-2 lg:prose-headings:mt-6 lg:prose-headings:leading-snug',
                              'lg:prose-h1:text-[22px] lg:prose-h2:text-[19px] lg:prose-h3:text-[17px]',
                              'lg:prose-h2:border-b lg:prose-h2:border-border-subtle lg:prose-h2:pb-2',
                              'lg:[&_ul]:pl-5 lg:[&_ol]:pl-5 lg:[&_li]:pl-1 lg:[&_li]:my-1.5',
                              'lg:[&_blockquote]:rounded-r-lg lg:[&_blockquote]:bg-surface-soft/45 lg:[&_blockquote]:py-2.5 lg:[&_blockquote]:pr-4',
                              'lg:[&_.not-prose]:my-4 lg:[&_table]:text-sm',
                            )}
                          />
                        </div>
                        {!(sending && message.id === messages[messages.length - 1]?.id) && (
                          <p className="mt-3 text-[11px] leading-5 text-muted-soft lg:mt-4 lg:border-t lg:border-border-subtle lg:pt-3 lg:text-xs">
                            AI 生成内容可能不准确，请以原文档为准并结合原文档参考。
                          </p>
                        )}
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
                  ),
                )}
                {sending && messages[messages.length - 1]?.role === 'user' && <ThinkingBubble />}
              </div>
            )}
          </div>

          {messages.length > 0 && (
            <div className="shrink-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 lg:pb-8">
              {renderComposer('bottom')}
            </div>
          )}
        </section>
        <aside
          className={cn(
            'fixed inset-x-3 bottom-4 z-50 h-[min(68vh,560px)] min-h-0 origin-bottom transition-[opacity,transform] duration-200 ease-out lg:hidden',
            rightPanelOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
          )}
          aria-label="来源"
        >
          <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[14px] bg-canvas shadow-lg shadow-ink/12 dark:bg-[#2b2b2b]">
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
              <div className="grid flex-1 grid-cols-2 gap-1 rounded-xl bg-surface-soft p-1">
                <button
                  type="button"
                  onClick={() => {
                    setFilesPanelOpen(false);
                    setRecallPanelOpen(true);
                    setKbOpen(false);
                  }}
                  className={cn(
                    'flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors',
                    recallPanelOpen ? 'bg-canvas text-ink shadow-sm' : 'text-muted hover:bg-canvas/70 hover:text-ink',
                  )}
                >
                  <Search size={13} />
                  片段 {evidenceCount}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecallPanelOpen(false);
                    setFilesPanelOpen(true);
                    setKbOpen(false);
                  }}
                  className={cn(
                    'flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors',
                    filesPanelOpen ? 'bg-canvas text-ink shadow-sm' : 'text-muted hover:bg-canvas/70 hover:text-ink',
                  )}
                >
                  <Files size={13} />
                  文件 {files.length}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilesPanelOpen(false);
                  setRecallPanelOpen(false);
                  setActiveRecallChunkId(null);
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/8 hover:text-ink"
                aria-label="关闭来源"
                title="关闭来源"
              >
                <X size={17} />
              </button>
            </div>

            <div className="min-h-0 flex-1 px-3 pb-3">
              {recallPanelOpen ? (
                <RecallEvidencePanel message={evidenceMessage} showHeader={false} activeChunkId={activeRecallChunkId} />
              ) : (
                <div className="flex h-full min-h-0 flex-col gap-2">
                  <div className="flex h-8 shrink-0 items-center gap-2 px-2">
                    <Search size={13} className="text-muted" />
                    <input
                      value={fileSearch}
                      onChange={(e) => setFileSearch(e.target.value)}
                      placeholder="搜索文件"
                      className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs text-ink outline-none placeholder:text-muted-soft"
                    />
                  </div>
                  {loadingFiles ? (
                    <div className="flex h-24 items-center justify-center text-muted">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="px-2 py-8 text-center text-xs text-muted">
                      <p>{selectedDatasetId ? '当前知识库还没有文件' : '选择知识库后显示文件'}</p>
                    </div>
                  ) : (
                    <div className="popover-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                      {filteredFiles.map((file) => (
                        <div key={file.id} className="rounded-lg px-1 py-2">
                          <div className="flex items-center gap-2">
                            <KnowledgeFileIcon suffix={file.fileSuffix} compact />
                            <p className="truncate text-xs font-semibold text-ink">{file.originalFilename}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (uploading) return;
                      if (!selectedDatasetId) {
                        promptSelectDatasetForUpload();
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-white transition-colors hover:bg-primary-active disabled:opacity-60"
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploading ? '上传中' : '上传文件'}
                  </button>
                </div>
              )}
            </div>
          </section>
        </aside>
        <aside
          ref={rightPanelRef}
          className={cn(
            'hidden fixed inset-x-3 bottom-4 top-auto z-50 h-[min(76vh,620px)] min-h-0 origin-bottom transition-[opacity,transform] duration-200 ease-out will-change-transform lg:bottom-3 lg:left-auto lg:right-3 lg:top-3 lg:grid lg:h-auto lg:w-[340px] lg:origin-top-right lg:transition-[grid-template-rows,opacity,transform] lg:duration-200 lg:ease-out',
            'gap-0',
            rightPanelOpen
              ? 'translate-y-0 opacity-100 lg:translate-x-0'
              : 'pointer-events-none translate-y-3 opacity-0 lg:translate-x-4 lg:translate-y-0',
          )}
          style={{ gridTemplateRows: getRightPanelGridRowsForState(filesPanelOpen, recallPanelOpen, rightPanelSplit) }}
          aria-label="对话辅助面板"
        >
          <div
            className={cn(
              'min-h-0 overflow-hidden transition-opacity duration-150 lg:duration-150 lg:ease-out',
              filesPanelVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
              !filesPanelOpen && 'pointer-events-none',
            )}
          >
            <section className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[12px] border border-border-subtle bg-canvas shadow-lg shadow-ink/10 dark:border-[#3a3a3a] dark:bg-[#2b2b2b] dark:shadow-none lg:bg-bg-frosted lg:shadow-sm lg:backdrop-blur-xl lg:dark:bg-[#2b2b2b]/92">
              <div className="flex shrink-0 items-center justify-between gap-3 bg-bg-card/70 px-4 py-3 dark:bg-[#303030]/70">
                <div className="flex min-w-0 items-center gap-2">
                  <Files size={14} className="shrink-0 text-muted" />
                  <h2 className="text-sm font-semibold text-ink">知识库文件</h2>
                  <span className="shrink-0 text-[10px] font-semibold text-muted">{files.length}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFilesPanelOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/8 hover:text-ink"
                  aria-label="关闭知识库文件"
                  title="关闭知识库文件"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="min-h-0 flex-1 p-3">
                <div className="flex h-full min-h-0 flex-col gap-2">
                  <div className="flex min-h-0 flex-1 flex-col gap-2">
                    <div className="flex h-8 shrink-0 items-center gap-2 px-2 pb-2">
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
                      <div className="px-2 py-8 text-center text-xs text-muted">
                        <p>{selectedDatasetId ? '当前知识库还没有文件' : '选择知识库后显示文件'}</p>
                      </div>
                    ) : (
                      <div className="popover-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
                        {filteredFiles.map((file) => (
                          <div
                            key={file.id}
                            className="group/file rounded-md px-2 py-1.5 transition-colors hover:bg-ink/[0.025] dark:hover:bg-white/[0.035]"
                          >
                            <div className="flex items-center gap-2">
                              <KnowledgeFileIcon suffix={file.fileSuffix} compact />
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
                      'flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                      dragging
                        ? 'bg-primary/8 text-primary'
                        : 'text-muted hover:bg-ink/[0.035] hover:text-ink dark:hover:bg-white/[0.045]',
                    )}
                  >
                    <Upload size={14} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {uploading ? '上传中...' : `上传文件 · ${KNOWLEDGE_FILE_HINT || 'MD / DOCX / PDF'}`}
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
              </div>
            </section>
          </div>
          <div
            className={cn(
              'hidden min-h-0 overflow-hidden transition-opacity duration-200 lg:block',
              filesPanelOpen && recallPanelOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            {filesPanelOpen && recallPanelOpen && (
              <button
                type="button"
                onPointerDown={startRightPanelResize}
                onDoubleClick={() => {
                  rightPanelSplitRef.current = 0.5;
                  setRightPanelSplit(0.5);
                }}
                className="group flex h-1.5 w-full cursor-row-resize items-center justify-center rounded-full text-muted-soft transition-colors hover:bg-primary/8 hover:text-primary"
                aria-label="调整文件和召回面板高度"
                title="拖动调整上下大小，双击复位"
              >
                <span className="h-px w-8 rounded-full bg-current opacity-40 transition-opacity group-hover:opacity-80" />
              </button>
            )}
          </div>
          <div
            className={cn(
              'min-h-0 overflow-hidden transition-opacity duration-150 lg:duration-150 lg:ease-out',
              recallPanelVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
              !recallPanelOpen && 'pointer-events-none',
            )}
          >
            <div className="h-full min-h-0 overflow-hidden rounded-[12px] border border-border-subtle bg-canvas shadow-lg shadow-ink/10 dark:border-[#3a3a3a] dark:bg-[#2b2b2b] dark:shadow-none lg:bg-bg-frosted lg:shadow-sm lg:backdrop-blur-xl lg:dark:bg-[#2b2b2b]/92">
              <RecallEvidencePanel
                message={evidenceMessage}
                activeChunkId={activeRecallChunkId}
                onClose={() => {
                  setRecallPanelOpen(false);
                  setActiveRecallChunkId(null);
                }}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
