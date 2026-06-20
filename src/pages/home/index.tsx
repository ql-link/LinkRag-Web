import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bot, Database, FileText, FileUp, Loader2, MessageSquare, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { createConversation, getConversations } from '@/services/chat';
import { getDatasets, getKnowledgeFiles, getRecentKnowledgeFiles } from '@/services/dataset';
import { getUsageSummary } from '@/services/llm';
import type { ConversationDTO, DatasetDTO, KnowledgeFileDTO } from '@/types/api';

const USAGE_RANGE_DAYS = 14;
const presetQuestions = ['RAG 索引怎么配置', '帮我找最近的产品决策'];
const INITIAL_QUESTION_STORAGE_PREFIX = 'linkrag.initialQuestion.';

type SearchableFile = KnowledgeFileDTO & {
  datasetName: string;
};

type HomePortalCache = {
  datasets: DatasetDTO[];
  recentFiles: KnowledgeFileDTO[];
  allFiles: SearchableFile[];
  recentChats: ConversationDTO[];
  fileTotal: number;
  conversationTotal: number;
  tokenTotal: number;
};

let homePortalCache: HomePortalCache | null = null;

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

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value || 0);
}

function getRangeDates(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const toIso = (date: Date) => date.toISOString().slice(0, 10);
  return { startDate: toIso(start), endDate: toIso(end) };
}

function datasetName(datasets: DatasetDTO[], id: number) {
  return datasets.find((dataset) => dataset.id === id)?.name ?? `知识库 #${id}`;
}

function includesKeyword(value: string | null | undefined, keyword: string) {
  return (value ?? '').toLowerCase().includes(keyword);
}

function neutralIconTone(darkMode: boolean) {
  return darkMode ? 'bg-[#2d2d2d] text-[#d4d4d4]' : 'bg-[#f2f2f2] text-[#1f1f1f]';
}

function neutralIconText(darkMode: boolean) {
  return darkMode ? 'text-[#d4d4d4]' : 'text-[#1f1f1f]';
}

