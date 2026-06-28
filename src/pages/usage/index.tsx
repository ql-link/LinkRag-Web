import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  CalendarDays,
  CircleCheck,
  CircleX,
  Clock3,
  Coins,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { getProviderIcon } from '@/lib/provider-icons';
import { getModelDisplayName } from '@/lib/model-display';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { getDailyUsage, getUsageByModel, getUsageLogs, getUsageSummary, getUsageTrend } from '@/services/llm';
import type { DailyUsageDTO, ModelUsageDTO, UsageLogDTO, UsageSummaryDTO, UsageTrendDTO } from '@/types/api';

const RANGE_DAYS = 14;
const USAGE_STAGE = 'all';

function formatDateLabel(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value || 0);
}

function formatCompactTokens(value: number) {
  if (value >= 10_000) {
    return `${(value / 10_000).toFixed(value >= 100_000 ? 1 : 2)} 万 tokens`;
  }
  return `${formatNumber(value)} tokens`;
}

function formatLatency(value: number | null | undefined) {
  return `${Math.round(value ?? 0)} ms`;
}

function formatPercent(value: number | null | undefined, digits = 1) {
  return `${((value ?? 0) * 100).toFixed(digits)}%`;
}

function formatGrowth(value: number | null | undefined) {
  if (value === null || value === undefined) return '暂无对比';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${(value * 100).toFixed(1)}%`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDigits(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function getRangeDates(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { startDate: formatLocalDate(start), endDate: formatLocalDate(end) };
}

function fillDailyUsage(startDate: string, endDate: string, data: DailyUsageDTO[]) {
  const dataByDate = new Map(data.map((item) => [item.date, item]));
  const result: DailyUsageDTO[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (cursor <= end) {
    const date = formatLocalDate(cursor);
    result.push(
      dataByDate.get(date) ?? {
        date,
        calls: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function isSuccessStatus(status: string) {
  return status.toLowerCase() === 'success';
}

function getStatusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'success') return '成功';
  if (normalized === 'partial') return '部分成功';
  if (normalized === 'failed') return '失败';
  return status;
}

function getErrorLabel(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();
  if (
    normalized.includes('rate_limit') ||
    normalized.includes('rate limit') ||
    normalized.includes('too many requests')
  ) {
    return '请求过于频繁';
  }
  if (normalized.includes('timeout') || normalized.includes('timed out')) {
    return '请求超时';
  }
  if (normalized.includes('quota') || normalized.includes('insufficient')) {
    return '额度不足';
  }
  if (normalized.includes('unauthorized') || normalized.includes('invalid api key')) {
    return '鉴权失败';
  }
  return '调用异常';
}

export default function UsagePage() {
  const [summary, setSummary] = useState<UsageSummaryDTO | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsageDTO[]>([]);
  const [modelUsage, setModelUsage] = useState<ModelUsageDTO[]>([]);
  const [trend, setTrend] = useState<UsageTrendDTO | null>(null);
  const [logs, setLogs] = useState<UsageLogDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState(() => getRangeDates(RANGE_DAYS));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryResult, dailyResult, modelResult, trendResult, logResult] = await Promise.all([
        getUsageSummary(range.startDate, range.endDate, USAGE_STAGE),
        getDailyUsage(range.startDate, range.endDate, USAGE_STAGE),
        getUsageByModel(range.startDate, range.endDate),
        getUsageTrend(range.startDate, range.endDate),
        getUsageLogs(range.startDate, range.endDate, 1, 8, USAGE_STAGE),
      ]);
      setSummary(summaryResult);
      setDailyUsage(fillDailyUsage(range.startDate, range.endDate, dailyResult));
      setModelUsage(modelResult);
      setTrend(trendResult);
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

  const hasDailyUsage = dailyUsage.some((item) => item.totalTokens > 0 || item.calls > 0);
  const topModels = modelUsage.slice(0, 6);
  const today = useMemo(() => formatLocalDate(new Date()), []);
  const showSkeleton = loading && summary === null;

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="flex shrink-0 items-center justify-end px-4 pt-3 pb-2 lg:h-16 lg:justify-between lg:px-8 lg:py-0">
        <div className="hidden lg:block">
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '用量' }]} />
        </div>
        <div className="flex items-center gap-2">
          <RangePicker max={today} range={range} onApply={setRange} />
          <button
            onClick={loadData}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border-subtle bg-surface-soft px-3 text-xs font-bold text-text-secondary transition-colors hover:border-ink/20 hover:bg-surface-card hover:text-ink"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden lg:inline">刷新</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-canvas">
        <section className="space-y-5 px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:space-y-6 lg:px-8 lg:py-6 lg:pb-6">
          {showSkeleton ? (
            <UsageSkeleton />
          ) : (
            <>
              <UsageHero summary={summary} range={range} />

              <section className="hidden border-t border-border-subtle/80 pt-5 lg:block">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-ink">Token 趋势</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <GrowthPill label="Token 环比" value={trend?.tokenGrowthRate ?? null} />
                    <GrowthPill label="调用环比" value={trend?.callGrowthRate ?? null} />
                    <div className="mono-label text-muted-soft">
                      {range.startDate} ~ {range.endDate}
                    </div>
                  </div>
                </div>

                {hasDailyUsage ? (
                  <TokenLineChart data={dailyUsage} />
                ) : (
                  <EmptyBlock icon={<BarChart3 size={18} />} text="当前周期暂无用量数据" />
                )}
              </section>

              <div className="grid grid-cols-1 gap-5 lg:border-t lg:border-border-subtle/80 lg:pt-5 xl:h-[360px] xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <section className="flex min-h-0 flex-col">
                  <h3 className="mb-3 text-sm font-bold text-ink lg:mb-4">模型用量</h3>
                  <div className="min-h-0 flex-1">
                    {topModels.length === 0 ? (
                      <EmptyBlock icon={<Coins size={18} />} text="暂无模型用量" />
                    ) : (
                      <ModelUsagePie data={modelUsage} />
                    )}
                  </div>
                </section>

                <section className="flex min-h-0 flex-col">
                  <h3 className="mb-3 text-sm font-bold text-ink lg:mb-4">最近调用</h3>
                  <div className="min-h-0 flex-1">
                    {logs.length === 0 ? (
                      <EmptyBlock icon={<Activity size={18} />} text="暂无调用记录" />
                    ) : (
                      <RecentCallsList logs={logs} />
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function UsageSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="正在加载用量数据">
      <div className="py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-surface-card" />
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-surface-card" />
                <div className="h-3 w-40 rounded bg-surface-soft" />
              </div>
            </div>
            <div className="h-10 w-48 rounded-lg bg-surface-card" />
            <div className="h-4 w-32 rounded bg-surface-soft" />
          </div>
          <div className="grid grid-cols-2 gap-5 lg:min-w-[260px]">
            {[0, 1].map((item) => (
              <div key={item} className="space-y-2">
                <div className="h-3 w-16 rounded bg-surface-soft" />
                <div className="h-6 w-20 rounded bg-surface-card" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 pt-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="space-y-2">
              <div className="h-3 w-20 rounded bg-surface-soft" />
              <div className="h-5 w-24 rounded bg-surface-card" />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border-subtle/80 pt-5">
        <div className="mb-4 h-4 w-24 rounded bg-surface-card" />
        <div className="h-[220px] w-full rounded-lg bg-surface-soft" />
      </div>

      <div className="grid grid-cols-1 gap-5 border-t border-border-subtle/80 pt-5 xl:grid-cols-2">
        <div className="space-y-4 pt-5">
          <div className="h-4 w-20 rounded bg-surface-card" />
          <div className="mx-auto h-[170px] w-[170px] rounded-full bg-surface-soft" />
        </div>
        <div className="space-y-3 pt-5">
          <div className="h-4 w-20 rounded bg-surface-card" />
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-12 w-full rounded-lg bg-surface-soft" />
          ))}
        </div>
      </div>
    </div>
  );
}

function UsageHero({
  summary,
  range,
}: {
  summary: UsageSummaryDTO | null;
  range: { startDate: string; endDate: string };
}) {
  const secondaryItems = [
    {
      label: '输入 Token',
      value: formatCompactTokens(summary?.promptTokens ?? 0),
      icon: <ArrowDownToLine size={17} className="text-muted" />,
    },
    {
      label: '输出 Token',
      value: formatCompactTokens(summary?.completionTokens ?? 0),
      icon: <ArrowUpFromLine size={17} className="text-muted" />,
    },
    {
      label: '平均延迟',
      value: formatLatency(summary?.averageLatencyMs),
      icon: <Clock3 size={17} className="text-muted" />,
    },
    {
      label: '失败调用',
      value: formatNumber(summary?.failedCalls ?? 0),
      icon: <CircleX size={17} className="text-muted" />,
    },
  ];

  return (
    <div className="py-2 lg:py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="hidden items-center gap-3 lg:flex">
            <div className="rounded-md bg-transparent p-2">
              <Zap size={18} className="text-info" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Token 消耗</h2>
              <p className="mono-label mt-1 text-muted-soft">
                {range.startDate} ~ {range.endDate} · 全链路口径
              </p>
            </div>
          </div>
          <div className="break-words text-4xl font-bold leading-none tracking-normal text-ink sm:text-5xl lg:mt-4">
            {formatNumber(summary?.totalTokens ?? 0)}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-text-secondary">
              ≈ {formatCompactTokens(summary?.totalTokens ?? 0)}
            </p>
            <p className="text-xs font-medium text-muted lg:hidden">{getRangeLabel(range)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:min-w-[260px] lg:gap-5 lg:pt-1">
          <div className="min-w-0 text-ink">
            <div className="mb-1 text-xs font-bold text-muted lg:mb-1.5">总调用</div>
            <div className="flex items-center gap-2 text-lg font-bold lg:text-xl">
              <Activity size={17} className="hidden text-muted lg:block" />
              {formatNumber(summary?.totalCalls ?? 0)}
            </div>
          </div>
          <div className="min-w-0 text-ink">
            <div className="mb-1 text-xs font-bold text-muted lg:mb-1.5">成功率</div>
            <div className="flex items-center gap-2 text-lg font-bold text-success lg:text-xl">
              <CircleCheck size={17} className="hidden lg:block" />
              {formatPercent(summary?.successRate, 1)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 hidden grid-cols-2 gap-x-5 gap-y-3 lg:grid xl:grid-cols-4">
        {secondaryItems.map((item) => (
          <div key={item.label} className="min-w-0">
            <div className="flex items-center gap-2">
              {item.icon}
              <span className="text-sm font-bold text-text-secondary">{item.label}</span>
            </div>
            <div className="mt-2 text-base font-bold text-ink">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 hidden mono-label text-muted-soft lg:block">
        成功 {formatNumber(summary?.successCalls ?? 0)} · 失败 {formatNumber(summary?.failedCalls ?? 0)}
      </div>
    </div>
  );
}

function getRangeLabel(range: { startDate: string; endDate: string }) {
  const today = formatLocalDate(new Date());
  if (range.startDate === today && range.endDate === today) return '当日';

  const presets = [
    { days: 7, label: '7d' },
    { days: 14, label: '14d' },
    { days: 30, label: '30d' },
  ];
  const matchedPreset = presets.find((preset) => {
    const presetRange = getRangeDates(preset.days);
    return presetRange.startDate === range.startDate && presetRange.endDate === range.endDate;
  });
  return matchedPreset?.label ?? `${range.startDate} ~ ${range.endDate}`;
}

function RangePicker({
  range,
  max,
  onApply,
}: {
  range: { startDate: string; endDate: string };
  max: string;
  onApply: (range: { startDate: string; endDate: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState(range);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const presets = [
    { label: '当日', range: () => ({ startDate: max, endDate: max }) },
    { label: '7d', range: () => getRangeDates(7) },
    { label: '14d', range: () => getRangeDates(14) },
    { label: '30d', range: () => getRangeDates(30) },
  ];
  const isValidRange =
    /^\d{4}-\d{2}-\d{2}$/.test(draftRange.startDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(draftRange.endDate) &&
    draftRange.startDate <= draftRange.endDate &&
    draftRange.endDate <= max;

  function openPicker() {
    setDraftRange(range);
    setOpen((value) => !value);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && pickerRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || !isValidRange) return;
    if (draftRange.startDate === range.startDate && draftRange.endDate === range.endDate) return;
    onApply(draftRange);
  }, [draftRange, isValidRange, onApply, open, range.endDate, range.startDate]);

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        onClick={openPicker}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border-subtle bg-surface-soft px-3 text-xs font-bold text-text-secondary transition-colors hover:border-ink/20 hover:bg-surface-card hover:text-ink"
      >
        <CalendarDays size={15} />
        {getRangeLabel(range)}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-hairline bg-bg-card-solid p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {presets.map((preset) => {
              const presetRange = preset.range();
              const active =
                draftRange.startDate === presetRange.startDate && draftRange.endDate === presetRange.endDate;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setDraftRange(presetRange);
                    onApply(presetRange);
                  }}
                  className={cn(
                    'h-8 rounded-md border px-3 text-xs font-bold transition-colors',
                    active
                      ? 'border-ink/20 bg-ink/[0.055] text-ink'
                      : 'border-border-subtle bg-surface-soft text-text-secondary hover:border-ink/20 hover:bg-surface-card hover:text-ink',
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="pt-1">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="min-w-0">
                <span className="mono-label mb-1 block text-muted-soft">开始日期</span>
                <DateTextInput
                  value={draftRange.startDate}
                  max={draftRange.endDate}
                  onChange={(value) => setDraftRange((prev) => ({ ...prev, startDate: value }))}
                />
              </label>
              <label className="min-w-0">
                <span className="mono-label mb-1 block text-muted-soft">结束日期</span>
                <DateTextInput
                  value={draftRange.endDate}
                  min={draftRange.startDate}
                  max={max}
                  onChange={(value) => setDraftRange((prev) => ({ ...prev, endDate: value }))}
                />
              </label>
            </div>

            <div className="mono-label mt-3 text-muted-soft">输入 8 位数字后自动应用</div>
          </div>
        </div>
      )}
    </div>
  );
}

function DateTextInput({
  value,
  min,
  max,
  onChange,
}: {
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="YYYYMMDD"
      value={value}
      onChange={(event) => {
        onChange(formatDateDigits(event.target.value));
      }}
      onBlur={() => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
        if (min && value < min) onChange(min);
        if (max && value > max) onChange(max);
      }}
      className="h-9 w-full rounded-md border border-hairline bg-canvas px-2.5 text-xs font-bold text-ink outline-none transition-colors focus:border-info/45"
    />
  );
}

function GrowthPill({ label, value }: { label: string; value: number | null }) {
  const Icon = value !== null && value < 0 ? TrendingDown : TrendingUp;
  const hasValue = value !== null;
  const toneClass =
    value === null || value === 0
      ? 'bg-surface-soft text-muted'
      : value > 0
        ? 'bg-warning/10 text-warning'
        : 'bg-info/10 text-info';
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold', toneClass)}
      title={label}
    >
      {hasValue && <Icon size={13} />}
      <span>{label}</span>
      <span>{formatGrowth(value)}</span>
    </span>
  );
}

const MODEL_COLORS = ['#4f7fa8', '#5db8a6', '#72a85d', '#d68a5f', '#a97ac7', '#c6a24a'];

function ModelUsagePie({ data }: { data: ModelUsageDTO[] }) {
  const topItems = data.slice(0, 5);
  const otherItems = data.slice(5);
  const otherTokens = otherItems.reduce((sum, item) => sum + item.totalTokens, 0);
  const otherCalls = otherItems.reduce((sum, item) => sum + item.calls, 0);
  const chartItems = otherTokens > 0 ? [...topItems, createOtherModelUsage(otherTokens, otherCalls)] : topItems;
  const totalTokens = chartItems.reduce((sum, item) => sum + item.totalTokens, 0);
  const segments = buildPieSegments(chartItems, totalTokens);

  return (
    <div className="grid h-full content-center items-center gap-5 md:grid-cols-[160px_minmax(0,1fr)]">
      <div className="relative mx-auto hidden h-[164px] w-[164px] md:block">
        <svg viewBox="0 0 170 170" className="h-full w-full" role="img" aria-label="模型用量饼图">
          <circle cx="85" cy="85" r="59" fill="none" stroke="var(--color-surface-soft)" strokeWidth="24" />
          <g className="[filter:drop-shadow(0_2px_3px_rgba(20,20,19,0.08))]">
            {segments.map((segment, index) => (
              <path
                key={`${segment.item.providerType}-${segment.item.modelName}`}
                d={describePieSegment(segment, segments.length)}
                fill="none"
                stroke={MODEL_COLORS[index % MODEL_COLORS.length]}
                strokeLinecap="butt"
                strokeWidth="24"
              >
                <title>
                  {getModelDisplayName(segment.item)} ·{' '}
                  {formatPercent(totalTokens > 0 ? segment.item.totalTokens / totalTokens : 0, 1)} ·{' '}
                  {formatNumber(segment.item.totalTokens)} Token
                </title>
              </path>
            ))}
          </g>
          <circle cx="85" cy="85" r="43" fill="var(--color-canvas)" stroke="var(--color-hairline-soft)" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="max-w-[94px] truncate text-lg font-bold text-ink">
            {formatCompactTokens(totalTokens).replace(' tokens', '')}
          </span>
          <span className="mono-label mt-1 text-muted-soft">总量</span>
        </div>
      </div>

      <div className="space-y-1 lg:space-y-2.5">
        {chartItems.map((item, index) => {
          const percent = totalTokens > 0 ? item.totalTokens / totalTokens : 0;
          return (
            <div
              key={`${item.providerType}-${item.modelName}`}
              className={cn(
                'flex min-w-0 items-center gap-3 rounded-md px-1 py-1.5 transition-colors hover:bg-ink/[0.025] lg:px-1.5',
                index >= 3 && 'hidden lg:flex',
              )}
            >
              <UsageProviderIcon item={item} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{getModelDisplayName(item)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-bold text-ink">{formatPercent(percent, 1)}</span>
                <span
                  className="h-2.5 w-2.5 rounded-full ring-2 ring-canvas"
                  style={{ backgroundColor: MODEL_COLORS[index % MODEL_COLORS.length] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UsageProviderIcon({ item }: { item: ModelUsageDTO }) {
  const iconUrl = getProviderIcon(item.providerType, item.providerType, item.modelName);
  if (!iconUrl) {
    return null;
  }

  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
      <img src={iconUrl} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
    </span>
  );
}

function createOtherModelUsage(totalTokens: number, calls: number): ModelUsageDTO {
  return {
    providerType: '其他',
    modelName: '其他模型',
    calls,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens,
  };
}

function buildPieSegments(data: ModelUsageDTO[], total: number) {
  let currentAngle = -90;
  return data.map((item) => {
    const angle = total > 0 ? (item.totalTokens / total) * 360 : 0;
    const segment = {
      item,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
    };
    currentAngle += angle;
    return segment;
  });
}

function describePieSegment(
  segment: {
    startAngle: number;
    endAngle: number;
  },
  segmentCount: number,
) {
  const angle = segment.endAngle - segment.startAngle;
  if (angle <= 0) return '';
  const gapAngle = segmentCount > 1 ? Math.min(3.2, angle * 0.28) : 0;
  return describeArc(85, 85, 59, segment.startAngle + gapAngle / 2, segment.endAngle - gapAngle / 2);
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  if (endAngle - startAngle >= 359.99) {
    return [
      describeArc(cx, cy, radius, startAngle, startAngle + 179.99),
      describeArc(cx, cy, radius, startAngle + 180, endAngle),
    ].join(' ');
  }

  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function RecentCallsList({ logs }: { logs: UsageLogDTO[] }) {
  return (
    <div className="popover-scrollbar h-full space-y-0.5 overflow-y-auto pr-1 lg:space-y-1">
      {logs.map((log, index) => (
        <div
          key={log.id}
          className={cn(
            'flex items-center justify-between gap-4 rounded-md px-1 py-2 transition-colors hover:bg-ink/[0.025] lg:px-2 lg:py-2.5',
            index >= 4 && 'hidden lg:flex',
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn('h-2 w-2 shrink-0 rounded-full', isSuccessStatus(log.status) ? 'bg-success' : 'bg-error')}
              title={getStatusLabel(log.status)}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{getModelDisplayName(log)}</p>
              <p className="mono-label mt-1 truncate text-muted-soft">
                {log.errorMessage ? getErrorLabel(log.errorMessage) : formatTime(log.createdAt)}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-ink">{formatCompactTokens(log.totalTokens).replace(' tokens', '')}</p>
            <p className="mono-label mt-1 hidden text-muted-soft lg:block">{formatTime(log.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TokenLineChart({ data }: { data: DailyUsageDTO[] }) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const width = 720;
  const height = 220;
  const padding = { top: 14, right: 18, bottom: 32, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxTokens = Math.max(...data.map((item) => item.totalTokens), 1);
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0;
  const points = data.map((item, index) => {
    const x = padding.left + stepX * index;
    const y = padding.top + chartHeight - (item.totalTokens / maxTokens) * chartHeight;
    return { ...item, x, y };
  });
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${padding.left + chartWidth} ${padding.top + chartHeight} L ${padding.left} ${
    padding.top + chartHeight
  } Z`;
  const tickIndexes = Array.from(new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])).filter(
    (index) => index >= 0,
  );
  const gridTicks = [0, 0.25, 0.5, 0.75, 1];
  const strokeColor = 'var(--color-success)';
  const gridColor = 'var(--color-hairline)';
  const labelColor = 'var(--color-muted-soft)';
  const hoveredPoint = points.find((point) => point.date === hoveredDate) ?? null;

  function updateHoverFromPointer(event: React.PointerEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    const rawIndex = Math.round(ratio * (points.length - 1));
    const index = Math.max(0, Math.min(points.length - 1, rawIndex));
    setHoveredDate(points[index]?.date ?? null);
  }

  return (
    <div className="relative h-[220px] w-full">
      <svg
        className="h-full w-full overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Token 趋势折线图"
      >
        <defs>
          <linearGradient id="usage-token-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.24" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridTicks.map((tick) => {
          const y = padding.top + chartHeight * tick;
          const value = maxTokens * (1 - tick);
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={padding.left + chartWidth}
                y1={y}
                y2={y}
                stroke={gridColor}
                strokeDasharray={tick === 1 ? undefined : '4 5'}
                strokeWidth="1"
              />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill={labelColor}>
                {formatNumber(Math.round(value))}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#usage-token-area)" />
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />

        {points.map((point, index) => (
          <g key={point.date}>
            {hoveredDate === point.date && (
              <line
                x1={point.x}
                x2={point.x}
                y1={padding.top}
                y2={padding.top + chartHeight}
                stroke={strokeColor}
                strokeDasharray="4 5"
                strokeOpacity="0.45"
              />
            )}
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredDate === point.date ? 5 : index === points.length - 1 ? 4 : 3}
              fill="var(--color-canvas)"
              stroke={strokeColor}
              strokeWidth="2"
              className="transition-all"
              onFocus={() => setHoveredDate(point.date)}
              onBlur={() => setHoveredDate(null)}
              tabIndex={0}
            />
          </g>
        ))}

        {tickIndexes.map((index) => {
          const point = points[index];
          return (
            <text key={point.date} x={point.x} y={height - 8} textAnchor="middle" fontSize="10" fill={labelColor}>
              {formatDateLabel(point.date)}
            </text>
          );
        })}

        <rect
          x={padding.left}
          y={padding.top}
          width={chartWidth}
          height={chartHeight}
          fill="transparent"
          className="cursor-crosshair"
          onPointerMove={updateHoverFromPointer}
          onPointerEnter={updateHoverFromPointer}
          onPointerLeave={() => setHoveredDate(null)}
        />
      </svg>

      {hoveredPoint && (
        <div
          className="pointer-events-none absolute z-10 min-w-[180px] rounded-xl border border-hairline bg-bg-card-solid px-3 py-2 text-xs text-ink"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100}%`,
            transform:
              hoveredPoint.x > width * 0.72
                ? 'translate(-100%, calc(-100% - 12px))'
                : hoveredPoint.x < width * 0.28
                  ? 'translate(0, calc(-100% - 12px))'
                  : 'translate(-50%, calc(-100% - 12px))',
          }}
        >
          <div className="mb-2 font-bold">{hoveredPoint.date}</div>
          <div className="space-y-1">
            <TooltipRow label="总 Token" value={formatNumber(hoveredPoint.totalTokens)} />
            <TooltipRow label="调用次数" value={`${formatNumber(hoveredPoint.calls)} 次`} />
            <TooltipRow label="输入 Token" value={formatNumber(hoveredPoint.promptTokens)} />
            <TooltipRow label="输出 Token" value={formatNumber(hoveredPoint.completionTokens)} />
          </div>
        </div>
      )}
    </div>
  );
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className="text-muted">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function EmptyBlock({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg px-4 py-10 text-center text-sm text-muted">
      {icon}
      <span>{text}</span>
    </div>
  );
}
