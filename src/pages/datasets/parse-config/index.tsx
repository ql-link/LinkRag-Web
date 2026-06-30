import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ChangeEvent } from 'react';
import { useBeforeUnload, useNavigate, useParams } from 'react-router';
import { AlertCircle, Box, BrainCircuit, Check, Loader2 } from 'lucide-react';
import denseIconUrl from '@/assets/icons/color/dense.svg';
import sparseIconUrl from '@/assets/icons/color/sparse.svg';
import { Breadcrumb } from '@/components/Breadcrumb';
import { EmbeddingModelSelect } from '@/components/EmbeddingModelSelect';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import {
  createProviderModelDisplayNameMap,
  getModelDisplayName,
  getProviderModelDisplayName,
} from '@/lib/model-display';
import { getProviderIcon, normalizeProviderToken } from '@/lib/provider-icons';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { getDataset, getDatasetParseConfig, updateDatasetParseConfig } from '@/services/dataset';
import { getDefaultLLMConfig, getLLMConfigs, getLLMProviders } from '@/services/llm';
import type { DatasetDTO, LLMConfigDTO, ProviderModelDTO, RecallSource } from '@/types/api';
import {
  DEFAULT_VALUES,
  GROUPS,
  isEditableKey,
  isRecallSource,
  normalizeConfig,
  toRequest,
  validateValues,
  type EditableParamKey,
  type ParamGroup,
  type ParamSpec,
  type ParseConfigValues,
} from './config-model';

type DefaultModels = {
  chat: DefaultModelInfo | null;
  vision: DefaultModelInfo | null;
};

type DefaultModelInfo = {
  providerType: string;
  providerName: string;
  modelName: string;
  displayName?: string | null;
};

const DISPLAY_MODEL_FALLBACK = '未配置默认模型';
const LEAVE_MESSAGE = '解析配置有未保存改动，确定离开吗？';
const EMBEDDING_BINDING_SECTION_ID = 'embedding-binding';

function createDefaultModelInfo(config: LLMConfigDTO, providers: ProviderModelDTO[]): DefaultModelInfo {
  const provider = providers.find((item) => item.providerType === config.providerType);
  const providerDisplayNames = createProviderModelDisplayNameMap(providers);
  return {
    providerType: config.providerType,
    providerName: provider?.providerName || config.providerType,
    modelName: config.modelName,
    displayName:
      config.displayName?.trim() ||
      getProviderModelDisplayName(providerDisplayNames, config.providerType, config.modelName) ||
      config.displayName,
  };
}

function getComparable(values: ParseConfigValues) {
  return JSON.stringify(values);
}

