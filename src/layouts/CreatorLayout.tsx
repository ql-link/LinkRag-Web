import { Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, PenSquare, LayoutDashboard, BarChart2 } from 'lucide-react';
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

export function CreatorLayout() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const menuItems = [
    {
      group: '创作中心',
      items: [
        { label: '数据概览', path: '#', icon: <LayoutDashboard size={16} />, disabled: true },
        { label: '文章管理', path: RoutePaths.CreatorBlogs, icon: <BookOpen size={16} /> },
        { label: '内容分析', path: '#', icon: <BarChart2 size={16} />, disabled: true },
      ],
    },
  ];

  return (
    <div
      className={cn(
        'flex h-screen w-full flex-col gap-2 overflow-hidden p-2 font-sans lg:gap-4 lg:p-4',
        darkMode ? 'bg-[#1f1f1f] text-[#d6d6d6]' : 'bg-bg-base text-text-main',
      )}
    >
      <header
        className={cn(
          'flex h-14 shrink-0 items-center justify-between rounded-2xl border px-4  sm:h-16 sm:px-5',
          darkMode ? 'border-[#3a3a3a] bg-[#2b2b2b]' : 'border-border-subtle bg-surface-card',
        )}
      >
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(RoutePaths.AdminPage)}
            className={cn(
              'flex items-center gap-2 text-xs font-bold transition-colors sm:text-sm',
              darkMode ? 'text-[#d6d6d6] hover:text-[#f2f2f2]' : 'text-text-main/70 hover:text-primary',
            )}
          >
            <ArrowLeft size={16} />
            返回后台管理
          </button>
          <div className={cn('hidden h-4 w-px sm:block', darkMode ? 'bg-[#3a3a3a]' : 'bg-border-subtle')} />
          <h1 className={cn('mono-label hidden sm:block', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/60')}>
            Creator Studio
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/creator/blogs/edit/new')}
            className={cn(
              'flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-bold transition-colors sm:px-4',
              darkMode
                ? 'border-[#3a3a3a] bg-[#303030] text-[#d6d6d6] hover:border-primary/50 hover:text-[#f2f2f2]'
                : 'border-border-subtle bg-surface-soft text-text-main/70 hover:border-primary/30 hover:bg-surface-card hover:text-text-main',
            )}
          >
            <PenSquare size={14} />
            写文章
          </button>
        </div>
      </header>

      <div
        className={cn(
          'flex min-h-0 flex-1 overflow-hidden rounded-[24px] border ',
          darkMode ? 'border-[#3a3a3a] bg-[#2b2b2b]' : 'border-border-subtle bg-white',
        )}
      >
        <aside
          className={cn(
            'hidden w-60 shrink-0 flex-col border-r py-6 lg:flex',
            darkMode ? 'border-[#3a3a3a] bg-[#2b2b2b]' : 'border-border-subtle bg-surface-card',
          )}
        >
          {menuItems.map((group, idx) => (
            <div key={idx} className="mb-6 px-4">
              <h3 className={cn('mono-label mb-3 px-3', darkMode && 'text-[#a6a6a6]')}>{group.group}</h3>
              <nav className="flex flex-col gap-1">
                {group.items.map((item, itemIdx) =>
                  item.disabled ? (
                    <div
                      key={itemIdx}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm opacity-35 transition-all cursor-not-allowed',
                        darkMode && 'text-[#d6d6d6]',
                      )}
                    >
                      {item.icon}
                      <span className="font-semibold">{item.label}</span>
                      <span className="ml-auto text-[10px] uppercase tracking-wider font-bold">开发中</span>
                    </div>
                  ) : (
                    <NavLink
                      key={itemIdx}
                      to={item.path}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                          isActive
                            ? darkMode
                              ? 'bg-[#303030] font-bold text-[#f2f2f2]'
                              : 'bg-primary/10 font-bold text-primary'
                            : darkMode
                              ? 'font-semibold text-[#a6a6a6] hover:bg-[#303030] hover:text-[#d6d6d6]'
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
          ))}
        </aside>

        <main className={cn('min-w-0 flex-1 overflow-y-auto', darkMode ? 'bg-[#1f1f1f]' : 'bg-bg-base')}>
          <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
