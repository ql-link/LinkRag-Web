import { Fragment, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Box, Key, Plus, RefreshCw, Search, X } from 'lucide-react';
import chatIconUrl from '@/assets/icons/color/chat.svg';
import denseIconUrl from '@/assets/icons/color/dense.svg';
import rerankIconUrl from '@/assets/icons/color/rerank.svg';
import sparseIconUrl from '@/assets/icons/color/sparse.svg';
import speechIconUrl from '@/assets/icons/color/speech.svg';
import visionIconUrl from '@/assets/icons/color/vision.svg';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useTheme } from '@/contexts/ThemeContext';
import { getModelDisplayName } from '@/lib/model-display';
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
  [-1, ['linkrag']],
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
  displayName?: string | null;
  configs: ConfigView[];
  editableConfigs: ConfigView[];
  readonlyConfigs: ConfigView[];
  isEditableActive: boolean;
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

const LINKRAG_PROVIDER_TYPE = 'linkrag';

function isLinkRagProvider(providerType: string) {
  return normalizeProviderToken(providerType) === LINKRAG_PROVIDER_TYPE;
}

function isConfigEditable(config: LLMConfigDTO) {
  return config.isEditable !== false && !isLinkRagProvider(config.providerType);
}

function compareConfigOptions(a: ConfigView, b: ConfigView) {
  const aReadonly = !isConfigEditable(a);
  const bReadonly = !isConfigEditable(b);
  if (aReadonly !== bReadonly) {
    return aReadonly ? -1 : 1;
  }
  if (a.isDefault !== b.isDefault) {
    return a.isDefault ? -1 : 1;
  }
  return `${a.providerName}${getModelDisplayName(a)}`.localeCompare(`${b.providerName}${getModelDisplayName(b)}`);
}

function getConfigProviderIcon(config: ConfigView | null | undefined, darkMode: boolean) {
  if (!config) return '';
  const isSystemConfiguredModel = config.isSystemPreset || config.isEditable === false;
  return getProviderIcon(
    isSystemConfiguredModel ? 'linkrag' : config.providerType,
    isSystemConfiguredModel ? 'LinkRag' : config.providerName,
    config.modelName,
    { darkMode },
  );
}

function getProviderGroupIcon(group: ProviderGroup, darkMode: boolean) {
  const hasSystemConfiguredModel = group.configs.some((config) => config.isSystemPreset || config.isEditable === false);
  return getProviderIcon(
    hasSystemConfiguredModel ? 'linkrag' : group.providerType,
    hasSystemConfiguredModel ? 'LinkRag' : group.providerName,
    undefined,
    { darkMode },
  );
}

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

function modelCapabilitySortRank(model: ModelGroup) {
  return model.configs.reduce((rank, config) => {
    const index = CAPABILITIES.findIndex((item) => item.value === config.capability);
    return Math.min(rank, index === -1 ? Number.MAX_SAFE_INTEGER : index);
  }, Number.MAX_SAFE_INTEGER);
}

function getCapabilityValue(capability: ModelCapabilityDTO['capabilities'][number]): LLMCapabilityValue {
  return typeof capability === 'string' ? capability : capability.capability;
}

function getModelCapabilityValues(model: ModelCapabilityDTO) {
  return model.capabilities.map(getCapabilityValue);
}

