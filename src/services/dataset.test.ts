import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { createDataset, mergeKnowledgeFilesWithParseResults } from './dataset';
import type { FileParseResultDTO, KnowledgeFileDTO } from '@/types/api';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

function knowledgeFile(overrides: Partial<KnowledgeFileDTO> = {}): KnowledgeFileDTO {
  return {
    id: 1,
    datasetId: 10,
    originalFilename: 'demo.pdf',
    fileSuffix: 'pdf',
    fileSize: 1024,
    uploadStatus: 'UPLOAD_SUCCESS',
    isUploadSuccess: true,
    failureReason: null,
    createdAt: '2026-06-19T00:00:00.000Z',
    updatedAt: '2026-06-19T00:00:00.000Z',
    frontendStatus: 'parsing',
    parsedFilename: null,
    parseStatus: 'processing',
    parseFailureReason: 'old failure',
    ...overrides,
  };
}

function parseResult(overrides: Partial<FileParseResultDTO> = {}): FileParseResultDTO {
  return {
    fileId: 1,
    originalFilename: 'demo.pdf',
    parsedFilename: 'demo.md',
    frontendStatus: 'parse_success',
    parseStatus: 'success',
    failureReason: null,
    ...overrides,
  };
}

describe('mergeKnowledgeFilesWithParseResults', () => {
  it('updates parse result fields and clears stale failure reasons', () => {
    const files = [knowledgeFile()];
    const merged = mergeKnowledgeFilesWithParseResults(files, [parseResult()]);

    expect(merged).not.toBe(files);
    expect(merged[0]).toMatchObject({
      frontendStatus: 'parse_success',
      parsedFilename: 'demo.md',
      parseStatus: 'success',
      parseFailureReason: null,
    });
  });

  it('preserves object references when parse fields do not change', () => {
    const file = knowledgeFile({
      parsedFilename: 'demo.md',
      parseFailureReason: null,
    });
    const files = [file];

    const merged = mergeKnowledgeFilesWithParseResults(files, [
      parseResult({
        frontendStatus: 'parsing',
        parseStatus: 'processing',
      }),
    ]);

    expect(merged).toBe(files);
    expect(merged[0]).toBe(file);
  });

  it('keeps the authoritative asset summary returned by parse results', () => {
    const summary = {
      matchMode: 'SHALLOW_BASENAME' as const,
      outcome: 'ASSET_MISSING' as const,
      matchedCount: 0,
      missingCount: 1,
      ambiguousCount: 0,
      unsupportedCount: 0,
      blockingIssues: true,
      missingPaths: ['a.png'],
      candidateFilenames: [],
      issues: [],
    };

    const merged = mergeKnowledgeFilesWithParseResults([knowledgeFile()], [parseResult({ assetSummary: summary })]);

    expect(merged[0].assetSummary).toBe(summary);
  });
});

describe('createDataset', () => {
  it('submits only the two global embedding config ids', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});

    await createDataset({
      name: 'D1',
      dense_embedding_config_id: 100,
      sparse_embedding_config_id: 101,
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/datasets', {
      name: 'D1',
      dense_embedding_config_id: 100,
      sparse_embedding_config_id: 101,
    });
    const body = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>;
    expect('source' in body).toBe(false);
    expect('dense_embedding_config_source' in body).toBe(false);
    expect('sparse_embedding_config_source' in body).toBe(false);
  });
});
