import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Cpu,
  Database,
  FileText,
  FileUp,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { createConversation, getConversations } from '@/services/chat';
import { getDatasets, getKnowledgeFiles, getRecentKnowledgeFiles } from '@/services/dataset';
import type { ConversationDTO, DatasetDTO, KnowledgeFileDTO } from '@/types/api';

const presetQuestions = ['RAG 索引怎么配置', '帮我找最近的产品决策'];
const INITIAL_QUESTION_STORAGE_PREFIX = 'linkrag.initialQuestion.';

type SearchableFile = KnowledgeFileDTO & {
  datasetName: string;
};

type QuickAction = {
  id: string;
  title: string;
  description: string;
  to: string;
  state?: Record<string, unknown>;
  icon: typeof Plus;
  primary?: boolean;
};

const quickActions: QuickAction[] = [
  {
    id: 'new-chat',
    title: '新建对话',
    description: '选择知识库，开始一次问答',
    to: Routes.Chats,
    icon: Plus,
    primary: true,
  },
  {
    id: 'upload',
    title: '上传文档',
    description: '补充 PDF、Word、Markdown',
    to: Routes.Datasets,
    state: { openUpload: true },
    icon: FileUp,
  },
  {
    id: 'datasets',
    title: '管理知识库',
    description: '查看文件、解析和配置',
    to: Routes.Datasets,
    icon: Database,
  },
  {
    id: 'llm',
    title: '模型配置',
    description: '维护供应商和可用模型',
    to: Routes.LLMPage,
    icon: Cpu,
  },
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

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes)) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function datasetName(datasets: DatasetDTO[], id: number) {
  return datasets.find((dataset) => dataset.id === id)?.name ?? `知识库 #${id}`;
}

function parseFileStatus(file: KnowledgeFileDTO): 'parsing' | 'done' | 'failed' {
  const status = [file.frontendStatus, file.parseStatus, file.parseNoticeStatus]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (file.isParseSuccess || status.includes('success')) return 'done';
  if (file.parseFailureReason || file.failureReason || status.includes('fail')) return 'failed';
  return 'parsing';
}

function includesKeyword(value: string | null | undefined, keyword: string) {
  return (value ?? '').toLowerCase().includes(keyword);
}

