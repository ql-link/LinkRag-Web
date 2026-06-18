import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ChangeEvent } from 'react';
import { useBeforeUnload, useNavigate, useParams } from 'react-router';
import {
  AlertCircle,
  ArrowLeft,
  Box,
  Check,
  FileText,
  Layers3,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Sparkles,
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useToast } from '@/contexts/ToastContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getProviderIcon, isProviderIconMonochrome } from '@/lib/provider-icons';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { getDataset, getDatasetParseConfig, updateDatasetParseConfig } from '@/services/dataset';
import { getDefaultLLMConfig, getLLMProviders } from '@/services/llm';
import type {
  DatasetDTO,
  DatasetParseConfigDTO,
  LLMConfigDTO,
  PdfParserBackend,
  ProviderModelDTO,
  RecallSource,
} from '@/types/api';

type SegmentValue = string | null;
type ParamType = 'toggle' | 'number' | 'slider' | 'segment' | 'multiselect' | 'display';
type ParamKey =
  | 'heading_break_level'
  | 'min_candidate_chunk_tokens'
  | 'overlap_tokens'
  | 'enable_table_enhancement'
  | 'enable_image_enhancement'
  | 'pdf_parser_backend'
  | 'recall_result_limit'
  | 'recall_context_token_budget'
  | 'sparse_top_k'
  | 'sparse_score_threshold'
  | 'dense_top_k'
  | 'dense_score_threshold'
  | 'recall_enabled_sources'
  | 'rerank_top_n'
  | 'recall_strict'
  | 'table_model'
  | 'vision_model';

type EditableParamKey = Exclude<ParamKey, 'table_model' | 'vision_model'>;

type ParseConfigValues = {
  heading_break_level: number | null;
  min_candidate_chunk_tokens: number | null;
  overlap_tokens: number | null;
  enable_table_enhancement: boolean;
  enable_image_enhancement: boolean;
  pdf_parser_backend: PdfParserBackend | null;
  recall_result_limit: number | null;
  recall_context_token_budget: number | null;
  sparse_top_k: number | null;
  sparse_score_threshold: number | null;
  dense_top_k: number | null;
  dense_score_threshold: number | null;
  recall_enabled_sources: RecallSource[];
  rerank_top_n: number | null;
  recall_strict: boolean;
};

type DefaultModels = {
  chat: DefaultModelInfo | null;
  vision: DefaultModelInfo | null;
};

type DefaultModelInfo = {
  providerType: string;
  providerName: string;
  modelName: string;
};

interface ParamSpec {
  key: ParamKey;
  type: ParamType;
  label: string;
  envKey: string;
  description?: string;
  showDescription?: boolean;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  options?: Array<{ label: string; value: SegmentValue }>;
  displaySub?: string;
  span?: 'full';
}

interface ParamGroup {
  id: string;
  name: string;
  en: string;
  note: string;
  count: number;
  colorClass: string;
  tintClass: string;
  icon: typeof Layers3;
  columns: 'single' | 'double';
  params: ParamSpec[];
}

const DEFAULT_VALUES: ParseConfigValues = {
  heading_break_level: 5,
  min_candidate_chunk_tokens: 128,
  overlap_tokens: 64,
  enable_table_enhancement: true,
  enable_image_enhancement: true,
  pdf_parser_backend: null,
  recall_result_limit: 20,
  recall_context_token_budget: 4000,
  sparse_top_k: 10,
  sparse_score_threshold: 0,
  dense_top_k: 10,
  dense_score_threshold: 0,
  recall_enabled_sources: ['bm25', 'sparse', 'dense'],
  rerank_top_n: 8,
  recall_strict: false,
};

const RECALL_SOURCE_OPTIONS: Array<{ label: string; value: RecallSource }> = [
  { label: 'BM25', value: 'bm25' },
  { label: 'Sparse', value: 'sparse' },
  { label: 'Dense', value: 'dense' },
];

const ALLOWED_RECALL_SOURCES = new Set<RecallSource>(RECALL_SOURCE_OPTIONS.map((option) => option.value));

