import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AlertCircle, Box, Check, ChevronDown, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { getProviderIcon } from '@/lib/provider-icons';
import { cn } from '@/lib/utils';
import type { ExecutableLLMConfigDTO } from '@/types/api';

interface LLMConfigSelectProps {
  label: string;
  value: number | null;
  configs: ExecutableLLMConfigDTO[];
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  unavailableMessage: string;
  helperText?: string;
  iconUrl?: string;
  onChange: (configId: number | null) => void;
}

function labelOf(config: ExecutableLLMConfigDTO) {
  return config.displayName?.trim() || config.modelName;
}

function providerOf(config: ExecutableLLMConfigDTO) {
  return config.providerName?.trim() || config.providerType;
}

export function LLMConfigSelect({
  label,
  value,
  configs,
  loading = false,
  disabled = false,
  error,
  unavailableMessage,
  helperText = '提交全局 configId',
  iconUrl,
  onChange,
}: LLMConfigSelectProps) {
  const { darkMode } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<CSSProperties>();
  const selected = useMemo(() => configs.find((config) => config.configId === value) ?? null, [configs, value]);
  const historical = value !== null && !selected;
  const unavailable = !loading && configs.length === 0 && value === null;
  const inactive = disabled || loading || unavailable;

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 6;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(280, openAbove ? spaceAbove : spaceBelow));
      setPosition({
        position: 'fixed',
        left: rect.left,
        top: openAbove ? rect.top - maxHeight - gap : rect.bottom + gap,
        width: rect.width,
        maxHeight,
        zIndex: 80,
      });
    };
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    };
    update();
    document.addEventListener('mousedown', close);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (inactive) setOpen(false);
  }, [inactive]);

  const selectedIcon = selected
    ? getProviderIcon(selected.providerType, providerOf(selected), selected.modelName, { darkMode })
    : iconUrl;
  const helper = error || (unavailable ? unavailableMessage : helperText);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary">
        {iconUrl && <img src={iconUrl} alt="" aria-hidden="true" className="h-3.5 w-3.5 object-contain" />}
        {label}
      </label>
      <button
        ref={buttonRef}
        type="button"
        disabled={inactive}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-config-id={value ?? undefined}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-lg bg-primary/[0.04] px-2 text-left transition-colors',
          'hover:bg-primary/[0.07] focus:bg-primary/[0.08] focus:outline-none',
          error && 'bg-error/10',
          inactive && 'cursor-not-allowed opacity-60',
        )}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden text-muted">
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : unavailable ? (
            <AlertCircle size={14} className="text-error" />
          ) : selectedIcon ? (
            <img src={selectedIcon} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
          ) : (
            <Box size={14} />
          )}
        </span>
        <span className={cn('min-w-0 flex-1 truncate text-sm font-semibold', value ? 'text-ink' : 'text-muted')}>
          {loading
            ? '加载中'
            : selected
              ? labelOf(selected)
              : historical
                ? `当前绑定 #${value}`
                : unavailable
                  ? '暂无可用'
                  : '选择模型'}
        </span>
        <ChevronDown size={16} className={cn('text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {helper && <p className={cn('mt-1 text-[11px] leading-5', error ? 'text-error' : 'text-muted')}>{helper}</p>}

      {open &&
        position &&
        createPortal(
          <div
            ref={listRef}
            role="listbox"
            style={position}
            className="overflow-y-auto rounded-xl bg-bg-frosted p-1.5 shadow-dialog"
          >
            {historical && (
              <div
                role="option"
                aria-selected="true"
                data-config-id={value}
                className="mb-1 flex items-center gap-2 rounded-lg bg-primary/8 px-2.5 py-2 text-sm font-semibold"
              >
                <Box size={14} />
                <span className="flex-1">当前绑定 #{value}</span>
                <Check size={14} className="text-primary" />
              </div>
            )}
            {configs.map((config) => {
              const active = config.configId === value;
              const providerIcon = getProviderIcon(config.providerType, providerOf(config), config.modelName, {
                darkMode,
              });
              return (
                <button
                  key={config.configId}
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-config-id={config.configId}
                  onClick={() => {
                    onChange(config.configId);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left',
                    active ? 'bg-primary/10 text-ink' : 'text-text-secondary hover:bg-bg-card-solid',
                  )}
                >
                  <span className="flex h-6 w-6 items-center justify-center">
                    {providerIcon ? (
                      <img src={providerIcon} alt="" className="h-5 w-5 object-contain" />
                    ) : (
                      <Box size={14} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{labelOf(config)}</span>
                    <span className="block truncate text-[11px] text-muted">
                      {providerOf(config)} · {config.scope === 'SYSTEM' ? '平台' : '自定义'} · #{config.configId}
                    </span>
                  </span>
                  <Check size={14} className={cn('text-primary', active ? 'opacity-100' : 'opacity-0')} />
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
