import { Fragment, useEffect, useMemo, useState } from 'react';
import { Box, ChevronDown, Key, Plus, RefreshCw, Search, X } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useTheme } from '@/contexts/ThemeContext';
import { getProviderIcon, isProviderIconMonochrome, normalizeProviderToken } from '@/lib/provider-icons';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import {
  getLLMConfigs,
  getLLMProviders,
  selectEffectiveLLMModel,
  setupLLMProvider,
  toggleLLMModel,
} from '@/services/llm';
import type {
  LLMCapability,
  LLMCapabilityValue,
  LLMConfigDTO,
  ModelCapabilityDTO,
  ProviderModelDTO,
} from '@/types/api';

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
  [10, ['mimo', 'xiaomi', 'xiaomimimo']],
  [11, ['azure', 'azureopenai']],
  [12, ['mistral']],
  [13, ['cohere']],
  [14, ['perplexity']],
  [15, ['xai']],
  [16, ['openrouter']],
  [17, ['siliconflow']],
  [18, ['stepfun']],
  [19, ['hunyuan', 'tencentcloud', 'tencent']],
];

interface CapabilityMeta {
  value: LLMCapabilityValue;
  label: string;
  hint: string;
}

const CAPABILITIES: Array<CapabilityMeta & { value: LLMCapability }> = [
  { value: 'CHAT', label: '对话', hint: '对话' },
  { value: 'VISION', label: '视觉', hint: '视觉' },
  { value: 'ASR', label: '语音识别', hint: '语音识别' },
  { value: 'RERANK', label: '重排', hint: '重排' },
  { value: 'EMBEDDING', label: '稠密向量', hint: '稠密向量' },
  { value: 'SPARSE_EMBEDDING', label: '稀疏向量', hint: '稀疏向量' },
];

const EFFECTIVE_MODEL_CAPABILITIES = CAPABILITIES;

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

type ModelSourceFilter = 'preset' | 'self';

function isSupportedCapability(capability: LLMCapabilityValue): capability is LLMCapability {
  return CAPABILITIES.some((item) => item.value === capability);
}

function getCapabilityMeta(capability: LLMCapabilityValue): CapabilityMeta {
  if (capability === 'OCR') {
    return {
      value: capability,
      label: 'OCR（废弃）',
      hint: 'OCR',
    };
  }

  return (
    CAPABILITIES.find((item) => item.value === capability) || {
      value: capability,
      label: capability,
      hint: capability,
    }
  );
}

function capabilitySort(a: LLMCapabilityValue, b: LLMCapabilityValue) {
  const aIndex = CAPABILITIES.findIndex((item) => item.value === a);
  const bIndex = CAPABILITIES.findIndex((item) => item.value === b);
  const aRank = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
  const bRank = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
  if (aRank !== bRank) {
    return aRank - bRank;
  }
  return a.localeCompare(b);
}

function getCapabilityValue(capability: ModelCapabilityDTO['capabilities'][number]): LLMCapabilityValue {
  return typeof capability === 'string' ? capability : capability.capability;
}

function getModelCapabilityValues(model: ModelCapabilityDTO) {
  return model.capabilities.map(getCapabilityValue);
}

