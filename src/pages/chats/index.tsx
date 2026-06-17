import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Files,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { createConversation, getConversations, getMessages } from '@/services/chat';
import { getDatasets, getDataset, getKnowledgeFiles, uploadKnowledgeFile } from '@/services/dataset';
import { getLLMConfigs } from '@/services/llm';
import { isRecallAborted, isRecallError, recall, type RecallError } from '@/services/recall';
import {
  KNOWLEDGE_FILE_ACCEPT,
  KNOWLEDGE_FILE_HINT,
  KNOWLEDGE_FILE_UNSUPPORTED_MESSAGE,
  isSupportedKnowledgeFile,
} from '@/lib/knowledge-file';
import type { ConversationDTO, DatasetDTO, KnowledgeFileDTO, LLMConfigDTO, MessageDTO, RecallHit } from '@/types/api';

type LeftTab = 'history' | 'files';

interface Citation {
  id: string;
  fileName: string;
  score: number;
  snippet: string;
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

function groupConversations(conversations: ConversationDTO[]) {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const groups = [
    { label: '今天', items: [] as ConversationDTO[] },
    { label: '昨天', items: [] as ConversationDTO[] },
    { label: '更早', items: [] as ConversationDTO[] },
  ];

  conversations.forEach((item) => {
    const date = new Date(item.updatedAt || item.createdAt);
    if (date.toDateString() === today) groups[0].items.push(item);
    else if (date.toDateString() === yesterday.toDateString()) groups[1].items.push(item);
    else groups[2].items.push(item);
  });

  return groups.filter((group) => group.items.length > 0);
}

function hitsToCitations(hits: RecallHit[], files: KnowledgeFileDTO[]): Citation[] {
  return hits.map((hit) => {
    const file = files.find((item) => item.id === hit.doc_id);
    return {
      id: hit.chunk_id,
      fileName: file?.originalFilename ?? `文档 #${hit.doc_id}`,
      score: Math.round(hit.fused_score * 100),
      snippet: `命中 chunk ${hit.chunk_id}，来自知识库 #${hit.dataset_id}。当前召回接口暂未返回片段正文。`,
    };
  });
}

function CitationBlock({ citations, darkMode }: { citations: Citation[]; darkMode?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (citations.length === 0) return null;

  return (
    <div
      className={cn(
        'mt-4 overflow-hidden rounded-2xl border',
        darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]' : 'border-border-subtle bg-bg-base/45',
      )}
    >
      <div
        className={cn(
          'flex w-full items-center justify-between px-4 py-3 text-xs font-bold',
          darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 items-center gap-2"
        >
          <span>召回引用 · {citations.length} 个片段</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {expanded && (
        <div className="max-h-[276px] space-y-2 overflow-y-auto px-3 pb-3 pr-2">
          {citations.map((citation) => (
            <div
              key={citation.id}
              className={cn(
                'rounded-xl border px-3 py-2',
                darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className={cn('truncate text-xs font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                  {citation.fileName}
                </p>
                <span className={cn('mono-label shrink-0 !text-[9px]', darkMode ? 'text-[#3b82f6]' : 'text-primary')}>
                  {citation.score}%
                </span>
              </div>
              <MarkdownRenderer
                content={`「${citation.snippet}」`}
                className={cn(
                  'mt-1 text-xs leading-relaxed',
                  '[&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p]:my-0',
                  '[&_strong]:font-bold',
                  darkMode ? 'text-[#858585]' : 'text-text-main/58',
                )}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThinkingBubble({ darkMode }: { darkMode?: boolean }) {
  return (
    <div className="chat-rise flex items-start gap-3">
      <div
        className={cn(
          'mt-1 flex h-8 w-8 items-center justify-center rounded-xl border',
          darkMode ? 'border-[#3c3c3c] bg-[#2d2d2d]' : 'border-border-subtle bg-primary/10',
        )}
      >
        <Sparkles size={15} className={darkMode ? 'text-[#3b82f6]' : 'text-primary'} />
      </div>
      <div
        className={cn(
          'mt-1 flex h-9 items-center gap-2 rounded-full border px-4 text-xs font-bold',
          darkMode
            ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#cccccc]'
            : 'border-border-subtle bg-bg-base/60 text-text-main/55',
        )}
      >
        <span>检索与组织回答</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((item) => (
            <span
              key={item}
              className={cn(
                'chat-thinking-dot h-1.5 w-1.5 rounded-full',
                darkMode ? 'bg-[#858585]' : 'bg-text-main/35',
              )}
              style={{ animationDelay: `${item * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const recallAbortRef = useRef<AbortController | null>(null);

  const [leftTab, setLeftTab] = useState<LeftTab>('history');
  const [historySearch, setHistorySearch] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [datasets, setDatasets] = useState<DatasetDTO[]>([]);
  const [files, setFiles] = useState<KnowledgeFileDTO[]>([]);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [conversation, setConversation] = useState<ConversationDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [chatModels, setChatModels] = useState<LLMConfigDTO[]>([]);
  const [selectedModelConfigId, setSelectedModelConfigId] = useState<number | null>(null);
  const [kbOpen, setKbOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [citationsByMessageId, setCitationsByMessageId] = useState<Record<number, Citation[]>>({});

  const activeConversationId = id ? Number(id) : null;
  const displayName = user?.nickname || user?.username || '用户';
  const datasetById = useMemo(() => new Map(datasets.map((dataset) => [dataset.id, dataset])), [datasets]);
  const selectedDataset = selectedDatasetId ? datasetById.get(selectedDatasetId) : null;
  const selectedModel = selectedModelConfigId ? chatModels.find((model) => model.id === selectedModelConfigId) : null;

  useEffect(() => {
    return () => recallAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      try {
        const [convResult, dsResult, modelResult] = await Promise.all([
          getConversations(1, 100),
          getDatasets(1, 100),
          getLLMConfigs({ capability: 'CHAT', isActive: true }),
        ]);
        setConversations(convResult.items);
        setDatasets(dsResult.items);
        setChatModels(modelResult);
        const defaultModel =
          modelResult.find((model) => model.modelName.includes('qwen-flash')) ??
          modelResult.find((model) => model.isDefault) ??
          modelResult[0];
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
    if (!activeConversationId || !Number.isFinite(activeConversationId)) {
      setConversation(null);
      setMessages([]);
      setFiles([]);
      setSelectedDatasetId(null);
      setCitationsByMessageId({});
      return;
    }

    let cancelled = false;
    const loadConversation = async () => {
      setLoadingConversation(true);
      try {
        const conv =
          conversations.find((item) => item.id === activeConversationId) ??
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
        setMessages(msgResult.items);
        setFiles(fileResult.items.sort((a, b) => b.id - a.id));
        setCitationsByMessageId({});
        if (conv.lastConfigId && chatModels.some((model) => model.id === conv.lastConfigId)) {
          setSelectedModelConfigId(conv.lastConfigId);
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
  }, [activeConversationId, conversations, chatModels]);

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
    .filter((item) => item.title.toLowerCase().includes(historySearch.trim().toLowerCase()))
    .sort((a, b) => new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime());
  const filteredFiles = files.filter((file) =>
    file.originalFilename.toLowerCase().includes(fileSearch.trim().toLowerCase()),
  );
  const historyGroups = groupConversations(filteredConversations);

  const beginNewConversation = () => {
    recallAbortRef.current?.abort();
    setConversation(null);
    setMessages([]);
    setFiles([]);
    setSelectedDatasetId(null);
    setInputValue('');
    setCitationsByMessageId({});
    navigate(Routes.Chats);
  };

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || sending) return;
    if (!selectedDatasetId) {
      setKbOpen(true);
      return;
    }
    if (!selectedModelConfigId) {
      addToast('error', '请先选择对话模型');
      setModelOpen(true);
      return;
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
        setConversations((prev) => [activeConversation!, ...prev.filter((item) => item.id !== activeConversation!.id)]);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      addToast('error', '创建对话失败');
      return;
    }

    const userMsg: MessageDTO = {
      id: Date.now(),
      conversationId: activeConversation.id,
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
      conversationId: activeConversation.id,
      role: 'assistant',
      content: '',
      configId: selectedModelConfigId,
      modelName: selectedModel?.modelName ?? null,
      tokenCount: null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInputValue('');
    setSending(true);
    recallAbortRef.current?.abort();
    const controller = new AbortController();
    recallAbortRef.current = controller;

    try {
      const result = await recall({
        query: content,
        datasetIds: [selectedDatasetId],
        configId: selectedModelConfigId,
        signal: controller.signal,
        onAnswerDelta: (text) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantId ? { ...msg, content: msg.content + text } : msg)),
          );
        },
      });
      setCitationsByMessageId((prev) => ({ ...prev, [assistantId]: hitsToCitations(result.hits, files) }));
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
      setSending(false);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedDatasetId) {
      setKbOpen(true);
      setLeftTab('history');
      setDragging(false);
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
    <div className={cn('flex h-full min-h-0 gap-3 p-4', darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base')}>
      <aside
        className={cn(
          'flex h-full w-[292px] min-w-[292px] overflow-hidden rounded-3xl border shadow-sm transition-all duration-500',
          darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white/80',
        )}
      >
        <Sidebar forceCollapsed allowCollapse={false} className="h-full rounded-none border-0 shadow-none" />
        <div
          className={cn(
            'flex h-full w-[228px] min-w-[228px] flex-none flex-col border-l opacity-100 transition-all duration-500',
            darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
          )}
        >
          <div className="flex h-14 shrink-0 items-center gap-2 px-3">
            {(['history', 'files'] as LeftTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setLeftTab(tab)}
                className={cn(
                  'flex-1 rounded-xl px-2 py-2 text-xs font-bold transition-colors',
                  leftTab === tab
                    ? darkMode
                      ? 'bg-[#2d2d2d] text-[#e0e0e0]'
                      : 'bg-white text-text-main shadow-sm'
                    : darkMode
                      ? 'text-[#858585] hover:bg-[#2d2d2d]'
                      : 'text-text-main/50 hover:bg-primary/5',
                )}
              >
                {tab === 'history' ? '历史对话' : `文件 · ${files.length}`}
              </button>
            ))}
          </div>

          {leftTab === 'history' ? (
            <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
              <button
                type="button"
                onClick={beginNewConversation}
                className={cn(
                  'mb-3 flex h-10 items-center justify-center gap-2 rounded-2xl text-xs font-bold transition-colors',
                  darkMode
                    ? 'bg-[#2d2d2d] text-[#e0e0e0] hover:bg-[#353535]'
                    : 'bg-text-main text-white hover:opacity-90',
                )}
              >
                <Plus size={14} />
                新建对话
              </button>
              <div
                className={cn(
                  'mb-3 flex h-9 items-center gap-2 rounded-xl border px-3',
                  darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]' : 'border-border-subtle bg-bg-base/45',
                )}
              >
                <Search size={13} className={darkMode ? 'text-[#858585]' : 'text-text-main/35'} />
                <input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="搜索对话..."
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs outline-none"
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                ) : historyGroups.length === 0 ? (
                  <p className={cn('px-2 py-8 text-center text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
                    暂无历史对话
                  </p>
                ) : (
                  <div className="space-y-4">
                    {historyGroups.map((group) => (
                      <div key={group.label}>
                        <p className={cn('mono-label mb-2 px-2 !text-[9px]', darkMode && 'text-[#858585]')}>
                          {group.label}
                        </p>
                        <div className="space-y-1">
                          {group.items.map((item) => {
                            const active = conversation?.id === item.id || activeConversationId === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => navigate(`/chats/${item.id}`)}
                                className={cn(
                                  'relative w-full rounded-xl border px-3 py-2 text-left transition-colors',
                                  active
                                    ? darkMode
                                      ? 'border-[#3c3c3c] bg-[#2d2d2d]'
                                      : 'border-border-subtle bg-white'
                                    : darkMode
                                      ? 'border-transparent text-[#cccccc] hover:bg-[#2d2d2d]'
                                      : 'border-transparent hover:bg-primary/8',
                                )}
                              >
                                {active && (
                                  <span
                                    className={cn(
                                      'absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full',
                                      darkMode ? 'bg-[#3b82f6]' : 'bg-primary',
                                    )}
                                  />
                                )}
                                <p
                                  className={cn(
                                    'truncate pl-2 text-xs font-bold',
                                    darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
                                  )}
                                >
                                  {item.title}
                                </p>
                                <p
                                  className={cn(
                                    'mt-1 truncate pl-2 text-[10px]',
                                    darkMode ? 'text-[#858585]' : 'text-text-main/45',
                                  )}
                                >
                                  {datasetById.get(item.datasetId)?.name ?? `知识库 #${item.datasetId}`}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
              <div
                className={cn(
                  'mb-3 flex h-9 items-center gap-2 rounded-xl border px-3',
                  darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]' : 'border-border-subtle bg-bg-base/45',
                )}
              >
                <Search size={13} className={darkMode ? 'text-[#858585]' : 'text-text-main/35'} />
                <input
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  placeholder="搜索文件..."
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs outline-none"
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {loadingFiles ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <p className={cn('px-2 py-8 text-center text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
                    {selectedDatasetId ? '当前知识库还没有文件' : '选择知识库后显示文件'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        className={cn(
                          'rounded-xl border px-3 py-2',
                          darkMode ? 'border-[#3c3c3c] bg-[#2d2d2d]' : 'border-border-subtle bg-white',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={13} className={darkMode ? 'text-[#858585]' : 'text-text-main/40'} />
                          <p
                            className={cn('truncate text-xs font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}
                          >
                            {file.originalFilename}
                          </p>
                        </div>
                        <p className={cn('mt-1 text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
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
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={cn(
                  'mt-3 cursor-pointer rounded-2xl border border-dashed p-4 text-center transition-colors',
                  dragging
                    ? darkMode
                      ? 'border-[#3b82f6] bg-[#3b82f6]/10'
                      : 'border-primary bg-primary/10'
                    : darkMode
                      ? 'border-[#3c3c3c] bg-[#1e1e1e]'
                      : 'border-border-subtle bg-bg-base/45',
                )}
              >
                <Upload size={16} className={cn('mx-auto mb-2', darkMode ? 'text-[#858585]' : 'text-text-main/45')} />
                <p className={cn('text-xs font-bold', darkMode ? 'text-[#cccccc]' : 'text-text-main/65')}>
                  {uploading ? '上传中...' : '拖拽或点击上传'}
                </p>
                <p className={cn('mt-1 text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
                  {KNOWLEDGE_FILE_HINT || 'MD / DOCX / PDF'}
                </p>
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
      </aside>

      <main
        className={cn(
          'relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border',
          darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
        )}
      >
        <header
          className={cn(
            'flex min-h-16 shrink-0 items-center justify-between gap-4 border-b px-6 py-3',
            darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
          )}
        >
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                'break-words text-xl leading-snug serif-heading',
                darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
              )}
              title={conversation?.title ?? '新的对话'}
            >
              {conversation?.title ?? '新的对话'}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => selectedDatasetId && navigate(`/datasets/${selectedDatasetId}`)}
            className={cn(
              'flex h-9 max-w-[280px] shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-bold transition-colors',
              selectedDataset
                ? darkMode
                  ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#e0e0e0] hover:border-[#3b82f6]'
                  : 'border-border-subtle bg-white text-text-main hover:border-primary'
                : darkMode
                  ? 'border-[#3b82f6]/45 bg-[#3b82f6]/10 text-[#3b82f6]'
                  : 'border-primary/50 bg-primary/12 text-primary',
            )}
          >
            {selectedDataset?.name ?? '选择知识库'}
            {selectedDataset && <ExternalLink size={13} />}
          </button>
        </header>

        <div ref={messageScrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {loadingConversation ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="w-full max-w-[760px] text-center">
                <div
                  className={cn(
                    'mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border',
                    darkMode ? 'border-[#3c3c3c] bg-[#2d2d2d]' : 'border-border-subtle bg-primary/10',
                  )}
                >
                  <Sparkles size={20} className={darkMode ? 'text-[#3b82f6]' : 'text-primary'} />
                </div>
                <h2 className={cn('text-3xl font-medium', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                  <span className="serif-heading">{displayName}</span>，今天想聊点什么？
                </h2>
                <p
                  className={cn(
                    'mx-auto mt-3 max-w-xl text-sm leading-relaxed',
                    darkMode ? 'text-[#858585]' : 'text-text-main/55',
                  )}
                >
                  基于已关联的知识库召回片段作答，资料可在左侧「文件」中管理。
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {welcomeSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setInputValue(suggestion)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-xs font-bold transition-colors',
                        darkMode
                          ? 'border-[#3c3c3c] text-[#cccccc] hover:bg-[#2d2d2d]'
                          : 'border-border-subtle text-text-main/70 hover:border-primary hover:text-text-main',
                      )}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[920px] flex-col gap-5">
              {messages.map((message) =>
                message.role === 'user' ? (
                  <div key={message.id} className="chat-rise flex justify-end">
                    <div
                      className={cn(
                        'max-w-[88%] rounded-[18px_18px_4px_18px] px-4 py-3 text-sm leading-relaxed',
                        darkMode ? 'bg-[#0e0e0e] text-white' : 'bg-[#7B6B5D] text-white',
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ) : message.content.trim() === '' ? (
                  <ThinkingBubble key={message.id} darkMode={darkMode} />
                ) : (
                  <div key={message.id} className="chat-rise flex items-start gap-3">
                    <div
                      className={cn(
                        'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border',
                        darkMode ? 'border-[#3c3c3c] bg-[#2d2d2d]' : 'border-border-subtle bg-primary/10',
                      )}
                    >
                      <Sparkles size={15} className={darkMode ? 'text-[#3b82f6]' : 'text-primary'} />
                    </div>
                    <div
                      className={cn(
                        'min-w-0 flex-1 rounded-[18px] border px-4 py-3',
                        darkMode ? 'border-[#3c3c3c] bg-[#2d2d2d]' : 'border-border-subtle bg-white',
                      )}
                    >
                      <MarkdownRenderer
                        content={message.content}
                        className={cn(
                          'text-base leading-8',
                          '[&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p]:my-3',
                          'prose-p:text-base prose-li:text-base',
                          '[&_ul]:my-3 [&_ol]:my-3 [&_li]:my-1',
                          '[&_pre]:my-3 [&_blockquote]:my-3',
                          darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
                        )}
                      />
                      <CitationBlock citations={citationsByMessageId[message.id] ?? []} darkMode={darkMode} />
                    </div>
                  </div>
                ),
              )}
              {sending && messages[messages.length - 1]?.role === 'user' && <ThinkingBubble darkMode={darkMode} />}
            </div>
          )}
        </div>

        <div className={cn('shrink-0 border-t px-6 py-4', darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle')}>
          <div
            className={cn(
              'mx-auto max-w-[760px] rounded-2xl border p-2 shadow-sm',
              darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]' : 'border-border-subtle bg-bg-base/45',
            )}
          >
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={2}
              disabled={sending}
              placeholder="输入提问，回车开始召回…"
              className={cn(
                'max-h-36 min-h-12 w-full resize-none border-0 bg-transparent px-2 py-2 text-sm outline-none',
                darkMode ? 'text-[#e0e0e0] placeholder:text-[#6b6b6b]' : 'text-text-main placeholder:text-text-main/40',
              )}
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setKbOpen((value) => !value)}
                    className={cn(
                      'flex h-9 max-w-[220px] items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors',
                      selectedDataset
                        ? darkMode
                          ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#cccccc]'
                          : 'border-border-subtle bg-white text-text-main/75'
                        : darkMode
                          ? 'border-[#3b82f6]/45 bg-[#3b82f6]/10 text-[#3b82f6]'
                          : 'border-primary/50 bg-primary/12 text-primary',
                    )}
                  >
                    <Files size={14} />
                    <span className="truncate">{selectedDataset?.name ?? '选择知识库'}</span>
                    <ChevronDown size={13} />
                  </button>
                  {kbOpen && (
                    <div
                      className={cn(
                        'absolute bottom-full left-0 z-20 mb-2 max-h-64 w-64 overflow-y-auto rounded-2xl border p-2 shadow-[0_12px_32px_rgba(26,26,26,.14)]',
                        darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
                      )}
                    >
                      {datasets.map((dataset) => (
                        <button
                          key={dataset.id}
                          type="button"
                          onClick={() => {
                            setSelectedDatasetId(dataset.id);
                            setKbOpen(false);
                          }}
                          className={cn(
                            'w-full rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors',
                            dataset.id === selectedDatasetId
                              ? darkMode
                                ? 'bg-[#2d2d2d] text-[#e0e0e0]'
                                : 'bg-primary/10 text-text-main'
                              : darkMode
                                ? 'text-[#cccccc] hover:bg-[#2d2d2d]'
                                : 'text-text-main/70 hover:bg-primary/5',
                          )}
                        >
                          {dataset.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setModelOpen((value) => !value)}
                    className={cn(
                      'flex h-9 max-w-[180px] items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors',
                      darkMode
                        ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#cccccc]'
                        : 'border-border-subtle bg-white text-text-main/75',
                    )}
                  >
                    <MessageSquare size={14} />
                    <span className="truncate">{selectedModel?.modelName ?? '选择模型'}</span>
                    <ChevronDown size={13} />
                  </button>
                  {modelOpen && (
                    <div
                      className={cn(
                        'absolute bottom-full left-0 z-20 mb-2 max-h-64 w-64 overflow-y-auto rounded-2xl border p-2 shadow-[0_12px_32px_rgba(26,26,26,.14)]',
                        darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
                      )}
                    >
                      {chatModels.map((model) => (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => {
                            setSelectedModelConfigId(model.id);
                            setModelOpen(false);
                          }}
                          className={cn(
                            'w-full rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors',
                            model.id === selectedModelConfigId
                              ? darkMode
                                ? 'bg-[#2d2d2d] text-[#e0e0e0]'
                                : 'bg-primary/10 text-text-main'
                              : darkMode
                                ? 'text-[#cccccc] hover:bg-[#2d2d2d]'
                                : 'text-text-main/70 hover:bg-primary/5',
                          )}
                        >
                          {model.modelName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || !inputValue.trim()}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-opacity disabled:cursor-not-allowed disabled:opacity-45',
                  darkMode ? 'bg-[#0e0e0e] text-white' : 'bg-[#7B6B5D] text-white hover:opacity-90',
                )}
              >
                {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
