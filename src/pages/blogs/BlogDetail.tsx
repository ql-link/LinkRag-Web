import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, ListCollapse, User, X } from 'lucide-react';
import { motion } from 'motion/react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { cn } from '@/lib/utils';
import { getPublicPostDetail } from '@/services/blog';
import type { BlogPostPublicDetailDTO } from '@/types/api';
import { Routes } from '@/routes';
import { extractMarkdownToc } from '@/lib/markdown';

function formatDate(value: string | null) {
  if (!value || isNaN(new Date(value).getTime())) return 'Unknown Date';
  return new Date(value).toLocaleDateString();
}

function ArticleMeta({ post }: { post: BlogPostPublicDetailDTO }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono tracking-widest uppercase opacity-60">
      <span className="flex items-center gap-1.5">
        <Calendar size={12} strokeWidth={2} />
        {formatDate(post.publishedAt)}
      </span>
      <span className="opacity-30">•</span>
      <span className="flex items-center gap-1.5">
        <User size={12} strokeWidth={2} />
        LinkRag Team
      </span>
      <span className="opacity-30">•</span>
      <span className="flex items-center gap-1.5">
        <Clock size={12} strokeWidth={2} />5 Min Read
      </span>
    </div>
  );
}

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<BlogPostPublicDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState('');
  const [showTocMobile, setShowTocMobile] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getPublicPostDetail(slug)
      .then((res) => {
        setPost(res);
      })
      .catch((err) => {
        console.error(err);
        setError('加载文章失败，或文章不存在');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  const toc = useMemo(() => {
    if (!post?.contentMarkdown) return [];
    return extractMarkdownToc(post.contentMarkdown);
  }, [post]);

  useEffect(() => {
    if (toc.length === 0) return;

    let observer: IntersectionObserver | null = null;
    const timeout = window.setTimeout(() => {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setActiveId(entry.target.id);
          });
        },
        { rootMargin: '-120px 0px -78% 0px' },
      );

      toc.forEach((item) => {
        const el = document.getElementById(item.id);
        if (el) observer.observe(el);
      });
    }, 100);

    return () => {
      window.clearTimeout(timeout);
      observer?.disconnect();
    };
  }, [toc, post?.contentMarkdown]);

  const handleScrollTo = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;

    const y = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: y, behavior: 'smooth' });
    setActiveId(id);
    setShowTocMobile(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base text-text-main">
        <div className="mono-label animate-pulse">Loading Article</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-base text-text-main">
        <div className="text-sm text-text-main/60">{error || '文章不存在'}</div>
        <button
          onClick={() => navigate(Routes.Blogs)}
          className="rounded-xl border border-border-subtle px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors hover:border-primary hover:bg-primary/5"
        >
          返回博客列表
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="min-h-screen bg-bg-base px-4 pb-20 text-text-main sm:px-6"
    >
      <header
        className={cn(
          'sticky top-0 z-40 mx-auto flex max-w-6xl items-center justify-between border-b border-border-subtle px-1 py-4 backdrop-blur-md sm:px-2 bg-bg-base/80',
        )}
      >
        <Link
          to={Routes.Blogs}
          className="inline-flex items-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider font-mono text-text-main/55 transition-colors hover:text-primary"
        >
          <ArrowLeft size={15} />
          返回列表
        </Link>

        <div className="mono-label hidden sm:block">LinkRag Journal</div>
      </header>

      <div
        className={cn(
          'mx-auto grid max-w-6xl gap-6 pb-20 pt-6',
          toc.length > 0
            ? 'xl:grid-cols-[260px_minmax(0,760px)_1fr]'
            : 'xl:grid-cols-[minmax(0,760px)] xl:justify-center',
        )}
      >
        {toc.length > 0 && (
          <aside className="hidden xl:block">
            <div className="sticky top-28 pr-4">
              <div className="mono-label mb-4">On this page</div>
              <nav className="flex flex-col gap-1 border-l border-border-subtle">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(event) => handleScrollTo(event, item.id)}
                    className={cn(
                      'line-clamp-2 border-l -ml-px px-4 py-1.5 text-sm leading-relaxed transition-all duration-300 font-sans',
                      item.level === 3 && 'pl-7 text-xs',
                      activeId === item.id
                        ? 'border-primary font-semibold text-primary'
                        : 'border-transparent text-text-main/50 hover:text-text-main',
                    )}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}

        <main className={cn('mx-auto w-full max-w-[760px] min-w-0', toc.length > 0 && 'xl:col-start-2 xl:mx-0')}>
          <article className="min-w-0">
            <div className="mb-10 border-b border-border-subtle pb-8">
              <div className="mono-label mb-5">Published Article</div>
              <h1 className="serif-heading mb-6 text-4xl leading-tight text-text-main sm:text-5xl">{post.title}</h1>
              {post.summary && (
                <blockquote className="relative my-8 border-l-2 border-primary pl-5 py-0.5 text-base font-serif italic text-text-main/70 leading-relaxed max-w-2xl bg-transparent">
                  {post.summary}
                </blockquote>
              )}
              <ArticleMeta post={post} />
            </div>

            <div className="min-w-0">
              {post.contentMarkdown ? (
                <MarkdownRenderer content={post.contentMarkdown} />
              ) : (
                <p className="italic text-text-main/50">此文章暂无正文内容。</p>
              )}
            </div>
          </article>
        </main>
      </div>

      {toc.length > 0 && (
        <button
          type="button"
          onClick={() => setShowTocMobile(true)}
          className="fixed bottom-6 right-6 z-30 rounded-full border border-border-subtle bg-bg-base/80 p-3.5 text-text-main shadow-lg backdrop-blur-md transition-colors hover:border-primary hover:text-primary xl:hidden"
          aria-label="打开目录"
        >
          <ListCollapse size={20} />
        </button>
      )}

      {showTocMobile && (
        <div className="fixed inset-0 z-50 flex justify-end xl:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTocMobile(false)} />
          <div
            className={cn(
              'relative flex h-full w-4/5 max-w-sm flex-col border-l border-border-subtle shadow-2xl bg-bg-base/95 backdrop-blur-md',
            )}
          >
            <div className="flex items-center justify-between border-b border-border-subtle p-5">
              <span className="mono-label">目录</span>
              <button
                type="button"
                onClick={() => setShowTocMobile(false)}
                className="rounded-xl p-2 transition-colors hover:bg-primary/5"
                aria-label="关闭目录"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-5">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(event) => handleScrollTo(event, item.id)}
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm leading-relaxed transition-colors',
                    item.level === 3 && 'pl-6 text-xs',
                    activeId === item.id
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-text-main/60 hover:bg-primary/5 hover:text-text-main',
                  )}
                >
                  {item.text}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}
    </motion.div>
  );
}
