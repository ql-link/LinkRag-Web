import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  ChevronDown,
  Hash,
  Search,
  Sparkles,
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';

interface BlogsPageProps {
  darkMode?: boolean;
}

type BlogArticle = {
  id: number;
  title: string;
  date: string;
  readTime: string;
  category: string;
  tag: string;
  visual: string;
};

const categories = [
  { name: '全部', count: 28 },
  { name: '产品更新', count: 12 },
  { name: 'RAG 实践', count: 8 },
  { name: 'Agent 工作流', count: 5 },
  { name: '工程札记', count: 3 },
];

const years = [
  { name: '2026', count: 6 },
  { name: '2025', count: 16 },
  { name: '2024', count: 6 },
];

const articles: BlogArticle[] = [
  {
    id: 1,
    title: '智能体时代的知识库：为什么 LinkRag 正在进化',
    date: '2026-05-09',
    readTime: '4 分钟',
    category: '产品更新',
    tag: 'Agent harness',
    visual: 'harness',
  },
  {
    id: 2,
    title: 'LinkRag 与 OpenKnow：企业级知识工具的新接口',
    date: '2026-04-21',
    readTime: '6 分钟',
    category: 'RAG 实践',
    tag: 'Open knowledge',
    visual: 'enterprise',
  },
  {
    id: 3,
    title: '把离散文档组织成可追问的答案网络',
    date: '2026-03-29',
    readTime: '5 分钟',
    category: 'Agent 工作流',
    tag: 'Memory',
    visual: 'memory',
  },
  {
    id: 4,
    title: 'LinkRag 0.24.0：让 API、知识库与智能体协同',
    date: '2026-02-14',
    readTime: '7 分钟',
    category: '产品更新',
    tag: 'API orchestration',
    visual: 'api',
  },
  {
    id: 5,
    title: '从 RAG 到上下文工程：2025 年终回顾',
    date: '2025-12-28',
    readTime: '8 分钟',
    category: '工程札记',
    tag: 'Year End Recap',
    visual: 'recap',
  },
  {
    id: 6,
    title: 'LinkRag 的历史时代：从 0.21 到 0.22 的系统演进',
    date: '2025-11-17',
    readTime: '6 分钟',
    category: '产品更新',
    tag: 'Model switch',
    visual: 'switch',
  },
  {
    id: 7,
    title: '20 个支撑知识检索、推荐和任务流的配置 UI',
    date: '2025-10-25',
    readTime: '9 分钟',
    category: '工程札记',
    tag: 'Data sources',
    visual: 'data',
  },
  {
    id: 8,
    title: '实践一套可复用的评估指标体系',
    date: '2025-09-08',
    readTime: '5 分钟',
    category: 'RAG 实践',
    tag: 'Agent score',
    visual: 'score',
  },
  {
    id: 9,
    title: '文档处理管线的细节：从解析到结构化入库',
    date: '2025-08-16',
    readTime: '7 分钟',
    category: 'RAG 实践',
    tag: 'Ingestion pipeline',
    visual: 'pipeline',
  },
  {
    id: 10,
    title: '命令行也可以很优雅：LinkRag CLI 的设计思路',
    date: '2025-07-03',
    readTime: '4 分钟',
    category: '产品更新',
    tag: 'CLI tool',
    visual: 'cli',
  },
  {
    id: 11,
    title: '向量检索调优：如何在 90% 到 95% 之间做选择',
    date: '2025-06-18',
    readTime: '8 分钟',
    category: 'RAG 实践',
    tag: 'Infinity',
    visual: 'graph',
  },
  {
    id: 12,
    title: '用 SQL 助手把复杂查询交给工作流',
    date: '2025-05-09',
    readTime: '5 分钟',
    category: 'Agent 工作流',
    tag: 'SQL assistant',
    visual: 'sql',
  },
  {
    id: 13,
    title: 'LinkRag 0.20.0：多智能体探索与实践',
    date: '2025-04-16',
    readTime: '6 分钟',
    category: 'Agent 工作流',
    tag: 'Multi-Agent',
    visual: 'multi',
  },
  {
    id: 14,
    title: '智能体工作流：LinkRag 0.20.0 有什么新内容',
    date: '2025-03-24',
    readTime: '6 分钟',
    category: '产品更新',
    tag: 'Agentic workflow',
    visual: 'workflow',
  },
  {
    id: 15,
    title: '2024 RAG 关键路线与演进：年度回顾',
    date: '2024-12-31',
    readTime: '10 分钟',
    category: '工程札记',
    tag: 'RAG review',
    visual: 'review',
  },
];

