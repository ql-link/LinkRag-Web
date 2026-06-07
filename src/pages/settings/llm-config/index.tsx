import { Fragment, useEffect, useMemo, useState } from 'react';
import { Box, ChevronDown, Key, Plus, RefreshCw, Search, X } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { getLLMConfigs, getLLMProviders, setDefaultLLMConfig, setupLLMProvider, toggleLLMModel } from '@/services/llm';
import type { LLMCapability, LLMConfigDTO, ProviderModelDTO } from '@/types/api';

function normalizeProviderToken(value: string) {
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

const PROVIDER_ICON_ALIASES: Record<string, string> = {
  openai:
    PROVIDER_ICON_URLS[normalizeProviderToken('openai-api')] || PROVIDER_ICON_URLS[normalizeProviderToken('openai')],
  ai302: PROVIDER_ICON_URLS[normalizeProviderToken('ai302')],
  '302ai': PROVIDER_ICON_URLS[normalizeProviderToken('ai302')],
  aiproxy: PROVIDER_ICON_URLS[normalizeProviderToken('ai302')],
  openaiapi:
    PROVIDER_ICON_URLS[normalizeProviderToken('openai-api')] || PROVIDER_ICON_URLS[normalizeProviderToken('openai')],
  openaiapicompatible:
    PROVIDER_ICON_URLS[normalizeProviderToken('openai-api')] || PROVIDER_ICON_URLS[normalizeProviderToken('openai')],
  jiekouai:
    PROVIDER_ICON_URLS[normalizeProviderToken('jiekouai-bright')] ||
    PROVIDER_ICON_URLS[normalizeProviderToken('jiekouai')],
  fishaudio:
    PROVIDER_ICON_URLS[normalizeProviderToken('fish-audio-bright')] ||
    PROVIDER_ICON_URLS[normalizeProviderToken('fish-audio')],
  togetherai:
    PROVIDER_ICON_URLS[normalizeProviderToken('together-bright')] ||
    PROVIDER_ICON_URLS[normalizeProviderToken('together')],
  perplexity:
    PROVIDER_ICON_URLS[normalizeProviderToken('perplexity-bright')] ||
    PROVIDER_ICON_URLS[normalizeProviderToken('perplexity')],
  tongyiqianwen:
    PROVIDER_ICON_URLS[normalizeProviderToken('tongyi-qianwen')] ||
    PROVIDER_ICON_URLS[normalizeProviderToken('wenxinyiyan')],
  tencentcloud: PROVIDER_ICON_URLS[normalizeProviderToken('tencent-cloud')],
  baiduyiyan:
    PROVIDER_ICON_URLS[normalizeProviderToken('spark')] || PROVIDER_ICON_URLS[normalizeProviderToken('wenxinyiyan')],
  xunfeispark: PROVIDER_ICON_URLS[normalizeProviderToken('spark')],
  tencenthunyuan: PROVIDER_ICON_URLS[normalizeProviderToken('hunyuan')],
  giteeai: PROVIDER_ICON_URLS[normalizeProviderToken('gitee-ai')],
  novitaai: PROVIDER_ICON_URLS[normalizeProviderToken('novita-ai')],
  localai: PROVIDER_ICON_URLS[normalizeProviderToken('local-ai')],
  zhipuai: PROVIDER_ICON_URLS[normalizeProviderToken('zhipu')],
};

const PROVIDER_ICON_PREFIXES = Object.keys(PROVIDER_ICON_URLS).sort((a, b) => b.length - a.length);

const PROVIDER_PRIORITY: Array<[number, string[]]> = [
  [0, ['openai', 'openaiapi', 'openaiapicompatible']],
  [1, ['anthropic', 'claude']],
  [2, ['google', 'gemini', 'googlecloud']],
  [3, ['deepseek']],
  [4, ['qwen', 'tongyi', 'tongyiqianwen', 'aliyun', 'wenxin', 'wenxinyiyan']],
  [5, ['zhipu', 'glm']],
  [6, ['moonshot', 'kimi']],
  [7, ['volcengine', 'volc', 'doubao', 'byte', 'bytedance']],
  [8, ['baichuan']],
  [9, ['minimax']],
  [10, ['azure', 'azureopenai']],
  [11, ['mistral']],
  [12, ['cohere']],
  [13, ['perplexity']],
  [14, ['xai']],
  [15, ['openrouter']],
  [16, ['siliconflow']],
  [17, ['stepfun']],
  [18, ['hunyuan', 'tencentcloud', 'tencent']],
];

const CAPABILITIES: Array<{ value: LLMCapability; label: string; hint: string }> = [
  { value: 'CHAT', label: '对话', hint: '对话' },
  { value: 'EMBEDDING', label: '向量', hint: '向量' },
  { value: 'OCR', label: '识别', hint: '识别' },
  { value: 'VISION', label: '视觉', hint: '视觉' },
  { value: 'RERANK', label: '重排', hint: '重排' },
  { value: 'ASR', label: '语音识别', hint: '语音识别' },
];

interface ConfigView extends LLMConfigDTO {
  providerName: string;
}

interface ModelGroup {
  modelName: string;
  configs: ConfigView[];
  selfConfigs: ConfigView[];
  presetConfigs: ConfigView[];
  isSelfActive: boolean;
}

interface ProviderGroup {
  providerType: string;
  providerName: string;
  configs: ConfigView[];
  models: ModelGroup[];
}

interface SetupTarget {
  provider: ProviderModelDTO;
  mode: 'create' | 'update';
}

function getCapabilityMeta(capability: LLMCapability) {
  return (
    CAPABILITIES.find((item) => item.value === capability) || {
      value: capability,
      label: capability,
      hint: capability,
    }
  );
}

function getProviderIcon(providerType: string, providerName?: string) {
  const keys = [providerType, providerName || ''].map(normalizeProviderToken);
  const matchedAlias = keys
    .map((key) => PROVIDER_ICON_ALIASES[key])
    .find((iconUrl) => typeof iconUrl === 'string' && iconUrl.length > 0);
  if (matchedAlias) {
    return matchedAlias;
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

function capabilitySort(a: LLMCapability, b: LLMCapability) {
  return CAPABILITIES.findIndex((item) => item.value === a) - CAPABILITIES.findIndex((item) => item.value === b);
}

function getProviderSortRank(providerType: string, providerName?: string) {
  const tokens = [providerType, providerName || ''].map(normalizeProviderToken);
  for (const [rank, patterns] of PROVIDER_PRIORITY) {
    if (patterns.some((pattern) => tokens.some((token) => token.includes(pattern) || pattern.includes(token)))) {
      return rank;
    }
  }
  return 100;
}

function compareProviders(
  a: { providerType: string; providerName?: string },
  b: { providerType: string; providerName?: string },
) {
  const rankDiff =
    getProviderSortRank(a.providerType, a.providerName) - getProviderSortRank(b.providerType, b.providerName);
  if (rankDiff !== 0) {
    return rankDiff;
  }
  return (a.providerName || a.providerType).localeCompare(b.providerName || b.providerType);
}

export default function LLMPage() {
  const { darkMode } = useTheme();
  const [configs, setConfigs] = useState<LLMConfigDTO[]>([]);
  const [providers, setProviders] = useState<ProviderModelDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCapabilityFilters, setSelectedCapabilityFilters] = useState<LLMCapability[]>([]);
  const [providerPickerOpen, setProviderPickerOpen] = useState(false);
  const [setupTarget, setSetupTarget] = useState<SetupTarget | null>(null);

  useEffect(() => {
    loadPageData();
  }, []);

  const providerNameByType = useMemo(() => {
    return new Map(providers.map((provider) => [provider.providerType, provider.providerName]));
  }, [providers]);

  const viewConfigs = useMemo<ConfigView[]>(() => {
    return configs.map((config) => ({
      ...config,
      providerName: providerNameByType.get(config.providerType) || config.providerType,
    }));
  }, [configs, providerNameByType]);

  const configuredProviderTypes = useMemo(() => {
    return new Set(viewConfigs.filter((config) => !config.isSystemPreset).map((config) => config.providerType));
  }, [viewConfigs]);

  const defaultByCapability = useMemo(() => {
    const map = new Map<LLMCapability, ConfigView>();
    viewConfigs.forEach((config) => {
      if (config.isDefault && config.isActive) {
        map.set(config.capability, config);
      }
    });
    return map;
  }, [viewConfigs]);

  const candidatesByCapability = useMemo(() => {
    const map = new Map<LLMCapability, ConfigView[]>();
    CAPABILITIES.forEach((capability) => map.set(capability.value, []));
    viewConfigs
      .filter((config) => config.isActive)
      .forEach((config) => {
        map.get(config.capability)?.push(config);
      });
    map.forEach((items) => {
      items.sort((a, b) => {
        if (a.isSystemPreset !== b.isSystemPreset) {
          return a.isSystemPreset ? 1 : -1;
        }
        return `${a.providerName}${a.modelName}`.localeCompare(`${b.providerName}${b.modelName}`);
      });
    });
    return map;
  }, [viewConfigs]);

  const providerGroups = useMemo<ProviderGroup[]>(() => {
    const groupMap = new Map<string, ConfigView[]>();
    viewConfigs.forEach((config) => {
      const items = groupMap.get(config.providerType) || [];
      items.push(config);
      groupMap.set(config.providerType, items);
    });

    return Array.from(groupMap.entries())
      .map(([providerType, items]) => {
        const modelMap = new Map<string, ConfigView[]>();
        items.forEach((config) => {
          const modelItems = modelMap.get(config.modelName) || [];
          modelItems.push(config);
          modelMap.set(config.modelName, modelItems);
        });

        const models = Array.from(modelMap.entries())
          .map(([modelName, modelConfigs]) => {
            const sortedConfigs = [...modelConfigs].sort((a, b) => capabilitySort(a.capability, b.capability));
            const selfConfigs = sortedConfigs.filter((config) => !config.isSystemPreset);
            return {
              modelName,
              configs: sortedConfigs,
              selfConfigs,
              presetConfigs: sortedConfigs.filter((config) => config.isSystemPreset),
              isSelfActive: selfConfigs.some((config) => config.isActive),
            };
          })
          .sort((a, b) => a.modelName.localeCompare(b.modelName));

        return {
          providerType,
          providerName: items[0]?.providerName || providerType,
          configs: items,
          models,
        };
      })
      .sort((a, b) => compareProviders(a, b));
  }, [viewConfigs]);

  const filteredProviders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const filterSet = new Set(selectedCapabilityFilters);

    const result = providers
      .filter((provider) => {
        if (filterSet.size > 0) {
          const hit = provider.models.some((model) =>
            model.capabilities.some((capability) => filterSet.has(capability)),
          );
          if (!hit) {
            return false;
          }
        }

        const searchable = [
          provider.providerName,
          provider.providerType,
          ...provider.models.flatMap((model) => [model.modelName, ...model.capabilities]),
        ]
          .join(' ')
          .toLowerCase();
        if (!keyword) {
          return true;
        }
        return searchable.includes(keyword);
      })
      .sort((a, b) => compareProviders(a, b));

    return result;
  }, [providers, searchTerm, selectedCapabilityFilters]);

  async function loadPageData() {
    setLoading(true);
    try {
      const [configResult, providerResult] = await Promise.all([getLLMConfigs(), getLLMProviders()]);
      setConfigs(configResult);
      setProviders(providerResult);
    } catch (error) {
      console.error('Failed to load LLM page data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetupProvider(providerType: string, apiKey: string) {
    try {
      await setupLLMProvider({ providerType, apiKey });
      setSetupTarget(null);
      await loadPageData();
    } catch (error) {
      console.error('Failed to setup provider:', error);
    }
  }

  async function handleSetDefault(config: ConfigView) {
    if (config.isDefault || !config.isActive) {
      return;
    }
    try {
      await setDefaultLLMConfig(config.id, config.capability);
      setConfigs((prev) =>
        prev.map((item) =>
          item.capability === config.capability ? { ...item, isDefault: item.id === config.id } : item,
        ),
      );
    } catch (error) {
      console.error('Failed to set default config:', error);
    }
  }

  async function handleSelectDefault(capability: LLMCapability, configId: string) {
    const config = viewConfigs.find((item) => item.id === Number(configId));
    if (!config || config.isDefault) {
      return;
    }
    await handleSetDefault(config);
  }

  async function handleToggleModel(group: ProviderGroup, model: ModelGroup) {
    if (model.selfConfigs.length === 0) {
      return;
    }
    const nextActive = !model.isSelfActive;
    setConfigs((prev) =>
      prev.map((config) =>
        config.providerType === group.providerType && config.modelName === model.modelName && !config.isSystemPreset
          ? { ...config, isActive: nextActive }
          : config,
      ),
    );
    try {
      await toggleLLMModel({
        providerType: group.providerType,
        modelName: model.modelName,
        enabled: nextActive,
      });
    } catch (error) {
      console.error('Failed to toggle model:', error);
      setConfigs((prev) =>
        prev.map((config) =>
          config.providerType === group.providerType && config.modelName === model.modelName && !config.isSystemPreset
            ? { ...config, isActive: model.isSelfActive }
            : config,
        ),
      );
    }
  }

  return (
    <div className="h-full flex flex-col">
      <header
        className={cn(
          'h-20 px-8 flex items-center justify-between shrink-0 backdrop-blur-md',
          darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle border-b',
        )}
      >
        <div className="flex flex-col gap-1">
          <Breadcrumb
            items={[{ label: '首页', path: Routes.Home }, { label: '设置' }, { label: '模型配置' }]}
            darkMode={darkMode}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPageData}
            className={cn(
              'h-9 rounded-lg px-3 text-xs font-bold inline-flex items-center gap-2 transition-colors',
              darkMode
                ? 'bg-[#1f2937] text-[#c7dff8] hover:bg-[#26364d]'
                : 'border border-[#d7d2ca] bg-white text-text-main hover:bg-gray-100',
            )}
            title="刷新"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
          <button
            type="button"
            onClick={() => setProviderPickerOpen(true)}
            className={cn(
              'h-9 w-fit rounded-lg px-4 text-xs font-bold inline-flex items-center gap-2 transition-colors',
              darkMode ? 'bg-[#094771] text-white hover:bg-[#0a5280]' : 'bg-text-main text-white hover:opacity-90',
            )}
          >
            <Plus size={15} />
            配置厂商
          </button>
        </div>
      </header>

      <main
        className={cn(
          'flex-1 overflow-y-auto',
          darkMode
            ? 'bg-[linear-gradient(180deg,#1f1f1f_0%,#242424_42%,#1f1f1f_100%)]'
            : 'bg-[linear-gradient(180deg,#f8f4ef_0%,#f4f1ed_44%,#f8f4ef_100%)]',
        )}
      >
        <section className="px-8 py-6">
          <div className="space-y-5 min-w-0">
            <EffectiveModelsPanel
              darkMode={darkMode}
              defaultByCapability={defaultByCapability}
              candidatesByCapability={candidatesByCapability}
              onSelect={handleSelectDefault}
            />

            <ConfiguredProvidersPanel
              darkMode={darkMode}
              loading={loading && providerGroups.length === 0}
              groups={providerGroups}
              onToggleModel={handleToggleModel}
              onUpdateProvider={(provider) => setSetupTarget({ provider, mode: 'update' })}
            />
          </div>
        </section>
      </main>

      {providerPickerOpen && (
        <ProviderPickerModal
          darkMode={darkMode}
          providers={filteredProviders}
          configuredProviderTypes={configuredProviderTypes}
          loading={loading && providers.length === 0}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedCapabilityFilters={selectedCapabilityFilters}
          onCapabilityFilterChange={setSelectedCapabilityFilters}
          onClose={() => setProviderPickerOpen(false)}
          onSetup={(provider, mode) => {
            setProviderPickerOpen(false);
            setSetupTarget({ provider, mode });
          }}
        />
      )}

      {setupTarget && (
        <SetupProviderModal
          darkMode={darkMode}
          target={setupTarget}
          onClose={() => {
            const shouldReopenPicker = setupTarget.mode === 'create';
            setSetupTarget(null);
            if (shouldReopenPicker) {
              setProviderPickerOpen(true);
            }
          }}
          onSubmit={handleSetupProvider}
        />
      )}
    </div>
  );
}

function EffectiveModelsPanel({
  darkMode,
  defaultByCapability,
  candidatesByCapability,
  onSelect,
}: {
  darkMode?: boolean;
  defaultByCapability: Map<LLMCapability, ConfigView>;
  candidatesByCapability: Map<LLMCapability, ConfigView[]>;
  onSelect: (capability: LLMCapability, configId: string) => void;
}) {
  const [openCapability, setOpenCapability] = useState<LLMCapability | null>(null);

  useEffect(() => {
    if (openCapability === null) {
      return;
    }
    const handleClose = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) {
        return;
      }
      if (!target.closest(`[data-capability="${openCapability}"]`)) {
        setOpenCapability(null);
      }
    };
    window.addEventListener('mousedown', handleClose);
    return () => {
      window.removeEventListener('mousedown', handleClose);
    };
  }, [openCapability]);

  return (
    <section className={panelClassName(darkMode)}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-inherit">
        <div>
          <h3 className={cn('text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>生效模型</h3>
        </div>
      </div>
      <div className="space-y-2 p-4">
        {CAPABILITIES.map((capability) => {
          const current = defaultByCapability.get(capability.value);
          const candidates = candidatesByCapability.get(capability.value) || [];
          const isOpen = openCapability === capability.value;
          const selectedIcon = current ? getProviderIcon(current.providerType, current.providerName) : '';
          return (
            <div
              key={capability.value}
              className={cn(
                'relative grid gap-3 border-b px-1 py-3 last:border-b-0 md:grid-cols-[56px_1fr_340px] md:items-center',
                isOpen && 'ring-1 ring-[#3b82f6]/35 rounded-lg',
                darkMode ? 'border-[#3c3c3c]/50' : 'border-border-subtle/60',
              )}
              data-capability={capability.value}
            >
              <CapabilityBadge capability={capability.value} compact />
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  {current ? (
                    <ProviderIcon iconUrl={selectedIcon} name={current.providerName} darkMode={darkMode} size="sm" />
                  ) : null}
                  <div className="min-w-0">
                    <p className={cn('text-sm font-bold truncate', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                      {current ? current.modelName : '未设置'}
                    </p>
                    <p className={cn('text-[11px] mt-0.5 truncate', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                      {current ? `${current.providerName}` : '暂无生效模型'}
                    </p>
                  </div>
                  {current?.isSystemPreset && <SourcePill darkMode={darkMode} preset compact />}
                </div>
              </div>
              <button
                type="button"
                disabled={candidates.length === 0}
                onClick={() => setOpenCapability((prev) => (prev === capability.value ? null : capability.value))}
                className={cn(
                  'group h-8 w-full rounded-md border px-2.5 text-left text-xs outline-none transition-all',
                  isOpen ? (darkMode ? 'bg-[#2a2a2a] border-[#3b82f6]' : 'bg-primary/5 border-primary') : '',
                  darkMode
                    ? 'border-[#3c3c3c] bg-[#252526] text-[#cccccc]'
                    : 'border-border-subtle bg-white/80 text-text-main/80',
                )}
              >
                <div className="flex h-full items-center justify-between gap-2">
                  <span className={current ? 'text-[12px]' : 'text-[12px] text-text-main/55'}>
                    {candidates.length === 0 ? '暂无候选' : isOpen ? '选择生效模型' : '点击选择生效模型'}
                  </span>
                  <ChevronDown
                    size={13}
                    className={cn('shrink-0 text-text-main transition-transform', isOpen && 'rotate-180')}
                  />
                </div>
              </button>

              {isOpen && candidates.length > 0 ? (
                <div
                  className={cn(
                    'absolute right-0 top-full z-10 mt-2 w-[340px] rounded-lg border p-1 shadow-2xl md:left-auto',
                    darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-border-subtle',
                  )}
                >
                  <div className="max-h-72 overflow-auto space-y-1">
                    {candidates.map((config) => {
                      const optionIcon = getProviderIcon(config.providerType, config.providerName);
                      return (
                        <button
                          type="button"
                          key={config.id}
                          onClick={() => {
                            onSelect(capability.value, `${config.id}`);
                            setOpenCapability(null);
                          }}
                          className={cn(
                            'w-full rounded-md border px-2.5 py-2 text-left transition-colors',
                            darkMode ? 'border-[#3c3c3c] hover:bg-[#2d2d2d]' : 'border-border-subtle hover:bg-bg-base',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <ProviderIcon
                              iconUrl={optionIcon}
                              name={config.providerName}
                              darkMode={darkMode}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  'text-xs font-bold truncate',
                                  darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
                                )}
                              >
                                {config.modelName}
                              </p>
                            </div>
                            {config.isSystemPreset ? <SourcePill darkMode={darkMode} preset /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ConfiguredProvidersPanel({
  darkMode,
  loading,
  groups,
  onToggleModel,
  onUpdateProvider,
}: {
  darkMode?: boolean;
  loading: boolean;
  groups: ProviderGroup[];
  onToggleModel: (group: ProviderGroup, model: ModelGroup) => void;
  onUpdateProvider: (provider: ProviderModelDTO) => void;
}) {
  return (
    <section className={panelClassName(darkMode)}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-inherit">
        <h3 className={cn('text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>模型管理</h3>
      </div>

      {loading ? (
        <LoadingState darkMode={darkMode} label="加载模型配置..." />
      ) : groups.length === 0 ? (
        <EmptyConfiguredState darkMode={darkMode} />
      ) : (
        <div className="space-y-3 p-3">
          {groups.map((group) => (
            <Fragment key={group.providerType}>
              <ProviderConfigCard
                darkMode={darkMode}
                group={group}
                onToggleModel={onToggleModel}
                onUpdateProvider={onUpdateProvider}
              />
            </Fragment>
          ))}
        </div>
      )}
    </section>
  );
}

function ProviderConfigCard({
  darkMode,
  group,
  onToggleModel,
  onUpdateProvider,
}: {
  darkMode?: boolean;
  group: ProviderGroup;
  onToggleModel: (group: ProviderGroup, model: ModelGroup) => void;
  onUpdateProvider: (provider: ProviderModelDTO) => void;
}) {
  const iconUrl = getProviderIcon(group.providerType, group.providerName);
  const selfCount = group.configs.filter((config) => !config.isSystemPreset).length;
  const presetCount = group.configs.length - selfCount;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <article className={cn('py-2', darkMode ? 'border-b border-[#3c3c3c]/50' : 'border-b border-border-subtle/60')}>
      <header className="flex items-start justify-between gap-3 px-1 md:items-center">
        <div className="flex items-center gap-2.5 min-w-0">
          <ProviderIcon iconUrl={iconUrl} name={group.providerName} darkMode={darkMode} size="sm" />
          <div className="min-w-0">
            <h4 className={cn('text-sm font-bold truncate', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
              {group.providerName}
            </h4>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              onUpdateProvider({
                providerType: group.providerType,
                providerName: group.providerName,
                models: [],
              })
            }
            className={cn(
              'inline-flex h-7 shrink-0 items-center rounded-md px-2 text-xs font-semibold transition-colors',
              darkMode
                ? 'text-[#c7c7c7] hover:bg-[#2d2d2d] hover:text-[#e0e0e0]'
                : 'text-text-main/65 hover:bg-gray-100 hover:text-text-main',
            )}
            title="更新密钥"
            aria-label="更新密钥"
          >
            更新密钥
          </button>
          <div className={cn('flex flex-wrap gap-2 text-[11px]', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
            <span className="text-sm font-semibold">{group.models.length} 模型</span>
            {presetCount > 0 && <span>{presetCount} 预设</span>}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className={cn(
              'inline-flex h-7 shrink-0 items-center rounded-md px-2 text-xs font-semibold transition-colors',
              darkMode
                ? 'text-[#c7c7c7] hover:bg-[#2d2d2d] hover:text-[#e0e0e0]'
                : 'text-text-main/65 hover:bg-gray-100 hover:text-text-main',
            )}
            title={collapsed ? '展开' : '收起'}
            aria-label={collapsed ? '展开' : '收起'}
          >
            {collapsed ? '展开' : '收起'}
          </button>
        </div>
      </header>

      {!collapsed ? (
        <div className="mt-1 space-y-1.5 pl-10">
          {group.models.map((model) => (
            <Fragment key={model.modelName}>
              <ModelConfigBlock darkMode={darkMode} group={group} model={model} onToggleModel={onToggleModel} />
            </Fragment>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ModelConfigBlock({
  darkMode,
  group,
  model,
  onToggleModel,
}: {
  darkMode?: boolean;
  group: ProviderGroup;
  model: ModelGroup;
  onToggleModel: (group: ProviderGroup, model: ModelGroup) => void;
}) {
  const capabilityText = model.configs.map((config) => getCapabilityMeta(config.capability).label).join(' · ');

  return (
    <section className="py-1">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <p className={cn('shrink-0 text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
            {model.modelName}
          </p>
          <p className={cn('min-w-0 truncate text-sm font-medium', darkMode ? 'text-[#cccccc]' : 'text-text-main')}>
            {capabilityText}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StateSwitch
            darkMode={darkMode}
            checked={model.isSelfActive}
            label={model.selfConfigs.length === 0 ? '仅预设' : model.isSelfActive ? '启用中' : '已停用'}
            disabled={model.selfConfigs.length === 0}
            onClick={() => onToggleModel(group, model)}
          />
        </div>
      </div>
    </section>
  );
}

function ProviderPickerModal({
  darkMode,
  providers,
  configuredProviderTypes,
  loading,
  searchTerm,
  selectedCapabilityFilters,
  onSearchChange,
  onCapabilityFilterChange,
  onClose,
  onSetup,
}: {
  darkMode?: boolean;
  providers: ProviderModelDTO[];
  configuredProviderTypes: Set<string>;
  loading: boolean;
  searchTerm: string;
  selectedCapabilityFilters: LLMCapability[];
  onSearchChange: (value: string) => void;
  onCapabilityFilterChange: (value: LLMCapability[]) => void;
  onClose: () => void;
  onSetup: (provider: ProviderModelDTO, mode: SetupTarget['mode']) => void;
}) {
  const filterSet = new Set(selectedCapabilityFilters);

  function toggleCapabilityFilter(capability: LLMCapability) {
    if (selectedCapabilityFilters.length > 0 && selectedCapabilityFilters[0] === capability) {
      onCapabilityFilterChange([]);
      return;
    }
    onCapabilityFilterChange([capability]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <section
        className={cn(
          'relative flex h-[min(760px,calc(100vh-64px))] w-full max-w-[880px] flex-col overflow-hidden rounded-lg shadow-2xl',
          darkMode ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white/95 border border-white/90',
        )}
      >
        <header className={cn('px-6 py-5 border-b', darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle')}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className={cn('text-lg font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>配置厂商</h3>
              <p className={cn('text-xs mt-1', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                选择一个厂商后填写厂商级 API Key。
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'p-2 rounded-lg transition-colors',
                darkMode ? 'text-[#858585] hover:bg-[#2d2d2d]' : 'text-text-main/50 hover:bg-gray-100',
              )}
              title="关闭"
            >
              <X size={18} />
            </button>
          </div>
          <div className="relative mt-5">
            <Search
              size={15}
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2',
                darkMode ? 'text-[#858585]' : 'text-text-main/40',
              )}
            />
            <input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索厂商、模型或能力"
              className={cn(
                'h-10 w-full rounded-lg border pl-9 pr-3 text-sm outline-none transition-colors',
                darkMode
                  ? 'border-[#3c3c3c] bg-[#1e1e1e] text-[#e0e0e0] placeholder:text-[#6b6b6b] focus:border-[#3b82f6]'
                  : 'border-border-subtle bg-bg-base/50 text-text-main placeholder:text-text-main/35 focus:border-primary',
              )}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {CAPABILITIES.map((capability) => {
              const active = filterSet.has(capability.value);
              return (
                <button
                  type="button"
                  key={capability.value}
                  onClick={() => toggleCapabilityFilter(capability.value)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-bold transition-colors',
                    active
                      ? darkMode
                        ? 'border-[#3b82f6] bg-[#3b82f6]/12 text-[#8cb9ff]'
                        : 'border-primary bg-primary/12 text-primary'
                      : darkMode
                        ? 'border-[#3c3c3c] bg-[#1f1f1f] text-[#b4b4b4] hover:border-[#4a4a4a]'
                        : 'border-border-subtle bg-white/80 text-text-main/70 hover:border-[#c2b6ab]/50',
                  )}
                >
                  {capability.label}
                </button>
              );
            })}
          </div>
        </header>

        <div className={cn('min-h-0 flex-1 overflow-y-auto', darkMode ? 'bg-[#252526]' : 'bg-white/95')}>
          {loading ? (
            <LoadingState darkMode={darkMode} label="加载厂商目录..." />
          ) : providers.length === 0 ? (
            <div className={cn('px-6 py-16 text-center text-sm', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
              没有匹配的厂商
            </div>
          ) : (
            <div className="grid gap-2 p-4 min-h-[260px] sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3">
              {providers.map((provider) => {
                const configured = configuredProviderTypes.has(provider.providerType);
                return (
                  <Fragment key={provider.providerType}>
                    <AvailableProviderCard
                      darkMode={darkMode}
                      provider={provider}
                      configured={configured}
                      onSetup={() => onSetup(provider, configured ? 'update' : 'create')}
                    />
                  </Fragment>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function AvailableProviderCard({
  darkMode,
  provider,
  configured,
  onSetup,
}: {
  darkMode?: boolean;
  provider: ProviderModelDTO;
  configured: boolean;
  onSetup: () => void;
}) {
  const iconUrl = getProviderIcon(provider.providerType, provider.providerName);
  const capabilitySet = new Set(provider.models.flatMap((model) => model.capabilities));
  const sortedCapabilities = Array.from(capabilitySet).sort(capabilitySort);

  return (
    <button
      type="button"
      onClick={onSetup}
      className={cn(
        'group w-full rounded-lg border p-3 text-left transition-colors',
        darkMode
          ? 'border-[#3c3c3c] bg-[#1e1e1e] hover:border-[#3b82f6]/50 hover:bg-[#232323]'
          : 'border-border-subtle bg-bg-base/55 hover:border-primary/35 hover:bg-white',
      )}
    >
      <div className="flex items-center gap-2.5">
        <ProviderIcon iconUrl={iconUrl} name={provider.providerName} darkMode={darkMode} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={cn('text-sm font-bold truncate', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
              {provider.providerName}
            </h4>
            {configured && <CountPill darkMode={darkMode} label="已配置" />}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className={cn('truncate text-xs leading-relaxed', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/60')}>
          {sortedCapabilities.map((capability, index) => (
            <span key={capability}>
              {index > 0 ? ' · ' : ''}
              {getCapabilityMeta(capability).label}
            </span>
          ))}
          <span className="whitespace-nowrap"> · {provider.models.length} 个模型</span>
        </p>
        <span
          className={cn(
            'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors',
            darkMode
              ? 'bg-[#094771] text-white group-hover:bg-[#0a5280]'
              : 'bg-text-main text-white group-hover:opacity-90',
          )}
        >
          <Plus size={13} />
          {configured ? '更新' : '配置'}
        </span>
      </div>
    </button>
  );
}

function SetupProviderModal({
  darkMode,
  target,
  onClose,
  onSubmit,
}: {
  darkMode?: boolean;
  target: SetupTarget;
  onClose: () => void;
  onSubmit: (providerType: string, apiKey: string) => Promise<void>;
}) {
  const [apiKey, setApiKey] = useState('');
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const iconUrl = getProviderIcon(target.provider.providerType, target.provider.providerName);

  async function handleSubmit() {
    setValidationError('');
    if (!apiKey.trim()) {
      setValidationError('请填写 API Key');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(target.provider.providerType, apiKey.trim());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative w-full max-w-[520px] rounded-lg shadow-2xl overflow-hidden',
          darkMode ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white/94 border border-white/90',
        )}
      >
        <header
          className={cn(
            'h-20 px-6 flex items-center justify-between border-b',
            darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <ProviderIcon iconUrl={iconUrl} name={target.provider.providerName} darkMode={darkMode} size="md" />
            <div className="min-w-0">
              <h3 className={cn('text-lg font-bold truncate', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                {target.provider.providerName}
              </h3>
              <div
                className={cn(
                  'mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs',
                  darkMode ? 'text-[#858585]' : 'text-text-main/45',
                )}
              >
                <span className="truncate">{target.provider.providerType}</span>
                <span className={cn('text-[11px] font-medium', darkMode ? 'text-[#bdbdbd]' : 'text-text-main/60')}>
                  {target.mode === 'update' ? '更新厂商' : '配置厂商'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg transition-colors',
              darkMode ? 'text-[#858585] hover:bg-[#2d2d2d]' : 'text-text-main/50 hover:bg-gray-100',
            )}
          >
            <X size={18} />
          </button>
        </header>

        <div className="p-6 space-y-4">
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="输入 API Key"
            className={cn(
              'h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors',
              darkMode
                ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#e0e0e0] placeholder:text-[#6b6b6b] focus:border-[#3b82f6]'
                : 'border-border-subtle bg-white/80 text-text-main placeholder:text-text-main/35 focus:border-primary',
            )}
          />

          {validationError && (
            <div className={cn('px-1 text-xs font-bold', darkMode ? 'text-red-300' : 'text-red-600')}>
              {validationError}
            </div>
          )}
        </div>

        <footer
          className={cn(
            'px-6 py-4 border-t flex items-center justify-end gap-3',
            darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
          )}
        >
          <button
            onClick={onClose}
            className={cn(
              'h-9 px-4 rounded-lg text-xs font-bold',
              darkMode ? 'text-[#cccccc] hover:bg-[#2d2d2d]' : 'hover:bg-gray-100',
            )}
            disabled={submitting}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={cn(
              'h-9 px-4 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-opacity disabled:cursor-not-allowed disabled:opacity-60',
              darkMode ? 'bg-[#094771] text-white hover:bg-[#0a5280]' : 'bg-text-main text-white hover:opacity-90',
            )}
          >
            {submitting && <RefreshCw size={13} className="animate-spin" />}
            保存
          </button>
        </footer>
      </div>
    </div>
  );
}

function LoadingState({ darkMode, label }: { darkMode?: boolean; label: string }) {
  return (
    <div className={cn('flex items-center justify-center py-16', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
      <RefreshCw size={18} className="animate-spin mr-2" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function EmptyConfiguredState({ darkMode }: { darkMode?: boolean }) {
  return (
    <div className={cn('text-center py-16', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
      <Key size={38} className={cn('mx-auto mb-4', darkMode ? 'text-[#6b6b6b]' : 'text-text-main/20')} />
      <p className={cn('text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>暂无自配厂商</p>
      <p className="mt-1 text-xs">点击配置厂商，选择厂商并填写 API Key。</p>
    </div>
  );
}

function StateSwitch({
  darkMode,
  checked,
  label,
  disabled,
  onClick,
}: {
  darkMode?: boolean;
  checked: boolean;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group inline-flex h-6 w-[126px] shrink-0 items-center justify-start gap-2 overflow-hidden rounded-full text-[11px] font-bold leading-none transition-opacity disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200',
          checked
            ? 'border-[#6d9b7c]/45 bg-[#6d9b7c]/14'
            : darkMode
              ? disabled
                ? 'border-[#3c3c3c] bg-[#2d2d2d]'
                : 'border-[#c77a7a]/45 bg-[#c77a7a]/14'
              : disabled
                ? 'border-border-subtle bg-bg-base'
                : 'border-[#c77a7a]/35 bg-[#c77a7a]/12',
        )}
      >
        <span
          className={cn(
            'absolute left-[3px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0',
            checked ? 'bg-[#6d9b7c]' : disabled ? (darkMode ? 'bg-[#858585]' : 'bg-text-main/35') : 'bg-[#c77a7a]',
          )}
        />
      </span>
      <span
        className={cn(
          'inline-block w-[72px] shrink-0 text-left',
          checked
            ? 'text-[#6d9b7c]'
            : disabled
              ? darkMode
                ? 'text-[#858585]'
                : 'text-text-main/45'
              : 'text-[#c77a7a]',
        )}
      >
        {label}
      </span>
    </button>
  );
}

function ProviderIcon({
  iconUrl,
  name,
  darkMode,
  size,
}: {
  iconUrl: string;
  name: string;
  darkMode?: boolean;
  size: 'sm' | 'md';
}) {
  const className = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';

  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={name}
        className={cn(className, 'rounded-lg object-contain shrink-0', darkMode ? 'bg-[#3c3c3c]' : 'bg-white')}
      />
    );
  }

  return (
    <div
      className={cn(
        className,
        'rounded-lg flex items-center justify-center shrink-0',
        darkMode ? 'bg-[#3c3c3c]' : 'bg-primary/10',
      )}
    >
      <Box size={16} className={darkMode ? 'text-[#3b82f6]' : 'text-primary'} />
    </div>
  );
}

function CapabilityBadge({ capability, compact }: { capability: LLMCapability; compact?: boolean }) {
  const meta = getCapabilityMeta(capability);

  return <span className={cn(compact ? 'text-sm' : 'text-sm', 'font-semibold text-black')}>{meta.label}</span>;
}

function CountPill({ darkMode, label }: { darkMode?: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-medium',
        darkMode ? 'text-[#858585]' : 'text-text-main/45',
      )}
    >
      {label}
    </span>
  );
}

function SourcePill({ darkMode, preset, compact }: { darkMode?: boolean; preset: boolean; compact?: boolean }) {
  return (
    <span
      className={cn(
        compact ? 'h-5 px-1.5 text-[9px]' : 'h-6 px-2 text-[10px]',
        'w-fit rounded-md inline-flex items-center justify-center font-bold',
        preset
          ? darkMode
            ? 'bg-[#3b82f6]/14 text-[#70a8ff]'
            : 'bg-primary/10 text-primary'
          : darkMode
            ? 'bg-[#2d2d2d] text-[#cccccc]'
            : 'bg-bg-base text-text-main/60',
      )}
    >
      {preset ? '系统预设' : '自配'}
    </span>
  );
}

function panelClassName(darkMode?: boolean) {
  return cn(
    'rounded-lg border overflow-hidden',
    darkMode ? 'bg-[#252526]/88 border-[#3c3c3c]' : 'bg-white/84 border-white/85 shadow-sm',
  );
}
