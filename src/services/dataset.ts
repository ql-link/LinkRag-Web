import { apiClient } from '@/lib/api-client';
import type {
  DatasetDTO,
  DatasetParseConfigDTO,
  KnowledgeFileDTO,
  CreateDatasetRequest,
  UpdateDatasetRequest,
  PageResult,
  FileParseResultDTO,
  FileParseSubmitDTO,
} from '@/types/api';

export async function getDatasets(page = 1, pageSize = 20): Promise<PageResult<DatasetDTO>> {
  return apiClient.get<PageResult<DatasetDTO>>('/api/v1/datasets', {
    page,
    pageSize,
  });
}

export async function getDataset(datasetId: number): Promise<DatasetDTO> {
  return apiClient.get<DatasetDTO>(`/api/v1/datasets/${datasetId}`);
}

export async function getDatasetParseConfig(datasetId: number): Promise<DatasetParseConfigDTO> {
  return apiClient.get<DatasetParseConfigDTO>(`/api/v1/datasets/${datasetId}/parse-config`);
}

export async function updateDatasetParseConfig(datasetId: number, data: DatasetParseConfigDTO): Promise<void> {
  await apiClient.put(`/api/v1/datasets/${datasetId}/parse-config`, data);
}

export async function createDataset(data: CreateDatasetRequest): Promise<DatasetDTO> {
  return apiClient.post<DatasetDTO>('/api/v1/datasets', data);
}

export async function updateDataset(datasetId: number, data: UpdateDatasetRequest): Promise<DatasetDTO> {
  return apiClient.patch<DatasetDTO>(`/api/v1/datasets/${datasetId}`, data);
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
  },
): Promise<PageResult<KnowledgeFileDTO>> {
  return apiClient.get<PageResult<KnowledgeFileDTO>>(`/api/v1/datasets/${datasetId}/files`, {
    page,
    pageSize,
    ...filters,
  });
}

export async function getRecentKnowledgeFiles(limit = 5): Promise<KnowledgeFileDTO[]> {
  if (limit <= 0) return [];

  const datasetsResult = await getDatasets(1, 100);
  const fileResults = await Promise.allSettled(
    datasetsResult.items.map(async (dataset) => {
      const filesResult = await getKnowledgeFiles(dataset.id, 1, limit, {
        uploadStatus: 'UPLOAD_SUCCESS',
      });
      return enrichKnowledgeFilesWithParseResults(dataset.id, filesResult.items);
    }),
  );

  return fileResults
    .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
    .sort((a, b) => {
      const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return timeDiff !== 0 ? timeDiff : b.id - a.id;
    })
    .slice(0, limit);
}

export async function uploadKnowledgeFile(
  datasetId: number,
  file: File,
  parseImmediately = false,
): Promise<KnowledgeFileDTO> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('parseImmediately', String(parseImmediately));
  return apiClient.postForm<KnowledgeFileDTO>(`/api/v1/datasets/${datasetId}/files`, formData);
}

export async function getKnowledgeFile(fileId: number): Promise<KnowledgeFileDTO> {
  return apiClient.get<KnowledgeFileDTO>(`/api/v1/files/${fileId}`);
}

export async function createParseTask(fileId: number): Promise<FileParseSubmitDTO> {
  return apiClient.post<FileParseSubmitDTO>(`/api/v1/files/${fileId}/parse`);
}

export async function deleteKnowledgeFile(fileId: number): Promise<void> {
  await apiClient.delete(`/api/v1/files/${fileId}`);
}

export async function getParseResults(datasetId: number, fileIds: number[]): Promise<FileParseResultDTO[]> {
  return apiClient.get<FileParseResultDTO[]>(`/api/v1/datasets/${datasetId}/files/parse-results`, {
    fileIds: fileIds.join(','),
  });
}

export function mergeKnowledgeFilesWithParseResults<TFile extends KnowledgeFileDTO>(
  files: TFile[],
  results: FileParseResultDTO[],
): TFile[] {
  if (files.length === 0 || results.length === 0) return files;

  const resultMap = new Map(results.map((result) => [result.fileId, result]));
  let changed = false;

  const nextFiles = files.map((file) => {
    const result = resultMap.get(file.id);
    if (!result) return file;

    const nextFile = {
      ...file,
      frontendStatus: result.frontendStatus,
      parsedFilename: result.parsedFilename,
      parseStatus: result.parseStatus,
      parseFailureReason: result.failureReason,
    };

    const fileChanged =
      file.frontendStatus !== nextFile.frontendStatus ||
      file.parsedFilename !== nextFile.parsedFilename ||
      file.parseStatus !== nextFile.parseStatus ||
      file.parseFailureReason !== nextFile.parseFailureReason;

    if (fileChanged) {
      changed = true;
      return nextFile;
    }

    return file;
  });

  return changed ? nextFiles : files;
}

export async function enrichKnowledgeFilesWithParseResults(
  datasetId: number,
  files: KnowledgeFileDTO[],
): Promise<KnowledgeFileDTO[]> {
  if (files.length === 0) return files;

  const results = await getParseResults(
    datasetId,
    files.map((file) => file.id),
  );
  return mergeKnowledgeFilesWithParseResults(files, results);
}
