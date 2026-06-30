import { FileText, Layers3, Search, Sparkles, type LucideIcon } from 'lucide-react';
import type {
  DatasetParseConfigDTO,
  PdfParserBackend,
  RecallFusionStrategy,
  RecallSource,
  StageTwoAlgorithm,
} from '@/types/api';

type SegmentValue = string | null;
type ParamType = 'toggle' | 'number' | 'slider' | 'segment' | 'multiselect' | 'display';
type ParamKey =
  | 'heading_break_level'
  | 'min_candidate_chunk_tokens'
  | 'overlap_tokens'
  | 'max_chunk_tokens'
  | 'hard_max_tokens'
  | 'stage_two_algorithm'
  | 'protected_neighbor_overlap'
  | 'enable_table_enhancement'
  | 'enable_image_enhancement'
  | 'enable_heading_hierarchy'
  | 'pdf_parser_backend'
  | 'recall_result_limit'
  | 'recall_context_token_budget'
  | 'bm25_top_k'
  | 'sparse_top_k'
  | 'sparse_score_threshold'
  | 'dense_top_k'
  | 'dense_score_threshold'
  | 'recall_enabled_sources'
  | 'recall_fusion_strategy'
  | 'fusion_bm25_weight'
  | 'fusion_sparse_weight'
  | 'fusion_dense_weight'
  | 'rerank_top_n'
  | 'recall_strict'
  | 'table_model'
  | 'vision_model';

export type EditableParamKey = Exclude<ParamKey, 'table_model' | 'vision_model'>;

export type ParseConfigValues = {
  sparse_embedding_config_id: number | null;
  dense_embedding_config_id: number | null;
  heading_break_level: number | null;
  min_candidate_chunk_tokens: number | null;
  overlap_tokens: number | null;
  max_chunk_tokens: number | null;
  hard_max_tokens: number | null;
  stage_two_algorithm: StageTwoAlgorithm;
  protected_neighbor_overlap: boolean;
  enable_table_enhancement: boolean;
  enable_image_enhancement: boolean;
  enable_heading_hierarchy: boolean;
  pdf_parser_backend: PdfParserBackend | null;
  recall_result_limit: number | null;
  recall_context_token_budget: number | null;
  bm25_top_k: number | null;
  sparse_top_k: number | null;
  sparse_score_threshold: number | null;
  dense_top_k: number | null;
  dense_score_threshold: number | null;
  recall_enabled_sources: RecallSource[];
  recall_fusion_strategy: RecallFusionStrategy;
  fusion_bm25_weight: number | null;
  fusion_sparse_weight: number | null;
  fusion_dense_weight: number | null;
  rerank_top_n: number | null;
  recall_strict: boolean;
};

export interface ParamSpec {
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
  visibleWhen?: (values: ParseConfigValues) => boolean;
}

export interface ParamGroup {
  id: string;
  name: string;
  en: string;
  note: string;
  count: number;
  colorClass: string;
  dotClass: string;
  icon: LucideIcon;
  columns: 'single' | 'double';
  params: ParamSpec[];
}

export const DEFAULT_VALUES: ParseConfigValues = {
  sparse_embedding_config_id: null,
  dense_embedding_config_id: null,
  heading_break_level: 5,
  min_candidate_chunk_tokens: 128,
  overlap_tokens: 64,
  max_chunk_tokens: 512,
  hard_max_tokens: 1024,
  stage_two_algorithm: 'noop',
  protected_neighbor_overlap: false,
  enable_table_enhancement: true,
  enable_image_enhancement: true,
  enable_heading_hierarchy: false,
  pdf_parser_backend: null,
  recall_result_limit: 64,
  recall_context_token_budget: 4000,
  bm25_top_k: 100,
  sparse_top_k: 50,
  sparse_score_threshold: 0,
  dense_top_k: 100,
  dense_score_threshold: 0,
  recall_enabled_sources: ['bm25', 'sparse', 'dense'],
  recall_fusion_strategy: 'rrf',
  fusion_bm25_weight: 0.2,
  fusion_sparse_weight: 0.3,
  fusion_dense_weight: 0.5,
  rerank_top_n: 8,
  recall_strict: false,
};

