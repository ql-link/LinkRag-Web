import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, PenSquare, LayoutDashboard, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { Routes as RoutePaths } from '@/routes';

function PageLoader() {
  const { darkMode } = useTheme();
  return (
    <div className={cn(
      'flex h-full items-center justify-center',
      darkMode ? 'text-[#858585]' : 'text-text-main/40',
    )}>
      <span className="text-xs uppercase tracking-[0.2em]">加载中...</span>
    </div>
  );
}

export function CreatorLayout() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const menuItems = [
    {
      group: '创作中心',
      items: [
        { label: '数据概览', path: '#', icon: <LayoutDashboard size={16} />, disabled: true },
        { label: '文章管理', path: RoutePaths.CreatorBlogs, icon: <BookOpen size={16} /> },
        { label: '内容分析', path: '#', icon: <BarChart2 size={16} />, disabled: true },
      ]
    }
  ];

  return (
    <div className={cn(
      'flex h-screen w-full flex-col font-sans overflow-hidden',
      darkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-[#fbfaf7] text-text-main'
    )}>
      {/* Top Navbar */}
      <header className={cn(
        'flex h-14 shrink-0 items-center justify-between border-b px-6',
        darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white'
      )}>
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(RoutePaths.Blogs)}
            className={cn(
              'flex items-center gap-2 text-sm font-semibold transition-colors',
              darkMode ? 'text-[#e0e0e0] hover:text-[#3b82f6]' : 'text-text-main hover:text-primary'
            )}
          >
            <ArrowLeft size={16} />
            返回 LinkRag
          </button>
          <div className={cn('h-4 w-px', darkMode ? 'bg-[#3c3c3c]' : 'bg-border-subtle')} />
          <h1 className="text-sm font-bold uppercase tracking-wider opacity-80">创作者中心</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/creator/blogs/edit/new')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all shadow-sm hover:shadow-md',
              darkMode ? 'bg-[#3b82f6] hover:bg-[#2563eb]' : 'bg-primary hover:bg-primary/90'
            )}
          >
            <PenSquare size={14} />
            写文章
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          'w-64 shrink-0 border-r py-6 flex flex-col',
          darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white'
        )}>
          {menuItems.map((group, idx) => (
            <div key={idx} className="mb-6 px-4">
              <h3 className="mb-3 px-3 text-xs font-bold uppercase tracking-widest opacity-50">
                {group.group}
              </h3>
              <nav className="flex flex-col gap-1">
                {group.items.map((item, itemIdx) => (
                  item.disabled ? (
                    <div
                      key={itemIdx}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all opacity-40 cursor-not-allowed',
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
                      className={({ isActive }) => cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all',
                        isActive 
                          ? (darkMode ? 'bg-[#3b82f6]/10 text-[#3b82f6] font-bold' : 'bg-primary/10 text-primary font-bold')
                          : (darkMode ? 'text-[#cccccc] hover:bg-[#2d2d2d]' : 'text-text-main/70 hover:bg-gray-50 hover:text-text-main font-semibold')
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </NavLink>
                  )
                ))}
              </nav>
            </div>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
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
