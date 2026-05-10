import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Check,
  ChevronDown,
  ChevronUp,
  Key,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Routes } from '@/routes';
import {
  createLLMConfig,
  deleteLLMConfig,
  getLLMConfigs,
  getLLMProviders,
  setDefaultLLMConfig,
  updateLLMConfig,
} from '@/services/llm';
import type { LLMCapability, LLMConfigDTO, ModelCapabilityDTO, ProviderModelDTO } from '@/types/api';

import OpenAIIcon from '@/../icons/providers/openai.svg';
import AnthropicIcon from '@/../icons/providers/anthropic.svg';
import OllamaIcon from '@/../icons/providers/ollama.svg';
import DeepSeekIcon from '@/../icons/providers/deepseek-color.svg';
import GoogleIcon from '@/../icons/providers/gemini-color.svg';
import QwenIcon from '@/../icons/providers/qwen-color.svg';
import MetaIcon from '@/../icons/providers/meta-color.svg';
import MistralIcon from '@/../icons/providers/mistral-color.svg';
import ZhipuIcon from '@/../icons/providers/zhipu-color.svg';

interface LLMPageProps {
  darkMode?: boolean;
}

interface DrawerTarget {
  mode: 'create' | 'edit';
  provider?: ProviderModelDTO;
  model?: ModelCapabilityDTO;
  config?: LLMConfigDTO;
}

interface ConfigFormData {
  providerType: string;
  configName: string;
  apiKey?: string;
  modelName: string;
  capability?: LLMCapability;
  priority: number;
  isDefault: boolean;
  timeoutMs: number;
  maxRetries: number;
  streamEnabled: boolean;
  customApiBaseUrl?: string;
  extraConfig?: string;
}

const CAPABILITIES: Array<{ value: LLMCapability; label: string; hint: string }> = [
  { value: 'CHAT', label: '对话', hint: 'Chat' },
  { value: 'EMBEDDING', label: '向量', hint: 'Embedding' },
  { value: 'OCR', label: '识别', hint: 'OCR' },
  { value: 'VISION', label: '视觉', hint: 'Vision' },
  { value: 'REASONING', label: '推理', hint: 'Reasoning' },
  { value: 'CODE', label: '代码', hint: 'Code' },
];

const PROVIDER_ICON_URLS: Record<string, string> = {
  openai: OpenAIIcon,
  anthropic: AnthropicIcon,
  claude: AnthropicIcon,
  ollama: OllamaIcon,
  deepseek: DeepSeekIcon,
  google: GoogleIcon,
  gemini: GoogleIcon,
  qwen: QwenIcon,
  aliyun: QwenIcon,
  meta: MetaIcon,
  llama: MetaIcon,
  mistral: MistralIcon,
  glm: ZhipuIcon,
  zhipu: ZhipuIcon,
};

function getCapabilityMeta(capability: LLMCapability) {
  return CAPABILITIES.find((item) => item.value === capability) || {
    value: capability,
    label: capability,
    hint: capability,
  };
}

function getProviderIcon(providerType: string, providerName?: string) {
  const keys = [providerType, providerName || ''].map((value) => value.toLowerCase());
  const matchedKey = Object.keys(PROVIDER_ICON_URLS).find((key) =>
    keys.some((value) => value.includes(key))
  );
  return matchedKey ? PROVIDER_ICON_URLS[matchedKey] : '';
}

