import { apiClient } from '@/lib/api-client';
import type {
  DatasetDTO,
  KnowledgeFileDTO,
  CreateDatasetRequest,
  UpdateDatasetRequest,
  PageResult,
} from '@/types/api';

export async function getDatasets(
  page = 1,
  pageSize = 20
): Promise<PageResult<DatasetDTO>> {
  return apiClient.get<PageResult<DatasetDTO>>('/api/v1/datasets', {
    page,
    pageSize,
  });
}

export async function getDataset(datasetId: number): Promise<DatasetDTO> {
  return apiClient.get<DatasetDTO>(`/api/v1/datasets/${datasetId}`);
}

export async function createDataset(
  data: CreateDatasetRequest
): Promise<DatasetDTO> {
  return apiClient.post<DatasetDTO>('/api/v1/datasets', data);
}

export async function updateDataset(
  datasetId: number,
  data: UpdateDatasetRequest
): Promise<void> {
  await apiClient.patch(`/api/v1/datasets/${datasetId}`, data);
}

export async function deleteDataset(datasetId: number): Promise<void> {
  await apiClient.delete(`/api/v1/datasets/${datasetId}`);
}

export async function getKnowledgeFiles(
  datasetId: number,
  page = 1,
  pageSize = 20,
  filters?: {
    uploadStatus?: string;
    parseNoticeStatus?: string;
    parseStatus?: string;
  }
): Promise<PageResult<KnowledgeFileDTO>> {
  return apiClient.get<PageResult<KnowledgeFileDTO>>(
    `/api/v1/datasets/${datasetId}/knowledge-files`,
    { page, pageSize, ...filters }
  );
}

export async function uploadKnowledgeFile(
  datasetId: number,
  file: File,
  parseImmediately = false
): Promise<KnowledgeFileDTO> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('parseImmediately', String(parseImmediately));
  return apiClient.postForm<KnowledgeFileDTO>(
    `/api/v1/datasets/${datasetId}/knowledge-files`,
    formData
  );
}

export async function getKnowledgeFile(fileId: number): Promise<KnowledgeFileDTO> {
  return apiClient.get<KnowledgeFileDTO>(`/api/v1/knowledge-files/${fileId}`);
}

export async function createParseTask(fileId: number): Promise<void> {
  await apiClient.post(`/api/v1/knowledge-files/${fileId}/parse-tasks`);
}

export async function deleteKnowledgeFile(fileId: number): Promise<void> {
  await apiClient.delete(`/api/v1/knowledge-files/${fileId}`);
}