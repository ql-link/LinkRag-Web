import { apiClient } from '@/lib/api-client';
import type {
  LLMCapability,
  LLMConfigDTO,
  ProviderModelDTO,
  ProviderIconUploadResult,
  SystemProvider,
  ProviderModel,
  SystemPreset,
  CreateProviderRequest,
  UpdateProviderRequest,
  AddProviderModelRequest,
  UpdateProviderModelRequest,
  CreatePresetRequest,
  UpdatePresetRequest,
  UsageSummaryDTO,
  UsageStage,
  DailyUsageDTO,
  UsageLogDTO,
  ModelUsageDTO,
  UsageTrendDTO,
  PageResult,
  ModelSyncCandidate,
  ModelSyncJob,
  ModelSyncJobStatus,
  ModelSyncPublishRequest,
  ModelSyncReviewStatus,
  ModelSyncSource,
} from '@/types/api';

export async function getLLMConfigs(filters?: {
  providerType?: string;
  capability?: LLMCapability;
  isActive?: boolean;
}): Promise<LLMConfigDTO[]> {
  return apiClient.get<LLMConfigDTO[]>('/api/v1/llm/configs', filters as Record<string, string | boolean>);
}

export async function getLLMProviders(capability?: LLMCapability): Promise<ProviderModelDTO[]> {
  return apiClient.get<ProviderModelDTO[]>('/api/v1/llm/providers', capability ? { capability } : undefined);
}

export async function setupLLMProvider(data: { providerType: string; apiKey: string }): Promise<LLMConfigDTO[]> {
  return apiClient.post<LLMConfigDTO[]>('/api/v1/llm/configs/setup-provider', data);
}

export async function toggleLLMModel(data: {
  providerType: string;
  modelName: string;
  capability?: LLMCapability;
  enabled: boolean;
}): Promise<void> {
  await apiClient.patch('/api/v1/llm/configs/toggle-model', data);
}

export async function selectEffectiveLLMModel(data: {
  capability: LLMCapability;
  providerType: string;
  modelName: string;
}): Promise<void> {
  await apiClient.put('/api/v1/llm/configs/effective', data);
}

export async function getDefaultLLMConfig(capability: LLMCapability): Promise<LLMConfigDTO> {
  return apiClient.get<LLMConfigDTO>('/api/v1/llm/configs/default', { capability });
}

export async function setDefaultLLMConfig(id: number, capability: LLMCapability): Promise<void> {
  await apiClient.patch(`/api/v1/llm/configs/${id}/default?capability=${encodeURIComponent(capability)}`);
}

export async function deleteLLMConfig(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/llm/configs/${id}`);
}

export async function listAdminProviders(page = 1, size = 20): Promise<PageResult<SystemProvider>> {
  return apiClient.get<PageResult<SystemProvider>>('/api/v1/admin/providers', { page, size });
}

export async function uploadAdminProviderIcon(file: File): Promise<ProviderIconUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.postForm<ProviderIconUploadResult>('/api/v1/admin/providers/icon', formData);
}

export async function createAdminProvider(data: CreateProviderRequest): Promise<void> {
  await apiClient.post('/api/v1/admin/providers', data);
}

export async function updateAdminProvider(id: number, data: UpdateProviderRequest): Promise<void> {
  await apiClient.patch(`/api/v1/admin/providers/${id}`, data);
}

export async function deleteAdminProvider(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/admin/providers/${id}`);
}

export async function toggleAdminProvider(id: number, isActive: boolean): Promise<void> {
  await apiClient.patch(`/api/v1/admin/providers/${id}/active?isActive=${encodeURIComponent(String(isActive))}`);
}

export async function addAdminProviderModel(providerId: number, data: AddProviderModelRequest): Promise<ProviderModel> {
  return apiClient.post<ProviderModel>(`/api/v1/admin/providers/${providerId}/models`, data);
}

export async function listAdminProviderModels(filters?: {
  page?: number;
  size?: number;
  providerId?: number;
  capability?: LLMCapability;
  isActive?: boolean;
}): Promise<PageResult<ProviderModel>> {
  return apiClient.get<PageResult<ProviderModel>>('/api/v1/admin/provider-models', {
    page: filters?.page ?? 1,
    size: filters?.size ?? 100,
    ...(filters?.providerId ? { providerId: filters.providerId } : {}),
    ...(filters?.capability ? { capability: filters.capability } : {}),
    ...(filters?.isActive === undefined ? {} : { isActive: filters.isActive }),
  });
}

export async function updateAdminProviderModel(id: number, data: UpdateProviderModelRequest): Promise<void> {
  await apiClient.patch(`/api/v1/admin/provider-models/${id}`, data);
}

