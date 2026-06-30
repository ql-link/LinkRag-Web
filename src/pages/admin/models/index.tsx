import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  ChevronDown,
  Edit2,
  KeyRound,
  Loader2,
  Plus,
  Power,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { getModelDisplayName } from '@/lib/model-display';
import { getProviderIcon, isProviderIconMonochrome } from '@/lib/provider-icons';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import {
  addAdminProviderModel,
  createAdminProvider,
  createAdminSystemPreset,
  deleteAdminProvider,
  deleteAdminProviderModel,
  deleteAdminSystemPreset,
  listAdminProviderModels,
  listAdminProviders,
  listAdminSystemPresets,
  toggleAdminProvider,
  toggleAdminProviderModel,
  updateAdminProvider,
  updateAdminProviderModel,
  updateAdminSystemPreset,
} from '@/services/llm';
import type {
  CreateProviderRequest,
  LLMCapability,
  LLMProtocol,
  ProviderModel,
  SystemPreset,
  SystemProvider,
  UpdatePresetRequest,
  UpdateProviderModelRequest,
  UpdateProviderRequest,
} from '@/types/api';

const CAPABILITIES: Array<{ value: LLMCapability; label: string }> = [
  { value: 'CHAT', label: '对话' },
  { value: 'EMBEDDING', label: '稠密向量' },
  { value: 'SPARSE_EMBEDDING', label: '稀疏向量' },
  { value: 'VISION', label: '视觉' },
  { value: 'RERANK', label: '重排' },
  { value: 'ASR', label: '语音识别' },
];

const PROTOCOLS: LLMProtocol[] = ['openai', 'anthropic', 'google', 'jina', 'dashscope'];
const LINKRAG_PROVIDER_TYPE = 'linkrag';
type ModelStatusFilter = 'all' | 'active' | 'inactive';

const MODEL_STATUS_FILTERS: Array<{ value: ModelStatusFilter; label: string; dotClassName: string }> = [
  { value: 'all', label: '全部', dotClassName: 'bg-muted-soft' },
  { value: 'active', label: '上架', dotClassName: 'bg-success' },
  { value: 'inactive', label: '下架', dotClassName: 'bg-muted-soft' },
];

const providerInitialState: CreateProviderRequest = {
  providerType: '',
  providerName: '',
  apiBaseUrl: '',
  defaultProtocol: 'openai',
  isActive: true,
  priority: 50,
};

const modelInitialState = {
  providerId: '',
  modelName: '',
  displayName: '',
  capability: 'CHAT' as LLMCapability,
  protocol: 'openai' as LLMProtocol,
  apiBaseUrl: '',
  isActive: true,
  apiKey: '',
  isDefault: false,
};

function capabilityLabel(value: string) {
  return CAPABILITIES.find((item) => item.value === value)?.label || value;
}

function presetMaskedKey(preset: SystemPreset | null | undefined) {
  return preset?.apiKeyMasked || preset?.apiKey || '';
}

function findPresetForModel(
  presets: SystemPreset[],
  model: Pick<ProviderModel, 'providerId' | 'modelName' | 'capability'>,
) {
  return presets.find(
    (preset) =>
      preset.providerId === model.providerId &&
      preset.modelName === model.modelName &&
      preset.capability === model.capability,
  );
}

