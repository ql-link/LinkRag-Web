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
  configName: string;
  providerType: string;
  providerName: string;
  modelName: string;
  capability: LLMCapability;
  apiKeyMasked: string;
  customApiBaseUrl: string | null;
  priority: number;
  isActive: boolean;
  isDefault: boolean;
  timeoutMs: number;
  maxRetries: number;
  streamEnabled: boolean;
  extraConfig: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LLMCapability = 'CHAT' | 'EMBEDDING' | 'OCR' | 'VISION' | 'REASONING' | 'CODE';

export interface ModelCapabilityDTO {
  modelName: string;
  capabilities: LLMCapability[];
}

export interface ProviderModelDTO {
  providerType: string;
  providerName: string;
  models: ModelCapabilityDTO[];
}

export interface ConversationDTO {
  id: number;
  title: string;
  datasetId: number;
  lastConfigId: number | null;
  lastModelName: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDTO {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  configId: number | null;
  modelName: string | null;
  tokenCount: number | null;
  createdAt: string;
}

export interface DatasetDTO {
  id: number;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  createdAt: string;
  updatedAt: string;
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
  frontendStatus: string;
}

export interface FileParseResultDTO {
  fileId: number;
  originalFilename: string;
  parsedFilename: string | null;
  frontendStatus: string;
  parseStatus: string | null;
  failureReason: string | null;
}

export interface UsageSummaryDTO {
  totalCalls: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  averageLatencyMs: number;
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
  configId: number;
  providerType: string;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  status: string;
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

/** 召回命中项（仅含 chunk_id + 元信息，不含正文，正文需另行反查）。 */
export interface RecallHit {
  chunk_id: string;
  doc_id: number;
  dataset_id: number;
  fused_score: number;
  scores: Record<string, number>;
}

/** event: recall_done 的 data。hits 已按 fused_score 降序。 */
export interface RecallDonePayload {
  hits: RecallHit[];
  /** 非空表示部分召回路降级，仍返回了结果 */
  failed_sources: string[];
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
  /** 可选，必须 ⊆ token 授权范围（超出 403）；省略/空 = token 全量授权范围 */
  datasetIds?: number[];
}
