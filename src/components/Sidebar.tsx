import { useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Home,
  Database,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  Cpu,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import { Routes } from '@/routes';
import { Link, useLocation, useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useChatWorkspaceSnapshot } from '@/contexts/chatWorkspace';
import { LinkRagMark } from '@/components/LinkRagMark';
import { ChatWorkspacePanel } from '@/components/ChatWorkspacePanel';

const navItems = [
  { path: Routes.Home, name: '首页', icon: Home },
  { path: Routes.Datasets, name: '知识库', icon: Database },
  { path: Routes.LLMPage, name: '模型配置', icon: Cpu },
  { path: Routes.Usage, name: '用量', icon: BarChart3 },
];

// 「对话」入口单独成段，置于分割线下方、「对话记录」列表上方。
const chatNavItem = { path: Routes.Chats, name: '对话', icon: MessageSquare };

function getUserInitial(user: ReturnType<typeof useAuth>['user']) {
  return user?.nickname?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '';
}

interface SidebarProps {
  onNavigate?: () => void;
  allowCollapse?: boolean;
  forceCollapsed?: boolean;
  className?: string;
}

export function Sidebar({ onNavigate, allowCollapse = true, forceCollapsed = false, className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userMenuPosition, setUserMenuPosition] = useState<{ left: number; bottom: number } | null>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const updateUserMenuPosition = useCallback(() => {
    const rect = userMenuButtonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuWidth = 224;
    const viewportPadding = 8;
    setUserMenuPosition({
      left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding)),
      bottom: Math.max(viewportPadding, window.innerHeight - rect.top + 8),
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (userMenuButtonRef.current?.contains(target) || userMenuRef.current?.contains(target)) {
        return;
      }
      if (showUserMenu) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  useEffect(() => {
    if (!showUserMenu) return;

    updateUserMenuPosition();
    window.addEventListener('resize', updateUserMenuPosition);
    window.addEventListener('scroll', updateUserMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateUserMenuPosition);
      window.removeEventListener('scroll', updateUserMenuPosition, true);
    };
  }, [showUserMenu, updateUserMenuPosition]);

  const displayName = user?.nickname || user?.username || '当前用户';
  const displayEmail = user?.email || '未设置邮箱';
  const userInitial = getUserInitial(user);
  const isCollapsed = forceCollapsed || collapsed;
  const chatWorkspace = useChatWorkspaceSnapshot();
  // 「对话记录」面板在侧栏展开时始终显示（数据由 ChatWorkspaceProvider 全局兜底提供）。
  const showChatPanel = !isCollapsed;

  const renderNavLink = ({ path, name, icon: Icon }: { path: string; name: string; icon: typeof Home }) => {
    const isActive = pathname === path || (path !== Routes.Home && pathname.startsWith(`${path}/`));
    return (
      <Link
        key={path}
        to={path}
        onClick={() => {
          setShowUserMenu(false);
          onNavigate?.();
        }}
        className={cn(
          'group relative flex items-center rounded-lg transition-colors',
          isCollapsed ? 'mx-auto h-11 w-11 justify-center p-0' : 'gap-3 px-3 py-2.5',
          isActive ? 'bg-primary/10 text-ink' : 'text-text-secondary hover:bg-primary/5 hover:text-ink',
        )}
      >
        <Icon size={18} className={cn('shrink-0', isActive ? 'text-primary' : 'text-muted')} />
        {!isCollapsed && <span className="text-sm font-medium">{name}</span>}
        {isCollapsed && (
          <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-on-dark opacity-0  transition-opacity group-hover:opacity-100">
            {name}
          </span>
        )}
      </Link>
    );
  };

  const userMenuPortal =
    showUserMenu && userMenuPosition
      ? createPortal(
          <div
            ref={userMenuRef}
            style={userMenuPosition}
            className="fixed z-[100] w-56 overflow-hidden rounded-xl border border-hairline bg-canvas/92 shadow-lg backdrop-blur-xl"
          >
            <div className="border-b border-hairline px-3 py-2.5">
              <p className="truncate text-sm font-medium text-ink">{displayName}</p>
              <p className="truncate text-[11px] text-muted-soft">{displayEmail}</p>
            </div>
            <div className="py-1">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onNavigate?.();
                  navigate(Routes.ProfilePage);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-text-secondary transition-colors hover:bg-primary/5 hover:text-ink"
              >
                <User size={15} />
                <span className="text-sm font-medium">个人信息</span>
              </button>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate?.();
                    navigate(Routes.AdminBlogs);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-text-secondary transition-colors hover:bg-primary/5 hover:text-ink"
                >
                  <ShieldCheck size={15} />
                  <span className="text-sm font-medium">后台管理</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-3 py-2 text-error transition-colors hover:bg-error/8"
              >
                <LogOut size={15} />
                <span className="text-sm font-medium">退出登录</span>
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    } finally {
      setShowUserMenu(false);
      navigate(Routes.Welcome, { replace: true });
    }
  }

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col overflow-hidden border-r border-border-subtle bg-bg-frosted shadow-sm backdrop-blur-xl transition-[width] duration-300',
        forceCollapsed ? 'w-[64px] min-w-[64px]' : allowCollapse ? (collapsed ? 'w-[72px]' : 'w-[224px]') : 'w-[224px]',
        className,
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 items-center overflow-hidden bg-white/35',
          isCollapsed ? 'justify-center px-0' : 'px-5',
        )}
      >
        <div className={cn('flex min-w-max items-center', isCollapsed ? 'justify-center' : 'gap-2.5')}>
          <div className={cn('flex items-center justify-center overflow-hidden', isCollapsed ? 'h-9 w-9' : 'h-8 w-8')}>
            <LinkRagMark />
          </div>
          {!isCollapsed && <h1 className="serif-heading text-xl text-ink">LinkRag</h1>}
        </div>
      </div>

      {/* Nav */}
      <nav
        className={cn(
          'space-y-1 overflow-x-hidden py-4',
          isCollapsed ? 'px-2' : 'px-3',
          isCollapsed ? 'flex-1 overflow-y-auto' : 'shrink-0',
        )}
      >
        {navItems.map(renderNavLink)}
      </nav>

      {/* 「对话」入口：分割线下方、「对话记录」上方 */}
      <div className={cn('shrink-0 border-t border-border-subtle pt-3', isCollapsed ? 'px-2' : 'px-3')}>
        {renderNavLink(chatNavItem)}
      </div>

      {/* Chat workspace — 历史「对话记录」，展开时始终显示。
          外层补 px-3，使面板标题/列表与上方「对话」入口、导航项左缘对齐。 */}
      {showChatPanel && (
        <div className="min-h-0 flex-1 px-3 pt-1">
          <ChatWorkspacePanel snapshot={chatWorkspace} onNavigate={onNavigate} />
        </div>
      )}

      {/* Footer — user menu */}
      <div className={cn('shrink-0 border-t border-border-subtle', isCollapsed ? 'px-2 py-3' : 'p-3')}>
        <div className="relative">
          <button
            ref={userMenuButtonRef}
            onClick={() => {
              updateUserMenuPosition();
              setShowUserMenu((open) => !open);
            }}
            className={cn(
              'flex items-center rounded-lg transition-colors hover:bg-primary/5',
              isCollapsed ? 'mx-auto h-11 w-11 justify-center p-0' : 'w-full gap-3 px-2 py-2',
            )}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="用户头像"
                className="h-8 w-8 shrink-0 rounded-full border border-hairline object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {userInitial || <User size={14} className="text-muted" />}
              </div>
            )}
            {!isCollapsed && (
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-ink">{displayName}</p>
                <p className="truncate text-[11px] text-muted-soft">{displayEmail}</p>
              </div>
            )}
          </button>

          {userMenuPortal}
        </div>

        {/* Collapse button */}
        {allowCollapse && !forceCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'mt-2 flex items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/5 hover:text-ink',
              collapsed ? 'mx-auto h-11 w-11 p-0' : 'w-full px-3 py-2',
            )}
            aria-label={collapsed ? '展开导航栏' : '收起导航栏'}
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <div className="flex w-full items-center justify-center gap-2">
                <ChevronLeft size={16} />
                <span className="text-xs font-medium">收起</span>
              </div>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
