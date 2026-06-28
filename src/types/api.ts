// API Response Types based on backend documentation

export interface Result<T> {
  code: number;
  message: string;
  data: T;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuthResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  userId: number;
}

export interface UserProfileDTO {
  id: number;
  username: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: 'ADMIN' | 'USER';
  status: 0 | 1;
}

export interface LLMConfigDTO {
  id: number;
  configId?: number;
  providerId?: number;
  providerType: string;
  modelName: string;
  displayName?: string | null;
  capability: LLMCapabilityValue;
  protocol?: LLMProtocol;
  apiKeyMasked: string;
  apiBaseUrl: string | null;
  isActive: boolean;
  isDefault: boolean;
  isSystemPreset: boolean;
  isEditable?: boolean;
  source?: 'USER' | 'SYSTEM' | (string & {});
  createdAt: string;
  updatedAt: string;
}

export type LLMCapability = 'CHAT' | 'EMBEDDING' | 'SPARSE_EMBEDDING' | 'RERANK' | 'VISION' | 'ASR';
export type LLMCapabilityValue = LLMCapability | 'OCR' | (string & {});

export interface ModelCapabilityDetailDTO {
  capability: LLMCapabilityValue;
  protocol: string;
  apiBaseUrl: string;
}

export interface ModelCapabilityDTO {
  modelName: string;
  displayName?: string | null;
  capabilities: Array<LLMCapabilityValue | ModelCapabilityDetailDTO>;
}

export interface ProviderModelDTO {
  providerType: string;
  providerName: string;
  models: ModelCapabilityDTO[];
}

