import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { getChunkDetails } from './chunk';

vi.mock('@/lib/api-client', () => ({
  apiClient: { post: vi.fn() },
}));

import { apiClient } from '@/lib/api-client';

const mockPost = apiClient.post as unknown as Mock;

beforeEach(() => {
  mockPost.mockReset();
});

describe('chunk detail service', () => {
  it('deduplicates ids and normalizes returned chunk details', async () => {
    mockPost.mockResolvedValue([
      {
        chunk_id: 'chunk-1',
        doc_id: 7,
        original_filename: 'rag.md',
        content: 'RAG content',
        fused_score: 0.87,
      },
      {
        chunkId: 'chunk-2',
        documentId: 8,
        fileName: 'jvm.md',
        snippet: 'JVM content',
        score: 91,
      },
    ]);

    await expect(getChunkDetails(['chunk-1', 'chunk-1', ' ', 'chunk-2'])).resolves.toEqual([
      {
        chunkId: 'chunk-1',
        documentId: 7,
        fileName: 'rag.md',
        content: 'RAG content',
        score: 0.87,
      },
      {
        chunkId: 'chunk-2',
        documentId: 8,
        fileName: 'jvm.md',
        content: 'JVM content',
        score: 91,
      },
    ]);

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/knowledge/chunks/batch',
      { chunkIds: ['chunk-1', 'chunk-2'] },
      { signal: undefined },
    );
  });

  it('skips request when ids are empty', async () => {
    await expect(getChunkDetails([' ', ''])).resolves.toEqual([]);
    expect(mockPost).not.toHaveBeenCalled();
  });
});