function normalizeProviderToken(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function isLinkRagProvider(provider: Pick<SystemProvider, 'providerType' | 'providerName'> | null | undefined) {
  const providerType = normalizeProviderToken(provider?.providerType);
  const providerName = normalizeProviderToken(provider?.providerName);
  return providerType === LINKRAG_PROVIDER_TYPE || providerName === LINKRAG_PROVIDER_TYPE;
}

function matchesKeyword(values: Array<string | number | boolean | null | undefined>, keyword: string) {
  if (!keyword) return true;
  return values.some((value) =>
    String(value ?? '')
      .toLowerCase()
      .includes(keyword),
  );
}

export default function AdminModelsPage() {
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [providers, setProviders] = useState<SystemProvider[]>([]);
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [presets, setPresets] = useState<SystemPreset[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [modelFilters, setModelFilters] = useState<{
    capability: '' | LLMCapability;
    status: ModelStatusFilter;
  }>({
    capability: '',
    status: 'all',
  });
  const [providerForm, setProviderForm] = useState<CreateProviderRequest>(providerInitialState);
  const [editingProvider, setEditingProvider] = useState<SystemProvider | null>(null);
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [modelForm, setModelForm] = useState(modelInitialState);
  const [editingModel, setEditingModel] = useState<ProviderModel | null>(null);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [providerResult, modelResult, presetResult] = await Promise.all([
        listAdminProviders(1, 500),
        listAdminProviderModels({ page: 1, size: 500 }),
        listAdminSystemPresets(),
      ]);
      setProviders(providerResult.items || []);
      setModels(modelResult.items || []);
      setPresets(presetResult || []);
    } catch (error) {
      console.error(error);
      addToast('error', '模型管理数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (providers.length === 0) {
      setSelectedProviderId(null);
      return;
    }
    if (!selectedProviderId || !providers.some((provider) => provider.id === selectedProviderId)) {
      setSelectedProviderId(providers[0].id);
    }
  }, [providers, selectedProviderId]);

  const keyword = query.trim().toLowerCase();
  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selectedProviderId) || null,
    [providers, selectedProviderId],
  );

  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      const providerModels = models.filter((model) => model.providerId === provider.id);
      const providerPresets = isLinkRagProvider(provider)
        ? presets.filter((preset) => preset.providerId === provider.id)
        : [];
      return matchesKeyword(
        [
          provider.providerName,
          provider.providerType,
          provider.defaultProtocol,
          provider.apiBaseUrl,
          ...providerModels.flatMap((model) => [
            model.modelName,
            model.displayName || '',
            model.capability,
            model.protocol,
            model.apiBaseUrl,
          ]),
          ...providerPresets.flatMap((preset) => [
            preset.modelName,
            preset.displayName || '',
            preset.capability,
            preset.protocol,
            preset.apiBaseUrl,
            presetMaskedKey(preset),
          ]),
        ],
        keyword,
      );
    });
  }, [keyword, models, presets, providers]);

  const selectedModels = useMemo(() => {
    if (!selectedProvider) return [];
    return models
      .filter((model) => model.providerId === selectedProvider.id)
      .filter((model) => {
        if (modelFilters.capability && model.capability !== modelFilters.capability) return false;
        if (modelFilters.status === 'active' && !model.isActive) return false;
        if (modelFilters.status === 'inactive' && model.isActive) return false;
        return matchesKeyword(
          [model.modelName, model.displayName || '', model.capability, model.protocol, model.apiBaseUrl],
          keyword,
        );
      })
      .sort((a, b) => `${a.modelName}${a.capability}`.localeCompare(`${b.modelName}${b.capability}`));
  }, [keyword, modelFilters.capability, modelFilters.status, models, selectedProvider]);

  const selectedPresets = useMemo(() => {
    if (!selectedProvider || !isLinkRagProvider(selectedProvider)) return [];
    return presets
      .filter((preset) => preset.providerId === selectedProvider.id)
      .filter((preset) =>
        matchesKeyword(
          [
            preset.modelName,
            preset.displayName || '',
            preset.capability,
            preset.protocol,
            preset.apiBaseUrl,
            presetMaskedKey(preset),
          ],
          keyword,
        ),
      )
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.capability.localeCompare(b.capability));
  }, [keyword, presets, selectedProvider]);

  const selectedProviderModels = useMemo(() => {
    if (!selectedProvider) return [];
    return models.filter((model) => model.providerId === selectedProvider.id);
  }, [models, selectedProvider]);

  function openCreateProvider() {
    setEditingProvider(null);
    setProviderForm(providerInitialState);
    setProviderDialogOpen(true);
  }

  function openEditProvider(provider: SystemProvider) {
    setEditingProvider(provider);
    setProviderForm({
      providerType: provider.providerType,
      providerName: provider.providerName,
      apiBaseUrl: provider.apiBaseUrl,
      defaultProtocol: provider.defaultProtocol,
      isActive: provider.isActive,
      priority: provider.priority,
    });
    setProviderDialogOpen(true);
  }

  async function handleSubmitProvider(event: FormEvent) {
    event.preventDefault();
    try {
      if (editingProvider) {
        const payload: UpdateProviderRequest = {
          providerName: providerForm.providerName.trim(),
          apiBaseUrl: providerForm.apiBaseUrl.trim(),
          defaultProtocol: providerForm.defaultProtocol,
          isActive: providerForm.isActive,
          priority: Number(providerForm.priority),
        };
        await updateAdminProvider(editingProvider.id, payload);
      } else {
        await createAdminProvider({
          ...providerForm,
          providerType: providerForm.providerType.trim(),
          providerName: providerForm.providerName.trim(),
          apiBaseUrl: providerForm.apiBaseUrl.trim(),
          priority: Number(providerForm.priority),
        });
      }
      setProviderDialogOpen(false);
      addToast('success', editingProvider ? '厂商已更新' : '厂商已创建');
      await loadData();
    } catch (error) {
      console.error(error);
      addToast('error', '厂商保存失败');
    }
  }

  function openCreateModel(provider?: SystemProvider | null) {
    const targetProvider = provider ?? selectedProvider ?? providers[0];
    setEditingModel(null);
    setModelForm({
      ...modelInitialState,
      providerId: targetProvider ? String(targetProvider.id) : '',
      displayName: '',
      protocol: targetProvider?.defaultProtocol ?? 'openai',
      apiBaseUrl: targetProvider?.apiBaseUrl ?? '',
      apiKey: '',
      isDefault: false,
    });
    setModelDialogOpen(true);
  }

  function openEditModel(model: ProviderModel) {
    const preset = findPresetForModel(presets, model);
    setEditingModel(model);
    setModelForm({
      providerId: String(model.providerId),
      modelName: model.modelName,
      displayName: model.displayName ?? '',
      capability: model.capability as LLMCapability,
      protocol: model.protocol,
      apiBaseUrl: model.apiBaseUrl,
      isActive: model.isActive,
      apiKey: '',
      isDefault: Boolean(preset?.isDefault),
    });
    setModelDialogOpen(true);
  }

  async function handleSubmitModel(event: FormEvent) {
    event.preventDefault();
    const targetProvider = providers.find((provider) => provider.id === Number(modelForm.providerId));
    const linkRagModel = isLinkRagProvider(targetProvider);
    const existingPreset = editingModel ? findPresetForModel(presets, editingModel) : undefined;
    if (linkRagModel && !modelForm.apiKey.trim() && !existingPreset) {
      addToast('error', 'LinkRAG 模型需要填写平台 API Key');
      return;
    }

    try {
      if (editingModel) {
        const payload: UpdateProviderModelRequest = {
          modelName: modelForm.modelName.trim(),
          displayName: modelForm.displayName.trim(),
          capability: modelForm.capability,
          protocol: modelForm.protocol,
          apiBaseUrl: modelForm.apiBaseUrl.trim(),
          isActive: modelForm.isActive,
        };
        await updateAdminProviderModel(editingModel.id, payload);
        if (linkRagModel) {
          if (existingPreset) {
            const presetPayload: UpdatePresetRequest = {
              providerId: Number(modelForm.providerId),
              modelName: modelForm.modelName.trim(),
              capability: modelForm.capability,
              isActive: modelForm.isActive,
              isDefault: modelForm.isDefault,
              ...(modelForm.apiKey.trim() ? { apiKey: modelForm.apiKey.trim() } : {}),
            };
            await updateAdminSystemPreset(existingPreset.id, presetPayload);
          } else {
            await createAdminSystemPreset({
              providerId: Number(modelForm.providerId),
              modelName: modelForm.modelName.trim(),
              capability: modelForm.capability,
              apiKey: modelForm.apiKey.trim(),
              isDefault: modelForm.isDefault,
            });
          }
        }
      } else {
        const createdModel = await addAdminProviderModel(Number(modelForm.providerId), {
          modelName: modelForm.modelName.trim(),
          ...(modelForm.displayName.trim() ? { displayName: modelForm.displayName.trim() } : {}),
          capability: modelForm.capability,
          protocol: modelForm.protocol,
          apiBaseUrl: modelForm.apiBaseUrl.trim(),
        });
        if (linkRagModel) {
          await createAdminSystemPreset({
            providerId: createdModel.providerId,
            modelName: createdModel.modelName,
            capability: createdModel.capability as LLMCapability,
            apiKey: modelForm.apiKey.trim(),
            isDefault: modelForm.isDefault,
          });
        }
      }
      setModelDialogOpen(false);
      addToast('success', editingModel ? '模型能力已更新' : '模型能力已新增');
      await loadData();
    } catch (error) {
      console.error(error);
      addToast('error', '模型能力保存失败');
    }
  }

  async function withRefresh(action: () => Promise<void>, success: string, failure: string) {
    try {
      await action();
      addToast('success', success);
      await loadData();
    } catch (error) {
      console.error(error);
      addToast('error', failure);
    }
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', darkMode ? 'text-[#d6d6d6]' : 'text-text-main')}>
      <header
        className={cn(
          'flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-3 sm:px-8',
          darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle',
        )}
      >
        <Breadcrumb
          items={[{ label: '个人信息', path: Routes.ProfilePage }, { label: '后台管理' }, { label: '模型管理' }]}
          darkMode={darkMode}
        />
        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">
          <div
            className={cn(
              'flex h-9 w-[min(52vw,320px)] items-center gap-2 rounded-md px-3 transition-colors',
              darkMode ? 'bg-white/[0.045] focus-within:bg-white/[0.07]' : 'bg-surface-soft focus-within:bg-white',
            )}
          >
            <Search size={15} className={darkMode ? 'text-[#a6a6a6]' : 'text-text-main/40'} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索厂商、模型或密钥"
              className={cn(
                'min-w-0 flex-1 bg-transparent text-sm outline-none',
                darkMode ? 'text-[#f2f2f2] placeholder:text-muted-soft' : 'text-text-main placeholder:text-muted-soft',
              )}
            />
          </div>
          <HeaderAction darkMode={darkMode} primary onClick={openCreateProvider}>
            <Plus size={15} />
            新增厂商
          </HeaderAction>
        </div>
      </header>

      <main className={cn('min-h-0 flex-1 overflow-y-auto', darkMode ? 'bg-[#1f1f1f]' : 'bg-bg-base')}>
        <section className="mx-auto w-full max-w-[1180px] px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <Loader2 size={24} className={cn('animate-spin', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/40')} />
            </div>
          ) : providers.length === 0 ? (
            <EmptyTableState darkMode={darkMode} label="暂无厂商，请先新增厂商" />
          ) : (
            <div className="grid min-h-[560px] gap-y-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:gap-x-4">
              <ProviderRail
                darkMode={darkMode}
                providers={filteredProviders}
                providerTotal={providers.length}
                activeProviderTotal={providers.filter((provider) => provider.isActive).length}
                configTotal={models.length}
                selectedProviderId={selectedProvider?.id ?? null}
                onSelect={setSelectedProviderId}
              />

              {selectedProvider ? (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={selectedProvider.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="min-w-0"
                  >
                    <ProviderWorkspace
                      darkMode={darkMode}
                      provider={selectedProvider}
                      models={selectedModels}
                      allProviderModels={selectedProviderModels}
                      presets={selectedPresets}
                      modelFilters={modelFilters}
                      setModelFilters={setModelFilters}
                      onEditProvider={openEditProvider}
                      onToggleProvider={(provider) =>
                        withRefresh(
                          () => toggleAdminProvider(provider.id, !provider.isActive),
                          provider.isActive ? '厂商已禁用' : '厂商已启用',
                          '厂商状态更新失败',
                        )
                      }
                      onDeleteProvider={(provider) =>
                        window.confirm(`确定删除厂商「${provider.providerName}」吗？`)
                          ? void withRefresh(() => deleteAdminProvider(provider.id), '厂商已删除', '厂商删除失败')
                          : undefined
                      }
                      onCreateModel={() => openCreateModel(selectedProvider)}
                      onEditModel={openEditModel}
                      onToggleModel={(model) =>
                        withRefresh(
                          () => toggleAdminProviderModel(model.id, !model.isActive),
                          model.isActive ? '模型能力已下架' : '模型能力已上架',
                          '模型能力状态更新失败',
                        )
                      }
                      onDeleteModel={(model) =>
                        window.confirm(
                          `确定删除模型能力「${getModelDisplayName(model)} / ${capabilityLabel(model.capability)}」吗？`,
                        )
                          ? void withRefresh(
                              async () => {
                                const preset = findPresetForModel(presets, model);
                                if (preset) {
                                  await deleteAdminSystemPreset(preset.id);
                                }
                                await deleteAdminProviderModel(model.id);
                              },
                              '模型能力已删除',
                              '模型能力删除失败',
                            )
                          : undefined
                      }
                    />
                  </motion.div>
                </AnimatePresence>
              ) : (
                <EmptyTableState darkMode={darkMode} label="没有匹配的厂商" />
              )}
            </div>
          )}
        </section>
      </main>

      {providerDialogOpen && (
        <ProviderDialog
          darkMode={darkMode}
          editing={Boolean(editingProvider)}
          form={providerForm}
          setForm={setProviderForm}
          onClose={() => setProviderDialogOpen(false)}
          onSubmit={handleSubmitProvider}
        />
      )}
      {modelDialogOpen && (
        <ModelDialog
          darkMode={darkMode}
          providers={providers}
          presets={presets}
          editing={Boolean(editingModel)}
          editingModel={editingModel}
          form={modelForm}
          setForm={setModelForm}
          onClose={() => setModelDialogOpen(false)}
          onSubmit={handleSubmitModel}
        />
      )}
    </div>
  );
}

