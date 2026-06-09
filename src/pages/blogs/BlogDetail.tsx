import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { ArrowLeft, Calendar, User, Clock, ListCollapse, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { getPublicPostDetail } from '@/services/blog';
import type { BlogPostPublicDetailDTO } from '@/types/api';
import { Routes } from '@/routes';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const slugify = (text: string) => {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]+/g, '');
};

const extractToc = (markdown: string): TocItem[] => {
  const toc: TocItem[] = [];
  const lines = markdown.split('\n');
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Support h2 and h3
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      // Remove any trailing # or links in the text if present
      let text = match[2].trim().replace(/#+$/, '').trim();
      toc.push({ id: slugify(text), text, level });
    }
  }
  return toc;
};

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  
  const [post, setPost] = useState<BlogPostPublicDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeId, setActiveId] = useState<string>('');
  const [showTocMobile, setShowTocMobile] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getPublicPostDetail(slug)
      .then(res => {
        setPost(res);
      })
      .catch(err => {
        console.error(err);
        setError('加载文章失败，或文章不存在');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  const toc = useMemo(() => {
    if (!post?.contentMarkdown) return [];
    return extractToc(post.contentMarkdown);
  }, [post]);

  useEffect(() => {
    if (toc.length === 0) return;

    // Small timeout to allow DOM to render the markdown completely
    const timeout = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveId(entry.target.id);
            }
          });
        },
        // Trigger when the element crosses the top 15% of the viewport
        { rootMargin: '-100px 0px -80% 0px' }
      );

      toc.forEach((item) => {
        const el = document.getElementById(item.id);
        if (el) observer.observe(el);
      });

      return () => observer.disconnect();
    }, 100);

    return () => clearTimeout(timeout);
  }, [toc, post?.contentMarkdown]);

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      // Offset by 80px for the sticky header
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveId(id);
      setShowTocMobile(false);
    }
  };

  if (loading) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center', darkMode ? 'bg-[#151515] text-[#cccccc]' : 'bg-bg-base text-text-main')}>
        <div className="text-sm uppercase tracking-widest opacity-60 animate-pulse">Loading Article...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={cn('min-h-screen flex flex-col items-center justify-center gap-4', darkMode ? 'bg-[#151515] text-[#cccccc]' : 'bg-bg-base text-text-main')}>
        <div className="text-sm">{error || '文章不存在'}</div>
        <button onClick={() => navigate(Routes.Blogs)} className={cn('px-4 py-2 rounded-lg border text-xs font-bold uppercase transition-colors', darkMode ? 'border-[#333] hover:bg-[#222]' : 'border-border-subtle hover:bg-gray-100')}>
          返回博客列表
        </button>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen', darkMode ? 'bg-[#151515] text-[#cccccc]' : 'bg-bg-base text-text-main')}>
      {/* Header / Nav */}
      <header className={cn('sticky top-0 z-40 border-b px-6 py-3 backdrop-blur-md lg:px-10 transition-colors', darkMode ? 'border-[#282828] bg-[#151515]/90' : 'border-border-subtle bg-bg-base/86')}>
        <div className="mx-auto flex max-w-[1200px] items-center">
          <Link
            to={Routes.Blogs}
            className={cn('inline-flex items-center gap-2 rounded-lg p-2 text-xs font-bold transition-colors', darkMode ? 'hover:bg-[#282828]' : 'hover:bg-gray-100')}
          >
            <ArrowLeft size={16} />
            返回列表
          </Link>
        </div>
      </header>

      {/* Main Container - Dual Column on Large Screens */}
      <div className="mx-auto flex max-w-[1200px] px-6 lg:px-10 pb-20 relative items-start gap-8 lg:gap-16">
        
        {/* Left Column: TOC (Desktop) */}
        {toc.length > 0 && (
          <aside className="hidden xl:block w-[240px] shrink-0 sticky top-24 self-start max-h-[calc(100vh-120px)] overflow-y-auto pr-4 toc-scrollbar mt-12">
            <div>
              <h3 className={cn("text-xs font-bold uppercase tracking-widest mb-4", darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                本页目录
              </h3>
              <nav className="flex flex-col gap-1.5 border-l-2 border-black/5 dark:border-white/5 ml-1">
                {toc.map(item => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => handleScrollTo(e, item.id)}
                    className={cn(
                      "text-[13px] transition-all py-1.5 -ml-[2px] border-l-2 px-4 line-clamp-2 leading-relaxed hover:bg-black/5 dark:hover:bg-white/5 rounded-r-lg",
                      item.level === 3 ? "pl-8 text-xs" : "pl-4",
                      activeId === item.id 
                        ? (darkMode ? "border-[#3b82f6] text-[#3b82f6] font-semibold bg-white/5" : "border-primary text-primary font-semibold bg-black/5")
                        : (darkMode ? "border-transparent text-[#999999] hover:text-[#cccccc]" : "border-transparent text-text-main/60 hover:text-text-main")
                    )}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}

        {/* Right Column: Article Content */}
        <main className="flex-1 w-full max-w-[800px] pt-12 min-w-0">
          <article>
            {/* Post Header */}
            <div className="mb-10 text-center sm:text-left border-b pb-8 border-black/5 dark:border-white/5">
              <h1 className={cn('mb-6 text-3xl font-bold leading-tight md:text-4xl lg:text-5xl tracking-tight', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                {post.title}
              </h1>
              <div className={cn('flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[11px] font-bold uppercase tracking-wider', darkMode ? 'text-[#888]' : 'text-text-main/60')}>
                <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-md">
                  <Calendar size={12} />
                  <span>{post.publishedAt && !isNaN(new Date(post.publishedAt).getTime())
                    ? new Date(post.publishedAt).toLocaleDateString()
                    : 'Unknown Date'}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-md">
                  <User size={12} />
                  <span>LinkRag Team</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-md">
                  <Clock size={12} />
                  <span>5 Min Read</span>
                </div>
              </div>
            </div>

            {/* Markdown Body */}
            <div>
              {post.contentMarkdown ? (
                <MarkdownRenderer content={post.contentMarkdown} />
              ) : (
                <p className="italic opacity-60">此文章暂无正文内容。</p>
              )}
            </div>
          </article>
        </main>
      </div>

      {/* Mobile TOC Button */}
      {toc.length > 0 && (
        <button
          onClick={() => setShowTocMobile(true)}
          className={cn(
            "fixed bottom-6 right-6 xl:hidden p-3.5 rounded-full shadow-2xl z-30 transition-transform active:scale-95 border",
            darkMode ? "bg-[#252526] border-[#3c3c3c] text-white shadow-black/50" : "bg-white border-border-subtle text-text-main shadow-black/10"
          )}
        >
          <ListCollapse size={20} />
        </button>
      )}

      {/* Mobile TOC Drawer */}
      {showTocMobile && (
        <div className="fixed inset-0 z-50 flex justify-end xl:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in" 
            onClick={() => setShowTocMobile(false)} 
          />
          {/* Drawer */}
          <div className={cn(
            "relative w-4/5 max-w-sm h-full shadow-2xl flex flex-col animate-in slide-in-from-right",
            darkMode ? "bg-[#1e1e1e]" : "bg-white"
          )}>
            <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5">
              <span className="font-bold text-lg">目录</span>
              <button onClick={() => setShowTocMobile(false)} className={cn("p-1.5 rounded-md transition-colors", darkMode ? 'hover:bg-[#333]' : 'hover:bg-gray-100')}>
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
               <nav className="flex flex-col gap-1.5 border-l-2 border-black/5 dark:border-white/5 ml-1">
                {toc.map(item => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => handleScrollTo(e, item.id)}
                    className={cn(
                      "text-[15px] transition-all py-2 -ml-[2px] border-l-2 px-4 line-clamp-2 leading-relaxed active:bg-black/5 dark:active:bg-white/5 rounded-r-lg",
                      item.level === 3 ? "pl-8 text-sm" : "pl-4",
                      activeId === item.id 
                        ? (darkMode ? "border-[#3b82f6] text-[#3b82f6] font-semibold bg-white/5" : "border-primary text-primary font-semibold bg-black/5")
                        : (darkMode ? "border-transparent text-[#999999]" : "border-transparent text-text-main/60")
                    )}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
