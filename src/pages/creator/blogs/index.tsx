import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Globe, Lock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAdminPosts, deletePost } from '@/services/blog';
import type { BlogPostAdminListDTO } from '@/types/api';

export default function CreatorBlogsPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPostAdminListDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await getAdminPosts(1, 100);
      setPosts(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要彻底删除这篇文章吗？操作不可撤销。')) return;
    try {
      setLoading(true);
      await deletePost(id);
      await fetchPosts();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter((post) => post.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex h-full flex-col">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mono-label mb-2">Article Management</div>
          <h1 className="serif-heading mb-1 text-3xl text-text-main">文章管理</h1>
          <p className="text-sm text-text-main/55">共 {posts.length} 篇文章</p>
        </div>

        <div className="flex w-full items-center gap-2 border-b border-border-subtle px-0 py-2 transition-colors focus-within:border-primary sm:w-64">
          <Search size={16} className="text-text-main/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文章标题..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-main/40"
          />
        </div>
      </div>

      {loading && posts.length === 0 ? (
        <div className="py-20 text-center opacity-50 uppercase tracking-widest text-xs font-bold animate-pulse">
          加载中...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-y border-dashed border-border-subtle py-32">
          <p className="mb-4 text-sm font-bold text-text-main/45">没有找到匹配的文章</p>
          <button
            onClick={() => navigate('/creator/blogs/edit/new')}
            className="rounded-xl border border-border-subtle px-5 py-2 text-xs font-bold uppercase tracking-wider text-text-main/70 transition-colors hover:border-primary hover:bg-primary/5 hover:text-text-main"
          >
            发布新文章
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="group flex flex-col justify-between gap-4 rounded-3xl border border-border-subtle bg-transparent p-5 transition-all duration-300 hover:border-primary hover:bg-primary/5 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1 pr-4">
                <h3 className="mb-2 truncate text-lg font-semibold text-text-main">{post.title}</h3>
                <div className="flex items-center gap-4 text-xs text-text-main/55">
                  <span
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                      post.status === 'PUBLISHED'
                        ? 'border-green-500/20 text-green-600 dark:text-green-400'
                        : 'border-yellow-500/25 text-yellow-700 dark:text-yellow-400',
                    )}
                  >
                    {post.status === 'PUBLISHED' ? <Globe size={10} /> : <Lock size={10} />}
                    {post.status === 'PUBLISHED' ? '已发布' : '草稿'}
                  </span>
                  <span>{new Date(post.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-2 flex shrink-0 items-center gap-2 border-t border-border-subtle pt-4 opacity-100 transition-all duration-300 sm:mt-0 sm:border-t-0 sm:pt-0 sm:opacity-0 sm:group-hover:opacity-100">
                <button
                  onClick={() => navigate(`/creator/blogs/edit/${post.id}`)}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-text-main/65 transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <Edit2 size={14} />
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-500 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 size={14} />
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
