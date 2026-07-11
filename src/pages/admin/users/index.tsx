import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Activity, BarChart3, RefreshCw, ShieldCheck, TrendingDown, TrendingUp, UserCheck, Users } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { getAdminUserDashboard } from '@/services/admin-users';
import type { AdminUserDashboardRange } from '@/services/admin-users';
import type { AdminUserDashboardDTO, AdminUserTrendPointDTO } from '@/types/api';
import { formatAdminDashboardDate } from './formatters';

const RANGE_OPTIONS: AdminUserDashboardRange[] = [7, 30, 90];

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value || 0);
}

function formatGrowth(value: number | null) {
  if (value === null) return '暂无对比';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${(value * 100).toFixed(1)}%`;
}

function GrowthBadge({ value, darkMode }: { value: number | null; darkMode: boolean }) {
  const positive = value !== null && value > 0;
  const negative = value !== null && value < 0;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Activity;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold',
        positive && (darkMode ? 'bg-emerald-400/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700'),
        negative && (darkMode ? 'bg-rose-400/10 text-rose-300' : 'bg-rose-50 text-rose-700'),
        !positive && !negative && (darkMode ? 'bg-white/[0.06] text-[#a6a6a6]' : 'bg-ink/[0.04] text-muted'),
      )}
    >
      <Icon size={12} />
      {formatGrowth(value)}
    </span>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  growth,
  darkMode,
}: {
  label: string;
  value: number;
  note: string;
  icon: typeof Users;
  growth?: number | null;
  darkMode: boolean;
}) {
  return (
    <article
      className={cn(
        'min-w-0 rounded-xl border p-4 sm:p-5',
        darkMode ? 'border-[#3a3a3a] bg-[#242424]' : 'border-hairline bg-bg-card-solid',
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className={cn('rounded-lg p-2', darkMode ? 'bg-white/[0.055]' : 'bg-primary/10')}>
          <Icon size={18} className="text-primary" />
        </span>
        {growth !== undefined && <GrowthBadge value={growth} darkMode={darkMode} />}
      </div>
      <div className={cn('text-2xl font-semibold tabular-nums', darkMode ? 'text-[#f2f2f2]' : 'text-ink')}>
        {formatNumber(value)}
      </div>
      <div className={cn('mt-1 text-sm font-bold', darkMode ? 'text-[#d6d6d6]' : 'text-text-main')}>{label}</div>
      <p className={cn('mt-1 text-xs leading-5', darkMode ? 'text-[#a6a6a6]' : 'text-muted')}>{note}</p>
    </article>
  );
}

function DistributionBar({
  label,
  value,
  total,
  colorClass,
  darkMode,
}: {
  label: string;
  value: number;
  total: number;
  colorClass: string;
  darkMode: boolean;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className={darkMode ? 'text-[#a6a6a6]' : 'text-muted'}>{label}</span>
        <span className={cn('font-bold tabular-nums', darkMode ? 'text-[#f2f2f2]' : 'text-ink')}>
          {formatNumber(value)} · {percentage.toFixed(1)}%
        </span>
      </div>
      <div className={cn('h-2 overflow-hidden rounded-full', darkMode ? 'bg-white/[0.06]' : 'bg-ink/[0.055]')}>
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function TrendChart({ data, darkMode }: { data: AdminUserTrendPointDTO[]; darkMode: boolean }) {
  const gradientId = useId().replace(/:/g, '');
  const width = 760;
  const height = 250;
  const inset = { top: 20, right: 16, bottom: 32, left: 34 };
  const maxValue = Math.max(1, ...data.flatMap((item) => [item.newUsers, item.activeUsers]));
  const x = (index: number) =>
    inset.left + (data.length <= 1 ? 0 : (index / (data.length - 1)) * (width - inset.left - inset.right));
  const y = (value: number) => inset.top + (1 - value / maxValue) * (height - inset.top - inset.bottom);
  const pathFor = (key: 'newUsers' | 'activeUsers') =>
    data.map((item, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(item[key])}`).join(' ');
  const labelIndexes =
    data.length <= 7 ? data.map((_, index) => index) : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  if (data.length === 0) {
    return (
      <div className={cn('flex h-64 items-center justify-center text-sm', darkMode ? 'text-[#a6a6a6]' : 'text-muted')}>
        暂无趋势数据
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[250px] min-w-[620px] w-full"
        role="img"
        aria-label="新增用户与活跃用户趋势图"
      >
        <defs>
          <linearGradient id={`${gradientId}-active`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4A373" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#D4A373" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((ratio) => {
          const lineY = inset.top + ratio * (height - inset.top - inset.bottom);
          return (
            <line
              key={ratio}
              x1={inset.left}
              x2={width - inset.right}
              y1={lineY}
              y2={lineY}
              stroke={darkMode ? '#3a3a3a' : '#e7e1d9'}
              strokeDasharray="4 5"
            />
          );
        })}
        <path
          d={`${pathFor('activeUsers')} L ${x(data.length - 1)} ${height - inset.bottom} L ${x(0)} ${height - inset.bottom} Z`}
          fill={`url(#${gradientId}-active)`}
        />
        <path
          d={pathFor('activeUsers')}
          fill="none"
          stroke="#D4A373"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={pathFor('newUsers')}
          fill="none"
          stroke={darkMode ? '#9ca3af' : '#475569'}
          strokeWidth="2"
          strokeDasharray="6 5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {labelIndexes.map((index) => (
          <text
            key={index}
            x={x(index)}
            y={height - 8}
            textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}
            fontSize="11"
            fill={darkMode ? '#a6a6a6' : '#78716c'}
          >
            {formatAdminDashboardDate(data[index].date)}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function AdminUsersPage() {
  const { darkMode } = useTheme();
  const [days, setDays] = useState<AdminUserDashboardRange>(30);
  const [data, setData] = useState<AdminUserDashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const requestSequence = useRef(0);

  const loadDashboard = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setFailed(false);
    try {
      const result = await getAdminUserDashboard(days);
      if (requestId === requestSequence.current) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to load admin user dashboard:', error);
      if (requestId === requestSequence.current) {
        setFailed(true);
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [days]);

  useEffect(() => {
    void loadDashboard();
    return () => {
      requestSequence.current += 1;
    };
  }, [loadDashboard]);

  const cards = useMemo(
    () =>
      data
        ? [
            { label: '用户总量', value: data.totalUsers, note: '包含普通用户与管理员', icon: Users },
            {
              label: '周期新增',
              value: data.newUsers.current,
              note: `近 ${data.rangeDays} 天注册用户`,
              icon: UserCheck,
              growth: data.newUsers.growthRate,
            },
            {
              label: '周期活跃',
              value: data.activeUsers.current,
              note: `近 ${data.rangeDays} 天成功登录用户`,
              icon: Activity,
              growth: data.activeUsers.growthRate,
            },
            { label: '启用用户', value: data.breakdown.enabled, note: '当前可正常登录的账户', icon: ShieldCheck },
          ]
        : [],
    [data],
  );

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-[14px] border',
        darkMode ? 'border-[#3a3a3a] bg-[#242424] text-[#d6d6d6]' : 'border-border-subtle bg-canvas text-text-main',
      )}
    >
      <header
        className={cn(
          'flex min-h-16 shrink-0 items-center border-b px-4 py-3 sm:px-6 lg:px-8',
          darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle',
        )}
      >
        <Breadcrumb
          items={[{ label: '后台管理', path: Routes.AdminPage }, { label: '用户看板' }]}
          darkMode={darkMode}
        />
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
        <section className="mx-auto w-full max-w-[1180px]">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className={cn('mono-label mb-2', darkMode && 'text-[#a6a6a6]')}>User Analytics</div>
              <h1 className={cn('text-2xl font-semibold sm:text-[28px]', darkMode ? 'text-[#f2f2f2]' : 'text-ink')}>
                用户统计看板
              </h1>
              <p className={cn('mt-2 text-xs leading-5 sm:text-sm', darkMode ? 'text-[#a6a6a6]' : 'text-muted')}>
                统计时区 Asia/Shanghai · 活跃用户按成功登录去重
              </p>
            </div>
            <div
              className={cn(
                'grid grid-cols-3 rounded-lg border p-1',
                darkMode ? 'border-[#3a3a3a] bg-[#1f1f1f]' : 'border-hairline bg-white',
              )}
              aria-label="统计周期"
            >
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDays(option)}
                  className={cn(
                    'min-h-10 rounded-md px-3 text-xs font-bold transition-colors sm:px-4',
                    days === option
                      ? darkMode
                        ? 'bg-white/[0.09] text-[#f2f2f2]'
                        : 'bg-ink text-white'
                      : darkMode
                        ? 'text-[#a6a6a6] hover:text-[#f2f2f2]'
                        : 'text-muted hover:text-ink',
                  )}
                  aria-pressed={days === option}
                >
                  近 {option} 天
                </button>
              ))}
            </div>
          </div>

          {loading && !data ? (
            <div
              className={cn(
                'flex min-h-[360px] items-center justify-center rounded-xl border',
                darkMode ? 'border-[#3a3a3a]' : 'border-hairline bg-white',
              )}
            >
              <RefreshCw size={22} className="animate-spin text-primary" aria-label="正在加载" />
            </div>
          ) : failed && !data ? (
            <div
              className={cn(
                'flex min-h-[360px] flex-col items-center justify-center rounded-xl border px-4 text-center',
                darkMode ? 'border-[#3a3a3a]' : 'border-hairline bg-white',
              )}
            >
              <BarChart3 size={30} className={darkMode ? 'text-[#a6a6a6]' : 'text-muted'} />
              <p className={cn('mt-4 text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-ink')}>用户统计加载失败</p>
              <p className={cn('mt-1 text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-muted')}>
                请确认服务可用后重新加载。
              </p>
              <button
                type="button"
                onClick={() => void loadDashboard()}
                className="mt-5 min-h-10 rounded-lg bg-ink px-4 text-xs font-bold text-white transition-opacity hover:opacity-85 dark:bg-[#f2f2f2] dark:text-[#1f1f1f]"
              >
                重新加载
              </button>
            </div>
          ) : data ? (
            <div className={cn('space-y-4 transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
              {failed && (
                <div
                  role="alert"
                  className={cn(
                    'flex flex-col gap-3 rounded-xl border px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between',
                    darkMode
                      ? 'border-amber-300/20 bg-amber-300/[0.06] text-amber-100'
                      : 'border-amber-200 bg-amber-50 text-amber-900',
                  )}
                >
                  <span>
                    近 {days} 天数据加载失败，当前仍展示近 {data.rangeDays} 天的最近成功结果。
                  </span>
                  <button
                    type="button"
                    onClick={() => void loadDashboard()}
                    className={cn(
                      'min-h-10 shrink-0 rounded-lg px-3 font-bold transition-colors',
                      darkMode ? 'bg-white/[0.08] hover:bg-white/[0.12]' : 'bg-white hover:bg-amber-100',
                    )}
                  >
                    重新加载
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                  <MetricCard key={card.label} {...card} darkMode={darkMode} />
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
                <section
                  className={cn(
                    'rounded-xl border p-4 sm:p-5',
                    darkMode ? 'border-[#3a3a3a] bg-[#242424]' : 'border-hairline bg-bg-card-solid',
                  )}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className={cn('text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-ink')}>用户趋势</h2>
                      <p className={cn('mt-1 text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-muted')}>
                        每日新增与成功登录活跃人数
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <i className="h-0.5 w-4 bg-primary" />
                        活跃用户
                      </span>
                      <span className="flex items-center gap-1.5">
                        <i className={cn('h-0.5 w-4', darkMode ? 'bg-gray-400' : 'bg-slate-600')} />
                        新增用户
                      </span>
                    </div>
                  </div>
                  <TrendChart data={data.trend} darkMode={darkMode} />
                </section>

                <section
                  className={cn(
                    'rounded-xl border p-4 sm:p-5',
                    darkMode ? 'border-[#3a3a3a] bg-[#242424]' : 'border-hairline bg-bg-card-solid',
                  )}
                >
                  <h2 className={cn('text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-ink')}>用户结构</h2>
                  <p className={cn('mt-1 text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-muted')}>
                    当前账户角色与启用状态
                  </p>
                  <div className="mt-6 space-y-5">
                    <DistributionBar
                      label="普通用户"
                      value={data.breakdown.user}
                      total={data.totalUsers}
                      colorClass="bg-primary"
                      darkMode={darkMode}
                    />
                    <DistributionBar
                      label="管理员"
                      value={data.breakdown.admin}
                      total={data.totalUsers}
                      colorClass="bg-slate-500"
                      darkMode={darkMode}
                    />
                    <div className={cn('my-2 border-t', darkMode ? 'border-[#3a3a3a]' : 'border-hairline')} />
                    <DistributionBar
                      label="启用账户"
                      value={data.breakdown.enabled}
                      total={data.totalUsers}
                      colorClass="bg-emerald-500"
                      darkMode={darkMode}
                    />
                    <DistributionBar
                      label="禁用账户"
                      value={data.breakdown.disabled}
                      total={data.totalUsers}
                      colorClass="bg-rose-400"
                      darkMode={darkMode}
                    />
                  </div>
                </section>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
