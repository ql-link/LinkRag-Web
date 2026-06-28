export function getModelDisplayName(
  model: { displayName?: string | null; modelName?: string | null } | null | undefined,
) {
  return model?.displayName?.trim() || model?.modelName || '';
}
