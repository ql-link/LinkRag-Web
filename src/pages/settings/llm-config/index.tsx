import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, Check, X, RefreshCw, Key, Search,
  ChevronDown, ChevronUp, Box, MessageSquare, AudioLines
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Routes } from '@/routes';
import { getLLMConfigs, createLLMConfig, updateLLMConfig, deleteLLMConfig } from '@/services/llm';
import type { LLMConfigDTO } from '@/types/api';

// Import provider icons
import OpenAIIcon from '@/../icons/providers/openai.svg';
import AnthropicIcon from '@/../icons/providers/anthropic.svg';
import OllamaIcon from '@/../icons/providers/ollama.svg';
import DeepSeekIcon from '@/../icons/providers/deepseek-color.svg';
import GoogleIcon from '@/../icons/providers/gemini-color.svg';
import QwenIcon from '@/../icons/providers/qwen-color.svg';
import MetaIcon from '@/../icons/providers/meta-color.svg';

interface LLMPageProps {
  darkMode?: boolean;
}

interface LLMFactory {
  name: string;
  tags: string;
}

const AVAILABLE_FACTORIES: LLMFactory[] = [
  { name: 'OpenAI', tags: 'LLM' },
  { name: 'Anthropic', tags: 'LLM' },
  { name: 'Ollama', tags: 'LLM' },
  { name: 'Azure OpenAI', tags: 'LLM' },
  { name: 'Google AI', tags: 'LLM' },
  { name: 'DeepSeek', tags: 'LLM' },
  { name: 'Qwen', tags: 'LLM' },
  { name: 'Embedding Model', tags: 'TEXT EMBEDDING' },
  { name: 'Rerank Model', tags: 'TEXT RE-RANK' },
];

// Provider icons as actual SVG imports
const PROVIDER_ICON_URLS: Record<string, string> = {
  'OpenAI': OpenAIIcon,
  'Anthropic': AnthropicIcon,
  'Ollama': OllamaIcon,
  'Azure OpenAI': OpenAIIcon,
  'Google AI': GoogleIcon,
  'DeepSeek': DeepSeekIcon,
  'Qwen': QwenIcon,
  'Embedding Model': '',
  'Rerank Model': '',
};

const MODEL_MAP: Record<string, string[]> = {
  'OpenAI': ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  'Anthropic': ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
  'Ollama': ['llama3', 'llama3.1', 'qwen2.5', 'deepseek-v2'],
  'Azure OpenAI': ['gpt-4o', 'gpt-4', 'gpt-35-turbo'],
  'Google AI': ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
  'DeepSeek': ['deepseek-chat', 'deepseek-coder'],
  'Qwen': ['qwen-turbo', 'qwen-plus', 'qwen-max'],
  'Embedding Model': ['text-embedding-3-large', 'text-embedding-ada-002'],
  'Rerank Model': ['bge-reranker-base', 'cohere-rerank'],
};

const MODEL_SPECS: Record<string, { context: string; input: string; output: string; features: string[] }> = {
  'gpt-4o': { context: '128K', input: '$5/M', output: '$15/M', features: ['Vision', 'Function calling'] },
  'gpt-4o-mini': { context: '128K', input: '$0.15/M', output: '$0.60/M', features: ['Fast', 'Vision'] },
  'gpt-4-turbo': { context: '128K', input: '$10/M', output: '$30/M', features: ['Vision', 'Function calling'] },
  'gpt-3.5-turbo': { context: '16K', input: '$0.50/M', output: '$1.50/M', features: ['Fast', 'Cost effective'] },
  'claude-3-5-sonnet': { context: '200K', input: '$3/M', output: '$15/M', features: ['Vision', 'Extended thinking'] },
  'claude-3-opus': { context: '200K', input: '$15/M', output: '$75/M', features: ['Vision', 'Extended thinking'] },
  'claude-3-haiku': { context: '200K', input: '$0.25/M', output: '$1.25/M', features: ['Fast', 'Cost effective'] },
  'gemini-1.5-pro': { context: '1M', input: '$1.25/M', output: '$5/M', features: ['Vision', '1M context'] },
  'gemini-1.5-flash': { context: '1M', input: '$0.075/M', output: '$0.30/M', features: ['Fast', '1M context'] },
  'deepseek-chat': { context: '32K', input: '$0.14/M', output: '$0.28/M', features: ['Chinese optimized', 'Code'] },
  'deepseek-coder': { context: '32K', input: '$0.14/M', output: '$0.28/M', features: ['Code specialized'] },
  'llama3': { context: '8K', input: 'Free', output: 'Free', features: ['Open source', 'Meta'] },
  'llama3.1': { context: '128K', input: 'Free', output: 'Free', features: ['Open source', '128K context'] },
};

