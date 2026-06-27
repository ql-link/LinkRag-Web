import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarClock, Edit2, Eye, FileText, Globe, Loader2, Lock, Plus, Search, Trash2 } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { deletePost, getAdminPosts, getAssets } from '@/services/blog';
import type { BlogAssetDTO, BlogPostAdminListDTO } from '@/types/api';

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

async function hydrateAdminPostCovers(posts: BlogPostAdminListDTO[]) {
  const postsNeedingCover = posts.filter((post) => post.coverAssetId && !post.coverPublicUrl);
  if (postsNeedingCover.length === 0) return posts;

  const coverUrlByPostId = new Map<number, string>();
  const results = await Promise.allSettled(
    postsNeedingCover.map(async (post) => {
      const assets = await getAssets(post.id);
      const coverAsset =
        assets.find((asset: BlogAssetDTO) => asset.id === post.coverAssetId) ??
        assets.find((asset: BlogAssetDTO) => asset.assetType === 'COVER');
      if (coverAsset?.publicUrl) {
        coverUrlByPostId.set(post.id, coverAsset.publicUrl);
      }
    }),
  );

  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.warn('Failed to hydrate blog cover asset:', result.reason);
    }
  });

  return posts.map((post) => {
    const coverPublicUrl = coverUrlByPostId.get(post.id);
    return coverPublicUrl ? { ...post, coverPublicUrl } : post;
  });
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
      const items = res.items || [];
      setPosts(await hydrateAdminPostCovers(items));
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
    <div className={cn('flex h-full min-h-0 flex-col', darkMode ? 'text-[#d6d6d6]' : 'text-text-main')}>
      <header
        className={cn(
          'flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-3 sm:px-8',
          darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle',
        )}
      >
        <div className="min-w-0">
          <Breadcrumb
            items={[{ label: '个人信息', path: Routes.ProfilePage }, { label: '后台管理' }, { label: '博客管理' }]}
            darkMode={darkMode}
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`${routePrefix}/edit/new`)}
            className={cn(
              // 博客编辑器为桌面专用页面，移动端隐藏入口避免点击后被重定向回首页
              'hidden h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold text-white transition-colors lg:inline-flex',
              darkMode ? 'bg-primary hover:bg-primary-active' : 'bg-primary hover:opacity-90',
            )}
          >
            <Plus size={15} />
            写文章
          </button>
        </div>
      </header>

      <main className={cn('min-h-0 flex-1 overflow-y-auto', darkMode ? 'bg-[#1f1f1f]' : 'bg-bg-base')}>
        <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-5">
            <div className={cn('mono-label mb-2', darkMode && 'text-[#a6a6a6]')}>Article Management</div>
            <h1
              className={cn(
                'text-[24px] font-semibold leading-tight sm:text-[27px]',
                darkMode ? 'text-[#f2f2f2]' : 'text-text-main',
              )}
            >
              文章管理
            </h1>
            <p className={cn('mt-1 text-[13px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/50')}>
              共 {posts.length} 篇文章，管理草稿与已发布内容。
            </p>
          </div>

          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              className={cn(
                'flex h-10 w-full items-center gap-2 rounded-lg border px-3 transition-colors sm:max-w-md',
                darkMode
                  ? 'border-[#3a3a3a] bg-[#242424] focus-within:border-primary/45'
                  : 'border-border-subtle bg-white focus-within:border-primary/45',
              )}
            >
              <Search size={15} className={darkMode ? 'text-[#a6a6a6]' : 'text-text-main/40'} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标题、Slug 或摘要"
                className={cn(
                  'min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-main/35',
                  darkMode ? 'text-[#f2f2f2] placeholder:text-muted-soft' : 'text-text-main',
                )}
              />
            </div>
            <p className={cn('text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>
              显示 {filteredPosts.length} / {posts.length}
            </p>
          </div>

          {loading && posts.length === 0 ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <Loader2 className={cn('animate-spin', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/40')} size={24} />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div
              className={cn(
                'flex min-h-[280px] flex-col items-center justify-center border-y border-dashed px-4 py-16 text-center',
                darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle',
              )}
            >
              <FileText size={30} className={cn('mb-4', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/35')} />
              <p className={cn('text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                {query.trim() ? '没有找到匹配的文章' : '还没有文章'}
              </p>
              <button
                type="button"
                onClick={() => navigate(`${routePrefix}/edit/new`)}
                className={cn(
                  'mt-5 rounded-xl border px-5 py-2 text-xs font-bold transition-colors',
                  darkMode
                    ? 'border-[#3a3a3a] text-[#d6d6d6] hover:bg-[#303030]'
                    : 'border-border-subtle text-text-main/70 hover:border-primary hover:bg-primary/5 hover:text-text-main',
                )}
              >
                发布新文章
              </button>
            </div>
          ) : (
            <div className={cn('border-y', darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle')}>
              {filteredPosts.map((post) => (
                <BlogPostRow
                  key={post.id}
                  post={post}
                  darkMode={darkMode}
                  deleting={deletingId === post.id}
                  onRead={() => navigate(`/blogs/${post.slug}`)}
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
  onRead,
  onEdit,
  onDelete,
}: {
  post: BlogPostAdminListDTO;
  darkMode: boolean;
  deleting: boolean;
  onRead: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const StatusIcon = statusMeta(post.status).icon;

  return (
    <article
      className={cn(
        'group flex flex-col gap-4 border-b py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between',
        darkMode ? 'border-[#3a3a3a]/70 hover:bg-white/[0.035]' : 'border-border-subtle/70 hover:bg-ink/[0.025]',
      )}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <div
          className={cn(
            'relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border',
            darkMode ? 'border-[#3a3a3a] bg-[#242424]' : 'border-border-subtle bg-bg-card-solid',
          )}
        >
          {post.coverPublicUrl ? (
            <img src={post.coverPublicUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <FileText size={20} className={darkMode ? 'text-[#a6a6a6]' : 'text-muted'} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-[10px] font-bold',
                post.status === 'PUBLISHED' ? 'text-success' : darkMode ? 'text-yellow-300' : 'text-yellow-700',
              )}
            >
              <StatusIcon size={10} />
              {statusMeta(post.status).label}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-[11px]',
                darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45',
              )}
            >
              <CalendarClock size={12} />
              {formatDate(post.updatedAt)}
            </span>
          </div>

          <h2 className={cn('truncate text-base font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
            {post.title}
          </h2>
          <p
            className={cn(
              'mt-1 truncate font-mono text-[11px] tracking-wide',
              darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45',
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
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onRead}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors',
            darkMode
              ? 'text-[#d6d6d6] hover:bg-white/[0.045]'
              : 'text-text-main/65 hover:bg-ink/[0.035] hover:text-text-main',
          )}
        >
          <Eye size={14} />
          阅读
        </button>
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors',
            darkMode
              ? 'text-[#d6d6d6] hover:bg-white/[0.045]'
              : 'text-text-main/65 hover:bg-ink/[0.035] hover:text-text-main',
          )}
        >
          <Edit2 size={14} />
          编辑
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold text-error transition-colors hover:bg-error/10 disabled:opacity-60"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          删除
        </button>
      </div>
    </article>
  );
}
