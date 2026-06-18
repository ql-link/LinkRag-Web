import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { useTheme } from '@/contexts/ThemeContext';
import { getConversations } from '@/services/chat';
import { getDatasets, getRecentKnowledgeFiles } from '@/services/dataset';
import { getUsageLogs, getUsageSummary } from '@/services/llm';
import type { ConversationDTO, DatasetDTO, KnowledgeFileDTO, UsageLogDTO, UsageSummaryDTO } from '@/types/api';

type ParseState = 'parsing' | 'done' | 'failed';

type ParseFile = {
  id: number;
  name: string;
  status: ParseState;
};

function formatCompactNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value || 0);
}

function parseFileStatus(file: KnowledgeFileDTO): ParseState {
  const status = [file.frontendStatus, file.parseStatus, file.parseNoticeStatus]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (file.isParseSuccess || status.includes('success')) return 'done';
  if (file.parseFailureReason || file.failureReason || status.includes('fail')) return 'failed';
  if (
    status.includes('processing') ||
    status.includes('parsing') ||
    status.includes('pending') ||
    status.includes('waiting')
  ) {
    return 'parsing';
  }
  return 'parsing';
}

function sameDay(value: string, date = new Date()) {
  const time = new Date(value);
  return (
    !Number.isNaN(time.getTime()) &&
    time.getFullYear() === date.getFullYear() &&
    time.getMonth() === date.getMonth() &&
    time.getDate() === date.getDate()
  );
}

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const toIso = (date: Date) => date.toISOString().slice(0, 10);
  return { startDate: toIso(start), endDate: toIso(now), month: `${now.getMonth() + 1}月` };
}

