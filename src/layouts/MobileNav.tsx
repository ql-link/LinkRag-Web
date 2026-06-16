import { type CSSProperties } from 'react';
import { Link, useLocation } from 'react-router';
import { Database, Home, MessageSquare, User } from 'lucide-react';
import { Routes as RoutePaths } from '@/routes';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

type MobileTabItem = {
  path: string;
  label: string;
  icon: typeof Home;
  match?: (pathname: string) => boolean;
};

const mobileTabItems: MobileTabItem[] = [
  { path: RoutePaths.Home, label: '首页', icon: Home },
  { path: RoutePaths.Datasets, label: '知识库', icon: Database },
  { path: RoutePaths.Chats, label: '对话', icon: MessageSquare },
  {
    path: RoutePaths.ProfilePage,
    label: '我的',
    icon: User,
    match: (pathname: string) => pathname.startsWith('/settings'),
  },
];

function isTabActive(pathname: string, item: MobileTabItem) {
  if (item.match) return item.match(pathname);
  return pathname === item.path;
}

export function MobileNav() {
  const { darkMode } = useTheme();
  const { pathname } = useLocation();
  const bottomBarStyle: CSSProperties = { paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' };

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1 border-t px-2 pt-2 lg:hidden',
        darkMode
          ? 'border-[#3c3c3c] bg-[#1e1e1e]/95 backdrop-blur-md'
          : 'border-border-subtle bg-white/95 backdrop-blur-md',
      )}
      style={bottomBarStyle}
    >
      {mobileTabItems.map((item) => {
        const Icon = item.icon;
        const active = isTabActive(pathname, item);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex flex-col items-center justify-center rounded-xl py-2 text-[10px] font-bold uppercase tracking-wider transition-colors',
              active
                ? darkMode
                  ? 'bg-[#2d2d2d] text-[#f0f0f0]'
                  : 'bg-primary/10 text-primary'
                : darkMode
                  ? 'text-[#858585]'
                  : 'text-text-main/55',
            )}
          >
            <Icon size={16} />
            <span className="mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
