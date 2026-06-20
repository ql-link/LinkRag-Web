import { useState, useRef, useEffect } from 'react';
import {
  Home,
  Database,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
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
import { useTheme } from '@/contexts/ThemeContext';
import { LinkRagMark } from '@/components/LinkRagMark';

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
  const { darkMode, toggleTheme } = useTheme();
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
        'rounded-3xl border shadow-sm flex flex-col overflow-hidden shrink-0 transition-all duration-300',
        forceCollapsed ? 'w-[64px] min-w-[64px]' : allowCollapse ? (collapsed ? 'w-[72px]' : 'w-[200px]') : 'w-[200px]',
        className,
        darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'h-16 flex items-center overflow-hidden',
          isCollapsed ? 'justify-center px-0' : 'px-6',
          darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
          darkMode ? 'bg-[#1e1e1e]' : 'bg-white/50',
        )}
      >
        <div className={cn('flex items-center min-w-max', isCollapsed ? 'justify-center' : 'gap-3')}>
          <div
            className={cn(
              'rounded-lg flex items-center justify-center overflow-hidden',
              isCollapsed ? 'h-9 w-9 p-1.5' : 'h-8 w-8 p-1',
            )}
          >
            <LinkRagMark darkMode={darkMode} />
          </div>
          {!isCollapsed && (
            <h1 className={cn('text-lg serif-heading', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>LinkRag</h1>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav
        className={cn(
          'flex-1 py-6 space-y-2 overflow-y-auto overflow-x-hidden',
          isCollapsed ? 'px-2' : 'px-3',
          darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base/30',
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
                'flex items-center transition-all duration-300 group relative rounded-2xl',
                isCollapsed ? 'mx-auto h-12 w-12 justify-center p-0' : 'mx-1 gap-3 px-4 py-3',
                isActive
                  ? darkMode
                    ? 'bg-[#2f2f2f] text-[#f0f0f0] border border-[#434343] shadow-sm'
                    : 'bg-white/85 text-text-main border border-white/80 shadow-sm'
                  : darkMode
                    ? 'text-[#858585] hover:bg-[#2d2d2d] hover:text-[#cccccc]'
                    : 'text-text-main/50 hover:bg-primary/5 hover:text-text-main',
              )}
            >
              <Icon
                size={18}
                className={cn(
                  'shrink-0 transition-colors',
                  isActive
                    ? darkMode
                      ? 'text-[#e0e0e0]'
                      : 'text-text-main'
                    : darkMode
                      ? 'text-[#858585]'
                      : 'text-text-main/45',
                )}
              />
              {!isCollapsed && <span className="text-xs font-bold uppercase tracking-widest">{name}</span>}
              {isActive && !isCollapsed && (
                <div
                  className={cn('absolute right-4 w-1.5 h-1.5 rounded-full', darkMode ? 'bg-[#d7d7d7]' : 'bg-primary')}
                />
              )}
              {isCollapsed && (
                <div
                  className={cn(
                    'absolute left-full ml-4 px-3 py-1 text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50 rounded-lg shadow-xl',
                    darkMode ? 'bg-[#8A7662] text-white' : 'bg-[#7B6B5D] text-white',
                  )}
                >
                  {name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className={cn(
          'shrink-0 flex flex-col',
          isCollapsed ? 'items-center px-0 py-4' : 'p-4',
          darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/50 border-border-subtle',
        )}
      >
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            'flex items-center rounded-xl transition-colors mb-2',
            isCollapsed ? 'h-11 w-11 justify-center p-0' : 'w-full gap-3 px-2 py-2',
            darkMode
              ? 'text-[#858585] hover:bg-[#2d2d2d] hover:text-[#cccccc]'
              : 'text-text-main/50 hover:bg-primary/5 hover:text-primary',
          )}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          {!isCollapsed && (
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {darkMode ? '日间模式' : '夜间模式'}
            </span>
          )}
        </button>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              'flex items-center rounded-2xl transition-colors',
              isCollapsed ? 'h-12 w-12 justify-center p-0' : 'w-full gap-3 px-2 py-3',
              darkMode ? 'hover:bg-[#2d2d2d]' : 'hover:bg-primary/5',
            )}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="用户头像"
                className={cn(
                  'h-8 w-8 shrink-0 rounded-full border object-cover',
                  darkMode ? 'border-[#4c4c4c]' : 'border-text-main/10',
                )}
              />
            ) : (
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                  darkMode
                    ? 'border-[#4c4c4c] bg-[#3c3c3c] text-[#e0e0e0]'
                    : 'border-text-main/10 bg-primary/20 text-primary',
                )}
              >
                {userInitial || <User size={14} className={darkMode ? 'text-[#e0e0e0]' : 'text-text-main/60'} />}
              </div>
            )}
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p
                  className={cn(
                    'text-[10px] font-bold uppercase truncate',
                    darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
                  )}
                >
                  {displayName}
                </p>
                <p className={cn('mono-label !text-[8px]', darkMode && 'text-[#858585]')}>{displayEmail}</p>
              </div>
            )}
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div
              className={cn(
                'absolute bottom-full left-0 right-0 mb-2 rounded-xl shadow-lg overflow-hidden z-50 transition-all duration-200',
                darkMode ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white border-border-subtle',
              )}
            >
              <div
                className={cn('px-3 py-2', darkMode ? 'border-[#3c3c3c] border-b' : 'border-border-subtle border-b')}
              >
                <p className={cn('text-xs font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>{displayName}</p>
                <p className={cn('mono-label !text-[8px]', darkMode && 'text-[#858585]')}>{displayEmail}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate?.();
                    navigate(Routes.ProfilePage);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 transition-colors',
                    darkMode
                      ? 'text-[#cccccc] hover:bg-[#2d2d2d] hover:text-[#e0e0e0]'
                      : 'text-text-main/70 hover:bg-primary/5 hover:text-text-main',
                  )}
                >
                  <User size={14} />
                  <span className="text-xs font-medium">个人信息</span>
                </button>
                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate?.();
                      navigate(Routes.AdminBlogs);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 transition-colors',
                      darkMode
                        ? 'text-[#cccccc] hover:bg-[#2d2d2d] hover:text-[#e0e0e0]'
                        : 'text-text-main/70 hover:bg-primary/5 hover:text-text-main',
                    )}
                  >
                    <ShieldCheck size={14} />
                    <span className="text-xs font-medium">后台管理</span>
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 transition-colors',
                    darkMode ? 'text-red-400 hover:bg-[#2d2d2d]' : 'text-red-500 hover:bg-red-50',
                  )}
                >
                  <LogOut size={14} />
                  <span className="text-xs font-medium">退出登录</span>
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
              'flex items-center justify-center rounded-xl transition-colors mt-2',
              collapsed ? 'h-11 w-11 p-0' : 'w-full py-2',
              darkMode
                ? 'text-[#858585] hover:bg-[#2d2d2d] hover:text-[#cccccc]'
                : 'text-text-main/40 hover:bg-primary/5 hover:text-primary',
            )}
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <div className="flex items-center gap-2">
                <ChevronLeft size={18} />
                <span className="text-[10px] font-bold uppercase tracking-widest">收起</span>
              </div>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
