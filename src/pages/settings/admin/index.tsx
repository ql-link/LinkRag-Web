import { ArrowRight, FileText, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';

export default function AdminPage() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header
        className={cn(
          'flex min-h-16 shrink-0 items-center justify-between gap-4 border-b px-5 py-3 sm:px-8',
          darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white/80',
        )}
      >
        <Breadcrumb
          items={[{ label: '首页', path: Routes.Home }, { label: '设置' }, { label: '后台管理' }]}
          darkMode={darkMode}
        />
      </header>

      <main className={cn('min-h-0 flex-1 overflow-y-auto', darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base')}>
        <section className="mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-2">
            <div className={cn('mono-label', darkMode && 'text-[#858585]')}>Admin Console</div>
            <h1
              className={cn(
                'text-[24px] font-semibold leading-tight sm:text-[27px]',
                darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
              )}
            >
              后台管理
            </h1>
            <p className={cn('text-[13px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
              集中进入管理员功能模块，后续模块会在这里继续扩展。
            </p>
          </div>

          {!isAdmin ? (
            <div
              className={cn(
                'flex min-h-[260px] flex-col items-center justify-center border-y border-dashed px-4 py-16 text-center',
                darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
              )}
            >
              <ShieldCheck size={30} className={cn('mb-4', darkMode ? 'text-[#858585]' : 'text-text-main/35')} />
              <p className={cn('text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                当前账户没有管理员权限
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => navigate(Routes.CreatorBlogs)}
                className={cn(
                  'group flex min-h-[142px] flex-col justify-between rounded-2xl border p-5 text-left transition-all duration-300',
                  darkMode
                    ? 'border-[#3c3c3c] bg-[#252526]/62 hover:border-primary/50 hover:bg-[#2d2d2d]'
                    : 'border-border-subtle bg-white/55 hover:border-primary hover:bg-white/75',
                )}
              >
                <span>
                  <span
                    className={cn(
                      'mb-4 flex h-10 w-10 items-center justify-center rounded-xl',
                      darkMode ? 'bg-[#2d2d2d] text-[#c7dff8]' : 'bg-primary/10 text-primary',
                    )}
                  >
                    <FileText size={18} />
                  </span>
                  <span className={cn('block text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                    博客管理
                  </span>
                  <span
                    className={cn('mt-2 block text-xs leading-5', darkMode ? 'text-[#858585]' : 'text-text-main/55')}
                  >
                    管理官方博客文章、草稿和发布状态。
                  </span>
                </span>
                <span
                  className={cn(
                    'mt-4 flex items-center gap-2 text-xs font-bold',
                    darkMode ? 'text-[#cccccc]' : 'text-text-main/65',
                  )}
                >
                  进入模块
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
