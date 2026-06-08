import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, ArrowUpRight, Clock3, Coins, RefreshCw, TriangleAlert } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { getDailyUsage, getUsageLogs, getUsageSummary } from '@/services/llm';
import type { DailyUsageDTO, UsageLogDTO, UsageSummaryDTO } from '@/types/api';

const RANGE_DAYS = 14;
const HEATMAP_DAYS = 365;

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
  const [summary, setSummary] = useState<UsageSummaryDTO | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsageDTO[]>([]);
  const [heatmapUsage, setHeatmapUsage] = useState<DailyUsageDTO[]>([]);
  const [logs, setLogs] = useState<UsageLogDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; date: string; tokens: number } | null>(null);

  const range = useMemo(() => getRangeDates(RANGE_DAYS), []);
  const heatmapRange = useMemo(() => getRangeDates(HEATMAP_DAYS), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryResult, dailyResult, logResult, heatmapResult] = await Promise.all([
        getUsageSummary(range.startDate, range.endDate),
        getDailyUsage(range.startDate, range.endDate),
        getUsageLogs(range.startDate, range.endDate, 1, 10),
        getDailyUsage(heatmapRange.startDate, heatmapRange.endDate),
      ]);
      setSummary(summaryResult);
      setDailyUsage(dailyResult);
      setHeatmapUsage(heatmapResult);
      setLogs(logResult.items || []);
    } catch (error) {
      console.error('Failed to load usage data:', error);
    } finally {
      setLoading(false);
    }
  }, [range.endDate, range.startDate, heatmapRange.endDate, heatmapRange.startDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const peakTokens = Math.max(...dailyUsage.map((item) => item.totalTokens), 1);
  const heatmapPeak = Math.max(...heatmapUsage.map((item) => item.totalTokens), 1);

  // Generate heatmap dates
  const heatmapDates = useMemo(() => {
    const dates = [];
    const curr = new Date(heatmapRange.startDate);
    const end = new Date(heatmapRange.endDate);
    while (curr <= end) {
      dates.push(curr.toISOString().slice(0, 10));
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  }, [heatmapRange]);

  const heatmapFirstDayOfWeek = new Date(heatmapDates[0]).getDay();
  const heatmapEmptyCells = Array.from({ length: heatmapFirstDayOfWeek }).map((_, i) => i);
  const heatmapDataMap = useMemo(() => {
    const map: Record<string, DailyUsageDTO> = {};
    heatmapUsage.forEach((item) => {
      map[item.date] = item;
    });
    return map;
  }, [heatmapUsage]);

  return (
    <div className="flex h-full flex-col bg-bg-base">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-base/80 px-8 backdrop-blur-md">
        <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '用量' }]} />
        <button
          onClick={() => void loadData()}
          disabled={loading}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-text-main/40 transition-colors hover:bg-text-main/5 hover:text-text-main/70',
            loading && 'opacity-60',
          )}
          title="刷新数据"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              label="总调用频次"
              value={summary?.totalCalls ?? 0}
              icon={<Activity size={18} />}
              colorClass="text-blue-500 bg-blue-500/10"
            />
            <MetricCard
              label="总耗费额度"
              value={summary?.totalTokens ?? 0}
              icon={<Coins size={18} />}
              colorClass="text-emerald-500 bg-emerald-500/10"
            />
            <MetricCard
              label="提示词开销"
              value={summary?.promptTokens ?? 0}
              icon={<ArrowUpRight size={18} />}
              colorClass="text-purple-500 bg-purple-500/10"
            />
            <MetricCard
              label="平均响应延迟"
              value={`${summary?.averageLatencyMs ?? 0} ms`}
              icon={<Clock3 size={18} />}
              colorClass="text-orange-500 bg-orange-500/10"
            />
          </div>

          {/* GitHub-style Heatmap */}
          <div className="art-card rounded-2xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-base font-bold text-text-main">Token热力图</h3>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 overflow-x-auto pb-2 custom-scrollbar">
                <div className="grid grid-flow-col grid-rows-7 gap-1 w-max">
                  {heatmapEmptyCells.map((i) => (
                    <div key={`empty-${i}`} className="h-3 w-3 rounded-sm" />
                  ))}
                  {heatmapDates.map((date) => {
                    const data = heatmapDataMap[date];
                    const tokens = data ? data.totalTokens : 0;
                    let bgClass = 'bg-text-main/5'; // empty
                    if (tokens > 0) {
                      const ratio = tokens / heatmapPeak;
                      if (ratio > 0.75) bgClass = 'bg-emerald-500';
                      else if (ratio > 0.5) bgClass = 'bg-emerald-500/80';
                      else if (ratio > 0.25) bgClass = 'bg-emerald-500/60';
                      else bgClass = 'bg-emerald-500/30';
                    }

                    return (
                      <div
                        key={date}
                        className={cn(
                          'h-3 w-3 rounded-sm transition-colors hover:ring-1 hover:ring-border-subtle cursor-default',
                          bgClass,
                        )}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltipData({
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                            date,
                            tokens,
                          });
                        }}
                        onMouseLeave={() => setTooltipData(null)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="art-card rounded-2xl p-6">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text-main">近期趋势 ({RANGE_DAYS} 天)</h3>
                <p className="mt-1 text-xs text-text-main/50">按天统计模型 Token 消耗量与请求频次</p>
              </div>
              <div className="mono-label rounded-lg bg-text-main/5 px-3 py-1.5 text-text-main/50">
                {formatDateLabel(range.startDate)} - {formatDateLabel(range.endDate)}
              </div>
            </div>

            <div
              className="grid h-48 items-end gap-2 sm:gap-4"
              style={{ gridTemplateColumns: `repeat(${dailyUsage.length || 1}, minmax(0, 1fr))` }}
            >
              {dailyUsage.map((item) => {
                const heightPercentage = Math.max(
                  (item.totalTokens / peakTokens) * 100,
                  item.totalTokens === 0 ? 0 : 4,
                );
                return (
                  <div
                    key={item.date}
                    className="group relative flex h-full flex-col items-center justify-end gap-3 cursor-default"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltipData({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                        date: formatDateLabel(item.date),
                        tokens: item.totalTokens,
                      });
                    }}
                    onMouseLeave={() => setTooltipData(null)}
                  >
                    <div className="flex w-full flex-1 items-end justify-center">
                      <div
                        className="w-full max-w-[32px] rounded-t-md bg-primary/20 transition-all duration-500 ease-out group-hover:bg-primary"
                        style={{ height: `${heightPercentage}%` }}
                      />
                    </div>
                    <span className="mono-label text-[10px] text-text-main/40 transition-colors group-hover:text-primary">
                      {formatDateLabel(item.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="art-card flex flex-col rounded-2xl p-6">
              <h3 className="mb-6 text-base font-bold text-text-main">每日明细</h3>
              <div className="flex-1 space-y-3 overflow-y-auto">
                {dailyUsage.map((item) => (
                  <div
                    key={item.date}
                    className="flex items-center justify-between rounded-xl bg-text-main/5 p-4 transition-colors hover:bg-text-main/10"
                  >
                    <div>
                      <p className="text-sm font-bold text-text-main">{item.date}</p>
                      <p className="mono-label mt-1 text-text-main/40">请求 {formatNumber(item.calls)} 次</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-primary">{formatNumber(item.totalTokens)}</p>
                      <p className="mono-label mt-1 text-text-main/40">Tokens</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="art-card flex flex-col rounded-2xl p-6">
              <h3 className="mb-6 text-base font-bold text-text-main">近期调用记录</h3>
              <div className="flex-1 space-y-3 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle text-text-main/40">
                    <p className="text-sm">暂无用量记录</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-xl border border-border-subtle bg-bg-base/50 p-4 transition-colors hover:border-text-main/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-text-main">{log.modelName}</p>
                          <p className="mono-label mt-1.5 text-text-main/50">
                            {log.providerType} · {formatTime(log.createdAt)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'rounded-md px-2 py-1 text-[10px] font-bold tracking-wider',
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400',
                          )}
                        >
                          {log.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <StatPill label="Prompt" value={log.promptTokens} />
                        <StatPill label="Completion" value={log.completionTokens} />
                        <StatPill label="Total" value={log.totalTokens} />
                      </div>

                      {log.errorMessage && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                          <span className="break-words leading-relaxed">{log.errorMessage}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Global Tooltip Portal */}
      {tooltipData &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[99999] -translate-x-1/2 -translate-y-full mb-1.5 flex flex-col items-center drop-shadow-md"
            style={{ left: tooltipData.x, top: tooltipData.y }}
          >
            <div className="whitespace-nowrap rounded border border-border-subtle bg-bg-base px-2 py-1 text-center shadow-md">
              <p className="text-[10px] text-text-main/60">{tooltipData.date}</p>
              <p className="font-mono text-[11px] font-bold text-text-main">
                {formatNumber(tooltipData.tokens)}{' '}
                <span className="font-sans text-[9px] font-normal text-text-main/40 uppercase">Tokens</span>
              </p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  colorClass,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  colorClass: string;
}) {
  return (
    <div className="art-card flex flex-col justify-between rounded-2xl p-5 transition-transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <span className="mono-label text-text-main/50">{label}</span>
        <div className={cn('rounded-xl p-2.5', colorClass)}>{icon}</div>
      </div>
      <div className="mt-4 text-3xl font-bold tracking-tight text-text-main">{value}</div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-text-main/5 px-3 py-2 text-center transition-colors hover:bg-text-main/10">
      <div className="mono-label text-[10px] text-text-main/40 uppercase tracking-wider">{label}</div>
      <div className="mt-1 font-mono text-xs font-bold text-text-main">{formatNumber(value)}</div>
    </div>
  );
}