function formatValue(value: number | null) {
  if (value === null) return '';
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function getRangeProgress(value: number | null, min?: number, max?: number) {
  if (value === null || min === undefined || max === undefined || max <= min) return '0%';
  const clamped = Math.min(max, Math.max(min, value));
  return `${((clamped - min) / (max - min)) * 100}%`;
}

function isDisabled(param: ParamSpec, values: ParseConfigValues) {
  if (param.key === 'table_model') return !values.enable_table_enhancement;
  if (param.key === 'vision_model') return !values.enable_image_enhancement;
  return false;
}

export default function DatasetParseConfigPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [dataset, setDataset] = useState<DatasetDTO | null>(null);
  const [values, setValues] = useState<ParseConfigValues>(DEFAULT_VALUES);
  const [initial, setInitial] = useState<ParseConfigValues>(DEFAULT_VALUES);
  const [defaultModels, setDefaultModels] = useState<DefaultModels>({ chat: null, vision: null });
  const [sparseEmbeddingConfigs, setSparseEmbeddingConfigs] = useState<LLMConfigDTO[]>([]);
  const [denseEmbeddingConfigs, setDenseEmbeddingConfigs] = useState<LLMConfigDTO[]>([]);
  const [embeddingConfigsLoading, setEmbeddingConfigsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const datasetId = Number(id);
  const allParams = useMemo(() => GROUPS.flatMap((group) => group.params), []);
  const errors = useMemo(() => validateValues(values, allParams), [allParams, values]);
  const bindingErrors = useMemo(
    () => ({
      ...(values.sparse_embedding_config_id ? {} : { sparse_embedding_config_id: '请选择稀疏向量模型' }),
      ...(values.dense_embedding_config_id ? {} : { dense_embedding_config_id: '请选择稠密向量模型' }),
    }),
    [values.dense_embedding_config_id, values.sparse_embedding_config_id],
  );
  const errorCount = Object.keys(errors).length + Object.keys(bindingErrors).length;
  const dirty = getComparable(values) !== getComparable(initial);
  const saveDisabled = !dirty || errorCount > 0 || saving;
  const embeddingBindingChanged =
    values.sparse_embedding_config_id !== initial.sparse_embedding_config_id ||
    values.dense_embedding_config_id !== initial.dense_embedding_config_id;

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!dirty || saving) return;
        event.preventDefault();
        event.returnValue = LEAVE_MESSAGE;
      },
      [dirty, saving],
    ),
    { capture: true },
  );

  useEffect(() => {
    if (!dirty || saving) return;

    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest('a[href]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      const nextUrl = new URL(href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;

      const currentPath = `${window.location.pathname}${window.location.search}`;
      const nextPath = `${nextUrl.pathname}${nextUrl.search}`;
      if (currentPath === nextPath) return;

      if (!confirm(LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
  }, [dirty, saving]);

  useEffect(() => {
    if (!id || Number.isNaN(datasetId)) {
      setErrorMessage('知识库地址不正确。');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setEmbeddingConfigsLoading(true);
      setErrorMessage('');

      try {
        const [datasetResult, configResult, chatResult, visionResult, providersResult] = await Promise.allSettled([
          getDataset(datasetId),
          getDatasetParseConfig(datasetId),
          getDefaultLLMConfig('CHAT'),
          getDefaultLLMConfig('VISION'),
          getLLMProviders(),
        ]);
        const [sparseConfigsResult, denseConfigsResult] = await Promise.allSettled([
          getLLMConfigs({ capability: 'SPARSE_EMBEDDING', isActive: true }),
          getLLMConfigs({ capability: 'EMBEDDING', isActive: true }),
        ]);

        if (cancelled) return;

        if (datasetResult.status !== 'fulfilled') {
          throw datasetResult.reason;
        }
        if (configResult.status !== 'fulfilled') {
          throw configResult.reason;
        }

        const normalized = normalizeConfig(configResult.value);
        const providers = providersResult.status === 'fulfilled' ? providersResult.value : [];
        setDataset(datasetResult.value);
        setValues(normalized);
        setInitial(normalized);
        setDefaultModels({
          chat: chatResult.status === 'fulfilled' ? createDefaultModelInfo(chatResult.value, providers) : null,
          vision: visionResult.status === 'fulfilled' ? createDefaultModelInfo(visionResult.value, providers) : null,
        });
        setSparseEmbeddingConfigs(
          sparseConfigsResult.status === 'fulfilled'
            ? sparseConfigsResult.value.filter((config) => config.capability === 'SPARSE_EMBEDDING' && config.isActive)
            : [],
        );
        setDenseEmbeddingConfigs(
          denseConfigsResult.status === 'fulfilled'
            ? denseConfigsResult.value.filter((config) => config.capability === 'EMBEDDING' && config.isActive)
            : [],
        );
      } catch (error) {
        console.error('Failed to load dataset parse config:', error);
        if (!cancelled) {
          setErrorMessage('解析配置加载失败，请检查后端服务或稍后重试。');
          setDataset(null);
        }
      } finally {
        if (!cancelled) {
          setEmbeddingConfigsLoading(false);
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [datasetId, id]);

  function updateValue(key: EditableParamKey, value: ParseConfigValues[EditableParamKey]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function updateEmbeddingBinding(
    key: 'sparse_embedding_config_id' | 'dense_embedding_config_id',
    value: number | null,
  ) {
    if (initial[key] !== null) {
      return;
    }
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleRestoreDefault() {
    setValues((prev) => ({
      ...DEFAULT_VALUES,
      sparse_embedding_config_id: prev.sparse_embedding_config_id,
      dense_embedding_config_id: prev.dense_embedding_config_id,
      enable_table_enhancement: !!defaultModels.chat,
      enable_image_enhancement: !!defaultModels.vision,
    }));
  }

  function handleDiscard() {
    setValues({ ...initial });
  }

  async function handleSave() {
    if (!dataset || saveDisabled) return;
    if (!values.sparse_embedding_config_id || !values.dense_embedding_config_id) {
      addToast('error', '该数据集缺少向量模型绑定，请补全后再保存');
      return;
    }

    setSaving(true);
    try {
      await updateDatasetParseConfig(dataset.id, toRequest(values));
      setInitial({ ...values });
      addToast('success', '配置已保存', 2200);
    } catch (error) {
      console.error('Failed to save dataset parse config:', error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <div className="flex flex-col items-center">
          <Loader2 size={24} className="mb-3 animate-spin text-ink" />
          <div className="mono-label text-muted">加载中...</div>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-canvas">
        <AlertCircle size={30} className="mb-3 text-error" />
        <p className="mb-2 text-lg text-ink">解析配置不可用</p>
        <p className="mb-4 text-sm text-muted">{errorMessage || '知识库不存在或无权访问'}</p>
        <button
          type="button"
          onClick={() => navigate(Routes.Datasets)}
          className="rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-wider bg-primary text-white hover:bg-primary-active"
        >
          返回知识库列表
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-canvas text-text-main">
      <header className="flex shrink-0 items-center justify-end gap-2 px-4 pt-3 pb-2 lg:h-16 lg:justify-between lg:px-8 lg:py-0">
        <div className="hidden min-w-0 lg:block">
          <Breadcrumb
            items={[
              { label: '首页', path: Routes.Home },
              { label: '知识库', path: Routes.Datasets },
              { label: dataset.name, path: `/datasets/${dataset.id}` },
              { label: '解析配置' },
            ]}
          />
        </div>

        <div className="flex min-w-0 items-center gap-1.5 lg:shrink-0 lg:gap-2">
          {dirty && (
            <span className="hidden h-9 items-center rounded-lg bg-primary/8 px-3 text-xs font-bold text-text-secondary lg:inline-flex">
              未保存改动
            </span>
          )}
          {dirty && (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving}
              className="inline-flex h-9 items-center rounded-lg bg-transparent px-2.5 text-xs font-bold text-text-secondary transition-colors hover:bg-primary/[0.06] hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 lg:px-3"
            >
              放弃
            </button>
          )}
          <button
            type="button"
            onClick={handleRestoreDefault}
            disabled={saving}
            className="inline-flex h-9 items-center rounded-lg bg-transparent px-2.5 text-xs font-bold text-text-secondary transition-colors hover:bg-primary/[0.06] hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 lg:px-3"
          >
            默认
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saveDisabled}
            className="inline-flex h-9 min-w-[64px] items-center justify-center rounded-lg bg-primary px-3 text-xs font-bold text-white transition-colors hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-45 lg:min-w-[82px] lg:px-4"
          >
            {saving ? '保存中' : '保存'}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pt-8 lg:pb-8">
        <div className="w-full">
          <div className="flex min-w-0 flex-col gap-0">
            <EmbeddingBindingSection
              sparseConfigs={sparseEmbeddingConfigs}
              denseConfigs={denseEmbeddingConfigs}
              sparseValue={values.sparse_embedding_config_id}
              denseValue={values.dense_embedding_config_id}
              sparseError={bindingErrors.sparse_embedding_config_id}
              denseError={bindingErrors.dense_embedding_config_id}
              sparseLocked={initial.sparse_embedding_config_id !== null}
              denseLocked={initial.dense_embedding_config_id !== null}
              loading={embeddingConfigsLoading}
              disabled={saving}
              changed={embeddingBindingChanged}
              onChange={updateEmbeddingBinding}
            />
            {GROUPS.map((group) => (
              <ConfigGroup
                key={group.id}
                group={group}
                values={values}
                errors={errors}
                disabled={saving}
                displayModels={defaultModels}
                onChange={updateValue}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function EmbeddingBindingSection({
  sparseConfigs,
  denseConfigs,
  sparseValue,
  denseValue,
  sparseError,
  denseError,
  sparseLocked,
  denseLocked,
  loading,
  disabled,
  changed,
  onChange,
}: {
  sparseConfigs: LLMConfigDTO[];
  denseConfigs: LLMConfigDTO[];
  sparseValue: number | null;
  denseValue: number | null;
  sparseError?: string;
  denseError?: string;
  sparseLocked: boolean;
  denseLocked: boolean;
  loading: boolean;
  disabled: boolean;
  changed: boolean;
  onChange: (key: 'sparse_embedding_config_id' | 'dense_embedding_config_id', value: number | null) => void;
}) {
  const sparseUnavailable = !loading && sparseConfigs.length === 0;
  const denseUnavailable = !loading && denseConfigs.length === 0;
  const LOCKED_HINT = '已绑定，不可修改';

  return (
    <section id={EMBEDDING_BINDING_SECTION_ID} className="scroll-mt-8 border-b border-border-subtle pb-8">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2 lg:gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center bg-transparent">
            <BrainCircuit size={18} className="text-primary" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15.5px] font-bold text-ink">向量模型绑定</h2>
            <p className="mt-0.5 text-[11.5px] leading-5 text-muted">绑定召回使用的稀疏与稠密向量模型</p>
          </div>
        </div>
        {changed && <span className="shrink-0 text-[11px] font-semibold text-primary">已修改</span>}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <EmbeddingModelSelect
          label="稀疏向量模型"
          iconUrl={sparseIconUrl}
          value={sparseValue}
          configs={sparseConfigs}
          error={sparseError}
          unavailableMessage="请先配置并启用 SPARSE_EMBEDDING 能力模型"
          loading={loading}
          disabled={disabled || sparseLocked}
          helperText={sparseLocked ? LOCKED_HINT : sparseUnavailable ? '暂无可用配置' : ''}
          onChange={(value) => onChange('sparse_embedding_config_id', value)}
        />
        <EmbeddingModelSelect
          label="稠密向量模型"
          iconUrl={denseIconUrl}
          value={denseValue}
          configs={denseConfigs}
          error={denseError}
          unavailableMessage="请先配置并启用 EMBEDDING 能力模型"
          loading={loading}
          disabled={disabled || denseLocked}
          helperText={denseLocked ? LOCKED_HINT : denseUnavailable ? '暂无可用配置' : ''}
          onChange={(value) => onChange('dense_embedding_config_id', value)}
        />
      </div>
      {changed && (
        <p className="mt-1 text-[11px] leading-5 text-muted">绑定后不可修改，历史文件可能需要重新解析或重建向量。</p>
      )}
    </section>
  );
}

function ConfigGroup({
  group,
  values,
  errors,
  disabled,
  displayModels,
  embedded = false,
  onChange,
}: {
  group: ParamGroup;
  values: ParseConfigValues;
  errors: Partial<Record<EditableParamKey, string>>;
  disabled: boolean;
  displayModels: DefaultModels;
  embedded?: boolean;
  onChange: (key: EditableParamKey, value: ParseConfigValues[EditableParamKey]) => void;
}) {
  const Icon = group.icon;

  return (
    <section
      id={embedded ? undefined : group.id}
      className="scroll-mt-8 border-b border-border-subtle py-8 last:border-b-0"
    >
      <header className={cn('flex items-start gap-2 px-1 pb-5 pt-0 lg:gap-3 lg:px-0', embedded && 'hidden lg:flex')}>
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center bg-transparent">
          <Icon size={18} className={group.colorClass} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15.5px] font-bold text-ink">{group.name}</h2>
          <p className="mt-0.5 text-[11.5px] leading-5 text-muted">{group.note}</p>
        </div>
      </header>
      <div
        className={cn(
          'grid gap-x-10 gap-y-4 px-1 pb-2 pt-0 lg:px-0 lg:pb-0',
          group.columns === 'single' ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2',
        )}
      >
        {group.params
          .filter((param) => !param.visibleWhen || param.visibleWhen(values))
          .map((param) => (
            <ParamField
              key={param.key}
              param={param}
              values={values}
              error={isEditableKey(param.key) ? errors[param.key] : undefined}
              disabled={disabled || isDisabled(param, values)}
              spanFull={param.span === 'full'}
              displayModel={
                param.key === 'table_model'
                  ? displayModels.chat
                  : param.key === 'vision_model'
                    ? displayModels.vision
                    : undefined
              }
              onChange={onChange}
            />
          ))}
      </div>
    </section>
  );
}

function ParamField({
  param,
  values,
  error,
  disabled,
  spanFull,
  displayModel,
  onChange,
}: {
  param: ParamSpec;
  values: ParseConfigValues;
  error?: string;
  disabled: boolean;
  spanFull: boolean;
  displayModel?: DefaultModelInfo | null;
  onChange: (key: EditableParamKey, value: ParseConfigValues[EditableParamKey]) => void;
}) {
  const editableKey = isEditableKey(param.key) ? param.key : null;
  const rawValue = editableKey ? values[editableKey] : null;
  const numericValue = typeof rawValue === 'number' ? rawValue : null;
  const booleanValue = typeof rawValue === 'boolean' ? rawValue : false;
  const segmentValue = typeof rawValue === 'string' || rawValue === null ? rawValue : null;
  const arrayValue = Array.isArray(rawValue) ? rawValue : [];
  const compactOptions = Boolean(param.compactOptions);

  function handleNumberChange(event: ChangeEvent<HTMLInputElement>) {
    if (!editableKey) return;
    const next = event.target.value === '' ? null : Number(event.target.value);
    onChange(editableKey, next as ParseConfigValues[EditableParamKey]);
  }

  function handleMultiSelectChange(source: RecallSource) {
    if (!editableKey) return;
    const next = arrayValue.includes(source) ? arrayValue.filter((item) => item !== source) : [...arrayValue, source];
    onChange(editableKey, next as ParseConfigValues[EditableParamKey]);
  }

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-2 pb-3 last:pb-0',
        spanFull && 'xl:col-span-2',
        param.type === 'multiselect' && 'gap-3',
        disabled && 'pointer-events-none opacity-40',
      )}
      title={[param.envKey, param.description].filter(Boolean).join(' · ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-ink">{param.label}</p>
        </div>
        <div className="shrink-0">
          {param.type === 'toggle' && editableKey && (
            <button
              type="button"
              onClick={() => onChange(editableKey, !booleanValue as ParseConfigValues[EditableParamKey])}
              className={cn(
                'flex h-6 w-[42px] items-center rounded-full p-[3px] transition-colors',
                booleanValue ? 'bg-primary' : 'bg-text-main/15',
              )}
              aria-label={param.label}
            >
              <span
                className={cn(
                  'h-[18px] w-[18px] rounded-full bg-white  transition-transform',
                  booleanValue && 'translate-x-[18px]',
                )}
              />
            </button>
          )}
          {param.type === 'number' && editableKey && (
            <input
              type="number"
              value={numericValue === null ? '' : numericValue}
              min={param.min}
              max={param.max}
              step={param.step ?? 1}
              onChange={handleNumberChange}
              className={cn(
                'h-8 w-[84px] rounded-md bg-primary/[0.04] px-2 text-right font-mono text-[13px] font-medium text-text-main outline-none transition-colors focus:bg-primary/[0.08]',
                error && 'bg-error/10 text-error focus:bg-error/10',
              )}
            />
          )}
          {param.type === 'slider' && (
            <span className="font-mono text-[13px] font-semibold text-ink">
              {numericValue === null ? '-' : formatValue(numericValue)}
            </span>
          )}
          {param.type === 'multiselect' && (
            <span className="font-mono text-[12px] font-semibold text-text-secondary">
              {arrayValue.length}/{param.options?.length ?? 0}
            </span>
          )}
        </div>
      </div>

      {param.type === 'slider' && editableKey && (
        <input
          type="range"
          value={numericValue ?? param.min}
          min={param.min}
          max={param.max}
          step={param.step ?? 1}
          style={{ '--range-progress': getRangeProgress(numericValue, param.min, param.max) } as CSSProperties}
          onChange={(event) => onChange(editableKey, Number(event.target.value) as ParseConfigValues[EditableParamKey])}
          className="parse-config-range h-2 w-full cursor-pointer accent-primary"
        />
      )}

      {param.type === 'segment' && editableKey && (
        <div className={cn('grid gap-1', compactOptions ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4')}>
          {param.options?.map((option) => {
            const active = segmentValue === option.value;
            return (
              <button
                key={option.value ?? 'system-default'}
                type="button"
                onClick={() => onChange(editableKey, option.value as ParseConfigValues[EditableParamKey])}
                className={cn(
                  'min-w-0 rounded-md text-center transition-colors',
                  compactOptions ? 'px-1.5 py-1.5' : 'px-3 py-1.5',
                  active ? 'bg-primary/10 text-ink' : 'text-muted hover:bg-primary/[0.04]',
                )}
              >
                <span
                  className={cn(
                    'block max-w-full truncate font-semibold leading-tight',
                    compactOptions ? 'text-[11px]' : 'text-xs',
                  )}
                >
                  {option.label}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block max-w-full truncate font-mono uppercase leading-tight text-muted-soft',
                    compactOptions ? 'text-[7.5px]' : 'text-[8.5px]',
                  )}
                >
                  {option.value ?? 'default'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {param.type === 'multiselect' && editableKey && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {param.options?.map((option) => {
            if (typeof option.value !== 'string' || !isRecallSource(option.value)) return null;

            const source = option.value;
            const active = arrayValue.includes(source);
            return (
              <button
                key={source}
                type="button"
                onClick={() => handleMultiSelectChange(source)}
                aria-pressed={active}
                className={cn(
                  'rounded-md px-2 py-1.5 text-center transition-colors',
                  active ? 'bg-primary/10 text-ink' : 'text-muted hover:bg-primary/[0.04]',
                )}
              >
                <span className="flex items-center justify-center gap-1 text-xs font-semibold">
                  <Check size={11} className={cn('transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
                  {option.label}
                </span>
                <span className="mt-0.5 block font-mono text-[9px] uppercase text-muted">{source}</span>
              </button>
            );
          })}
        </div>
      )}

      {param.type === 'display' && <ReadonlyModelField model={displayModel} hint={param.displaySub} />}

      {error && (
        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-error">
          <AlertCircle size={12} />
          {error}
        </p>
      )}

      {param.showDescription && param.description && param.type !== 'display' && (
        <p className="text-[11.5px] leading-5 text-muted">{param.description}</p>
      )}
    </div>
  );
}

function ReadonlyModelField({ model, hint }: { model?: DefaultModelInfo | null; hint?: string }) {
  const { darkMode } = useTheme();
  const iconUrl = model ? getProviderIcon(model.providerType, model.providerName, model.modelName, { darkMode }) : '';

  return (
    <div className="flex min-w-0 items-center gap-2 py-2">
      <ProviderIcon iconUrl={iconUrl} name={model?.providerName || '默认模型'} />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-mono text-[12.5px] font-semibold', model ? 'text-ink' : 'text-error')}>
          {getModelDisplayName(model) || DISPLAY_MODEL_FALLBACK}
        </p>
        <p className="mt-0.5 truncate text-[10.5px] text-muted">
          {model ? `${model.providerName} · ${hint || '跟随用户默认模型'}` : hint || '跟随用户默认模型'}
        </p>
      </div>
    </div>
  );
}

const INSET_PROVIDER_ICON_KEYS = ['mimo', 'xiaomi', 'xiaomimimo', 'xai', 'jina'];

function shouldInsetProviderIcon(name: string, iconUrl: string) {
  const token = normalizeProviderToken(`${name} ${iconUrl}`);
  return INSET_PROVIDER_ICON_KEYS.some((key) => token.includes(key));
}

function ProviderIcon({ iconUrl, name }: { iconUrl: string; name: string }) {
  const iconInsetClass = shouldInsetProviderIcon(name, iconUrl) ? 'p-1' : 'p-0';

  if (iconUrl) {
    return (
      <div className="h-6 w-6 shrink-0 overflow-hidden border-0 bg-transparent">
        <img src={iconUrl} alt={name} className={cn('h-full w-full object-contain', iconInsetClass)} />
      </div>
    );
  }

  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center border-0 bg-transparent">
      <Box size={14} className="text-ink" />
    </div>
  );
}
