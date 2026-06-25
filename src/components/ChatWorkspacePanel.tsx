import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { ChevronRight, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { ChatWorkspaceSnapshot } from '@/contexts/chatWorkspace';

type ConversationItem = ChatWorkspaceSnapshot['conversations'][number];

function getConversationTitle(item: ConversationItem | null | undefined) {
  return (item?.title ?? '新对话').trim() || '新对话';
}

/**
 * 「对话记录」列表。数据与回调来自 ChatsPage 发布的快照；快照为 null 时按加载中渲染。
 * 视觉规格见《左侧边栏「对话记录」模块对接文档》：奶油 + coral 体系，
 * 模块头（折叠箭头 + 标签 + 计数徽标 + 新建按钮 + 搜索框）固定，仅列表区域滚动。
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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const renameSubmittingRef = useRef(false);
  const renameCancellingRef = useRef(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
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

  // 按标题做不区分大小写的子串过滤。
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return conversations;
    return conversations.filter((item) => getConversationTitle(item).toLowerCase().includes(keyword));
  }, [conversations, query]);

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
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || menuRef.current?.contains(target)) return;
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
    setQuery('');
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

  const menuTarget = visibleMenuId === null ? null : conversations.find((item) => item.id === visibleMenuId);
  const menuPortal =
    menuTarget && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ ...menuPosition, width: 132, boxShadow: '0 8px 24px rgba(20, 20, 19, 0.12)' }}
            className={cn(
              'fixed z-[100] origin-top-right rounded-[9px] border border-hairline bg-canvas p-1 transition-all duration-150 ease-out',
              openMenuId === menuTarget.id
                ? 'translate-y-0 scale-100 opacity-100'
                : '-translate-y-1 scale-[0.98] opacity-0',
            )}
          >
            <button
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                startRename(menuTarget);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-body transition-colors hover:bg-surface-soft"
            >
              <Pencil size={13} />
              重命名
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                setOpenMenuId(null);
                setDeleteTarget(menuTarget);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-error transition-colors hover:bg-error/8"
            >
              <Trash2 size={13} />
              删除
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={panelRef} className="flex h-full min-h-0 flex-col">
      {/* 模块头 */}
      <div className="shrink-0 px-1 pb-2 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="group flex min-w-0 items-center gap-1.5 text-muted transition-colors hover:text-ink"
            aria-expanded={!collapsed}
          >
            <ChevronRight
              size={15}
              className={cn('shrink-0 text-ink transition-transform duration-200', !collapsed && 'rotate-90')}
            />
            <span className="truncate font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">对话记录</span>
            <span className="shrink-0 rounded-full bg-surface-soft px-[7px] py-px font-mono text-[10px] font-semibold text-muted">
              {conversations.length}
            </span>
          </button>
          <button
            type="button"
            onClick={beginNewConversation}
            disabled={!snapshot}
            className="flex shrink-0 items-center gap-1 rounded-full border border-primary-mid bg-primary-light px-2.5 py-1 text-[12.5px] font-semibold text-primary transition-colors hover:bg-primary-mid disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="新建对话"
            title="新建对话"
          >
            <Plus size={13} />
            <span>新建</span>
          </button>
        </div>

        {/* 搜索框 */}
        {!collapsed && (
          <div className="group mt-2.5 flex items-center gap-2 rounded-[9px] border border-transparent bg-surface-soft px-[11px] py-2 transition-colors focus-within:border-primary focus-within:bg-white">
            <Search size={15} className="shrink-0 text-muted-soft" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索对话"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-muted-soft focus:outline-none"
              aria-label="搜索对话"
            />
          </div>
        )}
      </div>

      {/* 列表 */}
      {collapsed ? null : !snapshot || snapshot.loadingConversations ? (
        <div className="flex h-20 items-center justify-center text-muted">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <p className="px-3 py-4 text-[13px] text-muted-soft">暂无历史对话</p>
      ) : filtered.length === 0 ? (
        <p className="px-3 py-4 text-[13px] text-muted-soft">没有匹配的对话</p>
      ) : (
        <div className="thin-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-1 pb-1">
          {filtered.map((item) => {
            const active = snapshot.activeConversationId === item.id;
            const isRenaming = renameTargetId === item.id;
            const isBusy = deletingConversationId === item.id || renamingConversationId === item.id;
            const menuOpen = openMenuId === item.id;
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
                      className="h-8 w-full rounded-[8px] border border-primary bg-white px-2 text-[13.5px] text-ink outline-none ring-2 ring-primary/20"
                      aria-label="重命名对话"
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => goToConversation(item.id)}
                    className={cn(
                      'relative block w-full truncate rounded-[8px] py-[7px] pl-[14px] pr-8 text-left text-[13.5px] font-medium transition-colors',
                      active ? 'bg-surface-cream-strong text-ink' : 'text-body hover:bg-surface-soft hover:text-ink',
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-[3px] top-1/2 h-[15px] w-[3px] -translate-y-1/2 rounded-[2px] bg-primary"
                      />
                    )}
                    {getConversationTitle(item)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (menuOpen) {
                      setOpenMenuId(null);
                      return;
                    }
                    const rect = event.currentTarget.getBoundingClientRect();
                    setMenuPosition({
                      left: Math.max(8, Math.min(rect.right - 132, window.innerWidth - 132 - 8)),
                      top: Math.min(rect.bottom + 4, window.innerHeight - 96),
                    });
                    setOpenMenuId(item.id);
                  }}
                  disabled={isBusy || isRenaming}
                  className={cn(
                    'absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[6px] text-muted transition-all hover:bg-surface-cream-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-60',
                    menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                  )}
                  aria-label="打开对话操作菜单"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  {isBusy ? <Loader2 size={13} className="animate-spin" /> : <MoreHorizontal size={15} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {menuPortal}
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
