import { ArrowRight, FileText, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useAuth } from '@/contexts/AuthContext';
import { Routes } from '@/routes';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-border-subtle px-5 py-3 sm:px-8">
        <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '设置' }, { label: '后台管理' }]} />
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-canvas">
        <section className="mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-2">
            <div className="mono-label">Admin Console</div>
            <h1 className="text-[24px] font-semibold leading-tight text-ink sm:text-[27px]">后台管理</h1>
            <p className="text-[13px] text-muted">集中进入管理员功能模块，后续模块会在这里继续扩展。</p>
          </div>

          {!isAdmin ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center border-y border-dashed border-border-subtle px-4 py-16 text-center">
              <ShieldCheck size={30} className="mb-4 text-muted" />
              <p className="text-sm font-bold text-ink">当前账户没有管理员权限</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => navigate(Routes.CreatorBlogs)}
                className="group flex min-h-[142px] flex-col justify-between rounded-2xl border border-hairline bg-bg-card-solid p-5 text-left transition-all duration-300 hover:border-primary/40"
              >
                <span>
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText size={18} />
                  </span>
                  <span className="block text-base font-bold text-ink">博客管理</span>
                  <span className="mt-2 block text-xs leading-5 text-text-secondary">
                    管理官方博客文章、草稿和发布状态。
                  </span>
                </span>
                <span className="mt-4 flex items-center gap-2 text-xs font-bold text-text-secondary">
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
