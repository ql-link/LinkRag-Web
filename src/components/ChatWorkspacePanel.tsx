import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatWorkspaceSnapshot } from '@/contexts/chatWorkspace';

/**
 * 「最近对话」列表，嵌入全局 Sidebar，仅在对话页显示。
 * 数据与回调来自 ChatsPage 发布的快照；快照为 null 时按加载中渲染。
 * 风格对齐 ChatGPT：轻量操作入口 + 标题列表，无标签页 / 搜索。
 */
export function ChatWorkspacePanel({
  snapshot,
  onNavigate,
}: {
  snapshot: ChatWorkspaceSnapshot | null;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const conversations = useMemo(() => {
    const items = snapshot?.conversations ?? [];
    return [...items].sort((a, b) => new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime());
  }, [snapshot?.conversations]);

  const goToConversation = (id: number) => {
    navigate(`/chats/${id}`);
    onNavigate?.();
  };

  const beginNewConversation = () => {
    snapshot?.onBeginNewConversation();
    onNavigate?.();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="group flex min-w-0 items-center gap-1.5 text-text-secondary transition-colors hover:text-ink"
          aria-expanded={!collapsed}
        >
          <span className="truncate text-sm font-semibold">最近对话</span>
          <ChevronDown
            size={14}
            className={cn('shrink-0 text-muted transition-transform', collapsed && '-rotate-90')}
          />
        </button>
        <button
          type="button"
          onClick={beginNewConversation}
          disabled={!snapshot}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/8 px-2.5 text-xs font-semibold text-primary transition-colors hover:border-primary/35 hover:bg-primary/12 hover:text-primary-active disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="新建对话"
          title="新建对话"
        >
          <Plus size={14} />
          <span>新建</span>
        </button>
      </div>
      {collapsed ? null : !snapshot || snapshot.loadingConversations ? (
        <div className="flex h-20 items-center justify-center text-muted">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-soft">暂无历史对话</p>
      ) : (
        <div className="popover-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {conversations.map((item) => {
            const active = snapshot.activeConversationId === item.id;
            return (
              <div key={item.id} className="group relative">
                <button
                  type="button"
                  onClick={() => goToConversation(item.id)}
                  className={cn(
                    'w-full truncate rounded-lg px-3 py-2 pr-8 text-left text-sm transition-colors',
                    active ? 'bg-primary/10 text-ink' : 'text-text-secondary hover:bg-primary/5 hover:text-ink',
                  )}
                >
                  {(item.title ?? '新对话').trim() || '新对话'}
                </button>
                <button
                  type="button"
                  onClick={() => snapshot.onDeleteConversation(item.id)}
                  className="absolute right-1.5 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-black/5 hover:text-red-500 group-hover:flex"
                  aria-label="删除对话"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
