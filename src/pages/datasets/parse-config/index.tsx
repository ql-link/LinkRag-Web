import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ChangeEvent } from 'react';
import { useBeforeUnload, useNavigate, useParams } from 'react-router';
import { AlertCircle, Box, BrainCircuit, Check, FileText, Layers3, Loader2, Search, Sparkles } from 'lucide-react';
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
  sparse_embedding_config_id: number | null;
  dense_embedding_config_id: number | null;
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
  displayName?: string | null;
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
  compactOptions?: boolean;
}

interface ParamGroup {
  id: string;
  name: string;
  en: string;
  note: string;
  count: number;
  colorClass: string;
  dotClass: string;
  icon: typeof Layers3;
  columns: 'single' | 'double';
  params: ParamSpec[];
}

const DEFAULT_VALUES: ParseConfigValues = {
  sparse_embedding_config_id: null,
  dense_embedding_config_id: null,
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
const EMBEDDING_BINDING_SECTION_ID = 'embedding-binding';

const GROUPS: ParamGroup[] = [
  {
    id: 'chunking',
    name: '分块策略',
    en: 'Chunking',
    note: '控制标题断层、候选块下限与块间重叠',
    count: 3,
    colorClass: 'text-muted',
    dotClass: 'bg-primary/40',
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
    colorClass: 'text-muted',
    dotClass: 'bg-primary/40',
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
    colorClass: 'text-muted',
    dotClass: 'bg-primary/40',
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
          { label: 'ODL', value: 'opendataloader' },
          { label: '朴素', value: 'naive' },
        ],
        description: 'null 表示跟随系统默认；当前系统默认按后端约定等价 MinerU。',
        showDescription: true,
        compactOptions: true,
      },
    ],
  },
  {
    id: 'recall',
    name: '召回检索',
    en: 'Recall',
    note: '控制召回路、重排条数、容错模式与上下文预算',
    count: 9,
    colorClass: 'text-muted',
    dotClass: 'bg-primary/40',
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

function readNumber(raw: unknown, fallback: number | null) {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
}

function readConfigId(raw: unknown) {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
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
    sparse_embedding_config_id: readConfigId(config.sparse_embedding_config_id),
    dense_embedding_config_id: readConfigId(config.dense_embedding_config_id),
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
    sparse_embedding_config_id: values.sparse_embedding_config_id,
    dense_embedding_config_id: values.dense_embedding_config_id,
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
  const errors = useMemo(() => validateValues(values, allParams, defaultModels), [allParams, defaultModels, values]);
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

  function updateEmbeddingBinding(
    key: 'sparse_embedding_config_id' | 'dense_embedding_config_id',
    value: number | null,
  ) {
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
  loading: boolean;
  disabled: boolean;
  changed: boolean;
  onChange: (key: 'sparse_embedding_config_id' | 'dense_embedding_config_id', value: number | null) => void;
}) {
  const sparseUnavailable = !loading && sparseConfigs.length === 0;
  const denseUnavailable = !loading && denseConfigs.length === 0;

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
          disabled={disabled}
          helperText={sparseUnavailable ? '暂无可用配置' : ''}
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
          disabled={disabled}
          helperText={denseUnavailable ? '暂无可用配置' : ''}
          onChange={(value) => onChange('dense_embedding_config_id', value)}
        />
      </div>
      {changed && <p className="mt-1 text-[11px] leading-5 text-muted">重绑后，历史文件可能需要重新解析或重建向量。</p>}
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