const GROUPS: ParamGroup[] = [
  {
    id: 'chunking',
    name: '分块策略',
    en: 'Chunking',
    note: '控制标题断层、候选块下限与块间重叠',
    count: 3,
    colorClass: 'bg-[#3B82F6]',
    tintClass: 'bg-[#3B82F6]/10',
    icon: Layers3,
    columns: 'double',
    params: [
      {
        key: 'heading_break_level',
        type: 'number',
        label: '标题分块层级',
        envKey: 'CHUNKING_HEADING_BREAK_LEVEL',
        min: 1,
        max: 6,
        step: 1,
        integer: true,
        description: '纳入标题断层判定的最大层级。',
      },
      {
        key: 'min_candidate_chunk_tokens',
        type: 'number',
        label: '候选分块最小 token',
        envKey: 'CHUNKING_MIN_CANDIDATE_CHUNK_TOKENS',
        min: 128,
        max: 256,
        step: 1,
        integer: true,
        description: 'Python Pydantic 约束为 128-256。',
        showDescription: true,
      },
      {
        key: 'overlap_tokens',
        type: 'slider',
        label: '分块重叠 token',
        envKey: 'CHUNKING_OVERLAP_TOKENS',
        min: 0,
        max: 64,
        step: 1,
        integer: true,
        description: '相邻 chunk 的重叠 token 数，后端即时校验 0-64。',
        showDescription: true,
      },
    ],
  },
  {
    id: 'enhancement',
    name: 'Markdown 增强',
    en: 'Enhancement',
    note: '库级只保存增强开关，模型固定跟随用户默认模型',
    count: 4,
    colorClass: 'bg-primary',
    tintClass: 'bg-primary/10',
    icon: Sparkles,
    columns: 'double',
    params: [
      {
        key: 'enable_table_enhancement',
        type: 'toggle',
        label: '表格 LLM 增强',
        envKey: 'MARKDOWN_PARSER_ENABLE_TABLE_ENHANCEMENT',
      },
      {
        key: 'enable_image_enhancement',
        type: 'toggle',
        label: '图片 LLM 增强',
        envKey: 'MARKDOWN_PARSER_ENABLE_IMAGE_ENHANCEMENT',
      },
      {
        key: 'table_model',
        type: 'display',
        label: '表格增强模型',
        envKey: 'MARKDOWN_PARSER_TABLE_MODEL',
        displaySub: '用户默认 CHAT 模型',
      },
      {
        key: 'vision_model',
        type: 'display',
        label: '图片增强模型',
        envKey: 'MARKDOWN_PARSER_VISION_MODEL',
        displaySub: '用户默认 VISION 模型',
      },
    ],
  },
  {
    id: 'pdf',
    name: 'PDF 解析',
    en: 'PDF Parser',
    note: '选择 PDF 文档解析后端，系统默认当前等价 MinerU',
    count: 1,
    colorClass: 'bg-[#22C55E]',
    tintClass: 'bg-[#22C55E]/10',
    icon: FileText,
    columns: 'single',
    params: [
      {
        key: 'pdf_parser_backend',
        type: 'segment',
        label: 'PDF 解析后端',
        envKey: 'PDF_PARSER_BACKEND',
        options: [
          { label: '系统默认', value: null },
          { label: '自动', value: 'auto' },
          { label: 'MinerU', value: 'mineru' },
          { label: 'OpenDataLoader', value: 'opendataloader' },
          { label: '朴素', value: 'naive' },
        ],
        description: 'null 表示跟随系统默认；当前系统默认按后端约定等价 MinerU。',
        showDescription: true,
      },
    ],
  },
  {
    id: 'recall',
    name: '召回检索',
    en: 'Recall',
    note: '控制召回路、重排条数、容错模式与上下文预算',
    count: 9,
    colorClass: 'bg-[#7B6B5D]',
    tintClass: 'bg-[#7B6B5D]/10',
    icon: Search,
    columns: 'double',
    params: [
      {
        key: 'recall_enabled_sources',
        type: 'multiselect',
        label: '启用召回路',
        envKey: 'RECALL_ENABLED_SOURCES',
        options: RECALL_SOURCE_OPTIONS,
        description: '启用哪几条召回路参与检索与融合；可留空，实际生效范围受系统已装配召回路限制。',
        showDescription: true,
        span: 'full',
      },
      {
        key: 'rerank_top_n',
        type: 'number',
        label: '重排候选条数',
        envKey: 'RERANK_TOP_N',
        min: 1,
        step: 1,
        integer: true,
        description: '重排后返回的候选条数上限，需为正整数。',
        showDescription: true,
      },
      {
        key: 'recall_strict',
        type: 'toggle',
        label: '严格容错模式',
        envKey: 'RECALL_STRICT',
        description: '开启后任一召回路失败即整体报错；关闭则允许单路失败降级。',
        showDescription: true,
      },
      {
        key: 'recall_result_limit',
        type: 'slider',
        label: '召回结果上限',
        envKey: 'RECALL_RESULT_LIMIT',
        min: 1,
        max: 100,
        step: 1,
        integer: true,
        description: '每次召回最多返回的候选数。',
      },
      {
        key: 'recall_context_token_budget',
        type: 'number',
        label: '生成上下文 token 预算',
        envKey: 'RECALL_CONTEXT_TOKEN_BUDGET',
        min: 1,
        max: 32000,
        step: 100,
        integer: true,
        description: '生成答案时拼装上下文的 token 预算。',
        showDescription: true,
      },
      {
        key: 'sparse_top_k',
        type: 'slider',
        label: '稀疏召回 TopK',
        envKey: 'SPARSE_RETRIEVAL_TOP_K',
        min: 1,
        max: 50,
        step: 1,
        integer: true,
        description: '关键词召回单路默认返回数。',
      },
      {
        key: 'sparse_score_threshold',
        type: 'slider',
        label: '稀疏召回分数阈值',
        envKey: 'SPARSE_RETRIEVAL_SCORE_THRESHOLD',
        min: 0,
        max: 1,
        step: 0.01,
        description: '稀疏召回最低分数过滤阈值。',
        showDescription: true,
      },
      {
        key: 'dense_top_k',
        type: 'slider',
        label: '稠密召回 TopK',
        envKey: 'DENSE_RETRIEVAL_TOP_K',
        min: 1,
        max: 50,
        step: 1,
        integer: true,
        description: '向量召回单路默认返回数。',
      },
      {
        key: 'dense_score_threshold',
        type: 'slider',
        label: '稠密召回分数阈值',
        envKey: 'DENSE_RETRIEVAL_SCORE_THRESHOLD',
        min: 0,
        max: 1,
        step: 0.01,
        description: '稠密召回最低分数过滤阈值。',
        showDescription: true,
      },
    ],
  },
];