function getModelSearchTokens(model: ModelCapabilityDTO) {
  return [
    model.modelName,
    ...model.capabilities.flatMap((capability) =>
      typeof capability === 'string'
        ? [capability]
        : [capability.capability, capability.protocol, capability.apiBaseUrl],
    ),
  ];
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

// Module-level SWR-style cache: persists across route navigations within the same session.
const LLM_CACHE_TTL = 5 * 60 * 1000;
const llmPageCache: { configs: LLMConfigDTO[] | null; providers: ProviderModelDTO[] | null; fetchedAt: number } = {
  configs: null,
  providers: null,
  fetchedAt: 0,
};
function isCacheValid() {
  return (
    llmPageCache.configs !== null &&
    llmPageCache.providers !== null &&
    Date.now() - llmPageCache.fetchedAt < LLM_CACHE_TTL
  );
}
function invalidateLLMPageCache() {
  llmPageCache.configs = null;
  llmPageCache.providers = null;
  llmPageCache.fetchedAt = 0;
}

export default function LLMPage() {
  const { darkMode } = useTheme();
  const [configs, setConfigs] = useState<LLMConfigDTO[]>(() => llmPageCache.configs ?? []);
  const [providers, setProviders] = useState<ProviderModelDTO[]>(() => llmPageCache.providers ?? []);
  const [loading, setLoading] = useState(() => !isCacheValid());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCapabilityFilters, setSelectedCapabilityFilters] = useState<LLMCapability[]>([]);
  const [selectedModelSourceFilter, setSelectedModelSourceFilter] = useState<ModelSourceFilter>('preset');
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
      if (config.isDefault && config.isActive && isSupportedCapability(config.capability)) {
        map.set(config.capability, config);
      }
    });
    return map;
  }, [viewConfigs]);

  const candidatesByCapability = useMemo(() => {
    const map = new Map<LLMCapability, ConfigView[]>();
    CAPABILITIES.forEach((capability) => map.set(capability.value, []));
    viewConfigs.forEach((config) => {
      if (config.isActive && isSupportedCapability(config.capability)) {
        map.get(config.capability)?.push(config);
      }
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

  const filteredProviderGroups = useMemo(() => {
    const includePreset = selectedModelSourceFilter === 'preset';
    const includeSelf = selectedModelSourceFilter === 'self';

    return providerGroups
      .map((group) => {
        const models = group.models
          .map((model) => {
            const selfConfigs = includeSelf ? model.selfConfigs : [];
            const presetConfigs = includePreset ? model.presetConfigs : [];
            const configs = model.configs.filter((config) => (config.isSystemPreset ? includePreset : includeSelf));

            return {
              ...model,
              configs,
              selfConfigs,
              presetConfigs,
              isSelfActive: selfConfigs.some((config) => config.isActive),
            };
          })
          .filter((model) => model.configs.length > 0);

        return {
          ...group,
          configs: group.configs.filter((config) => (config.isSystemPreset ? includePreset : includeSelf)),
          models,
        };
      })
      .filter((group) => group.models.length > 0);
  }, [providerGroups, selectedModelSourceFilter]);

  const modelSourceCounts = useMemo(() => {
    const presetProviderTypes = new Set<string>();
    const selfProviderTypes = new Set<string>();

    providerGroups.forEach((group) => {
      if (group.configs.some((config) => config.isSystemPreset)) {
        presetProviderTypes.add(group.providerType);
      }
      if (group.configs.some((config) => !config.isSystemPreset)) {
        selfProviderTypes.add(group.providerType);
      }
    });

    return {
      preset: presetProviderTypes.size,
      self: selfProviderTypes.size,
    };
  }, [providerGroups]);

  const filteredProviders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const filterSet = new Set(selectedCapabilityFilters);

    const result = providers
      .filter((provider) => {
        if (filterSet.size > 0) {
          const hit = provider.models.some((model) =>
            getModelCapabilityValues(model).some(
              (capability) => isSupportedCapability(capability) && filterSet.has(capability),
            ),
          );
          if (!hit) {
            return false;
          }
        }

        const searchable = [
          provider.providerName,
          provider.providerType,
          ...provider.models.flatMap(getModelSearchTokens),
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
    if (isCacheValid()) {
      // Stale-while-revalidate: cache still fresh, revalidate silently in background.
      try {
        const [configResult, providerResult] = await Promise.all([getLLMConfigs(), getLLMProviders()]);
        llmPageCache.configs = configResult;
        llmPageCache.providers = providerResult;
        llmPageCache.fetchedAt = Date.now();
        setConfigs(configResult);
        setProviders(providerResult);
      } catch (error) {
        console.error('Failed to revalidate LLM page data:', error);
      }
      return;
    }

    setLoading(true);
    try {
      const [configResult, providerResult] = await Promise.all([getLLMConfigs(), getLLMProviders()]);
      llmPageCache.configs = configResult;
      llmPageCache.providers = providerResult;
      llmPageCache.fetchedAt = Date.now();
      setConfigs(configResult);
      setProviders(providerResult);
    } catch (error) {
      console.error('Failed to load LLM page data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Silent background revalidation after mutations — no loading state, optimistic UI stays visible.
  async function revalidate() {
    try {
      const [configResult, providerResult] = await Promise.all([getLLMConfigs(), getLLMProviders()]);
      llmPageCache.configs = configResult;
      llmPageCache.providers = providerResult;
      llmPageCache.fetchedAt = Date.now();
      setConfigs(configResult);
      setProviders(providerResult);
    } catch (error) {
      console.error('Failed to revalidate LLM page data:', error);
    }
  }

  async function handleSetupProvider(providerType: string, apiKey: string) {
    try {
      const nextConfigs = await setupLLMProvider({ providerType, apiKey });
      setConfigs(nextConfigs);
      setSelectedModelSourceFilter('self');
      setSetupTarget(null);
      void revalidate();
    } catch (error) {
      console.error('Failed to setup provider:', error);
    }
  }

  async function handleSelectDefault(capability: LLMCapability, configId: string) {
    const config = viewConfigs.find((item) => item.id === Number(configId));
    if (!config || config.isDefault || !config.isActive) {
      return;
    }
    const previousDefaultId = viewConfigs.find((item) => item.capability === capability && item.isDefault)?.id;
    setConfigs((prev) =>
      prev.map((item) => (item.capability === capability ? { ...item, isDefault: item.id === config.id } : item)),
    );
    try {
      await selectEffectiveLLMModel({
        capability,
        providerType: config.providerType,
        modelName: config.modelName,
      });
      void revalidate();
    } catch (error) {
      console.error('Failed to select effective config:', error);
      setConfigs((prev) =>
        prev.map((item) =>
          item.capability === capability ? { ...item, isDefault: item.id === previousDefaultId } : item,
        ),
      );
    }
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
      void revalidate();
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

  function handleModelSourceFilterToggle(source: ModelSourceFilter) {
    setSelectedModelSourceFilter(source);
  }

  return (
    <div className="h-full flex flex-col">
      <header
        className={cn(
          'h-16 px-8 flex items-center justify-between shrink-0 backdrop-blur-md',
          darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle border-b',
        )}
      >
        <div>
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '模型配置' }]} darkMode={darkMode} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              invalidateLLMPageCache();
              void loadPageData();
            }}
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
              darkMode ? 'bg-[#8A7662] text-white hover:bg-[#7B6B5D]' : 'bg-[#7B6B5D] text-white hover:opacity-90',
            )}
          >
            <Plus size={15} />
            配置厂商
          </button>
        </div>
      </header>

      <main className={cn('flex-1 overflow-y-auto', darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base')}>
        <section className="px-8 py-6">
          <div className="space-y-5 min-w-0">
            <EffectiveModelsPanel
              darkMode={darkMode}
              loading={loading && defaultByCapability.size === 0}
              defaultByCapability={defaultByCapability}
              candidatesByCapability={candidatesByCapability}
              onSelect={handleSelectDefault}
            />

            <ConfiguredProvidersPanel
              darkMode={darkMode}
              loading={loading && providerGroups.length === 0}
              groups={filteredProviderGroups}
              sourceFilter={selectedModelSourceFilter}
              sourceCounts={modelSourceCounts}
              onSourceFilterToggle={handleModelSourceFilterToggle}
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
  loading,
  defaultByCapability,
  candidatesByCapability,
  onSelect,
}: {
  darkMode?: boolean;
  loading?: boolean;
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
      if (!target.closest(`[data-model-selector="${openCapability}"]`)) {
        setOpenCapability(null);
      }
    };
    window.addEventListener('mousedown', handleClose);
    return () => {
      window.removeEventListener('mousedown', handleClose);
    };
  }, [openCapability]);

  return (
    <section className={cn(panelClassName(darkMode), 'relative z-10 overflow-visible')}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-inherit">
        <div>
          <h3 className={cn('text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>生效模型</h3>
        </div>
      </div>
      {loading ? (
        <LoadingState darkMode={darkMode} label="加载生效模型..." />
      ) : (
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {EFFECTIVE_MODEL_CAPABILITIES.map((capability) => {
            const current = defaultByCapability.get(capability.value);
            const candidates = candidatesByCapability.get(capability.value) || [];
            const isOpen = openCapability === capability.value;
            const selectedIcon = current
              ? getProviderIcon(current.providerType, current.providerName, current.modelName)
              : '';
            return (
              <div
                key={capability.value}
                className={cn(
                  'relative flex h-full min-h-[146px] flex-col gap-3.5 overflow-visible rounded-2xl border p-4 transition-all duration-300 hover:border-primary',
                  surfaceShadowClassName(darkMode),
                  isOpen && 'z-20',
                  darkMode
                    ? 'border-[#3c3c3c]/60 bg-[#2d2d2d]'
                    : 'border-border-subtle/60 bg-white/50 backdrop-blur-sm',
                )}
                data-capability={capability.value}
              >
                <div className="flex items-start justify-between gap-2">
                  <CapabilityBadge capability={capability.value} compact label={capability.label} />
                  {current ? <SourcePill darkMode={darkMode} preset={current.isSystemPreset} compact /> : null}
                </div>

                <div className="min-w-0 flex-1 flex items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    {current ? (
                      <ProviderIcon iconUrl={selectedIcon} name={current.providerName} darkMode={darkMode} size="sm" />
                    ) : null}
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'text-sm font-bold truncate leading-5',
                          darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
                        )}
                      >
                        {current ? current.modelName : '未设置'}
                      </p>
                      <p
                        className={cn(
                          'text-[11px] mt-0.5 truncate font-mono uppercase tracking-wider',
                          darkMode ? 'text-[#858585]' : 'text-text-main/50',
                        )}
                      >
                        {current ? `${current.providerName}` : '暂无生效模型'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  data-model-selector={capability.value}
                  disabled={candidates.length === 0}
                  onClick={() => setOpenCapability((prev) => (prev === capability.value ? null : capability.value))}
                  className={cn(
                    'group flex h-9 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs outline-none transition-all duration-300 font-medium disabled:cursor-not-allowed disabled:opacity-50',
                    isOpen
                      ? darkMode
                        ? 'bg-[#1e1e1e] border-primary/80 shadow-inner'
                        : 'bg-white border-primary/50 shadow-inner'
                      : darkMode
                        ? 'border-[#3c3c3c] bg-[#252526] text-[#cccccc] hover:border-primary/50 hover:bg-[#2d2d2d]'
                        : 'border-border-subtle bg-white/90 text-text-main/80 hover:border-primary/40 hover:bg-white',
                  )}
                >
                  <span
                    className={
                      current ? 'text-[11px] tracking-wide' : 'text-[11px] text-text-main/50 tracking-wide font-mono'
                    }
                  >
                    {candidates.length === 0 ? '暂无候选模型' : isOpen ? '选择生效模型...' : '点击选择生效模型'}
                  </span>
                  <ChevronDown
                    size={12}
                    className={cn(
                      'shrink-0 text-text-main/60 transition-transform duration-300 group-hover:text-primary',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>

                {isOpen && candidates.length > 0 ? (
                  <div
                    data-model-selector={capability.value}
                    className={cn(
                      'absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-xl border p-1.5 shadow-2xl backdrop-blur-md transition-all duration-300',
                      darkMode ? 'bg-[#252526]/95 border-[#3c3c3c]' : 'bg-white/95 border-border-subtle/75',
                    )}
                  >
                    <div className="max-h-[156px] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                      {candidates.map((config) => {
                        const optionIcon = getProviderIcon(config.providerType, config.providerName, config.modelName);
                        return (
                          <button
                            type="button"
                            key={config.id}
                            onClick={() => {
                              onSelect(capability.value, `${config.id}`);
                              setOpenCapability(null);
                            }}
                            className={cn(
                              'w-full rounded-lg px-2.5 py-2 text-left transition-all duration-200 border border-transparent',
                              darkMode
                                ? 'hover:bg-[#313131] hover:border-[#4a4a4a]'
                                : 'hover:bg-bg-base hover:border-border-subtle/50',
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <ProviderIcon
                                iconUrl={optionIcon}
                                name={config.providerName}
                                darkMode={darkMode}
                                size="sm"
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  className={cn(
                                    'text-xs font-bold truncate',
                                    darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
                                  )}
                                >
                                  {config.modelName}
                                </p>
                              </div>
                              <SourcePill darkMode={darkMode} preset={config.isSystemPreset} compact />
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
      )}
    </section>
  );
}

function ConfiguredProvidersPanel({
  darkMode,
  loading,
  groups,
  sourceFilter,
  sourceCounts,
  onSourceFilterToggle,
  onToggleModel,
  onUpdateProvider,
}: {
  darkMode?: boolean;
  loading: boolean;
  groups: ProviderGroup[];
  sourceFilter: ModelSourceFilter;
  sourceCounts: { preset: number; self: number };
  onSourceFilterToggle: (source: ModelSourceFilter) => void;
  onToggleModel: (group: ProviderGroup, model: ModelGroup) => void;
  onUpdateProvider: (provider: ProviderModelDTO) => void;
}) {
  return (
    <section className={panelClassName(darkMode)}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-inherit">
        <h3 className={cn('text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>模型管理</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSourceFilterToggle('preset')}
            aria-pressed={sourceFilter === 'preset'}
            className={cn(
              'inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-semibold transition-colors',
              sourceFilter === 'preset'
                ? darkMode
                  ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#e0e0e0]'
                  : 'border-border-subtle bg-bg-base text-text-main'
                : darkMode
                  ? 'border-[#3c3c3c] bg-transparent text-[#a8a8a8] hover:bg-[#2d2d2d] hover:text-[#e0e0e0]'
                  : 'border-border-subtle bg-transparent text-text-main/60 hover:bg-gray-100 hover:text-text-main',
            )}
          >
            系统预设
            <span className="ml-1.5 text-[10px] font-bold opacity-70">{sourceCounts.preset}</span>
          </button>
          <button
            type="button"
            onClick={() => onSourceFilterToggle('self')}
            aria-pressed={sourceFilter === 'self'}
            className={cn(
              'inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-semibold transition-colors',
              sourceFilter === 'self'
                ? darkMode
                  ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#e0e0e0]'
                  : 'border-border-subtle bg-bg-base text-text-main'
                : darkMode
                  ? 'border-[#3c3c3c] bg-transparent text-[#a8a8a8] hover:bg-[#2d2d2d] hover:text-[#e0e0e0]'
                  : 'border-border-subtle bg-transparent text-text-main/60 hover:bg-gray-100 hover:text-text-main',
            )}
          >
            自配
            <span className="ml-1.5 text-[10px] font-bold opacity-70">{sourceCounts.self}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState darkMode={darkMode} label="加载模型配置..." />
      ) : groups.length === 0 ? (
        <EmptyConfiguredState darkMode={darkMode} sourceFilter={sourceFilter} />
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
  const [collapsed, setCollapsed] = useState(true);

  return (
    <article
      className={cn(
        'py-3 first:pt-1 last:pb-1',
        darkMode ? 'border-b border-[#3c3c3c]/50' : 'border-b border-border-subtle/60',
      )}
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-2 py-1.5">
        <div className="flex items-center gap-3 min-w-0">
          <ProviderIcon iconUrl={iconUrl} name={group.providerName} darkMode={darkMode} size="sm" />
          <div className="min-w-0">
            <h4
              className={cn('text-sm font-bold truncate tracking-wide', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}
            >
              {group.providerName}
            </h4>
          </div>
        </div>
        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 w-full md:w-auto">
          <div
            className={cn(
              'text-[10px] font-mono uppercase tracking-widest font-semibold',
              darkMode ? 'text-[#858585]' : 'text-text-main/50',
            )}
          >
            <span>
              {group.models.length} MODELS
              {selfCount > 0 ? ` · ${selfCount} SELF` : ''}
              {presetCount > 0 ? ` · ${presetCount} PRESET` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
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
                'inline-flex h-8 items-center justify-center rounded-xl border px-3 text-[11px] font-bold transition-all duration-300',
                darkMode
                  ? 'border-[#3c3c3c] bg-[#313131]/80 text-[#e0e0e0] hover:bg-[#3a3a3a] hover:border-[#4a4a4a]'
                  : 'border-border-subtle bg-white text-text-main hover:bg-gray-50 hover:border-primary/30',
              )}
              title="更新密钥"
              aria-label="更新密钥"
            >
              更新密钥
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className={cn(
                'inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border px-3 text-[11px] font-bold transition-all duration-300',
                darkMode
                  ? 'border-[#3c3c3c] bg-[#202020] text-[#d0d0d0] hover:bg-[#2a2a2a] hover:text-[#f0f0f0]'
                  : 'border-border-subtle bg-bg-base text-text-main/80 hover:bg-gray-100 hover:text-text-main hover:border-primary/20',
              )}
              title={collapsed ? '展开' : '收起'}
              aria-label={collapsed ? '展开' : '收起'}
            >
              <ChevronDown size={12} className={cn('transition-transform duration-300', !collapsed && 'rotate-180')} />
              {collapsed ? '展开' : '收起'}
            </button>
          </div>
        </div>
      </header>

      {!collapsed ? (
        <div
          className={cn(
            'mt-2 pl-5 md:pl-8 space-y-1.5 border-l ml-6 md:ml-7',
            darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle/50',
          )}
        >
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
    <section className="py-2.5 px-3 rounded-xl hover:bg-primary/3 transition-colors duration-300">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn('text-sm font-bold tracking-wide', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
              {model.modelName}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              {model.selfConfigs.length > 0 ? <SourcePill darkMode={darkMode} preset={false} compact /> : null}
              {model.presetConfigs.length > 0 ? <SourcePill darkMode={darkMode} preset compact /> : null}
            </div>
          </div>
          <p
            className={cn(
              'text-[10px] font-mono uppercase tracking-wider',
              darkMode ? 'text-[#858585]' : 'text-text-main/50',
            )}
          >
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <section
        className={cn(
          'relative flex h-[min(760px,calc(100vh-64px))] w-full max-w-[880px] flex-col overflow-hidden rounded-2xl shadow-2xl border',
          darkMode ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white/95 border border-white/90',
        )}
      >
        <header className={cn('px-6 py-5 border-b', darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle')}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className={cn('text-lg font-bold tracking-wide', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                配置厂商
              </h3>
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
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4F7FA8]" />
            <input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索厂商、模型或能力"
              className={cn(
                'h-10 w-full rounded-xl border pl-9 pr-3 text-sm outline-none transition-all duration-300',
                darkMode
                  ? 'border-[#3c3c3c] bg-[#1e1e1e] text-[#e0e0e0] placeholder:text-[#6b6b6b] placeholder:tracking-wider focus:border-primary/50'
                  : 'border-border-subtle bg-bg-base/50 text-text-main placeholder:text-text-main/35 placeholder:tracking-wider focus:border-primary/50 focus:bg-white',
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
                    'rounded-full border px-3 py-1 text-xs font-bold transition-all duration-300',
                    active
                      ? darkMode
                        ? 'border-primary bg-primary/12 text-primary'
                        : 'border-primary bg-primary/12 text-primary'
                      : darkMode
                        ? 'border-[#3c3c3c] bg-[#1f1f1f] text-[#b4b4b4] hover:border-[#4a4a4a]'
                        : 'border-border-subtle bg-white/80 text-text-main/70 hover:border-primary/35',
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
            <div className="grid min-h-[260px] auto-rows-max content-start items-start gap-2.5 p-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3">
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
  const capabilitySet = new Set(provider.models.flatMap(getModelCapabilityValues));
  const sortedCapabilities = Array.from(capabilitySet).sort(capabilitySort);

  return (
    <button
      type="button"
      onClick={onSetup}
      className={cn(
        'group h-fit w-full rounded-xl border p-3.5 text-left transition-all duration-300',
        surfaceShadowClassName(darkMode),
        darkMode
          ? 'border-[#3c3c3c] bg-[#1e1e1e] hover:border-primary/50 hover:bg-[#232323]'
          : 'border-border-subtle bg-bg-base/55 hover:border-primary/35 hover:bg-white',
      )}
    >
      <div className="flex min-h-8 items-center gap-2.5">
        <ProviderIcon iconUrl={iconUrl} name={provider.providerName} darkMode={darkMode} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className={cn('text-sm font-bold truncate tracking-wide', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}
            >
              {provider.providerName}
            </h4>
            {configured && <CountPill darkMode={darkMode} label="已配置" />}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p
          className={cn(
            'truncate text-xs leading-relaxed font-mono uppercase tracking-wider',
            darkMode ? 'text-[#a6a6a6]' : 'text-text-main/60',
          )}
        >
          {sortedCapabilities.map((capability, index) => (
            <span key={capability}>
              {index > 0 ? ' · ' : ''}
              {getCapabilityMeta(capability).label}
            </span>
          ))}
          <span className="whitespace-nowrap"> · {provider.models.length} MODELS</span>
        </p>
        <span
          className={cn(
            'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all duration-300',
            darkMode
              ? 'bg-[#8A7662] text-white group-hover:bg-[#7B6B5D]'
              : 'bg-[#7B6B5D] text-white group-hover:opacity-90',
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative w-full max-w-[520px] rounded-2xl shadow-2xl overflow-hidden border',
          darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/94 border border-white/90',
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
              <h3
                className={cn(
                  'text-lg font-bold truncate tracking-wide',
                  darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
                )}
              >
                {target.provider.providerName}
              </h3>
              <div
                className={cn(
                  'mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs',
                  darkMode ? 'text-[#858585]' : 'text-text-main/45',
                )}
              >
                <span className="truncate">{target.provider.providerType}</span>
                <span
                  className={cn(
                    'text-[11px] font-medium font-mono uppercase tracking-wider',
                    darkMode ? 'text-[#bdbdbd]' : 'text-text-main/60',
                  )}
                >
                  {target.mode === 'update' ? '更新厂商 // UPDATE' : '配置厂商 // CONFIG'}
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
            placeholder="输入 API KEY"
            className={cn(
              'h-11 w-full rounded-xl border px-3 text-sm outline-none transition-all duration-300',
              darkMode
                ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#e0e0e0] placeholder:text-[#6b6b6b] placeholder:tracking-wider focus:border-primary/50'
                : 'border-border-subtle bg-white/80 text-text-main placeholder:text-text-main/35 placeholder:tracking-wider focus:border-primary/50',
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
              'h-9 px-4 rounded-xl text-xs font-bold transition-colors',
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
              'h-9 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60',
              darkMode ? 'bg-[#8A7662] text-white hover:bg-[#7B6B5D]' : 'bg-[#7B6B5D] text-white hover:opacity-90',
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

function EmptyConfiguredState({ darkMode, sourceFilter }: { darkMode?: boolean; sourceFilter: ModelSourceFilter }) {
  const title = sourceFilter === 'preset' ? '暂无系统预设模型' : '暂无自配模型';

  return (
    <div className={cn('text-center py-16', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
      <Key size={38} className={cn('mx-auto mb-4', darkMode ? 'text-[#6b6b6b]' : 'text-text-main/20')} />
      <p className={cn('text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>{title}</p>
      <p className="mt-1 text-xs">切换上方按钮查看另一类模型。</p>
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
  if (disabled) {
    return (
      <span
        className={cn(
          'inline-flex h-6 items-center justify-center rounded-full border border-dashed px-2.5 text-[10px] font-bold font-mono tracking-wide',
          darkMode
            ? 'border-[#3c3c3c] bg-[#1e1e1e]/50 text-[#6b6b6b]'
            : 'border-border-subtle/60 bg-bg-base/30 text-text-main/35',
        )}
      >
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative inline-flex h-6 w-[88px] items-center justify-center rounded-full border text-[10px] font-bold font-mono tracking-wide transition-all duration-300 outline-none cursor-pointer',
        checked
          ? darkMode
            ? 'border-[#6d9b7c]/40 bg-[#6d9b7c]/10 text-[#6d9b7c] hover:bg-[#6d9b7c]/20 hover:border-[#6d9b7c]/60'
            : 'border-[#6d9b7c]/35 bg-[#6d9b7c]/8 text-[#548062] hover:bg-[#6d9b7c]/15 hover:border-[#6d9b7c]/50'
          : darkMode
            ? 'border-[#3c3c3c] bg-[#1e1e1e] text-[#858585] hover:bg-[#252526] hover:border-[#4a4a4a]'
            : 'border-border-subtle bg-bg-base/40 text-text-main/60 hover:bg-bg-base hover:border-border-subtle/80',
      )}
    >
      <span className="inline-block group-hover:hidden transition-all duration-200">{label}</span>
      <span className="hidden group-hover:inline-block transition-all duration-200 text-[10px]">
        {checked ? '点击停用' : '点击启用'}
      </span>
    </button>
  );
}

const INSET_PROVIDER_ICON_KEYS = ['mimo', 'xiaomi', 'xiaomimimo', 'xai', 'jina'];

function shouldInsetProviderIcon(name: string, iconUrl: string) {
  const token = normalizeProviderToken(`${name} ${iconUrl}`);
  return INSET_PROVIDER_ICON_KEYS.some((key) => token.includes(key));
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
  const className =
    size === 'sm' ? 'h-7 w-7 min-h-7 min-w-7 max-h-7 max-w-7' : 'h-9 w-9 min-h-9 min-w-9 max-h-9 max-w-9';
  const iconIsMonochrome = isProviderIconMonochrome(iconUrl);
  const iconInsetClass = shouldInsetProviderIcon(name, iconUrl) ? (size === 'sm' ? 'p-1' : 'p-1.5') : 'p-0';

  if (iconUrl) {
    return (
      <div
        className={cn(
          className,
          'shrink-0 overflow-hidden rounded-xl border-0 bg-transparent transition-colors duration-300',
        )}
      >
        <img
          src={iconUrl}
          alt={name}
          className={cn('block h-full w-full object-contain', iconInsetClass, darkMode && iconIsMonochrome && 'invert')}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        className,
        'flex shrink-0 items-center justify-center rounded-xl border-0 bg-transparent transition-colors duration-300',
      )}
    >
      <Box size={16} className={darkMode ? 'text-[#d4d4d4]' : 'text-[#1f1f1f]'} />
    </div>
  );
}

function CapabilityBadge({
  capability,
  compact,
  label,
}: {
  capability: LLMCapabilityValue;
  compact?: boolean;
  label?: string;
}) {
  const meta = getCapabilityMeta(capability);

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-bold tracking-wide rounded-md transition-colors',
        compact
          ? 'text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary'
          : 'text-[11px] px-2.5 py-1 bg-primary/10 text-primary',
      )}
    >
      {label ?? meta.label}
    </span>
  );
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
    'rounded-2xl border backdrop-blur-sm transition-all duration-300',
    surfaceShadowClassName(darkMode),
    darkMode ? 'bg-[#2d2d2d] border-[#3c3c3c]' : 'bg-white/50 border-border-subtle',
  );
}

function surfaceShadowClassName(darkMode?: boolean) {
  return darkMode ? 'shadow-[0_10px_28px_rgba(0,0,0,0.18)]' : 'shadow-sm';
}
