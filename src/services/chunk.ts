import { apiClient } from '@/lib/api-client';
import type { ChunkDetailDTO } from '@/types/api';

type RawChunkDetail = {
  chunkId?: string | number | null;
  chunk_id?: string | number | null;
  id?: string | number | null;
  documentId?: number | string | null;
  document_id?: number | string | null;
  docId?: number | string | null;
  doc_id?: number | string | null;
  fileName?: string | null;
  file_name?: string | null;
  originalFilename?: string | null;
  original_filename?: string | null;
  content?: string | null;
  text?: string | null;
  snippet?: string | null;
  score?: number | null;
  fusedScore?: number | null;
  fused_score?: number | null;
};

function normalizeChunkDetail(raw: RawChunkDetail): ChunkDetailDTO | null {
  const chunkId = raw.chunkId ?? raw.chunk_id ?? raw.id;
  const content = raw.content ?? raw.text ?? raw.snippet ?? '';
  if (chunkId === undefined || chunkId === null) return null;

  return {
    chunkId: String(chunkId),
    documentId: raw.documentId ?? raw.document_id ?? raw.docId ?? raw.doc_id ?? null,
    fileName: raw.fileName ?? raw.file_name ?? raw.originalFilename ?? raw.original_filename ?? null,
    content,
    score: raw.score ?? raw.fusedScore ?? raw.fused_score ?? null,
  };
}

export async function getChunkDetails(chunkIds: string[], signal?: AbortSignal): Promise<ChunkDetailDTO[]> {
  const uniqueChunkIds = [...new Set(chunkIds.map((chunkId) => chunkId.trim()).filter(Boolean))];
  if (uniqueChunkIds.length === 0) return [];

  const rawItems = await apiClient.post<RawChunkDetail[]>(
    '/api/v1/knowledge/chunks/batch',
    { chunkIds: uniqueChunkIds },
    { signal },
  );

  return rawItems.map(normalizeChunkDetail).filter((item): item is ChunkDetailDTO => item !== null);
}
