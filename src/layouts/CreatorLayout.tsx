import { Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, PenSquare, LayoutDashboard, BarChart2 } from 'lucide-react';
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

export function CreatorLayout() {
  const navigate = useNavigate();

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
    <div className="flex h-screen w-full flex-col overflow-hidden bg-bg-base font-sans text-text-main">
      {/* Top Navbar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-base/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(RoutePaths.Blogs)}
            className="flex items-center gap-2 text-sm font-semibold text-text-main/70 transition-colors hover:text-primary"
          >
            <ArrowLeft size={16} />
            返回 LinkRag
          </button>
          <div className="h-4 w-px bg-border-subtle" />
          <h1 className="mono-label text-text-main/70">Creator Studio</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/creator/blogs/edit/new')}
            className="flex items-center gap-2 rounded-xl border border-border-subtle px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-main/70 transition-colors hover:border-primary hover:bg-primary/5 hover:text-text-main"
          >
            <PenSquare size={14} />
            写文章
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-border-subtle py-6">
          {menuItems.map((group, idx) => (
            <div key={idx} className="mb-6 px-4">
              <h3 className="mono-label mb-3 px-3">{group.group}</h3>
              <nav className="flex flex-col gap-1">
                {group.items.map((item, itemIdx) =>
                  item.disabled ? (
                    <div
                      key={itemIdx}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm opacity-35 transition-all cursor-not-allowed',
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
                            ? 'bg-primary/10 font-bold text-primary'
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

        {/* Content */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl p-6 lg:p-8">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