export const RECALL_SOURCE_OPTIONS: Array<{ label: string; value: RecallSource }> = [
  { label: 'BM25', value: 'bm25' },
  { label: 'Sparse', value: 'sparse' },
  { label: 'Dense', value: 'dense' },
];

const ALLOWED_RECALL_SOURCES = new Set<RecallSource>(RECALL_SOURCE_OPTIONS.map((option) => option.value));
const ALLOWED_STAGE_TWO_ALGORITHMS = new Set<StageTwoAlgorithm>(['noop', 'semantic_depth_window']);
const ALLOWED_RECALL_FUSION_STRATEGIES = new Set<RecallFusionStrategy>(['rrf', 'weighted_score']);

export const GROUPS: ParamGroup[] = [
  {
    id: 'chunking',
    name: '分块策略',
    en: 'Chunking',
    note: '控制标题断层、token 上下限、二阶段算法与块间重叠',
    count: 7,
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
      {
        key: 'max_chunk_tokens',
        type: 'number',
        label: '目标块最大 token',
        envKey: 'CHUNKING_MAX_CHUNK_TOKENS',
        min: 256,
        max: 2048,
        step: 1,
        integer: true,
        description: 'Pydantic 约束 256-2048，且须 ≥ 候选分块最小 token。',
        showDescription: true,
      },
      {
        key: 'hard_max_tokens',
        type: 'number',
        label: '硬切分最大 token',
        envKey: 'CHUNKING_HARD_MAX_TOKENS',
        min: 512,
        max: 8192,
        step: 1,
        integer: true,
        description: 'Pydantic 约束 512-8192，且须 ≥ 目标块最大 token。',
        showDescription: true,
      },
      {
        key: 'stage_two_algorithm',
        type: 'segment',
        label: '二阶段分块算法',
        envKey: 'CHUNKING_STAGE_TWO_ALGORITHM',
        options: [
          { label: '不启用', value: 'noop' },
          { label: '语义深度窗口', value: 'semantic_depth_window' },
        ],
        description: 'semantic_depth_window 会对超长 chunk 按语义深度窗口递归细分。',
        showDescription: true,
        span: 'full',
      },
      {
        key: 'protected_neighbor_overlap',
        type: 'toggle',
        label: '受保护元素参与重叠',
        envKey: 'CHUNKING_PROTECTED_NEIGHBOR_OVERLAP',
        description: '含表格/代码块/公式等受保护元素的 chunk 是否参与 neighbor overlap。',
        showDescription: true,
      },
    ],
  },
  {
    id: 'enhancement',
    name: 'Markdown 增强',
    en: 'Enhancement',
    note: '库级只保存增强开关，模型固定跟随用户默认模型',
    count: 3,
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
        key: 'enable_heading_hierarchy',
        type: 'toggle',
        label: '标题层级重建',
        envKey: 'MARKDOWN_PARSER_ENABLE_HEADING_HIERARCHY',
        description: '基于样式重建 Markdown 标题层级（H1-H6），改善分块的结构边界判定。',
        showDescription: true,
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
    note: '控制召回路、融合策略与权重、重排条数、容错模式与上下文预算',
    count: 14,
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
        key: 'recall_fusion_strategy',
        type: 'segment',
        label: '候选融合策略',
        envKey: 'RECALL_FUSION_STRATEGY',
        options: [
          { label: 'RRF 倒数融合', value: 'rrf' },
          { label: '加权融合', value: 'weighted_score' },
        ],
        description: 'rrf 按各路排名倒数融合；weighted_score 按下方三路权重加权，仅启用召回路参与。',
        showDescription: true,
        span: 'full',
      },
      {
        key: 'fusion_bm25_weight',
        type: 'number',
        label: 'BM25 融合权重',
        envKey: 'RECALL_FUSION_BM25_WEIGHT',
        min: 0,
        step: 0.1,
        description: '加权融合下 BM25 路权重，需 ≥ 0。',
        showDescription: true,
        visibleWhen: (values) => values.recall_fusion_strategy === 'weighted_score',
      },
      {
        key: 'fusion_sparse_weight',
        type: 'number',
        label: '稀疏融合权重',
        envKey: 'RECALL_FUSION_SPARSE_WEIGHT',
        min: 0,
        step: 0.1,
        description: '加权融合下稀疏路权重，需 ≥ 0。',
        showDescription: true,
        visibleWhen: (values) => values.recall_fusion_strategy === 'weighted_score',
      },
      {
        key: 'fusion_dense_weight',
        type: 'number',
        label: '稠密融合权重',
        envKey: 'RECALL_FUSION_DENSE_WEIGHT',
        min: 0,
        step: 0.1,
        description: '加权融合下稠密路权重，需 ≥ 0；启用召回路权重之和不能为 0。',
        showDescription: true,
        visibleWhen: (values) => values.recall_fusion_strategy === 'weighted_score',
      },
      {
        key: 'rerank_top_n',
        type: 'number',
        label: '重排候选条数',
        envKey: 'RERANK_DEFAULT_TOP_N',
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
        type: 'number',
        label: '召回结果上限',
        envKey: 'RECALL_RESULT_LIMIT',
        min: 1,
        step: 1,
        integer: true,
        description: '每次召回最多返回的候选数。',
        showDescription: true,
      },
      {
        key: 'recall_context_token_budget',
        type: 'number',
        label: '生成上下文 token 预算',
        envKey: 'RECALL_GENERATION_CONTEXT_TOKEN_BUDGET',
        min: 1,
        step: 100,
        integer: true,
        description: '生成答案时拼装上下文的 token 预算。',
        showDescription: true,
      },
      {
        key: 'bm25_top_k',
        type: 'number',
        label: 'BM25 召回 TopK',
        envKey: 'RECALL_BM25_TOP_K',
        min: 1,
        step: 1,
        integer: true,
        description: 'BM25 关键词召回单路返回数，需为正整数。',
        showDescription: true,
      },
      {
        key: 'sparse_top_k',
        type: 'number',
        label: '稀疏召回 TopK',
        envKey: 'RECALL_SPARSE_TOP_K',
        min: 1,
        step: 1,
        integer: true,
        description: '关键词召回单路默认返回数。',
        showDescription: true,
      },
      {
        key: 'sparse_score_threshold',
        type: 'number',
        label: '稀疏召回分数阈值',
        envKey: 'SPARSE_RETRIEVAL_SCORE_THRESHOLD',
        min: 0,
        step: 0.01,
        description: '稀疏召回最低分数过滤阈值。',
        showDescription: true,
      },
      {
        key: 'dense_top_k',
        type: 'number',
        label: '稠密召回 TopK',
        envKey: 'RECALL_DENSE_TOP_K',
        min: 1,
        step: 1,
        integer: true,
        description: '向量召回单路默认返回数。',
        showDescription: true,
      },
      {
        key: 'dense_score_threshold',
        type: 'number',
        label: '稠密召回分数阈值',
        envKey: 'DENSE_RETRIEVAL_SCORE_THRESHOLD',
        min: 0,
        step: 0.01,
        description: '稠密召回最低分数过滤阈值。',
        showDescription: true,
      },
    ],
  },
];

