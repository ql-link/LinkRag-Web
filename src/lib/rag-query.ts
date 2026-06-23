export const RAG_QUERY_MAX_LENGTH = 800;
export const RAG_QUERY_MAX_LENGTH_MESSAGE = `提问不能超过 ${RAG_QUERY_MAX_LENGTH} 个字符`;

export function normalizeRagQuery(query: string): string {
  return query.trim();
}

export function getRagQueryLength(query: string): number {
  return query.length;
}

export function isRagQueryTooLong(query: string): boolean {
  return getRagQueryLength(query) > RAG_QUERY_MAX_LENGTH;
}

export function limitRagQueryLength(query: string): string {
  return query.slice(0, RAG_QUERY_MAX_LENGTH);
}

export function wouldRagQueryInputExceedMaxLength(
  currentValue: string,
  insertedText: string,
  selectionStart: number | null,
  selectionEnd: number | null,
): boolean {
  const start = selectionStart ?? currentValue.length;
  const end = selectionEnd ?? start;
  const selectedLength = Math.max(end - start, 0);
  return currentValue.length - selectedLength + insertedText.length > RAG_QUERY_MAX_LENGTH;
}
