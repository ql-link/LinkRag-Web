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
import { Copy, Database, Files, Info, Loader2, MessageSquare, Search, Send, Sparkles, Upload, X } from 'lucide-react';
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
import { useToast } from '@/contexts/ToastContext';
import { createConversation, getConversations, getMessages, deleteConversation, toUiMessages } from '@/services/chat';
import { getChunkDetails } from '@/services/chunk';
import { getDatasets, getDataset, getKnowledgeFiles, uploadKnowledgeFile } from '@/services/dataset';
import { getDefaultLLMConfig, getLLMConfigs } from '@/services/llm';
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

type ChatRouteState = {
  datasetId?: unknown;
  initialQuestion?: unknown;
};

interface LocalMessage extends UiChatMessage {
  recallChunks?: RecallChunk[];
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
const DEFAULT_CONVERSATION_TITLE = '新对话';

function normalizeTitleFingerprint(value: string | null | undefined) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/(?:\.{1,3}|…+)$/u, '')
    .replace(/\s+/gu, '');
}

function isLikelyFirstQuestionTitle(title: string | null | undefined, question: string) {
  const titleFingerprint = normalizeTitleFingerprint(title);
  const questionFingerprint = normalizeTitleFingerprint(question);
  return titleFingerprint.length > 0 && questionFingerprint.startsWith(titleFingerprint);
}

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

      <div
        className={cn('popover-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3', !showHeader && 'pt-1')}
      >
        {chunks.length > 0 ? (
          chunks.map((chunk, index) => (
            <article
              key={`${chunk.id}-${index}`}
              className="overflow-hidden rounded-xl border border-hairline bg-canvas shadow-sm shadow-black/[0.03]"
            >
              <div className="flex items-start justify-between gap-3 border-b border-hairline bg-surface-soft/70 px-3 py-2">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold leading-4 text-ink">{chunk.fileName}</p>
                    <p className="mt-0.5 truncate text-[10px] leading-3 text-muted-soft">chunk {chunk.id}</p>
                  </div>
                </div>
                {chunk.score !== null && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {chunk.score}%
                  </span>
                )}
              </div>
              <div className="px-3 py-2">
                <MarkdownRenderer
                  content={chunk.snippet}
                  compact
                  className={cn(
                    'border-l-2 border-primary/20 pl-3 text-[11px] leading-5 text-body',
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
}: {
  open: boolean;
  message: LocalMessage | null;
  onClose: () => void;
}) {
  const [shouldRender, setShouldRender] = useState(open);
  const [closing, setClosing] = useState(false);
  const [panelSize, setPanelSize] = useState({ width: 720, height: 560 });
  const panelRef = useRef<HTMLElement | null>(null);
  const panelSizeRef = useRef(panelSize);
  const resizeFrameRef = useRef<number | null>(null);

  useEffect(() => {
    panelSizeRef.current = panelSize;
  }, [panelSize]);

  useEffect(() => {
    return () => {
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      window.requestAnimationFrame(() => setClosing(false));
      return;
    }

    if (!shouldRender) return;
    setClosing(true);
    const timeoutId = window.setTimeout(() => setShouldRender(false), 180);
    return () => window.clearTimeout(timeoutId);
  }, [open, shouldRender]);

  const closeWithAnimation = useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    if (!shouldRender || closing) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      closeWithAnimation();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [shouldRender, closing, closeWithAnimation]);

  const startResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = panelSizeRef.current.width;
    const startHeight = panelSizeRef.current.height;
    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    let latestSize = panelSizeRef.current;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nesw-resize';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const maxWidth = Math.max(420, window.innerWidth - 32);
      const maxHeight = Math.max(320, window.innerHeight - 96);
      const nextWidth = Math.min(Math.max(420, startWidth + startX - moveEvent.clientX), maxWidth);
      const nextHeight = Math.min(Math.max(320, startHeight + moveEvent.clientY - startY), maxHeight);
      latestSize = { width: nextWidth, height: nextHeight };
      panelSizeRef.current = latestSize;

      if (resizeFrameRef.current !== null) return;
      resizeFrameRef.current = window.requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        const panel = panelRef.current;
        if (!panel) return;
        panel.style.width = `min(${latestSize.width}px, calc(100vw - 32px))`;
        panel.style.height = `min(${latestSize.height}px, calc(100vh - 96px))`;
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      const panel = panelRef.current;
      if (panel) {
        panel.style.width = `min(${latestSize.width}px, calc(100vw - 32px))`;
        panel.style.height = `min(${latestSize.height}px, calc(100vh - 96px))`;
      }
      setPanelSize(latestSize);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, []);

  if (!shouldRender) return null;

  return (
    <section
      ref={panelRef}
      className="fixed right-4 top-20 z-40 flex origin-top-right flex-col overflow-hidden rounded-2xl border border-hairline bg-canvas shadow-xl shadow-black/10 transition-[opacity,transform] duration-180 ease-out"
      style={{
        width: `min(${panelSize.width}px, calc(100vw - 32px))`,
        height: `min(${panelSize.height}px, calc(100vh - 96px))`,
        opacity: closing ? 0 : 1,
        transform: closing ? 'translateY(4px) scale(0.98)' : 'translateY(0) scale(1)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="召回片段"
    >
      <div className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-hairline bg-surface-soft/45 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Search size={14} className="text-muted" />
          <h2 className="truncate text-sm font-semibold text-ink">召回片段</h2>
        </div>
        <button
          type="button"
          onClick={closeWithAnimation}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/8 hover:text-ink"
          aria-label="关闭召回片段"
          title="关闭召回片段"
        >
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <RecallEvidencePanel message={message} showHeader={false} />
      </div>
      <button
        type="button"
        onPointerDown={startResize}
        className="absolute bottom-1 left-1 flex h-5 w-5 cursor-nesw-resize items-end justify-start rounded-md text-muted-soft transition-colors hover:bg-primary/8 hover:text-primary"
        aria-label="调整召回片段窗口大小"
        title="拖动调整大小"
      >
        <span className="mb-1 ml-1 block h-2.5 w-2.5 border-b-2 border-l-2 border-current" />
      </button>
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
  const publishChatWorkspace = usePublishChatWorkspace();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerResizeFrameRef = useRef<number | null>(null);
  const recallAbortRef = useRef<AbortController | null>(null);
  const initialQuestionSentRef = useRef<string | null>(null);
  const pendingTitlePromptsRef = useRef<Map<number, string>>(new Map());
  const titleRefreshTimeoutsRef = useRef<number[]>([]);
  const headerActionsRef = useRef<HTMLDivElement | null>(null);
  const filesPanelRef = useRef<HTMLElement | null>(null);
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
  const [fileSearch, setFileSearch] = useState('');
  const [dragging, setDragging] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(() => routeDatasetId);
  const [chatModels, setChatModels] = useState<LLMConfigDTO[]>([]);
  const [selectedModelConfigId, setSelectedModelConfigId] = useState<number | null>(null);
  const [kbOpen, setKbOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingInitialQuestion, setPendingInitialQuestion] = useState('');
  const [recallPanelOpen, setRecallPanelOpen] = useState(false);
  const [activeMessageAnchorId, setActiveMessageAnchorId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!filesPanelOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (filesPanelRef.current?.contains(target)) return;
      if (headerActionsRef.current?.contains(target)) return;
      setFilesPanelOpen(false);
    }

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [filesPanelOpen]);
  const routeInitialQuestion = typeof routeState?.initialQuestion === 'string' ? routeState.initialQuestion.trim() : '';
  const storedInitialQuestion = activeConversationId
    ? (sessionStorage.getItem(`${INITIAL_QUESTION_STORAGE_PREFIX}${activeConversationId}`)?.trim() ?? '')
    : '';
  const initialQuestion = routeInitialQuestion || storedInitialQuestion;
  const displayName = user?.nickname || user?.username || '用户';
  const datasetById = useMemo(() => new Map(datasets.map((dataset) => [dataset.id, dataset])), [datasets]);
  const selectedDataset = selectedDatasetId ? datasetById.get(selectedDatasetId) : null;
  const selectedModel = selectedModelConfigId ? chatModels.find((model) => model.id === selectedModelConfigId) : null;
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
      recallAbortRef.current?.abort();
      if (composerResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(composerResizeFrameRef.current);
      }
      titleRefreshTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      titleRefreshTimeoutsRef.current = [];
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
        const [dsResult, modelResult, defaultChatModel] = await Promise.all([
          getDatasets(1, 100),
          getLLMConfigs({ capability: 'CHAT', isActive: true }),
          getDefaultLLMConfig('CHAT').catch(() => null),
        ]);
        if (cancelled) return;
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

  const maskPendingQuestionTitles = useCallback((items: ConversationDTO[]) => {
    const previousById = new Map(conversationsRef.current.map((item) => [item.id, item]));

    return items.map((item) => {
      const pendingQuestion = pendingTitlePromptsRef.current.get(item.id);
      if (!pendingQuestion) return item;

      if (normalizeTitleFingerprint(item.title) === normalizeTitleFingerprint(DEFAULT_CONVERSATION_TITLE)) {
        return item;
      }

      if (isLikelyFirstQuestionTitle(item.title, pendingQuestion)) {
        return {
          ...item,
          title: previousById.get(item.id)?.title ?? DEFAULT_CONVERSATION_TITLE,
        };
      }

      pendingTitlePromptsRef.current.delete(item.id);
      return item;
    });
  }, []);

  useEffect(() => {
    if (!conversation) return;
    const refreshed = conversations.find((item) => item.id === conversation.id);
    if (refreshed && refreshed.title !== conversation.title) {
      setConversation(refreshed);
    }
  }, [conversation, conversations]);

  const refreshConversations = useCallback(
    async (conversationIdToSync: number | null = activeConversationId) => {
      try {
        const result = await getConversations(1, 100);
        const visibleItems = maskPendingQuestionTitles(result.items);
        setConversations(visibleItems);
        const refreshedConversation = conversationIdToSync
          ? visibleItems.find((item) => item.id === conversationIdToSync)
          : null;
        if (refreshedConversation) {
          setConversation((prev) => (prev?.id === refreshedConversation.id ? refreshedConversation : prev));
        }
      } catch (error) {
        console.error('Failed to refresh conversations:', error);
      }
    },
    [activeConversationId, maskPendingQuestionTitles],
  );

  const scheduleTitleRefresh = useCallback(
    (conversationId: number) => {
      titleRefreshTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      titleRefreshTimeoutsRef.current = [];

      void refreshConversations(conversationId);
      titleRefreshTimeoutsRef.current = [1000, 2500, 5000, 8000].map((delay) => {
        const timeoutId = window.setTimeout(() => {
          titleRefreshTimeoutsRef.current = titleRefreshTimeoutsRef.current.filter((id) => id !== timeoutId);
          void refreshConversations(conversationId);
        }, delay);
        return timeoutId;
      });
    },
    [refreshConversations],
  );

  // 仅在会话 id 变化时加载一次会话/消息。不要依赖 conversations / chatModels，
  // 否则它们异步到位后会重跑此 effect，用后端的空消息列表覆盖掉首轮乐观/流式消息。
  useEffect(() => {
    if (!activeConversationId || !Number.isFinite(activeConversationId)) {
      setConversation(null);
      setMessages([]);
      setSelectedDatasetId(routeDatasetId);
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
        const uiMessages = toUiMessages(msgResult.items);
        setConversation(conv);
        setSelectedDatasetId(conv.datasetId);
        setMessages(uiMessages);
        setFiles(fileResult.items.sort((a, b) => b.id - a.id));

        const referencedChunkIds = collectReferencedChunkIds(uiMessages);
        if (referencedChunkIds.length > 0) {
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
      if (!window.confirm('确定要删除此对话吗？')) return;
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
        setFilesPanelOpen(false);
        setRecallPanelOpen(false);
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
      setActiveMessageAnchorId(userMsg.id);
      setInputValue('');
      setSending(true);
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
        const chunks = hitsToRecallChunks(result.hits, files);
        setMessages((prev) => prev.map((msg) => (msg.id === assistantId ? { ...msg, recallChunks: chunks } : msg)));
        if (!result.answer && result.hits.length === 0) {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantId ? { ...msg, content: '未召回到相关内容。' } : msg)),
          );
        }
        if (isFirstTurn) {
          pendingTitlePromptsRef.current.set(activeConversation.id, content);
          scheduleTitleRefresh(activeConversation.id);
        }
      } catch (error) {
        if (!isRecallAborted(error)) {
          const message = recallErrorMessage(error);
          setMessages((prev) => prev.map((msg) => (msg.id === assistantId ? { ...msg, content: message } : msg)));
          if (isRecallError(error)) addToast('error', message);
        }
      } finally {
        if (recallAbortRef.current === controller) recallAbortRef.current = null;
        setSending(false);
      }
      return true;
    },
    [
      addToast,
      conversation,
      files,
      inputValue,
      messages.length,
      scheduleTitleRefresh,
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
    }),
    [conversations, activeConversationId, loadingHistory, beginNewConversation, handleDeleteConversation],
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

  const toggleFilesPanel = useCallback(() => {
    setFilesPanelOpen((open) => {
      const nextOpen = !open;
      if (nextOpen) {
        setRecallPanelOpen(false);
        setKbOpen(false);
      }
      return nextOpen;
    });
  }, []);

  const toggleRecallPanel = useCallback(() => {
    setRecallPanelOpen((open) => {
      const nextOpen = !open;
      if (nextOpen) {
        setFilesPanelOpen(false);
        setKbOpen(false);
      }
      return nextOpen;
    });
  }, []);

  const toggleDatasetSelector = useCallback(() => {
    setKbOpen((open) => {
      const nextOpen = !open;
      if (nextOpen) {
        setFilesPanelOpen(false);
        setRecallPanelOpen(false);
      }
      return nextOpen;
    });
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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-canvas">
      <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3 sm:px-6">
        {/* 面包屑：桌面端显示；移动端由外壳顶栏承担标题 */}
        <div className="hidden items-center gap-3 min-w-0 flex-1 lg:flex">
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '对话' }]} />
        </div>
        <div ref={headerActionsRef} className="flex shrink-0 items-center gap-2">
          <HeaderButton active={filesPanelOpen} icon={Files} onClick={toggleFilesPanel}>
            文件 {files.length}
          </HeaderButton>
          <HeaderButton active={recallPanelOpen} icon={Search} onClick={toggleRecallPanel} title="显示或隐藏召回片段">
            召回 {evidenceCount}
          </HeaderButton>
          <div ref={kbSelectorRef} className="relative">
            <button
              type="button"
              onClick={toggleDatasetSelector}
              className="flex h-9 max-w-[160px] items-center gap-2 rounded-lg border border-hairline bg-canvas px-3 text-xs font-medium text-text-secondary transition-colors hover:border-primary/30 hover:text-ink sm:max-w-[280px]"
            >
              <Database size={14} className="text-muted" />
              <span className="truncate">{selectedDataset?.name ?? '选择知识库'}</span>
            </button>
            {kbOpen && (
              <div className="popover-scrollbar absolute right-0 top-full z-30 mt-2 max-h-72 w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-hairline bg-canvas p-2 pr-1.5 (--)]">
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
      </header>

      <RecallEvidencePopover
        open={recallPanelOpen}
        message={evidenceMessage}
        onClose={() => setRecallPanelOpen(false)}
      />

      {/* 知识库文件：沿用原方案，右上角浮层 */}
      {filesPanelOpen && (
        <section
          ref={filesPanelRef}
          className="fixed right-6 top-[92px] z-50 flex h-[min(420px,calc(100vh-116px))] w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-hairline bg-canvas lg:right-8"
          role="dialog"
          aria-modal="true"
          aria-label="知识库文件"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink">知识库文件</h2>
              <p className="mt-1 text-[11px] text-muted">查看当前知识库文件，或上传新文件。</p>
            </div>
            <button
              type="button"
              onClick={() => setFilesPanelOpen(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/8 hover:text-ink"
              aria-label="关闭弹窗"
            >
              <X size={17} />
            </button>
          </div>
          <div className="min-h-0 flex-1 p-4">
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
                      <div key={file.id} className="group/file rounded-xl border border-hairline bg-canvas px-3 py-2.5">
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
                  'flex shrink-0 cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-4 py-3 text-left transition-colors',
                  dragging ? 'border-primary bg-primary/8' : 'border-hairline bg-surface-soft',
                )}
              >
                <Upload size={16} className="shrink-0 text-muted" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-body">{uploading ? '上传中...' : '拖拽或点击上传'}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted">{KNOWLEDGE_FILE_HINT || 'MD / DOCX / PDF'}</p>
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
      )}

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
              <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5">
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
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center">
                        <Sparkles size={15} className="text-primary" />
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
                  ),
                )}
                {sending && messages[messages.length - 1]?.role === 'user' && <ThinkingBubble />}
              </div>
            )}
          </div>

          <div className="shrink-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 lg:pb-8">
            <div className="mx-auto max-w-[760px]">
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
                  className="min-h-9 min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent px-2 py-2 text-sm leading-5 text-text-main transition-[height] duration-150 ease-out outline-none placeholder:text-muted-soft"
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
                    <div className="popover-scrollbar absolute bottom-full right-0 z-20 mb-2 max-h-64 w-[min(16rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-hairline bg-canvas p-2 pr-1.5 (--)]">
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
          </div>
        </section>
      </div>
    </div>
  );
}
