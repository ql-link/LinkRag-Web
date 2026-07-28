import type { LLMCapability, ModelSyncCandidate } from '@/types/api';

export const ADMIN_MODEL_CAPABILITY_ORDER: LLMCapability[] = [
  'CHAT',
  'VISION',
  'EMBEDDING',
  'SPARSE_EMBEDDING',
  'RERANK',
  'ASR',
];

const CAPABILITY_ORDER = new Map(ADMIN_MODEL_CAPABILITY_ORDER.map((capability, index) => [capability, index]));

export function compareAdminModelCapabilities(left: string | null | undefined, right: string | null | undefined) {
  const leftIndex = left
    ? (CAPABILITY_ORDER.get(left as LLMCapability) ?? Number.MAX_SAFE_INTEGER)
    : Number.MAX_SAFE_INTEGER;
  const rightIndex = right
    ? (CAPABILITY_ORDER.get(right as LLMCapability) ?? Number.MAX_SAFE_INTEGER)
    : Number.MAX_SAFE_INTEGER;
  return leftIndex - rightIndex;
}

function releaseTimestamp(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function compareCandidateGroupsByReleaseDate(
  left: Pick<ModelSyncCandidate, 'releaseDate' | 'modelName'>[],
  right: Pick<ModelSyncCandidate, 'releaseDate' | 'modelName'>[],
) {
  const leftReleaseTimestamp = Math.max(...left.map((candidate) => releaseTimestamp(candidate.releaseDate)));
  const rightReleaseTimestamp = Math.max(...right.map((candidate) => releaseTimestamp(candidate.releaseDate)));

  if (leftReleaseTimestamp !== rightReleaseTimestamp) {
    return rightReleaseTimestamp - leftReleaseTimestamp;
  }

  return (left[0]?.modelName || '').localeCompare(right[0]?.modelName || '');
}
