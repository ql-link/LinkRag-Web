import { describe, expect, it } from 'vitest';
import type { CapabilityDefaultDTO, ExecutableLLMConfigDTO, LLMCapability, LLMScope } from '@/types/api';
import { resolveExecutableDefaultConfigIds } from './llm-default-selection';

function config(
  configId: number,
  capability: LLMCapability,
  options: { scope?: LLMScope; isActive?: boolean } = {},
): ExecutableLLMConfigDTO {
  const scope = options.scope ?? 'USER';
  return {
    configId,
    scope,
    providerId: configId,
    providerType: 'test',
    providerName: '测试厂商',
    modelName: `model-${configId}`,
    capability,
    protocol: 'openai',
    apiKeyMasked: '***',
    apiBaseUrl: 'https://example.test/v1',
    isActive: options.isActive ?? true,
    editable: scope === 'USER',
    snapshotVersion: 1,
    createdAt: '2026-07-28T00:00:00Z',
    updatedAt: '2026-07-28T00:00:00Z',
  };
}

describe('executable LLM defaults', () => {
  it('resolves USER and SYSTEM defaults by the unified configId', () => {
    const defaults: CapabilityDefaultDTO[] = [
      { capability: 'CHAT', configId: 11 },
      { capability: 'EMBEDDING', configId: 12 },
    ];

    expect(
      resolveExecutableDefaultConfigIds(defaults, [config(11, 'CHAT'), config(12, 'EMBEDDING', { scope: 'SYSTEM' })]),
    ).toEqual({ CHAT: 11, EMBEDDING: 12 });
  });

  it('does not fall back to the first candidate when the user has no default', () => {
    expect(
      resolveExecutableDefaultConfigIds(
        [{ capability: 'CHAT', configId: null }],
        [config(1, 'CHAT'), config(2, 'CHAT')],
      ),
    ).toEqual({});
  });

  it.each([
    ['not visible', { capability: 'CHAT', configId: 9 } satisfies CapabilityDefaultDTO, [config(1, 'CHAT')]],
    [
      'inactive',
      { capability: 'CHAT', configId: 9 } satisfies CapabilityDefaultDTO,
      [config(9, 'CHAT', { isActive: false })],
    ],
    ['capability mismatch', { capability: 'CHAT', configId: 9 } satisfies CapabilityDefaultDTO, [config(9, 'VISION')]],
  ])('treats a %s default as unset', (_label, defaultItem, configs) => {
    expect(resolveExecutableDefaultConfigIds([defaultItem], configs)).toEqual({});
  });
});
