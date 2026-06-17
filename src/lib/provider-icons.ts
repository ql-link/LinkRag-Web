export function normalizeProviderToken(value: string) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const PROVIDER_ICON_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob('/icons/providers/*.svg', {
      eager: true,
      query: '?url',
    }) as Record<string, string | { default: string }>,
  ).map(([path, iconModule]) => {
    const iconUrl = typeof iconModule === 'string' ? iconModule : iconModule.default;
    const filename = normalizeProviderToken(path.split('/').pop()!.replace('.svg', ''));
    return [filename, iconUrl];
  }),
);

const MONOCHROME_PROVIDER_ICON_KEYS = new Set(
  [
    'anthropic',
    'builtin',
    'gitee-ai',
    'grok',
    'midjourney',
    'moonshot',
    'n1n',
    'novita-ai',
    'ollama',
    'open-router',
    'openai',
    'replicate',
    'xai',
    'zai',
  ].map(normalizeProviderToken),
);

const PROVIDER_ICON_MONOCHROME_BY_URL = new Map(
  Object.entries(PROVIDER_ICON_URLS).map(([key, url]) => [url, MONOCHROME_PROVIDER_ICON_KEYS.has(key)]),
);

function firstAvailableIconKey(...keys: string[]) {
  return keys.map(normalizeProviderToken).find((key) => PROVIDER_ICON_URLS[key]) || '';
}

const PROVIDER_ICON_ALIASES: Record<string, string> = {
  openai: firstAvailableIconKey('openai-api', 'openai'),
  ai302: firstAvailableIconKey('ai302'),
  '302ai': firstAvailableIconKey('ai302'),
  aiproxy: firstAvailableIconKey('ai302'),
  openaiapi: firstAvailableIconKey('openai-api', 'openai'),
  openaiapicompatible: firstAvailableIconKey('openai-api', 'openai'),
  jiekouai: firstAvailableIconKey('jiekouai-bright', 'jiekouai'),
  fishaudio: firstAvailableIconKey('fish-audio-bright', 'fish-audio'),
  togetherai: firstAvailableIconKey('together-bright', 'together'),
  perplexity: firstAvailableIconKey('perplexity-bright', 'perplexity'),
  alibaba: firstAvailableIconKey('qwen-color', 'tongyi-qianwen'),
  alibabacloud: firstAvailableIconKey('qwen-color', 'tongyi-qianwen'),
  aliyun: firstAvailableIconKey('qwen-color', 'tongyi-qianwen'),
  bailian: firstAvailableIconKey('qwen-color', 'tongyi-qianwen'),
  dashscope: firstAvailableIconKey('qwen-color', 'tongyi-qianwen'),
  qianwen: firstAvailableIconKey('tongyi-qianwen', 'qwen-color'),
  tongyi: firstAvailableIconKey('tongyi-qianwen', 'qwen-color'),
  tongyiqianwen: firstAvailableIconKey('tongyi-qianwen', 'wenxinyiyan'),
  baidu: firstAvailableIconKey('wenxinyiyan', 'wenxin'),
  baiduai: firstAvailableIconKey('wenxinyiyan', 'wenxin'),
  baiducloud: firstAvailableIconKey('wenxinyiyan', 'wenxin'),
  tencentcloud: firstAvailableIconKey('tencent-cloud'),
  baiduyiyan: firstAvailableIconKey('spark', 'wenxinyiyan'),
  qianfan: firstAvailableIconKey('wenxinyiyan', 'wenxin'),
  xunfeispark: firstAvailableIconKey('spark'),
  tencenthunyuan: firstAvailableIconKey('hunyuan'),
  giteeai: firstAvailableIconKey('gitee-ai'),
  novitaai: firstAvailableIconKey('novita-ai'),
  localai: firstAvailableIconKey('local-ai'),
  zhipuai: firstAvailableIconKey('zhipu'),
  mimo: firstAvailableIconKey('xiaomimimo'),
  xiaomi: firstAvailableIconKey('xiaomimimo'),
  xiaomimimo: firstAvailableIconKey('xiaomimimo'),
};

const PROVIDER_ICON_PREFIXES = Object.keys(PROVIDER_ICON_URLS).sort((a, b) => b.length - a.length);

export function getProviderIcon(providerType: string, providerName?: string, modelName?: string) {
  const keys = [providerType, providerName || '', modelName || ''].map(normalizeProviderToken);
  const matchedAliasKey = keys
    .map((key) => PROVIDER_ICON_ALIASES[key])
    .find((iconKey) => typeof iconKey === 'string' && iconKey.length > 0);
  if (matchedAliasKey) {
    return PROVIDER_ICON_URLS[matchedAliasKey] || '';
  }

  const matchedKey = keys.find((key) =>
    PROVIDER_ICON_PREFIXES.some((iconKey) => key.includes(iconKey) || iconKey.includes(key)),
  );
  if (!matchedKey) {
    return '';
  }

  const iconKey = PROVIDER_ICON_PREFIXES.find((item) => matchedKey.includes(item) || item.includes(matchedKey));
  return iconKey ? PROVIDER_ICON_URLS[iconKey] : '';
}

export function isProviderIconMonochrome(iconUrl: string) {
  return PROVIDER_ICON_MONOCHROME_BY_URL.get(iconUrl) ?? false;
}