const TAG_MAP: Record<string, string> = {
  'LLM': 'LLM',
  'TEXT EMBEDDING': 'Embedding',
  'TEXT RE-RANK': 'Rerank',
};

export default function LLMPage({ darkMode }: LLMPageProps) {
  const [configs, setConfigs] = useState<LLMConfigDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<LLMConfigDTO | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState<string | null>(null);
  const [expandedFactory, setExpandedFactory] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const result = await getLLMConfigs();
      setConfigs(result);
    } catch (error) {
      console.error('Failed to load LLM configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExpandFactory = (factoryName: string) => {
    setExpandedFactory(expandedFactory === factoryName ? null : factoryName);
    setSelectedModel(null);
  };

  const handleAddFactory = (factoryName: string, modelName?: string) => {
    setSelectedFactory(factoryName);
    setSelectedModel(modelName || null);
    setShowAddModal(true);
  };

  const handleEditConfig = (config: LLMConfigDTO) => {
    setEditingConfig(config);
    setSelectedFactory(config.providerType);
    setShowAddModal(true);
  };

  const handleDeleteConfig = async (id: number) => {
    if (!confirm('确定要删除这个模型配置吗？')) return;
    try {
      await deleteLLMConfig(id);
      setConfigs((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Failed to delete config:', error);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await updateLLMConfig(id, { isDefault: true });
      setConfigs((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })));
    } catch (error) {
      console.error('Failed to set default:', error);
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await updateLLMConfig(id, { isActive });
      setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, isActive } : c)));
    } catch (error) {
      console.error('Failed to toggle active:', error);
    }
  };

  const handleConfigSave = async (data: any) => {
    try {
      if (editingConfig) {
        await updateLLMConfig(editingConfig.id, data);
        setConfigs((prev) =>
          prev.map((c) => (c.id === editingConfig.id ? { ...c, ...data } : c))
        );
      } else {
        const newConfig = await createLLMConfig(data);
        setConfigs((prev) => [newConfig, ...prev]);
      }
      setShowAddModal(false);
      setEditingConfig(null);
      setSelectedFactory(null);
      setSelectedModel(null);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    AVAILABLE_FACTORIES.forEach((f) => {
      f.tags.split(',').forEach((tag) => tagsSet.add(tag.trim()));
    });
    return Array.from(tagsSet);
  }, []);

  const filteredFactories = useMemo(() => {
    return AVAILABLE_FACTORIES.filter((factory) => {
      const matchesSearch = factory.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = selectedTag === null || factory.tags.split(',').some((tag) => tag.trim() === selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [searchTerm, selectedTag]);

  const getFactoryConfigs = (factoryName: string) => {
    return configs.filter((c) => c.providerType === factoryName);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className={cn(
        "h-20 px-8 flex items-center justify-between shrink-0 backdrop-blur-md",
        darkMode ? "bg-[#252526] border-[#3c3c3c]" : "bg-white/80 border-border-subtle border-b"
      )}>
        <div className="flex flex-col gap-1">
          <Breadcrumb
            items={[
              { label: '首页', path: Routes.Home },
              { label: '设置' },
              { label: '模型配置' }
            ]}
            darkMode={darkMode}
          />
          <h2 className={cn("text-xl serif-heading", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
            模型配置
          </h2>
        </div>
        <button
          onClick={loadConfigs}
          className={cn(
            "p-2 rounded-xl transition-colors",
            darkMode ? "text-[#858585] hover:bg-[#2d2d2d]" : "text-text-main/50 hover:bg-primary/5"
          )}
        >
          <RefreshCw size={16} />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="flex-1 flex flex-col border-r border-dashed overflow-y-auto">
          {/* System Default Settings */}
          <div className={cn("p-6 border-b border-dashed", darkMode ? "border-[#3c3c3c]" : "border-border-subtle")}>
            <h3 className={cn("text-lg font-bold mb-1", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
              系统默认模型
            </h3>
            <p className={cn("text-xs mb-4", darkMode ? "text-[#858585]" : "text-text-main/50")}>
              设置对话、Embedding、Rerank 等默认模型
            </p>

            <div className={cn(
              "rounded-2xl p-5 space-y-4",
              darkMode ? "bg-[#2d2d2d] border border-[#3c3c3c]" : "bg-bg-base/30 border border-border-subtle"
            )}>
              {['llm_id', 'embd_id', 'rerank_id'].map((field, idx) => {
                const labels = ['对话模型', 'Embedding 模型', 'Rerank 模型'];
                return (
                  <div key={field} className="flex items-center gap-4">
                    <span className={cn("w-28 text-xs font-bold uppercase tracking-wider", darkMode ? "text-[#cccccc]" : "text-text-main")}>
                      {labels[idx]}
                    </span>
                    <div className="flex-1 relative">
                      <select className={cn(
                        "w-full px-4 py-2.5 rounded-xl text-sm appearance-none focus:outline-none focus:border-[#c586c0]",
                        darkMode ? "bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0]" : "bg-white border-border-subtle"
                      )}>
                        <option value="">选择{labels[idx].replace('模型', '')}</option>
                        {configs.filter(c => c.isActive).map((c) => (
                          <option key={c.id} value={c.id}>{c.configName} - {c.modelName}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className={cn(
                        "absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none",
                        darkMode ? "text-[#858585]" : "text-text-main/40"
                      )} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Added Models */}
          <div className="flex-1 p-6">
            <h3 className={cn("text-lg font-bold mb-4", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
              已添加的模型
            </h3>

            {loading ? (
              <div className={cn("flex items-center justify-center py-16", darkMode ? "text-[#858585]" : "")}>
                <RefreshCw size={20} className="animate-spin mr-2" />
                <span>加载中...</span>
              </div>
            ) : configs.length === 0 ? (
              <div className={cn(
                "text-center py-16 rounded-2xl",
                darkMode ? "bg-[#2d2d2d] border border-[#3c3c3c]" : "bg-bg-base/30"
              )}>
                <Key size={40} className={cn("mx-auto mb-4 opacity-50", darkMode ? "text-[#6b6b6b]" : "text-text-main/20")} />
                <p className={cn("text-sm font-medium mb-1", darkMode ? "text-[#e0e0e0]" : "")}>
                  暂无已添加的模型
                </p>
                <p className={cn("text-xs", darkMode ? "text-[#858585]" : "text-text-main/50")}>
                  从右侧选择提供商添加模型
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {configs.map((config) => {
                  const iconUrl = PROVIDER_ICON_URLS[config.providerType];
                  return (
                    <div
                      key={config.id}
                      className={cn(
                        "rounded-2xl p-4 transition-all",
                        darkMode ? "bg-[#2d2d2d] border border-[#3c3c3c] hover:border-[#c586c0]" : "bg-white border-border-subtle hover:border-primary"
                      )}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {iconUrl ? (
                          <img src={iconUrl} alt={config.providerType} className="w-10 h-10 rounded-xl object-contain" />
                        ) : (
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            darkMode ? "bg-[#3c3c3c]" : "bg-primary/10"
                          )}>
                            <Box size={18} className={darkMode ? "text-[#c586c0]" : "text-primary"} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-bold uppercase tracking-wider truncate", darkMode ? "text-[#e0e0e0]" : "")}>
                            {config.configName}
                          </p>
                          <p className={cn("mono-label text-[10px] mt-0.5", darkMode ? "text-[#858585]" : "text-text-main/50")}>
                            {config.providerType} · {config.modelName}
                          </p>
                        </div>
                      </div>

                      <div className={cn(
                        "flex items-center justify-between text-[10px] py-2 px-3 rounded-xl mb-3",
                        darkMode ? "bg-[#1e1e1e]" : "bg-bg-base/50"
                      )}>
                        <div className="flex items-center gap-3">
                          <span className={darkMode ? "text-[#6b6b6b]" : "text-text-main/40"}>超时</span>
                          <span className={darkMode ? "text-[#cccccc]" : ""}>{config.timeoutMs}ms</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {config.isDefault ? (
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold",
                              darkMode ? "bg-[#094771] text-blue-400" : "bg-blue-100 text-blue-600"
                            )}>默认</span>
                          ) : (
                            <button
                              onClick={() => handleSetDefault(config.id)}
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-bold transition-colors",
                                darkMode ? "text-[#6b6b6b] hover:bg-[#3c3c3c]" : "text-text-main/40 hover:bg-primary/5"
                              )}
                            >设为默认</button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold uppercase",
                          config.isActive
                            ? darkMode ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-600"
                            : darkMode ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"
                        )}>{config.isActive ? '已启用' : '已禁用'}</span>
                        <button
                          onClick={() => handleEditConfig(config)}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors text-center",
                            darkMode ? "text-[#cccccc] hover:bg-[#3c3c3c]" : "hover:bg-primary/5"
                          )}
                        >编辑</button>
                        <button
                          onClick={() => handleDeleteConfig(config.id)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            darkMode ? "text-red-400 hover:bg-red-900/30" : "text-red-500 hover:bg-red-50"
                          )}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Available Models */}
        <div className="w-[420px] flex flex-col overflow-hidden">
          <div className={cn("p-5 border-b border-dashed", darkMode ? "border-[#3c3c3c]" : "border-border-subtle")}>
            <h3 className={cn("text-base font-bold mb-4", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
              可用模型
            </h3>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={14} className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2",
                darkMode ? "text-[#858585]" : "text-text-main/30"
              )} />
              <input
                type="text"
                placeholder="搜索模型提供商..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "w-full pl-9 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#c586c0]",
                  darkMode
                    ? "bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]"
                    : "bg-bg-base/50 border-border-subtle"
                )}
              />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors",
                  selectedTag === null
                    ? darkMode ? "bg-[#094771] text-white" : "bg-text-main text-white"
                    : darkMode ? "bg-[#2d2d2d] text-[#858585]" : "bg-bg-base text-text-main/50"
                )}
              >
                全部
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors",
                    selectedTag === tag
                      ? darkMode ? "bg-[#094771] text-white" : "bg-text-main text-white"
                      : darkMode ? "bg-[#2d2d2d] text-[#858585]" : "bg-bg-base text-text-main/50"
                  )}
                >
                  {TAG_MAP[tag] || tag}
                </button>
              ))}
            </div>
          </div>

          {/* Factory List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredFactories.map((factory) => {
              const iconUrl = PROVIDER_ICON_URLS[factory.name];
              const factoryConfigs = getFactoryConfigs(factory.name);
              const isExpanded = expandedFactory === factory.name;
              const models = MODEL_MAP[factory.name] || [];

              return (
                <div
                  key={factory.name}
                  className={cn(
                    "rounded-2xl overflow-hidden border transition-all",
                    darkMode
                      ? "border-[#3c3c3c]"
                      : "border-border-subtle",
                    isExpanded && (darkMode ? "border-[#c586c0] shadow-lg shadow-black/20" : "border-primary shadow-lg shadow-primary/10")
                  )}
                >
                  {/* Factory Header */}
                  <div
                    className={cn(
                      "flex items-center justify-between p-4 cursor-pointer transition-colors",
                      darkMode ? "bg-[#2d2d2d]" : "bg-bg-base/50",
                      isExpanded && (darkMode ? "bg-[#1e1e1e]" : "bg-primary/5")
                    )}
                    onClick={() => handleExpandFactory(factory.name)}
                  >
                    <div className="flex items-center gap-4">
                      {iconUrl ? (
                        <img src={iconUrl} alt={factory.name} className="w-12 h-12 rounded-xl object-contain" style={{ background: darkMode ? '#3c3c3c' : 'white' }} />
                      ) : (
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                          darkMode ? "bg-[#3c3c3c]" : "bg-white shadow-sm"
                        )}>
                          <Box size={22} className={darkMode ? "text-[#c586c0]" : "text-primary"} />
                        </div>
                      )}
                      <div>
                        <p className={cn("text-sm font-bold uppercase tracking-wider", darkMode ? "text-[#e0e0e0]" : "")}>
                          {factory.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {factoryConfigs.length > 0 ? (
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold",
                              darkMode ? "bg-[#094771] text-blue-400" : "bg-blue-100 text-blue-600"
                            )}>
                              {factoryConfigs.length} 已添加
                            </span>
                          ) : (
                            <span className={cn("text-[10px]", darkMode ? "text-[#6b6b6b]" : "text-text-main/40")}>
                              尚未添加
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronUp size={18} className={darkMode ? "text-[#858585]" : "text-primary"} />
                      ) : (
                        <ChevronDown size={18} className={darkMode ? "text-[#858585]" : "text-text-main/40"} />
                      )}
                    </div>
                  </div>

                  {/* Models */}
                  {isExpanded && (
                    <div className={cn(
                      "p-4 border-t space-y-2",
                      darkMode ? "border-[#3c3c3c] bg-[#1e1e1e]" : "border-border-subtle bg-white"
                    )}>
                      <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-3", darkMode ? "text-[#6b6b6b]" : "text-text-main/40")}>
                        选择模型
                      </p>
                      {models.map((model) => {
                        const specs = MODEL_SPECS[model];
                        const isAdded = factoryConfigs.some(c => c.modelName === model);

                        return (
                          <div
                            key={model}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group",
                              darkMode ? "bg-[#2d2d2d] hover:bg-[#3c3c3c]" : "bg-bg-base/30 hover:bg-primary/5",
                              isAdded && (darkMode ? "border border-[#094771]" : "border border-primary")
                            )}
                            onClick={() => !isAdded && handleAddFactory(factory.name, model)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn(
                                  "text-xs font-bold uppercase tracking-wider",
                                  darkMode ? "text-[#e0e0e0]" : ""
                                )}>
                                  {model}
                                </span>
                                {isAdded && (
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[9px] font-bold",
                                    darkMode ? "bg-green-900/50 text-green-400" : "bg-green-100 text-green-600"
                                  )}>已添加</span>
                                )}
                              </div>
                              {specs && (
                                <div className="flex items-center gap-3 text-[10px]">
                                  <span className={cn("flex items-center gap-1", darkMode ? "text-[#6b6b6b]" : "text-text-main/40")}>
                                    <span className="font-medium">{specs.context}</span>
                                    <span>上下文</span>
                                  </span>
                                  <span className={cn("flex items-center gap-1", darkMode ? "text-[#6b6b6b]" : "text-text-main/40")}>
                                    <span className="font-medium text-[9px]">{specs.input}</span>
                                  </span>
                                </div>
                              )}
                            </div>
                            {!isAdded && (
                              <button
                                className={cn(
                                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                                  darkMode
                                    ? "bg-[#094771] text-white opacity-0 group-hover:opacity-100"
                                    : "bg-text-main text-white opacity-0 group-hover:opacity-100"
                                )}
                              >
                                <Plus size={10} />
                                添加
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <LLMConfigModal
          darkMode={darkMode}
          factory={selectedFactory!}
          modelName={selectedModel}
          config={editingConfig}
          onClose={() => {
            setShowAddModal(false);
            setEditingConfig(null);
            setSelectedFactory(null);
            setSelectedModel(null);
          }}
          onSave={handleConfigSave}
        />
      )}
    </div>
  );
}

interface LLMConfigModalProps {
  darkMode?: boolean;
  factory: string;
  modelName?: string | null;
  config?: LLMConfigDTO;
  onClose: () => void;
  onSave: (data: any) => void;
}

function LLMConfigModal({ darkMode, factory, modelName, config, onClose, onSave }: LLMConfigModalProps) {
  const [configName, setConfigName] = useState(config?.configName || `${factory} Config`);
  const [apiKey, setApiKey] = useState('');
  const [modelNameInput, setModelNameInput] = useState(config?.modelName || modelName || '');
  const [apiBase, setApiBase] = useState(config?.customApiBaseUrl || '');
  const [priority, setPriority] = useState(config?.priority || 1);
  const [isDefault, setIsDefault] = useState(config?.isDefault || false);
  const [timeoutMs, setTimeoutMs] = useState(config?.timeoutMs || 120000);
  const [maxRetries, setMaxRetries] = useState(config?.maxRetries || 3);
  const [streamEnabled, setStreamEnabled] = useState(config?.streamEnabled ?? true);

  const models = MODEL_MAP[factory] || [];

  const handleSubmit = () => {
    if (!configName.trim() || !modelNameInput.trim()) return;
    onSave({
      providerType: factory,
      configName,
      apiKey,
      modelName: modelNameInput,
      priority,
      isDefault,
      timeoutMs,
      maxRetries,
      streamEnabled,
      extraConfig: apiBase ? JSON.stringify({ api_base: apiBase }) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "relative w-[480px] rounded-2xl shadow-2xl overflow-hidden",
        darkMode ? "bg-[#252526] border border-[#3c3c3c]" : "bg-white border-border-subtle"
      )}>
        <div className={cn("flex items-center justify-between px-6 py-4 border-b", darkMode ? "border-[#3c3c3c]" : "border-border-subtle")}>
          <h3 className={cn("text-lg font-bold", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
            {config ? '编辑' : '添加'} {factory} 配置
          </h3>
          <button onClick={onClose} className={cn("p-2 rounded-xl hover:bg-[#2d2d2d]", darkMode ? "text-[#858585]" : "text-text-main/50")}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          <div>
            <label className={cn("block mb-2 text-xs font-bold uppercase tracking-wider", darkMode ? "text-[#cccccc]" : "text-text-main")}>
              配置名称
            </label>
            <input
              type="text"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="例如：我的 GPT-4"
              className={cn(
                "w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#c586c0]",
                darkMode
                  ? "bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]"
                  : "bg-bg-base/50 border-border-subtle"
              )}
            />
          </div>

          <div>
            <label className={cn("block mb-2 text-xs font-bold uppercase tracking-wider", darkMode ? "text-[#cccccc]" : "text-text-main")}>
              API Key {!config && '(必填)'}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config ? '不修改请留空' : '输入 API Key'}
              className={cn(
                "w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#c586c0]",
                darkMode
                  ? "bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]"
                  : "bg-bg-base/50 border-border-subtle"
              )}
            />
          </div>

          <div>
            <label className={cn("block mb-2 text-xs font-bold uppercase tracking-wider", darkMode ? "text-[#cccccc]" : "text-text-main")}>
              模型 {!config && '(必填)'}
            </label>
            <select
              value={modelNameInput}
              onChange={(e) => setModelNameInput(e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#c586c0]",
                darkMode
                  ? "bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0]"
                  : "bg-bg-base/50 border-border-subtle"
              )}
            >
              <option value="">选择模型</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {factory === 'Ollama' && (
            <div>
              <label className={cn("block mb-2 text-xs font-bold uppercase tracking-wider", darkMode ? "text-[#cccccc]" : "text-text-main")}>
                API Base URL
              </label>
              <input
                type="text"
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                placeholder="http://localhost:11434"
                className={cn(
                  "w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#c586c0]",
                  darkMode
                    ? "bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]"
                    : "bg-bg-base/50 border-border-subtle"
                )}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={cn("block mb-2 text-xs font-bold uppercase tracking-wider", darkMode ? "text-[#cccccc]" : "text-text-main")}>
                优先级
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                min={1}
                max={100}
                className={cn(
                  "w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#c586c0]",
                  darkMode
                    ? "bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0]"
                    : "bg-bg-base/50 border-border-subtle"
                )}
              />
            </div>
            <div>
              <label className={cn("block mb-2 text-xs font-bold uppercase tracking-wider", darkMode ? "text-[#cccccc]" : "text-text-main")}>
                超时 (ms)
              </label>
              <input
                type="number"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                min={1000}
                step={1000}
                className={cn(
                  "w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#c586c0]",
                  darkMode
                    ? "bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0]"
                    : "bg-bg-base/50 border-border-subtle"
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => setIsDefault(!isDefault)}
              className={cn(
                "w-5 h-5 rounded-lg flex items-center justify-center transition-colors",
                isDefault ? "bg-[#c586c0] text-white" : darkMode ? "border border-[#3c3c3c]" : "border border-border-subtle"
              )}
            >
              {isDefault && <Check size={12} />}
            </button>
            <span className={cn("text-xs font-medium", darkMode ? "text-[#cccccc]" : "text-text-main")}>
              设为默认模型
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setStreamEnabled(!streamEnabled)}
              className={cn(
                "w-5 h-5 rounded-lg flex items-center justify-center transition-colors",
                streamEnabled ? "bg-[#c586c0] text-white" : darkMode ? "border border-[#3c3c3c]" : "border border-border-subtle"
              )}
            >
              {streamEnabled && <Check size={12} />}
            </button>
            <span className={cn("text-xs font-medium", darkMode ? "text-[#cccccc]" : "text-text-main")}>
              启用流式输出
            </span>
          </div>
        </div>

        <div className={cn("flex items-center justify-end gap-3 px-6 py-4 border-t", darkMode ? "border-[#3c3c3c] bg-[#1e1e1e]" : "border-border-subtle bg-bg-base/30")}>
          <button
            onClick={onClose}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors",
              darkMode ? "text-[#cccccc] hover:bg-[#2d2d2d]" : "hover:bg-gray-100"
            )}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-opacity",
              darkMode ? "bg-[#094771] text-white hover:bg-[#0a5280]" : "bg-text-main text-white hover:opacity-90"
            )}
          >
            {config ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </div>
  );
}
