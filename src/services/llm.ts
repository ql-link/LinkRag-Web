import { apiClient } from '@/lib/api-client';
import type {
  LLMCapability,
  LLMConfigDTO,
  ProviderModelDTO,
  SystemProvider,
  ProviderModel,
  SystemPreset,
  CreateProviderRequest,
  UpdateProviderRequest,
  AddProviderModelRequest,
  CreatePresetRequest,
  UsageSummaryDTO,
  DailyUsageDTO,
  UsageLogDTO,
  PageResult,
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

export async function deleteAdminProviderModel(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/admin/provider-models/${id}`);
}

export async function toggleAdminProviderModel(id: number, isActive: boolean): Promise<void> {
  await apiClient.patch(`/api/v1/admin/provider-models/${id}/active?isActive=${encodeURIComponent(String(isActive))}`);
}

export async function listAdminSystemPresets(): Promise<SystemPreset[]> {
  return apiClient.get<SystemPreset[]>('/api/v1/admin/system-presets');
}

export async function createAdminSystemPreset(data: CreatePresetRequest): Promise<void> {
  await apiClient.post('/api/v1/admin/system-presets', data);
}

export async function deleteAdminSystemPreset(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/admin/system-presets/${id}`);
}

export async function getUsageSummary(startDate: string, endDate: string): Promise<UsageSummaryDTO> {
  return apiClient.get<UsageSummaryDTO>('/api/v1/llm/usage/summary', {
    startDate,
    endDate,
  });
}

export async function getDailyUsage(startDate: string, endDate: string): Promise<DailyUsageDTO[]> {
  return apiClient.get<DailyUsageDTO[]>('/api/v1/llm/usage/daily', {
    startDate,
    endDate,
  });
}

export async function getUsageLogs(
  startDate: string,
  endDate: string,
  page = 1,
  pageSize = 20,
): Promise<PageResult<UsageLogDTO>> {
  return apiClient.get<PageResult<UsageLogDTO>>('/api/v1/llm/usage/logs', {
    startDate,
    endDate,
    page,
    pageSize,
  });
}
