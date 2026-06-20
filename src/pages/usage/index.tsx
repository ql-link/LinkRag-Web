import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, CircleCheck, CircleX, Clock3, Coins, RefreshCw, TriangleAlert } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { getDailyUsage, getUsageLogs, getUsageSummary } from '@/services/llm';
import type { DailyUsageDTO, UsageLogDTO, UsageSummaryDTO } from '@/types/api';
import { useTheme } from '@/contexts/ThemeContext';

const RANGE_DAYS = 14;

function formatDateLabel(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value || 0);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getRangeDates(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const toIso = (date: Date) => date.toISOString().slice(0, 10);
  return { startDate: toIso(start), endDate: toIso(end) };
}

export default function UsagePage() {
  const { darkMode } = useTheme();
  const [summary, setSummary] = useState<UsageSummaryDTO | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsageDTO[]>([]);
  const [logs, setLogs] = useState<UsageLogDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => getRangeDates(RANGE_DAYS), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryResult, dailyResult, logResult] = await Promise.all([
        getUsageSummary(range.startDate, range.endDate),
        getDailyUsage(range.startDate, range.endDate),
        getUsageLogs(range.startDate, range.endDate, 1, 8),
      ]);
      setSummary(summaryResult);
      setDailyUsage(dailyResult);
      setLogs(logResult.items || []);
    } catch (error) {
      console.error('Failed to load usage data:', error);
    } finally {
      setLoading(false);
    }
  }, [range.startDate, range.endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const peakTokens = Math.max(...dailyUsage.map((item) => item.totalTokens), 1);

  return (
    <div className="h-full flex flex-col">
      <header
        className={cn(
          'h-16 px-8 flex items-center justify-between shrink-0 backdrop-blur-md',
          darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle border-b',
        )}
      >
        <div>
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '用量' }]} darkMode={darkMode} />
        </div>
        <button
          onClick={loadData}
          className={cn(
            'h-9 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-opacity',
            darkMode ? 'bg-[#094771] text-white hover:bg-[#0a5280]' : 'bg-text-main text-white hover:opacity-90',
          )}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </header>

      <main
        className={cn(
          'flex-1 overflow-y-auto',
          darkMode
            ? 'bg-[linear-gradient(180deg,#1f1f1f_0%,#242424_42%,#1f1f1f_100%)]'
            : 'bg-[linear-gradient(180deg,#f8f4ef_0%,#f4f1ed_44%,#f8f4ef_100%)]',
        )}
      >
        <section className="px-8 py-6 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              darkMode={darkMode}
              label="总调用"
              value={summary?.totalCalls ?? 0}
              icon={<Activity size={16} />}
            />
            <MetricCard
              darkMode={darkMode}
              label="总 Token"
              value={summary?.totalTokens ?? 0}
              icon={<Coins size={16} />}
            />
            <MetricCard
              darkMode={darkMode}
              label="提示词 Token"
              value={summary?.promptTokens ?? 0}
              icon={<ArrowUpRight size={16} />}
            />
            <MetricCard
              darkMode={darkMode}
              label="成功率"
              value={`${((summary?.successRate ?? 0) * 100).toFixed(2)}%`}
              icon={<CircleCheck size={16} />}
            />
            <MetricCard
              darkMode={darkMode}
              label="失败调用"
              value={summary?.failedCalls ?? 0}
              icon={<CircleX size={16} />}
            />
            <MetricCard
              darkMode={darkMode}
              label="平均延迟"
              value={`${summary?.averageLatencyMs ?? 0} ms`}
              icon={<Clock3 size={16} />}
            />
          </div>

          <div
            className={cn(
              'rounded-lg border px-5 py-4',
              darkMode ? 'bg-[#252526]/88 border-[#3c3c3c]' : 'bg-white/84 border-white/85 shadow-sm',
            )}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className={cn('text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                  最近 {RANGE_DAYS} 天趋势
                </h3>
                <p className={cn('text-[11px] mt-1', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                  按天统计调用次数与用量消耗
                </p>
              </div>
              <div className={cn('mono-label', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
                {range.startDate} ~ {range.endDate}
              </div>
            </div>

            <div
              className="grid gap-2 items-end h-[220px]"
              style={{ gridTemplateColumns: `repeat(${dailyUsage.length || 1}, minmax(0, 1fr))` }}
            >
              {dailyUsage.map((item) => (
                <div key={item.date} className="flex h-full flex-col items-center justify-end gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={cn(
                        'w-full rounded-t-md transition-all',
                        darkMode ? 'bg-[#3b82f6]/75' : 'bg-primary/75',
                      )}
                      style={{ height: `${Math.max((item.totalTokens / peakTokens) * 100, 6)}%` }}
                      title={`${item.date} ${item.totalTokens}`}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] rotate-[-45deg] origin-center whitespace-nowrap',
                      darkMode ? 'text-[#858585]' : 'text-text-main/45',
                    )}
                  >
                    {formatDateLabel(item.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div
              className={cn(
                'rounded-lg border px-5 py-4',
                darkMode ? 'bg-[#252526]/88 border-[#3c3c3c]' : 'bg-white/84 border-white/85 shadow-sm',
              )}
            >
              <h3 className={cn('text-sm font-bold mb-4', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>每日明细</h3>
              <div className="space-y-3">
                {dailyUsage.map((item) => (
                  <div
                    key={item.date}
                    className={cn(
                      'flex items-center justify-between rounded-lg px-3 py-2',
                      darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base/60',
                    )}
                  >
                    <div>
                      <p className={cn('text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                        {item.date}
                      </p>
                      <p className={cn('mono-label', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
                        调用 {formatNumber(item.calls)} 次
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                        {formatNumber(item.totalTokens)}
                      </p>
                      <p className={cn('mono-label', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>总量</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={cn(
                'rounded-lg border px-5 py-4',
                darkMode ? 'bg-[#252526]/88 border-[#3c3c3c]' : 'bg-white/84 border-white/85 shadow-sm',
              )}
            >
              <h3 className={cn('text-sm font-bold mb-4', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                最近调用记录
              </h3>
              <div className="space-y-3">
                {logs.length === 0 ? (
                  <div
                    className={cn(
                      'rounded-lg border border-dashed px-4 py-10 text-center',
                      darkMode ? 'border-[#3c3c3c] text-[#858585]' : 'border-border-subtle text-text-main/40',
                    )}
                  >
                    暂无用量记录
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        'rounded-lg px-3 py-3 border',
                        darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]' : 'border-border-subtle bg-bg-base/55',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={cn('text-sm font-bold truncate', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}
                          >
                            {log.modelName}
                          </p>
                          <p className={cn('mono-label mt-1', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
                            {log.providerType} · {formatTime(log.createdAt)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'rounded-full px-2 py-1 text-[10px] font-bold',
                            log.status === 'SUCCESS'
                              ? darkMode
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-emerald-50 text-emerald-700'
                              : darkMode
                                ? 'bg-red-500/15 text-red-300'
                                : 'bg-red-50 text-red-600',
                          )}
                        >
                          {log.status}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                        <StatPill darkMode={darkMode} label="Prompt" value={log.promptTokens} />
                        <StatPill darkMode={darkMode} label="Completion" value={log.completionTokens} />
                        <StatPill darkMode={darkMode} label="Total" value={log.totalTokens} />
                      </div>
                      {log.errorMessage && (
                        <div
                          className={cn(
                            'mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-[11px]',
                            darkMode ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-600',
                          )}
                        >
                          <TriangleAlert size={13} className="mt-0.5 shrink-0" />
                          <span className="break-words">{log.errorMessage}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricCard({
  darkMode,
  label,
  value,
  icon,
}: {
  darkMode?: boolean;
  label: string;
  value: number | string;
  icon: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-4',
        darkMode ? 'bg-[#252526]/88 border-[#3c3c3c]' : 'bg-white/84 border-white/85 shadow-sm',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className={cn('rounded-md p-2', darkMode ? 'bg-[#1e1e1e] text-[#3b82f6]' : 'bg-primary/10 text-primary')}>
          {icon}
        </div>
        <span className={cn('mono-label', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>{label}</span>
      </div>
      <div className={cn('mt-3 text-2xl font-bold serif-heading', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
        {value}
      </div>
    </div>
  );
}

function StatPill({ darkMode, label, value }: { darkMode?: boolean; label: string; value: number }) {
  return (
    <div className={cn('rounded-md px-2 py-2', darkMode ? 'bg-[#2d2d2d]' : 'bg-white')}>
      <div className={cn('mono-label', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>{label}</div>
      <div className={cn('text-sm font-bold mt-1', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
        {formatNumber(value)}
      </div>
    </div>
  );
}
