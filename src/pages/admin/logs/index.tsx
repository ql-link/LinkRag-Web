import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  FileSearch,
  Hash,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  TerminalSquare,
  X,
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { copyTextToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { listAdminLogLabels, listAdminLogs } from '@/services/admin-logs';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import type { AdminLogEntryDTO, AdminLogLabelsDTO } from '@/types/api';

const AUTO_REFRESH_MS = 10_000;
const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
const DEFAULT_SERVICE_OPTIONS = ['tolink-service', 'tolink-rag'];
const LEVEL_OPTIONS = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'ACCESS', 'AUDIT'];

interface LogFilters {
  service: string;
  level: string;
  traceId: string;
  keyword: string;
  startTime: string;
  endTime: string;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateTimeLocal(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

function getInitialLogFilters(): LogFilters {
  const end = new Date();
  const start = new Date(end.getTime() - 2 * 60 * 60 * 1000);
  return {
    service: '',
    level: '',
    traceId: '',
    keyword: '',
    startTime: formatDateTimeLocal(start),
    endTime: formatDateTimeLocal(end),
  };
}

function toIsoString(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value || 0);
}

function getLogTime(log: AdminLogEntryDTO) {
  return log.time ?? log.timestamp ?? null;
}

function getTraceId(log: AdminLogEntryDTO) {
  return log.traceId ?? log.trace_id ?? '';
}

function getLoggerName(log: AdminLogEntryDTO) {
  return log.loggerName ?? log.logger_name ?? '';
}

function getLevel(log: AdminLogEntryDTO) {
  return String(log.level ?? 'INFO').toUpperCase();
}

function getLogKey(log: AdminLogEntryDTO, index: number) {
  return (
    log.id || `${getLogTime(log) ?? 'no-time'}:${log.service ?? 'no-service'}:${getTraceId(log) || 'no-trace'}:${index}`
  );
}

function isErrorLevel(level: string) {
  return level === 'ERROR' || level === 'FATAL';
}

function isWarningLevel(level: string) {
  return level === 'WARN';
}

function getLevelClassName(level: string) {
  if (isErrorLevel(level)) return 'border-error/25 bg-error/10 text-error';
  if (isWarningLevel(level)) return 'border-warning/30 bg-warning/10 text-warning';
  if (level === 'INFO') return 'border-info/25 bg-info/10 text-info';
  if (level === 'ACCESS') return 'border-success/25 bg-success/10 text-success';
  if (level === 'AUDIT') return 'border-primary/30 bg-primary/10 text-primary';
  return 'border-border-subtle bg-surface-soft text-muted';
}

function fieldClassName(darkMode: boolean) {
  return cn(
    'h-10 w-full rounded-lg border px-3 text-sm outline-none transition-colors',
    darkMode
      ? 'border-[#3a3a3a] bg-[#242424] text-[#f2f2f2] placeholder:text-[#7f7f7f] focus:border-primary/50'
      : 'border-border-subtle bg-white text-text-main placeholder:text-text-main/35 focus:border-primary/45',
  );
}

function uniqueSortedOptions(primary: string[], secondary: string[]) {
  const seen = new Set<string>();
  const combined = [...primary, ...secondary]
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
  return combined;
}

function areFiltersEqual(left: LogFilters, right: LogFilters) {
  return (
    left.service === right.service &&
    left.level === right.level &&
    left.traceId === right.traceId &&
    left.keyword === right.keyword &&
    left.startTime === right.startTime &&
    left.endTime === right.endTime
  );
}

export default function AdminLogsPage() {
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [labels, setLabels] = useState<AdminLogLabelsDTO>({ services: [], levels: [] });
  const [draftFilters, setDraftFilters] = useState<LogFilters>(() => getInitialLogFilters());
  const [appliedFilters, setAppliedFilters] = useState<LogFilters>(() => getInitialLogFilters());
  const [logs, setLogs] = useState<AdminLogEntryDTO[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageMeta, setPageMeta] = useState({
    total: 0,
    totalPages: 1,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedLog, setSelectedLog] = useState<{ id: string; log: AdminLogEntryDTO } | null>(null);

  const serviceOptions = useMemo(
    () => uniqueSortedOptions(DEFAULT_SERVICE_OPTIONS, labels.services),
    [labels.services],
  );
  const levelOptions = useMemo(() => uniqueSortedOptions(LEVEL_OPTIONS, labels.levels), [labels.levels]);

  const activeFilterCount = useMemo(() => {
    return [
      appliedFilters.service,
      appliedFilters.level,
      appliedFilters.traceId,
      appliedFilters.keyword,
      appliedFilters.startTime,
      appliedFilters.endTime,
    ].filter(Boolean).length;
  }, [appliedFilters]);

  const currentPageErrorCount = useMemo(() => {
    return logs.filter((log) => isErrorLevel(getLevel(log))).length;
  }, [logs]);

  const currentPageWarnCount = useMemo(() => {
    return logs.filter((log) => isWarningLevel(getLevel(log))).length;
  }, [logs]);

  const loadLogs = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const result = await listAdminLogs({
          service: appliedFilters.service || undefined,
          level: appliedFilters.level || undefined,
          traceId: appliedFilters.traceId.trim() || undefined,
          keyword: appliedFilters.keyword.trim() || undefined,
          startTime: toIsoString(appliedFilters.startTime),
          endTime: toIsoString(appliedFilters.endTime),
          page,
          pageSize,
        });

        setLogs(result.items || []);
        setPageMeta({
          total: result.total ?? 0,
          totalPages: result.totalPages ?? 1,
          page: result.page ?? page,
          pageSize: result.pageSize ?? pageSize,
        });
      } catch (error) {
        console.error(error);
        addToast('error', '日志加载失败');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [addToast, appliedFilters, page, pageSize],
  );

  useEffect(() => {
    let active = true;

    listAdminLogLabels()
      .then((result) => {
        if (active) setLabels(result);
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void loadLogs(true);
  }, [loadLogs]);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const timer = window.setInterval(() => {
      void loadLogs(false);
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [autoRefresh, loadLogs]);

  function handleApplyFilters(event: FormEvent) {
    event.preventDefault();

    if (draftFilters.startTime && draftFilters.endTime && draftFilters.startTime > draftFilters.endTime) {
      addToast('error', '开始时间不能晚于结束时间');
      return;
    }

    const nextFilters = {
      ...draftFilters,
      traceId: draftFilters.traceId.trim(),
      keyword: draftFilters.keyword.trim(),
    };
    const shouldReloadImmediately = areFiltersEqual(nextFilters, appliedFilters) && page === 1;

    setAppliedFilters(nextFilters);
    setSelectedLog(null);
    setPage(1);
    if (shouldReloadImmediately) {
      void loadLogs(true);
    }
  }

  function handleResetFilters() {
    const nextFilters = getInitialLogFilters();
    const shouldReloadImmediately = areFiltersEqual(nextFilters, appliedFilters) && page === 1;

    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setSelectedLog(null);
    setPage(1);
    if (shouldReloadImmediately) {
      void loadLogs(true);
    }
  }

  async function handleCopyTrace(traceId: string) {
    try {
      await copyTextToClipboard(traceId);
      addToast('success', 'trace_id 已复制');
    } catch (error) {
      console.error(error);
      addToast('error', '复制失败');
    }
  }

  const totalPages = Math.max(1, pageMeta.totalPages || Math.ceil(pageMeta.total / pageMeta.pageSize));
  const showInitialLoading = loading && logs.length === 0;

  return (
    <div className={cn('flex h-full min-h-0 flex-col', darkMode ? 'text-[#d6d6d6]' : 'text-text-main')}>
      <header
        className={cn(
          'flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-3 sm:px-8',
          darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle',
        )}
      >
        <Breadcrumb
          items={[{ label: '个人信息', path: Routes.ProfilePage }, { label: '后台管理' }, { label: '日志追踪' }]}
          darkMode={darkMode}
        />

        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh((value) => !value)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors',
              autoRefresh
                ? 'bg-primary text-white hover:bg-primary-active'
                : darkMode
                  ? 'bg-white/[0.045] text-[#d6d6d6] hover:bg-white/[0.075]'
                  : 'bg-surface-soft text-text-main/70 hover:bg-white',
            )}
          >
            {autoRefresh ? <Pause size={14} /> : <Play size={14} />}
            自动刷新
          </button>
          <button
            type="button"
            onClick={() => void loadLogs(false)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors',
              darkMode
                ? 'bg-white/[0.045] text-[#d6d6d6] hover:bg-white/[0.075]'
                : 'bg-surface-soft text-text-main/70 hover:bg-white',
            )}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </header>

      <main className={cn('min-h-0 flex-1 overflow-y-auto', darkMode ? 'bg-[#1f1f1f]' : 'bg-bg-base')}>
        <section className="mx-auto w-full max-w-[1320px] px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">
          <div className="mb-5 flex flex-col gap-2">
            <div className={cn('mono-label', darkMode && 'text-[#a6a6a6]')}>Trace Logs</div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1
                  className={cn(
                    'text-[24px] font-semibold leading-tight sm:text-[27px]',
                    darkMode ? 'text-[#f2f2f2]' : 'text-text-main',
                  )}
                >
                  日志追踪
                </h1>
                <p className={cn('mt-1 text-[13px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/50')}>
                  按服务、级别、trace_id 和关键字检索 Java / Python 集中日志。
                </p>
              </div>
              <p className={cn('font-mono text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>
                {appliedFilters.startTime.replace('T', ' ')} ~ {appliedFilters.endTime.replace('T', ' ')}
              </p>
            </div>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-4">
            <SummaryItem
              darkMode={darkMode}
              icon={<TerminalSquare size={17} />}
              label="结果总数"
              value={formatNumber(pageMeta.total)}
            />
            <SummaryItem
              darkMode={darkMode}
              icon={<AlertTriangle size={17} />}
              label="当前页 ERROR"
              value={formatNumber(currentPageErrorCount)}
              tone={currentPageErrorCount > 0 ? 'error' : undefined}
            />
            <SummaryItem
              darkMode={darkMode}
              icon={<AlertTriangle size={17} />}
              label="当前页 WARN"
              value={formatNumber(currentPageWarnCount)}
              tone={currentPageWarnCount > 0 ? 'warning' : undefined}
            />
            <SummaryItem
              darkMode={darkMode}
              icon={<Clock3 size={17} />}
              label="筛选条件"
              value={`${activeFilterCount} 项`}
            />
          </div>

          <form
            onSubmit={handleApplyFilters}
            className={cn('border-y py-4', darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle')}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.25fr_1.4fr_1fr_1fr_auto]">
              <FilterField label="服务" darkMode={darkMode}>
                <div className="relative">
                  <Server
                    size={14}
                    className={cn('pointer-events-none absolute left-3 top-1/2 -translate-y-1/2', 'text-muted-soft')}
                  />
                  <select
                    value={draftFilters.service}
                    onChange={(event) => setDraftFilters((prev) => ({ ...prev, service: event.target.value }))}
                    className={cn(fieldClassName(darkMode), 'appearance-none pl-8 pr-8')}
                  >
                    <option value="">不限定服务</option>
                    {serviceOptions.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-soft"
                  />
                </div>
              </FilterField>

              <FilterField label="级别" darkMode={darkMode}>
                <div className="relative">
                  <select
                    value={draftFilters.level}
                    onChange={(event) => setDraftFilters((prev) => ({ ...prev, level: event.target.value }))}
                    className={cn(fieldClassName(darkMode), 'appearance-none pr-8')}
                  >
                    <option value="">不限定级别</option>
                    {levelOptions.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-soft"
                  />
                </div>
              </FilterField>

              <FilterField label="trace_id" darkMode={darkMode}>
                <div className="relative">
                  <Hash
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-soft"
                  />
                  <input
                    value={draftFilters.traceId}
                    onChange={(event) => setDraftFilters((prev) => ({ ...prev, traceId: event.target.value }))}
                    placeholder="输入 trace_id"
                    className={cn(fieldClassName(darkMode), 'pl-8')}
                  />
                </div>
              </FilterField>

              <FilterField label="关键字" darkMode={darkMode}>
                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-soft"
                  />
                  <input
                    value={draftFilters.keyword}
                    onChange={(event) => setDraftFilters((prev) => ({ ...prev, keyword: event.target.value }))}
                    placeholder="搜索 message / exception"
                    className={cn(fieldClassName(darkMode), 'pl-8')}
                  />
                </div>
              </FilterField>

              <FilterField label="开始时间" darkMode={darkMode}>
                <input
                  type="datetime-local"
                  value={draftFilters.startTime}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, startTime: event.target.value }))}
                  className={fieldClassName(darkMode)}
                />
              </FilterField>

              <FilterField label="结束时间" darkMode={darkMode}>
                <input
                  type="datetime-local"
                  value={draftFilters.endTime}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, endTime: event.target.value }))}
                  className={fieldClassName(darkMode)}
                />
              </FilterField>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary-active"
                >
                  <Search size={15} />
                  查询
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className={cn(
                    'inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                    darkMode
                      ? 'bg-white/[0.045] text-[#d6d6d6] hover:bg-white/[0.075]'
                      : 'bg-surface-soft text-text-main/70 hover:bg-white',
                  )}
                  title="重置筛选"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>
          </form>

