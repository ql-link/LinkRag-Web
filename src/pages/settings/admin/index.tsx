import { ArrowRight, BarChart3, BookOpen, Cpu, ScrollText, Settings2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Breadcrumb } from '@/components/Breadcrumb';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Routes } from '@/routes';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const isAdmin = user?.role === 'ADMIN';
  const modules = [
    {
      title: '用户看板',
      description: '查看用户规模、增长趋势、角色结构与登录活跃情况。',
      icon: BarChart3,
      path: Routes.AdminUsers,
      enabled: true,
    },
    {
      title: '博客管理',
      description: '管理官方博客文章、草稿和发布状态。',
      icon: BookOpen,
      path: Routes.AdminBlogs,
      enabled: true,
    },
    {
      title: '模型管理',
      description: '维护模型厂商、能力目录和 LinkRAG 平台配置。',
      icon: Cpu,
      path: Routes.AdminModels,
      enabled: true,
    },
    {
      title: '日志追踪',
      description: '按服务、级别和 trace_id 检索集中日志。',
      icon: ScrollText,
      path: Routes.AdminLogs,
      enabled: true,
    },
    {
      title: '配置管理',
      description: '后续用于集中管理平台级开关与策略。',
      icon: Settings2,
      path: '#',
      enabled: false,
    },
  ];

  return (
    <div className={cn('flex h-full min-h-0 flex-col', darkMode ? 'text-[#d6d6d6]' : 'text-text-main')}>
      <header
        className={cn(
          'flex min-h-16 shrink-0 items-center justify-between gap-4 border-b px-5 py-3 sm:px-8',
          darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle',
        )}
      >
        <Breadcrumb
          items={[{ label: '首页', path: Routes.Home }, { label: '设置' }, { label: '后台管理' }]}
          darkMode={darkMode}
        />
      </header>

      <main className={cn('min-h-0 flex-1 overflow-y-auto', darkMode ? 'bg-[#1f1f1f]' : 'bg-canvas')}>
        <section className="mx-auto w-full max-w-[1040px] px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">
          <div className="mb-7 flex flex-col gap-2">
            <div className={cn('mono-label', darkMode && 'text-[#a6a6a6]')}>Admin Console</div>
            <h1
              className={cn(
                'text-[24px] font-semibold leading-tight sm:text-[27px]',
                darkMode ? 'text-[#f2f2f2]' : 'text-ink',
              )}
            >
              后台管理
            </h1>
            <p className={cn('max-w-2xl text-[13px] leading-6', darkMode ? 'text-[#a6a6a6]' : 'text-muted')}>
              集中进入管理员功能模块。当前先保留核心入口，避免管理页变成信息堆叠。
            </p>
          </div>

          {!isAdmin ? (
            <div
              className={cn(
                'flex min-h-[260px] flex-col items-center justify-center border-y px-4 py-16 text-center',
                darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle',
              )}
            >
              <ShieldCheck size={30} className={cn('mb-4', darkMode ? 'text-[#a6a6a6]' : 'text-muted')} />
              <p className={cn('text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-ink')}>
                当前账户没有管理员权限
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {modules.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    type="button"
                    disabled={!item.enabled}
                    onClick={() => item.enabled && navigate(item.path)}
                    className={cn(
                      'group flex min-h-[136px] flex-col justify-between rounded-xl border p-4 text-left transition-[border-color,background-color,color] duration-200',
                      item.enabled
                        ? darkMode
                          ? 'border-[#3a3a3a] bg-[#242424] hover:border-[#4a4a4a] hover:bg-[#2b2b2b]'
                          : 'border-hairline bg-bg-card-solid hover:border-primary/30 hover:bg-white'
                        : darkMode
                          ? 'cursor-not-allowed border-[#3a3a3a] bg-transparent opacity-45'
                          : 'cursor-not-allowed border-hairline bg-transparent opacity-50',
                    )}
                  >
                    <span>
                      <span className="mb-3 flex items-center gap-2.5">
                        <Icon size={18} className={item.enabled ? 'text-primary' : 'text-muted'} />
                        <span className={cn('text-base font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-ink')}>
                          {item.title}
                        </span>
                      </span>
                      <span className={cn('block text-xs leading-5', darkMode ? 'text-[#a6a6a6]' : 'text-muted')}>
                        {item.description}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'mt-4 flex items-center gap-2 text-xs font-bold',
                        item.enabled ? 'text-text-secondary group-hover:text-ink' : 'text-muted',
                        darkMode && item.enabled && 'text-[#a6a6a6] group-hover:text-[#f2f2f2]',
                      )}
                    >
                      {item.enabled ? '进入模块' : '暂未开放'}
                      {item.enabled && (
                        <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
