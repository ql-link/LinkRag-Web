import { Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Cpu, Settings2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { Routes as RoutePaths } from '@/routes';

function PageLoader() {
  const { darkMode } = useTheme();
  return (
    <div className={cn('flex h-full items-center justify-center', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
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
        'flex h-screen w-full gap-2 overflow-hidden p-2 font-sans lg:gap-4 lg:p-4',
        darkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-bg-base text-text-main',
      )}
    >
      <aside
        className={cn(
          'hidden w-60 shrink-0 flex-col overflow-hidden rounded-[24px] border py-6 shadow-sm lg:flex',
          darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
        )}
      >
        <div className="px-4">
          <div className="mb-6 px-3">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className={darkMode ? 'text-[#858585]' : 'text-primary'} />
              <h1 className={cn('mono-label', darkMode ? 'text-[#858585]' : 'text-text-main/60')}>Admin Console</h1>
            </div>
            <button
              type="button"
              onClick={() => navigate(RoutePaths.ProfilePage)}
              className={cn(
                'flex h-9 items-center gap-2 rounded-xl px-2 text-xs font-bold transition-colors',
                darkMode
                  ? 'text-[#cccccc] hover:bg-[#2d2d2d] hover:text-[#e0e0e0]'
                  : 'text-text-main/65 hover:bg-primary/5 hover:text-text-main',
              )}
            >
              <ArrowLeft size={15} />
              返回个人信息
            </button>
          </div>
          <h3 className={cn('mono-label mb-3 px-3', darkMode && 'text-[#858585]')}>管理模块</h3>
          <nav className="flex flex-col gap-1">
            {menuItems.map((item) =>
              item.disabled ? (
                <div
                  key={item.label}
                  className={cn(
                    'flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm opacity-35',
                    darkMode && 'text-[#cccccc]',
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
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? darkMode
                          ? 'bg-[#2d2d2d] font-bold text-[#e0e0e0]'
                          : 'bg-white/85 font-bold text-text-main shadow-sm'
                        : darkMode
                          ? 'font-semibold text-[#858585] hover:bg-[#2d2d2d] hover:text-[#cccccc]'
                          : 'font-semibold text-text-main/65 hover:bg-primary/5 hover:text-text-main',
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

      <main
        className={cn(
          'min-w-0 flex-1 overflow-hidden rounded-[24px] border shadow-sm',
          darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
        )}
      >
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
