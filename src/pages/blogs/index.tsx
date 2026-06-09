import { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpenText, Search, Settings } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { useTheme } from '@/contexts/ThemeContext';
import { getPublicPosts } from '@/services/blog';
import { getProfile } from '@/services/user';
import type { BlogPostPublicListDTO } from '@/types/api';

function getGradientStyle(id: number, darkMode: boolean) {
  // Use a pseudo-random distribution based on id to generate unique vibrant colors
  const hue1 = (id * 137.5) % 360;
  const hue2 = (id * 73.2 + 60) % 360;
  
  if (darkMode) {
    return {
      background: `linear-gradient(135deg, hsl(${hue1}, 70%, 15%), hsl(${hue2}, 60%, 12%))`,
      color: `hsl(${hue1}, 80%, 75%)`,
      borderColor: `hsl(${hue1}, 50%, 25%)`
    };
  }
  return {
    background: `linear-gradient(135deg, hsl(${hue1}, 85%, 94%), hsl(${hue2}, 80%, 96%))`,
    color: `hsl(${hue1}, 80%, 35%)`,
    borderColor: `hsl(${hue1}, 60%, 85%)`
  };
}

function BlogThumbnail({ article, darkMode }: { article: BlogPostPublicListDTO; darkMode?: boolean }) {
  const style = getGradientStyle(article.id, !!darkMode);

  if (article.coverPublicUrl) {
    return (
      <div
        className={cn(
          'relative h-[160px] w-full sm:h-[160px] sm:w-[240px] shrink-0 overflow-hidden rounded-xl border transition-all duration-700 ease-out group-hover:scale-[1.02]',
          darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
        )}
      >
        <img
          src={article.coverPublicUrl}
          alt={article.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative h-[160px] w-full sm:h-[160px] sm:w-[240px] shrink-0 overflow-hidden rounded-xl border transition-all duration-700 ease-out group-hover:scale-[1.02]',
        darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
      )}
      style={{ background: style.background, borderColor: style.borderColor }}
    >
      {/* Decorative gradient overlay */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-60"
        style={{
          background: `radial-gradient(circle at 80% 20%, white 0%, transparent 60%)`
        }}
      />

      {/* Top subtle border highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/30" />

      {/* Label */}
      <div
        className="absolute left-4 top-4 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-white/20 backdrop-blur-md shadow-sm border border-white/20"
        style={{ color: style.color }}
      >
        Article
      </div>

      {/* Geometric Accents */}
      <div className="absolute right-[-10%] bottom-[-20%] w-32 h-32 rounded-full border border-white/20 opacity-40 mix-blend-overlay transition-transform duration-700 group-hover:scale-110" />
      <div className="absolute right-12 bottom-6 w-16 h-16 rounded-full border border-white/20 opacity-30 mix-blend-overlay transition-transform duration-700 group-hover:scale-125" />

      <div className="absolute bottom-3 left-4 right-4">
        <div className="h-1 w-8 rounded-full bg-white/30 mb-1.5" />
        <div className="h-1 w-16 rounded-full bg-white/20" />
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
    
    // Check if user is ADMIN
    getProfile()
      .then((user) => {
        if (isMounted && user && user.role === 'ADMIN') {
          setIsAdmin(true);
        }
      })
      .catch(() => {});

    // Fetch public posts
    setLoading(true);
    getPublicPosts(1, 100)
      .then((res) => {
        if (isMounted) {
          setPosts(res?.items || []);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch posts', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
      
    return () => { isMounted = false; };
  }, []);

  const filteredArticles = useMemo(() => {
    return posts.filter((article) => {
      return article.title.toLowerCase().includes(query.trim().toLowerCase()) || 
             (article.summary && article.summary.toLowerCase().includes(query.trim().toLowerCase()));
    });
  }, [posts, query]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header
        className={cn(
          'h-16 px-4 sm:h-20 sm:px-8 flex items-center justify-between shrink-0 backdrop-blur-md border rounded-2xl sm:rounded-3xl',
          darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle',
        )}
      >
        <div className="flex flex-col gap-1">
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '博客' }]} darkMode={darkMode} />
          <h2 className={cn('text-xl font-semibold tracking-tight flex items-center gap-2', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
            <BookOpenText size={20} className={darkMode ? 'text-[#3b82f6]' : 'text-primary'} />
            博客与更新
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              to="/creator/blogs"
              className={cn(
                'group flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-300',
                darkMode
                  ? 'bg-[#2d2d2d] border-[#3c3c3c] hover:border-[#3b82f6] text-[#e0e0e0]'
                  : 'bg-white border-border-subtle hover:border-primary text-text-main',
              )}
            >
              <Settings size={14} className={darkMode ? 'text-[#858585] group-hover:text-[#3b82f6]' : 'text-text-main/50 group-hover:text-primary'} />
              创作者中心
            </Link>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-8 sm:px-8 sm:pb-12 sm:pt-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Hero & Search */}
          <div className="mb-12 text-center">
            <h1 className={cn('text-3xl sm:text-4xl font-bold tracking-tight mb-4', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
              探索知识库与工程实践
            </h1>
            <p className={cn('text-sm mb-8', darkMode ? 'text-[#858585]' : 'text-text-main/60')}>
              阅读关于产品更新、RAG 实践与 Agent 工作流的最新文章。
            </p>
            
            <div className="max-w-2xl mx-auto">
              <div
                className={cn(
                  'flex items-center gap-3 rounded-2xl border px-5 py-4 transition-all duration-300 focus-within:shadow-lg',
                  darkMode 
                    ? 'bg-[#2d2d2d] border-[#3c3c3c] focus-within:border-[#3b82f6]' 
                    : 'bg-white border-border-subtle focus-within:border-primary'
                )}
              >
                <Search size={18} className={darkMode ? 'text-[#666]' : 'text-text-main/40'} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索文章标题或摘要..."
                  className={cn(
                    'flex-1 bg-transparent text-sm outline-none',
                    darkMode ? 'text-[#e6e6e6] placeholder:text-[#666]' : 'text-text-main placeholder:text-text-main/40'
                  )}
                />
              </div>
            </div>
          </div>

          {/* Article List */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="text-xs uppercase tracking-widest opacity-50 animate-pulse">Loading posts...</div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
              <BookOpenText size={48} className="mb-4 opacity-20" />
              <p className="text-sm">没有找到相关的文章</p>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  to={`/blogs/${article.slug}`}
                  className={cn(
                    'group flex flex-col sm:flex-row gap-6 p-4 sm:p-5 rounded-2xl border transition-all duration-300',
                    darkMode
                      ? 'bg-[#2d2d2d] border-[#3c3c3c] hover:border-[#3b82f6]'
                      : 'bg-white border-border-subtle hover:border-primary hover:shadow-lg'
                  )}
                >
                  <BlogThumbnail article={article} darkMode={darkMode} />
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                    <div className={cn('mono-label mb-3', darkMode ? 'text-[#858585]' : '')}>
                      {article.publishedAt && !isNaN(new Date(article.publishedAt).getTime())
                        ? new Date(article.publishedAt).toLocaleDateString()
                        : 'Unknown Date'}
                    </div>
                    
                    <h2 className={cn(
                      'text-xl font-bold mb-3 leading-tight transition-colors line-clamp-2',
                      darkMode ? 'text-[#e0e0e0] group-hover:text-[#3b82f6]' : 'text-text-main group-hover:text-primary'
                    )}>
                      {article.title}
                    </h2>
                    
                    <p className={cn(
                      'text-sm leading-relaxed line-clamp-2 mb-4',
                      darkMode ? 'text-[#999]' : 'text-text-main/60'
                    )}>
                      {article.summary || '暂无摘要'}
                    </p>
                    
                    <div className={cn(
                      'mt-auto flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0',
                      darkMode ? 'text-[#3b82f6]' : 'text-primary'
                    )}>
                      阅读文章 <ArrowRight size={14} />
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
