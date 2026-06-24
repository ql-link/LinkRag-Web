import { useState, useRef, useEffect } from 'react';
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
  { path: Routes.Chats, name: '对话', icon: MessageSquare },
  { path: Routes.LLMPage, name: '模型配置', icon: Cpu },
  { path: Routes.Usage, name: '用量', icon: BarChart3 },
];

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
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.nickname || user?.username || '当前用户';
  const displayEmail = user?.email || '未设置邮箱';
  const userInitial = getUserInitial(user);
  const isCollapsed = forceCollapsed || collapsed;
  const chatWorkspace = useChatWorkspaceSnapshot();
  const isChatRoute = pathname === Routes.Chats || pathname.startsWith(`${Routes.Chats}/`);
  const showChatPanel = isChatRoute && !isCollapsed;

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
        'flex shrink-0 flex-col overflow-visible border-r border-border-subtle bg-bg-frosted shadow-sm backdrop-blur-xl transition-[width] duration-300',
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
          showChatPanel ? 'shrink-0' : 'flex-1 overflow-y-auto',
        )}
      >
        {navItems.map(({ path, name, icon: Icon }) => {
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
        })}
      </nav>

      {/* Chat workspace — history, merged into the global sidebar on the chat route */}
      {showChatPanel && (
        <div className="min-h-0 flex-1 border-t border-border-subtle">
          <ChatWorkspacePanel snapshot={chatWorkspace} onNavigate={onNavigate} />
        </div>
      )}

      {/* Footer — user menu */}
      <div className={cn('shrink-0 border-t border-border-subtle', isCollapsed ? 'px-2 py-3' : 'p-3')}>
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
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

          {showUserMenu && (
            <div className="absolute bottom-full left-0 z-50 mb-2 w-56 overflow-hidden rounded-xl border border-hairline bg-canvas/92 shadow-lg backdrop-blur-xl">
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
            </div>
          )}
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