function BlogThumbnail({ article, darkMode }: { article: BlogArticle; darkMode?: boolean }) {
  return (
    <div
      className={cn(
        'relative h-[92px] w-[156px] shrink-0 overflow-hidden rounded-md border',
        darkMode ? 'border-[#1f3c42] bg-[#101718]' : 'border-border-subtle bg-white',
      )}
    >
      <div
        className={cn(
          'absolute inset-0',
          darkMode
            ? 'bg-[radial-gradient(circle_at_80%_20%,rgba(20,184,166,0.38),transparent_32%),linear-gradient(135deg,#101112,#082624_60%,#0c1115)]'
            : 'bg-[radial-gradient(circle_at_82%_12%,rgba(212,163,115,0.44),transparent_30%),linear-gradient(135deg,#fbfaf7,#e8eee9_62%,#d8eced)]',
        )}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-cyan-400/40" />
      <div className="absolute left-3 top-3 rounded-full bg-cyan-400 px-2 py-0.5 text-[8px] font-bold uppercase text-[#041315]">
        LinkRag
      </div>
      <div className="absolute bottom-3 left-3 right-3">
        <p className={cn('text-[13px] font-bold leading-tight', darkMode ? 'text-cyan-100' : 'text-text-main')}>
          {article.tag}
        </p>
      </div>
      <div className="absolute right-3 top-7 flex h-9 w-14 items-center justify-center">
        <div className="h-8 w-8 rounded-full border border-cyan-300/60" />
        <div className="absolute h-px w-14 rotate-12 bg-cyan-300/50" />
        <div className="absolute h-px w-10 -rotate-12 bg-cyan-300/30" />
      </div>
      <div className="absolute bottom-2 right-2 grid grid-cols-3 gap-1">
        {[0, 1, 2].map((item) => (
          <span key={item} className="h-1 w-1 rounded-full bg-cyan-300/70" />
        ))}
      </div>
    </div>
  );
}