export default function LLMPage({ darkMode }: LLMPageProps) {
  const [configs, setConfigs] = useState<LLMConfigDTO[]>([]);
  const [providers, setProviders] = useState<ProviderModelDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCapability, setSelectedCapability] = useState<LLMCapability | 'ALL'>('ALL');
  const [drawerTarget, setDrawerTarget] = useState<DrawerTarget | null>(null);

  useEffect(() => {
    loadPageData();
  }, []);

  const loadPageData = async () => {
    setLoading(true);
    try {
      const [configResult, providerResult] = await Promise.all([
        getLLMConfigs(),
        getLLMProviders(),
      ]);
      setConfigs(configResult);
      setProviders(providerResult);
    } catch (error) {
      console.error('Failed to load LLM page data:', error);
    } finally {
      setLoading(false);
    }
  };

  const visibleConfigs = useMemo(() => {
    if (selectedCapability === 'ALL') {
      return configs;
    }
    return configs.filter((config) => config.capability === selectedCapability);
  }, [configs, selectedCapability]);

  const defaultConfigs = useMemo(() => {
    const map = new Map<LLMCapability, LLMConfigDTO>();
    configs.forEach((config) => {
      if (config.isDefault && config.isActive) {
        map.set(config.capability, config);
      }
    });
    return map;
  }, [configs]);

  const currentDefaultConfigs = useMemo(() => {
    if (selectedCapability === 'ALL') {
      return CAPABILITIES.map((capability) => ({
        ...capability,
        config: defaultConfigs.get(capability.value),
      }));
    }
    const capability = getCapabilityMeta(selectedCapability);
    return [{ ...capability, config: defaultConfigs.get(selectedCapability) }];
  }, [defaultConfigs, selectedCapability]);

  const handleSaveConfig = async (data: ConfigFormData) => {
    try {
      if (drawerTarget?.mode === 'edit' && drawerTarget.config) {
        const payload: Partial<ConfigFormData> = {
          priority: data.priority,
          isDefault: data.isDefault,
          timeoutMs: data.timeoutMs,
          maxRetries: data.maxRetries,
          streamEnabled: data.streamEnabled,
          customApiBaseUrl: data.customApiBaseUrl,
          extraConfig: data.extraConfig,
        };
        if (data.apiKey) {
          payload.apiKey = data.apiKey;
        }
        await updateLLMConfig(drawerTarget.config.id, payload);
      } else {
        await createLLMConfig({
          providerType: data.providerType,
          configName: data.configName,
          apiKey: data.apiKey || '',
          modelName: data.modelName,
          capability: data.capability,
          priority: data.priority,
          isDefault: data.isDefault,
          timeoutMs: data.timeoutMs,
          maxRetries: data.maxRetries,
          streamEnabled: data.streamEnabled,
          customApiBaseUrl: data.customApiBaseUrl,
          extraConfig: data.extraConfig,
        });
      }
      setDrawerTarget(null);
      await loadPageData();
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const handleSetDefault = async (config: LLMConfigDTO) => {
    try {
      await setDefaultLLMConfig(config.id, config.capability);
      setConfigs((prev) =>
        prev.map((item) =>
          item.capability === config.capability
            ? { ...item, isDefault: item.id === config.id }
            : item
        )
      );
    } catch (error) {
      console.error('Failed to set default config:', error);
    }
  };

  const handleToggleActive = async (config: LLMConfigDTO) => {
    try {
      await updateLLMConfig(config.id, { isActive: !config.isActive });
      setConfigs((prev) =>
        prev.map((item) =>
          item.id === config.id ? { ...item, isActive: !config.isActive } : item
        )
      );
    } catch (error) {
      console.error('Failed to toggle config:', error);
    }
  };

  const handleDeleteConfig = async (config: LLMConfigDTO) => {
    if (!confirm(`确定要删除 ${config.configName} 的 ${getCapabilityMeta(config.capability).label} 配置吗？`)) {
      return;
    }
    try {
      await deleteLLMConfig(config.id);
      setConfigs((prev) => prev.filter((item) => item.id !== config.id));
    } catch (error) {
      console.error('Failed to delete config:', error);
    }
  };

  const activeCount = configs.filter((config) => config.isActive).length;
  const defaultCount = configs.filter((config) => config.isDefault && config.isActive).length;

  return (
    <div className="h-full flex flex-col">
      <header className={cn(
        "h-20 px-8 flex items-center justify-between shrink-0 backdrop-blur-md",
        darkMode ? "bg-[#252526] border-[#3c3c3c]" : "bg-white/80 border-border-subtle border-b"
      )}>
        <div className="flex flex-col gap-1">
          <Breadcrumb
            items={[
              { label: '首页', path: Routes.Home },
              { label: '设置' },
              { label: '模型配置' },
            ]}
            darkMode={darkMode}
          />
          <h2 className={cn("text-xl serif-heading", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
            模型配置
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPageData}
            className={cn(
              "p-2 rounded-lg transition-colors",
              darkMode ? "text-[#858585] hover:bg-[#2d2d2d]" : "text-text-main/50 hover:bg-primary/5"
            )}
            title="刷新"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setDrawerTarget({ mode: 'create' })}
            className={cn(
              "h-9 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-opacity",
              darkMode ? "bg-[#094771] text-white hover:bg-[#0a5280]" : "bg-text-main text-white hover:opacity-90"
            )}
          >
            <Plus size={14} />
            添加模型
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <section className={cn("px-8 py-6 border-b", darkMode ? "border-[#3c3c3c]" : "border-border-subtle")}>
          <div className="flex items-start justify-between gap-8">
            <div>
              <h3 className={cn("text-lg font-bold", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
                LLM 配置中心
              </h3>
              <p className={cn("text-xs mt-1", darkMode ? "text-[#858585]" : "text-text-main/50")}>
                后端按模型能力拆分配置，默认模型也按能力独立生效
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 min-w-[420px]">
              <SummaryTile darkMode={darkMode} label="配置数" value={configs.length} />
              <SummaryTile darkMode={darkMode} label="启用中" value={activeCount} />
              <SummaryTile darkMode={darkMode} label="默认能力" value={`${defaultCount}/${CAPABILITIES.length}`} />
            </div>
          </div>

          <div className={cn(
            "inline-flex flex-wrap gap-1 p-1 rounded-lg mt-6 border",
            darkMode ? "bg-[#2d2d2d] border-[#3c3c3c]" : "bg-white/70 border-border-subtle"
          )}>
            <TabButton
              darkMode={darkMode}
              active={selectedCapability === 'ALL'}
              label="全部"
              onClick={() => setSelectedCapability('ALL')}
            />
            {CAPABILITIES.map((capability) => (
              <TabButton
                key={capability.value}
                darkMode={darkMode}
                active={selectedCapability === capability.value}
                label={capability.label}
                onClick={() => setSelectedCapability(capability.value)}
              />
            ))}
          </div>
        </section>

        <section className="px-8 py-6 space-y-5">
          <DefaultModelStrip darkMode={darkMode} items={currentDefaultConfigs} />

          <div className={cn(
            "rounded-lg border overflow-hidden",
            darkMode ? "bg-[#252526] border-[#3c3c3c]" : "bg-white/70 border-border-subtle"
          )}>
            <div className={cn(
              "grid grid-cols-[1.1fr_1.3fr_1.3fr_0.7fr_0.7fr_0.8fr_120px] gap-4 px-5 py-3 text-[11px] font-bold",
              darkMode ? "bg-[#2d2d2d] text-[#858585]" : "bg-bg-base/60 text-text-main/50"
            )}>
              <span>能力</span>
              <span>厂商</span>
              <span>模型</span>
              <span>优先级</span>
              <span>状态</span>
              <span>默认</span>
              <span className="text-right">操作</span>
            </div>

            {loading ? (
              <div className={cn("flex items-center justify-center py-16", darkMode ? "text-[#858585]" : "text-text-main/50")}>
                <RefreshCw size={18} className="animate-spin mr-2" />
                <span className="text-sm">加载模型配置...</span>
              </div>
            ) : visibleConfigs.length === 0 ? (
              <EmptyState darkMode={darkMode} onAdd={() => setDrawerTarget({ mode: 'create' })} />
            ) : (
              <div className="divide-y divide-border-subtle">
                {visibleConfigs.map((config) => (
                  <ConfigRow
                    key={config.id}
                    config={config}
                    darkMode={darkMode}
                    onEdit={() => {
                      const provider = providers.find((item) => item.providerType === config.providerType);
                      setDrawerTarget({ mode: 'edit', provider, config });
                    }}
                    onDelete={() => handleDeleteConfig(config)}
                    onSetDefault={() => handleSetDefault(config)}
                    onToggleActive={() => handleToggleActive(config)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {drawerTarget && (
        <LLMConfigModal
          darkMode={darkMode}
          target={drawerTarget}
          providers={providers}
          selectedCapability={selectedCapability === 'ALL' ? undefined : selectedCapability}
          onClose={() => setDrawerTarget(null)}
          onSave={handleSaveConfig}
        />
      )}
    </div>
  );
}

function SummaryTile({ darkMode, label, value }: {
  darkMode?: boolean;
  label: string;
  value: number | string;
}) {
  return (
    <div className={cn(
      "rounded-lg border px-4 py-3",
      darkMode ? "bg-[#2d2d2d] border-[#3c3c3c]" : "bg-white/70 border-border-subtle"
    )}>
      <div className={cn("text-xl font-semibold serif-heading", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
        {value}
      </div>
      <div className={cn("text-[11px] font-bold mt-1", darkMode ? "text-[#858585]" : "text-text-main/50")}>
        {label}
      </div>
    </div>
  );
}

function TabButton({ darkMode, active, label, onClick }: {
  key?: string;
  darkMode?: boolean;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 px-4 rounded-md text-xs font-bold transition-colors",
        active
          ? darkMode ? "bg-[#094771] text-white" : "bg-text-main text-white"
          : darkMode ? "text-[#858585] hover:bg-[#3c3c3c]" : "text-text-main/50 hover:bg-primary/10"
      )}
    >
      {label}
    </button>
  );
}

function DefaultModelStrip({ darkMode, items }: {
  darkMode?: boolean;
  items: Array<{ value: LLMCapability; label: string; hint: string; config?: LLMConfigDTO }>;
}) {
  return (
    <div className={cn(
      "rounded-lg border px-5 py-4",
      darkMode ? "bg-[#252526] border-[#3c3c3c]" : "bg-white/70 border-border-subtle"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className={cn("text-sm font-bold", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
            当前默认模型
          </h4>
          <p className={cn("text-[11px] mt-1", darkMode ? "text-[#858585]" : "text-text-main/50")}>
            每个能力只会有一个启用中的默认配置
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item) => (
          <div
            key={item.value}
            className={cn(
              "rounded-lg px-3 py-3 border min-h-[72px]",
              darkMode ? "bg-[#1e1e1e] border-[#3c3c3c]" : "bg-bg-base/40 border-border-subtle"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={cn("text-xs font-bold", darkMode ? "text-[#cccccc]" : "text-text-main")}>
                {item.label}
              </span>
              <span className={cn("mono-label", darkMode ? "text-[#858585]" : "text-text-main/40")}>
                {item.hint}
              </span>
            </div>
            {item.config ? (
              <div className="mt-2 flex items-center gap-2 min-w-0">
                <ProviderIcon
                  iconUrl={getProviderIcon(item.config.providerType, item.config.providerName)}
                  name={item.config.providerName}
                  darkMode={darkMode}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className={cn("text-xs font-bold truncate", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
                    {item.config.modelName}
                  </p>
                  <p className={cn("text-[10px] truncate", darkMode ? "text-[#858585]" : "text-text-main/50")}>
                    {item.config.providerName} · {item.config.configName}
                  </p>
                </div>
              </div>
            ) : (
              <p className={cn("text-xs mt-3", darkMode ? "text-[#858585]" : "text-text-main/45")}>
                未设置默认
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigRow({ config, darkMode, onEdit, onDelete, onSetDefault, onToggleActive }: {
  key?: number;
  config: LLMConfigDTO;
  darkMode?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onToggleActive: () => void;
}) {
  const capability = getCapabilityMeta(config.capability);
  const iconUrl = getProviderIcon(config.providerType, config.providerName);

  return (
    <div className={cn(
      "grid grid-cols-[1.1fr_1.3fr_1.3fr_0.7fr_0.7fr_0.8fr_120px] gap-4 px-5 py-3 items-center min-h-[68px]",
      darkMode ? "text-[#cccccc] hover:bg-[#2d2d2d]" : "text-text-main hover:bg-bg-base/40"
    )}>
      <div>
        <span className={cn(
          "inline-flex px-2 py-1 rounded text-[11px] font-bold",
          darkMode ? "bg-[#3c3c3c] text-[#e0e0e0]" : "bg-bg-base text-text-main"
        )}>
          {capability.label}
        </span>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <ProviderIcon iconUrl={iconUrl} name={config.providerName} darkMode={darkMode} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{config.providerName}</p>
          <p className={cn("mono-label truncate", darkMode ? "text-[#858585]" : "text-text-main/40")}>
            {config.providerType}
          </p>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold truncate">{config.modelName}</p>
        <p className={cn("text-[11px] truncate", darkMode ? "text-[#858585]" : "text-text-main/50")}>
          {config.configName}
        </p>
      </div>
      <span className="text-xs font-bold">{config.priority}</span>
      <button
        onClick={onToggleActive}
        className={cn(
          "w-fit px-2.5 py-1 rounded text-[11px] font-bold transition-colors",
          config.isActive
            ? darkMode ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-700"
            : darkMode ? "bg-[#3c3c3c] text-[#858585]" : "bg-gray-100 text-gray-500"
        )}
      >
        {config.isActive ? '启用' : '禁用'}
      </button>
      {config.isDefault ? (
        <span className={cn(
          "w-fit px-2.5 py-1 rounded text-[11px] font-bold",
          darkMode ? "bg-[#094771] text-blue-300" : "bg-blue-100 text-blue-700"
        )}>
          默认
        </span>
      ) : (
        <button
          onClick={onSetDefault}
          disabled={!config.isActive}
          className={cn(
            "w-fit px-2.5 py-1 rounded text-[11px] font-bold transition-colors disabled:opacity-40",
            darkMode ? "text-[#cccccc] hover:bg-[#3c3c3c]" : "text-text-main/60 hover:bg-primary/10"
          )}
        >
          设默认
        </button>
      )}
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={onEdit}
          className={cn(
            "p-2 rounded-lg transition-colors",
            darkMode ? "text-[#cccccc] hover:bg-[#3c3c3c]" : "text-text-main/70 hover:bg-primary/10"
          )}
          title="编辑"
        >
          <SlidersHorizontal size={14} />
        </button>
        <button
          onClick={onDelete}
          className={cn(
            "p-2 rounded-lg transition-colors",
            darkMode ? "text-red-300 hover:bg-red-900/30" : "text-red-500 hover:bg-red-50"
          )}
          title="删除"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function ProviderIcon({ iconUrl, name, darkMode, size }: {
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
        className={cn(className, "rounded-lg object-contain shrink-0", darkMode ? "bg-[#3c3c3c]" : "bg-white")}
      />
    );
  }

  return (
    <div className={cn(
      className,
      "rounded-lg flex items-center justify-center shrink-0",
      darkMode ? "bg-[#3c3c3c]" : "bg-primary/10"
    )}>
      <Box size={16} className={darkMode ? "text-[#c586c0]" : "text-primary"} />
    </div>
  );
}

function CapabilityChips({ capabilities, darkMode }: {
  capabilities: LLMCapability[];
  darkMode?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {capabilities.map((capability) => {
        const meta = getCapabilityMeta(capability);
        return (
          <span
            key={capability}
            className={cn(
              "px-1.5 py-0.5 rounded text-[9px] font-bold",
              darkMode ? "bg-[#3c3c3c] text-[#cccccc]" : "bg-bg-base text-text-main/70"
            )}
          >
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

function EmptyState({ darkMode, onAdd }: { darkMode?: boolean; onAdd: () => void }) {
  return (
    <div className={cn("text-center py-16", darkMode ? "text-[#858585]" : "text-text-main/50")}>
      <Key size={38} className={cn("mx-auto mb-4", darkMode ? "text-[#6b6b6b]" : "text-text-main/20")} />
      <p className={cn("text-sm font-bold", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
        暂无模型配置
      </p>
      <button
        onClick={onAdd}
        className={cn(
          "mt-4 h-9 px-4 rounded-lg text-xs font-bold inline-flex items-center gap-2",
          darkMode ? "bg-[#094771] text-white" : "bg-text-main text-white"
        )}
      >
        <Plus size={14} />
        添加模型
      </button>
    </div>
  );
}

function LLMConfigModal({ darkMode, target, providers, selectedCapability, onClose, onSave }: {
  darkMode?: boolean;
  target: DrawerTarget;
  providers: ProviderModelDTO[];
  selectedCapability?: LLMCapability;
  onClose: () => void;
  onSave: (data: ConfigFormData) => void;
}) {
  const isEditing = target.mode === 'edit' && Boolean(target.config);
  const initialProvider = target.provider || providers[0];
  const [providerType, setProviderType] = useState(initialProvider?.providerType || '');
  const selectedProvider = providers.find((provider) => provider.providerType === providerType) || initialProvider;
  const availableModels = selectedProvider?.models || [];
  const filteredModels = selectedCapability
    ? availableModels.filter((model) => model.capabilities.includes(selectedCapability))
    : availableModels;
  const initialModelName =
    target.config?.modelName ||
    target.model?.modelName ||
    filteredModels[0]?.modelName ||
    availableModels[0]?.modelName ||
    '';
  const [modelName, setModelName] = useState(initialModelName);
  const selectedModel = availableModels.find((model) => model.modelName === modelName) || target.model;
  const displayModels = filteredModels.length > 0 ? filteredModels : availableModels;
  const [entryCapability, setEntryCapability] = useState<LLMCapability | ''>(
    target.config?.capability ||
    selectedCapability ||
    selectedModel?.capabilities[0] ||
    ''
  );
  const [configName, setConfigName] = useState(
    target.config?.configName || `${selectedProvider?.providerName || ''} ${initialModelName}`.trim()
  );
  const [apiKey, setApiKey] = useState('');
  const [customApiBaseUrl, setCustomApiBaseUrl] = useState(target.config?.customApiBaseUrl || '');
  const [priority, setPriority] = useState(target.config?.priority || 50);
  const [isDefault, setIsDefault] = useState(target.config?.isDefault || false);
  const [timeoutMs, setTimeoutMs] = useState(target.config?.timeoutMs || 60000);
  const [maxRetries, setMaxRetries] = useState(target.config?.maxRetries || 3);
  const [streamEnabled, setStreamEnabled] = useState(target.config?.streamEnabled ?? true);
  const [extraConfig, setExtraConfig] = useState(target.config?.extraConfig || '');

  const handleProviderChange = (nextProviderType: string) => {
    const nextProvider = providers.find((provider) => provider.providerType === nextProviderType);
    const nextModels = nextProvider?.models || [];
    const nextModel = selectedCapability
      ? nextModels.find((model) => model.capabilities.includes(selectedCapability))
      : nextModels[0];
    setProviderType(nextProviderType);
    setModelName(nextModel?.modelName || '');
    setEntryCapability(selectedCapability || nextModel?.capabilities[0] || '');
    setConfigName(`${nextProvider?.providerName || ''} ${nextModel?.modelName || ''}`.trim());
  };

  const handleModelChange = (nextModelName: string) => {
    const nextModel = availableModels.find((model) => model.modelName === nextModelName);
    setModelName(nextModelName);
    setEntryCapability(selectedCapability || nextModel?.capabilities[0] || '');
    if (!isEditing) {
      setConfigName(`${selectedProvider?.providerName || ''} ${nextModelName}`.trim());
    }
  };

  const handleSubmit = () => {
    if (!providerType || !configName.trim() || !modelName.trim()) {
      return;
    }
    if (!isEditing && !apiKey.trim()) {
      return;
    }

    onSave({
      providerType,
      configName: configName.trim(),
      apiKey: apiKey.trim() || undefined,
      modelName,
      capability: entryCapability || undefined,
      priority,
      isDefault,
      timeoutMs,
      maxRetries,
      streamEnabled,
      customApiBaseUrl: customApiBaseUrl.trim() || undefined,
      extraConfig: extraConfig.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "relative w-full max-w-[760px] max-h-[88vh] rounded-lg shadow-2xl flex flex-col overflow-hidden",
        darkMode ? "bg-[#252526] border border-[#3c3c3c]" : "bg-white border border-border-subtle"
      )}>
        <div className={cn("h-20 px-6 flex items-center justify-between border-b", darkMode ? "border-[#3c3c3c]" : "border-border-subtle")}>
          <div>
            <h3 className={cn("text-lg font-bold", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
              {isEditing ? '编辑配置' : '添加模型'}
            </h3>
            <p className={cn("mono-label mt-1", darkMode ? "text-[#858585]" : "text-text-main/40")}>
              {isEditing ? target.config?.modelName : 'Provider & Model'}
            </p>
          </div>
          <button
            onClick={onClose}
            className={cn("p-2 rounded-lg transition-colors", darkMode ? "text-[#858585] hover:bg-[#2d2d2d]" : "text-text-main/50 hover:bg-gray-100")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-[220px_1fr] h-full min-h-0">
            <aside className={cn(
              "border-r p-4 overflow-y-auto",
              darkMode ? "border-[#3c3c3c] bg-[#1e1e1e]" : "border-border-subtle bg-bg-base/30"
            )}>
              <p className={cn("text-xs font-bold mb-3", darkMode ? "text-[#cccccc]" : "text-text-main")}>
                选择厂商
              </p>
              <div className="space-y-2">
                {providers.map((provider) => {
                  const iconUrl = getProviderIcon(provider.providerType, provider.providerName);
                  const active = provider.providerType === providerType;
                  const selectableCount = selectedCapability
                    ? provider.models.filter((model) => model.capabilities.includes(selectedCapability)).length
                    : provider.models.length;

                  return (
                    <button
                      key={provider.providerType}
                      type="button"
                      onClick={() => handleProviderChange(provider.providerType)}
                      disabled={isEditing}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-60",
                        active
                          ? darkMode ? "border-[#0e639c] bg-[#094771]/40" : "border-text-main bg-text-main text-white"
                          : darkMode ? "border-[#3c3c3c] bg-[#252526] hover:border-[#c586c0]" : "border-border-subtle bg-white/80 hover:border-primary"
                      )}
                    >
                      <ProviderIcon iconUrl={iconUrl} name={provider.providerName} darkMode={darkMode} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{provider.providerName}</p>
                        <p className={cn("text-[10px] mt-0.5", active ? "text-current/65" : darkMode ? "text-[#858585]" : "text-text-main/45")}>
                          {selectableCount} models
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="overflow-y-auto p-5 space-y-5">
              <FormSection darkMode={darkMode} title="模型选择" hint="创建时会按模型支持的能力展开配置">
                <div className="grid grid-cols-2 gap-4">
                  <FieldLabel darkMode={darkMode} label="模型">
                    <select
                      value={modelName}
                      onChange={(event) => handleModelChange(event.target.value)}
                      disabled={isEditing}
                      className={inputClassName(darkMode)}
                    >
                      {displayModels.map((model) => (
                        <option key={model.modelName} value={model.modelName}>
                          {model.modelName}
                        </option>
                      ))}
                      {isEditing && target.config && <option value={target.config.modelName}>{target.config.modelName}</option>}
                    </select>
                  </FieldLabel>

                  <FieldLabel darkMode={darkMode} label="入口能力">
                    <select
                      value={entryCapability}
                      onChange={(event) => setEntryCapability(event.target.value as LLMCapability)}
                      disabled={isEditing}
                      className={inputClassName(darkMode)}
                    >
                      {(selectedModel?.capabilities || [target.config?.capability]).filter(Boolean).map((capability) => {
                        const value = capability as LLMCapability;
                        return (
                          <option key={value} value={value}>
                            {getCapabilityMeta(value).label}
                          </option>
                        );
                      })}
                    </select>
                  </FieldLabel>
                </div>

                {selectedModel && (
                  <div className={cn("rounded-lg px-3 py-3", darkMode ? "bg-[#1e1e1e]" : "bg-bg-base/50")}>
                    <p className={cn("text-[11px]", darkMode ? "text-[#858585]" : "text-text-main/50")}>
                      该模型支持能力
                    </p>
                    <CapabilityChips capabilities={selectedModel.capabilities} darkMode={darkMode} />
                  </div>
                )}
              </FormSection>

              <FormSection darkMode={darkMode} title="基本信息" hint="API Key 会由服务端加密存储">
                <FieldLabel darkMode={darkMode} label="配置名称">
                  <input
                    type="text"
                    value={configName}
                    onChange={(event) => setConfigName(event.target.value)}
                    disabled={isEditing}
                    placeholder="例如：生产环境 GPT-4o"
                    className={inputClassName(darkMode)}
                  />
                </FieldLabel>

                <FieldLabel darkMode={darkMode} label={`API Key ${isEditing ? '' : '(必填)'}`}>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder={isEditing ? '不修改请留空' : '输入 API Key'}
                    className={inputClassName(darkMode)}
                  />
                </FieldLabel>

                <FieldLabel darkMode={darkMode} label="自定义 API 地址">
                  <input
                    type="text"
                    value={customApiBaseUrl}
                    onChange={(event) => setCustomApiBaseUrl(event.target.value)}
                    placeholder="https://proxy.example.com/v1"
                    className={inputClassName(darkMode)}
                  />
                </FieldLabel>
              </FormSection>

              <FormSection darkMode={darkMode} title="运行参数" hint="优先级越高，候选排序越靠前">
                <div className="grid grid-cols-3 gap-4">
                  <FieldLabel darkMode={darkMode} label="优先级">
                    <input
                      type="number"
                      value={priority}
                      onChange={(event) => setPriority(Number(event.target.value))}
                      min={1}
                      max={100}
                      className={inputClassName(darkMode)}
                    />
                  </FieldLabel>
                  <FieldLabel darkMode={darkMode} label="超时 ms">
                    <input
                      type="number"
                      value={timeoutMs}
                      onChange={(event) => setTimeoutMs(Number(event.target.value))}
                      min={1000}
                      step={1000}
                      className={inputClassName(darkMode)}
                    />
                  </FieldLabel>
                  <FieldLabel darkMode={darkMode} label="重试">
                    <input
                      type="number"
                      value={maxRetries}
                      onChange={(event) => setMaxRetries(Number(event.target.value))}
                      min={0}
                      max={10}
                      className={inputClassName(darkMode)}
                    />
                  </FieldLabel>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <CheckToggle
                    darkMode={darkMode}
                    checked={isDefault}
                    label="设为默认"
                    onClick={() => setIsDefault((value) => !value)}
                  />
                  <CheckToggle
                    darkMode={darkMode}
                    checked={streamEnabled}
                    label="流式输出"
                    onClick={() => setStreamEnabled((value) => !value)}
                  />
                </div>
              </FormSection>

              <FormSection darkMode={darkMode} title="额外配置" hint="可选 JSON 字符串，会原样传给后端">
                <textarea
                  value={extraConfig}
                  onChange={(event) => setExtraConfig(event.target.value)}
                  placeholder='{"temperature":0.7}'
                  rows={3}
                  className={cn(inputClassName(darkMode), "resize-none")}
                />
              </FormSection>
            </div>
          </div>
        </div>

        <div className={cn("px-6 py-4 border-t flex items-center justify-end gap-3", darkMode ? "border-[#3c3c3c] bg-[#1e1e1e]" : "border-border-subtle bg-bg-base/30")}>
          <button
            onClick={onClose}
            className={cn("h-9 px-4 rounded-lg text-xs font-bold", darkMode ? "text-[#cccccc] hover:bg-[#2d2d2d]" : "hover:bg-gray-100")}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className={cn(
              "h-9 px-4 rounded-lg text-xs font-bold transition-opacity",
              darkMode ? "bg-[#094771] text-white hover:bg-[#0a5280]" : "bg-text-main text-white hover:opacity-90"
            )}
          >
            {isEditing ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ darkMode, label, children }: {
  darkMode?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={cn("block mb-2 text-xs font-bold", darkMode ? "text-[#cccccc]" : "text-text-main")}>
        {label}
      </span>
      {children}
    </label>
  );
}

function FormSection({ darkMode, title, hint, children }: {
  darkMode?: boolean;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(
      "rounded-lg border p-4 space-y-4",
      darkMode ? "border-[#3c3c3c] bg-[#2d2d2d]" : "border-border-subtle bg-white/70"
    )}>
      <div>
        <h4 className={cn("text-sm font-bold", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
          {title}
        </h4>
        <p className={cn("text-[11px] mt-1", darkMode ? "text-[#858585]" : "text-text-main/50")}>
          {hint}
        </p>
      </div>
      {children}
    </section>
  );
}

function CheckToggle({ darkMode, checked, label, onClick }: {
  darkMode?: boolean;
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
        darkMode ? "border-[#3c3c3c] hover:bg-[#2d2d2d]" : "border-border-subtle hover:bg-primary/5"
      )}
    >
      <span className={cn(
        "w-5 h-5 rounded flex items-center justify-center transition-colors",
        checked ? "bg-primary text-white" : darkMode ? "border border-[#3c3c3c]" : "border border-border-subtle"
      )}>
        {checked && <Check size={12} />}
      </span>
      <span className={cn("text-xs font-bold", darkMode ? "text-[#cccccc]" : "text-text-main")}>{label}</span>
    </button>
  );
}

function inputClassName(darkMode?: boolean) {
  return cn(
    "w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:border-primary",
    darkMode
      ? "bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b] disabled:text-[#858585]"
      : "bg-bg-base/50 border-border-subtle text-text-main disabled:text-text-main/50"
  );
}
