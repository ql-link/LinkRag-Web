import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpenText, Search, Settings } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { useTheme } from '@/contexts/ThemeContext';
import { getPublicPosts } from '@/services/blog';
import { isLoggedIn } from '@/services/auth';
import { getProfile } from '@/services/user';
import type { BlogPostPublicListDTO } from '@/types/api';

function formatDate(value: string | null) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Unknown Date';
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function BlogThumbnail({ article, darkMode }: { article: BlogPostPublicListDTO; darkMode: boolean }) {
  if (article.coverPublicUrl) {
    return (
      <div
        className={cn(
          'relative h-[160px] w-full shrink-0 overflow-hidden rounded-xl border transition-all duration-700 ease-out group-hover:scale-[1.015] sm:w-[240px]',
          darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
        )}
      >
        <img src={article.coverPublicUrl} alt={article.title} className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  }

  // 极简高端几何图形占位：完美契合 ToLink/LinkRag 知识图谱主题
  return (
    <div
      className={cn(
        'relative h-[160px] w-full shrink-0 overflow-hidden rounded-xl border transition-all duration-500 sm:w-[240px] flex items-center justify-center select-none',
        darkMode ? 'border-[#3c3c3c] bg-[#222223]' : 'border-border-subtle bg-bg-base/40',
      )}
      style={{
        backgroundImage: darkMode
          ? 'radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)'
          : 'radial-gradient(rgba(26, 26, 26, 0.04) 1px, transparent 1px)',
        backgroundSize: '12px 12px',
      }}
    >
      {/* 极简发光装饰 */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none" />

      {/* 几何知识节点 SVG */}
      <svg
        width="80"
        height="80"
        viewBox="0 0 100 100"
        fill="none"
        className="opacity-45 dark:opacity-35 transition-transform duration-700 group-hover:scale-110"
      >
        {/* 连接虚线 */}
        <line
          x1="30"
          y1="70"
          x2="50"
          y2="30"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 3"
          className={darkMode ? 'text-[#444]' : 'text-text-main/20'}
        />
        <line
          x1="50"
          y1="30"
          x2="70"
          y2="60"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 3"
          className={darkMode ? 'text-[#444]' : 'text-text-main/20'}
        />
        <line
          x1="30"
          y1="70"
          x2="70"
          y2="60"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 3"
          className={darkMode ? 'text-[#444]' : 'text-text-main/20'}
        />

        {/* 节点圆形 */}
        <circle
          cx="30"
          cy="70"
          r="4"
          className={darkMode ? 'fill-[#333] stroke-[#555]' : 'fill-white stroke-text-main/20'}
          strokeWidth="1"
        />
        <circle
          cx="70"
          cy="60"
          r="5"
          className={darkMode ? 'fill-[#333] stroke-[#555]' : 'fill-white stroke-text-main/20'}
          strokeWidth="1"
        />

        {/* 主激活节点 */}
        <circle cx="50" cy="30" r="8" className="fill-primary/10 stroke-primary/30" strokeWidth="1" />
        <circle cx="50" cy="30" r="3" className="fill-primary" />
        <circle cx="50" cy="30" r="12" className="stroke-primary/20 animate-pulse" strokeWidth="0.5" />
      </svg>

      {/* 左上角 mono label */}
      <div className="absolute left-3 top-3 pointer-events-none">
        <span className="font-mono text-[8px] uppercase tracking-widest text-text-main/30 dark:text-text-main/40 font-medium">
          JOURNAL // POST {article.id}
        </span>
      </div>

      {/* 底部细线条点缀 */}
      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center opacity-30">
        <div className="h-[2px] w-8 rounded-full bg-primary" />
        <span className="font-mono text-[8px] tracking-widest">TOLINK ENGINE</span>
      </div>
    </div>
  );
}

export default function BlogsPage() {
  const { darkMode } = useTheme();
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<BlogPostPublicListDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (isLoggedIn()) {
      getProfile()
        .then((user) => {
          if (isMounted && user?.role === 'ADMIN') setIsAdmin(true);
        })
        .catch(() => {});
    }

    setLoading(true);
    getPublicPosts(1, 100)
      .then((res) => {
        if (isMounted) setPosts(res?.items || []);
      })
      .catch((err) => {
        console.error('Failed to fetch posts', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredArticles = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return posts.filter((article) => {
      if (!keyword) return true;

      return article.title.toLowerCase().includes(keyword) || Boolean(article.summary?.toLowerCase().includes(keyword));
    });
  }, [posts, query]);

  return (
    <div className="flex h-full flex-col">
      <header
        className={cn(
          'flex h-16 shrink-0 items-center justify-between px-4 sm:h-20 sm:px-8 border-b bg-transparent',
          darkMode ? 'border-border-subtle' : 'border-border-subtle/40',
        )}
      >
        <div className="flex flex-col gap-1">
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '博客' }]} darkMode={darkMode} />
          <h2
            className={cn(
              'flex items-center gap-2 text-xl font-semibold tracking-tight',
              darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
            )}
          >
            <BookOpenText size={20} className={darkMode ? 'text-[#3b82f6]' : 'text-primary'} />
            博客与更新
          </h2>
        </div>

        {isAdmin && (
          <Link
            to={Routes.AdminBlogs}
            className={cn(
              'group flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-300',
              darkMode
                ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#e0e0e0] hover:border-[#3b82f6]'
                : 'rounded-md border-border-subtle bg-surface-soft text-text-main hover:border-primary hover:bg-surface-card',
            )}
          >
            <Settings
              size={14}
              className={cn(
                darkMode ? 'text-[#858585] group-hover:text-[#3b82f6]' : 'text-text-main/50 group-hover:text-primary',
              )}
            />
            创作者中心
          </Link>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-8 sm:px-8 sm:pb-12 sm:pt-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h1
              className={cn(
                'mb-4 text-3xl font-bold tracking-tight sm:text-4xl serif-heading not-italic',
                darkMode ? 'text-[#f2f2f2]' : 'text-text-main',
              )}
            >
              探索知识库与工程实践
            </h1>
            <p className="mb-8 text-sm opacity-60 font-serif italic">
              —— 阅读关于产品更新、RAG 实践与 Agent 工作流的最新文章
            </p>

            <div className="mx-auto max-w-2xl">
              <label
                className={cn(
                  'flex items-center gap-3 rounded-full border px-6 py-3.5 transition-all duration-300',
                  darkMode
                    ? 'border-border-subtle bg-surface-card focus-within:border-primary focus-within:bg-surface-card'
                    : 'border-border-subtle bg-surface-card focus-within:border-primary focus-within:bg-white focus-within:',
                )}
              >
                <Search size={18} className={darkMode ? 'text-[#666]' : 'text-text-main/40'} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索文章标题或摘要..."
                  className={cn(
                    'min-w-0 flex-1 bg-transparent text-sm outline-none',
                    darkMode
                      ? 'text-[#e6e6e6] placeholder:text-[#666]'
                      : 'text-text-main placeholder:text-text-main/40',
                  )}
                />
              </label>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-pulse text-xs uppercase tracking-widest opacity-50">Loading posts...</div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
              <BookOpenText size={48} className="mb-4 opacity-20" />
              <p className="text-sm">没有找到相关的文章</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle/40 dark:divide-border-subtle/20">
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  to={`/blogs/${article.slug}`}
                  className="group flex flex-col gap-6 py-8 first:pt-4 last:pb-4 transition-all duration-300 sm:flex-row"
                >
                  <BlogThumbnail article={article} darkMode={darkMode} />

                  <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
                    <div className="mono-label mb-2.5">{formatDate(article.publishedAt)}</div>

                    <h2
                      className={cn(
                        'mb-2 line-clamp-2 text-xl leading-tight transition-colors serif-heading not-italic font-bold',
                        darkMode
                          ? 'text-[#e0e0e0] group-hover:text-primary'
                          : 'text-text-main group-hover:text-primary',
                      )}
                    >
                      {article.title}
                    </h2>

                    <p className="mb-4 line-clamp-2 text-sm leading-relaxed opacity-60">
                      {article.summary || '暂无摘要'}
                    </p>

                    <div
                      className={cn(
                        'mt-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 font-mono text-primary',
                      )}
                    >
                      <span className="relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-bottom-right after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 group-hover:after:origin-bottom-left group-hover:after:scale-x-100">
                        READ ARTICLE
                      </span>
                      <ArrowRight
                        size={12}
                        className="opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