export default function BlogsPage({ darkMode }: BlogsPageProps) {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [query, setQuery] = useState('');

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesCategory = activeCategory === '全部' || article.category === activeCategory;
      const matchesQuery = article.title.toLowerCase().includes(query.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  return (
    <div className={cn('min-h-screen', darkMode ? 'bg-[#151515] text-[#cccccc]' : 'bg-bg-base text-text-main')}>
      <header
        className={cn(
          'sticky top-0 z-20 border-b px-6 py-5 backdrop-blur-md lg:px-10',
          darkMode ? 'border-[#282828] bg-[#151515]/92' : 'border-border-subtle bg-bg-base/86',
        )}
      >
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-5">
          <div className="flex flex-col gap-2">
            <Breadcrumb
              items={[
                { label: '首页', path: Routes.Home },
                { label: '博客' },
              ]}
              darkMode={darkMode}
            />
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl border',
                  darkMode ? 'border-[#303030] bg-[#202020]' : 'border-border-subtle bg-white/70',
                )}
              >
                <BookOpenText size={18} className={darkMode ? 'text-cyan-300' : 'text-primary'} />
              </div>
              <div>
                <p className={cn('mono-label mb-1', darkMode ? 'text-[#858585]' : '')}>knowledge journal</p>
                <h1 className={cn('text-2xl font-bold tracking-tight', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                  博客
                </h1>
              </div>
            </div>
          </div>
          <Link
            to={Routes.Welcome}
            className={cn(
              'hidden rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] transition-colors sm:inline-flex',
              darkMode ? 'bg-[#202020] text-[#d7d7d7] hover:bg-[#2a2a2a]' : 'bg-white/70 text-text-main hover:bg-white',
            )}
          >
            返回入口
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-6 py-8 lg:px-10">
        <aside className="mb-8 lg:fixed lg:top-40 lg:w-[220px]">
          <div
            className={cn(
              'rounded-2xl border p-4',
              darkMode ? 'border-[#282828] bg-[#191919]' : 'border-border-subtle bg-white/64 backdrop-blur-sm',
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className={cn('mono-label', darkMode ? 'text-[#858585]' : '')}>分类</span>
              <ChevronDown size={14} className={darkMode ? 'text-[#858585]' : 'text-text-main/45'} />
            </div>
            <div className="space-y-1">
              {categories.map((item) => {
                const isActive = item.name === activeCategory;
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveCategory(item.name)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors',
                      isActive
                        ? darkMode
                          ? 'bg-cyan-400/12 text-cyan-200'
                          : 'bg-primary/12 text-text-main'
                        : darkMode
                          ? 'text-[#9a9a9a] hover:bg-[#242424] hover:text-[#f0f0f0]'
                          : 'text-text-main/58 hover:bg-white hover:text-text-main',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Hash size={12} />
                      {item.name}
                    </span>
                    <span className="font-mono text-[10px]">{item.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={cn(
              'mt-4 rounded-2xl border p-4',
              darkMode ? 'border-[#282828] bg-[#191919]' : 'border-border-subtle bg-white/64 backdrop-blur-sm',
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className={cn('mono-label', darkMode ? 'text-[#858585]' : '')}>归档</span>
              <CalendarDays size={14} className={darkMode ? 'text-[#858585]' : 'text-text-main/45'} />
            </div>
            <div className="space-y-2">
              {years.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <span className={darkMode ? 'text-[#d0d0d0]' : 'text-text-main/70'}>{item.name}</span>
                  <span className={cn('font-mono text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="lg:ml-[252px]">
          <div
            className={cn(
              'mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3',
              darkMode ? 'border-[#282828] bg-[#191919]' : 'border-border-subtle bg-white/64 backdrop-blur-sm',
            )}
          >
            <Search size={16} className={darkMode ? 'text-[#858585]' : 'text-text-main/45'} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索文章"
              className={cn(
                'w-full bg-transparent text-sm outline-none',
                darkMode ? 'text-[#e6e6e6] placeholder:text-[#666]' : 'text-text-main placeholder:text-text-main/35',
              )}
            />
            <Sparkles size={16} className={darkMode ? 'text-cyan-300' : 'text-primary'} />
          </div>

          <div className={cn('divide-y', darkMode ? 'divide-[#282828]' : 'divide-border-subtle')}>
            {filteredArticles.map((article) => (
              <article
                key={article.id}
                className={cn(
                  'group grid gap-5 py-6 transition-colors sm:grid-cols-[minmax(0,1fr)_156px]',
                  darkMode ? 'hover:bg-[#1b1b1b]' : 'hover:bg-white/45',
                )}
              >
                <div className="min-w-0 px-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={cn('mono-label !text-[9px]', darkMode ? 'text-[#777]' : '')}>{article.date}</span>
                    <span className={cn('h-1 w-1 rounded-full', darkMode ? 'bg-[#555]' : 'bg-text-main/25')} />
                    <span className={cn('mono-label !text-[9px]', darkMode ? 'text-[#777]' : '')}>{article.readTime}</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em]',
                        darkMode ? 'bg-[#202020] text-cyan-200' : 'bg-primary/10 text-text-main/58',
                      )}
                    >
                      {article.category}
                    </span>
                  </div>
                  <h2
                    className={cn(
                      'max-w-[560px] text-lg font-bold leading-7 transition-colors',
                      darkMode ? 'text-[#f1f1f1] group-hover:text-cyan-200' : 'text-text-main group-hover:text-primary',
                    )}
                  >
                    {article.title}
                  </h2>
                  <button
                    className={cn(
                      'mt-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] opacity-0 transition-opacity group-hover:opacity-100',
                      darkMode ? 'text-cyan-200' : 'text-primary',
                    )}
                  >
                    阅读文章
                    <ArrowRight size={13} />
                  </button>
                </div>
                <BlogThumbnail article={article} darkMode={darkMode} />
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
