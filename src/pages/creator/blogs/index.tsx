import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarClock, Edit2, FileText, Globe, Loader2, Lock, Plus, Search, Trash2 } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { deletePost, getAdminPosts } from '@/services/blog';
import type { BlogPostAdminListDTO } from '@/types/api';

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('zh-CN');
}

function statusMeta(status: BlogPostAdminListDTO['status']) {
  if (status === 'PUBLISHED') {
    return { label: '已发布', icon: Globe };
  }
  return { label: '草稿', icon: Lock };
}

export default function CreatorBlogsPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [posts, setPosts] = useState<BlogPostAdminListDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const routePrefix = pathname.startsWith('/admin') ? '/admin/blogs' : '/creator/blogs';

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminPosts(1, 100);
      setPosts(res.items || []);
    } catch (error) {
      console.error(error);
      addToast('error', '文章列表加载失败');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const filteredPosts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return posts;
    }
    return posts.filter((post) => {
      return (
        post.title.toLowerCase().includes(keyword) ||
        post.slug.toLowerCase().includes(keyword) ||
        Boolean(post.summary?.toLowerCase().includes(keyword))
      );
    });
  }, [posts, query]);

  const handleDelete = async (post: BlogPostAdminListDTO) => {
    if (deletingId !== null) {
      return;
    }
    if (!window.confirm(`确定要彻底删除「${post.title}」吗？操作不可撤销。`)) {
      return;
    }

    setDeletingId(post.id);
    try {
      await deletePost(post.id);
      setPosts((prev) => prev.filter((item) => item.id !== post.id));
      addToast('success', '文章已删除');
    } catch (error) {
      console.error(error);
      addToast('error', '文章删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={cn('flex h-full min-h-0 flex-col', darkMode ? 'text-[#cccccc]' : 'text-text-main')}>
      <header
        className={cn(
          'flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-3 sm:px-8',
          darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
        )}
      >
        <div className="min-w-0">
          <Breadcrumb
            items={[{ label: '个人信息', path: Routes.ProfilePage }, { label: '后台管理' }, { label: '博客管理' }]}
            darkMode={darkMode}
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div
            className={cn(
              'flex h-9 w-[min(320px,calc(100vw-120px))] items-center gap-2 rounded-lg border px-3 transition-colors sm:w-72',
              darkMode
                ? 'border-[#3c3c3c] bg-[#252526] focus-within:border-primary/50'
                : 'border-border-subtle bg-white focus-within:border-primary/50',
            )}
          >
            <Search size={15} className={darkMode ? 'text-[#858585]' : 'text-text-main/40'} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题、Slug 或摘要..."
              className={cn(
                'min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-main/35',
                darkMode ? 'text-[#e0e0e0] placeholder:text-[#6b6b6b]' : 'text-text-main',
              )}
            />
          </div>
          <button
            type="button"
            onClick={() => navigate(`${routePrefix}/edit/new`)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold text-white transition-colors',
              darkMode ? 'bg-[#094771] hover:bg-[#0d5b8f]' : 'bg-[#7B6B5D] hover:opacity-90',
            )}
          >
            <Plus size={15} />
            写文章
          </button>
        </div>
      </header>

      <main className={cn('min-h-0 flex-1 overflow-y-auto', darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base')}>
        <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className={cn('mono-label mb-2', darkMode && 'text-[#858585]')}>Article Management</div>
            <h1
              className={cn(
                'text-[24px] font-semibold leading-tight sm:text-[27px]',
                darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
              )}
            >
              文章管理
            </h1>
            <p className={cn('mt-1 text-[13px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
              共 {posts.length} 篇文章，管理草稿与已发布内容。
            </p>
          </div>

          {loading && posts.length === 0 ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <Loader2 className={cn('animate-spin', darkMode ? 'text-[#858585]' : 'text-text-main/40')} size={24} />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div
              className={cn(
                'flex min-h-[280px] flex-col items-center justify-center border-y border-dashed px-4 py-16 text-center',
                darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
              )}
            >
              <FileText size={30} className={cn('mb-4', darkMode ? 'text-[#858585]' : 'text-text-main/35')} />
              <p className={cn('text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                {query.trim() ? '没有找到匹配的文章' : '还没有文章'}
              </p>
              <button
                type="button"
                onClick={() => navigate(`${routePrefix}/edit/new`)}
                className={cn(
                  'mt-5 rounded-xl border px-5 py-2 text-xs font-bold transition-colors',
                  darkMode
                    ? 'border-[#3c3c3c] text-[#cccccc] hover:bg-[#2d2d2d]'
                    : 'border-border-subtle text-text-main/70 hover:border-primary hover:bg-primary/5 hover:text-text-main',
                )}
              >
                发布新文章
              </button>
            </div>
          ) : (
            <div
              className={cn(
                'overflow-hidden rounded-2xl border',
                darkMode ? 'border-[#3c3c3c] bg-[#252526]/62' : 'border-border-subtle bg-white/55',
              )}
            >
              {filteredPosts.map((post) => (
                <BlogPostRow
                  key={post.id}
                  post={post}
                  darkMode={darkMode}
                  deleting={deletingId === post.id}
                  onEdit={() => navigate(`${routePrefix}/edit/${post.id}`)}
                  onDelete={() => void handleDelete(post)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function BlogPostRow({
  post,
  darkMode,
  deleting,
  onEdit,
  onDelete,
}: {
  post: BlogPostAdminListDTO;
  darkMode: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const StatusIcon = statusMeta(post.status).icon;

  return (
    <article
      className={cn(
        'group flex flex-col gap-4 border-b px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-5',
        darkMode ? 'border-[#3c3c3c]/70 hover:bg-[#2d2d2d]/55' : 'border-border-subtle/70 hover:bg-white/70',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold',
              post.status === 'PUBLISHED'
                ? darkMode
                  ? 'border-green-500/30 text-green-400'
                  : 'border-green-500/20 text-green-700'
                : darkMode
                  ? 'border-yellow-500/30 text-yellow-300'
                  : 'border-yellow-500/25 text-yellow-700',
            )}
          >
            <StatusIcon size={10} />
            {statusMeta(post.status).label}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-[11px]',
              darkMode ? 'text-[#858585]' : 'text-text-main/45',
            )}
          >
            <CalendarClock size={12} />
            {formatDate(post.updatedAt)}
          </span>
        </div>

        <h2 className={cn('truncate text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
          {post.title}
        </h2>
        <p
          className={cn(
            'mt-1 truncate font-mono text-[11px] tracking-wide',
            darkMode ? 'text-[#858585]' : 'text-text-main/45',
          )}
        >
          /{post.slug}
        </p>
        {post.summary && (
          <p className={cn('mt-2 line-clamp-2 text-xs leading-5', darkMode ? 'text-[#a8a8a8]' : 'text-text-main/55')}>
            {post.summary}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold transition-colors',
            darkMode ? 'text-[#cccccc] hover:bg-[#252526]' : 'text-text-main/65 hover:bg-bg-base hover:text-text-main',
          )}
        >
          <Edit2 size={14} />
          编辑
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-60"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          删除
        </button>
      </div>
    </article>
  );
}
