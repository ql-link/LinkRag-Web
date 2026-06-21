import { describe, expect, it } from 'vitest';
import { mergeKnowledgeFilesWithParseResults } from './dataset';
import type { FileParseResultDTO, KnowledgeFileDTO } from '@/types/api';

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
});
