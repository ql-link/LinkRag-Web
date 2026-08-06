import { describe, expect, it } from 'vitest';
import type { KnowledgeFileDTO } from '@/types/api';
import {
  KNOWLEDGE_FILE_ACCEPT,
  KNOWLEDGE_FILE_HINT,
  isFailedKnowledgeFile,
  isSupportedKnowledgeFile,
} from './knowledge-file';

function fileNamed(name: string) {
  return new File(['demo'], name);
}

function knowledgeFile(overrides: Partial<KnowledgeFileDTO> = {}): KnowledgeFileDTO {
  return {
    id: 1,
    datasetId: 1,
    originalFilename: 'demo.md',
    fileSuffix: 'md',
    fileSize: 4,
    uploadStatus: 'UPLOAD_SUCCESS',
    isUploadSuccess: true,
    failureReason: null,
    createdAt: '2026-07-28T00:00:00Z',
    updatedAt: '2026-07-28T00:00:00Z',
    frontendStatus: 'parse_success',
    parseFailureReason: null,
    ...overrides,
  };
}

describe('knowledge file upload support', () => {
  it('exposes only currently supported suffixes', () => {
    expect(KNOWLEDGE_FILE_ACCEPT).toBe('.md,.markdown,.pdf,.docx,.html,.htm');
    expect(KNOWLEDGE_FILE_HINT).toBe('支持 Markdown / PDF / DOCX / HTML');
  });

  it('rejects txt files on the frontend', () => {
    expect(isSupportedKnowledgeFile(fileNamed('notes.txt'))).toBe(false);
    expect(isSupportedKnowledgeFile(fileNamed('notes.md'))).toBe(true);
    expect(isSupportedKnowledgeFile(fileNamed('notes.MARKDOWN'))).toBe(true);
    expect(isSupportedKnowledgeFile(fileNamed('report.pdf'))).toBe(true);
    expect(isSupportedKnowledgeFile(fileNamed('manual.docx'))).toBe(true);
    expect(isSupportedKnowledgeFile(fileNamed('page.html'))).toBe(true);
    expect(isSupportedKnowledgeFile(fileNamed('page.htm'))).toBe(true);
  });

  it('uses the visible failure states when selecting files for bulk removal', () => {
    expect(isFailedKnowledgeFile(knowledgeFile({ frontendStatus: 'upload_failed' }))).toBe(true);
    expect(isFailedKnowledgeFile(knowledgeFile({ frontendStatus: 'parse_failed' }))).toBe(true);
    expect(isFailedKnowledgeFile(knowledgeFile({ uploadStatus: 'UPLOAD_FAILED' }))).toBe(true);
    expect(isFailedKnowledgeFile(knowledgeFile({ failureReason: '上传失败' }))).toBe(true);
    expect(isFailedKnowledgeFile(knowledgeFile({ parseFailureReason: '解析失败' }))).toBe(true);
    expect(isFailedKnowledgeFile(knowledgeFile())).toBe(false);
  });
});
