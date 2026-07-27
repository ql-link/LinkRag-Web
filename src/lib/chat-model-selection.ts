import { getModelDisplayName } from '@/lib/model-display';
import type { ExecutableLLMConfigDTO } from '@/types/api';

export interface ChatDefaultSelection {
  userDefaultConfigId: number | null;
  systemDefaultConfigId: number | null;
  effectiveConfigId: number | null;
}

export function sortChatModels(
  models: ExecutableLLMConfigDTO[],
  currentConfigId: number | null,
  defaults: ChatDefaultSelection | null,
) {
  const rank = (model: ExecutableLLMConfigDTO) => {
    if (model.configId === currentConfigId) return 0;
    if (model.configId === defaults?.userDefaultConfigId) return 1;
    if (model.configId === defaults?.systemDefaultConfigId) return 2;
    return model.scope === 'USER' ? 3 : 4;
  };

  return [...models].sort((a, b) => {
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;
    const nameDiff = `${a.providerName || a.providerType}${getModelDisplayName(a)}`.localeCompare(
      `${b.providerName || b.providerType}${getModelDisplayName(b)}`,
    );
    return nameDiff || a.configId - b.configId;
  });
}

export function resolveChatModelSelection(
  models: ExecutableLLMConfigDTO[],
  options: { kind: 'conversation'; lastConfigId: number | null } | { kind: 'new'; effectiveConfigId: number | null },
) {
  const requestedConfigId = options.kind === 'conversation' ? options.lastConfigId : options.effectiveConfigId;
  if (requestedConfigId === null) {
    return { configId: null, unavailableConversationConfig: false };
  }
  if (models.some((model) => model.configId === requestedConfigId)) {
    return { configId: requestedConfigId, unavailableConversationConfig: false };
  }
  return {
    configId: null,
    unavailableConversationConfig: options.kind === 'conversation',
  };
}