function HeaderAction({
  darkMode,
  primary,
  children,
  onClick,
}: {
  darkMode: boolean;
  primary?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold',
        primary
          ? 'bg-primary text-white hover:opacity-90'
          : darkMode
            ? 'bg-white/[0.045] text-[#d6d6d6] hover:bg-white/[0.075]'
            : 'bg-surface-soft text-text-main/70 hover:bg-white',
      )}
    >
      {children}
    </button>
  );
}

function ProviderRail({
  darkMode,
  providers,
  providerTotal,
  activeProviderTotal,
  configTotal,
  selectedProviderId,
  onSelect,
}: {
  darkMode: boolean;
  providers: SystemProvider[];
  providerTotal: number;
  activeProviderTotal: number;
  configTotal: number;
  selectedProviderId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <aside className={cn('min-h-0 overflow-hidden', darkMode ? 'bg-transparent' : 'bg-transparent')}>
      <div className="px-2.5 pb-7 pt-1">
        <div className={cn('text-xl font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>厂商总览</div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ['厂商', providerTotal],
            ['启用', activeProviderTotal],
            ['配置', configTotal],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <div className={cn('text-base font-bold leading-none', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                {value}
              </div>
              <div className={cn('mt-1 text-[11px]', darkMode ? 'text-[#8f8f8f]' : 'text-text-main/40')}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-1 py-3">
        <h3 className={cn('text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>厂商</h3>
        <p aria-hidden="true" className="invisible mt-0.5 text-[11px]">
          列表
        </p>
      </div>
      <div className="max-h-[640px] overflow-y-auto overscroll-contain p-1.5 xl:h-[calc(100vh-320px)] xl:max-h-none">
        {providers.length === 0 ? (
          <div className={cn('px-3 py-10 text-center text-sm', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>
            没有匹配的厂商
          </div>
        ) : (
          providers.map((provider) => {
            const selected = provider.id === selectedProviderId;

            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => onSelect(provider.id)}
                aria-current={selected ? 'true' : undefined}
                className={cn(
                  'flex w-full min-w-0 items-start gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors duration-200 ease-out',
                  darkMode ? 'hover:bg-white/[0.045]' : 'hover:bg-ink/[0.025]',
                )}
              >
                <ProviderAvatar
                  providerType={provider.providerType}
                  providerName={provider.providerName}
                  darkMode={darkMode}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn('truncate text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                      {provider.providerName}
                    </span>
                    <span
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        provider.isActive ? 'bg-success' : 'bg-muted-soft',
                      )}
                    />
                  </span>
                  <span
                    className={cn(
                      'mt-1 block truncate font-mono text-[11px]',
                      darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45',
                    )}
                  >
                    {provider.providerType} · {provider.defaultProtocol}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

function ProviderWorkspace({
  darkMode,
  provider,
  models,
  allProviderModels,
  presets,
  modelFilters,
  setModelFilters,
  onEditProvider,
  onToggleProvider,
  onDeleteProvider,
  onCreateModel,
  onEditModel,
  onToggleModel,
  onDeleteModel,
}: {
  darkMode: boolean;
  provider: SystemProvider;
  models: ProviderModel[];
  allProviderModels: ProviderModel[];
  presets: SystemPreset[];
  modelFilters: { capability: '' | LLMCapability; status: ModelStatusFilter };
  setModelFilters: React.Dispatch<React.SetStateAction<{ capability: '' | LLMCapability; status: ModelStatusFilter }>>;
  onEditProvider: (provider: SystemProvider) => void;
  onToggleProvider: (provider: SystemProvider) => void;
  onDeleteProvider: (provider: SystemProvider) => void;
  onCreateModel: () => void;
  onEditModel: (model: ProviderModel) => void;
  onToggleModel: (model: ProviderModel) => void;
  onDeleteModel: (model: ProviderModel) => void;
}) {
  const isLinkRag = isLinkRagProvider(provider);
  const activeConfigCount = allProviderModels.filter((model) => model.isActive).length;
  const capabilityDimensionCount = new Set(allProviderModels.map((model) => model.capability)).size;

  return (
    <div className="min-w-0">
      <section className="px-1 pb-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 gap-3">
            <ProviderAvatar
              providerType={provider.providerType}
              providerName={provider.providerName}
              darkMode={darkMode}
              alignIconStart
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={cn('truncate text-xl font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                  {provider.providerName}
                </h2>
                <StatusPill darkMode={darkMode} active={provider.isActive} />
                <SmallBadge darkMode={darkMode}>{provider.defaultProtocol}</SmallBadge>
                <SmallBadge darkMode={darkMode}>priority {provider.priority}</SmallBadge>
                <SmallBadge darkMode={darkMode}>
                  配置 {activeConfigCount}/{allProviderModels.length}
                </SmallBadge>
                <SmallBadge darkMode={darkMode}>
                  能力维度 {capabilityDimensionCount}/{CAPABILITIES.length}
                </SmallBadge>
              </div>
              <p className={cn('mt-1 font-mono text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>
                {provider.providerType}
              </p>
              <p className={cn('mt-2 break-all text-xs leading-5', darkMode ? 'text-[#a8a8a8]' : 'text-text-main/60')}>
                模板地址：{provider.apiBaseUrl}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1 xl:justify-end">
            <ActionButton onClick={() => onEditProvider(provider)}>
              <Edit2 size={13} />
              编辑
            </ActionButton>
            <ActionButton onClick={onCreateModel}>
              <Plus size={13} />
              能力
            </ActionButton>
            <ActionButton onClick={() => onToggleProvider(provider)}>
              <Power size={13} />
              {provider.isActive ? '禁用' : '启用'}
            </ActionButton>
            <ActionButton danger onClick={() => onDeleteProvider(provider)}>
              <Trash2 size={13} />
              删除
            </ActionButton>
          </div>
        </div>
      </section>

      <section className="pt-1">
        <SectionHeader
          darkMode={darkMode}
          title="模型能力目录"
          meta={`${models.length}/${allProviderModels.length} 条`}
          action={
            <HeaderAction darkMode={darkMode} onClick={onCreateModel}>
              <Plus size={14} />
              新增能力
            </HeaderAction>
          }
        />
        <div className="flex flex-col gap-2.5 px-1 pb-4 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 flex-col gap-2.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <FilterLabel darkMode={darkMode} icon={<SlidersHorizontal size={13} />}>
                能力
              </FilterLabel>
              <FilterChip
                darkMode={darkMode}
                active={!modelFilters.capability}
                onClick={() => setModelFilters((prev) => ({ ...prev, capability: '' }))}
              >
                全部
              </FilterChip>
              {CAPABILITIES.map((capability) => (
                <FilterChip
                  key={capability.value}
                  darkMode={darkMode}
                  active={modelFilters.capability === capability.value}
                  onClick={() => setModelFilters((prev) => ({ ...prev, capability: capability.value }))}
                >
                  {capability.label}
                </FilterChip>
              ))}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <FilterLabel darkMode={darkMode} icon={<Power size={13} />}>
                状态
              </FilterLabel>
              {MODEL_STATUS_FILTERS.map((status) => (
                <FilterChip
                  key={status.value}
                  darkMode={darkMode}
                  active={modelFilters.status === status.value}
                  dotClassName={status.dotClassName}
                  onClick={() => setModelFilters((prev) => ({ ...prev, status: status.value }))}
                >
                  {status.label}
                </FilterChip>
              ))}
            </div>
          </div>
          <AnimatePresence initial={false}>
            {modelFilters.capability || modelFilters.status !== 'all' ? (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                onClick={() => setModelFilters({ capability: '', status: 'all' })}
                className={cn(
                  'inline-flex h-8 w-fit items-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-colors sm:shrink-0',
                  darkMode
                    ? 'text-[#a6a6a6] hover:bg-white/[0.055] hover:text-[#f2f2f2]'
                    : 'text-text-main/45 hover:bg-ink/[0.035] hover:text-text-main',
                )}
              >
                <X size={13} />
                清除
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>
        <ModelCapabilityList
          darkMode={darkMode}
          models={models}
          presets={presets}
          onEdit={onEditModel}
          showLinkRagConfig={isLinkRag}
          onToggle={onToggleModel}
          onDelete={onDeleteModel}
        />
      </section>
    </div>
  );
}

function SectionHeader({
  darkMode,
  title,
  meta,
  action,
}: {
  darkMode: boolean;
  title: string;
  meta: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 px-1 py-3',
        darkMode ? 'text-[#d6d6d6]' : 'text-text-main',
      )}
    >
      <div>
        <h3 className={cn('text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>{title}</h3>
        <p className={cn('mt-0.5 text-[11px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>{meta}</p>
      </div>
      {action}
    </div>
  );
}

function FilterLabel({ darkMode, icon, children }: { darkMode: boolean; icon?: ReactNode; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-12 shrink-0 items-center gap-1.5 text-[11px] font-bold',
        darkMode ? 'text-[#8f8f8f]' : 'text-text-main/40',
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function FilterChip({
  darkMode,
  active,
  dotClassName,
  children,
  onClick,
}: {
  darkMode: boolean;
  active: boolean;
  dotClassName?: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.98]',
        active
          ? darkMode
            ? 'bg-white/[0.09] text-[#f2f2f2]'
            : 'bg-ink/[0.065] text-text-main'
          : darkMode
            ? 'text-[#a6a6a6] hover:bg-white/[0.045] hover:text-[#f2f2f2]'
            : 'text-text-main/55 hover:bg-ink/[0.03] hover:text-text-main',
      )}
    >
      {dotClassName ? <span className={cn('h-1.5 w-1.5 rounded-full', dotClassName)} /> : null}
      {children}
    </button>
  );
}

function ModelCapabilityList({
  darkMode,
  models,
  presets,
  onEdit,
  showLinkRagConfig,
  onToggle,
  onDelete,
}: {
  darkMode: boolean;
  models: ProviderModel[];
  presets: SystemPreset[];
  onEdit: (model: ProviderModel) => void;
  showLinkRagConfig: boolean;
  onToggle: (model: ProviderModel) => void;
  onDelete: (model: ProviderModel) => void;
}) {
  if (models.length === 0) return <EmptyTableState darkMode={darkMode} label="暂无匹配的模型能力" />;

  return (
    <div className="max-h-[calc(100vh-410px)] min-h-0 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
      {models.map((model) => {
        const preset = showLinkRagConfig ? findPresetForModel(presets, model) : undefined;
        return (
          <article
            key={model.id}
            className={cn(
              'flex flex-col gap-3 rounded-md px-3 py-3 xl:flex-row xl:items-start xl:justify-between',
              darkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-ink/[0.022]',
            )}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className={cn('truncate text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                  {getModelDisplayName(model)}
                </h4>
                <StatusPill darkMode={darkMode} active={model.isActive} />
                {preset?.isDefault ? <SmallBadge darkMode={darkMode}>默认</SmallBadge> : null}
                <SmallBadge darkMode={darkMode}>{capabilityLabel(model.capability)}</SmallBadge>
                <SmallBadge darkMode={darkMode}>{model.protocol}</SmallBadge>
              </div>
              {model.displayName?.trim() ? (
                <p className={cn('mt-1 font-mono text-[11px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>
                  ID: {model.modelName}
                </p>
              ) : null}
              {showLinkRagConfig ? (
                <p
                  className={cn(
                    'mt-2 flex items-center gap-2 font-mono text-xs',
                    darkMode ? 'text-[#a8a8a8]' : 'text-text-main/60',
                  )}
                >
                  <KeyRound size={13} />
                  {presetMaskedKey(preset) || '未配置 Key'}
                </p>
              ) : null}
              <p className={cn('mt-3 break-all text-xs leading-5', darkMode ? 'text-[#a8a8a8]' : 'text-text-main/60')}>
                {model.apiBaseUrl}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1 xl:justify-end">
              <ActionButton onClick={() => onEdit(model)}>
                <Edit2 size={13} />
                编辑
              </ActionButton>
              <ActionButton onClick={() => onToggle(model)}>
                <Power size={13} />
                {model.isActive ? '下架' : '上架'}
              </ActionButton>
              <ActionButton danger onClick={() => onDelete(model)}>
                <Trash2 size={13} />
                删除
              </ActionButton>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function StatusPill({ darkMode, active }: { darkMode: boolean; active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[10px] font-bold',
        active ? 'text-success' : darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-success' : 'bg-muted-soft')} />
      {active ? '启用' : '停用'}
    </span>
  );
}

function ProviderAvatar({
  providerType,
  providerName,
  darkMode,
  alignIconStart,
}: {
  providerType: string;
  providerName?: string;
  darkMode: boolean;
  alignIconStart?: boolean;
}) {
  const iconUrl = getProviderIcon(providerType, providerName, undefined, { darkMode });
  const monochrome = iconUrl ? isProviderIconMonochrome(iconUrl) : false;
  const initial = (providerName || providerType || '?').slice(0, 1).toUpperCase();

  return (
    <span
      className={cn(
        'flex h-10 shrink-0 items-center rounded-lg',
        iconUrl && alignIconStart ? 'w-6 justify-start' : 'w-10 justify-center',
        !iconUrl && (darkMode ? 'bg-white/[0.055]' : 'bg-surface-soft'),
      )}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={providerName || providerType}
          className={cn('h-6 w-6 object-contain', monochrome && darkMode && 'invert')}
        />
      ) : (
        <span className={cn('text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-primary')}>{initial}</span>
      )}
    </span>
  );
}

function SmallBadge({ darkMode, children }: { darkMode: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold',
        darkMode ? 'bg-white/[0.055] text-[#d6d6d6]' : 'bg-ink/[0.035] text-text-main/65',
      )}
    >
      {children}
    </span>
  );
}

function ActionButton({ children, danger, onClick }: { children: ReactNode; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-colors',
        danger ? 'text-error hover:bg-error/10' : 'text-text-main/65 hover:bg-primary/5 hover:text-text-main',
      )}
    >
      {children}
    </button>
  );
}

function EmptyTableState({ darkMode, label }: { darkMode: boolean; label: string }) {
  return (
    <div
      className={cn(
        'flex min-h-[160px] items-center justify-center rounded-md text-sm',
        darkMode ? 'bg-white/[0.025] text-[#a6a6a6]' : 'bg-ink/[0.018] text-text-main/45',
      )}
    >
      {label}
    </div>
  );
}

function DialogShell({
  darkMode,
  title,
  children,
  onClose,
}: {
  darkMode: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button className="absolute inset-0 bg-black/50 " onClick={onClose} aria-label="关闭弹窗" />
      <section
        className={cn(
          'relative max-h-[90vh] w-full max-w-[min(100vw-2rem,560px)] overflow-hidden rounded-2xl border ',
          darkMode ? 'border-[#3a3a3a] bg-[#2b2b2b]' : 'border-border-subtle bg-white',
        )}
      >
        <header
          className={cn(
            'flex items-center justify-between border-b px-6 py-4',
            darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle',
          )}
        >
          <h3 className={cn('text-base font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              darkMode ? 'text-[#a6a6a6] hover:bg-[#303030]' : 'text-text-main/45 hover:bg-bg-base',
            )}
          >
            <X size={16} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function inputClassName(darkMode: boolean) {
  return cn(
    'h-10 w-full rounded-xl border px-3 text-sm outline-none',
    darkMode ? 'border-[#3a3a3a] bg-[#303030] text-[#f2f2f2]' : 'border-border-subtle bg-bg-base/50 text-text-main',
  );
}

function FormActions({ darkMode, onClose }: { darkMode: boolean; onClose: () => void }) {
  return (
    <footer
      className={cn(
        'flex justify-end gap-3 border-t px-6 py-4',
        darkMode ? 'border-[#3a3a3a]' : 'border-border-subtle',
      )}
    >
      <button
        type="button"
        onClick={onClose}
        className={cn(
          'h-9 rounded-xl px-4 text-xs font-bold',
          darkMode ? 'text-[#d6d6d6] hover:bg-[#303030]' : 'text-text-main/65 hover:bg-bg-base',
        )}
      >
        取消
      </button>
      <button
        type="submit"
        className={cn(
          'h-9 rounded-xl px-4 text-xs font-bold text-white',
          darkMode ? 'bg-primary hover:bg-primary-active' : 'bg-primary hover:opacity-90',
        )}
      >
        保存
      </button>
    </footer>
  );
}

function FormField({
  darkMode,
  label,
  hint,
  children,
}: {
  darkMode: boolean;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="block">
      <span className={cn('block text-xs font-bold', darkMode ? 'text-[#d6d6d6]' : 'text-text-main/70')}>{label}</span>
      {hint ? (
        <span className={cn('mt-1 block text-[11px]', darkMode ? 'text-[#8f8f8f]' : 'text-text-main/40')}>{hint}</span>
      ) : null}
      <span className="mt-2 block">{children}</span>
    </div>
  );
}

function FormChoice({
  darkMode,
  active,
  children,
  onClick,
}: {
  darkMode: boolean;
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center rounded-md px-3 text-xs font-bold transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.98]',
        active
          ? darkMode
            ? 'bg-white/[0.09] text-[#f2f2f2]'
            : 'bg-ink/[0.065] text-text-main'
          : darkMode
            ? 'text-[#a6a6a6] hover:bg-white/[0.045] hover:text-[#f2f2f2]'
            : 'text-text-main/55 hover:bg-ink/[0.03] hover:text-text-main',
      )}
    >
      {children}
    </button>
  );
}

function ProviderPicker({
  darkMode,
  providers,
  value,
  disabled,
  onChange,
}: {
  darkMode: boolean;
  providers: SystemProvider[];
  value: string;
  disabled?: boolean;
  onChange: (providerId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const selectedProvider = providers.find((provider) => provider.id === Number(value));
  const pickerDisabled = disabled || providers.length === 0;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && pickerRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        disabled={pickerDisabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex min-h-10 w-full items-center justify-between gap-3 rounded-[8px] px-3 py-2 text-left text-sm outline-none transition-[background-color,box-shadow,transform] duration-200 ease-out active:scale-[0.995]',
          darkMode
            ? 'bg-white/[0.045] text-[#f2f2f2] hover:bg-white/[0.07] focus-visible:shadow-[0_0_0_2px_rgba(255,255,255,0.12)]'
            : 'bg-bg-base/60 text-text-main hover:bg-ink/[0.035] focus-visible:shadow-[0_0_0_2px_rgba(24,24,24,0.08)]',
          open && (darkMode ? 'bg-white/[0.075]' : 'bg-ink/[0.04]'),
          pickerDisabled && 'cursor-not-allowed opacity-55 active:scale-100',
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          {selectedProvider ? (
            <ProviderAvatar
              providerType={selectedProvider.providerType}
              providerName={selectedProvider.providerName}
              darkMode={darkMode}
            />
          ) : null}
          <span className="min-w-0">
            <span
              className={cn(
                'block truncate font-bold',
                !selectedProvider && (darkMode ? 'text-[#8f8f8f]' : 'text-text-main/40'),
              )}
            >
              {selectedProvider?.providerName || (providers.length === 0 ? '暂无厂商' : '选择厂商')}
            </span>
            {selectedProvider ? (
              <span
                className={cn(
                  'mt-0.5 block truncate font-mono text-[11px]',
                  darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45',
                )}
              >
                {selectedProvider.providerType} · {selectedProvider.defaultProtocol}
              </span>
            ) : null}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 transition-transform duration-200 ease-out',
            open && 'rotate-180',
            darkMode ? 'text-[#a6a6a6]' : 'text-text-main/40',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={cn(
              'absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-64 overflow-y-auto rounded-[8px] p-1 shadow-xl',
              darkMode ? 'bg-[#303030] shadow-black/25' : 'bg-white shadow-ink/10',
            )}
            role="listbox"
          >
            {providers.map((provider) => {
              const active = provider.id === selectedProvider?.id;
              return (
                <button
                  key={provider.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(String(provider.id));
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[6px] px-2.5 py-2 text-left transition-[background-color,color] duration-150',
                    active
                      ? darkMode
                        ? 'bg-white/[0.08]'
                        : 'bg-ink/[0.045]'
                      : darkMode
                        ? 'hover:bg-white/[0.055]'
                        : 'hover:bg-ink/[0.028]',
                  )}
                >
                  <ProviderAvatar
                    providerType={provider.providerType}
                    providerName={provider.providerName}
                    darkMode={darkMode}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn('block truncate text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}
                    >
                      {provider.providerName}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 block truncate font-mono text-[11px]',
                        darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45',
                      )}
                    >
                      {provider.providerType} · {provider.defaultProtocol}
                    </span>
                  </span>
                  {active ? <Check size={15} className={darkMode ? 'text-[#f2f2f2]' : 'text-text-main/65'} /> : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ProviderDialog({
  darkMode,
  editing,
  form,
  setForm,
  onClose,
  onSubmit,
}: {
  darkMode: boolean;
  editing: boolean;
  form: CreateProviderRequest;
  setForm: (form: CreateProviderRequest) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <DialogShell darkMode={darkMode} title={editing ? '编辑厂商' : '新增厂商'} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="space-y-4 p-6">
          <input
            required
            disabled={editing}
            value={form.providerType}
            onChange={(e) => setForm({ ...form, providerType: e.target.value })}
            placeholder="厂商类型，如 openai"
            className={inputClassName(darkMode)}
          />
          <input
            required
            value={form.providerName}
            onChange={(e) => setForm({ ...form, providerName: e.target.value })}
            placeholder="厂商名称"
            className={inputClassName(darkMode)}
          />
          <input
            required
            value={form.apiBaseUrl}
            onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value })}
            placeholder="默认 API 地址，仅用于新增能力预填"
            className={inputClassName(darkMode)}
          />
          <select
            value={form.defaultProtocol}
            onChange={(e) => setForm({ ...form, defaultProtocol: e.target.value as LLMProtocol })}
            className={inputClassName(darkMode)}
          >
            {PROTOCOLS.map((protocol) => (
              <option key={protocol} value={protocol}>
                {protocol}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
            placeholder="优先级"
            className={inputClassName(darkMode)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            启用
          </label>
        </div>
        <FormActions darkMode={darkMode} onClose={onClose} />
      </form>
    </DialogShell>
  );
}

function ModelDialog({
  darkMode,
  providers,
  presets,
  editing,
  editingModel,
  form,
  setForm,
  onClose,
  onSubmit,
}: {
  darkMode: boolean;
  providers: SystemProvider[];
  presets: SystemPreset[];
  editing: boolean;
  editingModel: ProviderModel | null;
  form: typeof modelInitialState;
  setForm: (form: typeof modelInitialState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const selectedProvider = providers.find((provider) => provider.id === Number(form.providerId));
  const linkRagModel = isLinkRagProvider(selectedProvider);
  const currentPreset = editingModel ? findPresetForModel(presets, editingModel) : undefined;
  const handleProviderChange = (providerId: string) => {
    const provider = providers.find((item) => item.id === Number(providerId));
    setForm({
      ...form,
      providerId,
      protocol: provider?.defaultProtocol ?? form.protocol,
      apiBaseUrl: provider?.apiBaseUrl ?? form.apiBaseUrl,
      apiKey: isLinkRagProvider(provider) ? form.apiKey : '',
      isDefault: isLinkRagProvider(provider) ? form.isDefault : false,
    });
  };

  return (
    <DialogShell darkMode={darkMode} title={editing ? '编辑模型能力' : '新增模型能力'} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="space-y-4 p-6">
          <FormField
            darkMode={darkMode}
            label="厂商"
            hint={editing ? '模型能力创建后不能切换厂商。' : '选择厂商后会预填协议和 API 地址模板。'}
          >
            <ProviderPicker
              darkMode={darkMode}
              providers={providers}
              value={form.providerId}
              disabled={editing}
              onChange={handleProviderChange}
            />
          </FormField>
          <FormField darkMode={darkMode} label="真实模型名" hint="传给厂商 API 的 modelName，例如 gpt-4o。">
            <input
              required
              value={form.modelName}
              onChange={(e) => setForm({ ...form, modelName: e.target.value })}
              placeholder="gpt-4o"
              className={inputClassName(darkMode)}
            />
          </FormField>
          <FormField darkMode={darkMode} label="展示名" hint="可选；为空时界面会回退显示真实模型名。">
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="GPT-4o"
              className={inputClassName(darkMode)}
            />
          </FormField>
          <FormField darkMode={darkMode} label="能力维度" hint="同一个模型支持多个能力时，需要分别新增多条配置。">
            <div className="flex flex-wrap gap-1.5">
              {CAPABILITIES.map((capability) => (
                <FormChoice
                  key={capability.value}
                  darkMode={darkMode}
                  active={form.capability === capability.value}
                  onClick={() => setForm({ ...form, capability: capability.value })}
                >
                  {capability.label}
                </FormChoice>
              ))}
            </div>
          </FormField>
          <FormField darkMode={darkMode} label="协议" hint="协议大小写敏感，保存时使用小写值。">
            <div className="flex flex-wrap gap-1.5">
              {PROTOCOLS.map((protocol) => (
                <FormChoice
                  key={protocol}
                  darkMode={darkMode}
                  active={form.protocol === protocol}
                  onClick={() => setForm({ ...form, protocol })}
                >
                  {protocol}
                </FormChoice>
              ))}
            </div>
          </FormField>
          <FormField darkMode={darkMode} label="调用入口" hint="模型能力真实调用入口，通常是完整端点 URL。">
            <input
              required
              value={form.apiBaseUrl}
              onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1/chat/completions"
              className={inputClassName(darkMode)}
            />
          </FormField>
          {linkRagModel ? (
            <div className="space-y-3">
              <FormField
                darkMode={darkMode}
                label="LinkRAG 平台 API Key"
                hint={
                  editing ? '不修改 Key 可留空；重新输入会覆盖当前 Key。' : 'LinkRAG 厂商需要同时填写模型和平台 Key。'
                }
              >
                <input
                  required={!editing || !currentPreset}
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className={inputClassName(darkMode)}
                />
              </FormField>
              {editing && currentPreset ? (
                <p
                  className={cn(
                    'flex items-center gap-2 font-mono text-xs',
                    darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45',
                  )}
                >
                  <KeyRound size={13} />
                  当前 Key：{presetMaskedKey(currentPreset)}
                </p>
              ) : null}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                />
                设为默认
              </label>
            </div>
          ) : null}
          {editing ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              上架
            </label>
          ) : (
            <p className={cn('text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>新增后默认上架。</p>
          )}
        </div>
        <FormActions darkMode={darkMode} onClose={onClose} />
      </form>
    </DialogShell>
  );
}