function readNumber(raw: unknown, fallback: number | null) {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
}

function readConfigId(raw: unknown) {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function readBoolean(raw: unknown, fallback: boolean) {
  return typeof raw === 'boolean' ? raw : fallback;
}

export function isRecallSource(raw: string): raw is RecallSource {
  return ALLOWED_RECALL_SOURCES.has(raw as RecallSource);
}

function readRecallSources(raw: unknown, fallback: RecallSource[]) {
  if (!Array.isArray(raw)) return fallback;
  return raw.filter((item): item is RecallSource => typeof item === 'string' && isRecallSource(item));
}

function readStageTwoAlgorithm(raw: unknown, fallback: StageTwoAlgorithm): StageTwoAlgorithm {
  return typeof raw === 'string' && ALLOWED_STAGE_TWO_ALGORITHMS.has(raw as StageTwoAlgorithm)
    ? (raw as StageTwoAlgorithm)
    : fallback;
}

function readFusionStrategy(raw: unknown, fallback: RecallFusionStrategy): RecallFusionStrategy {
  return typeof raw === 'string' && ALLOWED_RECALL_FUSION_STRATEGIES.has(raw as RecallFusionStrategy)
    ? (raw as RecallFusionStrategy)
    : fallback;
}

export function normalizeConfig(config: DatasetParseConfigDTO): ParseConfigValues {
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
    max_chunk_tokens: readNumber(chunking.max_chunk_tokens, DEFAULT_VALUES.max_chunk_tokens),
    hard_max_tokens: readNumber(chunking.hard_max_tokens, DEFAULT_VALUES.hard_max_tokens),
    stage_two_algorithm: readStageTwoAlgorithm(chunking.stage_two_algorithm, DEFAULT_VALUES.stage_two_algorithm),
    protected_neighbor_overlap: readBoolean(
      chunking.protected_neighbor_overlap,
      DEFAULT_VALUES.protected_neighbor_overlap,
    ),
    enable_table_enhancement: readBoolean(
      enhancement.enable_table_enhancement,
      DEFAULT_VALUES.enable_table_enhancement,
    ),
    enable_image_enhancement: readBoolean(
      enhancement.enable_image_enhancement,
      DEFAULT_VALUES.enable_image_enhancement,
    ),
    enable_heading_hierarchy: readBoolean(
      enhancement.enable_heading_hierarchy,
      DEFAULT_VALUES.enable_heading_hierarchy,
    ),
    pdf_parser_backend: pdf.pdf_parser_backend ?? DEFAULT_VALUES.pdf_parser_backend,
    recall_result_limit: readNumber(recall.recall_result_limit, DEFAULT_VALUES.recall_result_limit),
    recall_context_token_budget: readNumber(
      recall.recall_context_token_budget,
      DEFAULT_VALUES.recall_context_token_budget,
    ),
    bm25_top_k: readNumber(recall.bm25_top_k, DEFAULT_VALUES.bm25_top_k),
    sparse_top_k: readNumber(recall.sparse_top_k, DEFAULT_VALUES.sparse_top_k),
    sparse_score_threshold: readNumber(recall.sparse_score_threshold, DEFAULT_VALUES.sparse_score_threshold),
    dense_top_k: readNumber(recall.dense_top_k, DEFAULT_VALUES.dense_top_k),
    dense_score_threshold: readNumber(recall.dense_score_threshold, DEFAULT_VALUES.dense_score_threshold),
    recall_enabled_sources: readRecallSources(recall.recall_enabled_sources, DEFAULT_VALUES.recall_enabled_sources),
    recall_fusion_strategy: readFusionStrategy(recall.recall_fusion_strategy, DEFAULT_VALUES.recall_fusion_strategy),
    fusion_bm25_weight: readNumber(recall.fusion_bm25_weight, DEFAULT_VALUES.fusion_bm25_weight),
    fusion_sparse_weight: readNumber(recall.fusion_sparse_weight, DEFAULT_VALUES.fusion_sparse_weight),
    fusion_dense_weight: readNumber(recall.fusion_dense_weight, DEFAULT_VALUES.fusion_dense_weight),
    rerank_top_n: readNumber(recall.rerank_top_n, DEFAULT_VALUES.rerank_top_n),
    recall_strict: readBoolean(recall.recall_strict, DEFAULT_VALUES.recall_strict),
  };
}

