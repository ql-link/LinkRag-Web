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

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <aside
      className={cn(
        "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-3xl border border-border-subtle flex flex-col overflow-hidden shadow-sm transition-all duration-300 shrink-0",
        collapsed ? "w-[72px]" : "w-[200px]"
      )}
    >
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-border-subtle overflow-hidden">
        <div className="flex items-center gap-3 min-w-max">
          <div className="w-8 h-8 bg-text-main rounded-lg flex items-center justify-center">
            <Share2 className="text-white" size={18} />
          </div>
          {!collapsed && (
            <h1 className="text-lg font-bold tracking-tighter uppercase">toLink</h1>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ path, name, icon: Icon }) => {
          const isActive = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-all duration-300 group relative rounded-2xl mx-1",
                isActive
                  ? "bg-text-main text-white shadow-lg shadow-text-main/10"
                  : "text-text-main/50 hover:bg-primary/5 hover:text-text-main"
              )}
            >
              <Icon size={18} className={cn("shrink-0", isActive && "text-primary")} />
              {!collapsed && (
                <span className="text-xs font-bold uppercase tracking-widest">{name}</span>
              )}
              {isActive && !collapsed && (
                <div className="absolute right-4 w-1 h-1 bg-primary rounded-full animate-pulse" />
              )}
              {collapsed && (
                <div className="absolute left-full ml-4 px-3 py-1 bg-text-main text-white text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50 rounded-lg shadow-xl">
                  {name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border-subtle bg-white/50 dark:bg-gray-900/50">
        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 hover:bg-primary/5 rounded-xl text-text-main/40 hover:text-primary transition-colors mb-2"
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
          onClick={() => setDarkMode(!darkMode)}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-primary/5 text-text-main/50 hover:text-primary transition-colors mb-2"
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
            className="w-full flex items-center gap-3 px-2 py-3 rounded-2xl bg-bg-base/30 hover:bg-primary/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full border border-text-main/10 bg-primary/20 shrink-0 flex items-center justify-center">
              <User size={14} className="text-text-main/60" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[10px] font-bold uppercase truncate">Alex Chen</p>
                <p className="mono-label !text-[8px]">Pro Member</p>
              </div>
            )}
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div
              className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-xl border border-border-subtle shadow-lg overflow-hidden z-50 transition-all duration-200"
            >
              <div className="px-3 py-2 border-b border-border-subtle">
                <p className="text-xs font-bold">Alex Chen</p>
                <p className="mono-label !text-[8px]">alex@example.com</p>
              </div>
              <div className="py-1">
                <button className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/5 text-text-main/70 hover:text-text-main transition-colors">
                  <User size={14} />
                  <span className="text-xs font-medium">个人信息</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/5 text-text-main/70 hover:text-text-main transition-colors">
                  <Settings size={14} />
                  <span className="text-xs font-medium">设置</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 hover:bg-state-error/5 text-state-error transition-colors">
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