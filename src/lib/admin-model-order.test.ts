import { describe, expect, it } from 'vitest';
import {
  ADMIN_MODEL_CAPABILITY_ORDER,
  compareAdminModelCapabilities,
  compareCandidateGroupsByReleaseDate,
} from './admin-model-order';

describe('admin model ordering', () => {
  it('sorts capabilities with chat and vision first', () => {
    const capabilities = ['ASR', 'SPARSE_EMBEDDING', 'VISION', 'RERANK', 'CHAT', 'EMBEDDING'] as const;

    expect([...capabilities].sort(compareAdminModelCapabilities)).toEqual(ADMIN_MODEL_CAPABILITY_ORDER);
  });

  it('sorts candidate groups by the latest release date descending', () => {
    const groups = [
      [{ modelName: 'older', releaseDate: '2024-01-01' }],
      [{ modelName: 'without-date', releaseDate: null }],
      [
        { modelName: 'newest', releaseDate: '2025-01-01' },
        { modelName: 'newest', releaseDate: '2025-02-01' },
      ],
    ];

    expect(groups.sort(compareCandidateGroupsByReleaseDate).map((group) => group[0].modelName)).toEqual([
      'newest',
      'older',
      'without-date',
    ]);
  });
});