export function toRequest(values: ParseConfigValues): DatasetParseConfigDTO {
  return {
    sparse_embedding_config_id: values.sparse_embedding_config_id,
    dense_embedding_config_id: values.dense_embedding_config_id,
    chunking: {
      heading_break_level: values.heading_break_level,
      min_candidate_chunk_tokens: values.min_candidate_chunk_tokens,
      overlap_tokens: values.overlap_tokens,
      max_chunk_tokens: values.max_chunk_tokens,
      hard_max_tokens: values.hard_max_tokens,
      stage_two_algorithm: values.stage_two_algorithm,
      protected_neighbor_overlap: values.protected_neighbor_overlap,
    },
    enhancement: {
      enable_table_enhancement: values.enable_table_enhancement,
      enable_image_enhancement: values.enable_image_enhancement,
      enable_heading_hierarchy: values.enable_heading_hierarchy,
    },
    pdf: {
      pdf_parser_backend: values.pdf_parser_backend,
    },
    recall: {
      recall_result_limit: values.recall_result_limit,
      recall_context_token_budget: values.recall_context_token_budget,
      bm25_top_k: values.bm25_top_k,
      sparse_top_k: values.sparse_top_k,
      sparse_score_threshold: values.sparse_score_threshold,
      dense_top_k: values.dense_top_k,
      dense_score_threshold: values.dense_score_threshold,
      recall_enabled_sources: values.recall_enabled_sources,
      recall_fusion_strategy: values.recall_fusion_strategy,
      fusion_bm25_weight: values.fusion_bm25_weight,
      fusion_sparse_weight: values.fusion_sparse_weight,
      fusion_dense_weight: values.fusion_dense_weight,
      rerank_top_n: values.rerank_top_n,
      recall_strict: values.recall_strict,
    },
  };
}

