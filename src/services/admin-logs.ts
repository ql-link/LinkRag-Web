import { apiClient } from '@/lib/api-client';
import type { AdminLogEntryDTO, AdminLogLabelsDTO, AdminLogQueryParams, PageResult } from '@/types/api';

const ADMIN_LOGS_PATH = '/api/v1/admin/logs';
const ADMIN_LOG_LABELS_PATH = '/api/v1/admin/logs/labels';
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;

type LogListResponse =
  | AdminLogEntryDTO[]
  | PageResult<AdminLogEntryDTO>
  | {
      items?: AdminLogEntryDTO[];
      total?: number;
      page?: number;
      pageSize?: number;
      page_size?: number;
      totalPages?: number;
      total_pages?: number;
    };

type LogLabelsResponse =
  | AdminLogLabelsDTO
  | {
      service?: string[];
      services?: string[];
      level?: string[];
      levels?: string[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function normalizeLogPageResult(
  response: LogListResponse,
  fallbackPage: number,
  fallbackPageSize: number,
): PageResult<AdminLogEntryDTO> {
  if (Array.isArray(response)) {
    return {
      items: response,
      total: response.length,
      page: fallbackPage,
      pageSize: fallbackPageSize,
      totalPages: Math.max(1, Math.ceil(response.length / fallbackPageSize)),
    };
  }

  const snakePageSize = 'page_size' in response ? response.page_size : undefined;
  const snakeTotalPages = 'total_pages' in response ? response.total_pages : undefined;
  const pageSize = response.pageSize ?? snakePageSize ?? fallbackPageSize;
  const total = response.total ?? response.items?.length ?? 0;

  return {
    items: response.items ?? [],
    total,
    page: response.page ?? fallbackPage,
    pageSize,
    totalPages: response.totalPages ?? snakeTotalPages ?? Math.max(1, Math.ceil(total / pageSize)),
  };
}

function toQueryParams(params: AdminLogQueryParams): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {
    page: params.page ?? DEFAULT_PAGE,
    page_size: params.pageSize ?? DEFAULT_PAGE_SIZE,
  };

  if (params.service) query.service = params.service;
  if (params.level) query.level = params.level;
  if (params.traceId) query.trace_id = params.traceId;
  if (params.keyword) query.keyword = params.keyword;
  if (params.startTime) query.start_time = params.startTime;
  if (params.endTime) query.end_time = params.endTime;

  return query;
}

export async function listAdminLogs(params: AdminLogQueryParams = {}): Promise<PageResult<AdminLogEntryDTO>> {
  const page = params.page ?? DEFAULT_PAGE;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const response = await apiClient.get<LogListResponse>(ADMIN_LOGS_PATH, toQueryParams({ ...params, page, pageSize }), {
    timeout: 30_000,
  });

  return normalizeLogPageResult(response, page, pageSize);
}

export async function listAdminLogLabels(): Promise<AdminLogLabelsDTO> {
  const response = await apiClient.get<LogLabelsResponse>(ADMIN_LOG_LABELS_PATH, undefined, { timeout: 30_000 });

  if (!isRecord(response)) {
    return { services: [], levels: [] };
  }

  return {
    services: normalizeStringArray(response.services ?? response.service),
    levels: normalizeStringArray(response.levels ?? response.level),
  };
}
