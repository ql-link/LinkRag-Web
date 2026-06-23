import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { ChatWorkspaceSnapshot } from '@/contexts/chatWorkspace';

type ConversationItem = ChatWorkspaceSnapshot['conversations'][number];

function getConversationTitle(item: ConversationItem | null | undefined) {
  return (item?.title ?? '新对话').trim() || '新对话';
}

/**
 * 「最近对话」列表。数据与回调来自 ChatsPage 发布的快照；快照为 null 时按加载中渲染。
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
  const panelRef = useRef<HTMLDivElement | null>(null);
  const renameSubmittingRef = useRef(false);
  const renameCancellingRef = useRef(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [visibleMenuId, setVisibleMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConversationItem | null>(null);
  const [deletingConversationId, setDeletingConversationId] = useState<number | null>(null);
  const [renameTargetId, setRenameTargetId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renamingConversationId, setRenamingConversationId] = useState<number | null>(null);

  const conversations = useMemo(() => {
    const items = snapshot?.conversations ?? [];
    return [...items].sort((a, b) => new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime());
  }, [snapshot?.conversations]);

  useEffect(() => {
    if (openMenuId !== null) {
      setVisibleMenuId(openMenuId);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleMenuId(null);
      setMenuPosition(null);
    }, 140);

    return () => window.clearTimeout(timeoutId);
  }, [openMenuId]);

  useEffect(() => {
    if (visibleMenuId === null) return;

    function handlePointerDown(event: PointerEvent) {
      if (panelRef.current?.contains(event.target as Node)) return;
      setOpenMenuId(null);
    }

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [visibleMenuId]);

  const goToConversation = (id: number) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    navigate(`/chats/${id}`);
    onNavigate?.();
  };

  const beginNewConversation = () => {
    setOpenMenuId(null);
    setMenuPosition(null);
    snapshot?.onBeginNewConversation();
    onNavigate?.();
  };

  const startRename = (item: ConversationItem) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    renameCancellingRef.current = false;
    setRenameTargetId(item.id);
    setRenameValue(getConversationTitle(item));
  };

  const cancelRename = () => {
    renameCancellingRef.current = true;
    setRenameTargetId(null);
    setRenameValue('');
  };

  const submitRename = async (item: ConversationItem) => {
    if (renameSubmittingRef.current || renameCancellingRef.current) return;
    const nextTitle = renameValue.trim();
    if (!snapshot || !nextTitle || nextTitle === getConversationTitle(item)) {
      cancelRename();
      return;
    }

    renameSubmittingRef.current = true;
    setRenameTargetId(null);
    setRenamingConversationId(item.id);
    try {
      await snapshot.onRenameConversation(item.id, nextTitle);
      setRenameValue('');
    } finally {
      renameSubmittingRef.current = false;
      setRenamingConversationId(null);
    }
  };

  const handleRenameSubmit = (event: FormEvent<HTMLFormElement>, item: ConversationItem) => {
    event.preventDefault();
    void submitRename(item);
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelRename();
    }
  };

  const confirmDeleteConversation = async () => {
    if (!snapshot || !deleteTarget) return;
    setDeletingConversationId(deleteTarget.id);
    try {
      await snapshot.onDeleteConversation(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeletingConversationId(null);
    }
  };

  return (
    <div ref={panelRef} className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pb-2 pt-2">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="group flex min-w-0 items-center gap-1.5 text-text-secondary transition-colors hover:text-ink"
          aria-expanded={!collapsed}
        >
          <span className="truncate text-sm font-semibold">对话记录</span>
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
        <div className="popover-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1 pb-1">
          {conversations.map((item) => {
            const active = snapshot.activeConversationId === item.id;
            const isRenaming = renameTargetId === item.id;
            const isBusy = deletingConversationId === item.id || renamingConversationId === item.id;
            return (
              <div key={item.id} className="group relative">
                {isRenaming ? (
                  <form onSubmit={(event) => handleRenameSubmit(event, item)} className="px-1 py-0.5">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onBlur={() => {
                        if (renameCancellingRef.current) {
                          renameCancellingRef.current = false;
                          return;
                        }
                        void submitRename(item);
                      }}
                      onKeyDown={handleRenameKeyDown}
                      maxLength={128}
                      className="h-8 w-full rounded-lg border border-primary/35 bg-canvas px-2 text-sm text-ink outline-none"
                      aria-label="重命名对话"
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => goToConversation(item.id)}
                    className={cn(
                      'w-full truncate rounded-lg px-3 py-2 pr-9 text-left text-sm transition-colors',
                      active ? 'bg-primary/10 text-ink' : 'text-text-secondary hover:bg-primary/5 hover:text-ink',
                    )}
                  >
                    {getConversationTitle(item)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (openMenuId === item.id) {
                      setOpenMenuId(null);
                      return;
                    }
                    const rect = event.currentTarget.getBoundingClientRect();
                    setMenuPosition({
                      left: rect.right + 8,
                      top: Math.max(8, Math.min(rect.top - 8, window.innerHeight - 112)),
                    });
                    setOpenMenuId(item.id);
                  }}
                  disabled={isBusy || isRenaming}
                  className={cn(
                    'absolute right-1.5 top-1/2 h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-black/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60',
                    openMenuId === item.id ? 'flex' : 'hidden group-hover:flex',
                  )}
                  aria-label="打开对话操作菜单"
                  aria-haspopup="menu"
                  aria-expanded={openMenuId === item.id}
                >
                  {isBusy ? <Loader2 size={13} className="animate-spin" /> : <MoreHorizontal size={15} />}
                </button>
                {visibleMenuId === item.id && (
                  <div
                    role="menu"
                    style={menuPosition ?? undefined}
                    className={cn(
                      'fixed z-40 w-36 origin-left rounded-xl border border-hairline bg-bg-card-solid p-1 shadow-dialog transition-all duration-150 ease-out',
                      openMenuId === item.id
                        ? 'translate-x-0 scale-100 opacity-100'
                        : '-translate-x-1 scale-[0.98] opacity-0',
                    )}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(event) => {
                        event.stopPropagation();
                        startRename(item);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-primary/8 hover:text-ink"
                    >
                      <Pencil size={14} />
                      重命名
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuId(null);
                        setDeleteTarget(item);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-error transition-colors hover:bg-error/10"
                    >
                      <Trash2 size={14} />
                      删除
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除对话？"
        confirmLabel="删除"
        loading={deleteTarget ? deletingConversationId === deleteTarget.id : false}
        onCancel={() => {
          if (!deletingConversationId) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDeleteConversation()}
      >
        <p>
          这会删除 <strong className="font-bold text-ink">{getConversationTitle(deleteTarget)}</strong>。
        </p>
        <p className="text-muted">对话删除后，历史问答记录将不再显示。</p>
      </ConfirmDialog>
    </div>
  );
}