export async function deleteAdminProviderModel(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/admin/provider-models/${id}`);
}

export async function toggleAdminProviderModel(id: number, isActive: boolean): Promise<void> {
  await apiClient.patch(`/api/v1/admin/provider-models/${id}/active?isActive=${encodeURIComponent(String(isActive))}`);
}

export async function syncAdminProviderModels(
  providerId: number,
  syncSource: ModelSyncSource = 'MODELS_DEV',
): Promise<ModelSyncJob> {
  return apiClient.post<ModelSyncJob>(
    `/api/v1/admin/providers/${providerId}/model-sync`,
    { syncSource },
    { timeout: 60_000 },
  );
}

export async function listAdminModelSyncJobs(filters?: {
  page?: number;
  size?: number;
  providerId?: number;
  syncSource?: ModelSyncSource;
  status?: ModelSyncJobStatus;
}): Promise<PageResult<ModelSyncJob>> {
  return apiClient.get<PageResult<ModelSyncJob>>('/api/v1/admin/model-sync-jobs', {
    page: filters?.page ?? 1,
    size: filters?.size ?? 10,
    ...(filters?.providerId ? { providerId: filters.providerId } : {}),
    ...(filters?.syncSource ? { syncSource: filters.syncSource } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
  });
}

export async function listAdminModelSyncCandidates(filters?: {
  page?: number;
  size?: number;
  providerId?: number;
  jobId?: number;
  reviewStatus?: ModelSyncReviewStatus;
  capability?: LLMCapability;
}): Promise<PageResult<ModelSyncCandidate>> {
  return apiClient.get<PageResult<ModelSyncCandidate>>('/api/v1/admin/model-sync-candidates', {
    page: filters?.page ?? 1,
    size: filters?.size ?? 20,
    ...(filters?.providerId ? { providerId: filters.providerId } : {}),
    ...(filters?.jobId ? { jobId: filters.jobId } : {}),
    ...(filters?.reviewStatus ? { reviewStatus: filters.reviewStatus } : {}),
    ...(filters?.capability ? { capability: filters.capability } : {}),
  });
}

export async function publishAdminModelSyncCandidate(
  id: number,
  data?: ModelSyncPublishRequest,
): Promise<ProviderModel> {
  return apiClient.post<ProviderModel>(`/api/v1/admin/model-sync-candidates/${id}/publish`, data);
}

export async function reviewAdminModelSyncCandidate(
  id: number,
  reviewStatus: Exclude<ModelSyncReviewStatus, 'PUBLISHED'>,
): Promise<ModelSyncCandidate> {
  return apiClient.patch<ModelSyncCandidate>(`/api/v1/admin/model-sync-candidates/${id}/review`, { reviewStatus });
}

export async function listAdminSystemPresets(): Promise<SystemPreset[]> {
  return apiClient.get<SystemPreset[]>('/api/v1/admin/system-presets');
}

export async function createAdminSystemPreset(data: CreatePresetRequest): Promise<void> {
  await apiClient.post('/api/v1/admin/system-presets', data);
}

export async function updateAdminSystemPreset(id: number, data: UpdatePresetRequest): Promise<void> {
  await apiClient.patch(`/api/v1/admin/system-presets/${id}`, data);
}

export async function toggleAdminSystemPreset(id: number, isActive: boolean): Promise<void> {
  await apiClient.patch(`/api/v1/admin/system-presets/${id}/active?isActive=${encodeURIComponent(String(isActive))}`);
}

export async function setAdminSystemPresetDefault(id: number): Promise<void> {
  await apiClient.patch(`/api/v1/admin/system-presets/${id}/default`);
}

export async function deleteAdminSystemPreset(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/admin/system-presets/${id}`);
}

export async function getUsageSummary(
  startDate: string,
  endDate: string,
  stage?: UsageStage,
): Promise<UsageSummaryDTO> {
  return apiClient.get<UsageSummaryDTO>('/api/v1/llm/usage/summary', {
    startDate,
    endDate,
    ...(stage ? { stage } : {}),
  });
}

export async function getDailyUsage(startDate: string, endDate: string, stage?: UsageStage): Promise<DailyUsageDTO[]> {
  return apiClient.get<DailyUsageDTO[]>('/api/v1/llm/usage/daily', {
    startDate,
    endDate,
    ...(stage ? { stage } : {}),
  });
}

export async function getUsageByModel(startDate: string, endDate: string): Promise<ModelUsageDTO[]> {
  return apiClient.get<ModelUsageDTO[]>('/api/v1/llm/usage/by-model', {
    startDate,
    endDate,
  });
}

export async function getUsageTrend(startDate: string, endDate: string): Promise<UsageTrendDTO> {
  return apiClient.get<UsageTrendDTO>('/api/v1/llm/usage/trend', {
    startDate,
    endDate,
  });
}

export async function getUsageLogs(
  startDate: string,
  endDate: string,
  page = 1,
  pageSize = 20,
  stage?: UsageStage,
): Promise<PageResult<UsageLogDTO>> {
  return apiClient.get<PageResult<UsageLogDTO>>('/api/v1/llm/usage/logs', {
    startDate,
    endDate,
    ...(stage ? { stage } : {}),
    page,
    pageSize,
  });
}
