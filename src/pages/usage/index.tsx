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
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { getDailyUsage, getUsageByModel, getUsageLogs, getUsageSummary, getUsageTrend } from '@/services/llm';
import type { DailyUsageDTO, ModelUsageDTO, UsageLogDTO, UsageSummaryDTO, UsageTrendDTO } from '@/types/api';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { darkMode } = useTheme();
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

  return (
    <div className="h-full flex flex-col">
      <header
        className={cn(
          'h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 backdrop-blur-md',
          darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle border-b',
        )}
      >
        <div>
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '用量' }]} darkMode={darkMode} />
        </div>
        <div className="flex items-center gap-2">
          <RangePicker darkMode={darkMode} max={today} range={range} onApply={setRange} />
          <button
            onClick={loadData}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors',
              darkMode
                ? 'bg-[#1f2937] text-[#c7dff8] hover:bg-[#26364d]'
                : 'border border-[#d7d2ca] bg-white text-text-main hover:bg-gray-100',
            )}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </header>

      <main
        className={cn(
          'flex-1 overflow-y-auto',
          darkMode
            ? 'bg-[linear-gradient(180deg,#1f1f1f_0%,#242424_42%,#1f1f1f_100%)]'
            : 'bg-[linear-gradient(180deg,#f8f4ef_0%,#f4f1ed_44%,#f8f4ef_100%)]',
        )}
      >
        <section className="px-4 py-5 sm:px-6 lg:px-8 lg:py-6 space-y-5">
          <UsageHero darkMode={darkMode} summary={summary} range={range} />

          <div
            className={cn(
              'rounded-lg border px-5 py-4',
              darkMode ? 'bg-[#252526]/88 border-[#3c3c3c]' : 'bg-white/84 border-white/85 shadow-sm',
            )}
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className={cn('text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>Token 趋势</h3>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <GrowthPill darkMode={darkMode} label="Token 环比" value={trend?.tokenGrowthRate ?? null} />
                <GrowthPill darkMode={darkMode} label="调用环比" value={trend?.callGrowthRate ?? null} />
                <div className={cn('mono-label', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
                  {range.startDate} ~ {range.endDate}
                </div>
              </div>
            </div>

            {hasDailyUsage ? (
              <TokenLineChart darkMode={darkMode} data={dailyUsage} />
            ) : (
              <EmptyBlock darkMode={darkMode} icon={<BarChart3 size={18} />} text="当前周期暂无用量数据" />
            )}
          </div>

          <div
            className={cn(
              'rounded-lg border px-5 py-4',
              darkMode ? 'bg-[#252526]/88 border-[#3c3c3c]' : 'bg-white/84 border-white/85 shadow-sm',
            )}
          >
            <div className="grid grid-cols-1 gap-5 xl:h-[360px] xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:gap-0">
              <section className="flex min-h-0 flex-col xl:pr-5">
                <h3 className={cn('text-sm font-bold mb-4', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                  模型用量
                </h3>
                <div className="min-h-0 flex-1">
                  {topModels.length === 0 ? (
                    <EmptyBlock darkMode={darkMode} icon={<Coins size={18} />} text="暂无模型用量" />
                  ) : (
                    <ModelUsagePie darkMode={darkMode} data={modelUsage} />
                  )}
                </div>
              </section>

              <section
                className={cn(
                  'flex min-h-0 flex-col border-t pt-5 xl:border-l xl:border-t-0 xl:pt-0 xl:pl-5',
                  darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
                )}
              >
                <h3 className={cn('text-sm font-bold mb-4', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                  最近调用
                </h3>
                <div className="min-h-0 flex-1">
                  {logs.length === 0 ? (
                    <EmptyBlock darkMode={darkMode} icon={<Activity size={18} />} text="暂无调用记录" />
                  ) : (
                    <RecentCallsList darkMode={darkMode} logs={logs} />
                  )}
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function UsageHero({
  darkMode,
  summary,
  range,
}: {
  darkMode?: boolean;
  summary: UsageSummaryDTO | null;
  range: { startDate: string; endDate: string };
}) {
  const secondaryItems = [
    {
      label: '输入 Token',
      value: formatCompactTokens(summary?.promptTokens ?? 0),
      icon: <ArrowDownToLine size={17} className={darkMode ? 'text-[#9fb7d8]' : 'text-[#4F7FA8]'} />,
    },
    {
      label: '输出 Token',
      value: formatCompactTokens(summary?.completionTokens ?? 0),
      icon: <ArrowUpFromLine size={17} className={darkMode ? 'text-[#d8aa9f]' : 'text-[#D97373]'} />,
    },
    {
      label: '平均延迟',
      value: formatLatency(summary?.averageLatencyMs),
      icon: <Clock3 size={17} className={darkMode ? 'text-[#d7c3a5]' : 'text-[#7B6B5D]'} />,
    },
    {
      label: '失败调用',
      value: formatNumber(summary?.failedCalls ?? 0),
      icon: <CircleX size={17} className={darkMode ? 'text-[#f0a3a3]' : 'text-[#D97373]'} />,
    },
  ];

  return (
    <div
      className={cn(
        'rounded-lg border px-5 py-4',
        darkMode ? 'bg-[#252526]/88 border-[#3c3c3c]' : 'bg-white/84 border-white/85 shadow-sm',
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className={cn('rounded-lg p-2.5', darkMode ? 'bg-[#1e3a5f]/50' : 'bg-[#e8f2ff]')}>
              <Zap size={18} className="text-[#2584ff]" />
            </div>
            <div>
              <h2 className={cn('text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>Token 消耗</h2>
              <p className={cn('mono-label mt-1', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
                {range.startDate} ~ {range.endDate} · 全链路口径
              </p>
            </div>
          </div>
          <div
            className={cn(
              'mt-4 break-words text-4xl font-bold leading-none tracking-normal sm:text-5xl',
              darkMode ? 'text-[#f5f5f5]' : 'text-[#0b0d12]',
            )}
          >
            {formatNumber(summary?.totalTokens ?? 0)}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className={cn('text-sm font-semibold', darkMode ? 'text-[#858585]' : 'text-text-main/55')}>
              ≈ {formatCompactTokens(summary?.totalTokens ?? 0)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5 lg:min-w-[260px] lg:pt-1">
          <div className={cn('min-w-0', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
            <div className={cn('mb-1.5 text-xs font-bold', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
              总调用
            </div>
            <div className="flex items-center gap-2 text-xl font-bold">
              <Activity size={17} className="text-[#2584ff]" />
              {formatNumber(summary?.totalCalls ?? 0)}
            </div>
          </div>
          <div className={cn('min-w-0', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
            <div className={cn('mb-1.5 text-xs font-bold', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
              成功率
            </div>
            <div className="flex items-center gap-2 text-xl font-bold text-[#13a872]">
              <CircleCheck size={17} />
              {formatPercent(summary?.successRate, 1)}
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'mt-5 grid grid-cols-2 gap-x-5 gap-y-3 border-t pt-4 xl:grid-cols-4',
          darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
        )}
      >
        {secondaryItems.map((item, index) => (
          <div
            key={item.label}
            className={cn(
              'min-w-0',
              index > 0 && (darkMode ? 'xl:border-l xl:border-[#3c3c3c]' : 'xl:border-l xl:border-border-subtle'),
              index > 0 ? 'xl:pl-5' : '',
            )}
          >
            <div className="flex items-center gap-2">
              {item.icon}
              <span className={cn('text-sm font-bold', darkMode ? 'text-[#cfcfcf]' : 'text-text-main/70')}>
                {item.label}
              </span>
            </div>
            <div className={cn('mt-2 text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div
        className={cn(
          'mt-4 border-t pt-3 mono-label',
          darkMode ? 'border-[#3c3c3c] text-[#858585]' : 'border-border-subtle text-text-main/40',
        )}
      >
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
  darkMode,
  range,
  max,
  onApply,
}: {
  darkMode?: boolean;
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
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors',
          darkMode
            ? 'border-[#3c3c3c] bg-[#1e1e1e] text-[#d4d4d4] hover:bg-[#26364d]'
            : 'border-[#d7d2ca] bg-white text-text-main hover:bg-gray-100',
        )}
      >
        <CalendarDays size={15} />
        {getRangeLabel(range)}
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-full z-30 mt-2 w-[320px] rounded-lg border p-3 shadow-lg',
            darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
          )}
        >
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
                    'h-8 rounded-lg border px-3 text-xs font-bold transition-colors',
                    active
                      ? 'border-[#2584ff] bg-[#2584ff] text-white'
                      : darkMode
                        ? 'border-[#3c3c3c] bg-[#1e1e1e] text-[#d4d4d4] hover:bg-[#2d2d2d]'
                        : 'border-border-subtle bg-white text-text-main/65 hover:bg-bg-base',
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className={cn('border-t pt-3', darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle')}>
            <div className="grid grid-cols-2 gap-2">
              <label className="min-w-0">
                <span className={cn('mono-label mb-1 block', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
                  开始日期
                </span>
                <DateTextInput
                  darkMode={darkMode}
                  value={draftRange.startDate}
                  max={draftRange.endDate}
                  onChange={(value) => setDraftRange((prev) => ({ ...prev, startDate: value }))}
                />
              </label>
              <label className="min-w-0">
                <span className={cn('mono-label mb-1 block', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
                  结束日期
                </span>
                <DateTextInput
                  darkMode={darkMode}
                  value={draftRange.endDate}
                  min={draftRange.startDate}
                  max={max}
                  onChange={(value) => setDraftRange((prev) => ({ ...prev, endDate: value }))}
                />
              </label>
            </div>

            <div className={cn('mono-label mt-3', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
              输入 8 位数字后自动应用
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DateTextInput({
  darkMode,
  value,
  min,
  max,
  onChange,
}: {
  darkMode?: boolean;
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
      className={cn(
        'h-9 w-full rounded-lg border px-2.5 text-xs font-bold outline-none transition-colors',
        darkMode
          ? 'border-[#3c3c3c] bg-[#1e1e1e] text-[#d4d4d4] focus:border-[#4F7FA8]'
          : 'border-[#d7d2ca] bg-white text-text-main focus:border-primary',
      )}
    />
  );
}

function GrowthPill({ darkMode, label, value }: { darkMode?: boolean; label: string; value: number | null }) {
  const Icon = value !== null && value < 0 ? TrendingDown : TrendingUp;
  const hasValue = value !== null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold',
        !hasValue
          ? darkMode
            ? 'bg-[#1e1e1e] text-[#858585]'
            : 'bg-bg-base/70 text-text-main/45'
          : value < 0
            ? darkMode
              ? 'bg-red-500/12 text-red-300'
              : 'bg-red-50 text-red-600'
            : darkMode
              ? 'bg-emerald-500/12 text-emerald-300'
              : 'bg-emerald-50 text-emerald-700',
      )}
      title={label}
    >
      {hasValue && <Icon size={13} />}
      <span>{label}</span>
      <span>{formatGrowth(value)}</span>
    </span>
  );
}

const MODEL_COLORS = ['#4F7FA8', '#D97373', '#5E9B73', '#B68C4A', '#8B6EC8', '#7B6B5D'];

function ModelUsagePie({ darkMode, data }: { darkMode?: boolean; data: ModelUsageDTO[] }) {
  const topItems = data.slice(0, 5);
  const otherItems = data.slice(5);
  const otherTokens = otherItems.reduce((sum, item) => sum + item.totalTokens, 0);
  const otherCalls = otherItems.reduce((sum, item) => sum + item.calls, 0);
  const chartItems = otherTokens > 0 ? [...topItems, createOtherModelUsage(otherTokens, otherCalls)] : topItems;
  const totalTokens = chartItems.reduce((sum, item) => sum + item.totalTokens, 0);
  const segments = buildPieSegments(chartItems, totalTokens);

  return (
    <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-[170px_minmax(0,1fr)]">
      <div className="relative mx-auto h-[170px] w-[170px]">
        <svg viewBox="0 0 170 170" className="h-full w-full" role="img" aria-label="模型用量饼图">
          <circle cx="85" cy="85" r="62" fill="none" stroke={darkMode ? '#1e1e1e' : '#f1ede8'} strokeWidth="24" />
          {segments.map((segment, index) => (
            <path
              key={`${segment.item.providerType}-${segment.item.modelName}`}
              d={describeArc(85, 85, 62, segment.startAngle, segment.endAngle)}
              fill="none"
              stroke={MODEL_COLORS[index % MODEL_COLORS.length]}
              strokeLinecap="butt"
              strokeWidth="24"
            >
              <title>
                {segment.item.modelName} ·{' '}
                {formatPercent(totalTokens > 0 ? segment.item.totalTokens / totalTokens : 0, 1)} ·{' '}
                {formatNumber(segment.item.totalTokens)} Token
              </title>
            </path>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={cn('mono-label', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>总量</span>
          <span className={cn('mt-1 text-lg font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
            {formatCompactTokens(totalTokens).replace(' tokens', '')}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {chartItems.map((item, index) => {
          const percent = totalTokens > 0 ? item.totalTokens / totalTokens : 0;
          return (
            <div key={`${item.providerType}-${item.modelName}`} className="flex min-w-0 items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: MODEL_COLORS[index % MODEL_COLORS.length] }}
              />
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                  {item.modelName}
                </p>
                <p className={cn('mono-label mt-0.5', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
                  {item.providerType} · {formatNumber(item.calls)} 次
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn('text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                  {formatPercent(percent, 1)}
                </p>
                <p className={cn('mono-label mt-0.5', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
                  {formatNumber(item.totalTokens)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
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

function RecentCallsList({ darkMode, logs }: { darkMode?: boolean; logs: UsageLogDTO[] }) {
  return (
    <div
      className={cn(
        'popover-scrollbar h-full divide-y overflow-y-auto rounded-lg border',
        darkMode ? 'divide-[#3c3c3c] border-[#3c3c3c]' : 'divide-border-subtle border-border-subtle',
      )}
    >
      {logs.map((log) => (
        <div key={log.id} className={cn('px-3.5 py-3', darkMode ? 'bg-[#1e1e1e]/50' : 'bg-bg-base/45')}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    isSuccessStatus(log.status) ? 'bg-[#13a872]' : 'bg-[#D97373]',
                  )}
                />
                <p className={cn('truncate text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                  {log.modelName}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={cn('mono-label', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
                  {formatTime(log.createdAt)}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold',
                    isSuccessStatus(log.status)
                      ? darkMode
                        ? 'bg-emerald-500/12 text-emerald-300'
                        : 'bg-emerald-50 text-emerald-700'
                      : darkMode
                        ? 'bg-red-500/12 text-red-300'
                        : 'bg-red-50 text-red-600',
                  )}
                >
                  {getStatusLabel(log.status)}
                </span>
                {log.errorMessage && (
                  <span
                    className={cn(
                      'inline-flex max-w-[140px] items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                      darkMode ? 'bg-amber-500/12 text-amber-200' : 'bg-amber-50 text-amber-700',
                    )}
                    title={log.errorMessage}
                  >
                    <TriangleAlert size={10} className="shrink-0" />
                    <span className="truncate">{getErrorLabel(log.errorMessage)}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className={cn('text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                {formatNumber(log.totalTokens)}
              </p>
              <p className={cn('mono-label mt-1', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>Token</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TokenLineChart({ darkMode, data }: { darkMode?: boolean; data: DailyUsageDTO[] }) {
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
  const strokeColor = darkMode ? '#60a5fa' : '#4F7FA8';
  const gridColor = darkMode ? '#3c3c3c' : '#e2ddd6';
  const labelColor = darkMode ? '#858585' : '#8a8177';
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
              fill={darkMode ? '#252526' : '#fff'}
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
          className={cn(
            'pointer-events-none absolute z-10 min-w-[180px] rounded-lg border px-3 py-2 text-xs shadow-lg',
            darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e] text-[#e0e0e0]' : 'border-border-subtle bg-white text-text-main',
          )}
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
            <TooltipRow darkMode={darkMode} label="总 Token" value={formatNumber(hoveredPoint.totalTokens)} />
            <TooltipRow darkMode={darkMode} label="调用次数" value={`${formatNumber(hoveredPoint.calls)} 次`} />
            <TooltipRow darkMode={darkMode} label="输入 Token" value={formatNumber(hoveredPoint.promptTokens)} />
            <TooltipRow darkMode={darkMode} label="输出 Token" value={formatNumber(hoveredPoint.completionTokens)} />
          </div>
        </div>
      )}
    </div>
  );
}

function TooltipRow({ darkMode, label, value }: { darkMode?: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className={cn(darkMode ? 'text-[#858585]' : 'text-text-main/45')}>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function EmptyBlock({ darkMode, icon, text }: { darkMode?: boolean; icon: ReactNode; text: string }) {
  return (
    <div
      className={cn(
        'flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center text-sm',
        darkMode ? 'border-[#3c3c3c] text-[#858585]' : 'border-border-subtle text-text-main/40',
      )}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
}
