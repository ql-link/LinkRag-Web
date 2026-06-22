import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ChevronDown, Edit2, KeyRound, Loader2, Plus, Power, Search, Trash2, X } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
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
  toggleAdminSystemPreset,
  updateAdminProvider,
  updateAdminProviderModel,
  updateAdminSystemPreset,
} from '@/services/llm';
import type {
  CreateProviderRequest,
  CreatePresetRequest,
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
type TabKey = 'providers' | 'models' | 'presets';

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
  capability: 'CHAT' as LLMCapability,
  protocol: 'openai' as LLMProtocol,
  apiBaseUrl: '',
  isActive: true,
};

const presetInitialState = {
  providerId: '',
  modelName: '',
  capability: 'CHAT' as LLMCapability,
  apiKey: '',
  isActive: true,
};

function capabilityLabel(value: string) {
  return CAPABILITIES.find((item) => item.value === value)?.label || value;
}

function providerName(providers: SystemProvider[], providerId: number) {
  const provider = providers.find((item) => item.id === providerId);
  return provider ? `${provider.providerName} (${provider.providerType})` : `#${providerId}`;
}

function activeClassName(darkMode: boolean, active: boolean) {
  if (active) return darkMode ? 'border-green-500/30 text-green-400' : 'border-green-500/25 text-green-700';
  return darkMode ? 'border-[#3c3c3c] text-[#858585]' : 'border-border-subtle text-text-main/45';
}

