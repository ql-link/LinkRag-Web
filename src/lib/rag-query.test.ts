import { describe, expect, it } from 'vitest';
import {
  RAG_QUERY_MAX_LENGTH,
  RAG_QUERY_MAX_LENGTH_MESSAGE,
  getRagQueryLength,
  isRagQueryTooLong,
  limitRagQueryLength,
  normalizeRagQuery,
  wouldRagQueryInputExceedMaxLength,
} from './rag-query';

describe('rag query constraints', () => {
  it('normalizes surrounding whitespace before request validation', () => {
    expect(normalizeRagQuery('  hello  ')).toBe('hello');
  });

  it('allows the configured maximum length and rejects values above it', () => {
    expect(getRagQueryLength('a'.repeat(RAG_QUERY_MAX_LENGTH))).toBe(RAG_QUERY_MAX_LENGTH);
    expect(isRagQueryTooLong('a'.repeat(RAG_QUERY_MAX_LENGTH))).toBe(false);
    expect(isRagQueryTooLong('a'.repeat(RAG_QUERY_MAX_LENGTH + 1))).toBe(true);
  });

  it('exposes the shared user-facing validation message', () => {
    expect(RAG_QUERY_MAX_LENGTH_MESSAGE).toBe(`提问不能超过 ${RAG_QUERY_MAX_LENGTH} 个字符`);
  });

  it('limits query text without clearing existing content', () => {
    const query = `${'a'.repeat(RAG_QUERY_MAX_LENGTH)}overflow`;
    expect(limitRagQueryLength(query)).toBe('a'.repeat(RAG_QUERY_MAX_LENGTH));
  });

  it('detects input attempts that would exceed the limit', () => {
    expect(wouldRagQueryInputExceedMaxLength('a'.repeat(RAG_QUERY_MAX_LENGTH), 'b', null, null)).toBe(true);
    expect(wouldRagQueryInputExceedMaxLength('a'.repeat(RAG_QUERY_MAX_LENGTH - 1), 'b', null, null)).toBe(false);
    expect(wouldRagQueryInputExceedMaxLength('a'.repeat(RAG_QUERY_MAX_LENGTH), 'b', 0, 1)).toBe(false);
    expect(wouldRagQueryInputExceedMaxLength('', 'a'.repeat(RAG_QUERY_MAX_LENGTH + 1), 0, 0)).toBe(true);
  });
});
