import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Cpu, Database, FileUp, Loader2, Plus, Search, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { OverviewRightPanel } from '@/components/OverviewRightPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { createConversation, getConversations } from '@/services/chat';
import { getDatasets, getRecentKnowledgeFiles } from '@/services/dataset';
import type { ConversationDTO, DatasetDTO, KnowledgeFileDTO } from '@/types/api';

const presetQuestions = ['RAG 索引怎么配置', '帮我找最近的产品决策'];

const actionItems = [
  { id: 'upload', label: '上传文档', to: Routes.Datasets, state: { openUpload: true }, icon: FileUp },
  { id: 'datasets', label: '管理知识库', to: Routes.Datasets, icon: Database },
  { id: 'llm', label: 'LLM 配置', to: Routes.LLMPage, icon: Cpu },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜深了';
}

function formatRelativeTime(value: string) {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '';
  const diff = Date.now() - time;
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`;
  return new Date(time).toLocaleDateString('zh-CN');
}

function datasetName(datasets: DatasetDTO[], id: number) {
  return datasets.find((dataset) => dataset.id === id)?.name ?? `知识库 #${id}`;
}

export default function HomePage() {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const scopeRef = useRef<HTMLDivElement>(null);
  const displayName = user?.nickname || user?.username || '当前用户';

  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopeDatasetId, setScopeDatasetId] = useState<number | 'all'>('all');
  const [datasets, setDatasets] = useState<DatasetDTO[]>([]);
  const [recentFiles, setRecentFiles] = useState<KnowledgeFileDTO[]>([]);
  const [recentChats, setRecentChats] = useState<ConversationDTO[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (scopeRef.current && !scopeRef.current.contains(event.target as Node)) setScopeOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    let active = true;

    getDatasets(1, 100)
      .then((result) => {
        if (!active) return;
        const items = result.items.filter((dataset) => dataset.status !== 'DELETED');
        setDatasets(items);
        setScopeDatasetId(items[0]?.id ?? 'all');
      })
      .catch((error) => {
        console.error('Failed to load datasets:', error);
      });

    getRecentKnowledgeFiles(8)
      .then((files) => {
        if (!active) return;
        setRecentFiles(files);
      })
      .catch((error) => {
        console.error('Failed to load recent files:', error);
      });

    getConversations(1, 4)
      .then((result) => {
        if (active) setRecentChats(result.items);
      })
      .catch((error) => console.error('Failed to load recent conversations:', error))
      .finally(() => {
        if (active) setChatsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const scopeLabel = scopeDatasetId === 'all' ? '全部知识库' : datasetName(datasets, scopeDatasetId);
  const recentFile = recentFiles[0];
  const quickQuestions = useMemo(() => {
    const items: Array<{ label: string; prompt: string; featured?: boolean }> = [];
    if (recentFile) {
      items.push({
        label: '总结最近上传的文档',
        prompt: `请总结最近上传的文档「${recentFile.originalFilename}」，提炼关键结论和待办。`,
        featured: true,
      });
    }
    presetQuestions.forEach((label) => items.push({ label, prompt: label }));
    return items.slice(0, 4);
  }, [recentFile]);

  const submitQuestion = async (value = question) => {
    const content = value.trim();
    if (!content || submitting) return;
    const targetDatasetId = scopeDatasetId === 'all' ? datasets[0]?.id : scopeDatasetId;
    if (!targetDatasetId) {
      addToast('error', '请先创建或选择一个知识库');
      return;
    }

    setSubmitting(true);
    try {
      const title = content.length > 28 ? `${content.slice(0, 28)}...` : content;
      const conversation = await createConversation({ title, datasetId: targetDatasetId });
      navigate(`/chats/${conversation.id}`, { state: { initialQuestion: content } });
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitQuestion();
  };

  return (
    <div className={cn('flex h-full min-h-0 gap-[14px]', darkMode ? 'text-[#cccccc]' : 'text-text-main')}>
      <main
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] border',
          darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
        )}
      >
        <header
          className={cn(
            'flex shrink-0 items-center justify-between gap-4 border-b px-[30px] py-5',
            darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
          )}
        >
          <div className="min-w-0">
            <p
              className={cn(
                'font-mono text-[10px] uppercase tracking-[0.14em]',
                darkMode ? 'text-[#858585]' : 'text-text-main/50',
              )}
            >
              首页
            </p>
            <h2 className={cn('mt-1 text-lg font-semibold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>概览</h2>
          </div>
          <Link
            to={Routes.Chats}
            state={{ openCreate: true }}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[var(--color-btn-primary)] px-4 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={15} />
            新建对话
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto px-[30px] py-7">
          <section className="mb-[26px]">
            <h1
              className={cn(
                'mb-2 text-[26px] font-semibold leading-tight tracking-[-0.02em]',
                darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
              )}
            >
              {getGreeting()}，<span className="font-serif italic tracking-[-0.03em]">{displayName}</span>
            </h1>
            <p className={cn('text-[13px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
              直接提问，或挑一段对话继续。
            </p>
          </section>

          <form
            onSubmit={handleSubmit}
            className={cn(
              'mb-5 rounded-[20px] border px-5 pb-[18px] pt-5',
              darkMode ? 'border-[#4a4a4a] bg-[#1e1e1e]' : 'border-[var(--color-border-medium)] bg-bg-base',
            )}
          >
            <div className="mb-4 flex items-center gap-4">
              <Search size={24} className={darkMode ? 'text-[#3b82f6]' : 'text-primary'} />
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="向你的全部知识库提问，或搜索文档..."
                className={cn(
                  'min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-text-main/40',
                  darkMode ? 'text-[#e0e0e0] placeholder:text-[#6b6b6b]' : 'text-text-main',
                )}
              />
              <button
                type="submit"
                disabled={submitting || !question.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-btn-primary)] text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="提交问题"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-[9px]">
              <div ref={scopeRef} className="relative">
                <button
                  type="button"
                  onClick={() => setScopeOpen((value) => !value)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-[9px] border px-[13px] py-[7px] text-xs font-medium transition-colors hover:border-primary',
                    darkMode
                      ? 'border-[#3c3c3c] bg-[#252526] text-[#cccccc]'
                      : 'border-border-subtle bg-white text-text-main/70',
                  )}
                >
                  <Database size={13} />
                  <span className="max-w-[170px] truncate">{scopeLabel}</span>
                  <ChevronDown size={13} />
                </button>
                {scopeOpen && (
                  <div
                    className={cn(
                      'absolute left-0 top-full z-20 mt-2 max-h-64 w-[240px] origin-top overflow-y-auto rounded-xl border p-1 shadow-xl animate-[datasetDropdownIn_140ms_ease-out]',
                      darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setScopeDatasetId('all');
                        setScopeOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-primary/10"
                    >
                      全部知识库
                      {scopeDatasetId === 'all' && <Check size={14} />}
                    </button>
                    {datasets.map((dataset) => (
                      <button
                        key={dataset.id}
                        type="button"
                        onClick={() => {
                          setScopeDatasetId(dataset.id);
                          setScopeOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-primary/10"
                      >
                        <span className="truncate">{dataset.name}</span>
                        {scopeDatasetId === dataset.id && <Check size={14} className="shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {quickQuestions.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setQuestion(item.prompt);
                    void submitQuestion(item.prompt);
                  }}
                  className={cn(
                    'rounded-[9px] border px-[13px] py-[7px] text-xs font-medium transition-colors hover:border-primary',
                    item.featured
                      ? 'border-[var(--color-primary-mid)] bg-[var(--color-primary-light)] text-[#8a6a44]'
                      : darkMode
                        ? 'border-[#3c3c3c] bg-[#252526] text-[#cccccc]'
                        : 'border-border-subtle bg-white text-text-main/70',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </form>

          <section className="mb-[34px] flex gap-2.5">
            {actionItems.map(({ id, label, to, state, icon: Icon }) => (
              <Link
                key={id}
                to={to}
                state={state}
                className={cn(
                  'flex flex-1 items-center gap-2.5 rounded-[13px] border px-[15px] py-[13px] text-[13px] font-medium transition-all hover:-translate-y-px hover:border-primary hover:shadow-[0_6px_18px_-8px_rgba(26,26,26,0.18)]',
                  darkMode
                    ? 'border-[#3c3c3c] bg-[#252526] text-[#e0e0e0]'
                    : 'border-border-subtle bg-white text-text-main',
                )}
              >
                <Icon size={17} className={darkMode ? 'text-[#3b82f6]' : 'text-primary'} />
                {label}
              </Link>
            ))}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3
                className={cn(
                  'font-mono text-[10px] uppercase tracking-[0.12em]',
                  darkMode ? 'text-[#858585]' : 'text-text-main/50',
                )}
              >
                继续对话
              </h3>
              <Link
                to={Routes.Chats}
                className={cn(
                  'font-mono text-[10px] uppercase tracking-[0.12em] transition-colors hover:text-primary',
                  darkMode ? 'text-[#858585]' : 'text-text-main/50',
                )}
              >
                查看全部
              </Link>
            </div>
            {chatsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((item) => (
                  <SkeletonCard key={item} darkMode={darkMode} />
                ))}
              </div>
            ) : recentChats.length === 0 ? (
              <div
                className={cn(
                  'rounded-[15px] border border-dashed px-5 py-10 text-center text-sm',
                  darkMode ? 'border-[#3c3c3c] text-[#858585]' : 'border-border-subtle text-text-main/45',
                )}
              >
                还没有对话
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {recentChats.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => navigate(`/chats/${chat.id}`)}
                    className={cn(
                      'group rounded-[15px] border p-[17px] text-left transition-all duration-300 hover:-translate-y-px hover:border-primary hover:shadow-[0_6px_18px_-8px_rgba(26,26,26,0.18)]',
                      darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
                    )}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h4
                        className={cn(
                          'min-w-0 truncate text-sm font-semibold',
                          darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
                        )}
                      >
                        {chat.title || '未命名对话'}
                      </h4>
                      <span
                        className={cn(
                          'shrink-0 font-mono text-[10px]',
                          darkMode ? 'text-[#858585]' : 'text-text-main/50',
                        )}
                      >
                        {formatRelativeTime(chat.updatedAt)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'mb-4 line-clamp-2 min-h-9 text-xs leading-[18px]',
                        darkMode ? 'text-[#858585]' : 'text-text-main/50',
                      )}
                    >
                      {chat.lastModelName ? `最近使用 ${chat.lastModelName} 生成回答` : '继续查看这段知识库问答。'}
                    </p>
                    <span className="inline-flex max-w-full rounded-[7px] bg-[var(--color-primary-light)] px-[9px] py-[3px] text-[11px] font-medium text-[#8a6a44]">
                      <span className="truncate">{datasetName(datasets, chat.datasetId)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <OverviewRightPanel className="hidden xl:flex" />
    </div>
  );
}

function SkeletonCard({ darkMode }: { darkMode: boolean }) {
  return (
    <div
      className={cn(
        'h-[138px] animate-pulse rounded-[15px] border',
        darkMode ? 'border-[#3c3c3c] bg-[#2d2d2d]' : 'border-border-subtle bg-bg-base/60',
      )}
    />
  );
}
