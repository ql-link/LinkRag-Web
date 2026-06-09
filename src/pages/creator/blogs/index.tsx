import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Globe, Lock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { getAdminPosts, deletePost } from '@/services/blog';
import type { BlogPostAdminListDTO } from '@/types/api';

export default function CreatorBlogsPage() {
  const { darkMode } = useTheme();
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

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">文章管理</h1>
          <p className={cn("text-sm", darkMode ? 'text-[#858585]' : 'text-text-main/60')}>
            共 {posts.length} 篇文章
          </p>
        </div>

        <div className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2 w-full sm:w-64 transition-colors",
          darkMode ? 'bg-[#1e1e1e] border-[#3c3c3c] focus-within:border-[#3b82f6]' : 'bg-white border-border-subtle focus-within:border-primary'
        )}>
          <Search size={16} className={darkMode ? 'text-[#666]' : 'text-text-main/40'} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文章标题..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-50"
          />
        </div>
      </div>

      {loading && posts.length === 0 ? (
        <div className="py-20 text-center opacity-50 uppercase tracking-widest text-xs font-bold animate-pulse">
          加载中...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className={cn(
          "flex flex-col items-center justify-center py-32 rounded-2xl border border-dashed",
          darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]/50' : 'border-border-subtle bg-gray-50'
        )}>
          <p className="text-sm font-bold opacity-50 mb-4">没有找到匹配的文章</p>
          <button
            onClick={() => navigate('/creator/blogs/edit/new')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-sm hover:shadow",
              darkMode ? 'bg-[#3b82f6] hover:bg-[#2563eb]' : 'bg-primary hover:bg-primary/90'
            )}
          >
            发布新文章
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className={cn(
                'group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-5 transition-all duration-300',
                darkMode 
                  ? 'border-[#3c3c3c] bg-[#252526] hover:border-[#444] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]' 
                  : 'border-border-subtle bg-white hover:border-text-main/20 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]',
              )}
            >
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-bold text-lg mb-2 truncate">
                  {post.title}
                </h3>
                <div className="flex items-center gap-4 text-xs opacity-60">
                  <span className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider",
                    post.status === 'PUBLISHED' 
                      ? (darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700')
                      : (darkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                  )}>
                    {post.status === 'PUBLISHED' ? <Globe size={10} /> : <Lock size={10} />}
                    {post.status === 'PUBLISHED' ? '已发布' : '草稿'}
                  </span>
                  <span>{new Date(post.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-4 sm:pt-0 mt-2 sm:mt-0 opacity-100 sm:opacity-0 sm:-translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                <button
                  onClick={() => navigate(`/creator/blogs/edit/${post.id}`)}
                  className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors', darkMode ? 'bg-[#333] hover:bg-[#3b82f6] hover:text-white' : 'bg-gray-100 hover:bg-primary hover:text-white')}
                >
                  <Edit2 size={14} />
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-red-500 transition-colors bg-red-500/10 hover:bg-red-500 hover:text-white"
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
