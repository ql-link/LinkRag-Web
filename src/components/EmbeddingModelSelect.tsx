import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Box, Check, ChevronDown, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getProviderIcon } from '@/lib/provider-icons';
import { cn } from '@/lib/utils';
import type { LLMConfigDTO, LLMConfigSource } from '@/types/api';

export type EmbeddingModelBindingValue = {
  id: number;
  source: LLMConfigSource;
};

interface EmbeddingModelSelectProps {
  label: string;
  value: EmbeddingModelBindingValue | null;
  configs: LLMConfigDTO[];
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  unavailableMessage: string;
  helperText?: string;
  iconUrl?: string;
  onChange: (value: EmbeddingModelBindingValue | null) => void;
}

const LINKRAG_PROVIDER_TYPE = 'linkrag';
const DEFAULT_CONFIG_SOURCE: LLMConfigSource = 'USER';

function getConfigSource(config: LLMConfigDTO): LLMConfigSource {
  return config.source || (config.isSystemPreset || config.isEditable === false ? 'SYSTEM' : DEFAULT_CONFIG_SOURCE);
}

function isSameBinding(config: LLMConfigDTO, value: EmbeddingModelBindingValue | null) {
  return value !== null && config.id === value.id && getConfigSource(config) === value.source;
}

function getConfigLabel(config: LLMConfigDTO) {
  return config.displayName?.trim() || config.modelName;
}

function getConfigSubLabel(config: LLMConfigDTO) {
  return `${getConfigProviderName(config)} · ${getConfigSource(config)} · #${config.id}`;
}

function getConfigProviderType(config: LLMConfigDTO) {
  return config.isSystemPreset || config.isEditable === false ? LINKRAG_PROVIDER_TYPE : config.providerType;
}

function getConfigProviderName(config: LLMConfigDTO) {
  return config.isSystemPreset || config.isEditable === false ? 'LinkRag' : config.providerType;
}

function ProviderIcon({
  config,
  fallbackIconUrl,
  darkMode,
}: {
  config?: LLMConfigDTO | null;
  fallbackIconUrl?: string;
  darkMode: boolean;
}) {
  const iconUrl =
    fallbackIconUrl ||
    (config
      ? getProviderIcon(getConfigProviderType(config), getConfigProviderName(config), config.modelName, { darkMode })
      : '');

  if (iconUrl) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden">
        <img src={iconUrl} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
      </span>
    );
  }

  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center text-muted">
      <Box size={14} />
    </span>
  );
}

export function EmbeddingModelSelect({
  label,
  value,
  configs,
  loading = false,
  disabled = false,
  error,
  unavailableMessage,
  helperText = '提交配置项 ID，不使用 modelName',
  iconUrl,
  onChange,
}: EmbeddingModelSelectProps) {
  const { darkMode } = useTheme();
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(() => configs.find((config) => isSameBinding(config, value)) ?? null, [configs, value]);
  const hasHistoricalBinding = value !== null && !selected;
  const unavailable = !loading && configs.length === 0 && value === null;
  const inactive = disabled || loading || unavailable;

  const updateDropdownStyle = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const gap = 6;
    const spaceBelow = viewportHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(280, openAbove ? spaceAbove : spaceBelow));

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      top: openAbove ? rect.top - maxHeight - gap : rect.bottom + gap,
      width: rect.width,
      maxHeight,
      zIndex: 80,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateDropdownStyle();

    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function handlePositionChange() {
      updateDropdownStyle();
    }

    document.addEventListener('mousedown', handleClick);
    window.addEventListener('resize', handlePositionChange);
    window.addEventListener('scroll', handlePositionChange, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('resize', handlePositionChange);
      window.removeEventListener('scroll', handlePositionChange, true);
    };
  }, [open, updateDropdownStyle]);

  useEffect(() => {
    if (inactive) setOpen(false);
  }, [inactive]);

  const helper = error || (unavailable ? unavailableMessage : helperText);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary">
        {iconUrl && <img src={iconUrl} alt="" aria-hidden="true" className="h-3.5 w-3.5 object-contain" />}
        <span>{label}</span>
      </label>

      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!inactive) setOpen((current) => !current);
        }}
        disabled={inactive}
        className={cn(
          'group flex h-10 w-full items-center gap-2 rounded-lg bg-primary/[0.04] px-2 text-left transition-colors',
          'hover:bg-primary/[0.07] focus:bg-primary/[0.08] focus:outline-none',
          error && 'bg-error/10',
          inactive && 'cursor-not-allowed opacity-60',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {loading ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-muted">
            <Loader2 size={14} className="animate-spin" />
          </span>
        ) : unavailable ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-error">
            <AlertCircle size={14} />
          </span>
        ) : (
          <ProviderIcon config={selected} fallbackIconUrl={selected ? undefined : iconUrl} darkMode={darkMode} />
        )}

        <span className="min-w-0 flex-1 truncate">
          <span
            className={cn(
              'truncate text-sm font-semibold',
              selected || hasHistoricalBinding ? 'text-ink' : 'text-muted',
            )}
          >
            {loading
              ? '加载中'
              : selected
                ? getConfigLabel(selected)
                : hasHistoricalBinding
                  ? `当前绑定 ${value.source} #${value.id}`
                  : unavailable
                    ? '暂无可用'
                    : '选择模型'}
          </span>
        </span>

        {selected?.isDefault && (
          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            默认
          </span>
        )}

        <ChevronDown
          size={16}
          className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180', inactive && 'opacity-0')}
        />
      </button>

      {helper && (
        <p className={cn('mt-1 text-[11px] leading-5', error || unavailable ? 'text-error' : 'text-muted')}>{helper}</p>
      )}

      {open &&
        dropdownStyle &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            style={dropdownStyle}
            className="overflow-y-auto rounded-xl bg-bg-frosted p-1.5 shadow-dialog backdrop-blur-xl"
          >
            {hasHistoricalBinding && (
              <button
                type="button"
                role="option"
                aria-selected
                onClick={() => {
                  onChange(value);
                  setOpen(false);
                }}
                className="mb-1 flex w-full items-center gap-2 rounded-lg bg-primary/8 px-2.5 py-2 text-left"
              >
                <ProviderIcon fallbackIconUrl={iconUrl} darkMode={darkMode} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    当前绑定 {value.source} #{value.id}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">不在可用列表中</span>
                </span>
                <Check size={14} className="shrink-0 text-primary" />
              </button>
            )}

            {configs.map((config) => {
              const active = isSameBinding(config, value);
              return (
                <button
                  key={`${getConfigSource(config)}:${config.id}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange({ id: config.id, source: getConfigSource(config) });
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                    active ? 'bg-primary/10 text-ink' : 'text-text-secondary hover:bg-bg-card-solid hover:text-ink',
                  )}
                >
                  <ProviderIcon config={config} darkMode={darkMode} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{getConfigLabel(config)}</span>
                    <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-muted">
                      <span className="truncate">{getConfigSubLabel(config)}</span>
                      {config.isDefault && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                          默认
                        </span>
                      )}
                    </span>
                  </span>
                  <Check size={14} className={cn('shrink-0 text-primary', active ? 'opacity-100' : 'opacity-0')} />
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
