import { getModelDisplayName } from '@/lib/model-display';
import type { ExecutableLLMConfigDTO } from '@/types/api';

export interface ChatDefaultSelection {
  configId: number | null;
}

export function sortChatModels(
  models: ExecutableLLMConfigDTO[],
  currentConfigId: number | null,
  defaults: ChatDefaultSelection | null,
) {
  const rank = (model: ExecutableLLMConfigDTO) => {
    if (model.configId === currentConfigId) return 0;
    if (model.configId === defaults?.configId) return 1;
    return 2;
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
  options: { kind: 'conversation'; lastConfigId: number | null } | { kind: 'new'; defaultConfigId: number | null },
) {
  const requestedConfigId = options.kind === 'conversation' ? options.lastConfigId : options.defaultConfigId;
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