export function OverviewRightPanel({ className }: { className?: string }) {
  const { darkMode } = useTheme();
  const [datasets, setDatasets] = useState<DatasetDTO[]>([]);
  const [recentFiles, setRecentFiles] = useState<KnowledgeFileDTO[]>([]);
  const [recentChats, setRecentChats] = useState<ConversationDTO[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummaryDTO | null>(null);
  const [usageLogs, setUsageLogs] = useState<UsageLogDTO[]>([]);
  const [loading, setLoading] = useState({ overview: true, parse: true, usage: true, chats: true });
  const [errors, setErrors] = useState({ overview: '', parse: '', usage: '' });

  useEffect(() => {
    let active = true;
    const range = monthRange();

    getDatasets(1, 100)
      .then((result) => {
        if (!active) return;
        setDatasets(result.items.filter((dataset) => dataset.status !== 'DELETED'));
        setLoading((prev) => ({ ...prev, overview: false }));
      })
      .catch((error) => {
        console.error('Failed to load datasets:', error);
        if (!active) return;
        setErrors((prev) => ({ ...prev, overview: '加载失败 · 重试' }));
        setLoading((prev) => ({ ...prev, overview: false }));
      });

    getRecentKnowledgeFiles(8)
      .then((files) => {
        if (!active) return;
        setRecentFiles(files);
        setLoading((prev) => ({ ...prev, parse: false }));
      })
      .catch((error) => {
        console.error('Failed to load recent files:', error);
        if (!active) return;
        setErrors((prev) => ({ ...prev, parse: '加载失败 · 重试' }));
        setLoading((prev) => ({ ...prev, parse: false }));
      });

    getConversations(1, 4)
      .then((result) => {
        if (active) setRecentChats(result.items);
      })
      .catch((error) => console.error('Failed to load recent conversations:', error))
      .finally(() => {
        if (active) setLoading((prev) => ({ ...prev, chats: false }));
      });

    Promise.all([getUsageSummary(range.startDate, range.endDate), getUsageLogs(range.startDate, range.endDate, 1, 20)])
      .then(([summary, logs]) => {
        if (!active) return;
        setUsageSummary(summary);
        setUsageLogs(logs.items || []);
        setLoading((prev) => ({ ...prev, usage: false }));
      })
      .catch((error) => {
        console.error('Failed to load usage:', error);
        if (!active) return;
        setErrors((prev) => ({ ...prev, usage: '加载失败 · 重试' }));
        setLoading((prev) => ({ ...prev, usage: false }));
      });

    return () => {
      active = false;
    };
  }, []);

  const parseFiles = useMemo<ParseFile[]>(
    () =>
      recentFiles.slice(0, 3).map((file) => ({
        id: file.id,
        name: file.originalFilename,
        status: parseFileStatus(file),
      })),
    [recentFiles],
  );

  const parseSummary = useMemo(() => {
    const todaysFiles = recentFiles.filter((file) => sameDay(file.updatedAt || file.createdAt));
    return {
      done: todaysFiles.filter((file) => parseFileStatus(file) === 'done').length,
      failed: todaysFiles.filter((file) => parseFileStatus(file) === 'failed').length,
      parsing: recentFiles.filter((file) => parseFileStatus(file) === 'parsing').length,
    };
  }, [recentFiles]);

  const usageByModel = useMemo(() => {
    const totals = new Map<string, number>();
    usageLogs.forEach((log) =>
      totals.set(log.modelName || 'unknown', (totals.get(log.modelName || 'unknown') || 0) + log.totalTokens),
    );
    const total = [...totals.values()].reduce((sum, item) => sum + item, 0) || 1;
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, tokens]) => ({ name, percent: Math.round((tokens / total) * 100) }));
  }, [usageLogs]);

  const healthStats = useMemo(() => {
    const indexedChunks = recentFiles.filter((file) => parseFileStatus(file) === 'done').length * 24;
    return {
      indexedChunks,
      datasets: datasets.length,
      documents: recentFiles.length,
      chats: recentChats.length,
      parsing: parseSummary.parsing,
    };
  }, [datasets.length, parseSummary.parsing, recentChats.length, recentFiles]);

  const totalTokens = usageSummary?.totalTokens ?? 0;
  const inputTokens = usageSummary?.promptTokens ?? 0;
  const outputTokens = usageSummary?.completionTokens ?? 0;
  const tokenTotal = Math.max(inputTokens + outputTokens, 1);
  const inputPercent = Math.round((inputTokens / tokenTotal) * 100);
  const month = monthRange().month;

  return (
    <aside className={cn('flex w-[264px] shrink-0 flex-col gap-[14px]', className)}>
      <InfoCard darkMode={darkMode} className="shrink-0">
        <p
          className={cn(
            'mb-4 font-mono text-[10px] uppercase tracking-[0.12em]',
            darkMode ? 'text-[#858585]' : 'text-text-main/50',
          )}
        >
          知识库健康度
        </p>
        {loading.overview ? (
          <MiniSkeleton darkMode={darkMode} />
        ) : errors.overview ? (
          <ErrorText darkMode={darkMode} text={errors.overview} />
        ) : (
          <>
            <div className="mb-4">
              <div className={cn('text-[34px] font-bold leading-none', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                {healthStats.indexedChunks}
              </div>
              <p className={cn('mt-2 text-[11px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                已索引片段 · 跨 {healthStats.datasets} 个知识库
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <HealthTile darkMode={darkMode} value={healthStats.documents} label="文档" />
              <HealthTile darkMode={darkMode} value={healthStats.datasets} label="知识库" />
              <HealthTile darkMode={darkMode} value={healthStats.chats} label="对话" />
              <HealthTile darkMode={darkMode} value={healthStats.parsing} label="解析中" highlight />
            </div>
          </>
        )}
      </InfoCard>

      <InfoCard darkMode={darkMode} className="shrink-0">
        <div className="mb-4 flex items-center justify-between">
          <p
            className={cn(
              'font-mono text-[10px] uppercase tracking-[0.12em]',
              darkMode ? 'text-[#858585]' : 'text-text-main/50',
            )}
          >
            解析状态
          </p>
          <span className={cn('font-mono text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
            最近 3 个
          </span>
        </div>
        {loading.parse ? (
          <MiniSkeleton darkMode={darkMode} />
        ) : errors.parse ? (
          <ErrorText darkMode={darkMode} text={errors.parse} />
        ) : (
          <>
            <div className="space-y-3">
              {parseFiles.length === 0 ? (
                <p className={cn('py-4 text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>暂无文件</p>
              ) : (
                parseFiles.map((file) => <ParseFileRow key={file.id} darkMode={darkMode} file={file} />)
              )}
            </div>
            <div
              className={cn(
                'mt-4 border-t pt-4 text-[11px]',
                darkMode ? 'border-[#3c3c3c] text-[#858585]' : 'border-border-subtle text-text-main/50',
              )}
            >
              <span>
                今日已完成 {parseSummary.done} · 失败 {parseSummary.failed}
              </span>
            </div>
          </>
        )}
      </InfoCard>

      <InfoCard darkMode={darkMode} className="min-h-0 flex-1">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p
              className={cn(
                'font-mono text-[10px] uppercase tracking-[0.12em]',
                darkMode ? 'text-[#858585]' : 'text-text-main/50',
              )}
            >
              用量
            </p>
            <p className={cn('mt-1 text-[11px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>本月 Token 消耗</p>
          </div>
          <span
            className={cn(
              'font-mono text-[10px] uppercase tracking-[0.12em]',
              darkMode ? 'text-[#858585]' : 'text-text-main/50',
            )}
          >
            {month}
          </span>
        </div>
        {loading.usage ? (
          <MiniSkeleton darkMode={darkMode} />
        ) : errors.usage ? (
          <ErrorText darkMode={darkMode} text={errors.usage} />
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div className={cn('text-[32px] font-bold leading-none', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                {formatCompactNumber(totalTokens)}
              </div>
              <span className="inline-flex items-center gap-1 rounded-[7px] bg-[var(--color-primary-light)] px-2 py-1 text-[11px] font-semibold text-[#8a6a44]">
                <TrendingUp size={12} />
                +18%
              </span>
            </div>
            <div className={cn('h-[9px] overflow-hidden rounded-full', darkMode ? 'bg-[#3c3c3c]' : 'bg-text-main/10')}>
              <div className="flex h-full w-full">
                <div className="bg-primary" style={{ width: `${inputPercent}%` }} />
                <div className="flex-1 bg-[#7BA5A0]" />
              </div>
            </div>
            <div
              className={cn('mt-3 flex justify-between text-[11px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}
            >
              <span>输入 {formatCompactNumber(inputTokens)}</span>
              <span>输出 {formatCompactNumber(outputTokens)}</span>
            </div>
            <div className={cn('my-5 border-t', darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle')} />
            <p
              className={cn(
                'mb-3 font-mono text-[10px] uppercase tracking-[0.12em]',
                darkMode ? 'text-[#858585]' : 'text-text-main/50',
              )}
            >
              按模型
            </p>
            <div className="space-y-3">
              {(usageByModel.length ? usageByModel : [{ name: '暂无记录', percent: 0 }]).map((model, index) => (
                <ModelUsageRow key={model.name} darkMode={darkMode} model={model} index={index} />
              ))}
            </div>
            <Link
              to={Routes.Usage}
              className={cn(
                'mt-auto pt-4 font-mono text-[10px] uppercase tracking-[0.12em] hover:text-primary',
                darkMode ? 'text-[#858585]' : 'text-text-main/50',
              )}
            >
              查看用量详情
            </Link>
          </div>
        )}
      </InfoCard>
    </aside>
  );
}

function InfoCard({ darkMode, className, children }: { darkMode: boolean; className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-[24px] border p-5',
        darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white/80',
        className,
      )}
    >
      {children}
    </section>
  );
}

function HealthTile({
  darkMode,
  value,
  label,
  highlight = false,
}: {
  darkMode: boolean;
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-[13px] border p-3',
        highlight
          ? 'border-[var(--color-primary-mid)] bg-[var(--color-primary-light)] text-[#8a6a44]'
          : darkMode
            ? 'border-[#3c3c3c] bg-[#1e1e1e]'
            : 'border-border-subtle bg-white',
      )}
    >
      <div className="text-xl font-bold leading-none">{value}</div>
      <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] opacity-70">{label}</div>
    </div>
  );
}

function ParseFileRow({ darkMode, file }: { darkMode: boolean; file: ParseFile }) {
  const meta = {
    parsing: {
      label: '解析中',
      dot: darkMode ? '#3b82f6' : 'var(--color-primary)',
      cls: 'bg-[var(--color-primary-light)] text-[#8a6a44]',
    },
    done: { label: '已完成', dot: 'var(--color-success)', cls: 'bg-[rgba(34,197,94,0.12)] text-[#3f7a5f]' },
    failed: { label: '失败', dot: 'var(--color-error)', cls: 'bg-[rgba(217,115,115,0.14)] text-[#b85a5a]' },
  }[file.status];
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn('h-[7px] w-[7px] shrink-0 rounded-full', file.status === 'parsing' && 'animate-pulse')}
        style={{ background: meta.dot }}
      />
      <span
        className={cn('min-w-0 flex-1 truncate text-xs font-medium', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}
      >
        {file.name}
      </span>
      <span className={cn('shrink-0 rounded-md px-2 py-[3px] text-[9px] font-semibold', meta.cls)}>{meta.label}</span>
    </div>
  );
}

function ModelUsageRow({
  darkMode,
  model,
  index,
}: {
  darkMode: boolean;
  model: { name: string; percent: number };
  index: number;
}) {
  const colors = ['bg-primary', 'bg-[#7BA5A0]', darkMode ? 'bg-[#858585]' : 'bg-text-main/30'];
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className={cn('truncate text-xs font-medium', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
          {model.name}
        </span>
        <span className={cn('font-mono text-[10px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
          {model.percent}%
        </span>
      </div>
      <div className={cn('h-[5px] overflow-hidden rounded-full', darkMode ? 'bg-[#3c3c3c]' : 'bg-text-main/10')}>
        <div className={cn('h-full rounded-full', colors[index] || colors[2])} style={{ width: `${model.percent}%` }} />
      </div>
    </div>
  );
}

function MiniSkeleton({ darkMode }: { darkMode: boolean }) {
  return (
    <div className="space-y-3">
      <div className={cn('h-8 w-28 animate-pulse rounded-lg', darkMode ? 'bg-[#2d2d2d]' : 'bg-bg-base')} />
      <div className={cn('h-20 animate-pulse rounded-xl', darkMode ? 'bg-[#2d2d2d]' : 'bg-bg-base')} />
    </div>
  );
}

function ErrorText({ darkMode, text }: { darkMode: boolean; text: string }) {
  return (
    <p
      className={cn(
        'rounded-xl border border-dashed px-3 py-5 text-center text-xs',
        darkMode ? 'border-[#3c3c3c] text-[#858585]' : 'border-border-subtle text-text-main/45',
      )}
    >
      {text}
    </p>
  );
}
