import { Fragment, useEffect, useMemo, useState } from 'react';
import { Box, ChevronDown, Key, Plus, RefreshCw, Search, X } from 'lucide-react';
import chatIconUrl from '@/assets/icons/color/chat.svg';
import denseIconUrl from '@/assets/icons/color/dense.svg';
import rerankIconUrl from '@/assets/icons/color/rerank.svg';
import sparseIconUrl from '@/assets/icons/color/sparse.svg';
import speechIconUrl from '@/assets/icons/color/speech.svg';
import visionIconUrl from '@/assets/icons/color/vision.svg';
import { Breadcrumb } from '@/components/Breadcrumb';
import { getProviderIcon, normalizeProviderToken } from '@/lib/provider-icons';
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
  iconUrl?: string;
}

const CAPABILITIES: Array<CapabilityMeta & { value: LLMCapability }> = [
  { value: 'CHAT', label: '对话', hint: '对话', iconUrl: chatIconUrl },
  { value: 'VISION', label: '视觉', hint: '视觉', iconUrl: visionIconUrl },
  { value: 'ASR', label: '语音识别', hint: '语音识别', iconUrl: speechIconUrl },
  { value: 'RERANK', label: '重排', hint: '重排', iconUrl: rerankIconUrl },
  { value: 'EMBEDDING', label: '稠密向量', hint: '稠密向量', iconUrl: denseIconUrl },
  { value: 'SPARSE_EMBEDDING', label: '稀疏向量', hint: '稀疏向量', iconUrl: sparseIconUrl },
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
  return [model.modelName];
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
    <div className="h-full flex flex-col bg-canvas">
      <header className="h-16 px-8 flex items-center justify-between shrink-0 border-b border-border-subtle">
        <div>
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '模型配置' }]} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              invalidateLLMPageCache();
              void loadPageData();
            }}
            className="h-9 rounded-md border border-border-subtle bg-surface-soft px-3 text-xs font-bold inline-flex items-center gap-2 text-text-secondary transition-colors hover:border-primary/30 hover:bg-surface-card hover:text-ink"
            title="刷新"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
          <button
            type="button"
            onClick={() => setProviderPickerOpen(true)}
            className="h-9 w-fit rounded-lg bg-primary px-4 text-xs font-bold inline-flex items-center gap-2 text-white transition-colors hover:bg-primary-active"
          >
            <Plus size={15} />
            配置厂商
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-canvas">
        <section className="px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-6">
          <div className="space-y-5 min-w-0">
            <EffectiveModelsPanel
              loading={loading && defaultByCapability.size === 0}
              defaultByCapability={defaultByCapability}
              candidatesByCapability={candidatesByCapability}
              onSelect={handleSelectDefault}
            />

            <ConfiguredProvidersPanel
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
          providers={filteredProviders}
          configuredProviderTypes={configuredProviderTypes}
          loading={loading && providers.length === 0}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedCapabilityFilters={selectedCapabilityFilters}
          onCapabilityFilterChange={setSelectedCapabilityFilters}
          onClose={() => setProviderPickerOpen(false)}
          onSetup={(provider, mode) => {
            setSetupTarget({ provider, mode });
          }}
        />
      )}

      {setupTarget && (
        <SetupProviderModal
          target={setupTarget}
          onClose={() => {
            setSetupTarget(null);
          }}
          onSubmit={handleSetupProvider}
        />
      )}
    </div>
  );
}