export interface SystemProvider {
  id: number;
  providerType: string;
  providerName: string;
  apiBaseUrl: string;
  defaultProtocol: LLMProtocol;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderModel {
  id: number;
  providerId: number;
  modelName: string;
  displayName?: string | null;
  capability: LLMCapabilityValue;
  protocol: LLMProtocol;
  apiBaseUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SystemPreset {
  id: number;
  providerId: number;
  providerType: string;
  modelName: string;
  displayName?: string | null;
  capability: LLMCapabilityValue;
  protocol: LLMProtocol;
  apiBaseUrl: string;
  apiKey?: string;
  apiKeyMasked?: string;
  isActive: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LLMProtocol = 'openai' | 'anthropic' | 'google' | 'jina' | 'dashscope';

export interface CreateProviderRequest {
  providerType: string;
  providerName: string;
  apiBaseUrl: string;
  defaultProtocol: LLMProtocol;
  isActive: boolean;
  priority: number;
}

export interface UpdateProviderRequest {
  providerName?: string;
  apiBaseUrl?: string;
  defaultProtocol?: LLMProtocol;
  isActive?: boolean;
  priority?: number;
}

export interface AddProviderModelRequest {
  modelName: string;
  displayName?: string;
  capability: LLMCapability;
  protocol: LLMProtocol;
  apiBaseUrl: string;
}

export interface UpdateProviderModelRequest {
  modelName?: string;
  displayName?: string;
  capability?: LLMCapability;
  protocol?: LLMProtocol;
  apiBaseUrl?: string;
  isActive?: boolean;
}

export interface CreatePresetRequest {
  providerId: number;
  modelName: string;
  capability: LLMCapability;
  apiKey: string;
  isDefault?: boolean;
}

export interface UpdatePresetRequest {
  providerId?: number;
  modelName?: string;
  capability?: LLMCapability;
  apiKey?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface ConversationDTO {
  id: number;
  title: string | null;
  datasetId: number;
  lastConfigId: number | null;
  lastModelName: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatTurnDTO {
  id: number;
  conversationId: number;
  query?: string | null;
  answer?: string | null;
  configId?: number | null;
  modelName?: string | null;
  references?: string[] | null;
  requestId?: string | null;
  status?: 'success' | 'partial' | 'failed' | (string & {}) | null;
  createdAt?: string | null;
}

export interface UiChatMessage {
  id: string;
  conversationId?: number | null;
  role: 'user' | 'assistant';
  content: string;
  configId?: number | null;
  modelName?: string | null;
  status?: string | null;
  createdAt?: string | null;
  references?: string[] | null;
  requestId?: string | null;
}

export interface DatasetDTO {
  id: number;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  createdAt: string;
  updatedAt: string;
}

export type PdfParserBackend = 'auto' | 'mineru' | 'opendataloader' | 'naive';

export interface DatasetParseChunkingConfig {
  heading_break_level?: number | null;
  min_candidate_chunk_tokens?: number | null;
  overlap_tokens?: number | null;
}

export interface DatasetParseEnhancementConfig {
  enable_table_enhancement?: boolean | null;
  enable_image_enhancement?: boolean | null;
}

export interface DatasetParsePdfConfig {
  pdf_parser_backend?: PdfParserBackend | null;
}

export type RecallSource = 'bm25' | 'sparse' | 'dense';

export interface DatasetParseRecallConfig {
  recall_result_limit?: number | null;
  recall_context_token_budget?: number | null;
  sparse_top_k?: number | null;
  sparse_score_threshold?: number | null;
  dense_top_k?: number | null;
  dense_score_threshold?: number | null;
  recall_enabled_sources?: RecallSource[] | null;
  rerank_top_n?: number | null;
  recall_strict?: boolean | null;
}

export interface DatasetParseConfigDTO {
  sparse_embedding_config_id?: number | null;
  dense_embedding_config_id?: number | null;
  chunking?: DatasetParseChunkingConfig | null;
  enhancement?: DatasetParseEnhancementConfig | null;
  pdf?: DatasetParsePdfConfig | null;
  recall?: DatasetParseRecallConfig | null;
}

export interface KnowledgeFileDTO {
  id: number;
  datasetId: number;
  originalFilename: string;
  fileSuffix: string;
  fileSize: number;
  bucketName?: string | null;
  objectKey?: string | null;
  fileUrl?: string | null;
  uploadStatus: KnowledgeUploadStatus;
  isUploadSuccess: boolean;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  frontendStatus?: FileParseFrontendStatus | null;
  parsedFilename?: string | null;
  parseNoticeStatus?: KnowledgeParseNoticeStatus | null;
  parseTaskId?: string | null;
  parseStatus?: KnowledgeParseStatus | null;
  isParseSuccess?: boolean | null;
  parseFailureReason?: string | null;
}

export type KnowledgeUploadStatus = 'UPLOADING' | 'UPLOAD_SUCCESS' | 'UPLOAD_FAILED';

export type KnowledgeParseNoticeStatus = 'PARSE_NOTICE_PENDING' | 'PARSE_NOTICE_SENT' | 'PARSE_NOTICE_FAILED';

export type KnowledgeParseStatus =
  | 'created'
  | 'processing'
  | 'success'
  | 'failed'
  | 'NOT_STARTED'
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED';

export type FileParseFrontendStatus =
  | 'uploaded'
  | 'upload_failed'
  | 'parse_waiting'
  | 'parsing'
  | 'parse_success'
  | 'parse_failed';

export interface FileParseSubmitDTO {
  fileId: number;
  originalFilename: string;
  frontendStatus: FileParseFrontendStatus;
}

export interface FileParseResultDTO {
  fileId: number;
  originalFilename: string;
  parsedFilename: string | null;
  frontendStatus: FileParseFrontendStatus;
  parseStatus: KnowledgeParseStatus | null;
  failureReason: string | null;
}

export interface UsageSummaryDTO {
  totalCalls: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  averageLatencyMs: number;
  successCalls: number;
  failedCalls: number;
  successRate: number; // 0~1，无调用为 0
}

export type UsageStage = 'chat' | 'all' | 'parse' | 'recall';
export type UsageOperation = 'embed' | 'rerank' | 'vision' | 'table' | 'generate' | (string & {});
export type UsageStatus = 'success' | 'partial' | 'failed' | (string & {});

export interface ModelUsageDTO {
  providerType: string;
  modelName: string;
  displayName?: string | null;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface UsageTrendDTO {
  currentTokens: number;
  previousTokens: number;
  currentCalls: number;
  previousCalls: number;
  tokenGrowthRate: number | null; // 0.18 = +18%；上一周期为 0 时为 null
  callGrowthRate: number | null;
}

export interface DailyUsageDTO {
  date: string;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface UsageLogDTO {
  id: number;
  configId: number | null;
  providerType: string;
  modelName: string;
  displayName?: string | null;
  stage: Exclude<UsageStage, 'all'> | (string & {});
  operation: UsageOperation;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number | null;
  status: UsageStatus;
  errorMessage: string | null;
  createdAt: string;
}

// Request Types
export interface LoginRequest {
  account: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
}

export interface UpdateProfileRequest {
  nickname?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface CreateConversationRequest {
  title?: string;
  datasetId: number;
  lastConfigId?: number;
}

export interface UpdateConversationRequest {
  title?: string;
  isPinned?: boolean;
}

export interface CreateDatasetRequest {
  name: string;
  description?: string;
  sparse_embedding_config_id: number;
  dense_embedding_config_id: number;
}

export interface UpdateDatasetRequest {
  name?: string;
  description?: string;
}

export interface SendMessageRequest {
  content: string;
  configId?: number;
}

export interface ChatRequest {
  datasetId: number;
  message: string;
  configId?: number;
  stream?: boolean;
}

export interface ChatResponse {
  answer: string;
  conversationId: number;
  messageId: number;
}

export interface OssUploadResult {
  url: string;
}

// ── Recall (direct-to-Python SSE) ──────────────────────────────────────────
// LINK-105: 前端先向 Java 申请短期 session token（LINK-104），再直连 Python 拉 SSE。

/**
 * Java 签发的短期召回 session（POST /api/v1/recall/sessions 的 data）。
 * 兼容后端可能的 snake_case 字段，已由 service 层归一化为 camelCase。
 */
export interface RecallSessionDTO {
  /** 直连 Python 用的短期 Bearer token */
  token: string;
  /** Python SSE 端点的完整地址（POST），由 Java 下发 */
  streamUrl: string;
  /** token 授权的数据集范围；请求中的 datasetIds 必须 ⊆ 此集合 */
  datasetIds?: number[];
  /** token 有效期（秒） */
  expiresIn?: number;
}

/** 召回命中项（chunk_id + 元信息 + 正文）。 */
export interface RecallHit {
  chunk_id: string;
  doc_id: number;
  dataset_id: number;
  fused_score: number;
  /** 各召回路原始分；某路未命中该 chunk 时值为 null（如稀疏检索命中但 BM25 未命中）。 */
  scores: Record<string, number | null>;
  /** chunk 正文，供展示召回片段；候选正文缺失时为空串。 */
  content: string;
}

export interface ChunkDetailDTO {
  chunkId: string;
  documentId?: number | string | null;
  fileName?: string | null;
  content: string;
  score?: number | null;
}

export interface RecallChunk {
  id: string;
  fileName: string;
  score: number | null;
  snippet: string;
}

/**
 * 终态 data：answer_done（生成完成）或 recall_done（空命中不生成）。
 * hits 已按 fused_score 降序。
 */
export interface RecallDonePayload {
  hits: RecallHit[];
  /** 非空表示部分召回路降级，仍返回了结果 */
  failed_sources: string[];
  /** 生成完成（answer_done）时的完整答案；空命中（recall_done）时不含此字段。 */
  answer?: string;
}

/** event: error 的 data（握手后失败）。 */
export interface RecallErrorPayload {
  code: string;
  message: string;
}

/** SSE 通用帧（用于 onEvent 回调，转发未知/中间事件以便前向兼容）。 */
export interface RecallStreamEvent {
  event: string;
  data: unknown;
}

export interface RecallRequest {
  /** 必填，非空非纯空白，否则 400 */
  query: string;
  /** 必填：本次生成所用 CHAT 模型配置 id；缺失 422，模型不可用前置失败 RECALL_MODEL_CONFIG_MISSING */
  configId: number;
  /** 可选，必须 ⊆ token 授权范围（超出 403）；省略/空 = token 全量授权范围 */
  datasetIds?: number[];
}

// ── Blog (Admin & Public) ──────────────────────────────────────────────

export type BlogPostStatus = 'DRAFT' | 'PUBLISHED';
export type BlogAssetType = 'COVER' | 'CONTENT_IMAGE';

export interface BlogPostAdminListDTO {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  contentObjectKey: string | null;
  coverAssetId: number | null;
  coverPublicUrl?: string | null;
  status: BlogPostStatus;
  publishedAt: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostAdminDetailDTO extends BlogPostAdminListDTO {
  contentMarkdown: string | null;
}

export interface BlogPostPublicListDTO {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  coverAssetId: number | null;
  coverPublicUrl: string | null;
  publishedAt: string;
}

export interface BlogPostPublicDetailDTO extends BlogPostPublicListDTO {
  contentMarkdown: string | null;
}

export interface BlogAssetDTO {
  id: number;
  postId: number;
  assetType: BlogAssetType;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  objectKey: string;
  publicUrl: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlogPostRequest {
  title: string;
  slug: string;
  summary?: string;
}

export interface UpdateBlogPostRequest {
  title?: string;
  slug?: string;
  summary?: string;
  coverAssetId?: number;
}
