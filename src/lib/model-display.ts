export function getModelDisplayName(
  model: { displayName?: string | null; modelName?: string | null } | null | undefined,
) {
  return model?.displayName?.trim() || model?.modelName || '';
}

type ProviderModelDisplaySource = {
  providerType: string;
  models: Array<{
    modelName: string;
    displayName?: string | null;
  }>;
};

function getProviderModelDisplayKey(providerType: string, modelName: string) {
  return `${providerType.trim().toLowerCase()}\u0000${modelName.trim().toLowerCase()}`;
}

export function createProviderModelDisplayNameMap(providers: ProviderModelDisplaySource[]) {
  const displayNameByModel = new Map<string, string>();

  providers.forEach((provider) => {
    provider.models.forEach((model) => {
      const displayName = model.displayName?.trim();
      if (!displayName) return;

      displayNameByModel.set(getProviderModelDisplayKey(provider.providerType, model.modelName), displayName);
    });
  });

  return displayNameByModel;
}

export function getProviderModelDisplayName(
  displayNameByModel: Map<string, string>,
  providerType: string,
  modelName: string,
) {
  return displayNameByModel.get(getProviderModelDisplayKey(providerType, modelName)) || '';
}

export function hydrateModelDisplayNames<
  T extends { providerType: string; modelName: string; displayName?: string | null },
>(models: T[], providers: ProviderModelDisplaySource[]) {
  const displayNameByModel = createProviderModelDisplayNameMap(providers);
  if (displayNameByModel.size === 0) return models;

  return models.map((model) => {
    if (model.displayName?.trim()) return model;

    const displayName = getProviderModelDisplayName(displayNameByModel, model.providerType, model.modelName);
    return displayName ? { ...model, displayName } : model;
  });
}
