import { Fragment, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Box, Check, Key, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import chatIconUrl from '@/assets/icons/color/chat.svg';
import denseIconUrl from '@/assets/icons/color/dense.svg';
import rerankIconUrl from '@/assets/icons/color/rerank.svg';
import sparseIconUrl from '@/assets/icons/color/sparse.svg';
import speechIconUrl from '@/assets/icons/color/speech.svg';
import visionIconUrl from '@/assets/icons/color/vision.svg';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useTheme } from '@/contexts/ThemeContext';
import {
  createProviderModelDisplayNameMap,
  getModelDisplayName,
  getProviderModelDisplayName,
} from '@/lib/model-display';
import { getProviderIcon, normalizeProviderToken } from '@/lib/provider-icons';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import {
  clearUserCapabilityDefault,
  deleteLLMConfig,
  getLLMConfigs,
  getLLMCapabilityDefaults,
  getLLMProviders,
  setLLMConfigActive,
  setUserCapabilityDefault,
  setupLLMProvider,
} from '@/services/llm';
import type {
  CapabilityDefaultDTO,
  ExecutableLLMConfigDTO,
  LLMCapability,
  LLMCapabilityValue,
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

interface ConfigView extends ExecutableLLMConfigDTO {
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

function isConfigEditable(config: ExecutableLLMConfigDTO) {
  return config.editable;
}

function compareConfigOptions(a: ConfigView, b: ConfigView) {
  const aReadonly = !isConfigEditable(a);
  const bReadonly = !isConfigEditable(b);
  if (aReadonly !== bReadonly) {
    return aReadonly ? -1 : 1;
  }
  if (a.scope !== b.scope) {
    return a.scope === 'SYSTEM' ? -1 : 1;
  }
  return `${a.providerName}${getModelDisplayName(a)}`.localeCompare(`${b.providerName}${getModelDisplayName(b)}`);
}

function getConfigProviderIcon(config: ConfigView | null | undefined, darkMode: boolean) {
  if (!config) return '';
  const isSystemConfiguredModel = config.scope === 'SYSTEM';
  return getProviderIcon(
    isSystemConfiguredModel ? 'linkrag' : config.providerType,
    isSystemConfiguredModel ? 'LinkRag' : config.providerName,
    config.modelName,
    { darkMode },
  );
}

function getProviderGroupIcon(group: ProviderGroup, darkMode: boolean) {
  const hasSystemConfiguredModel = group.configs.some((config) => config.scope === 'SYSTEM');
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

export default function LLMPage() {
  const { darkMode } = useTheme();
  const [configs, setConfigs] = useState<ExecutableLLMConfigDTO[]>([]);
  const [defaults, setDefaults] = useState<CapabilityDefaultDTO[]>([]);
  const [providers, setProviders] = useState<ProviderModelDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCapabilityFilters, setSelectedCapabilityFilters] = useState<LLMCapability[]>([]);
  const [selectedCapability, setSelectedCapability] = useState<LLMCapability>('CHAT');
  const [providerPickerOpen, setProviderPickerOpen] = useState(false);
  const [setupTarget, setSetupTarget] = useState<SetupTarget | null>(null);

  useEffect(() => {
    loadPageData();
  }, []);

  const providerNameByType = useMemo(() => {
    return new Map(providers.map((provider) => [provider.providerType, provider.providerName]));
  }, [providers]);

  const providerModelDisplayNameByKey = useMemo(() => createProviderModelDisplayNameMap(providers), [providers]);

  const viewConfigs = useMemo<ConfigView[]>(() => {
    return configs.map((config) => ({
      ...config,
      displayName:
        config.displayName?.trim() ||
        getProviderModelDisplayName(providerModelDisplayNameByKey, config.providerType, config.modelName) ||
        config.displayName,
      providerName:
        providerNameByType.get(config.providerType) ||
        (isLinkRagProvider(config.providerType) ? 'LinkRag' : config.providerType),
    }));
  }, [configs, providerModelDisplayNameByKey, providerNameByType]);

  const configuredProviderTypes = useMemo(() => {
    return new Set(viewConfigs.filter(isConfigEditable).map((config) => config.providerType));
  }, [viewConfigs]);

  const defaultByCapability = useMemo(() => {
    const map = new Map<LLMCapability, ConfigView>();
    defaults.forEach((selection) => {
      const config = viewConfigs.find((item) => item.configId === selection.configId);
      if (config?.isActive) map.set(selection.capability, config);
    });
    return map;
  }, [defaults, viewConfigs]);

  const defaultSelectionByCapability = useMemo(
    () => new Map(defaults.map((selection) => [selection.capability, selection])),
    [defaults],
  );

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
    setLoading(true);
    try {
      const [configResult, defaultResult, providerResult] = await Promise.all([
        getLLMConfigs(),
        getLLMCapabilityDefaults(),
        getLLMProviders(),
      ]);
      setConfigs(configResult);
      setDefaults(defaultResult);
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
      const [configResult, defaultResult, providerResult] = await Promise.all([
        getLLMConfigs(),
        getLLMCapabilityDefaults(),
        getLLMProviders(),
      ]);
      setConfigs(configResult);
      setDefaults(defaultResult);
      setProviders(providerResult);
    } catch (error) {
      console.error('Failed to revalidate LLM page data:', error);
    }
  }

  async function handleSetupProvider(providerType: string, apiKey: string) {
    try {
      const nextConfigs = await setupLLMProvider({ providerType, apiKey });
      setConfigs((current) => {
        const merged = new Map(current.map((config) => [config.configId, config]));
        nextConfigs.forEach((config) => merged.set(config.configId, config));
        return [...merged.values()];
      });
      setSetupTarget(null);
      void revalidate();
    } catch (error) {
      console.error('Failed to setup provider:', error);
    }
  }

  async function handleSelectDefault(capability: LLMCapability, configId: string) {
    const config = viewConfigs.find((item) => item.configId === Number(configId));
    const previous = defaults.find((item) => item.capability === capability);
    if (!config || previous?.configId === config.configId || !config.isActive) {
      return;
    }
    setDefaults((current) =>
      current.map((item) => (item.capability === capability ? { ...item, configId: config.configId } : item)),
    );
    try {
      await setUserCapabilityDefault(capability, config.configId);
      void revalidate();
    } catch (error) {
      console.error('Failed to select effective config:', error);
      setDefaults((current) => current.map((item) => (item.capability === capability && previous ? previous : item)));
    }
  }

  async function handleClearDefault(capability: LLMCapability) {
    const previous = defaults.find((item) => item.capability === capability);
    if (!previous?.configId) return;
    setDefaults((current) =>
      current.map((item) => (item.capability === capability ? { ...item, configId: null } : item)),
    );
    try {
      await clearUserCapabilityDefault(capability);
      void revalidate();
    } catch (error) {
      console.error('Failed to clear capability default:', error);
      setDefaults((current) => current.map((item) => (item.capability === capability ? previous : item)));
    }
  }

  async function handleToggleConfig(config: ConfigView) {
    if (!isConfigEditable(config) || !isSupportedCapability(config.capability)) {
      return;
    }
    const nextActive = !config.isActive;
    setConfigs((prev) =>
      prev.map((item) => (item.configId === config.configId ? { ...item, isActive: nextActive } : item)),
    );
    try {
      await setLLMConfigActive(config.configId, nextActive);
      void revalidate();
    } catch (error) {
      console.error('Failed to toggle model:', error);
      setConfigs((prev) =>
        prev.map((item) => (item.configId === config.configId ? { ...item, isActive: config.isActive } : item)),
      );
    }
  }

  async function handleDeleteConfig(config: ConfigView) {
    if (!isConfigEditable(config) || !window.confirm(`确定删除 ${getModelDisplayName(config)} 吗？`)) return;
    try {
      await deleteLLMConfig(config.configId);
      setConfigs((current) => current.filter((item) => item.configId !== config.configId));
      void revalidate();
    } catch (error) {
      console.error('Failed to delete model config:', error);
    }
  }

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="flex shrink-0 items-center justify-end px-4 pt-3 pb-2 lg:h-16 lg:justify-between lg:border-b lg:border-border-subtle lg:px-8 lg:py-0">
        <div className="hidden lg:block">
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '模型配置' }]} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              void loadPageData();
            }}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border-subtle bg-surface-soft px-3 text-xs font-bold text-text-secondary transition-colors hover:border-primary/30 hover:bg-surface-card hover:text-ink"
            title="刷新"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden lg:inline">刷新</span>
          </button>
          <button
            type="button"
            onClick={() => setProviderPickerOpen(true)}
            className="inline-flex h-9 w-fit items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white transition-colors hover:bg-primary-active"
          >
            <Plus size={15} />
            配置厂商
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-canvas">
        <section className="px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pt-6 lg:pb-6">
          <div className="min-w-0 space-y-5">
            <EffectiveModelsPanel
              loading={loading && defaultByCapability.size === 0}
              defaultByCapability={defaultByCapability}
              defaultSelectionByCapability={defaultSelectionByCapability}
              candidatesByCapability={candidatesByCapability}
              darkMode={darkMode}
              selectedCapability={selectedCapability}
              onCapabilityChange={setSelectedCapability}
              onSelect={handleSelectDefault}
              onClearDefault={handleClearDefault}
            />

            <ConfiguredProvidersPanel
              loading={loading && providerGroups.length === 0}
              groups={providerGroups}
              darkMode={darkMode}
              selectedCapability={selectedCapability}
              onToggleConfig={handleToggleConfig}
              onDeleteConfig={handleDeleteConfig}
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
  defaultSelectionByCapability,
  candidatesByCapability,
  darkMode,
  selectedCapability,
  onCapabilityChange,
  onSelect,
  onClearDefault,
}: {
  loading?: boolean;
  defaultByCapability: Map<LLMCapability, ConfigView>;
  defaultSelectionByCapability: Map<LLMCapability, CapabilityDefaultDTO>;
  candidatesByCapability: Map<LLMCapability, ConfigView[]>;
  darkMode: boolean;
  selectedCapability: LLMCapability;
  onCapabilityChange: (capability: LLMCapability) => void;
  onSelect: (capability: LLMCapability, configId: string) => void;
  onClearDefault: (capability: LLMCapability) => void;
}) {
  const [openCapability, setOpenCapability] = useState<LLMCapability | null>(null);
  const currentCapability = CAPABILITIES.find((item) => item.value === selectedCapability) ?? CAPABILITIES[0];
  const current = defaultByCapability.get(currentCapability.value);
  const currentSelection = defaultSelectionByCapability.get(currentCapability.value);
  const candidates = candidatesByCapability.get(currentCapability.value) || [];
  const isOpen = openCapability === currentCapability.value;
  const selectedIcon = getConfigProviderIcon(current, darkMode);

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
        <h3 className="text-base font-bold text-ink">默认模型</h3>
      </div>
      {loading ? (
        <LoadingState label="加载默认模型..." />
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
              {EFFECTIVE_MODEL_CAPABILITIES.map((capability) => {
                const active = capability.value === selectedCapability;
                return (
                  <button
                    type="button"
                    key={capability.value}
                    className={cn(
                      'flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-colors',
                      active
                        ? 'bg-primary/10 text-ink'
                        : 'bg-surface-soft text-text-secondary hover:bg-primary/5 hover:text-ink',
                    )}
                    onClick={() => {
                      onCapabilityChange(capability.value);
                      setOpenCapability(null);
                    }}
                  >
                    {capability.iconUrl ? (
                      <img
                        src={capability.iconUrl}
                        alt=""
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 object-contain"
                      />
                    ) : null}
                    <span className="truncate">{capability.label}</span>
                  </button>
                );
              })}
            </div>

            <div
              className={cn(
                'relative flex min-h-[72px] flex-col justify-center gap-3 overflow-visible rounded-lg px-1 py-2 outline-none transition-[background-color,border-color] duration-200 lg:min-h-[112px] lg:justify-start lg:gap-4 lg:rounded-md lg:border lg:border-border-subtle lg:bg-bg-card-solid lg:p-4',
                candidates.length > 0
                  ? 'cursor-pointer hover:bg-surface-soft/55 focus-visible:bg-surface-soft/55 lg:hover:bg-ink/[0.025] lg:focus-visible:bg-ink/[0.035] lg:hover:border-primary/35 lg:focus-visible:border-primary/50'
                  : 'cursor-default opacity-70',
                isOpen && 'z-20 bg-surface-soft/55 lg:bg-primary/5 lg:border-primary/45',
              )}
              data-capability={currentCapability.value}
              data-model-selector={currentCapability.value}
              role={candidates.length > 0 ? 'button' : undefined}
              tabIndex={candidates.length > 0 ? 0 : undefined}
              onClick={() => {
                if (candidates.length === 0) return;
                setOpenCapability((prev) => (prev === currentCapability.value ? null : currentCapability.value));
              }}
              onKeyDown={(event) => {
                if (candidates.length === 0 || (event.key !== 'Enter' && event.key !== ' ')) return;
                event.preventDefault();
                setOpenCapability((prev) => (prev === currentCapability.value ? null : currentCapability.value));
              }}
            >
              <div className="hidden min-w-0 items-center justify-between gap-3 lg:flex">
                <div className="flex min-w-0 items-center gap-2">
                  {currentCapability.iconUrl ? (
                    <img
                      src={currentCapability.iconUrl}
                      alt=""
                      aria-hidden="true"
                      className="h-6 w-6 shrink-0 object-contain"
                    />
                  ) : null}
                  <span className="truncate text-sm font-bold text-text-secondary">{currentCapability.label}</span>
                </div>
                <ConfigTypePill label={currentSelection?.configId ? '我的默认' : '未设置默认'} compact quiet />
              </div>

              <div className="flex min-w-0 items-center gap-3">
                <ProviderIcon
                  iconUrl={selectedIcon}
                  name={current?.providerName || currentCapability.label}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-bold leading-6 text-ink">
                    {current ? getModelDisplayName(current) : '未设置'}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-wider text-muted">
                    {current ? current.providerName : '未设置默认模型'}
                  </p>
                </div>
              </div>

              {isOpen && candidates.length > 0 ? (
                <div
                  data-model-selector={currentCapability.value}
                  onClick={(event) => event.stopPropagation()}
                  className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-xl border border-hairline bg-bg-card-solid p-1.5 (--)] transition-all duration-300"
                >
                  <div className="max-h-[220px] space-y-1 overflow-y-auto pr-1 scrollbar-thin">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onClearDefault(currentCapability.value);
                        setOpenCapability(null);
                      }}
                      className="w-full rounded-lg border border-transparent px-2.5 py-2 text-left transition-all duration-200 hover:border-hairline hover:bg-surface-soft"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-soft text-muted">
                          <X size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-ink">清除默认</p>
                          <p className="mt-0.5 truncate text-[11px] text-muted">新操作不预选模型</p>
                        </div>
                        {!currentSelection?.configId ? <Check size={14} className="text-primary" /> : null}
                      </div>
                    </button>
                    {candidates.map((config) => {
                      const optionIcon = getConfigProviderIcon(config, darkMode);
                      return (
                        <button
                          type="button"
                          key={config.configId}
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect(currentCapability.value, `${config.configId}`);
                            setOpenCapability(null);
                          }}
                          className="w-full rounded-lg border border-transparent px-2.5 py-2 text-left transition-all duration-200 hover:border-hairline hover:bg-surface-soft"
                        >
                          <div className="flex items-center gap-2.5">
                            <ProviderIcon iconUrl={optionIcon} name={config.providerName} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-ink">{getModelDisplayName(config)}</p>
                              <p className="mt-0.5 truncate text-[11px] text-muted">{config.providerName}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {currentSelection?.configId === config.configId ? (
                                <span className="text-[10px] font-bold text-primary">我的默认</span>
                              ) : null}
                              <ConfigAccessPill config={config} compact />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="hidden gap-3 lg:grid lg:grid-cols-2 xl:grid-cols-3">
            {EFFECTIVE_MODEL_CAPABILITIES.map((capability) => {
              const desktopCurrent = defaultByCapability.get(capability.value);
              const desktopSelection = defaultSelectionByCapability.get(capability.value);
              const desktopCandidates = candidatesByCapability.get(capability.value) || [];
              const desktopOpen = openCapability === capability.value;
              const desktopIcon = getConfigProviderIcon(desktopCurrent, darkMode);
              return (
                <div
                  key={capability.value}
                  className={cn(
                    'relative flex h-full min-h-[132px] flex-col gap-4 overflow-visible rounded-md border border-border-subtle bg-bg-card-solid p-3 outline-none transition-[background-color,border-color] duration-200',
                    desktopCandidates.length > 0
                      ? 'cursor-pointer hover:border-primary/35 hover:bg-ink/[0.025] focus-visible:border-primary/50 focus-visible:bg-ink/[0.035]'
                      : 'cursor-default opacity-70',
                    desktopOpen && 'z-20 border-primary/45 bg-primary/5',
                  )}
                  data-capability={capability.value}
                  data-model-selector={capability.value}
                  role={desktopCandidates.length > 0 ? 'button' : undefined}
                  tabIndex={desktopCandidates.length > 0 ? 0 : undefined}
                  onClick={() => {
                    if (desktopCandidates.length === 0) return;
                    setOpenCapability((prev) => (prev === capability.value ? null : capability.value));
                  }}
                  onKeyDown={(event) => {
                    if (desktopCandidates.length === 0 || (event.key !== 'Enter' && event.key !== ' ')) return;
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
                    <ConfigTypePill label={desktopSelection?.configId ? '我的默认' : '未设置默认'} compact quiet />
                  </div>

                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <ProviderIcon
                        iconUrl={desktopIcon}
                        name={desktopCurrent?.providerName || capability.label}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold leading-5 text-ink">
                          {desktopCurrent ? getModelDisplayName(desktopCurrent) : '未设置'}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-wider text-muted">
                          {desktopCurrent ? desktopCurrent.providerName : '未设置默认模型'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {desktopOpen && desktopCandidates.length > 0 ? (
                    <div
                      data-model-selector={capability.value}
                      onClick={(event) => event.stopPropagation()}
                      className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-xl border border-hairline bg-bg-card-solid p-1.5 (--)] transition-all duration-300"
                    >
                      <div className="max-h-[156px] space-y-1 overflow-y-auto pr-1 scrollbar-thin">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onClearDefault(capability.value);
                            setOpenCapability(null);
                          }}
                          className="w-full rounded-lg border border-transparent px-2.5 py-2 text-left transition-all duration-200 hover:border-hairline hover:bg-surface-soft"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-soft text-muted">
                              <X size={14} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-ink">清除默认</p>
                              <p className="mt-0.5 truncate text-[11px] text-muted">新操作不预选模型</p>
                            </div>
                            {!desktopSelection?.configId ? <Check size={14} className="text-primary" /> : null}
                          </div>
                        </button>
                        {desktopCandidates.map((config) => {
                          const optionIcon = getConfigProviderIcon(config, darkMode);
                          return (
                            <button
                              type="button"
                              key={config.configId}
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelect(capability.value, `${config.configId}`);
                                setOpenCapability(null);
                              }}
                              className="w-full rounded-lg border border-transparent px-2.5 py-2 text-left transition-all duration-200 hover:border-hairline hover:bg-surface-soft"
                            >
                              <div className="flex items-center gap-2.5">
                                <ProviderIcon iconUrl={optionIcon} name={config.providerName} size="sm" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-bold text-ink">{getModelDisplayName(config)}</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {desktopSelection?.configId === config.configId ? (
                                    <span className="text-[10px] font-bold text-primary">我的默认</span>
                                  ) : null}
                                  <ConfigAccessPill config={config} compact />
                                </div>
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
        </>
      )}
    </section>
  );
}

function ConfiguredProvidersPanel({
  loading,
  groups,
  darkMode,
  selectedCapability,
  onToggleConfig,
  onDeleteConfig,
  onUpdateProvider,
}: {
  loading: boolean;
  groups: ProviderGroup[];
  darkMode: boolean;
  selectedCapability: LLMCapability;
  onToggleConfig: (config: ConfigView) => void;
  onDeleteConfig: (config: ConfigView) => void;
  onUpdateProvider: (provider: ProviderModelDTO) => void;
}) {
  const selectedCapabilityMeta = getCapabilityMeta(selectedCapability);
  const capabilityGroups = useMemo<ProviderGroup[]>(() => {
    return groups
      .map((group) => {
        const models = group.models
          .map((model) => {
            const configs = model.configs.filter((config) => config.capability === selectedCapability);
            if (configs.length === 0) return null;
            const editableConfigs = configs.filter(isConfigEditable);
            return {
              ...model,
              configs,
              editableConfigs,
              readonlyConfigs: configs.filter((config) => !isConfigEditable(config)),
              isEditableActive: editableConfigs.some((config) => config.isActive),
            };
          })
          .filter((model): model is ModelGroup => Boolean(model));

        if (models.length === 0) return null;
        const configs = models.flatMap((model) => model.configs);
        return { ...group, models, configs };
      })
      .filter((group): group is ProviderGroup => Boolean(group));
  }, [groups, selectedCapability]);
  const mobileModelCount = capabilityGroups.reduce((total, group) => total + group.models.length, 0);
  const mobileConfigCount = capabilityGroups.reduce((total, group) => total + group.configs.length, 0);
  const modelCount = groups.reduce((total, group) => total + group.models.length, 0);
  const configCount = groups.reduce((total, group) => total + group.configs.length, 0);

  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between gap-3 px-1 pb-2 lg:hidden">
        <h3 className="text-base font-bold text-ink">{selectedCapabilityMeta.label}模型</h3>
        <div className="hidden items-center gap-3 text-[11px] font-semibold text-muted">
          <span>{capabilityGroups.length} 厂商</span>
          <span>{mobileModelCount} 模型</span>
          <span>{mobileConfigCount} 配置</span>
        </div>
      </div>
      <div className="hidden items-center justify-between gap-3 px-1 pb-2 lg:flex">
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
        <>
          {capabilityGroups.length === 0 ? (
            <div className="lg:hidden">
              <EmptyConfiguredState />
            </div>
          ) : (
            <div className="overflow-hidden lg:hidden">
              {capabilityGroups.map((group) => (
                <Fragment key={group.providerType}>
                  <ProviderConfigCard
                    group={group}
                    darkMode={darkMode}
                    defaultCollapsed={false}
                    onToggleConfig={onToggleConfig}
                    onDeleteConfig={onDeleteConfig}
                    onUpdateProvider={onUpdateProvider}
                  />
                </Fragment>
              ))}
            </div>
          )}
          <div className="hidden overflow-hidden rounded-md border border-border-subtle bg-bg-card-solid lg:block">
            {groups.map((group) => (
              <Fragment key={group.providerType}>
                <ProviderConfigCard
                  group={group}
                  darkMode={darkMode}
                  defaultCollapsed
                  onToggleConfig={onToggleConfig}
                  onDeleteConfig={onDeleteConfig}
                  onUpdateProvider={onUpdateProvider}
                />
              </Fragment>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function ProviderConfigCard({
  group,
  darkMode,
  defaultCollapsed = true,
  onToggleConfig,
  onDeleteConfig,
  onUpdateProvider,
}: {
  group: ProviderGroup;
  darkMode: boolean;
  defaultCollapsed?: boolean;
  onToggleConfig: (config: ConfigView) => void;
  onDeleteConfig: (config: ConfigView) => void;
  onUpdateProvider: (provider: ProviderModelDTO) => void;
}) {
  const iconUrl = getProviderGroupIcon(group, darkMode);
  const editableCount = group.configs.filter(isConfigEditable).length;
  const canUpdateProvider = editableCount > 0;
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

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
    <article className="px-0 py-1 transition-colors duration-200 lg:border-b lg:border-border-subtle lg:px-3 lg:py-3 lg:last:border-b-0">
      <header
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onClick={toggleCollapsed}
        onKeyDown={handleHeaderKeyDown}
        className={cn(
          'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-1 py-1.5 outline-none transition-colors duration-200 hover:bg-ink/[0.028] focus-visible:bg-ink/[0.035] lg:-mx-3 lg:-mt-3 lg:rounded-none lg:px-5 lg:py-4',
          collapsed && 'lg:-mb-3',
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <ProviderIcon iconUrl={iconUrl} name={group.providerName} size="sm" />
          <div className="min-w-0">
            <h4 className="text-sm font-bold truncate tracking-wide text-ink">{group.providerName}</h4>
            <p className="mt-0.5 hidden text-[11px] font-medium text-muted lg:block">
              {group.models.length} 个模型 · {group.configs.length} 个配置
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <div className="flex items-center">
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
                className="inline-flex h-8 w-8 items-center justify-center gap-1.5 rounded-md border border-transparent bg-transparent text-[11px] font-bold text-muted transition-[background-color,border-color,color] duration-200 hover:border-primary/20 hover:bg-primary/6 hover:text-primary lg:w-auto lg:px-2.5"
                title="更新密钥"
                aria-label="更新密钥"
              >
                <Key size={12} />
                <span className="hidden lg:inline">更新密钥</span>
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
            : 'mt-1 grid-rows-[1fr] translate-y-0 opacity-100 lg:mt-3',
        )}
        aria-hidden={collapsed}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-0.5 px-0 pb-1 lg:grid lg:gap-x-6 lg:gap-y-4 lg:space-y-0 lg:px-2 lg:sm:grid-cols-2 lg:xl:grid-cols-3">
            {group.models.map((model) => (
              <ModelConfigBlock
                key={model.modelName}
                model={model}
                onToggleConfig={onToggleConfig}
                onDeleteConfig={onDeleteConfig}
                onEditConfig={() =>
                  onUpdateProvider({
                    providerType: group.providerType,
                    providerName: group.providerName,
                    models: [],
                  })
                }
              />
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
  onDeleteConfig,
  onEditConfig,
}: {
  model: ModelGroup;
  onToggleConfig: (config: ConfigView) => void;
  onDeleteConfig: (config: ConfigView) => void;
  onEditConfig: (config: ConfigView) => void;
}) {
  const capabilityConfigs = [...model.configs].sort((a, b) => capabilitySort(a.capability, b.capability));
  const activeConfigCount = model.configs.filter((config) => config.isActive).length;
  const isSystemOnly = model.editableConfigs.length === 0;

  return (
    <section className="group min-w-0 rounded-lg px-1 py-1.5 transition-[border-color,background-color] duration-200 ease-out active:bg-surface-soft/55 lg:rounded-md lg:border lg:border-border-subtle lg:bg-bg-card-solid lg:p-3 lg:hover:border-primary/30 lg:hover:bg-ink/[0.018]">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="line-clamp-2 min-w-0 flex-1 break-all text-sm font-bold leading-5 text-ink lg:tracking-wide">
          {getModelDisplayName(model)}
        </p>

        <div className="flex max-w-[52%] shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1.5 lg:max-w-[56%] lg:gap-x-3">
          {capabilityConfigs.map((config) => (
            <CapabilityControl
              key={config.configId}
              config={config}
              onEdit={() => onEditConfig(config)}
              onToggle={() => onToggleConfig(config)}
              onDelete={() => onDeleteConfig(config)}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 hidden items-center justify-between gap-3 pl-px lg:mt-3 lg:flex">
        {isSystemOnly ? (
          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted lg:font-bold">
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

function CapabilityControl({
  config,
  onEdit,
  onToggle,
  onDelete,
}: {
  config: ConfigView;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const capability = getCapabilityMeta(config.capability);
  const editable = isConfigEditable(config);
  const label = editable
    ? `${capability.label}${config.isActive ? '已启用，点击停用' : '已停用，点击启用'}`
    : `${capability.label}LinkRAG 默认配置，无法更改`;

  return (
    <span
      data-config-id={config.configId}
      className={cn(
        'inline-flex h-7 min-w-0 shrink-0 items-center gap-1.5 text-[11px] font-bold transition-colors lg:gap-2',
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
      <span className="hidden whitespace-nowrap leading-none lg:inline">{capability.label}</span>
      {editable ? (
        <>
          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-primary/10 hover:text-primary"
            aria-label={`编辑 ${getModelDisplayName(config)}`}
          >
            <Key size={12} />
          </button>
          <MiniCapabilitySwitch checked={config.isActive} label={label} onClick={onToggle} />
          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-error/10 hover:text-error"
            aria-label={`删除 ${getModelDisplayName(config)}`}
          >
            <Trash2 size={12} />
          </button>
        </>
      ) : null}
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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] lg:bg-black/50 lg:backdrop-blur-0"
        onClick={onClose}
      />
      <section className="relative flex h-[min(78vh,680px)] w-full max-w-[min(100vw-2rem,880px)] flex-col overflow-hidden rounded-2xl border border-hairline bg-bg-card-solid shadow-dialog lg:h-[min(760px,calc(100vh-64px))] lg:rounded-xl (--)]">
        <header className="px-4 pb-3 pt-4 lg:px-6 lg:pb-4 lg:pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold tracking-wide text-ink">配置厂商</h3>
              <p className="mt-1 hidden text-xs text-muted lg:block">选择一个厂商后填写厂商级 API Key。</p>
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
          <div className="relative mt-4 lg:mt-5">
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
              className="h-10 w-full rounded-lg border border-border-subtle bg-surface-soft pl-9 pr-3 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-muted-soft placeholder:tracking-wider focus:border-primary/40 focus:bg-canvas lg:rounded-md lg:bg-transparent"
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5 lg:mt-4 lg:flex lg:flex-wrap lg:gap-2">
            {CAPABILITIES.map((capability) => {
              const active = filterSet.has(capability.value);
              return (
                <button
                  type="button"
                  key={capability.value}
                  onClick={() => toggleCapabilityFilter(capability.value)}
                  className={cn(
                    'inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-colors duration-200 lg:h-auto lg:justify-start lg:rounded-md lg:border lg:px-2.5 lg:py-1',
                    active
                      ? 'bg-primary/10 text-ink lg:border-primary/40 lg:bg-transparent'
                      : 'bg-surface-soft text-text-secondary hover:bg-ink/[0.035] hover:text-ink lg:border-transparent lg:bg-transparent',
                  )}
                >
                  {capability.iconUrl ? (
                    <img src={capability.iconUrl} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
                  ) : null}
                  <span className="truncate">{capability.label}</span>
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
            <div className="grid min-h-[260px] auto-rows-max content-start items-start gap-1.5 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:gap-2.5 lg:px-4 lg:pb-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3">
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
      className="group h-fit w-full rounded-lg px-1 py-2 text-left transition-[background-color,border-color] duration-200 hover:bg-ink/[0.025] lg:rounded-md lg:border lg:border-border-subtle lg:bg-transparent lg:p-3.5 lg:hover:border-primary/35"
    >
      <div className="flex min-h-8 items-center gap-2.5">
        <ProviderIcon iconUrl={iconUrl} name={provider.providerName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-bold tracking-wide text-ink">{provider.providerName}</h4>
            {configured && <CountPill label="已配置" />}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted lg:hidden">
            {sortedCapabilities
              .slice(0, 3)
              .map((capability) => getCapabilityMeta(capability).label)
              .join(' / ')}
          </p>
        </div>
        <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-white transition-colors duration-200 group-hover:bg-primary-active lg:hidden">
          {configured ? '更新' : '配置'}
        </span>
      </div>
      <div className="mt-3 hidden items-center justify-between gap-3 lg:flex">
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
      <p className="mt-1 text-xs">配置厂商后会在这里显示个人模型；平台模型由管理员统一维护并共享。</p>
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
