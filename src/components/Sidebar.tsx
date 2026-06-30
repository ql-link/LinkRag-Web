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
  Moon,
  Sun,
} from 'lucide-react';
import { Routes } from '@/routes';
import { Link, useLocation, useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useChatWorkspaceSnapshot } from '@/contexts/chatWorkspace';
import { LinkRagMark } from '@/components/LinkRagMark';
import { ChatWorkspacePanel } from '@/components/ChatWorkspacePanel';
import { useTheme } from '@/contexts/ThemeContext';
import linkRagLogoCreamUrl from '@/assets/brand/linkrag-logo-cream.png';
import linkRagLogoInkUrl from '@/assets/brand/linkrag-logo-ink.png';

const navItems = [
  { path: Routes.Home, name: '首页', icon: Home },
  { path: Routes.Chats, name: '对话', icon: MessageSquare },
  { path: Routes.Datasets, name: '知识库', icon: Database },
  { path: Routes.LLMPage, name: '模型配置', icon: Cpu },
  { path: Routes.Usage, name: '用量', icon: BarChart3 },
];

const SIDEBAR_CONTENT_REVEAL_DELAY_MS = 90;

function getUserInitial(user: ReturnType<typeof useAuth>['user']) {
  return user?.nickname?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '';
}

interface SidebarProps {
  onNavigate?: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
  allowCollapse?: boolean;
  forceCollapsed?: boolean;
  className?: string;
}

