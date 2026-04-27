import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  Database,
  MessageSquare,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Share2,
  Sun,
  Moon,
  Settings,
  User,
  LogOut,
} from 'lucide-react';
import { Routes } from '@/routes';
import { Link, useLocation } from 'react-router';
import { cn } from '@/lib/utils';

const navItems = [
  { path: Routes.Home, name: '首页', icon: Home },
  { path: Routes.Datasets, name: '知识库', icon: Database },
  { path: Routes.Chats, name: '对话', icon: MessageSquare },
  { path: Routes.Files, name: '文件', icon: FolderOpen },
];

interface SidebarProps {
  darkMode: boolean;
  onDarkModeChange: (dark: boolean) => void;
}

export function Sidebar({ darkMode, onDarkModeChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    onDarkModeChange(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <aside
      className={cn(
        "rounded-3xl border shadow-sm flex flex-col overflow-hidden shrink-0 transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[200px]",
        darkMode
          ? "bg-gray-800/90 border-gray-700"
          : "bg-white/80 border-border-subtle"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "h-20 flex items-center px-6 overflow-hidden",
          darkMode ? "border-gray-700" : "border-border-subtle",
          darkMode ? "bg-gray-800/50" : "bg-white/50"
        )}
      >
        <div className="flex items-center gap-3 min-w-max">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            darkMode ? "bg-gray-700" : "bg-text-main"
          )}>
            <Share2 className="text-white" size={18} />
          </div>
          {!collapsed && (
            <h1 className={cn(
              "text-lg font-bold tracking-tighter uppercase",
              darkMode ? "text-gray-100" : "text-text-main"
            )}>
              toLink
            </h1>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden", darkMode ? "bg-gray-800/30" : "bg-bg-base/30")}>
        {navItems.map(({ path, name, icon: Icon }) => {
          const isActive = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-all duration-300 group relative rounded-2xl mx-1",
                isActive
                  ? darkMode
                    ? "bg-gray-100 text-gray-900 shadow-lg"
                    : "bg-text-main text-white shadow-lg shadow-text-main/10"
                  : darkMode
                    ? "text-gray-400 hover:bg-gray-700/50 hover:text-gray-100"
                    : "text-text-main/50 hover:bg-primary/5 hover:text-text-main"
              )}
            >
              <Icon size={18} className={cn("shrink-0", isActive && (darkMode ? "text-gray-900" : "text-primary"))} />
              {!collapsed && (
                <span className="text-xs font-bold uppercase tracking-widest">{name}</span>
              )}
              {isActive && !collapsed && (
                <div className="absolute right-4 w-1 h-1 bg-primary rounded-full animate-pulse" />
              )}
              {collapsed && (
                <div className={cn(
                  "absolute left-full ml-4 px-3 py-1 text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50 rounded-lg shadow-xl",
                  darkMode ? "bg-gray-100 text-gray-900" : "bg-text-main text-white"
                )}>
                  {name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn("p-4 shrink-0", darkMode ? "bg-gray-800/50 border-gray-700" : "bg-white/50 border-border-subtle")}>
        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full flex items-center justify-center py-2 rounded-xl transition-colors mb-2",
            darkMode
              ? "text-gray-400 hover:bg-gray-700/50 hover:text-gray-100"
              : "text-text-main/40 hover:bg-primary/5 hover:text-primary"
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

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-colors mb-2",
            darkMode
              ? "text-gray-400 hover:bg-gray-700/50 hover:text-gray-100"
              : "text-text-main/50 hover:bg-primary/5 hover:text-primary"
          )}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          {!collapsed && (
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
              "w-full flex items-center gap-3 px-2 py-3 rounded-2xl transition-colors",
              darkMode ? "bg-gray-700/50 hover:bg-gray-700" : "bg-bg-base/30 hover:bg-primary/5"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full shrink-0 flex items-center justify-center",
              darkMode ? "bg-gray-600 border-gray-500" : "border-text-main/10 bg-primary/20"
            )}>
              <User size={14} className={darkMode ? "text-gray-300" : "text-text-main/60"} />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className={cn("text-[10px] font-bold uppercase truncate", darkMode ? "text-gray-100" : "text-text-main")}>Alex Chen</p>
                <p className={cn("mono-label !text-[8px]", darkMode ? "text-gray-400" : "")}>Pro Member</p>
              </div>
            )}
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div
              className={cn(
                "absolute bottom-full left-0 right-0 mb-2 rounded-xl shadow-lg overflow-hidden z-50 transition-all duration-200",
                darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border-border-subtle"
              )}
            >
              <div className={cn("px-3 py-2", darkMode ? "border-gray-700 border-b" : "border-border-subtle border-b")}>
                <p className={cn("text-xs font-bold", darkMode ? "text-gray-100" : "text-text-main")}>Alex Chen</p>
                <p className={cn("mono-label !text-[8px]", darkMode ? "text-gray-400" : "")}>alex@example.com</p>
              </div>
              <div className="py-1">
                <button className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 transition-colors",
                  darkMode
                    ? "text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                    : "text-text-main/70 hover:bg-primary/5 hover:text-text-main"
                )}>
                  <User size={14} />
                  <span className="text-xs font-medium">个人信息</span>
                </button>
                <button className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 transition-colors",
                  darkMode
                    ? "text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                    : "text-text-main/70 hover:bg-primary/5 hover:text-text-main"
                )}>
                  <Settings size={14} />
                  <span className="text-xs font-medium">设置</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <LogOut size={14} />
                  <span className="text-xs font-medium">退出登录</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}