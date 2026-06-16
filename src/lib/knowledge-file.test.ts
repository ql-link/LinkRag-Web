import { describe, expect, it } from 'vitest';
import { KNOWLEDGE_FILE_ACCEPT, KNOWLEDGE_FILE_HINT, isSupportedKnowledgeFile } from './knowledge-file';

function fileNamed(name: string) {
  return new File(['demo'], name);
}

describe('knowledge file upload support', () => {
  it('exposes only currently supported suffixes', () => {
    expect(KNOWLEDGE_FILE_ACCEPT).toBe('.md,.markdown,.pdf,.docx');
    expect(KNOWLEDGE_FILE_HINT).toBe('支持 md / markdown / pdf / docx');
  });

  it('rejects txt files on the frontend', () => {
    expect(isSupportedKnowledgeFile(fileNamed('notes.txt'))).toBe(false);
    expect(isSupportedKnowledgeFile(fileNamed('notes.md'))).toBe(true);
    expect(isSupportedKnowledgeFile(fileNamed('notes.MARKDOWN'))).toBe(true);
    expect(isSupportedKnowledgeFile(fileNamed('report.pdf'))).toBe(true);
    expect(isSupportedKnowledgeFile(fileNamed('manual.docx'))).toBe(true);
  });
});
