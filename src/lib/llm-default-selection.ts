import type { CapabilityDefaultDTO, ExecutableLLMConfigDTO, LLMCapability } from '@/types/api';

export type ExecutableDefaultConfigIds = Partial<Record<LLMCapability, number>>;

export function resolveExecutableDefaultConfigIds(
  defaults: CapabilityDefaultDTO[],
  configs: ExecutableLLMConfigDTO[],
): ExecutableDefaultConfigIds {
  const configById = new Map(configs.map((config) => [config.configId, config]));
  const resolved: ExecutableDefaultConfigIds = {};

  defaults.forEach((item) => {
    if (item.configId === null) return;
    const config = configById.get(item.configId);
    if (!config || !config.isActive || config.capability !== item.capability) return;
    resolved[item.capability] = config.configId;
  });

  return resolved;
}