function EffectiveModelsPanel({
  loading,
  defaultByCapability,
  candidatesByCapability,
  onSelect,
}: {
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
    <section className="relative z-10 overflow-visible">
      <div className="flex items-center justify-between gap-3 px-1 pb-2">
        <h3 className="text-base font-bold text-ink">生效模型</h3>
      </div>
      {loading ? (
        <LoadingState label="加载生效模型..." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                  'relative flex h-full min-h-[132px] flex-col gap-4 overflow-visible rounded-md border border-border-subtle bg-bg-card-solid p-3 outline-none transition-[background-color,border-color] duration-200',
                  candidates.length > 0
                    ? 'cursor-pointer hover:border-primary/35 hover:bg-ink/[0.025] focus-visible:border-primary/50 focus-visible:bg-ink/[0.035]'
                    : 'cursor-default opacity-70',
                  isOpen && 'z-20 border-primary/45 bg-primary/5',
                )}
                data-capability={capability.value}
                data-model-selector={capability.value}
                role={candidates.length > 0 ? 'button' : undefined}
                tabIndex={candidates.length > 0 ? 0 : undefined}
                onClick={() => {
                  if (candidates.length === 0) return;
                  setOpenCapability((prev) => (prev === capability.value ? null : capability.value));
                }}
                onKeyDown={(event) => {
                  if (candidates.length === 0 || (event.key !== 'Enter' && event.key !== ' ')) return;
                  event.preventDefault();
                  setOpenCapability((prev) => (prev === capability.value ? null : capability.value));
                }}
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {capability.iconUrl ? (
                      <img
                        src={capability.iconUrl}
                        alt=""
                        aria-hidden="true"
                        className="h-6 w-6 shrink-0 object-contain"
                      />
                    ) : null}
                    <span className="truncate text-xs font-bold text-text-secondary">{capability.label}</span>
                  </div>
                  {current ? <SourcePill preset={current.isSystemPreset} compact quiet /> : null}
                </div>

                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProviderIcon iconUrl={selectedIcon} name={current?.providerName || capability.label} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold leading-5 text-ink">
                        {current ? current.modelName : '未设置'}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-wider text-muted">
                        {current ? current.providerName : '暂无生效模型'}
                      </p>
                    </div>
                  </div>
                </div>

                {isOpen && candidates.length > 0 ? (
                  <div
                    data-model-selector={capability.value}
                    onClick={(event) => event.stopPropagation()}
                    className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-xl border border-hairline bg-bg-card-solid p-1.5 (--)] transition-all duration-300"
                  >
                    <div className="max-h-[156px] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                      {candidates.map((config) => {
                        const optionIcon = getProviderIcon(config.providerType, config.providerName, config.modelName);
                        return (
                          <button
                            type="button"
                            key={config.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelect(capability.value, `${config.id}`);
                              setOpenCapability(null);
                            }}
                            className="w-full rounded-lg px-2.5 py-2 text-left transition-all duration-200 border border-transparent hover:bg-surface-soft hover:border-hairline"
                          >
                            <div className="flex items-center gap-2.5">
                              <ProviderIcon iconUrl={optionIcon} name={config.providerName} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold truncate text-ink">{config.modelName}</p>
                              </div>
                              <SourcePill preset={config.isSystemPreset} compact />
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
  loading,
  groups,
  sourceFilter,
  sourceCounts,
  onSourceFilterToggle,
  onToggleModel,
  onUpdateProvider,
}: {
  loading: boolean;
  groups: ProviderGroup[];
  sourceFilter: ModelSourceFilter;
  sourceCounts: { preset: number; self: number };
  onSourceFilterToggle: (source: ModelSourceFilter) => void;
  onToggleModel: (group: ProviderGroup, model: ModelGroup) => void;
  onUpdateProvider: (provider: ProviderModelDTO) => void;
}) {
  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between gap-3 px-1 pb-2">
        <h3 className="text-base font-bold text-ink">模型管理</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSourceFilterToggle('preset')}
            aria-pressed={sourceFilter === 'preset'}
            className={cn(
              'inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-semibold transition-colors',
              sourceFilter === 'preset'
                ? 'border-primary/40 bg-primary/10 text-ink'
                : 'border-hairline bg-transparent text-text-secondary hover:border-primary/30 hover:text-ink',
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
                ? 'border-primary/40 bg-primary/10 text-ink'
                : 'border-hairline bg-transparent text-text-secondary hover:border-primary/30 hover:text-ink',
            )}
          >
            自配
            <span className="ml-1.5 text-[10px] font-bold opacity-70">{sourceCounts.self}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState label="加载模型配置..." />
      ) : groups.length === 0 ? (
        <EmptyConfiguredState sourceFilter={sourceFilter} />
      ) : (
        <div className="overflow-hidden rounded-md border border-border-subtle bg-bg-card-solid">
          {groups.map((group) => (
            <Fragment key={group.providerType}>
              <ProviderConfigCard group={group} onToggleModel={onToggleModel} onUpdateProvider={onUpdateProvider} />
            </Fragment>
          ))}
        </div>
      )}
    </section>
  );
}