export default function HomePage() {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const displayName = user?.nickname || user?.username || '当前用户';

  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [datasets, setDatasets] = useState<DatasetDTO[]>([]);
  const [recentFiles, setRecentFiles] = useState<KnowledgeFileDTO[]>([]);
  const [allFiles, setAllFiles] = useState<SearchableFile[]>([]);
  const [recentChats, setRecentChats] = useState<ConversationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadPortalData() {
      setLoading(true);
      setSearchLoading(true);
      try {
        const [datasetResult, fileResult, chatResult] = await Promise.all([
          getDatasets(1, 100),
          getRecentKnowledgeFiles(8),
          getConversations(1, 100),
        ]);

        if (!active) return;
        const activeDatasets = datasetResult.items.filter((dataset) => dataset.status !== 'DELETED');
        setDatasets(activeDatasets);
        setRecentFiles(fileResult);
        setRecentChats(chatResult.items);
        setLoading(false);

        const fileResults = await Promise.allSettled(
          activeDatasets.map(async (dataset) => {
            const result = await getKnowledgeFiles(dataset.id, 1, 100);
            return result.items.map((file) => ({ ...file, datasetName: dataset.name }));
          }),
        );

        if (!active) return;
        setAllFiles(
          fileResults
            .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
            .sort((a, b) => {
              const timeDiff =
                new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
              return timeDiff !== 0 ? timeDiff : b.id - a.id;
            }),
        );
      } catch (error) {
        console.error('Failed to load home portal data:', error);
        if (active) setLoading(false);
      } finally {
        if (active) setSearchLoading(false);
      }
    }

    void loadPortalData();
    return () => {
      active = false;
    };
  }, []);

  const keyword = searchTerm.trim().toLowerCase();
  const hasSearch = keyword.length > 0;

  const searchResults = useMemo(() => {
    if (!keyword) return { files: [], chats: [], datasets: [] };

    return {
      files: allFiles
        .filter((file) => includesKeyword(file.originalFilename, keyword) || includesKeyword(file.datasetName, keyword))
        .slice(0, 6),
      chats: recentChats
        .filter(
          (chat) =>
            includesKeyword(chat.title, keyword) ||
            includesKeyword(chat.lastModelName, keyword) ||
            includesKeyword(datasetName(datasets, chat.datasetId), keyword),
        )
        .slice(0, 4),
      datasets: datasets
        .filter(
          (dataset) =>
            includesKeyword(dataset.name, keyword) ||
            includesKeyword(dataset.description, keyword) ||
            includesKeyword(String(dataset.id), keyword),
        )
        .slice(0, 4),
    };
  }, [allFiles, datasets, keyword, recentChats]);

  const resultCount = searchResults.files.length + searchResults.chats.length + searchResults.datasets.length;

  const parseSummary = useMemo(() => {
    const todaysFiles = recentFiles.filter((file) => {
      const time = new Date(file.updatedAt || file.createdAt);
      const now = new Date();
      return (
        !Number.isNaN(time.getTime()) &&
        time.getFullYear() === now.getFullYear() &&
        time.getMonth() === now.getMonth() &&
        time.getDate() === now.getDate()
      );
    });

    return {
      done: todaysFiles.filter((file) => parseFileStatus(file) === 'done').length,
      failed: todaysFiles.filter((file) => parseFileStatus(file) === 'failed').length,
      parsing: recentFiles.filter((file) => parseFileStatus(file) === 'parsing').length,
    };
  }, [recentFiles]);

  const quickQuestions = useMemo(() => {
    const items: Array<{ label: string; prompt: string; featured?: boolean }> = [];
    const recentFile = recentFiles[0];
    if (recentFile) {
      items.push({
        label: '总结最近上传的文档',
        prompt: `请总结最近上传的文档「${recentFile.originalFilename}」，提炼关键结论和待办。`,
        featured: true,
      });
    }
    presetQuestions.forEach((label) => items.push({ label, prompt: label }));
    return items.slice(0, 4);
  }, [recentFiles]);

  const createQuestionConversation = async (value = searchTerm) => {
    const content = value.trim();
    if (!content || submitting) return;
    const targetDatasetId = datasets[0]?.id;
    if (!targetDatasetId) {
      addToast('error', '请先创建或选择一个知识库');
      return;
    }

    setSubmitting(true);
    try {
      const title = content.length > 28 ? `${content.slice(0, 28)}...` : content;
      const conversation = await createConversation({ title, datasetId: targetDatasetId });
      sessionStorage.setItem(`${INITIAL_QUESTION_STORAGE_PREFIX}${conversation.id}`, content);
      navigate(`/chats/${conversation.id}`, { state: { initialQuestion: content } });
    } catch (error) {
      console.error('Failed to create conversation:', error);
      addToast('error', '创建对话失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasSearch) return;
    void createQuestionConversation();
  };

  return (
    <div className={cn('flex h-full min-h-0 gap-[14px]', darkMode ? 'text-[#cccccc]' : 'text-text-main')}>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={cn(
            'flex min-h-16 shrink-0 items-center justify-between gap-4 border-b px-5 py-3 sm:px-8',
            darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
          )}
        >
          <div className="min-w-0">
            <Breadcrumb items={[{ label: '首页' }]} darkMode={darkMode} />
          </div>
        </header>

        <div
          className={cn(
            'flex-1 overflow-y-auto px-5 py-6 sm:px-[30px] sm:py-7',
            darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base',
          )}
        >
          <section className="mb-6">
            <h1
              className={cn(
                'mb-2 text-[24px] font-semibold leading-tight sm:text-[26px]',
                darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
              )}
            >
              {getGreeting()}，<span className="font-serif italic">{displayName}</span>
            </h1>
            <p className={cn('text-[13px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
              搜索文件、继续对话，或从一个任务入口开始。
            </p>
          </section>

          <form
            onSubmit={handleSubmit}
            className={cn(
              'mb-5 rounded-[20px] border px-4 pb-4 pt-4 sm:px-5 sm:pb-[18px] sm:pt-5',
              darkMode ? 'border-[#4a4a4a] bg-[#1e1e1e]' : 'border-[var(--color-border-medium)] bg-bg-base',
            )}
          >
            <div className="mb-4 flex items-center gap-3 sm:gap-4">
              <Search size={23} className={darkMode ? 'text-[#3b82f6]' : 'text-primary'} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="搜索文件、对话、知识库，或输入一个问题..."
                className={cn(
                  'min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-text-main/40 sm:text-[17px]',
                  darkMode ? 'text-[#e0e0e0] placeholder:text-[#6b6b6b]' : 'text-text-main',
                )}
              />
              <button
                type="submit"
                disabled={submitting || !searchTerm.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-btn-primary)] text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="用当前问题新建对话"
                title="用当前问题新建对话"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            {hasSearch ? (
              <div className={cn('text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                {searchLoading ? '正在准备文件索引...' : `搜索结果 ${resultCount} 个 · 回车可用这个问题新建对话`}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-[9px]">
                {quickQuestions.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setSearchTerm(item.prompt)}
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
            )}
          </form>

          {hasSearch ? (
            <SearchResults
              darkMode={darkMode}
              keyword={searchTerm.trim()}
              loading={searchLoading}
              results={searchResults}
              resultCount={resultCount}
              submitting={submitting}
              onCreateQuestion={() => void createQuestionConversation()}
            />
          ) : (
            <>
              <section className="mb-7">
                <SectionHeading darkMode={darkMode} title="快速开始" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                  {quickActions.map(({ id, title, description, to, state, icon: Icon, primary }) => (
                    <Link
                      key={id}
                      to={to}
                      state={state}
                      className={cn(
                        'group flex min-h-[116px] flex-col justify-between rounded-[15px] border p-4 text-left transition-all hover:-translate-y-px hover:border-primary hover:shadow-[0_6px_18px_-8px_rgba(26,26,26,0.18)]',
                        darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
                      )}
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <span
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-[13px]',
                            primary
                              ? 'bg-[var(--color-btn-primary)] text-white'
                              : 'bg-[var(--color-primary-light)] text-primary',
                          )}
                        >
                          <Icon size={18} />
                        </span>
                        <ArrowRight
                          size={15}
                          className={cn(
                            'opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100',
                            darkMode ? 'text-[#3b82f6]' : 'text-primary',
                          )}
                        />
                      </div>
                      <div>
                        <h3 className={cn('text-sm font-semibold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                          {title}
                        </h3>
                        <p className={cn('mt-1 text-xs leading-5', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                          {description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="mb-7">
                <SectionHeading darkMode={darkMode} title="继续对话" link={Routes.Chats} />
                {loading ? (
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {[0, 1, 2, 3].map((item) => (
                      <SkeletonCard key={item} darkMode={darkMode} />
                    ))}
                  </div>
                ) : recentChats.length === 0 ? (
                  <EmptyState
                    darkMode={darkMode}
                    icon={MessageSquare}
                    title="还没有对话"
                    text="新建一次对话后，这里会显示最近进展。"
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {recentChats.slice(0, 4).map((chat) => (
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

              <RecentActivity
                darkMode={darkMode}
                loading={loading}
                recentFiles={recentFiles}
                recentChats={recentChats}
                parseSummary={parseSummary}
                datasets={datasets}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function SearchResults({
  darkMode,
  keyword,
  loading,
  results,
  resultCount,
  submitting,
  onCreateQuestion,
}: {
  darkMode: boolean;
  keyword: string;
  loading: boolean;
  results: { files: SearchableFile[]; chats: ConversationDTO[]; datasets: DatasetDTO[] };
  resultCount: number;
  submitting: boolean;
  onCreateQuestion: () => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3">
        {[0, 1, 2].map((item) => (
          <SkeletonCard key={item} darkMode={darkMode} compact />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-5">
      {resultCount === 0 ? (
        <EmptyState
          darkMode={darkMode}
          icon={Search}
          title="没有找到匹配内容"
          text="可以换个关键词，也可以直接把当前内容作为问题开始对话。"
        />
      ) : (
        <>
          <ResultGroup darkMode={darkMode} title="文件" emptyText="没有匹配文件">
            {results.files.map((file) => (
              <ResultLink
                key={file.id}
                darkMode={darkMode}
                icon={FileText}
                title={file.originalFilename}
                meta={`${file.datasetName} · ${formatSize(file.fileSize)} · ${formatRelativeTime(file.updatedAt)}`}
                to={`/datasets/${file.datasetId}?tab=files`}
                action="打开"
              />
            ))}
          </ResultGroup>

          <ResultGroup darkMode={darkMode} title="对话" emptyText="没有匹配对话">
            {results.chats.map((chat) => (
              <ResultLink
                key={chat.id}
                darkMode={darkMode}
                icon={MessageSquare}
                title={chat.title || '未命名对话'}
                meta={`${chat.lastModelName || '知识库问答'} · ${formatRelativeTime(chat.updatedAt)}`}
                to={`/chats/${chat.id}`}
                action="继续"
              />
            ))}
          </ResultGroup>

          <ResultGroup darkMode={darkMode} title="知识库" emptyText="没有匹配知识库">
            {results.datasets.map((dataset) => (
              <ResultLink
                key={dataset.id}
                darkMode={darkMode}
                icon={Database}
                title={dataset.name}
                meta={`${dataset.description || '暂无描述'} · ${formatRelativeTime(dataset.updatedAt)}`}
                to={`/datasets/${dataset.id}`}
                action="进入"
              />
            ))}
          </ResultGroup>
        </>
      )}

      <div
        className={cn(
          'flex flex-col gap-3 rounded-[15px] border p-4 sm:flex-row sm:items-center sm:justify-between',
          darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
        )}
      >
        <div className="min-w-0">
          <h3 className={cn('text-sm font-semibold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
            没找到想要的？
          </h3>
          <p className={cn('mt-1 truncate text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
            使用“{keyword}”新建对话，或上传相关文档补充知识来源。
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onCreateQuestion}
            disabled={submitting}
            className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[var(--color-btn-primary)] px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            新建对话
          </button>
          <Link
            to={Routes.Datasets}
            state={{ openUpload: true }}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-[10px] border px-3 text-xs font-semibold transition-colors hover:border-primary',
              darkMode ? 'border-[#3c3c3c] text-[#cccccc]' : 'border-border-subtle text-text-main/70',
            )}
          >
            <FileUp size={14} />
            上传文档
          </Link>
        </div>
      </div>
    </section>
  );
}

function ResultGroup({
  darkMode,
  title,
  emptyText,
  children,
}: {
  darkMode: boolean;
  title: string;
  emptyText: string;
  children: React.ReactNode[];
}) {
  return (
    <section>
      <SectionHeading darkMode={darkMode} title={title} />
      {children.length === 0 ? (
        <p
          className={cn(
            'rounded-[15px] border border-dashed px-4 py-5 text-xs',
            darkMode ? 'border-[#3c3c3c] text-[#858585]' : 'border-border-subtle text-text-main/45',
          )}
        >
          {emptyText}
        </p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

function ResultLink({
  darkMode,
  icon: Icon,
  title,
  meta,
  to,
  action,
}: {
  darkMode: boolean;
  icon: typeof FileText;
  title: string;
  meta: string;
  to: string;
  action: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex items-center gap-3 rounded-[14px] border p-3 transition-all hover:-translate-y-px hover:border-primary hover:shadow-[0_6px_18px_-8px_rgba(26,26,26,0.18)]',
        darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-primary-light)] text-primary">
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-sm font-semibold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
          {title}
        </span>
        <span className={cn('mt-1 block truncate text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
          {meta}
        </span>
      </span>
      <span className={cn('shrink-0 text-xs font-semibold', darkMode ? 'text-[#3b82f6]' : 'text-primary')}>
        {action}
      </span>
    </Link>
  );
}

function RecentActivity({
  darkMode,
  loading,
  recentFiles,
  recentChats,
  parseSummary,
  datasets,
}: {
  darkMode: boolean;
  loading: boolean;
  recentFiles: KnowledgeFileDTO[];
  recentChats: ConversationDTO[];
  parseSummary: { done: number; failed: number; parsing: number };
  datasets: DatasetDTO[];
}) {
  return (
    <section>
      <SectionHeading darkMode={darkMode} title="近期活动" />
      <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
        <ActivityCard darkMode={darkMode} title="最近文件" link={Routes.Datasets}>
          {loading ? (
            <MiniListSkeleton darkMode={darkMode} />
          ) : recentFiles.length === 0 ? (
            <p className={cn('py-5 text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>暂无文件</p>
          ) : (
            <div className="space-y-3">
              {recentFiles.slice(0, 4).map((file) => (
                <ActivityRow
                  key={file.id}
                  darkMode={darkMode}
                  icon={FileText}
                  title={file.originalFilename}
                  meta={`${datasetName(datasets, file.datasetId)} · ${formatRelativeTime(file.updatedAt || file.createdAt)}`}
                />
              ))}
            </div>
          )}
        </ActivityCard>

        <ActivityCard darkMode={darkMode} title="最近状态" link={Routes.Usage}>
          {loading ? (
            <MiniListSkeleton darkMode={darkMode} />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <StatusTile icon={CheckCircle2} label="今日完成" value={parseSummary.done} tone="success" />
              <StatusTile icon={Clock3} label="解析中" value={parseSummary.parsing} tone="info" />
              <StatusTile icon={XCircle} label="今日失败" value={parseSummary.failed} tone="error" />
            </div>
          )}
          <div className={cn('mt-4 border-t pt-4', darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle')}>
            {recentChats.slice(0, 2).map((chat) => (
              <ActivityRow
                key={chat.id}
                darkMode={darkMode}
                icon={Activity}
                title={chat.title || '未命名对话'}
                meta={`${datasetName(datasets, chat.datasetId)} · ${formatRelativeTime(chat.updatedAt)}`}
              />
            ))}
            {!loading && recentChats.length === 0 && (
              <p className={cn('py-2 text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>暂无对话更新</p>
            )}
          </div>
        </ActivityCard>
      </div>
    </section>
  );
}

function SectionHeading({ darkMode, title, link }: { darkMode: boolean; title: string; link?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3
        className={cn(
          'font-mono text-[10px] uppercase tracking-[0.12em]',
          darkMode ? 'text-[#858585]' : 'text-text-main/50',
        )}
      >
        {title}
      </h3>
      {link && (
        <Link
          to={link}
          className={cn(
            'font-mono text-[10px] uppercase tracking-[0.12em] transition-colors hover:text-primary',
            darkMode ? 'text-[#858585]' : 'text-text-main/50',
          )}
        >
          查看全部
        </Link>
      )}
    </div>
  );
}

function ActivityCard({
  darkMode,
  title,
  link,
  children,
}: {
  darkMode: boolean;
  title: string;
  link: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-[15px] border p-4',
        darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className={cn('text-sm font-semibold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>{title}</h4>
        <Link
          to={link}
          className={cn(
            'text-xs font-semibold transition-colors hover:text-primary',
            darkMode ? 'text-[#858585]' : 'text-text-main/45',
          )}
        >
          查看
        </Link>
      </div>
      {children}
    </section>
  );
}

function ActivityRow({
  darkMode,
  icon: Icon,
  title,
  meta,
}: {
  darkMode: boolean;
  icon: typeof FileText;
  title: string;
  meta: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-primary-light)] text-primary">
        <Icon size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-xs font-semibold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
          {title}
        </span>
        <span className={cn('mt-0.5 block truncate text-[11px]', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
          {meta}
        </span>
      </span>
    </div>
  );
}

function StatusTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  tone: 'success' | 'info' | 'error';
}) {
  const toneClass = {
    success: 'text-[#3f7a5f] bg-[rgba(34,197,94,0.12)]',
    info: 'text-[#8a6a44] bg-[var(--color-primary-light)]',
    error: 'text-[#b85a5a] bg-[rgba(217,115,115,0.14)]',
  }[tone];

  return (
    <div className={cn('rounded-[13px] p-3', toneClass)}>
      <Icon size={15} />
      <div className="mt-2 text-xl font-bold leading-none">{value}</div>
      <div className="mt-1 text-[10px] font-semibold">{label}</div>
    </div>
  );
}

function EmptyState({
  darkMode,
  icon: Icon,
  title,
  text,
}: {
  darkMode: boolean;
  icon: typeof Search;
  title: string;
  text: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[15px] border border-dashed px-5 py-10 text-center',
        darkMode ? 'border-[#3c3c3c] text-[#858585]' : 'border-border-subtle text-text-main/45',
      )}
    >
      <Icon size={24} className="mx-auto mb-3 opacity-70" />
      <p className={cn('text-sm font-semibold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>{title}</p>
      <p className="mt-2 text-xs">{text}</p>
    </div>
  );
}

function SkeletonCard({ darkMode, compact = false }: { darkMode: boolean; compact?: boolean }) {
  return (
    <div
      className={cn(
        compact ? 'h-[72px]' : 'h-[138px]',
        'animate-pulse rounded-[15px] border',
        darkMode ? 'border-[#3c3c3c] bg-[#2d2d2d]' : 'border-border-subtle bg-bg-base/60',
      )}
    />
  );
}

function MiniListSkeleton({ darkMode }: { darkMode: boolean }) {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex items-center gap-3">
          <div className={cn('h-8 w-8 animate-pulse rounded-[10px]', darkMode ? 'bg-[#2d2d2d]' : 'bg-bg-base')} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className={cn('h-3 w-2/3 animate-pulse rounded', darkMode ? 'bg-[#2d2d2d]' : 'bg-bg-base')} />
            <div className={cn('h-2 w-1/2 animate-pulse rounded', darkMode ? 'bg-[#2d2d2d]' : 'bg-bg-base')} />
          </div>
        </div>
      ))}
    </div>
  );
}