export default function HomePage() {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const displayName = user?.nickname || user?.username || '当前用户';
  const cachedPortalData = homePortalCache;

  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [datasets, setDatasets] = useState<DatasetDTO[]>(() => cachedPortalData?.datasets ?? []);
  const [recentFiles, setRecentFiles] = useState<KnowledgeFileDTO[]>(() => cachedPortalData?.recentFiles ?? []);
  const [allFiles, setAllFiles] = useState<SearchableFile[]>(() => cachedPortalData?.allFiles ?? []);
  const [recentChats, setRecentChats] = useState<ConversationDTO[]>(() => cachedPortalData?.recentChats ?? []);
  const [fileTotal, setFileTotal] = useState(() => cachedPortalData?.fileTotal ?? 0);
  const [conversationTotal, setConversationTotal] = useState(() => cachedPortalData?.conversationTotal ?? 0);
  const [tokenTotal, setTokenTotal] = useState(() => cachedPortalData?.tokenTotal ?? 0);
  const [loading, setLoading] = useState(() => !cachedPortalData);
  const [searchLoading, setSearchLoading] = useState(() => !cachedPortalData);

  useEffect(() => {
    let active = true;

    async function loadPortalData() {
      const previousCache = homePortalCache;
      if (!homePortalCache) {
        setLoading(true);
        setSearchLoading(true);
      }
      try {
        const usageRange = getRangeDates(USAGE_RANGE_DAYS);
        const [datasetResult, fileResult, chatResult, usageResult] = await Promise.all([
          getDatasets(1, 100),
          getRecentKnowledgeFiles(8),
          getConversations(1, 100),
          getUsageSummary(usageRange.startDate, usageRange.endDate).catch((error) => {
            console.error('Failed to load home usage summary:', error);
            return null;
          }),
        ]);

        if (!active) return;
        const activeDatasets = datasetResult.items
          .filter((dataset) => dataset.status !== 'DELETED')
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setDatasets(activeDatasets);
        setRecentFiles(fileResult);
        setRecentChats(chatResult.items);
        setConversationTotal(chatResult.total);
        setTokenTotal(usageResult?.totalTokens ?? 0);
        homePortalCache = {
          datasets: activeDatasets,
          recentFiles: fileResult,
          allFiles: previousCache?.allFiles ?? [],
          recentChats: chatResult.items,
          fileTotal: previousCache?.fileTotal ?? 0,
          conversationTotal: chatResult.total,
          tokenTotal: usageResult?.totalTokens ?? 0,
        };
        setLoading(false);

        const fileResults = await Promise.allSettled(
          activeDatasets.map(async (dataset) => {
            const result = await getKnowledgeFiles(dataset.id, 1, 100);
            return {
              total: result.total,
              items: result.items.map((file) => ({ ...file, datasetName: dataset.name })),
            };
          }),
        );

        if (!active) return;
        const nextFileTotal = fileResults.reduce(
          (total, result) => total + (result.status === 'fulfilled' ? result.value.total : 0),
          0,
        );
        const nextAllFiles = fileResults
          .flatMap((result) => (result.status === 'fulfilled' ? result.value.items : []))
          .sort((a, b) => {
            const timeDiff =
              new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
            return timeDiff !== 0 ? timeDiff : b.id - a.id;
          });
        setFileTotal(nextFileTotal);
        setAllFiles(nextAllFiles);
        homePortalCache = {
          datasets: activeDatasets,
          recentFiles: fileResult,
          allFiles: nextAllFiles,
          recentChats: chatResult.items,
          fileTotal: nextFileTotal,
          conversationTotal: chatResult.total,
          tokenTotal: usageResult?.totalTokens ?? 0,
        };
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
            'min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-[30px] sm:py-7',
            darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base',
          )}
        >
          <section className="mb-5">
            <h1
              className={cn(
                'mb-2 text-[23px] font-semibold leading-tight sm:text-[25px]',
                darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
              )}
            >
              {getGreeting()}，<span className="font-serif italic">{displayName}</span>
            </h1>
            <p className={cn('text-[13px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
              搜索文件、对话、知识库，或从最近内容继续。
            </p>
          </section>

          <form
            onSubmit={handleSubmit}
            className={cn(
              'mb-6 rounded-[18px] border px-4 pb-4 pt-4 sm:px-5',
              darkMode ? 'border-[#4a4a4a] bg-[#1e1e1e]' : 'border-[var(--color-border-medium)] bg-bg-base',
            )}
          >
            <div className={cn('flex items-center gap-3 sm:gap-4', !hasSearch && quickQuestions.length > 0 && 'mb-4')}>
              <Search size={22} className="text-[#7B6B5D]" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="搜索文件、对话、知识库，或输入一个问题..."
                className={cn(
                  'min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-text-main/40 sm:text-[17px]',
                  darkMode ? 'text-[#e0e0e0] placeholder:text-[#6b6b6b]' : 'text-text-main',
                )}
              />
            </div>
            {hasSearch && (
              <div className={cn('mt-3 text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                {searchLoading ? '正在准备文件索引...' : `搜索结果 ${resultCount} 个 · 回车可用这个问题新建对话`}
              </div>
            )}
            {!hasSearch && quickQuestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-[9px]">
                {quickQuestions.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setSearchTerm(item.prompt)}
                    className={cn(
                      'rounded-[9px] border px-[13px] py-[7px] text-xs font-medium transition-colors',
                      item.featured
                        ? darkMode
                          ? 'border-[#4a4a4a] bg-[#2d2d2d] text-[#d4d4d4]'
                          : 'border-[#d6d6d6] bg-[#f2f2f2] text-[#1f1f1f]'
                        : darkMode
                          ? 'border-[#3c3c3c] bg-[#252526] text-[#cccccc]'
                          : 'border-border-subtle bg-white text-text-main/70',
                      darkMode ? 'hover:border-[#d4d4d4]' : 'hover:border-[#1f1f1f]',
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
              <StatsPanel
                darkMode={darkMode}
                datasetTotal={datasets.length}
                conversationTotal={conversationTotal}
                fileTotal={fileTotal}
                tokenTotal={tokenTotal}
              />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div
                  className={cn(
                    'rounded-[18px] border px-5 py-4 lg:px-6',
                    darkMode ? 'border-[#333333] bg-[#252526]/45' : 'border-border-subtle bg-white/55',
                  )}
                >
                  <RecentDatasetsList darkMode={darkMode} loading={loading} datasets={datasets} />
                </div>
                <div
                  className={cn(
                    'rounded-[18px] border px-5 py-4 lg:px-6',
                    darkMode ? 'border-[#333333] bg-[#252526]/45' : 'border-border-subtle bg-white/55',
                  )}
                >
                  <RecentChatsList
                    darkMode={darkMode}
                    loading={loading}
                    recentChats={recentChats}
                    datasets={datasets}
                    onOpenChat={(id) => navigate(`/chats/${id}`)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function StatsPanel({
  darkMode,
  datasetTotal,
  conversationTotal,
  fileTotal,
  tokenTotal,
}: {
  darkMode: boolean;
  datasetTotal: number;
  conversationTotal: number;
  fileTotal: number;
  tokenTotal: number;
}) {
  const stats = [
    { label: '知识库', value: datasetTotal, icon: Database, iconClass: 'text-[#4F7FA8]' },
    { label: '对话', value: conversationTotal, icon: MessageSquare, iconClass: 'text-[#7B6B5D]' },
    { label: '文件', value: fileTotal, icon: FileText, iconClass: 'text-[#5E9B73]' },
    { label: `${USAGE_RANGE_DAYS}天 Token`, value: tokenTotal, icon: Bot, iconClass: 'text-[#D97373]' },
  ];

  return (
    <section className="mb-8 grid grid-cols-2 gap-y-3 py-1 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, iconClass }, index) => (
        <div
          key={label}
          className={cn(
            'flex items-center gap-3 px-1 py-2 sm:px-3',
            index > 0 && 'lg:pl-6',
            index % 2 === 1 && 'max-lg:pl-4',
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-transparent">
            <Icon size={18} className={iconClass} />
          </span>
          <span className="min-w-0">
            <span
              className={cn('block text-lg font-semibold leading-none', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}
            >
              {formatNumber(value)}
            </span>
            <span className={cn('mt-1 block truncate text-[11px]', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
              {label}
            </span>
          </span>
        </div>
      ))}
    </section>
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
                iconClass="text-[#5E9B73]"
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
                iconClass="text-[#7B6B5D]"
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
                iconClass="text-[#4F7FA8]"
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
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-[10px] px-3 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
              darkMode ? 'bg-[#8A7662] text-white hover:bg-[#7B6B5D]' : 'bg-[#7B6B5D] text-white hover:opacity-90',
            )}
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            新建对话
          </button>
          <Link
            to={Routes.Datasets}
            state={{ openUpload: true }}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-[10px] border px-3 text-xs font-semibold transition-colors',
              darkMode
                ? 'border-[#3c3c3c] text-[#cccccc] hover:border-[#d4d4d4]'
                : 'border-border-subtle text-text-main/70 hover:border-[#1f1f1f]',
            )}
          >
            <FileUp size={14} className="text-[#5E9B73]" />
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
  iconClass,
  title,
  meta,
  to,
  action,
}: {
  darkMode: boolean;
  icon: typeof FileText;
  iconClass: string;
  title: string;
  meta: string;
  to: string;
  action: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex items-center gap-3 rounded-[14px] border p-3 transition-all hover:-translate-y-px hover:shadow-[0_6px_18px_-8px_rgba(26,26,26,0.18)]',
        darkMode
          ? 'border-[#3c3c3c] bg-[#252526] hover:border-[#d4d4d4]'
          : 'border-border-subtle bg-white hover:border-[#1f1f1f]',
      )}
    >
      <span
        className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]', neutralIconTone(darkMode))}
      >
        <Icon size={17} className={iconClass} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-sm font-semibold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
          {title}
        </span>
        <span className={cn('mt-1 block truncate text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
          {meta}
        </span>
      </span>
      <span className={cn('shrink-0 text-xs font-semibold', neutralIconText(darkMode))}>{action}</span>
    </Link>
  );
}

function RecentDatasetsList({
  darkMode,
  loading,
  datasets,
}: {
  darkMode: boolean;
  loading: boolean;
  datasets: DatasetDTO[];
}) {
  return (
    <section>
      <SectionHeading darkMode={darkMode} title="最近知识库" link={Routes.Datasets} />
      {loading ? (
        <MiniListSkeleton darkMode={darkMode} />
      ) : datasets.length === 0 ? (
        <LightweightEmpty darkMode={darkMode} icon={Database} title="暂无知识库" text="创建知识库后会显示在这里。" />
      ) : (
        <div className={cn('divide-y', darkMode ? 'divide-[#333333]' : 'divide-border-subtle')}>
          {datasets.slice(0, 6).map((dataset) => (
            <Link
              key={dataset.id}
              to={`/datasets/${dataset.id}`}
              className={cn(
                'group flex items-center gap-3 py-3.5 transition-colors',
                darkMode ? 'hover:text-[#e0e0e0]' : 'hover:text-text-main',
              )}
            >
              <span className="min-w-0 flex-1">
                <span
                  className={cn('block truncate text-sm font-semibold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}
                >
                  {dataset.name}
                </span>
                <span
                  className={cn('mt-0.5 block truncate text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/45')}
                >
                  {dataset.description || '暂无描述'} · {formatRelativeTime(dataset.updatedAt)}
                </span>
              </span>
              <ArrowRight
                size={14}
                className={cn(
                  'shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100',
                  neutralIconText(darkMode),
                )}
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function RecentChatsList({
  darkMode,
  loading,
  recentChats,
  datasets,
  onOpenChat,
}: {
  darkMode: boolean;
  loading: boolean;
  recentChats: ConversationDTO[];
  datasets: DatasetDTO[];
  onOpenChat: (id: number) => void;
}) {
  return (
    <section>
      <SectionHeading darkMode={darkMode} title="最近对话" link={Routes.Chats} />
      {loading ? (
        <MiniListSkeleton darkMode={darkMode} />
      ) : recentChats.length === 0 ? (
        <LightweightEmpty
          darkMode={darkMode}
          icon={MessageSquare}
          title="暂无最近对话"
          text="新建对话后会显示在这里。"
        />
      ) : (
        <div className={cn('divide-y', darkMode ? 'divide-[#333333]' : 'divide-border-subtle')}>
          {recentChats.slice(0, 6).map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => onOpenChat(chat.id)}
              className={cn(
                'group flex w-full items-center gap-3 py-3.5 text-left transition-colors',
                darkMode ? 'hover:text-[#e0e0e0]' : 'hover:text-text-main',
              )}
            >
              <span className="min-w-0 flex-1">
                <span
                  className={cn('block truncate text-sm font-semibold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}
                >
                  {chat.title || '未命名对话'}
                </span>
                <span
                  className={cn('mt-0.5 block truncate text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/45')}
                >
                  {datasetName(datasets, chat.datasetId)} · {formatRelativeTime(chat.updatedAt)}
                </span>
              </span>
              <ArrowRight
                size={14}
                className={cn(
                  'shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100',
                  neutralIconText(darkMode),
                )}
              />
            </button>
          ))}
        </div>
      )}
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
            'font-mono text-[10px] uppercase tracking-[0.12em] transition-colors',
            darkMode ? 'text-[#858585] hover:text-[#d4d4d4]' : 'text-text-main/50 hover:text-[#1f1f1f]',
          )}
        >
          查看全部
        </Link>
      )}
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

function LightweightEmpty({
  darkMode,
  icon: Icon,
  title,
  text,
}: {
  darkMode: boolean;
  icon: typeof Database;
  title: string;
  text: string;
}) {
  return (
    <div className={cn('py-8 text-center', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
      <Icon size={22} className="mx-auto mb-3 opacity-70" />
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