function ProviderConfigCard({
  group,
  onToggleModel,
  onUpdateProvider,
}: {
  group: ProviderGroup;
  onToggleModel: (group: ProviderGroup, model: ModelGroup) => void;
  onUpdateProvider: (provider: ProviderModelDTO) => void;
}) {
  const iconUrl = getProviderIcon(group.providerType, group.providerName);
  const selfCount = group.configs.filter((config) => !config.isSystemPreset).length;
  const presetCount = group.configs.length - selfCount;
  const [collapsed, setCollapsed] = useState(true);

  return (
    <article className="border-b border-border-subtle px-3 py-3 last:border-b-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-2 py-1.5">
        <div className="flex items-center gap-3 min-w-0">
          <ProviderIcon iconUrl={iconUrl} name={group.providerName} size="sm" />
          <div className="min-w-0">
            <h4 className="text-sm font-bold truncate tracking-wide text-ink">{group.providerName}</h4>
          </div>
        </div>
        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 w-full md:w-auto">
          <div className="text-[10px] font-mono uppercase tracking-widest font-semibold text-muted">
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
              className="inline-flex h-8 items-center justify-center rounded-md border border-border-subtle bg-surface-soft px-3 text-[11px] font-bold text-text-secondary transition-all duration-300 hover:border-primary/30 hover:bg-surface-card hover:text-ink"
              title="更新密钥"
              aria-label="更新密钥"
            >
              更新密钥
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border-subtle bg-surface-soft px-3 text-[11px] font-bold text-text-secondary transition-all duration-300 hover:border-primary/30 hover:bg-surface-card hover:text-ink"
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
        <div className="mt-2 pl-5 md:pl-8 space-y-1.5 border-l border-border-subtle ml-6 md:ml-7">
          {group.models.map((model) => (
            <Fragment key={model.modelName}>
              <ModelConfigBlock group={group} model={model} onToggleModel={onToggleModel} />
            </Fragment>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ModelConfigBlock({
  group,
  model,
  onToggleModel,
}: {
  group: ProviderGroup;
  model: ModelGroup;
  onToggleModel: (group: ProviderGroup, model: ModelGroup) => void;
}) {
  const capabilityText = model.configs.map((config) => getCapabilityMeta(config.capability).label).join(' · ');

  return (
    <section className="py-2.5 px-3 rounded-xl hover:bg-primary/5 transition-colors duration-300">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold tracking-wide text-ink">{model.modelName}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              {model.selfConfigs.length > 0 ? <SourcePill preset={false} compact /> : null}
              {model.presetConfigs.length > 0 ? <SourcePill preset compact /> : null}
            </div>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted">{capabilityText}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StateSwitch
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <section className="relative flex h-[min(760px,calc(100vh-64px))] w-full max-w-[min(100vw-2rem,880px)] flex-col overflow-hidden rounded-xl border border-hairline bg-bg-card-solid (--)]">
        <header className="px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold tracking-wide text-ink">配置厂商</h3>
              <p className="text-xs mt-1 text-muted">选择一个厂商后填写厂商级 API Key。</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-muted transition-colors hover:bg-ink/[0.035] hover:text-ink"
              title="关闭"
            >
              <X size={18} />
            </button>
          </div>
          <div className="relative mt-5">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索厂商、模型或能力"
              className="h-10 w-full rounded-md border border-border-subtle bg-transparent pl-9 pr-3 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-muted-soft placeholder:tracking-wider focus:border-primary/40"
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
                    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold transition-colors duration-200',
                    active
                      ? 'border-primary/40 bg-transparent text-ink'
                      : 'border-transparent bg-transparent text-text-secondary hover:bg-ink/[0.035] hover:text-ink',
                  )}
                >
                  {capability.iconUrl ? (
                    <img src={capability.iconUrl} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
                  ) : null}
                  {capability.label}
                </button>
              );
            })}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <LoadingState label="加载厂商目录..." />
          ) : providers.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted">没有匹配的厂商</div>
          ) : (
            <div className="grid min-h-[260px] auto-rows-max content-start items-start gap-2.5 px-4 pb-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3">
              {providers.map((provider) => {
                const configured = configuredProviderTypes.has(provider.providerType);
                return (
                  <Fragment key={provider.providerType}>
                    <AvailableProviderCard
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
  provider,
  configured,
  onSetup,
}: {
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
      className="group h-fit w-full rounded-md border border-border-subtle bg-transparent p-3.5 text-left transition-[background-color,border-color] duration-200 hover:border-primary/35 hover:bg-ink/[0.025]"
    >
      <div className="flex min-h-8 items-center gap-2.5">
        <ProviderIcon iconUrl={iconUrl} name={provider.providerName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold truncate tracking-wide text-ink">{provider.providerName}</h4>
            {configured && <CountPill label="已配置" />}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="truncate text-xs leading-relaxed font-mono uppercase tracking-wider text-muted">
          {sortedCapabilities.map((capability, index) => (
            <span key={capability}>
              {index > 0 ? ' · ' : ''}
              {getCapabilityMeta(capability).label}
            </span>
          ))}
          <span className="whitespace-nowrap"> · {provider.models.length} MODELS</span>
        </p>
        <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-bold text-white transition-colors duration-200 group-hover:bg-primary-active">
          <Plus size={13} />
          {configured ? '更新' : '配置'}
        </span>
      </div>
    </button>
  );
}

function SetupProviderModal({
  target,
  onClose,
  onSubmit,
}: {
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-[min(100vw-2rem,520px)] overflow-hidden rounded-xl border border-hairline bg-bg-card-solid (--)]">
        <header className="flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-3 min-w-0">
            <ProviderIcon iconUrl={iconUrl} name={target.provider.providerName} size="md" />
            <div className="min-w-0">
              <h3 className="text-lg font-bold truncate tracking-wide text-ink">{target.provider.providerName}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <span className="truncate">{target.provider.providerType}</span>
                <span className="text-[11px] font-medium font-mono uppercase tracking-wider text-text-secondary">
                  {target.mode === 'update' ? '更新厂商 // UPDATE' : '配置厂商 // CONFIG'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-muted transition-colors hover:bg-ink/[0.035] hover:text-ink"
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
            className="h-11 w-full rounded-md border border-border-subtle bg-transparent px-3 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-muted-soft placeholder:tracking-wider focus:border-primary/40"
          />

          {validationError && <div className="px-1 text-xs font-bold text-error">{validationError}</div>}
        </div>

        <footer className="flex items-center justify-end gap-3 px-6 pb-5 pt-2">
          <button
            onClick={onClose}
            className="h-9 rounded-md px-4 text-xs font-bold text-text-secondary transition-colors hover:bg-ink/[0.035] hover:text-ink"
            disabled={submitting}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-white transition-colors duration-200 hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <RefreshCw size={13} className="animate-spin" />}
            保存
          </button>
        </footer>
      </div>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-muted">
      <RefreshCw size={18} className="animate-spin mr-2" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function EmptyConfiguredState({ sourceFilter }: { sourceFilter: ModelSourceFilter }) {
  const title = sourceFilter === 'preset' ? '暂无系统预设模型' : '暂无自配模型';

  return (
    <div className="text-center py-16 text-muted">
      <Key size={38} className="mx-auto mb-4 text-muted-soft" />
      <p className="text-sm font-bold text-ink">{title}</p>
      <p className="mt-1 text-xs">切换上方按钮查看另一类模型。</p>
    </div>
  );
}

function StateSwitch({
  checked,
  label,
  disabled,
  onClick,
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-6 items-center justify-center rounded-full border border-dashed border-hairline bg-surface-soft px-2.5 text-[10px] font-bold font-mono tracking-wide text-muted-soft">
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
          ? 'border-success/35 bg-success/10 text-success hover:bg-success/15 hover:border-success/50'
          : 'border-hairline bg-surface-soft text-muted hover:bg-surface-card hover:border-hairline',
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

function ProviderIcon({ iconUrl, name, size }: { iconUrl: string; name: string; size: 'sm' | 'md' }) {
  const className =
    size === 'sm' ? 'h-7 w-7 min-h-7 min-w-7 max-h-7 max-w-7' : 'h-9 w-9 min-h-9 min-w-9 max-h-9 max-w-9';
  const iconInsetClass = shouldInsetProviderIcon(name, iconUrl) ? (size === 'sm' ? 'p-1' : 'p-1.5') : 'p-0';

  if (iconUrl) {
    return (
      <div
        className={cn(
          className,
          'shrink-0 overflow-hidden rounded-xl border-0 bg-transparent transition-colors duration-300',
        )}
      >
        <img src={iconUrl} alt={name} className={cn('block h-full w-full object-contain', iconInsetClass)} />
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
      <Box size={16} className="text-ink" />
    </div>
  );
}

function CountPill({ label }: { label: string }) {
  return <span className="inline-flex items-center text-[10px] font-bold text-muted">{label}</span>;
}

function SourcePill({ preset, compact, quiet }: { preset: boolean; compact?: boolean; quiet?: boolean }) {
  return (
    <span
      className={cn(
        compact ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-[10px]',
        'w-fit rounded-md inline-flex items-center justify-center font-bold',
        quiet ? 'bg-transparent text-muted' : preset ? 'bg-primary/10 text-primary' : 'bg-surface-soft text-muted',
      )}
    >
      {preset ? '系统预设' : '自配'}
    </span>
  );
}
