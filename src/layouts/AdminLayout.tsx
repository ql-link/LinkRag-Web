import { Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Cpu, Settings2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { Routes as RoutePaths } from '@/routes';

function PageLoader() {
  const { darkMode } = useTheme();
  return (
    <div className={cn('flex h-full items-center justify-center', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/40')}>
      <span className="text-xs uppercase tracking-[0.2em]">加载中...</span>
    </div>
  );
}

export function AdminLayout() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const menuItems = [
    { label: '博客管理', path: RoutePaths.AdminBlogs, icon: <BookOpen size={16} /> },
    { label: '模型管理', path: RoutePaths.AdminModels, icon: <Cpu size={16} /> },
    { label: '配置管理', path: '#', icon: <Settings2 size={16} />, disabled: true },
  ];

  return (
    <div
      className={cn(
        'flex h-screen w-full gap-3 overflow-hidden p-3 font-sans',
        darkMode ? 'bg-[#1f1f1f] text-[#d6d6d6]' : 'bg-bg-base text-text-main',
      )}
    >
      <aside
        className={cn(
          'hidden w-56 shrink-0 flex-col overflow-hidden rounded-[14px] border py-4 lg:flex',
          darkMode ? 'border-[#3a3a3a] bg-[#2b2b2b]' : 'border-border-subtle bg-white',
        )}
      >
        <div className="px-4">
          <div className="mb-6 px-3">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className={darkMode ? 'text-[#a6a6a6]' : 'text-primary'} />
              <h1 className={cn('mono-label', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/60')}>Admin Console</h1>
            </div>
            <button
              type="button"
              onClick={() => navigate(RoutePaths.ProfilePage)}
              className={cn(
                'flex h-9 items-center gap-2 rounded-md px-2 text-xs font-bold transition-colors',
                darkMode
                  ? 'text-[#a6a6a6] hover:bg-white/[0.045] hover:text-[#f2f2f2]'
                  : 'text-text-main/65 hover:bg-ink/[0.035] hover:text-text-main',
              )}
            >
              <ArrowLeft size={15} />
              返回个人信息
            </button>
          </div>
          <h3 className={cn('mono-label mb-3 px-3', darkMode && 'text-[#a6a6a6]')}>管理模块</h3>
          <nav className="flex flex-col gap-1">
            {menuItems.map((item) =>
              item.disabled ? (
                <div
                  key={item.label}
                  className={cn(
                    'flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm opacity-35',
                    darkMode && 'text-[#d6d6d6]',
                  )}
                >
                  {item.icon}
                  <span className="font-semibold">{item.label}</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider">开发中</span>
                </div>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? darkMode
                          ? 'bg-white/[0.055] font-bold text-[#f2f2f2]'
                          : 'bg-ink/[0.045] font-bold text-text-main '
                        : darkMode
                          ? 'font-semibold text-[#a6a6a6] hover:bg-white/[0.045] hover:text-[#d6d6d6]'
                          : 'font-semibold text-text-main/65 hover:bg-ink/[0.035] hover:text-text-main',
                    )
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