const DISPLAY_MODEL_FALLBACK = '未配置默认模型';
const LEAVE_MESSAGE = '解析配置有未保存改动，确定离开吗？';

function createDefaultModelInfo(config: LLMConfigDTO, providers: ProviderModelDTO[]): DefaultModelInfo {
  const provider = providers.find((item) => item.providerType === config.providerType);
  return {
    providerType: config.providerType,
    providerName: provider?.providerName || config.providerType,
    modelName: config.modelName,
  };
}

function readNumber(raw: unknown, fallback: number | null) {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
}

function readBoolean(raw: unknown, fallback: boolean) {
  return typeof raw === 'boolean' ? raw : fallback;
}

function isRecallSource(raw: string): raw is RecallSource {
  return ALLOWED_RECALL_SOURCES.has(raw as RecallSource);
}

function readRecallSources(raw: unknown, fallback: RecallSource[]) {
  if (!Array.isArray(raw)) return fallback;
  return raw.filter((item): item is RecallSource => typeof item === 'string' && isRecallSource(item));
}

function normalizeConfig(config: DatasetParseConfigDTO): ParseConfigValues {
  const chunking = config.chunking ?? {};
  const enhancement = config.enhancement ?? {};
  const pdf = config.pdf ?? {};
  const recall = config.recall ?? {};

  return {
    heading_break_level: readNumber(chunking.heading_break_level, DEFAULT_VALUES.heading_break_level),
    min_candidate_chunk_tokens: readNumber(
      chunking.min_candidate_chunk_tokens,
      DEFAULT_VALUES.min_candidate_chunk_tokens,
    ),
    overlap_tokens: readNumber(chunking.overlap_tokens, DEFAULT_VALUES.overlap_tokens),
    enable_table_enhancement: readBoolean(
      enhancement.enable_table_enhancement,
      DEFAULT_VALUES.enable_table_enhancement,
    ),
    enable_image_enhancement: readBoolean(
      enhancement.enable_image_enhancement,
      DEFAULT_VALUES.enable_image_enhancement,
    ),
    pdf_parser_backend: pdf.pdf_parser_backend ?? DEFAULT_VALUES.pdf_parser_backend,
    recall_result_limit: readNumber(recall.recall_result_limit, DEFAULT_VALUES.recall_result_limit),
    recall_context_token_budget: readNumber(
      recall.recall_context_token_budget,
      DEFAULT_VALUES.recall_context_token_budget,
    ),
    sparse_top_k: readNumber(recall.sparse_top_k, DEFAULT_VALUES.sparse_top_k),
    sparse_score_threshold: readNumber(recall.sparse_score_threshold, DEFAULT_VALUES.sparse_score_threshold),
    dense_top_k: readNumber(recall.dense_top_k, DEFAULT_VALUES.dense_top_k),
    dense_score_threshold: readNumber(recall.dense_score_threshold, DEFAULT_VALUES.dense_score_threshold),
    recall_enabled_sources: readRecallSources(recall.recall_enabled_sources, DEFAULT_VALUES.recall_enabled_sources),
    rerank_top_n: readNumber(recall.rerank_top_n, DEFAULT_VALUES.rerank_top_n),
    recall_strict: readBoolean(recall.recall_strict, DEFAULT_VALUES.recall_strict),
  };
}