export function isEditableKey(key: ParamKey): key is EditableParamKey {
  return key !== 'table_model' && key !== 'vision_model';
}

export function validateValues(values: ParseConfigValues, params: ParamSpec[]) {
  const errors: Partial<Record<EditableParamKey, string>> = {};

  for (const param of params) {
    if (param.visibleWhen && !param.visibleWhen(values)) {
      continue;
    }

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

  const { min_candidate_chunk_tokens: minCandidate, max_chunk_tokens: maxChunk, hard_max_tokens: hardMax } = values;
  if (
    typeof minCandidate === 'number' &&
    typeof maxChunk === 'number' &&
    maxChunk < minCandidate &&
    !errors.max_chunk_tokens
  ) {
    errors.max_chunk_tokens = '须 ≥ 候选分块最小 token';
  }
  if (typeof maxChunk === 'number' && typeof hardMax === 'number' && hardMax < maxChunk && !errors.hard_max_tokens) {
    errors.hard_max_tokens = '须 ≥ 目标块最大 token';
  }

  if (values.recall_fusion_strategy === 'weighted_score' && values.recall_enabled_sources.length > 0) {
    const weightKeyBySource: Record<
      RecallSource,
      'fusion_bm25_weight' | 'fusion_sparse_weight' | 'fusion_dense_weight'
    > = {
      bm25: 'fusion_bm25_weight',
      sparse: 'fusion_sparse_weight',
      dense: 'fusion_dense_weight',
    };
    const activeSum = values.recall_enabled_sources.reduce(
      (sum, source) => sum + (values[weightKeyBySource[source]] ?? 0),
      0,
    );
    if (activeSum <= 0) {
      for (const source of values.recall_enabled_sources) {
        const key = weightKeyBySource[source];
        if (!errors[key]) {
          errors[key] = '启用召回路的融合权重之和需大于 0';
        }
      }
    }
  }

  return errors;
}