function getModelSearchTokens(model: ModelCapabilityDTO) {
  return [model.modelName, model.displayName || ''];
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
      providerName:
        providerNameByType.get(config.providerType) ||
        (isLinkRagProvider(config.providerType) ? 'LinkRag' : config.providerType),
    }));
  }, [configs, providerNameByType]);

  const configuredProviderTypes = useMemo(() => {
    return new Set(viewConfigs.filter(isConfigEditable).map((config) => config.providerType));
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
      items.sort(compareConfigOptions);
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
            const editableConfigs = sortedConfigs.filter(isConfigEditable);
            return {
              modelName,
              displayName: sortedConfigs.find((config) => config.displayName?.trim())?.displayName ?? null,
              configs: sortedConfigs,
              editableConfigs,
              readonlyConfigs: sortedConfigs.filter((config) => !isConfigEditable(config)),
              isEditableActive: editableConfigs.some((config) => config.isActive),
            };
          })
          .sort((a, b) => {
            const rankDiff = modelCapabilitySortRank(a) - modelCapabilitySortRank(b);
            if (rankDiff !== 0) {
              return rankDiff;
            }
            return getModelDisplayName(a).localeCompare(getModelDisplayName(b));
          });

        return {
          providerType,
          providerName: items[0]?.providerName || providerType,
          configs: items,
          models,
        };
      })
      .sort((a, b) => {
        const aHasReadonlyConfig = a.configs.some((config) => !isConfigEditable(config));
        const bHasReadonlyConfig = b.configs.some((config) => !isConfigEditable(config));
        if (aHasReadonlyConfig !== bHasReadonlyConfig) {
          return aHasReadonlyConfig ? -1 : 1;
        }
        return compareProviders(a, b);
      });
  }, [viewConfigs]);

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

  async function handleToggleConfig(config: ConfigView) {
    if (!isConfigEditable(config) || !isSupportedCapability(config.capability)) {
      return;
    }
    const nextActive = !config.isActive;
    setConfigs((prev) => prev.map((item) => (item.id === config.id ? { ...item, isActive: nextActive } : item)));
    try {
      await toggleLLMModel({
        providerType: config.providerType,
        modelName: config.modelName,
        capability: config.capability,
        enabled: nextActive,
      });
      void revalidate();
    } catch (error) {
      console.error('Failed to toggle model:', error);
      setConfigs((prev) => prev.map((item) => (item.id === config.id ? { ...item, isActive: config.isActive } : item)));
    }
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
              darkMode={darkMode}
              onSelect={handleSelectDefault}
            />

            <ConfiguredProvidersPanel
              loading={loading && providerGroups.length === 0}
              groups={providerGroups}
              darkMode={darkMode}
              onToggleConfig={handleToggleConfig}
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
  darkMode,
  onSelect,
}: {
  loading?: boolean;
  defaultByCapability: Map<LLMCapability, ConfigView>;
  candidatesByCapability: Map<LLMCapability, ConfigView[]>;
  darkMode: boolean;
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
            const selectedIcon = getConfigProviderIcon(current, darkMode);
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
                  {current ? <ConfigAccessPill config={current} compact quiet /> : null}
                </div>

                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProviderIcon iconUrl={selectedIcon} name={current?.providerName || capability.label} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold leading-5 text-ink">
                        {current ? getModelDisplayName(current) : '未设置'}
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
                        const optionIcon = getConfigProviderIcon(config, darkMode);
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
                                <p className="text-xs font-bold truncate text-ink">{getModelDisplayName(config)}</p>
                              </div>
                              <ConfigAccessPill config={config} compact />
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
  darkMode,
  onToggleConfig,
  onUpdateProvider,
}: {
  loading: boolean;
  groups: ProviderGroup[];
  darkMode: boolean;
  onToggleConfig: (config: ConfigView) => void;
  onUpdateProvider: (provider: ProviderModelDTO) => void;
}) {
  const modelCount = groups.reduce((total, group) => total + group.models.length, 0);
  const configCount = groups.reduce((total, group) => total + group.configs.length, 0);

  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between gap-3 px-1 pb-2">
        <h3 className="text-base font-bold text-ink">模型管理</h3>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-muted">
          <span>{groups.length} 厂商</span>
          <span>{modelCount} 模型</span>
          <span>{configCount} 配置</span>
        </div>
      </div>

      {loading ? (
        <LoadingState label="加载模型配置..." />
      ) : groups.length === 0 ? (
        <EmptyConfiguredState />
      ) : (
        <div className="overflow-hidden rounded-md border border-border-subtle bg-bg-card-solid">
          {groups.map((group) => (
            <Fragment key={group.providerType}>
              <ProviderConfigCard
                group={group}
                darkMode={darkMode}
                onToggleConfig={onToggleConfig}
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
  group,
  darkMode,
  onToggleConfig,
  onUpdateProvider,
}: {
  group: ProviderGroup;
  darkMode: boolean;
  onToggleConfig: (config: ConfigView) => void;
  onUpdateProvider: (provider: ProviderModelDTO) => void;
}) {
  const iconUrl = getProviderGroupIcon(group, darkMode);
  const editableCount = group.configs.filter(isConfigEditable).length;
  const canUpdateProvider = editableCount > 0;
  const [collapsed, setCollapsed] = useState(true);

  function toggleCollapsed() {
    setCollapsed((prev) => !prev);
  }

  function handleHeaderKeyDown(event: KeyboardEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    toggleCollapsed();
  }

  return (
    <article className="border-b border-border-subtle px-3 py-3 transition-colors duration-200 last:border-b-0">
      <header
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onClick={toggleCollapsed}
        onKeyDown={handleHeaderKeyDown}
        className={cn(
          '-mx-3 -mt-3 flex cursor-pointer flex-col justify-between gap-3 px-5 py-4 outline-none transition-colors duration-200 hover:bg-ink/[0.028] focus-visible:bg-ink/[0.035] md:flex-row md:items-center',
          collapsed && '-mb-3',
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <ProviderIcon iconUrl={iconUrl} name={group.providerName} size="sm" />
          <div className="min-w-0">
            <h4 className="text-sm font-bold truncate tracking-wide text-ink">{group.providerName}</h4>
            <p className="mt-0.5 text-[11px] font-medium text-muted">
              {group.models.length} 个模型 · {group.configs.length} 个配置
            </p>
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center justify-between gap-4 md:w-auto md:justify-end">
          <div className="flex items-center gap-2">
            {canUpdateProvider ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onUpdateProvider({
                    providerType: group.providerType,
                    providerName: group.providerName,
                    models: [],
                  });
                }}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-transparent bg-transparent px-2.5 text-[11px] font-bold text-muted transition-[background-color,border-color,color] duration-200 hover:border-primary/20 hover:bg-primary/6 hover:text-primary"
                title="更新密钥"
                aria-label="更新密钥"
              >
                <Key size={12} />
                更新密钥
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity,transform,margin] duration-[260ms] ease-out',
          collapsed
            ? 'mt-0 grid-rows-[0fr] -translate-y-1 opacity-0'
            : 'mt-3 grid-rows-[1fr] translate-y-0 opacity-100',
        )}
        aria-hidden={collapsed}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="grid gap-x-6 gap-y-4 px-2 pb-1 sm:grid-cols-2 xl:grid-cols-3">
            {group.models.map((model) => (
              <ModelConfigBlock key={model.modelName} model={model} onToggleConfig={onToggleConfig} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function ModelConfigBlock({
  model,
  onToggleConfig,
}: {
  model: ModelGroup;
  onToggleConfig: (config: ConfigView) => void;
}) {
  const capabilityConfigs = [...model.configs].sort((a, b) => capabilitySort(a.capability, b.capability));
  const activeConfigCount = model.configs.filter((config) => config.isActive).length;
  const isSystemOnly = model.editableConfigs.length === 0;

  return (
    <section className="group min-w-0 rounded-md border border-border-subtle bg-bg-card-solid p-3 transition-[border-color,background-color] duration-200 ease-out hover:border-primary/30 hover:bg-ink/[0.018]">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="line-clamp-2 min-w-0 flex-1 break-all text-sm font-bold leading-5 tracking-wide text-ink">
          {getModelDisplayName(model)}
        </p>

        <div className="flex max-w-[56%] shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
          {capabilityConfigs.map((config) => (
            <CapabilityControl key={config.id} config={config} onToggle={() => onToggleConfig(config)} />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 pl-px">
        {isSystemOnly ? (
          <div className="flex items-center gap-2 text-[11px] font-bold text-muted">
            <span>LinkRAG 默认配置</span>
            <span className="h-1 w-1 rounded-full bg-muted-soft" />
            <span>无法更改</span>
          </div>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {model.editableConfigs.length} configurable
          </span>
        )}
        <p className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted">
          {activeConfigCount}/{model.configs.length}
        </p>
      </div>
    </section>
  );
}

function CapabilityControl({ config, onToggle }: { config: ConfigView; onToggle: () => void }) {
  const capability = getCapabilityMeta(config.capability);
  const editable = isConfigEditable(config);
  const label = editable
    ? `${capability.label}${config.isActive ? '已启用，点击停用' : '已停用，点击启用'}`
    : `${capability.label}LinkRAG 默认配置，无法更改`;

  return (
    <span
      className={cn(
        'inline-flex h-7 min-w-0 shrink-0 items-center gap-2 text-[11px] font-bold transition-colors',
        config.isActive ? 'text-ink' : 'text-muted',
        editable ? 'hover:text-ink' : 'opacity-75',
      )}
    >
      {capability.iconUrl ? (
        <img
          src={capability.iconUrl}
          alt=""
          aria-hidden="true"
          className={cn('h-4 w-4 shrink-0 object-contain', !config.isActive && 'opacity-55')}
        />
      ) : null}
      <span className="whitespace-nowrap leading-none">{capability.label}</span>
      {editable ? <MiniCapabilitySwitch checked={config.isActive} label={label} onClick={onToggle} /> : null}
    </span>
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
              type="search"
              name="llm-provider-search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
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
            name={`llm-provider-api-key-${target.provider.providerType}`}
            autoComplete="new-password"
            autoCorrect="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
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

function EmptyConfiguredState() {
  return (
    <div className="text-center py-16 text-muted">
      <Key size={38} className="mx-auto mb-4 text-muted-soft" />
      <p className="text-sm font-bold text-ink">暂无模型配置</p>
      <p className="mt-1 text-xs">配置厂商后会在这里显示可用模型，LinkRag 会作为平台默认配置展示。</p>
    </div>
  );
}

function MiniCapabilitySwitch({ checked, label, onClick }: { checked: boolean; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={checked}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border px-[2px] outline-none transition-[background-color,border-color,box-shadow] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-primary/20',
        checked
          ? 'border-primary/40 bg-primary/85 shadow-[0_3px_10px_rgba(204,107,79,0.20)] hover:bg-primary'
          : 'border-border-subtle bg-surface-soft hover:border-primary/30 hover:bg-surface-card',
      )}
    >
      <span
        className={cn(
          'h-4 w-4 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.16)] transition-[background-color,transform] duration-200 ease-out',
          checked ? 'translate-x-4 bg-white' : 'translate-x-0 bg-muted-soft',
        )}
      />
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

function ConfigTypePill({ label, compact, quiet }: { label: string; compact?: boolean; quiet?: boolean }) {
  return (
    <span
      className={cn(
        compact ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-[10px]',
        'w-fit rounded-md inline-flex items-center justify-center font-bold',
        quiet
          ? 'bg-transparent text-muted'
          : label === '平台'
            ? 'bg-primary/10 text-primary'
            : 'bg-surface-soft text-muted',
      )}
    >
      {label}
    </span>
  );
}

function ConfigAccessPill({ config, compact, quiet }: { config: ConfigView; compact?: boolean; quiet?: boolean }) {
  return <ConfigTypePill label={isConfigEditable(config) ? '自定义' : '平台'} compact={compact} quiet={quiet} />;
}