function toRequest(values: ParseConfigValues): DatasetParseConfigDTO {
  return {
    chunking: {
      heading_break_level: values.heading_break_level,
      min_candidate_chunk_tokens: values.min_candidate_chunk_tokens,
      overlap_tokens: values.overlap_tokens,
    },
    enhancement: {
      enable_table_enhancement: values.enable_table_enhancement,
      enable_image_enhancement: values.enable_image_enhancement,
    },
    pdf: {
      pdf_parser_backend: values.pdf_parser_backend,
    },
    recall: {
      recall_result_limit: values.recall_result_limit,
      recall_context_token_budget: values.recall_context_token_budget,
      sparse_top_k: values.sparse_top_k,
      sparse_score_threshold: values.sparse_score_threshold,
      dense_top_k: values.dense_top_k,
      dense_score_threshold: values.dense_score_threshold,
      recall_enabled_sources: values.recall_enabled_sources,
      rerank_top_n: values.rerank_top_n,
      recall_strict: values.recall_strict,
    },
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

function isEditableKey(key: ParamKey): key is EditableParamKey {
  return key !== 'table_model' && key !== 'vision_model';
}

function validateValues(values: ParseConfigValues, params: ParamSpec[], defaultModels: DefaultModels) {
  const errors: Partial<Record<EditableParamKey, string>> = {};

  if (values.enable_table_enhancement && !defaultModels.chat) {
    errors.enable_table_enhancement = '需先配置用户默认 CHAT 模型';
  }

  if (values.enable_image_enhancement && !defaultModels.vision) {
    errors.enable_image_enhancement = '需先配置用户默认 VISION 模型';
  }

  for (const param of params) {
    if (!isEditableKey(param.key) || (param.type !== 'number' && param.type !== 'slider')) {
      continue;
    }

    const value = values[param.key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors[param.key] = '请输入有效数字';
      continue;
    }

    if (param.integer && !Number.isInteger(value)) {
      errors[param.key] = '必须为整数';
      continue;
    }

    if (param.min !== undefined && value < param.min) {
      errors[param.key] = `不能小于 ${param.min}`;
      continue;
    }

    if (param.max !== undefined && value > param.max) {
      errors[param.key] = `不能大于 ${param.max}`;
    }
  }

  return errors;
}

function isDisabled(param: ParamSpec, values: ParseConfigValues) {
  if (param.key === 'table_model') return !values.enable_table_enhancement;
  if (param.key === 'vision_model') return !values.enable_image_enhancement;
  return false;
}

export default function DatasetParseConfigPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [dataset, setDataset] = useState<DatasetDTO | null>(null);
  const [values, setValues] = useState<ParseConfigValues>(DEFAULT_VALUES);
  const [initial, setInitial] = useState<ParseConfigValues>(DEFAULT_VALUES);
  const [defaultModels, setDefaultModels] = useState<DefaultModels>({ chat: null, vision: null });
  const [activeGroup, setActiveGroup] = useState(GROUPS[0].id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const datasetId = Number(id);
  const allParams = useMemo(() => GROUPS.flatMap((group) => group.params), []);
  const errors = useMemo(() => validateValues(values, allParams, defaultModels), [allParams, defaultModels, values]);
  const errorCount = Object.keys(errors).length;
  const dirty = getComparable(values) !== getComparable(initial);
  const saveDisabled = !dirty || errorCount > 0 || saving;

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
      setErrorMessage('');

      try {
        const [datasetResult, configResult, chatResult, visionResult, providersResult] = await Promise.allSettled([
          getDataset(datasetId),
          getDatasetParseConfig(datasetId),
          getDefaultLLMConfig('CHAT'),
          getDefaultLLMConfig('VISION'),
          getLLMProviders(),
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
      } catch (error) {
        console.error('Failed to load dataset parse config:', error);
        if (!cancelled) {
          setErrorMessage('解析配置加载失败，请检查后端服务或稍后重试。');
          setDataset(null);
        }
      } finally {
        if (!cancelled) {
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
    if (key === 'enable_table_enhancement' && value === true && !defaultModels.chat) {
      addToast('error', '需先配置默认 CHAT 模型，才能开启表格增强');
      return;
    }

    if (key === 'enable_image_enhancement' && value === true && !defaultModels.vision) {
      addToast('error', '需先配置默认 VISION 模型，才能开启图片增强');
      return;
    }

    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleRestoreDefault() {
    setValues({
      ...DEFAULT_VALUES,
      enable_table_enhancement: !!defaultModels.chat,
      enable_image_enhancement: !!defaultModels.vision,
    });
  }

  function handleDiscard() {
    setValues({ ...initial });
  }

  async function handleSave() {
    if (!dataset || saveDisabled) return;

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

  function handleBack() {
    if (dirty && !confirm(LEAVE_MESSAGE)) {
      return;
    }
    navigate(dataset ? `/datasets/${dataset.id}` : Routes.Datasets);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 size={24} className={cn('mb-3 animate-spin', darkMode ? 'text-[#3b82f6]' : 'text-primary')} />
          <div className={cn('mono-label', darkMode && 'text-[#858585]')}>加载中...</div>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <AlertCircle size={30} className="mb-3 text-red-500" />
        <p className={cn('mb-2 text-lg', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>解析配置不可用</p>
        <p className={cn('mb-4 text-sm', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
          {errorMessage || '知识库不存在或无权访问'}
        </p>
        <button
          type="button"
          onClick={() => navigate(Routes.Datasets)}
          className={cn(
            'rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-wider',
            darkMode ? 'bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]' : 'bg-text-main text-white hover:opacity-90',
          )}
        >
          返回知识库列表
        </button>
      </div>
    );
  }

  return (
    <div className={cn('h-full overflow-y-auto', darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base')}>
      <div className="mx-auto max-w-[1000px] px-4 py-7 pb-16 sm:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3">
            <Breadcrumb
              items={[
                { label: '首页', path: Routes.Home },
                { label: '知识库', path: Routes.Datasets },
                { label: dataset.name, path: `/datasets/${dataset.id}` },
                { label: '解析配置' },
              ]}
              darkMode={darkMode}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                  darkMode
                    ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]'
                    : 'border-border-subtle bg-white text-text-main/60 hover:border-primary hover:text-primary',
                )}
                aria-label="返回知识库详情"
              >
                <ArrowLeft size={16} />
              </button>
              <h1
                className={cn(
                  'font-serif text-[32px] font-semibold italic leading-none',
                  darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
                )}
              >
                解析配置
              </h1>
              {dirty ? (
                <span
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs',
                    darkMode
                      ? 'border-[#3b82f6]/35 bg-[#094771]/30 text-[#e0e0e0]'
                      : 'border-primary/20 bg-primary/10 text-text-main',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', darkMode ? 'bg-[#3b82f6]' : 'bg-primary')} />
                  未保存改动
                </span>
              ) : (
                <span
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-xs',
                    darkMode
                      ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#858585]'
                      : 'border-border-subtle bg-bg-base/30 text-text-main/50',
                  )}
                >
                  仅对知识库「{dataset.name}」生效
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {dirty && (
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving}
                className={cn(
                  'rounded-xl px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                  darkMode
                    ? 'text-[#858585] hover:bg-[#2d2d2d]'
                    : 'text-text-main/50 hover:bg-white/60 hover:text-text-main',
                )}
              >
                放弃改动
              </button>
            )}
            <button
              type="button"
              onClick={handleRestoreDefault}
              disabled={saving}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                darkMode
                  ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]'
                  : 'border-border-subtle bg-white text-text-main/70 hover:border-primary hover:text-text-main',
              )}
            >
              <RotateCcw size={14} />
              恢复默认
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saveDisabled}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:bg-text-main/10 disabled:text-text-main/40',
                darkMode
                  ? 'bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-[#3c3c3c] disabled:text-[#858585]'
                  : 'bg-[#7B6B5D] hover:bg-[#6b5d51]',
              )}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? '保存中' : '保存配置'}
            </button>
          </div>
        </div>

        {errorCount > 0 && (
          <div
            className={cn(
              'mb-4 flex items-center gap-2 rounded-xl border px-4 py-3',
              darkMode
                ? 'border-red-500/30 bg-red-500/10 text-[#cccccc]'
                : 'border-[#D97373]/30 bg-[#D97373]/10 text-text-main/70',
            )}
          >
            <AlertCircle size={16} className="shrink-0 text-[#D97373]" />
            <span className="text-sm">
              有 <strong className="text-[#D97373]">{errorCount}</strong> 项参数待修正，修正后才能保存。
            </span>
          </div>
        )}

        <div className="flex flex-col items-start gap-5 lg:flex-row">
          <aside
            className={cn(
              'w-full shrink-0 rounded-2xl border p-2 shadow-sm lg:sticky lg:top-7 lg:w-[196px]',
              darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
            )}
          >
            <p
              className={cn(
                'px-3 pb-1 pt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]',
                darkMode ? 'text-[#6b6b6b]' : 'text-text-main/30',
              )}
            >
              参数分类
            </p>
            <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
              {GROUPS.map((group) => (
                <a
                  key={group.id}
                  href={`#${group.id}`}
                  onClick={() => setActiveGroup(group.id)}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-colors',
                    activeGroup === group.id
                      ? darkMode
                        ? 'border-[#3b82f6]/35 bg-[#094771]/30 text-[#e0e0e0]'
                        : 'border-primary/20 bg-primary/10 text-text-main'
                      : darkMode
                        ? 'border-transparent text-[#858585] hover:bg-[#2d2d2d] hover:text-[#cccccc]'
                        : 'border-transparent text-text-main/65 hover:bg-bg-base/50 hover:text-text-main',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn('h-2 w-2 shrink-0 rounded-sm', group.colorClass)} />
                    <span className="truncate font-semibold">{group.name}</span>
                  </span>
                  <span className="font-mono text-[11px] opacity-60">{group.count}</span>
                </a>
              ))}
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col gap-4">
            {GROUPS.map((group) => (
              <ConfigGroup
                key={group.id}
                group={group}
                values={values}
                errors={errors}
                disabled={saving}
                displayModels={defaultModels}
                darkMode={darkMode}
                onFocus={() => setActiveGroup(group.id)}
                onChange={updateValue}
              />
            ))}
          </main>
        </div>
      </div>
    </div>
  );
}

function ConfigGroup({
  group,
  values,
  errors,
  disabled,
  displayModels,
  darkMode,
  onFocus,
  onChange,
}: {
  group: ParamGroup;
  values: ParseConfigValues;
  errors: Partial<Record<EditableParamKey, string>>;
  disabled: boolean;
  displayModels: DefaultModels;
  darkMode: boolean;
  onFocus: () => void;
  onChange: (key: EditableParamKey, value: ParseConfigValues[EditableParamKey]) => void;
}) {
  const Icon = group.icon;

  return (
    <section
      id={group.id}
      onMouseEnter={onFocus}
      className={cn(
        'scroll-mt-7 overflow-hidden rounded-2xl border shadow-sm',
        darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
      )}
    >
      <header
        className={cn(
          'flex items-center gap-3 border-b px-5 py-4',
          darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
        )}
      >
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', group.tintClass)}>
          <Icon size={16} className={cn(group.colorClass.replace('bg-', 'text-'))} />
        </span>
        <div className="min-w-0">
          <h2 className={cn('text-[15.5px] font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
            {group.name}
          </h2>
        </div>
      </header>
      <div
        className={cn(
          'grid gap-x-8 gap-y-6 p-5',
          group.columns === 'single' ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2',
        )}
      >
        {group.params.map((param) => (
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
            darkMode={darkMode}
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
  darkMode,
  onChange,
}: {
  param: ParamSpec;
  values: ParseConfigValues;
  error?: string;
  disabled: boolean;
  spanFull: boolean;
  displayModel?: DefaultModelInfo | null;
  darkMode: boolean;
  onChange: (key: EditableParamKey, value: ParseConfigValues[EditableParamKey]) => void;
}) {
  const editableKey = isEditableKey(param.key) ? param.key : null;
  const rawValue = editableKey ? values[editableKey] : null;
  const numericValue = typeof rawValue === 'number' ? rawValue : null;
  const booleanValue = typeof rawValue === 'boolean' ? rawValue : false;
  const segmentValue = typeof rawValue === 'string' || rawValue === null ? rawValue : null;
  const arrayValue = Array.isArray(rawValue) ? rawValue : [];

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
        'flex min-w-0 flex-col gap-2.5',
        spanFull && 'xl:col-span-2',
        param.type === 'multiselect' && ['gap-3 border-b pb-5', darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle'],
        disabled && 'pointer-events-none opacity-40',
      )}
      title={[param.envKey, param.description].filter(Boolean).join(' · ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('text-[13.5px] font-semibold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
            {param.label}
          </p>
        </div>
        <div className="shrink-0">
          {param.type === 'toggle' && editableKey && (
            <button
              type="button"
              onClick={() => onChange(editableKey, !booleanValue as ParseConfigValues[EditableParamKey])}
              className={cn(
                'flex h-6 w-[42px] items-center rounded-full p-[3px] transition-colors',
                booleanValue
                  ? darkMode
                    ? 'bg-[#3b82f6]'
                    : 'bg-primary'
                  : darkMode
                    ? 'bg-[#3c3c3c]'
                    : 'bg-text-main/15',
              )}
              aria-label={param.label}
            >
              <span
                className={cn(
                  'h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform',
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
                'h-8 w-[84px] rounded-lg border px-2.5 font-mono text-[13px] font-medium outline-none transition-colors',
                darkMode
                  ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#cccccc] focus:border-[#4a4a4a]'
                  : 'border-border-subtle bg-white text-text-main focus:border-primary/50',
                error && 'border-[#D97373] focus:border-[#D97373]',
              )}
            />
          )}
          {param.type === 'slider' && (
            <span
              className={cn(
                'rounded-lg px-2.5 py-1 font-mono text-[13px] font-semibold',
                darkMode ? 'bg-[#094771]/40 text-[#cccccc]' : 'bg-primary/20 text-text-main',
              )}
            >
              {numericValue === null ? '-' : formatValue(numericValue)}
            </span>
          )}
          {param.type === 'multiselect' && (
            <span
              className={cn(
                'rounded-lg px-2.5 py-1 font-mono text-[12px] font-semibold',
                darkMode ? 'bg-[#094771]/40 text-[#cccccc]' : 'bg-primary/15 text-text-main/70',
              )}
            >
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
          className={cn('parse-config-range h-2 w-full cursor-pointer accent-primary', darkMode && 'accent-[#3b82f6]')}
        />
      )}

      {param.type === 'segment' && editableKey && (
        <div className={cn('flex flex-wrap gap-1 rounded-xl p-1', darkMode ? 'bg-[#1e1e1e]' : 'bg-text-main/5')}>
          {param.options?.map((option) => {
            const active = segmentValue === option.value;
            return (
              <button
                key={option.value ?? 'system-default'}
                type="button"
                onClick={() => onChange(editableKey, option.value as ParseConfigValues[EditableParamKey])}
                className={cn(
                  'min-w-[92px] flex-1 rounded-lg px-2 py-1.5 text-center transition-colors',
                  active
                    ? darkMode
                      ? 'bg-[#2d2d2d] text-[#e0e0e0] shadow-sm'
                      : 'bg-white text-text-main shadow-sm'
                    : darkMode
                      ? 'text-[#858585] hover:bg-[#2d2d2d]/70'
                      : 'text-text-main/50 hover:bg-white/70',
                )}
              >
                <span className="block text-xs font-semibold">{option.label}</span>
                <span
                  className={cn(
                    'block font-mono text-[8.5px] uppercase',
                    darkMode ? 'text-[#6b6b6b]' : 'text-text-main/30',
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
        <div
          className={cn(
            'grid grid-cols-1 gap-2 rounded-xl p-1 sm:grid-cols-3',
            darkMode ? 'bg-[#1e1e1e]' : 'bg-text-main/5',
          )}
        >
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
                  'rounded-lg border px-2 py-1.5 text-center transition-colors',
                  active
                    ? darkMode
                      ? 'border-[#3b82f6]/45 bg-[#094771]/55 text-[#e0e0e0]'
                      : 'border-primary/35 bg-white text-text-main shadow-sm'
                    : darkMode
                      ? 'border-transparent text-[#858585] hover:bg-[#2d2d2d]/70'
                      : 'border-transparent text-text-main/50 hover:bg-white/70',
                )}
              >
                <span className="flex items-center justify-center gap-1 text-xs font-semibold">
                  <Check size={11} className={cn('transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
                  {option.label}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block font-mono text-[9px] uppercase',
                    darkMode ? 'text-[#858585]' : 'text-text-main/35',
                  )}
                >
                  {source}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {param.type === 'display' && (
        <ReadonlyModelField model={displayModel} hint={param.displaySub} darkMode={darkMode} />
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#D97373]">
          <AlertCircle size={12} />
          {error}
        </p>
      )}

      {param.showDescription && param.description && param.type !== 'display' && (
        <p className={cn('text-[11.5px] leading-5', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
          {param.description}
        </p>
      )}
    </div>
  );
}

function ReadonlyModelField({
  model,
  hint,
  darkMode,
}: {
  model?: DefaultModelInfo | null;
  hint?: string;
  darkMode: boolean;
}) {
  const iconUrl = model ? getProviderIcon(model.providerType, model.providerName, model.modelName) : '';

  return (
    <div className={cn('rounded-xl px-3 py-3', darkMode ? 'bg-[#1f1f1f]' : 'bg-bg-base/40')}>
      <div className="flex min-w-0 items-center gap-3">
        <ProviderIcon iconUrl={iconUrl} name={model?.providerName || '默认模型'} darkMode={darkMode} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate font-mono text-[12.5px] font-semibold',
              model ? (darkMode ? 'text-[#e0e0e0]' : 'text-text-main') : 'text-[#D97373]',
            )}
          >
            {model?.modelName || DISPLAY_MODEL_FALLBACK}
          </p>
          <p className={cn('mt-1 truncate text-[10.5px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
            {model ? `${model.providerName} · ${hint || '跟随用户默认模型'}` : hint || '跟随用户默认模型'}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProviderIcon({ iconUrl, name, darkMode }: { iconUrl: string; name: string; darkMode: boolean }) {
  const iconIsMonochrome = isProviderIconMonochrome(iconUrl);

  if (iconUrl) {
    return (
      <div
        className={cn(
          'h-8 w-8 shrink-0 rounded-lg border',
          darkMode ? 'border-[#3c3c3c] bg-[#313131]' : 'border-border-subtle/60 bg-white',
        )}
      >
        <img
          src={iconUrl}
          alt={name}
          className={cn('h-full w-full object-contain p-1', darkMode && iconIsMonochrome && 'invert')}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
        darkMode ? 'border-[#3c3c3c] bg-[#313131]' : 'border-primary/20 bg-white',
      )}
    >
      <Box size={15} className={darkMode ? 'text-[#858585]' : 'text-primary'} />
    </div>
  );
}
