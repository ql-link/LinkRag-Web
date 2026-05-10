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
  tokenType: "Bearer";
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
  role: "ADMIN" | "USER";
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

export type LLMCapability = "CHAT" | "EMBEDDING" | "OCR" | "VISION" | "REASONING" | "CODE";

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
  role: "user" | "assistant" | "system";
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
  status: "ACTIVE" | "INACTIVE" | "DELETED";
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
  parseNoticeStatus?: KnowledgeParseNoticeStatus | null;
  parseTaskId?: string | null;
  parseStatus?: KnowledgeParseStatus | null;
  isParseSuccess?: boolean | null;
}

export type KnowledgeUploadStatus =
  | "uploading"
  | "success"
  | "failed";

export type KnowledgeParseNoticeStatus =
  | "PARSE_NOTICE_PENDING"
  | "PARSE_NOTICE_SENT"
  | "PARSE_NOTICE_FAILED";

export type KnowledgeParseStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED";

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