export default function AdminModelsPage() {
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [tab, setTab] = useState<TabKey>('providers');
  const [providers, setProviders] = useState<SystemProvider[]>([]);
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [presets, setPresets] = useState<SystemPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [providerForm, setProviderForm] = useState<CreateProviderRequest>(providerInitialState);
  const [editingProvider, setEditingProvider] = useState<SystemProvider | null>(null);
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [modelForm, setModelForm] = useState(modelInitialState);
  const [editingModel, setEditingModel] = useState<ProviderModel | null>(null);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [presetForm, setPresetForm] = useState(presetInitialState);
  const [editingPreset, setEditingPreset] = useState<SystemPreset | null>(null);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [providerResult, modelResult, presetResult] = await Promise.all([
        listAdminProviders(1, 100),
        listAdminProviderModels({ page: 1, size: 200 }),
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

  const filteredProviders = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return providers;
    return providers.filter((item) =>
      [item.providerName, item.providerType, item.apiBaseUrl, item.defaultProtocol].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    );
  }, [providers, query]);

  const filteredModels = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return models;
    return models.filter((item) =>
      [providerName(providers, item.providerId), item.modelName, item.capability, item.protocol, item.apiBaseUrl].some(
        (value) => value.toLowerCase().includes(keyword),
      ),
    );
  }, [models, providers, query]);

  const filteredPresets = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return presets;
    return presets.filter((item) =>
      [item.providerType, item.modelName, item.capability, item.protocol, item.apiBaseUrl, item.apiKey].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    );
  }, [presets, query]);

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

  function openCreateModel(provider?: SystemProvider) {
    setEditingModel(null);
    setModelForm({
      ...modelInitialState,
      providerId: provider ? String(provider.id) : providers[0] ? String(providers[0].id) : '',
      protocol: provider?.defaultProtocol ?? 'openai',
      apiBaseUrl: provider?.apiBaseUrl ?? '',
    });
    setModelDialogOpen(true);
  }

  function openEditModel(model: ProviderModel) {
    setEditingModel(model);
    setModelForm({
      providerId: String(model.providerId),
      modelName: model.modelName,
      capability: model.capability as LLMCapability,
      protocol: model.protocol,
      apiBaseUrl: model.apiBaseUrl,
      isActive: model.isActive,
    });
    setModelDialogOpen(true);
  }

  async function handleSubmitModel(event: FormEvent) {
    event.preventDefault();
    try {
      if (editingModel) {
        const payload: UpdateProviderModelRequest = {
          modelName: modelForm.modelName.trim(),
          capability: modelForm.capability,
          protocol: modelForm.protocol,
          apiBaseUrl: modelForm.apiBaseUrl.trim(),
          isActive: modelForm.isActive,
        };
        await updateAdminProviderModel(editingModel.id, payload);
      } else {
        await addAdminProviderModel(Number(modelForm.providerId), {
          modelName: modelForm.modelName.trim(),
          capability: modelForm.capability,
          protocol: modelForm.protocol,
          apiBaseUrl: modelForm.apiBaseUrl.trim(),
        });
      }
      setModelDialogOpen(false);
      addToast('success', editingModel ? '模型能力已更新' : '模型能力已新增');
      await loadData();
    } catch (error) {
      console.error(error);
      addToast('error', '模型能力保存失败');
    }
  }

  function openCreatePreset(model?: ProviderModel) {
    setEditingPreset(null);
    setPresetForm({
      ...presetInitialState,
      providerId: model ? String(model.providerId) : providers[0] ? String(providers[0].id) : '',
      modelName: model?.modelName ?? '',
      capability: (model?.capability as LLMCapability) ?? 'CHAT',
    });
    setPresetDialogOpen(true);
  }

  function openEditPreset(preset: SystemPreset) {
    setEditingPreset(preset);
    setPresetForm({
      providerId: String(preset.providerId),
      modelName: preset.modelName,
      capability: preset.capability as LLMCapability,
      apiKey: '',
      isActive: preset.isActive,
    });
    setPresetDialogOpen(true);
  }

  async function handleSubmitPreset(event: FormEvent) {
    event.preventDefault();
    try {
      if (editingPreset) {
        const payload: UpdatePresetRequest = {
          providerId: Number(presetForm.providerId),
          modelName: presetForm.modelName.trim(),
          capability: presetForm.capability,
          isActive: presetForm.isActive,
          ...(presetForm.apiKey.trim() ? { apiKey: presetForm.apiKey.trim() } : {}),
        };
        await updateAdminSystemPreset(editingPreset.id, payload);
      } else {
        const payload: CreatePresetRequest = {
          providerId: Number(presetForm.providerId),
          modelName: presetForm.modelName.trim(),
          capability: presetForm.capability,
          apiKey: presetForm.apiKey.trim(),
        };
        await createAdminSystemPreset(payload);
      }
      setPresetDialogOpen(false);
      addToast('success', editingPreset ? '系统预设已更新' : '系统预设已新增');
      await loadData();
    } catch (error) {
      console.error(error);
      addToast('error', '系统预设保存失败');
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
    <div className={cn('flex h-full min-h-0 flex-col', darkMode ? 'text-[#cccccc]' : 'text-text-main')}>
      <header
        className={cn(
          'flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-3 sm:px-8',
          darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
        )}
      >
        <Breadcrumb
          items={[{ label: '个人信息', path: Routes.ProfilePage }, { label: '后台管理' }, { label: '模型管理' }]}
          darkMode={darkMode}
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div
            className={cn(
              'flex h-9 w-[min(320px,calc(100vw-120px))] items-center gap-2 rounded-lg border px-3 sm:w-72',
              darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
            )}
          >
            <Search size={15} className={darkMode ? 'text-[#858585]' : 'text-text-main/40'} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索厂商、模型或预设..."
              className={cn(
                'min-w-0 flex-1 bg-transparent text-sm outline-none',
                darkMode ? 'text-[#e0e0e0] placeholder:text-[#6b6b6b]' : 'text-text-main placeholder:text-text-main/35',
              )}
            />
          </div>
          <button
            type="button"
            onClick={
              tab === 'providers'
                ? openCreateProvider
                : tab === 'models'
                  ? () => openCreateModel()
                  : () => openCreatePreset()
            }
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold text-white',
              darkMode ? 'bg-[#094771] hover:bg-[#0d5b8f]' : 'bg-[#7B6B5D] hover:opacity-90',
            )}
          >
            <Plus size={15} />
            {tab === 'providers' ? '新增厂商' : tab === 'models' ? '新增模型能力' : '新增预设'}
          </button>
        </div>
      </header>

      <main className={cn('min-h-0 flex-1 overflow-y-auto', darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base')}>
        <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className={cn('mono-label mb-2', darkMode && 'text-[#858585]')}>Model Management</div>
            <h1
              className={cn(
                'text-[24px] font-semibold leading-tight sm:text-[27px]',
                darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
              )}
            >
              模型管理
            </h1>
            <p className={cn('mt-1 text-[13px]', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
              管理厂商、模型能力目录和系统预设。
            </p>
          </div>

          <div
            className={cn(
              'mb-5 rounded-2xl border px-4 py-3 text-xs leading-6',
              darkMode
                ? 'border-[#3c3c3c] bg-[#252526]/62 text-[#a8a8a8]'
                : 'border-border-subtle bg-surface-card text-text-main/60',
            )}
          >
            <span className={cn('font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>厂商</span>
            用于维护平台可用的模型服务商；
            <span className={cn('font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}> 模型能力</span>
            定义具体模型、能力、协议和调用入口；
            <span className={cn('font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}> 系统预设</span>
            绑定平台 Key，并作为新用户默认可用的内置模型配置。
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <MetricCard
              darkMode={darkMode}
              label="厂商"
              value={providers.length}
              active={providers.filter((item) => item.isActive).length}
            />
            <MetricCard
              darkMode={darkMode}
              label="模型能力"
              value={models.length}
              active={models.filter((item) => item.isActive).length}
            />
            <MetricCard
              darkMode={darkMode}
              label="系统预设"
              value={presets.length}
              active={presets.filter((item) => item.isActive).length}
            />
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {[
              ['providers', `厂商 ${providers.length}`],
              ['models', `模型能力 ${models.length}`],
              ['presets', `系统预设 ${presets.length}`],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key as TabKey)}
                className={cn(
                  'h-8 rounded-lg border px-3 text-xs font-bold transition-colors',
                  tab === key
                    ? darkMode
                      ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#e0e0e0]'
                      : 'border-border-subtle bg-white text-text-main'
                    : darkMode
                      ? 'border-[#3c3c3c] text-[#858585] hover:bg-[#2d2d2d]'
                      : 'border-border-subtle text-text-main/60 hover:bg-white',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <Loader2 size={24} className={cn('animate-spin', darkMode ? 'text-[#858585]' : 'text-text-main/40')} />
            </div>
          ) : tab === 'providers' ? (
            <ProviderTable
              darkMode={darkMode}
              providers={filteredProviders}
              onEdit={openEditProvider}
              onAddModel={openCreateModel}
              onToggle={(provider) =>
                withRefresh(
                  () => toggleAdminProvider(provider.id, !provider.isActive),
                  provider.isActive ? '厂商已禁用' : '厂商已启用',
                  '厂商状态更新失败',
                )
              }
              onDelete={(provider) =>
                window.confirm(`确定删除厂商「${provider.providerName}」吗？`)
                  ? void withRefresh(() => deleteAdminProvider(provider.id), '厂商已删除', '厂商删除失败')
                  : undefined
              }
            />
          ) : tab === 'models' ? (
            <ModelTable
              darkMode={darkMode}
              providers={providers}
              models={filteredModels}
              onEdit={openEditModel}
              onCreatePreset={openCreatePreset}
              onToggle={(model) =>
                withRefresh(
                  () => toggleAdminProviderModel(model.id, !model.isActive),
                  model.isActive ? '模型能力已下架' : '模型能力已上架',
                  '模型能力状态更新失败',
                )
              }
              onDelete={(model) =>
                window.confirm(`确定删除模型能力「${model.modelName} / ${capabilityLabel(model.capability)}」吗？`)
                  ? void withRefresh(() => deleteAdminProviderModel(model.id), '模型能力已删除', '模型能力删除失败')
                  : undefined
              }
            />
          ) : (
            <PresetTable
              darkMode={darkMode}
              providers={providers}
              presets={filteredPresets}
              onEdit={openEditPreset}
              onToggle={(preset) =>
                withRefresh(
                  () => toggleAdminSystemPreset(preset.id, !preset.isActive),
                  preset.isActive ? '预设已禁用' : '预设已启用',
                  '预设状态更新失败',
                )
              }
              onDelete={(preset) =>
                window.confirm(`确定删除系统预设「${preset.modelName} / ${capabilityLabel(preset.capability)}」吗？`)
                  ? void withRefresh(() => deleteAdminSystemPreset(preset.id), '预设已删除', '预设删除失败')
                  : undefined
              }
            />
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
          editing={Boolean(editingModel)}
          form={modelForm}
          setForm={setModelForm}
          onClose={() => setModelDialogOpen(false)}
          onSubmit={handleSubmitModel}
        />
      )}
      {presetDialogOpen && (
        <PresetDialog
          darkMode={darkMode}
          providers={providers}
          models={models.filter((model) => model.isActive)}
          editing={Boolean(editingPreset)}
          form={presetForm}
          setForm={setPresetForm}
          onClose={() => setPresetDialogOpen(false)}
          onSubmit={handleSubmitPreset}
        />
      )}
    </div>
  );
}

function StatusPill({ darkMode, active }: { darkMode: boolean; active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-lg border px-2 py-0.5 text-[10px] font-bold',
        activeClassName(darkMode, active),
      )}
    >
      {active ? '启用' : '停用'}
    </span>
  );
}

function MetricCard({
  darkMode,
  label,
  value,
  active,
}: {
  darkMode: boolean;
  label: string;
  value: number;
  active: number;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3',
        darkMode ? 'border-[#3c3c3c] bg-[#252526]/62' : 'border-border-subtle bg-surface-card',
      )}
    >
      <p className={cn('text-[11px] font-bold', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className={cn('text-2xl font-semibold leading-none', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
          {value}
        </p>
        <p className={cn('text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>{active} 启用</p>
      </div>
    </div>
  );
}

function ProviderAvatar({
  providerType,
  providerName,
  darkMode,
}: {
  providerType: string;
  providerName?: string;
  darkMode: boolean;
}) {
  const iconUrl = getProviderIcon(providerType, providerName);
  const monochrome = iconUrl ? isProviderIconMonochrome(iconUrl) : false;
  const initial = (providerName || providerType || '?').slice(0, 1).toUpperCase();

  return (
    <span
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
        darkMode ? 'border-[#3c3c3c] bg-[#2d2d2d]' : 'border-border-subtle bg-white',
      )}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={providerName || providerType}
          className={cn('h-6 w-6 object-contain', monochrome && darkMode && 'invert')}
        />
      ) : (
        <span className={cn('text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-primary')}>{initial}</span>
      )}
    </span>
  );
}

function SmallBadge({ darkMode, children }: { darkMode: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-lg border px-2 py-0.5 text-[10px] font-bold',
        darkMode ? 'border-[#3c3c3c] text-[#cccccc]' : 'border-border-subtle bg-surface-card text-text-main/65',
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
        danger ? 'text-red-500 hover:bg-red-500/10' : 'text-text-main/65 hover:bg-primary/5 hover:text-text-main',
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
        'flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed text-sm',
        darkMode ? 'border-[#3c3c3c] text-[#858585]' : 'border-border-subtle text-text-main/45',
      )}
    >
      {label}
    </div>
  );
}

function providerFromId(providers: SystemProvider[], providerId: number) {
  return providers.find((provider) => provider.id === providerId);
}

function ProviderTable({
  darkMode,
  providers,
  onEdit,
  onAddModel,
  onToggle,
  onDelete,
}: {
  darkMode: boolean;
  providers: SystemProvider[];
  onEdit: (provider: SystemProvider) => void;
  onAddModel: (provider: SystemProvider) => void;
  onToggle: (provider: SystemProvider) => void;
  onDelete: (provider: SystemProvider) => void;
}) {
  if (providers.length === 0) return <EmptyTableState darkMode={darkMode} label="暂无匹配的厂商" />;

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <article
          key={provider.id}
          className={cn(
            'rounded-2xl border p-4 transition-colors',
            darkMode
              ? 'border-[#3c3c3c] bg-[#252526]/62 hover:bg-[#2d2d2d]/65'
              : 'border-border-subtle bg-surface-card hover:bg-surface-card',
          )}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-3">
              <ProviderAvatar
                providerType={provider.providerType}
                providerName={provider.providerName}
                darkMode={darkMode}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={cn('truncate text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                    {provider.providerName}
                  </h3>
                  <StatusPill darkMode={darkMode} active={provider.isActive} />
                  <SmallBadge darkMode={darkMode}>{provider.defaultProtocol}</SmallBadge>
                </div>
                <p
                  className={cn(
                    'mt-1 truncate font-mono text-[11px]',
                    darkMode ? 'text-[#858585]' : 'text-text-main/45',
                  )}
                >
                  {provider.providerType} · priority {provider.priority}
                </p>
                <p
                  className={cn('mt-3 break-all text-xs leading-5', darkMode ? 'text-[#a8a8a8]' : 'text-text-main/60')}
                >
                  {provider.apiBaseUrl}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1 lg:justify-end">
              <ActionButton onClick={() => onEdit(provider)}>
                <Edit2 size={13} />
                编辑
              </ActionButton>
              <ActionButton onClick={() => onAddModel(provider)}>
                <Plus size={13} />
                模型
              </ActionButton>
              <ActionButton onClick={() => onToggle(provider)}>
                <Power size={13} />
                {provider.isActive ? '禁用' : '启用'}
              </ActionButton>
              <ActionButton danger onClick={() => onDelete(provider)}>
                <Trash2 size={13} />
                删除
              </ActionButton>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ModelTable({
  darkMode,
  providers,
  models,
  onEdit,
  onCreatePreset,
  onToggle,
  onDelete,
}: {
  darkMode: boolean;
  providers: SystemProvider[];
  models: ProviderModel[];
  onEdit: (model: ProviderModel) => void;
  onCreatePreset: (model: ProviderModel) => void;
  onToggle: (model: ProviderModel) => void;
  onDelete: (model: ProviderModel) => void;
}) {
  const [collapsedProviderIds, setCollapsedProviderIds] = useState<Set<number>>(() => new Set());

  const groups = useMemo(() => {
    const groupMap = new Map<number, ProviderModel[]>();
    models.forEach((model) => {
      const items = groupMap.get(model.providerId) || [];
      items.push(model);
      groupMap.set(model.providerId, items);
    });

    return Array.from(groupMap.entries())
      .map(([providerId, items]) => ({
        providerId,
        provider: providerFromId(providers, providerId),
        items: items.sort((a, b) => `${a.modelName}${a.capability}`.localeCompare(`${b.modelName}${b.capability}`)),
      }))
      .sort((a, b) => {
        const aName = a.provider?.providerName || `#${a.providerId}`;
        const bName = b.provider?.providerName || `#${b.providerId}`;
        return aName.localeCompare(bName);
      });
  }, [models, providers]);

  function toggleProvider(providerId: number) {
    setCollapsedProviderIds((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  }

  if (models.length === 0) return <EmptyTableState darkMode={darkMode} label="暂无匹配的模型能力" />;

  return (
    <div className="space-y-3">
      {groups.map(({ providerId, provider, items }) => {
        const collapsed = collapsedProviderIds.has(providerId);
        const activeCount = items.filter((model) => model.isActive).length;
        return (
          <section
            key={providerId}
            className={cn(
              'overflow-hidden rounded-2xl border',
              darkMode ? 'border-[#3c3c3c] bg-[#252526]/62' : 'border-border-subtle bg-surface-card',
            )}
          >
            <button
              type="button"
              onClick={() => toggleProvider(providerId)}
              className={cn(
                'flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors',
                darkMode ? 'hover:bg-[#2d2d2d]/65' : 'hover:bg-surface-card',
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <ProviderAvatar
                  providerType={provider?.providerType || String(providerId)}
                  providerName={provider?.providerName}
                  darkMode={darkMode}
                />
                <span className="min-w-0">
                  <span
                    className={cn('block truncate text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}
                  >
                    {provider ? provider.providerName : `厂商 #${providerId}`}
                  </span>
                  <span
                    className={cn(
                      'mt-1 block truncate font-mono text-[11px]',
                      darkMode ? 'text-[#858585]' : 'text-text-main/45',
                    )}
                  >
                    {provider?.providerType || providerId}
                    <span className="font-sans">
                      {' '}
                      · {items.length} 条能力 · {activeCount} 上架
                    </span>
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <SmallBadge darkMode={darkMode}>{provider?.defaultProtocol || 'unknown'}</SmallBadge>
                <ChevronDown
                  size={16}
                  className={cn(
                    'transition-transform',
                    collapsed && '-rotate-90',
                    darkMode ? 'text-[#858585]' : 'text-text-main/45',
                  )}
                />
              </span>
            </button>

            {!collapsed && (
              <div className={cn('border-t', darkMode ? 'border-[#3c3c3c]/70' : 'border-border-subtle/70')}>
                {items.map((model) => (
                  <article
                    key={model.id}
                    className={cn(
                      'flex flex-col gap-4 border-b px-4 py-4 last:border-b-0 xl:flex-row xl:items-start xl:justify-between',
                      darkMode
                        ? 'border-[#3c3c3c]/70 hover:bg-[#2d2d2d]/45'
                        : 'border-border-subtle/70 hover:bg-surface-card',
                    )}
                  >
                    <div className="min-w-0 xl:pl-[52px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={cn('truncate text-sm font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}
                        >
                          {model.modelName}
                        </h3>
                        <StatusPill darkMode={darkMode} active={model.isActive} />
                        <SmallBadge darkMode={darkMode}>{capabilityLabel(model.capability)}</SmallBadge>
                        <SmallBadge darkMode={darkMode}>{model.protocol}</SmallBadge>
                      </div>
                      <p
                        className={cn(
                          'mt-3 break-all text-xs leading-5',
                          darkMode ? 'text-[#a8a8a8]' : 'text-text-main/60',
                        )}
                      >
                        {model.apiBaseUrl}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1 xl:justify-end">
                      <ActionButton onClick={() => onEdit(model)}>
                        <Edit2 size={13} />
                        编辑
                      </ActionButton>
                      <ActionButton onClick={() => onCreatePreset(model)}>
                        <Plus size={13} />
                        预设
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
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function PresetTable({
  darkMode,
  providers,
  presets,
  onEdit,
  onToggle,
  onDelete,
}: {
  darkMode: boolean;
  providers: SystemProvider[];
  presets: SystemPreset[];
  onEdit: (preset: SystemPreset) => void;
  onToggle: (preset: SystemPreset) => void;
  onDelete: (preset: SystemPreset) => void;
}) {
  if (presets.length === 0) return <EmptyTableState darkMode={darkMode} label="暂无匹配的系统预设" />;

  return (
    <div className="space-y-3">
      {presets.map((preset) => {
        const provider = providerFromId(providers, preset.providerId);
        return (
          <article
            key={preset.id}
            className={cn(
              'rounded-2xl border p-4 transition-colors',
              darkMode
                ? 'border-[#3c3c3c] bg-[#252526]/62 hover:bg-[#2d2d2d]/65'
                : 'border-border-subtle bg-surface-card hover:bg-surface-card',
            )}
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 gap-3">
                <ProviderAvatar
                  providerType={provider?.providerType || preset.providerType}
                  providerName={provider?.providerName || preset.providerType}
                  darkMode={darkMode}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={cn('truncate text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                      {preset.modelName}
                    </h3>
                    <StatusPill darkMode={darkMode} active={preset.isActive} />
                    <SmallBadge darkMode={darkMode}>{capabilityLabel(preset.capability)}</SmallBadge>
                    <SmallBadge darkMode={darkMode}>{preset.protocol}</SmallBadge>
                  </div>
                  <p className={cn('mt-1 truncate text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/45')}>
                    {providerName(providers, preset.providerId)}
                  </p>
                  <p
                    className={cn(
                      'mt-3 flex items-center gap-2 font-mono text-xs',
                      darkMode ? 'text-[#a8a8a8]' : 'text-text-main/60',
                    )}
                  >
                    <KeyRound size={13} />
                    {preset.apiKey}
                  </p>
                  <p
                    className={cn(
                      'mt-2 break-all text-xs leading-5',
                      darkMode ? 'text-[#858585]' : 'text-text-main/45',
                    )}
                  >
                    {preset.apiBaseUrl}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1 xl:justify-end">
                <ActionButton onClick={() => onEdit(preset)}>
                  <Edit2 size={13} />
                  编辑
                </ActionButton>
                <ActionButton onClick={() => onToggle(preset)}>
                  <Power size={13} />
                  {preset.isActive ? '禁用' : '启用'}
                </ActionButton>
                <ActionButton danger onClick={() => onDelete(preset)}>
                  <Trash2 size={13} />
                  删除
                </ActionButton>
              </div>
            </div>
          </article>
        );
      })}
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
          'relative max-h-[90vh] w-full max-w-[560px] overflow-hidden rounded-2xl border ',
          darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
        )}
      >
        <header
          className={cn(
            'flex items-center justify-between border-b px-6 py-4',
            darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
          )}
        >
          <h3 className={cn('text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              darkMode ? 'text-[#858585] hover:bg-[#2d2d2d]' : 'text-text-main/45 hover:bg-bg-base',
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
    darkMode ? 'border-[#3c3c3c] bg-[#2d2d2d] text-[#e0e0e0]' : 'border-border-subtle bg-bg-base/50 text-text-main',
  );
}

function FormActions({ darkMode, onClose }: { darkMode: boolean; onClose: () => void }) {
  return (
    <footer
      className={cn(
        'flex justify-end gap-3 border-t px-6 py-4',
        darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
      )}
    >
      <button
        type="button"
        onClick={onClose}
        className={cn(
          'h-9 rounded-xl px-4 text-xs font-bold',
          darkMode ? 'text-[#cccccc] hover:bg-[#2d2d2d]' : 'text-text-main/65 hover:bg-bg-base',
        )}
      >
        取消
      </button>
      <button
        type="submit"
        className={cn(
          'h-9 rounded-xl px-4 text-xs font-bold text-white',
          darkMode ? 'bg-[#094771] hover:bg-[#0d5b8f]' : 'bg-[#7B6B5D] hover:opacity-90',
        )}
      >
        保存
      </button>
    </footer>
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
            placeholder="默认 API 地址"
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
  editing,
  form,
  setForm,
  onClose,
  onSubmit,
}: {
  darkMode: boolean;
  providers: SystemProvider[];
  editing: boolean;
  form: typeof modelInitialState;
  setForm: (form: typeof modelInitialState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <DialogShell darkMode={darkMode} title={editing ? '编辑模型能力' : '新增模型能力'} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="space-y-4 p-6">
          <select
            disabled={editing}
            required
            value={form.providerId}
            onChange={(e) => {
              const provider = providers.find((item) => item.id === Number(e.target.value));
              setForm({
                ...form,
                providerId: e.target.value,
                protocol: provider?.defaultProtocol ?? form.protocol,
                apiBaseUrl: provider?.apiBaseUrl ?? form.apiBaseUrl,
              });
            }}
            className={inputClassName(darkMode)}
          >
            <option value="">选择厂商</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.providerName}
              </option>
            ))}
          </select>
          <input
            required
            value={form.modelName}
            onChange={(e) => setForm({ ...form, modelName: e.target.value })}
            placeholder="模型名"
            className={inputClassName(darkMode)}
          />
          <select
            value={form.capability}
            onChange={(e) => setForm({ ...form, capability: e.target.value as LLMCapability })}
            className={inputClassName(darkMode)}
          >
            {CAPABILITIES.map((capability) => (
              <option key={capability.value} value={capability.value}>
                {capability.label}
              </option>
            ))}
          </select>
          <select
            value={form.protocol}
            onChange={(e) => setForm({ ...form, protocol: e.target.value as LLMProtocol })}
            className={inputClassName(darkMode)}
          >
            {PROTOCOLS.map((protocol) => (
              <option key={protocol} value={protocol}>
                {protocol}
              </option>
            ))}
          </select>
          <input
            required
            value={form.apiBaseUrl}
            onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value })}
            placeholder="模型能力真实调用入口，通常是完整端点 URL"
            className={inputClassName(darkMode)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            上架
          </label>
        </div>
        <FormActions darkMode={darkMode} onClose={onClose} />
      </form>
    </DialogShell>
  );
}

function PresetDialog({
  darkMode,
  providers,
  models,
  editing,
  form,
  setForm,
  onClose,
  onSubmit,
}: {
  darkMode: boolean;
  providers: SystemProvider[];
  models: ProviderModel[];
  editing: boolean;
  form: typeof presetInitialState;
  setForm: (form: typeof presetInitialState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const availableModels = models.filter((model) => !form.providerId || model.providerId === Number(form.providerId));
  return (
    <DialogShell darkMode={darkMode} title={editing ? '编辑系统预设' : '新增系统预设'} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="space-y-4 p-6">
          <select
            required
            value={form.providerId}
            onChange={(e) => setForm({ ...form, providerId: e.target.value, modelName: '', capability: 'CHAT' })}
            className={inputClassName(darkMode)}
          >
            <option value="">选择厂商</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.providerName}
              </option>
            ))}
          </select>
          <select
            required
            value={`${form.modelName}::${form.capability}`}
            onChange={(e) => {
              const [modelName, capability] = e.target.value.split('::');
              setForm({ ...form, modelName, capability: capability as LLMCapability });
            }}
            className={inputClassName(darkMode)}
          >
            <option value="::CHAT">选择已上架模型能力</option>
            {availableModels.map((model) => (
              <option key={model.id} value={`${model.modelName}::${model.capability}`}>
                {model.modelName} / {capabilityLabel(model.capability)}
              </option>
            ))}
          </select>
          <input
            required={!editing}
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            placeholder={editing ? '不修改 Key 可留空' : '平台 API Key'}
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