          <section className="mt-5">
            <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className={cn('text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>
                第 {pageMeta.page} 页，共 {totalPages} 页；当前显示 {logs.length} 条。
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className={cn('flex items-center gap-2 text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-muted')}>
                  每页
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className={cn(
                      'h-8 rounded-md border px-2 text-xs font-bold outline-none',
                      darkMode
                        ? 'border-[#3a3a3a] bg-[#242424] text-[#f2f2f2]'
                        : 'border-border-subtle bg-white text-text-main',
                    )}
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <Pagination
                  darkMode={darkMode}
                  page={page}
                  totalPages={totalPages}
                  onPrevious={() => setPage((value) => Math.max(1, value - 1))}
                  onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
                />
              </div>
            </div>

            {showInitialLoading ? (
              <div className="flex min-h-[360px] items-center justify-center">
                <Loader2 size={24} className={cn('animate-spin', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/40')} />
              </div>
            ) : logs.length === 0 ? (
              <EmptyLogs darkMode={darkMode} />
            ) : (
              <div className={cn('border-y', darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle')}>
                {logs.map((log, index) => {
                  const id = getLogKey(log, index);
                  return <LogRow key={id} log={log} darkMode={darkMode} onOpen={() => setSelectedLog({ id, log })} />;
                })}
              </div>
            )}
          </section>
        </section>
      </main>

      {selectedLog ? (
        <LogDetailDialog
          id={selectedLog.id}
          log={selectedLog.log}
          darkMode={darkMode}
          onClose={() => setSelectedLog(null)}
          onCopyTrace={handleCopyTrace}
        />
      ) : null}
    </div>
  );
}

function SummaryItem({
  darkMode,
  icon,
  label,
  value,
  tone,
}: {
  darkMode: boolean;
  icon: ReactNode;
  label: string;
  value: string;
  tone?: 'error' | 'warning';
}) {
  const toneClass = tone === 'error' ? 'text-error' : tone === 'warning' ? 'text-warning' : '';
  return (
    <div className={cn('border-t pt-3', darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle')}>
      <div className={cn('mb-2 flex items-center gap-2 text-xs font-bold', darkMode ? 'text-[#a6a6a6]' : 'text-muted')}>
        {icon}
        {label}
      </div>
      <div
        className={cn(
          'text-[22px] font-semibold leading-none',
          toneClass || (darkMode ? 'text-[#f2f2f2]' : 'text-ink'),
        )}
      >
        {value}
      </div>
    </div>
  );
}

function FilterField({ darkMode, label, children }: { darkMode: boolean; label: string; children: ReactNode }) {
  return (
    <label className="min-w-0">
      <span className={cn('mono-label mb-1.5 block', darkMode ? 'text-[#a6a6a6]' : 'text-muted-soft')}>{label}</span>
      {children}
    </label>
  );
}

function Pagination({
  darkMode,
  page,
  totalPages,
  onPrevious,
  onNext,
}: {
  darkMode: boolean;
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const buttonClassName = cn(
    'inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-40',
    darkMode
      ? 'border-[#3a3a3a] bg-[#242424] text-[#d6d6d6] hover:bg-[#303030]'
      : 'border-border-subtle bg-white text-text-main/70 hover:bg-surface-soft',
  );

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onPrevious} disabled={page <= 1} className={buttonClassName} title="上一页">
        <ChevronLeft size={15} />
      </button>
      <span className={cn('min-w-16 text-center font-mono text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-muted')}>
        {page} / {totalPages}
      </span>
      <button type="button" onClick={onNext} disabled={page >= totalPages} className={buttonClassName} title="下一页">
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

function EmptyLogs({ darkMode }: { darkMode: boolean }) {
  return (
    <div
      className={cn(
        'flex min-h-[320px] flex-col items-center justify-center border-y border-dashed px-4 py-16 text-center',
        darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle',
      )}
    >
      <FileSearch size={32} className={cn('mb-4', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/35')} />
      <p className={cn('text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>没有找到匹配日志</p>
      <p className={cn('mt-2 text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>
        可以放宽时间范围，或直接用 trace_id 精确查询。
      </p>
    </div>
  );
}

function LogRow({ log, darkMode, onOpen }: { log: AdminLogEntryDTO; darkMode: boolean; onOpen: () => void }) {
  const level = getLevel(log);
  const traceId = getTraceId(log);
  const hasException = Boolean(log.exception?.trim());

  return (
    <article
      className={cn(
        'border-b last:border-b-0',
        darkMode ? 'border-[#3a3a3a]/70 hover:bg-white/[0.035]' : 'border-border-subtle/70 hover:bg-ink/[0.025]',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="grid w-full gap-2 px-0 py-3 text-left lg:grid-cols-[minmax(0,190px)_minmax(0,1fr)] lg:items-center"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:flex-nowrap">
          <span
            className={cn(
              'inline-flex h-6 min-w-[4.4rem] items-center justify-center rounded-md border px-2 font-mono text-[11px] font-bold',
              getLevelClassName(level),
            )}
          >
            {level}
          </span>
          <time className={cn('font-mono text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-muted')}>
            {formatDateTime(getLogTime(log))}
          </time>
        </div>

        <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(8rem,0.8fr)_minmax(12rem,1fr)_minmax(0,2.2fr)] xl:items-center">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                'inline-flex min-w-0 items-center gap-1.5 text-xs font-bold',
                darkMode ? 'text-[#f2f2f2]' : 'text-ink',
              )}
            >
              <Server size={13} className="text-muted-soft" />
              <span className="truncate">{log.service || 'unknown-service'}</span>
            </span>
            {hasException ? (
              <span className="shrink-0 rounded-md bg-error/10 px-1.5 py-0.5 text-[11px] font-bold text-error">
                异常
              </span>
            ) : null}
          </div>

          <span
            className={cn(
              'flex min-w-0 items-center gap-1.5 font-mono text-xs',
              darkMode ? 'text-[#a6a6a6]' : 'text-text-main/55',
            )}
          >
            <Hash size={13} className="shrink-0 text-muted-soft" />
            <span className="truncate">{traceId || '-'}</span>
          </span>

          <p className={cn('truncate font-mono text-[13px]', darkMode ? 'text-[#d6d6d6]' : 'text-body')}>
            {log.message || '-'}
          </p>
        </div>
      </button>
    </article>
  );
}

function stringifyDetailValue(value: unknown) {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function LogDetailDialog({
  id,
  log,
  darkMode,
  onClose,
  onCopyTrace,
}: {
  id: string;
  log: AdminLogEntryDTO;
  darkMode: boolean;
  onClose: () => void;
  onCopyTrace: (traceId: string) => Promise<void>;
}) {
  const level = getLevel(log);
  const traceId = getTraceId(log);
  const loggerName = getLoggerName(log);
  const hasException = Boolean(log.exception?.trim());
  const rawText = log.raw === undefined ? '' : stringifyDetailValue(log.raw);
  const labelsText = log.labels ? stringifyDetailValue(log.labels) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="日志详情"
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'flex max-h-[min(760px,calc(100vh-2rem))] w-full max-w-4xl flex-col overflow-hidden rounded-xl border shadow-dialog',
          darkMode ? 'border-[#3a3a3a] bg-[#242424] text-[#d6d6d6]' : 'border-border-subtle bg-white text-text-main',
        )}
      >
        <header
          className={cn(
            'flex shrink-0 items-start justify-between gap-4 border-b p-4',
            darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle',
          )}
        >
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex h-6 min-w-[4.4rem] items-center justify-center rounded-md border px-2 font-mono text-[11px] font-bold',
                  getLevelClassName(level),
                )}
              >
                {level}
              </span>
              <time className={cn('font-mono text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-muted')}>
                {formatDateTime(getLogTime(log))}
              </time>
              {hasException ? (
                <span className="rounded-md bg-error/10 px-1.5 py-0.5 text-[11px] font-bold text-error">异常</span>
              ) : null}
            </div>
            <h2 className={cn('truncate text-base font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-ink')}>
              {log.service || 'unknown-service'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
              darkMode ? 'hover:bg-white/[0.075]' : 'hover:bg-surface-soft',
            )}
            title="关闭"
          >
            <X size={17} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailField darkMode={darkMode} label="service" value={log.service || '-'} />
            <DetailField darkMode={darkMode} label="trace_id">
              {traceId ? (
                <button
                  type="button"
                  onClick={() => void onCopyTrace(traceId)}
                  className={cn(
                    'inline-flex min-w-0 items-center gap-1.5 font-mono text-xs transition-colors',
                    darkMode ? 'text-[#f2f2f2] hover:text-primary' : 'text-text-main hover:text-primary',
                  )}
                  title="复制 trace_id"
                >
                  <Hash size={13} className="shrink-0 text-muted-soft" />
                  <span className="truncate">{traceId}</span>
                  <Copy size={12} className="shrink-0" />
                </button>
              ) : (
                '-'
              )}
            </DetailField>
            <DetailField darkMode={darkMode} label="logger" value={loggerName || '-'} />
            <DetailField darkMode={darkMode} label="host / pid" value={`${log.host || '-'} / ${log.pid ?? '-'}`} />
            <DetailField darkMode={darkMode} label="row" value={id} />
          </div>

          <DetailBlock darkMode={darkMode} label="message" value={log.message || '-'} />

          {hasException ? (
            <DetailBlock darkMode={darkMode} label="exception" value={log.exception || '-'} error />
          ) : null}

          {labelsText ? <DetailBlock darkMode={darkMode} label="labels" value={labelsText} /> : null}
          {rawText ? <DetailBlock darkMode={darkMode} label="raw" value={rawText} /> : null}
        </div>
      </div>
    </div>
  );
}

function DetailField({
  darkMode,
  label,
  value,
  children,
}: {
  darkMode: boolean;
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn('min-w-0 border-t pt-2', darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle')}>
      <div className={cn('mono-label mb-1', darkMode ? 'text-[#a6a6a6]' : 'text-muted-soft')}>{label}</div>
      <div className={cn('truncate font-mono text-xs', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
        {children ?? value ?? '-'}
      </div>
    </div>
  );
}

function DetailBlock({
  darkMode,
  label,
  value,
  error,
}: {
  darkMode: boolean;
  label: string;
  value: string;
  error?: boolean;
}) {
  return (
    <section className="mt-5">
      <div className={cn('mono-label mb-2', darkMode ? 'text-[#a6a6a6]' : 'text-muted-soft')}>{label}</div>
      <pre
        className={cn(
          'max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-lg border p-3 font-mono text-xs leading-5',
          error
            ? darkMode
              ? 'border-error/25 bg-error/10 text-[#f2f2f2]'
              : 'border-error/20 bg-error/5 text-text-main'
            : darkMode
              ? 'border-[#3a3a3a] bg-[#1f1f1f] text-[#d6d6d6]'
              : 'border-border-subtle bg-surface-soft text-text-main',
        )}
      >
        {value}
      </pre>
    </section>
  );
}
