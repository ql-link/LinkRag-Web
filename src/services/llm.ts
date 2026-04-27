import { apiClient } from '@/lib/api-client';
import type {
  LLMConfigDTO,
  UsageSummaryDTO,
  DailyUsageDTO,
  UsageLogDTO,
  PageResult,
} from '@/types/api';

export async function getLLMConfigs(filters?: {
  providerType?: string;
  isActive?: boolean;
}): Promise<LLMConfigDTO[]> {
  return apiClient.get<LLMConfigDTO[]>('/api/v1/llm/configs', filters as Record<string, string | boolean>);
}

export async function createLLMConfig(data: {
  providerType: string;
  configName: string;
  apiKey: string;
  modelName: string;
  priority?: number;
  isDefault?: boolean;
  timeoutMs?: number;
  maxRetries?: number;
  streamEnabled?: boolean;
  extraConfig?: string;
}): Promise<LLMConfigDTO> {
  return apiClient.post<LLMConfigDTO>('/api/v1/llm/configs', data);
}

export async function updateLLMConfig(
  id: number,
  data: Partial<{
    configName: string;
    apiKey: string;
    priority: number;
    isActive: boolean;
    isDefault: boolean;
    timeoutMs: number;
    maxRetries: number;
    streamEnabled: boolean;
    extraConfig: string;
  }>
): Promise<void> {
  await apiClient.patch(`/api/v1/llm/configs/${id}`, data);
}

export async function deleteLLMConfig(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/llm/configs/${id}`);
}

export async function getUsageSummary(
  startDate: string,
  endDate: string
): Promise<UsageSummaryDTO> {
  return apiClient.get<UsageSummaryDTO>('/api/v1/llm/usage/summary', {
    startDate,
    endDate,
  });
}

export async function getDailyUsage(
  startDate: string,
  endDate: string
): Promise<DailyUsageDTO[]> {
  return apiClient.get<DailyUsageDTO[]>('/api/v1/llm/usage/daily', {
    startDate,
    endDate,
  });
}

export async function getUsageLogs(
  startDate: string,
  endDate: string,
  page = 1,
  pageSize = 20
): Promise<PageResult<UsageLogDTO>> {
  return apiClient.get<PageResult<UsageLogDTO>>('/api/v1/llm/usage/logs', {
    startDate,
    endDate,
    page,
    pageSize,
  });
}