export function Sidebar({
  onNavigate,
  onCollapsedChange,
  allowCollapse = true,
  forceCollapsed = false,
  className,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedContentVisible, setExpandedContentVisible] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userMenuPosition, setUserMenuPosition] = useState<{ left: number; bottom: number; width: number } | null>(
    null,
  );
  const sidebarRef = useRef<HTMLElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const isCollapsed = forceCollapsed || collapsed;

  const updateUserMenuPosition = useCallback(() => {
    const rect = userMenuButtonRef.current?.getBoundingClientRect();
    const sidebarRect = sidebarRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuWidth = isCollapsed && sidebarRect ? 224 : rect.width;
    const viewportPadding = 8;
    const preferredLeft = isCollapsed && sidebarRect ? sidebarRect.left : rect.left;
    setUserMenuPosition({
      left: Math.max(viewportPadding, Math.min(preferredLeft, window.innerWidth - menuWidth - viewportPadding)),
      bottom: Math.max(viewportPadding, window.innerHeight - rect.top + 8),
      width: menuWidth,
    });
  }, [isCollapsed]);

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
  const showExpandedContent = !isCollapsed && expandedContentVisible;
  const chatWorkspace = useChatWorkspaceSnapshot();

  useEffect(() => {
    onCollapsedChange?.(isCollapsed);
  }, [isCollapsed, onCollapsedChange]);

  useEffect(() => {
    if (isCollapsed) {
      setExpandedContentVisible(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setExpandedContentVisible(true);
    }, SIDEBAR_CONTENT_REVEAL_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isCollapsed]);

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
          'group relative flex h-11 w-full items-center rounded-lg transition-[background-color,color] duration-200 ease-out',
          isActive
            ? darkMode
              ? 'text-[#f2f2f2]'
              : 'text-ink'
            : darkMode
              ? 'text-[#a6a6a6] hover:bg-white/[0.045] hover:text-[#f2f2f2]'
              : 'text-text-secondary hover:bg-ink/[0.035] hover:text-ink',
        )}
      >
        <span className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center">
          <Icon
            size={18}
            strokeWidth={isActive ? 2.35 : 2}
            className={cn('shrink-0', isActive ? (darkMode ? 'text-[#f2f2f2]' : 'text-ink') : 'text-muted')}
          />
        </span>
        <span
          className={cn(
            'absolute left-[52px] right-2 whitespace-nowrap text-sm transition-[opacity,transform] duration-150',
            isActive ? 'font-bold' : 'font-medium',
            showExpandedContent ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-1 opacity-0',
          )}
        >
          {name}
        </span>
        {isCollapsed && (
          <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-on-dark opacity-0 transition-opacity group-hover:opacity-100">
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
            className={cn(
              'fixed z-[100] overflow-hidden rounded-xl border shadow-lg backdrop-blur-xl',
              darkMode ? 'border-[#3a3a3a] bg-[#2b2b2b]/94' : 'border-hairline bg-canvas/92',
            )}
          >
            <div className={cn('border-b px-3 py-2.5', darkMode ? 'border-[#3a3a3a]' : 'border-hairline')}>
              <p className={cn('truncate text-sm font-medium', darkMode ? 'text-[#f2f2f2]' : 'text-ink')}>
                {displayName}
              </p>
              <p className={cn('truncate text-[11px]', darkMode ? 'text-[#a6a6a6]' : 'text-muted-soft')}>
                {displayEmail}
              </p>
            </div>
            <div className="py-1">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onNavigate?.();
                  navigate(Routes.ProfilePage);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 transition-[background-color,color] duration-200 ease-out',
                  darkMode
                    ? 'text-[#a6a6a6] hover:bg-white/[0.045] hover:text-[#f2f2f2]'
                    : 'text-text-secondary hover:bg-ink/[0.035] hover:text-ink',
                )}
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
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 transition-[background-color,color] duration-200 ease-out',
                    darkMode
                      ? 'text-[#a6a6a6] hover:bg-white/[0.045] hover:text-[#f2f2f2]'
                      : 'text-text-secondary hover:bg-ink/[0.035] hover:text-ink',
                  )}
                >
                  <ShieldCheck size={15} />
                  <span className="text-sm font-medium">后台管理</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-error transition-[background-color,color] duration-200 ease-out hover:bg-error/[0.035] hover:text-error/80"
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

  const userAvatar = user?.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt="用户头像"
      className={cn(
        'h-8 w-8 min-w-8 max-w-8 shrink-0 rounded-full border object-cover',
        darkMode ? 'border-[#3a3a3a]' : 'border-hairline',
      )}
    />
  ) : (
    <div
      className={cn(
        'flex h-8 w-8 min-w-8 max-w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
        darkMode ? 'bg-[#303030] text-[#f2f2f2]' : 'bg-surface-soft text-ink',
      )}
    >
      {userInitial || <User size={14} className={darkMode ? 'text-[#a6a6a6]' : 'text-muted'} />}
    </div>
  );

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        'flex shrink-0 flex-col overflow-hidden rounded-[12px] border shadow-sm backdrop-blur-xl transition-[width] duration-[140ms] ease-out',
        darkMode ? 'border-[#3a3a3a] bg-[#2b2b2b]/92' : 'border-border-subtle bg-bg-frosted',
        forceCollapsed ? 'w-[64px] min-w-[64px]' : allowCollapse ? (collapsed ? 'w-[72px]' : 'w-[224px]') : 'w-[224px]',
        className,
      )}
    >
      {/* Logo */}
      <div className={cn('flex h-16 items-center overflow-hidden px-5', !darkMode && 'bg-white/35')}>
        <div className="flex min-w-max items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden">
            <LinkRagMark darkMode={darkMode} />
          </div>
          <div
            className={cn(
              'flex h-8 items-center transition-[opacity,transform] duration-150',
              showExpandedContent ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-1 opacity-0',
            )}
          >
            <img
              src={darkMode ? linkRagLogoCreamUrl : linkRagLogoInkUrl}
              alt="LinkRag"
              className="h-7 w-auto"
              draggable={false}
            />
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="shrink-0 space-y-1 overflow-x-hidden px-3 pb-1 pt-4">{navItems.map(renderNavLink)}</nav>

      {/* Chat workspace — 历史「对话记录」，展开时始终显示。
          外层补 px-3，使面板标题/列表与上方导航项左缘对齐。 */}
      <div
        className={cn(
          'min-h-0 flex-1 px-3 pt-1 transition-opacity duration-150',
          showExpandedContent ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        {showExpandedContent && <ChatWorkspacePanel snapshot={chatWorkspace} onNavigate={onNavigate} />}
      </div>

      {/* Footer — user menu */}
      <div className="shrink-0 p-3">
        <div className="relative">
          <button
            ref={userMenuButtonRef}
            onClick={() => {
              updateUserMenuPosition();
              setShowUserMenu((open) => !open);
            }}
            className={cn(
              'relative flex h-11 w-full min-w-0 items-center rounded-lg transition-colors duration-200 ease-out',
              darkMode ? 'hover:text-[#f2f2f2]' : 'hover:text-ink',
            )}
          >
            <span className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center">
              {userAvatar}
            </span>
            <div
              className={cn(
                'absolute left-[52px] right-2 min-w-0 overflow-hidden text-left transition-opacity duration-150',
                showExpandedContent ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              <p className={cn('truncate text-sm font-medium', darkMode ? 'text-[#f2f2f2]' : 'text-ink')}>
                {displayName}
              </p>
              <p className={cn('truncate text-[11px]', darkMode ? 'text-[#a6a6a6]' : 'text-muted-soft')}>
                {displayEmail}
              </p>
            </div>
          </button>

          {userMenuPortal}
        </div>

        <button
          onClick={() => {
            setShowUserMenu(false);
            toggleTheme();
          }}
          className={cn(
            'group relative mt-2 flex h-9 w-full items-center rounded-lg transition-[background-color,color] duration-200 ease-out',
            darkMode
              ? 'text-[#a6a6a6] hover:bg-white/[0.045] hover:text-[#f2f2f2]'
              : 'text-muted hover:bg-ink/[0.035] hover:text-ink',
          )}
          aria-label={darkMode ? '切换到白天模式' : '切换到夜间模式'}
          aria-pressed={darkMode}
        >
          <span className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center">
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </span>
          {!isCollapsed && (
            <span
              className={cn(
                'absolute left-[52px] right-2 whitespace-nowrap text-left text-xs font-medium transition-opacity duration-150',
                showExpandedContent ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              {darkMode ? '白天模式' : '夜间模式'}
            </span>
          )}
        </button>

        {allowCollapse && !forceCollapsed && (
          <button
            onClick={() => {
              setShowUserMenu(false);
              setCollapsed(!collapsed);
            }}
            className={cn(
              'relative mt-2 flex h-9 w-full items-center rounded-lg text-muted transition-[background-color,color] duration-200 ease-out hover:bg-ink/[0.035] hover:text-ink',
              darkMode && 'text-[#a6a6a6] hover:bg-white/[0.045] hover:text-[#f2f2f2]',
            )}
            aria-label={collapsed ? '展开导航栏' : '收起导航栏'}
          >
            <span className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center">
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={17} />}
            </span>
            {!collapsed && (
              <span
                className={cn(
                  'absolute left-[52px] right-2 whitespace-nowrap text-left text-xs font-medium transition-opacity duration-150',
                  showExpandedContent ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              >
                收起
              </span>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
