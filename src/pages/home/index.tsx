import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Bot, Database, FileText, MessageSquare, Search, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Breadcrumb } from '@/components/Breadcrumb';
import { KnowledgeFileIcon } from '@/components/KnowledgeFileIcon';
import { Routes } from '@/routes';
import {
  RAG_QUERY_MAX_LENGTH,
  RAG_QUERY_MAX_LENGTH_MESSAGE,
  isRagQueryTooLong,
  limitRagQueryLength,
} from '@/lib/rag-query';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { getConversations } from '@/services/chat';
import { getDatasets, getKnowledgeFiles, getRecentKnowledgeFiles } from '@/services/dataset';
import { getUsageSummary } from '@/services/llm';
import type { ConversationDTO, DatasetDTO, KnowledgeFileDTO } from '@/types/api';

const USAGE_RANGE_DAYS = 14;

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

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRangeDates(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { startDate: formatLocalDate(start), endDate: formatLocalDate(end) };
}

function datasetName(datasets: DatasetDTO[], id: number) {
  return datasets.find((dataset) => dataset.id === id)?.name ?? `知识库 #${id}`;
}

function includesKeyword(value: string | null | undefined, keyword: string) {
  return (value ?? '').toLowerCase().includes(keyword);
}

export default function HomePage() {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const { addToast } = useToast();
  const displayName = user?.nickname || user?.username || '当前用户';
  const cachedPortalData = homePortalCache;

  const [searchTerm, setSearchTerm] = useState('');
  const [datasets, setDatasets] = useState<DatasetDTO[]>(() => cachedPortalData?.datasets ?? []);
  const [recentFiles, setRecentFiles] = useState<KnowledgeFileDTO[]>(() => cachedPortalData?.recentFiles ?? []);
  const [allFiles, setAllFiles] = useState<SearchableFile[]>(() => cachedPortalData?.allFiles ?? []);
  const [recentChats, setRecentChats] = useState<ConversationDTO[]>(() => cachedPortalData?.recentChats ?? []);
  const [fileTotal, setFileTotal] = useState(() => cachedPortalData?.fileTotal ?? 0);
  const [conversationTotal, setConversationTotal] = useState(() => cachedPortalData?.conversationTotal ?? 0);
  const [tokenTotal, setTokenTotal] = useState(() => cachedPortalData?.tokenTotal ?? 0);
  const [searchLoading, setSearchLoading] = useState(() => !cachedPortalData);

  useEffect(() => {
    let active = true;

    async function loadPortalData() {
      const previousCache = homePortalCache;
      if (!homePortalCache) {
        setSearchLoading(true);
      }
      try {
        const usageRange = getRangeDates(USAGE_RANGE_DAYS);
        const [datasetResult, fileResult, chatResult, usageResult] = await Promise.all([
          getDatasets(1, 100),
          getRecentKnowledgeFiles(8),
          getConversations(1, 100),
          getUsageSummary(usageRange.startDate, usageRange.endDate, 'all').catch((error) => {
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
  const searchQuery = searchTerm.trim();
  const searchQueryTooLong = isRagQueryTooLong(searchQuery);
  const searchQueryLength = searchTerm.length;

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const notifyQueryMaxLength = useCallback(() => {
    addToast('error', RAG_QUERY_MAX_LENGTH_MESSAGE);
  }, [addToast]);

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      if (nextValue.length > RAG_QUERY_MAX_LENGTH) {
        setSearchTerm(limitRagQueryLength(nextValue));
        notifyQueryMaxLength();
        return;
      }
      setSearchTerm(nextValue);
    },
    [notifyQueryMaxLength],
  );

  return (
    <div className="flex h-full min-h-0 gap-[14px] text-text-main">
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-border-subtle px-5 py-3 sm:px-8">
          <div className="min-w-0">
            <Breadcrumb items={[{ label: '首页' }]} darkMode={darkMode} />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
          <div className="mx-auto w-full max-w-[1120px] px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10 lg:px-8 lg:pb-16">
            <section className="mb-8">
              <div className="flex flex-col gap-5">
                <div className="min-w-0">
                  <h1 className="mb-2 text-[24px] font-semibold leading-tight text-ink sm:text-[27px]">
                    <span className="lg:hidden">
                      <span className="block font-serif not-italic">{displayName}</span>
                      <span className="mt-1 block">{getGreeting()}</span>
                    </span>
                    <span className="hidden lg:inline">
                      {getGreeting()}，<span className="font-serif not-italic">{displayName}</span>
                    </span>
                  </h1>
                  <p className="text-[13px] text-muted">查看最近工作、资料状态和系统用量。</p>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="flex h-14 w-full max-w-[760px] items-center gap-3 rounded-2xl border border-hairline bg-canvas p-2 transition-colors focus-within:border-primary/35"
                >
                  <img
                    src={darkMode ? '/linkrag-mark-v2-dark.png' : '/linkrag-mark-v2.png'}
                    alt=""
                    className="ml-1 h-8 w-8 shrink-0 object-contain lg:hidden"
                    aria-hidden="true"
                  />
                  <Search size={20} className="ml-2 hidden shrink-0 text-muted lg:block" />
                  <input
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="搜索文件、对话、知识库..."
                    className="min-w-0 flex-1 bg-transparent px-1 text-[16px] text-text-main outline-none placeholder:text-muted-soft"
                  />
                </form>
              </div>

              {hasSearch && (
                <div
                  className={cn(
                    'mt-3 flex items-center justify-between gap-3 text-xs',
                    searchQueryTooLong ? 'text-error' : 'text-muted',
                  )}
                >
                  <span className="min-w-0 truncate">
                    {searchQueryTooLong
                      ? RAG_QUERY_MAX_LENGTH_MESSAGE
                      : searchLoading
                        ? '正在准备文件索引...'
                        : `搜索结果 ${resultCount} 个`}
                  </span>
                  <span className="shrink-0">
                    {searchQueryLength}/{RAG_QUERY_MAX_LENGTH}
                  </span>
                </div>
              )}
            </section>

            {hasSearch ? (
              <div className="w-full">
                <SearchResults
                  keyword={searchTerm.trim()}
                  loading={searchLoading}
                  results={searchResults}
                  resultCount={resultCount}
                />
              </div>
            ) : (
              <WorkbenchOverview
                datasets={datasets}
                recentChats={recentChats}
                recentFiles={recentFiles}
                datasetTotal={datasets.length}
                conversationTotal={conversationTotal}
                fileTotal={fileTotal}
                tokenTotal={tokenTotal}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function WorkbenchOverview({
  datasets,
  recentChats,
  recentFiles,
  datasetTotal,
  conversationTotal,
  fileTotal,
  tokenTotal,
}: {
  datasets: DatasetDTO[];
  recentChats: ConversationDTO[];
  recentFiles: KnowledgeFileDTO[];
  datasetTotal: number;
  conversationTotal: number;
  fileTotal: number;
  tokenTotal: number;
}) {
  const latestFiles = recentFiles.slice(0, 4);
  const latestChats = recentChats.slice(0, 4);

  return (
    <div className="space-y-6">
      <StatsPanel
        datasetTotal={datasetTotal}
        conversationTotal={conversationTotal}
        fileTotal={fileTotal}
        tokenTotal={tokenTotal}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section>
          <SectionHeading title="最近继续" link={Routes.Chats} />
          <div>
            {latestChats.length === 0 ? (
              <EmptyState icon={MessageSquare} title="还没有对话" text="从对话页选择知识库后开始一次检索问答。" />
            ) : (
              latestChats.map((chat) => (
                <TextResultLink
                  key={chat.id}
                  title={chat.title || '未命名对话'}
                  meta={`${datasetName(datasets, chat.datasetId)} · ${formatRelativeTime(chat.updatedAt)}`}
                  to={`/chats/${chat.id}`}
                  action="继续"
                />
              ))
            )}
          </div>
        </section>

        <section>
          <SectionHeading title="最近资料" link={Routes.Datasets} />
          <div>
            {latestFiles.length === 0 ? (
              <EmptyState icon={FileText} title="还没有资料" text="上传文档后会在这里快速回到最近文件。" />
            ) : (
              latestFiles.map((file) => (
                <FileResultLink
                  key={file.id}
                  suffix={file.fileSuffix}
                  title={file.originalFilename}
                  meta={`${formatSize(file.fileSize)} · ${formatRelativeTime(file.updatedAt)}`}
                  to={`/datasets/${file.datasetId}?tab=files`}
                  action="打开"
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatsPanel({
  datasetTotal,
  conversationTotal,
  fileTotal,
  tokenTotal,
}: {
  datasetTotal: number;
  conversationTotal: number;
  fileTotal: number;
  tokenTotal: number;
}) {
  const stats = [
    { label: '对话', value: conversationTotal, icon: MessageSquare, iconClass: 'text-primary', to: Routes.Chats },
    { label: '知识库', value: datasetTotal, icon: Database, iconClass: 'text-info', to: Routes.Datasets },
    { label: '文件', value: fileTotal, icon: FileText, iconClass: 'text-success', to: Routes.Datasets },
    { label: `${USAGE_RANGE_DAYS}天 Token`, value: tokenTotal, icon: Bot, iconClass: 'text-error', to: Routes.Usage },
  ];

  return (
    <section className="mb-8 grid grid-cols-2 gap-x-4 gap-y-4 py-4 md:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, iconClass, to }) => (
        <Link
          key={label}
          to={to}
          className="flex h-[68px] items-center gap-3 rounded-md px-1 transition-colors hover:bg-ink/[0.025] sm:px-2 lg:px-3"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center">
            <Icon size={18} className={iconClass} />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-semibold leading-none text-ink">{formatNumber(value)}</span>
            <span className="mt-1 block truncate text-[11px] text-muted">{label}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}

function SearchResults({
  keyword,
  loading,
  results,
  resultCount,
}: {
  keyword: string;
  loading: boolean;
  results: { files: SearchableFile[]; chats: ConversationDTO[]; datasets: DatasetDTO[] };
  resultCount: number;
}) {
  if (loading) {
    const loadingGroups = [
      { title: '文件', icon: FileText, iconClass: 'text-success' },
      { title: '对话', icon: MessageSquare, iconClass: 'text-primary' },
      { title: '知识库', icon: Database, iconClass: 'text-info' },
    ];

    return (
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {loadingGroups.map(({ title, icon, iconClass }) => (
          <ResultGroup key={title} title={title} count={0} icon={icon} iconClass={iconClass} emptyText="正在搜索...">
            {[0, 1].map((item) => (
              <SkeletonCard key={item} compact />
            ))}
          </ResultGroup>
        ))}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {resultCount === 0 ? (
        <SearchEmptyState keyword={keyword} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ResultGroup
            title="文件"
            count={results.files.length}
            icon={FileText}
            iconClass="text-success"
            emptyText="没有匹配文件"
          >
            {results.files.map((file) => (
              <FileResultLink
                key={file.id}
                suffix={file.fileSuffix}
                title={file.originalFilename}
                meta={`${file.datasetName} · ${formatSize(file.fileSize)} · ${formatRelativeTime(file.updatedAt)}`}
                to={`/datasets/${file.datasetId}?tab=files`}
                action="打开"
              />
            ))}
          </ResultGroup>

          <ResultGroup
            title="对话"
            count={results.chats.length}
            icon={MessageSquare}
            iconClass="text-primary"
            emptyText="没有匹配对话"
          >
            {results.chats.map((chat) => (
              <TextResultLink
                key={chat.id}
                title={chat.title || '未命名对话'}
                meta={`${chat.lastModelName || '知识库问答'} · ${formatRelativeTime(chat.updatedAt)}`}
                to={`/chats/${chat.id}`}
                action="继续"
              />
            ))}
          </ResultGroup>

          <ResultGroup
            title="知识库"
            count={results.datasets.length}
            icon={Database}
            iconClass="text-info"
            emptyText="没有匹配知识库"
          >
            {results.datasets.map((dataset) => (
              <ResultLink
                key={dataset.id}
                icon={Database}
                iconClass="text-info"
                title={dataset.name}
                meta={`${dataset.description || '暂无描述'} · ${formatRelativeTime(dataset.updatedAt)}`}
                to={`/datasets/${dataset.id}`}
                action="进入"
              />
            ))}
          </ResultGroup>
        </div>
      )}
    </section>
  );
}

function ResultGroup({
  title,
  count,
  icon: Icon,
  iconClass,
  emptyText,
  children,
}: {
  title: string;
  count: number;
  icon: LucideIcon;
  iconClass: string;
  emptyText: string;
  children: React.ReactNode[];
}) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={15} className={cn('shrink-0', iconClass)} />
        <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">{title}</h3>
        <span className="font-mono text-[11px] text-muted-soft">{count}</span>
      </div>
      {children.length === 0 ? <p className="px-2.5 py-3 text-xs text-muted">{emptyText}</p> : <div>{children}</div>}
    </section>
  );
}

function SearchEmptyState({ keyword }: { keyword: string }) {
  return (
    <div className="py-10 text-center text-muted">
      <Search size={24} className="mx-auto mb-3 opacity-60" />
      <p className="text-sm font-semibold text-ink">没有找到匹配内容</p>
      <p className="mx-auto mt-2 max-w-[420px] text-xs leading-5">
        没有与“{keyword}”相关的文件、对话或知识库，可以换个关键词，或直接用它新建对话。
      </p>
    </div>
  );
}

function ResultLink({
  icon: Icon,
  iconClass,
  title,
  meta,
  to,
  action,
}: {
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
      className="group flex items-center gap-3 rounded-md px-2.5 py-3 transition-colors hover:bg-ink/[0.025]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center">
        <Icon size={16} className={iconClass} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{title}</span>
        <span className="mt-1 block truncate text-xs text-muted">{meta}</span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-text-secondary opacity-70 transition-opacity group-hover:opacity-100">
        {action}
      </span>
    </Link>
  );
}

function TextResultLink({ title, meta, to, action }: { title: string; meta: string; to: string; action: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-md px-2.5 py-3 transition-colors hover:bg-ink/[0.025]"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{title}</span>
        <span className="mt-1 block truncate text-xs text-muted">{meta}</span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-text-secondary opacity-70 transition-opacity group-hover:opacity-100">
        {action}
      </span>
    </Link>
  );
}

function FileResultLink({
  suffix,
  title,
  meta,
  to,
  action,
}: {
  suffix?: string | null;
  title: string;
  meta: string;
  to: string;
  action: string;
}) {
  return (
    <Link
      to={to}
      className="group/file flex items-center gap-3 rounded-md px-2.5 py-3 transition-colors hover:bg-ink/[0.025]"
    >
      <KnowledgeFileIcon suffix={suffix} compact />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{title}</span>
        <span className="mt-1 block truncate text-xs text-muted">{meta}</span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-text-secondary opacity-70 transition-opacity group-hover/file:opacity-100">
        {action}
      </span>
    </Link>
  );
}

function SectionHeading({ title, link }: { title: string; link?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{title}</h3>
      {link && (
        <Link
          to={link}
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
        >
          查看全部
        </Link>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof Search; title: string; text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border-subtle px-5 py-10 text-center text-muted">
      <Icon size={24} className="mx-auto mb-3 opacity-70" />
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-xs">{text}</p>
    </div>
  );
}

function SkeletonCard({ compact = false }: { compact?: boolean }) {
  return <div className={cn(compact ? 'h-[72px]' : 'h-[138px]', 'animate-pulse rounded-md bg-surface-soft')} />;
}
