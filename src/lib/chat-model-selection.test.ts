import { describe, expect, it } from 'vitest';
import type { ExecutableLLMConfigDTO, LLMScope } from '@/types/api';
import { resolveChatModelSelection, sortChatModels } from './chat-model-selection';

function model(configId: number, scope: LLMScope, displayName: string): ExecutableLLMConfigDTO {
  return {
    configId,
    scope,
    providerId: configId,
    providerType: scope === 'USER' ? 'personal' : 'platform',
    providerName: scope === 'USER' ? '个人' : '平台',
    modelName: displayName,
    displayName,
    capability: 'CHAT',
    protocol: 'openai',
    apiKeyMasked: '***',
    apiBaseUrl: 'https://example.test/v1/chat/completions',
    isActive: true,
    editable: scope === 'USER',
    snapshotVersion: 1,
    createdAt: '2026-07-27T00:00:00Z',
    updatedAt: '2026-07-27T00:00:00Z',
  };
}

describe('chat model selection', () => {
  it('sorts current, user default, platform default, personal and platform configs in order', () => {
    const result = sortChatModels(
      [
        model(5, 'SYSTEM', 'E'),
        model(4, 'USER', 'D'),
        model(3, 'SYSTEM', 'C'),
        model(2, 'USER', 'B'),
        model(1, 'SYSTEM', 'A'),
      ],
      3,
      { userDefaultConfigId: 2, systemDefaultConfigId: 1, effectiveConfigId: 2 },
    );

    expect(result.map((item) => item.configId)).toEqual([3, 2, 1, 4, 5]);
  });

  it('does not fall back to the first model when a new conversation has no default', () => {
    expect(resolveChatModelSelection([model(1, 'SYSTEM', 'A')], { kind: 'new', effectiveConfigId: null })).toEqual({
      configId: null,
      unavailableConversationConfig: false,
    });
  });

  it('keeps an existing conversation unselected when its saved config is unavailable', () => {
    expect(resolveChatModelSelection([model(1, 'SYSTEM', 'A')], { kind: 'conversation', lastConfigId: 9 })).toEqual({
      configId: null,
      unavailableConversationConfig: true,
    });
  });
});
