import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import {
  Ban,
  Check,
  ChevronDown,
  Edit2,
  FileJson,
  GripVertical,
  KeyRound,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import {
  ADMIN_MODEL_CAPABILITY_ORDER,
  compareAdminModelCapabilities,
  compareCandidateGroupsByReleaseDate,
} from '@/lib/admin-model-order';
import { getModelDisplayName } from '@/lib/model-display';
import { getProviderIcon, isProviderIconMonochrome } from '@/lib/provider-icons';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import {
  addAdminProviderModel,
  createAdminLLMConfig,
  createAdminProvider,
  deleteAdminLLMConfig,
  deleteAdminProvider,
  deleteAdminProviderModel,
  listAdminModelSyncCandidates,
  listAdminProviderModels,
  listAdminProviders,
  listAdminLLMConfigs,
  publishAdminModelSyncCandidates,
  reviewAdminModelSyncCandidate,
  reorderAdminProviders,
  syncAdminProviderModels,
  toggleAdminProvider,
  toggleAdminProviderModel,
  setAdminLLMConfigActive,
  updateAdminProvider,
  updateAdminProviderModel,
  updateAdminLLMConfig,
  uploadAdminProviderIcon,
} from '@/services/llm';
import type {
  ExecutableLLMConfigDTO,
  CreateProviderRequest,
  LLMCapability,
  LLMProtocol,
  ModelSyncCandidate,
  ModelSyncReviewStatus,
  ProviderModel,
  SystemProvider,
  UpdateProviderModelRequest,
  UpdateProviderRequest,
} from '@/types/api';

type PlatformConfigView = ExecutableLLMConfigDTO;

const CAPABILITY_LABELS: Record<LLMCapability, string> = {
  CHAT: '对话',
  VISION: '视觉',
  EMBEDDING: '稠密向量',
  SPARSE_EMBEDDING: '稀疏向量',
  RERANK: '重排',
  ASR: '语音识别',
};

const CAPABILITIES = ADMIN_MODEL_CAPABILITY_ORDER.map((value) => ({ value, label: CAPABILITY_LABELS[value] }));
const MODEL_CAPABILITY_ROW_CLASS_NAME =
  'flex flex-col gap-2 px-2.5 py-2.5 lg:flex-row lg:items-center lg:justify-between';

const PROTOCOLS: LLMProtocol[] = ['openai', 'anthropic', 'google', 'jina', 'dashscope', 'bge_m3', 'doubao_vision'];
const LINKRAG_PROVIDER_TYPE = 'linkrag';
type ModelStatusFilter = 'all' | 'active' | 'inactive';
type CatalogMode = 'models' | 'candidates';

const MODEL_STATUS_FILTERS: Array<{ value: ModelStatusFilter; label: string; dotClassName: string }> = [
  { value: 'all', label: '全部', dotClassName: 'bg-muted-soft' },
  { value: 'active', label: '已上架', dotClassName: 'bg-success' },
  { value: 'inactive', label: '已下架', dotClassName: 'bg-error' },
];

const CANDIDATE_STATUS_FILTERS: Array<{ value: ModelSyncReviewStatus; label: string; dotClassName: string }> = [
  { value: 'PENDING', label: '待审核', dotClassName: 'bg-warning' },
  { value: 'PUBLISHED', label: '已发布', dotClassName: 'bg-success' },
  { value: 'REJECTED', label: '已拒绝', dotClassName: 'bg-error' },
];
const DEFAULT_CANDIDATE_STATUS: ModelSyncReviewStatus = 'PENDING';
const CANDIDATE_PAGE_SIZE = 500;

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
};

const linkRagPresetInitialState = {
  mode: 'source' as 'source' | 'manual',
  sourceProviderModelId: '',
  sourceProviderId: '',
  sourceCapability: '' as '' | LLMCapability,
  modelName: '',
  displayName: '',
  capability: 'CHAT' as LLMCapability,
  protocol: 'openai' as LLMProtocol,
  apiBaseUrl: '',
  apiKey: '',
  isActive: true,
};

interface ModelSyncCandidateGroup {
  key: string;
  candidates: ModelSyncCandidate[];
  representative: ModelSyncCandidate;
}

interface PublishCandidateFormState {
  modelName: string;
  displayName: string;
  candidateIds: number[];
}

const publishCandidateInitialState: PublishCandidateFormState = {
  modelName: '',
  displayName: '',
  candidateIds: [],
};

function capabilityLabel(value: string) {
  return CAPABILITIES.find((item) => item.value === value)?.label || value;
}

function normalizeCapability(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function candidateCapability(candidate: ModelSyncCandidate) {
  return candidate.capability ?? candidate.inferredCapability;
}

function candidateProtocol(candidate: ModelSyncCandidate) {
  return candidate.inferredProtocol ?? candidate.protocol;
}

function presetMaskedKey(preset: PlatformConfigView | null | undefined) {
  return preset?.apiKeyMasked || '';
}

function findPresetForModel(
  presets: PlatformConfigView[],
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
  const [presets, setPresets] = useState<PlatformConfigView[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [catalogMode, setCatalogMode] = useState<CatalogMode>('models');
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
  const [linkRagPresetDialogOpen, setLinkRagPresetDialogOpen] = useState(false);
  const [editingLinkRagPreset, setEditingLinkRagPreset] = useState<PlatformConfigView | null>(null);
  const [linkRagPresetForm, setLinkRagPresetForm] = useState(linkRagPresetInitialState);
  const [linkRagSourceModels, setLinkRagSourceModels] = useState<ProviderModel[]>([]);
  const [linkRagSourceModelsLoading, setLinkRagSourceModelsLoading] = useState(false);
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<ModelSyncReviewStatus>(DEFAULT_CANDIDATE_STATUS);
  const [candidates, setCandidates] = useState<ModelSyncCandidate[]>([]);
  const [candidateTotal, setCandidateTotal] = useState(0);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [syncingProviderId, setSyncingProviderId] = useState<number | null>(null);
  const [reorderingProviders, setReorderingProviders] = useState(false);
  const [togglingModelIds, setTogglingModelIds] = useState<Set<number>>(() => new Set());
  const [togglingPresetIds, setTogglingPresetIds] = useState<Set<number>>(() => new Set());
  const [metadataCandidate, setMetadataCandidate] = useState<ModelSyncCandidate | null>(null);
  const [publishingCandidateGroup, setPublishingCandidateGroup] = useState<ModelSyncCandidateGroup | null>(null);
  const [publishCandidateForm, setPublishCandidateForm] = useState(publishCandidateInitialState);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [providerResult, modelResult, configResult] = await Promise.all([
        listAdminProviders(1, 500),
        listAdminProviderModels({ page: 1, size: 500 }),
        listAdminLLMConfigs(),
      ]);
      setProviders(providerResult.items || []);
      setModels(modelResult.items || []);
      setPresets(configResult || []);
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

  const loadCandidates = useCallback(
    async (
      providerId = selectedProviderId,
      reviewStatus = candidateStatusFilter,
      capability = modelFilters.capability || undefined,
    ) => {
      if (!providerId) {
        setCandidates([]);
        setCandidateTotal(0);
        return;
      }
      const provider = providers.find((item) => item.id === providerId);
      if (provider && isLinkRagProvider(provider)) {
        setCandidates([]);
        setCandidateTotal(0);
        return;
      }

      setCandidatesLoading(true);
      try {
        const result = await listAdminModelSyncCandidates({
          page: 1,
          size: CANDIDATE_PAGE_SIZE,
          providerId,
          reviewStatus,
          capability,
        });
        setCandidates(result.items || []);
        setCandidateTotal(result.total || 0);
      } catch (error) {
        console.error(error);
        setCandidates([]);
        setCandidateTotal(0);
        addToast('error', '外部候选加载失败');
      } finally {
        setCandidatesLoading(false);
      }
    },
    [addToast, candidateStatusFilter, modelFilters.capability, providers, selectedProviderId],
  );

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

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

  useEffect(() => {
    if (selectedProvider && isLinkRagProvider(selectedProvider) && catalogMode === 'candidates') {
      setCatalogMode('models');
    }
  }, [catalogMode, selectedProvider]);

  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      const providerModels = models.filter((model) => model.providerId === provider.id);
      const providerPresets = isLinkRagProvider(provider) ? presets : [];
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

  const selectedCandidateGroups = useMemo<ModelSyncCandidateGroup[]>(() => {
    if (!selectedProvider || catalogMode !== 'candidates') return [];
    const filteredCandidates = candidates
      .filter((candidate) => candidate.providerId === selectedProvider.id)
      .filter((candidate) => {
        const capability = candidateCapability(candidate);
        const protocol = candidateProtocol(candidate);
        if (modelFilters.capability && normalizeCapability(capability) !== modelFilters.capability) {
          return false;
        }
        return matchesKeyword(
          [
            candidate.externalModelId,
            candidate.modelName,
            candidate.displayName || '',
            capability || '',
            protocol || '',
            candidate.inferredApiBaseUrl || '',
          ],
          keyword,
        );
      });
    const groups = new Map<string, ModelSyncCandidate[]>();
    filteredCandidates.forEach((candidate) => {
      const key = `${candidate.providerId}:${candidate.syncSource}:${candidate.externalModelId || candidate.modelName}`;
      const items = groups.get(key) || [];
      items.push(candidate);
      groups.set(key, items);
    });
    return Array.from(groups.entries())
      .map(([key, items]) => {
        const sortedCandidates = [...items].sort((a, b) =>
          compareAdminModelCapabilities(candidateCapability(a), candidateCapability(b)),
        );
        return { key, candidates: sortedCandidates, representative: sortedCandidates[0] };
      })
      .sort((a, b) => compareCandidateGroupsByReleaseDate(a.candidates, b.candidates));
  }, [candidates, catalogMode, keyword, modelFilters.capability, selectedProvider]);

  const selectedPresets = useMemo(() => {
    if (!selectedProvider || !isLinkRagProvider(selectedProvider)) return [];
    return presets
      .filter((preset) => {
        if (modelFilters.capability && normalizeCapability(preset.capability) !== modelFilters.capability) {
          return false;
        }
        if (modelFilters.status === 'active' && !preset.isActive) return false;
        if (modelFilters.status === 'inactive' && preset.isActive) return false;
        return matchesKeyword(
          [
            preset.modelName,
            preset.displayName || '',
            preset.capability,
            preset.protocol,
            preset.apiBaseUrl,
            presetMaskedKey(preset),
          ],
          keyword,
        );
      })
      .sort(
        (a, b) =>
          a.capability.localeCompare(b.capability) || getModelDisplayName(a).localeCompare(getModelDisplayName(b)),
      );
  }, [keyword, modelFilters.capability, modelFilters.status, presets, selectedProvider]);

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
      iconUrl: provider.iconUrl ?? '',
      iconObjectKey: provider.iconObjectKey ?? '',
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
          iconUrl: providerForm.iconUrl ?? '',
          iconObjectKey: providerForm.iconObjectKey ?? '',
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
          iconUrl: providerForm.iconUrl ?? '',
          iconObjectKey: providerForm.iconObjectKey ?? '',
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

  async function handleReorderProviders(orderedProviderIds: number[]) {
    if (reorderingProviders || orderedProviderIds.length !== providers.length) return;

    const previousProviders = providers;
    const providerById = new Map(providers.map((provider) => [provider.id, provider]));
    const reorderedProviders = orderedProviderIds
      .map((providerId, index) => {
        const provider = providerById.get(providerId);
        return provider ? { ...provider, priority: (orderedProviderIds.length - index) * 10 } : null;
      })
      .filter((provider): provider is SystemProvider => provider !== null);

    if (reorderedProviders.length !== providers.length) return;

    setProviders(reorderedProviders);
    setReorderingProviders(true);
    try {
      await reorderAdminProviders(orderedProviderIds);
      addToast('success', '厂商顺序已更新');
    } catch (error) {
      console.error(error);
      setProviders(previousProviders);
      addToast('error', '厂商排序保存失败');
    } finally {
      setReorderingProviders(false);
    }
  }

  async function handleUploadProviderIcon(file: File) {
    const result = await uploadAdminProviderIcon(file);
    addToast('success', '厂商图标已上传');
    return result;
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
    });
    setModelDialogOpen(true);
  }

  function openEditModel(model: ProviderModel) {
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
    });
    setModelDialogOpen(true);
  }

  async function handleSubmitModel(event: FormEvent) {
    event.preventDefault();
    const targetProvider = providers.find((provider) => provider.id === Number(modelForm.providerId));
    const linkRagModel = isLinkRagProvider(targetProvider);
    const existingPreset = editingModel ? findPresetForModel(presets, editingModel) : undefined;
    if (linkRagModel && !modelForm.apiKey.trim() && !existingPreset) {
      addToast('error', '平台模型需要填写 API Key');
      return;
    }

    try {
      if (linkRagModel) {
        const request = {
          catalogMutation: {
            providerId: Number(modelForm.providerId),
            modelName: modelForm.modelName.trim(),
            ...(modelForm.displayName.trim() ? { displayName: modelForm.displayName.trim() } : {}),
            capability: modelForm.capability,
            protocol: modelForm.protocol,
            apiBaseUrl: modelForm.apiBaseUrl.trim(),
          },
          ...(modelForm.apiKey.trim() ? { apiKey: modelForm.apiKey.trim() } : {}),
        };
        if (existingPreset) await updateAdminLLMConfig(existingPreset.configId, request);
        else await createAdminLLMConfig(request);
      } else if (editingModel) {
        const payload: UpdateProviderModelRequest = {
          modelName: modelForm.modelName.trim(),
          displayName: modelForm.displayName.trim(),
          capability: modelForm.capability,
          protocol: modelForm.protocol,
          apiBaseUrl: modelForm.apiBaseUrl.trim(),
          isActive: modelForm.isActive,
        };
        await updateAdminProviderModel(editingModel.id, payload);
      } else {
        await addAdminProviderModel(Number(modelForm.providerId), {
          modelName: modelForm.modelName.trim(),
          ...(modelForm.displayName.trim() ? { displayName: modelForm.displayName.trim() } : {}),
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

  async function loadLinkRagSourceModels() {
    setLinkRagSourceModelsLoading(true);
    try {
      const result = await listAdminProviderModels({ page: 1, size: 500, isActive: true });
      setLinkRagSourceModels(result.items || []);
    } catch (error) {
      console.error(error);
      setLinkRagSourceModels([]);
      addToast('error', '已上架模型加载失败');
    } finally {
      setLinkRagSourceModelsLoading(false);
    }
  }

  function openCreateLinkRagPreset() {
    setEditingLinkRagPreset(null);
    setLinkRagPresetForm(linkRagPresetInitialState);
    setLinkRagPresetDialogOpen(true);
    void loadLinkRagSourceModels();
  }

  function openEditLinkRagPreset(preset: PlatformConfigView) {
    setEditingLinkRagPreset(preset);
    setLinkRagPresetForm({
      ...linkRagPresetInitialState,
      mode: 'manual',
      modelName: preset.modelName,
      displayName: preset.displayName ?? '',
      capability: preset.capability as LLMCapability,
      protocol: preset.protocol,
      apiBaseUrl: preset.apiBaseUrl,
      isActive: preset.isActive,
    });
    setLinkRagPresetDialogOpen(true);
    void loadLinkRagSourceModels();
  }

  async function handleSubmitLinkRagPreset(event: FormEvent) {
    event.preventDefault();
    const apiKey = linkRagPresetForm.apiKey.trim();

    if (!editingLinkRagPreset && !apiKey) {
      addToast('error', '平台配置需要填写 API Key');
      return;
    }
    if (!editingLinkRagPreset && linkRagPresetForm.mode === 'source' && !linkRagPresetForm.sourceProviderModelId) {
      addToast('error', '请选择一条已上架模型能力');
      return;
    }

    try {
      if (editingLinkRagPreset) {
        const payload = {
          catalogMutation: {
            providerId: editingLinkRagPreset.providerId,
            modelName: linkRagPresetForm.modelName.trim(),
            ...(linkRagPresetForm.displayName.trim() ? { displayName: linkRagPresetForm.displayName.trim() } : {}),
            capability: linkRagPresetForm.capability,
            protocol: linkRagPresetForm.protocol,
            apiBaseUrl: linkRagPresetForm.apiBaseUrl.trim(),
          },
          ...(apiKey ? { apiKey } : {}),
        };
        await updateAdminLLMConfig(editingLinkRagPreset.configId, payload);
      } else if (linkRagPresetForm.mode === 'source') {
        const payload = {
          sourceProviderModelId: Number(linkRagPresetForm.sourceProviderModelId),
          apiKey,
        };
        await createAdminLLMConfig(payload);
      } else {
        if (!selectedProvider) throw new Error('缺少平台厂商');
        const payload = {
          catalogMutation: {
            providerId: selectedProvider.id,
            modelName: linkRagPresetForm.modelName.trim(),
            ...(linkRagPresetForm.displayName.trim() ? { displayName: linkRagPresetForm.displayName.trim() } : {}),
            capability: linkRagPresetForm.capability,
            protocol: linkRagPresetForm.protocol,
            apiBaseUrl: linkRagPresetForm.apiBaseUrl.trim(),
          },
          apiKey,
        };
        await createAdminLLMConfig(payload);
      }

      setLinkRagPresetDialogOpen(false);
      addToast('success', editingLinkRagPreset ? '平台模型已更新' : '平台模型已添加');
      await loadData();
    } catch (error) {
      console.error(error);
      addToast('error', '平台模型保存失败');
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

  async function handleToggleModelActive(model: ProviderModel) {
    const nextActive = !model.isActive;
    setTogglingModelIds((current) => new Set(current).add(model.id));
    setModels((current) => current.map((item) => (item.id === model.id ? { ...item, isActive: nextActive } : item)));
    try {
      await toggleAdminProviderModel(model.id, nextActive);
      addToast('success', nextActive ? '模型能力已上架' : '模型能力已下架');
    } catch (error) {
      console.error(error);
      setModels((current) =>
        current.map((item) => (item.id === model.id ? { ...item, isActive: model.isActive } : item)),
      );
      addToast('error', '模型能力状态更新失败');
    } finally {
      setTogglingModelIds((current) => {
        const next = new Set(current);
        next.delete(model.id);
        return next;
      });
    }
  }

  async function handleToggleLinkRagPresetActive(preset: PlatformConfigView) {
    const nextActive = !preset.isActive;
    setTogglingPresetIds((current) => new Set(current).add(preset.configId));
    setPresets((current) =>
      current.map((item) => (item.configId === preset.configId ? { ...item, isActive: nextActive } : item)),
    );
    try {
      await setAdminLLMConfigActive(preset.configId, nextActive);
      addToast('success', nextActive ? '平台模型已启用' : '平台模型已停用');
    } catch (error) {
      console.error(error);
      setPresets((current) =>
        current.map((item) => (item.configId === preset.configId ? { ...item, isActive: preset.isActive } : item)),
      );
      addToast('error', '平台模型状态更新失败');
    } finally {
      setTogglingPresetIds((current) => {
        const next = new Set(current);
        next.delete(preset.configId);
        return next;
      });
    }
  }

  async function handleRefreshExternalModels(provider: SystemProvider) {
    setSyncingProviderId(provider.id);
    try {
      const job = await syncAdminProviderModels(provider.id);
      addToast('success', `外部目录刷新完成：新增 ${job.addedCount}，更新 ${job.updatedCount}，过期 ${job.staleCount}`);
      await loadCandidates(provider.id, candidateStatusFilter, modelFilters.capability || undefined);
    } catch (error) {
      console.error(error);
      addToast('error', '外部目录刷新失败');
    } finally {
      setSyncingProviderId(null);
    }
  }

  function openPublishCandidate(group: ModelSyncCandidateGroup) {
    const candidate = group.representative;
    setPublishingCandidateGroup(group);
    setPublishCandidateForm({
      modelName: candidate.modelName || candidate.externalModelId || '',
      displayName: candidate.displayName || candidate.modelName || candidate.externalModelId || '',
      candidateIds: group.candidates.map((item) => item.id),
    });
  }

  async function handleSubmitPublishCandidate(event: FormEvent) {
    event.preventDefault();
    if (!publishingCandidateGroup || publishCandidateForm.candidateIds.length === 0) return;

    const payload = {
      modelName: publishCandidateForm.modelName.trim(),
      displayName: publishCandidateForm.displayName.trim(),
      candidateIds: publishCandidateForm.candidateIds,
    };

    try {
      await publishAdminModelSyncCandidates(payload);
      const providerId = publishingCandidateGroup.representative.providerId;
      setPublishingCandidateGroup(null);
      addToast('success', `${payload.candidateIds.length} 个能力已发布到正式目录`);
      await Promise.all([
        loadData(),
        loadCandidates(providerId, candidateStatusFilter, modelFilters.capability || undefined),
      ]);
    } catch (error) {
      console.error(error);
      addToast('error', '候选发布失败');
    }
  }

  async function handleReviewCandidateGroup(
    group: ModelSyncCandidateGroup,
    reviewStatus: Exclude<ModelSyncReviewStatus, 'PUBLISHED'>,
  ) {
    try {
      await Promise.all(group.candidates.map((candidate) => reviewAdminModelSyncCandidate(candidate.id, reviewStatus)));
      addToast('success', reviewStatus === 'REJECTED' ? '模型候选已拒绝' : '模型候选已恢复待审核');
      await loadCandidates(
        group.representative.providerId,
        candidateStatusFilter,
        modelFilters.capability || undefined,
      );
    } catch (error) {
      console.error(error);
      addToast('error', '候选状态更新失败');
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
                reorderDisabled={Boolean(keyword)}
                reordering={reorderingProviders}
                onReorder={handleReorderProviders}
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
                      allPlatformConfigs={presets}
                      candidateGroups={selectedCandidateGroups}
                      candidateTotal={candidateTotal}
                      catalogMode={catalogMode}
                      setCatalogMode={setCatalogMode}
                      candidateStatusFilter={candidateStatusFilter}
                      setCandidateStatusFilter={setCandidateStatusFilter}
                      modelFilters={modelFilters}
                      setModelFilters={setModelFilters}
                      candidatesLoading={candidatesLoading}
                      syncing={syncingProviderId === selectedProvider.id}
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
                      onCreateLinkRagPreset={openCreateLinkRagPreset}
                      onEditLinkRagPreset={openEditLinkRagPreset}
                      onRefreshExternal={handleRefreshExternalModels}
                      onOpenPublishCandidate={openPublishCandidate}
                      onReviewCandidate={handleReviewCandidateGroup}
                      onViewCandidateMetadata={setMetadataCandidate}
                      togglingPresetIds={togglingPresetIds}
                      onToggleLinkRagPreset={handleToggleLinkRagPresetActive}
                      onDeleteLinkRagPreset={(preset) =>
                        window.confirm(`确定删除平台模型「${getModelDisplayName(preset)}」吗？`)
                          ? void withRefresh(
                              () => deleteAdminLLMConfig(preset.configId),
                              '平台模型已删除',
                              '平台模型删除失败',
                            )
                          : undefined
                      }
                      togglingModelIds={togglingModelIds}
                      onToggleModel={handleToggleModelActive}
                      onDeleteModel={(model) =>
                        window.confirm(
                          `确定删除模型能力「${getModelDisplayName(model)} / ${capabilityLabel(model.capability)}」吗？`,
                        )
                          ? void withRefresh(
                              async () => {
                                const preset = findPresetForModel(presets, model);
                                if (preset) {
                                  await deleteAdminLLMConfig(preset.configId);
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
          onUploadIcon={handleUploadProviderIcon}
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
      {linkRagPresetDialogOpen && (
        <LinkRagPresetDialog
          darkMode={darkMode}
          providers={providers}
          sourceModels={linkRagSourceModels}
          sourceModelsLoading={linkRagSourceModelsLoading}
          editingPreset={editingLinkRagPreset}
          form={linkRagPresetForm}
          setForm={setLinkRagPresetForm}
          onClose={() => setLinkRagPresetDialogOpen(false)}
          onSubmit={handleSubmitLinkRagPreset}
        />
      )}
      {publishingCandidateGroup && (
        <PublishCandidateDialog
          darkMode={darkMode}
          candidateGroup={publishingCandidateGroup}
          form={publishCandidateForm}
          setForm={setPublishCandidateForm}
          onClose={() => setPublishingCandidateGroup(null)}
          onSubmit={handleSubmitPublishCandidate}
        />
      )}
      {metadataCandidate && (
        <CandidateMetadataDialog
          darkMode={darkMode}
          candidate={metadataCandidate}
          onClose={() => setMetadataCandidate(null)}
        />
      )}
    </div>
  );
}

function HeaderAction({
  darkMode,
  primary,
  disabled,
  children,
  onClick,
}: {
  darkMode: boolean;
  primary?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold',
        primary
          ? 'bg-primary text-white hover:opacity-90'
          : darkMode
            ? 'bg-white/[0.045] text-[#d6d6d6] hover:bg-white/[0.075]'
            : 'bg-surface-soft text-text-main/70 hover:bg-white',
        disabled && 'cursor-not-allowed opacity-55',
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
  reorderDisabled,
  reordering,
  onReorder,
}: {
  darkMode: boolean;
  providers: SystemProvider[];
  providerTotal: number;
  activeProviderTotal: number;
  configTotal: number;
  selectedProviderId: number | null;
  onSelect: (id: number) => void;
  reorderDisabled: boolean;
  reordering: boolean;
  onReorder: (orderedProviderIds: number[]) => void;
}) {
  const [draggedProviderId, setDraggedProviderId] = useState<number | null>(null);
  const [orderedProviders, setOrderedProviders] = useState(providers);
  const orderedProvidersRef = useRef(providers);
  const suppressClickRef = useRef(false);
  const dragDisabled = reorderDisabled || reordering;

  useEffect(() => {
    if (draggedProviderId === null) {
      orderedProvidersRef.current = providers;
      setOrderedProviders(providers);
    }
  }, [draggedProviderId, providers]);

  function handleReorderPreview(nextProviders: SystemProvider[]) {
    orderedProvidersRef.current = nextProviders;
    setOrderedProviders(nextProviders);
  }

  function handleDragStart(providerId: number) {
    suppressClickRef.current = true;
    setDraggedProviderId(providerId);
  }

  function handleDragEnd() {
    const orderedProviderIds = orderedProvidersRef.current.map((provider) => provider.id);
    if (orderedProviderIds.every((providerId, index) => providerId === providers[index]?.id)) {
      orderedProvidersRef.current = providers;
      setOrderedProviders(providers);
    } else {
      onReorder(orderedProviderIds);
    }

    setDraggedProviderId(null);
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }

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
        <div className="flex items-center justify-between gap-3">
          <h3 className={cn('text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>厂商</h3>
          {reordering ? (
            <Loader2 size={13} className={cn('animate-spin', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/40')} />
          ) : null}
        </div>
        <p className={cn('mt-0.5 text-[11px]', darkMode ? 'text-[#8f8f8f]' : 'text-text-main/40')}>
          {reordering ? '正在保存排序' : reorderDisabled ? '清除搜索后可拖动排序' : '拖动调整展示顺序'}
        </p>
      </div>
      <Reorder.Group
        as="div"
        axis="y"
        values={orderedProviders}
        onReorder={handleReorderPreview}
        layoutScroll
        className="max-h-[640px] overflow-y-auto overscroll-contain p-1.5 xl:h-[calc(100vh-320px)] xl:max-h-none"
      >
        {providers.length === 0 ? (
          <div className={cn('px-3 py-10 text-center text-sm', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>
            没有匹配的厂商
          </div>
        ) : (
          orderedProviders.map((provider) => (
            <SortableProviderRow
              key={provider.id}
              provider={provider}
              darkMode={darkMode}
              selected={provider.id === selectedProviderId}
              dragging={draggedProviderId === provider.id}
              dragDisabled={dragDisabled}
              onDragStart={() => handleDragStart(provider.id)}
              onDragEnd={handleDragEnd}
              onSelect={() => {
                if (!suppressClickRef.current) onSelect(provider.id);
              }}
            />
          ))
        )}
      </Reorder.Group>
    </aside>
  );
}

function SortableProviderRow({
  provider,
  darkMode,
  selected,
  dragging,
  dragDisabled,
  onDragStart,
  onDragEnd,
  onSelect,
}: {
  provider: SystemProvider;
  darkMode: boolean;
  selected: boolean;
  dragging: boolean;
  dragDisabled: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onSelect: () => void;
}) {
  const dragControls = useDragControls();
  const platformProvider = isLinkRagProvider(provider);
  const providerLabel = platformProvider ? '平台模型' : provider.providerName;

  return (
    <Reorder.Item
      as="div"
      value={provider}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.015 }}
      className={cn(
        'relative z-0 flex w-full min-w-0 items-start rounded-md transition-[background-color,box-shadow] duration-150',
        darkMode ? 'hover:bg-white/[0.045]' : 'hover:bg-ink/[0.025]',
        dragging &&
          (darkMode
            ? 'z-10 bg-[#272727] shadow-[0_8px_24px_rgba(0,0,0,0.38)]'
            : 'z-10 bg-white shadow-[0_8px_24px_rgba(20,20,20,0.14)]'),
      )}
    >
      <button
        type="button"
        disabled={dragDisabled}
        aria-label={`拖动调整${providerLabel}顺序`}
        onPointerDown={(event) => {
          if (dragDisabled) return;
          event.preventDefault();
          dragControls.start(event);
        }}
        className={cn(
          'flex w-7 shrink-0 touch-none justify-center self-stretch rounded-l-md pt-[18px]',
          dragDisabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing',
        )}
      >
        <GripVertical
          size={15}
          aria-hidden="true"
          className={cn(
            dragDisabled
              ? darkMode
                ? 'text-[#555]'
                : 'text-text-main/15'
              : darkMode
                ? 'text-[#777]'
                : 'text-text-main/25',
          )}
        />
      </button>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-r-md py-2.5 pl-0.5 pr-2 text-left"
      >
        <ProviderAvatar
          providerType={provider.providerType}
          providerName={provider.providerName}
          iconUrl={provider.iconUrl}
          darkMode={darkMode}
        />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className={cn('truncate text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
              {providerLabel}
            </span>
            <span
              className={cn('h-1.5 w-1.5 shrink-0 rounded-full', provider.isActive ? 'bg-success' : 'bg-muted-soft')}
            />
          </span>
          <span
            className={cn(
              'mt-1 block truncate font-mono text-[11px]',
              darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45',
            )}
          >
            {platformProvider ? 'LinkRag · 全站共享' : `${provider.providerType} · ${provider.defaultProtocol}`}
          </span>
        </span>
      </button>
    </Reorder.Item>
  );
}

function ProviderWorkspace({
  darkMode,
  provider,
  models,
  allProviderModels,
  presets,
  allPlatformConfigs,
  candidateGroups,
  candidateTotal,
  catalogMode,
  setCatalogMode,
  candidateStatusFilter,
  setCandidateStatusFilter,
  modelFilters,
  setModelFilters,
  candidatesLoading,
  syncing,
  onEditProvider,
  onToggleProvider,
  onDeleteProvider,
  onCreateModel,
  onEditModel,
  onCreateLinkRagPreset,
  onEditLinkRagPreset,
  onRefreshExternal,
  onOpenPublishCandidate,
  onReviewCandidate,
  onViewCandidateMetadata,
  togglingPresetIds,
  onToggleLinkRagPreset,
  onDeleteLinkRagPreset,
  togglingModelIds,
  onToggleModel,
  onDeleteModel,
}: {
  darkMode: boolean;
  provider: SystemProvider;
  models: ProviderModel[];
  allProviderModels: ProviderModel[];
  presets: PlatformConfigView[];
  allPlatformConfigs: PlatformConfigView[];
  candidateGroups: ModelSyncCandidateGroup[];
  candidateTotal: number;
  catalogMode: CatalogMode;
  setCatalogMode: React.Dispatch<React.SetStateAction<CatalogMode>>;
  candidateStatusFilter: ModelSyncReviewStatus;
  setCandidateStatusFilter: React.Dispatch<React.SetStateAction<ModelSyncReviewStatus>>;
  modelFilters: { capability: '' | LLMCapability; status: ModelStatusFilter };
  setModelFilters: React.Dispatch<React.SetStateAction<{ capability: '' | LLMCapability; status: ModelStatusFilter }>>;
  candidatesLoading: boolean;
  syncing: boolean;
  onEditProvider: (provider: SystemProvider) => void;
  onToggleProvider: (provider: SystemProvider) => void;
  onDeleteProvider: (provider: SystemProvider) => void;
  onCreateModel: () => void;
  onEditModel: (model: ProviderModel) => void;
  onCreateLinkRagPreset: () => void;
  onEditLinkRagPreset: (preset: PlatformConfigView) => void;
  onRefreshExternal: (provider: SystemProvider) => void;
  onOpenPublishCandidate: (group: ModelSyncCandidateGroup) => void;
  onReviewCandidate: (
    group: ModelSyncCandidateGroup,
    reviewStatus: Exclude<ModelSyncReviewStatus, 'PUBLISHED'>,
  ) => void;
  onViewCandidateMetadata: (candidate: ModelSyncCandidate) => void;
  togglingPresetIds: Set<number>;
  onToggleLinkRagPreset: (preset: PlatformConfigView) => void;
  onDeleteLinkRagPreset: (preset: PlatformConfigView) => void;
  togglingModelIds: Set<number>;
  onToggleModel: (model: ProviderModel) => void;
  onDeleteModel: (model: ProviderModel) => void;
}) {
  const isLinkRag = isLinkRagProvider(provider);
  const activeConfigCount = isLinkRag
    ? allPlatformConfigs.filter((preset) => preset.isActive).length
    : allProviderModels.filter((model) => model.isActive).length;
  const configTotal = isLinkRag ? allPlatformConfigs.length : allProviderModels.length;
  const capabilityDimensionCount = new Set(
    (isLinkRag ? allPlatformConfigs : allProviderModels).map((item) => item.capability),
  ).size;
  const visibleModelCount = new Set(models.map((model) => model.modelName)).size;
  const totalModelCount = new Set(allProviderModels.map((model) => model.modelName)).size;

  return (
    <div className="min-w-0">
      <section className="px-1 pb-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 gap-3">
            <ProviderAvatar
              providerType={provider.providerType}
              providerName={provider.providerName}
              iconUrl={provider.iconUrl}
              darkMode={darkMode}
              alignIconStart
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={cn('truncate text-xl font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                  {isLinkRag ? '平台模型' : provider.providerName}
                </h2>
                <StatusPill darkMode={darkMode} active={provider.isActive} />
                <SmallBadge darkMode={darkMode}>{provider.defaultProtocol}</SmallBadge>
                <SmallBadge darkMode={darkMode}>priority {provider.priority}</SmallBadge>
                <SmallBadge darkMode={darkMode}>
                  配置 {activeConfigCount}/{configTotal}
                </SmallBadge>
                <SmallBadge darkMode={darkMode}>
                  能力维度 {capabilityDimensionCount}/{CAPABILITIES.length}
                </SmallBadge>
              </div>
              <p className={cn('mt-1 font-mono text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>
                {isLinkRag ? 'LinkRag · 全站共享配置' : provider.providerType}
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
            <ActionButton onClick={isLinkRag ? onCreateLinkRagPreset : onCreateModel}>
              <Plus size={13} />
              添加模型
            </ActionButton>
            {!isLinkRag ? (
              <ActionButton onClick={() => onRefreshExternal(provider)} disabled={syncing}>
                {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                同步模型
              </ActionButton>
            ) : null}
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
          title={isLinkRag ? '平台配置' : catalogMode === 'candidates' ? '外部模型候选' : '模型能力目录'}
          meta={
            isLinkRag
              ? `${presets.length} 条平台配置`
              : catalogMode === 'candidates'
                ? `${candidateGroups.length} 个模型 · ${candidateTotal} 个能力候选 · ${formatModelSyncStatus(candidateStatusFilter)}`
                : `${visibleModelCount}/${totalModelCount} 个模型 · ${models.length} 个能力`
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
                目录状态
              </FilterLabel>
              {MODEL_STATUS_FILTERS.map((status) => (
                <FilterChip
                  key={status.value}
                  darkMode={darkMode}
                  active={catalogMode === 'models' && modelFilters.status === status.value}
                  dotClassName={status.dotClassName}
                  onClick={() => {
                    setCatalogMode('models');
                    setModelFilters((prev) => ({ ...prev, status: status.value }));
                  }}
                >
                  {status.label}
                </FilterChip>
              ))}
            </div>
            {!isLinkRag ? (
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <FilterLabel darkMode={darkMode} icon={<Check size={13} />}>
                  审核状态
                </FilterLabel>
                {CANDIDATE_STATUS_FILTERS.map((status) => (
                  <FilterChip
                    key={status.value}
                    darkMode={darkMode}
                    active={catalogMode === 'candidates' && candidateStatusFilter === status.value}
                    dotClassName={status.dotClassName}
                    onClick={() => {
                      setCatalogMode('candidates');
                      setCandidateStatusFilter(status.value);
                    }}
                  >
                    {status.label}
                  </FilterChip>
                ))}
              </div>
            ) : null}
          </div>
          <AnimatePresence initial={false}>
            {modelFilters.capability || modelFilters.status !== 'all' || catalogMode !== 'models' ? (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                onClick={() => {
                  setCatalogMode('models');
                  setModelFilters({ capability: '', status: 'all' });
                  setCandidateStatusFilter(DEFAULT_CANDIDATE_STATUS);
                }}
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
        {isLinkRag ? (
          <PlatformConfigList
            darkMode={darkMode}
            presets={presets}
            togglingIds={togglingPresetIds}
            onEdit={onEditLinkRagPreset}
            onToggle={onToggleLinkRagPreset}
            onDelete={onDeleteLinkRagPreset}
          />
        ) : catalogMode === 'candidates' ? (
          <ModelSyncCandidateList
            darkMode={darkMode}
            candidateGroups={candidateGroups}
            loading={candidatesLoading}
            onPublish={onOpenPublishCandidate}
            onReview={onReviewCandidate}
            onViewMetadata={onViewCandidateMetadata}
          />
        ) : (
          <ModelCapabilityList
            darkMode={darkMode}
            models={models}
            presets={presets}
            togglingIds={togglingModelIds}
            onEdit={onEditModel}
            showLinkRagConfig={isLinkRag}
            onToggle={onToggleModel}
            onDelete={onDeleteModel}
          />
        )}
      </section>
    </div>
  );
}

function SectionHeader({ darkMode, title, meta }: { darkMode: boolean; title: string; meta: string }) {
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
    </div>
  );
}

function FilterLabel({ darkMode, icon, children }: { darkMode: boolean; icon?: ReactNode; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-[72px] shrink-0 items-center gap-1.5 text-[11px] font-bold',
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
        dotClassName && 'w-[76px] justify-start',
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

function PlatformConfigList({
  darkMode,
  presets,
  togglingIds,
  onEdit,
  onToggle,
  onDelete,
}: {
  darkMode: boolean;
  presets: PlatformConfigView[];
  togglingIds: Set<number>;
  onEdit: (preset: PlatformConfigView) => void;
  onToggle: (preset: PlatformConfigView) => void;
  onDelete: (preset: PlatformConfigView) => void;
}) {
  if (presets.length === 0) return <EmptyTableState darkMode={darkMode} label="暂无平台配置" />;

  return (
    <div className="max-h-[calc(100vh-410px)] min-h-0 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
      {presets.map((preset) => (
        <article
          key={preset.configId}
          className={cn(
            'flex flex-col gap-3 rounded-md px-3 py-3 xl:flex-row xl:items-start xl:justify-between',
            darkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-ink/[0.022]',
          )}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className={cn('truncate text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                {getModelDisplayName(preset)}
              </h4>
              <StatusPill darkMode={darkMode} active={preset.isActive} />
              <SmallBadge darkMode={darkMode}>来源 {preset.providerName || preset.providerType}</SmallBadge>
              <SmallBadge darkMode={darkMode}>{capabilityLabel(preset.capability)}</SmallBadge>
              <SmallBadge darkMode={darkMode}>{preset.protocol}</SmallBadge>
            </div>
            {preset.displayName?.trim() ? (
              <p className={cn('mt-1 font-mono text-[11px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>
                ID: {preset.modelName}
              </p>
            ) : null}
            <p
              className={cn(
                'mt-2 flex items-center gap-2 font-mono text-xs',
                darkMode ? 'text-[#a8a8a8]' : 'text-text-main/60',
              )}
            >
              <KeyRound size={13} />
              {presetMaskedKey(preset) || '未配置 Key'}
            </p>
            <p className={cn('mt-3 break-all text-xs leading-5', darkMode ? 'text-[#a8a8a8]' : 'text-text-main/60')}>
              {preset.apiBaseUrl}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1 xl:justify-end">
            <ActionButton onClick={() => onEdit(preset)}>
              <Edit2 size={13} />
              编辑
            </ActionButton>
            <ToggleSwitch
              checked={preset.isActive}
              disabled={togglingIds.has(preset.configId)}
              onChange={() => onToggle(preset)}
            />
            <ActionButton danger onClick={() => onDelete(preset)}>
              <Trash2 size={13} />
              删除
            </ActionButton>
          </div>
        </article>
      ))}
    </div>
  );
}

function ModelCapabilityList({
  darkMode,
  models,
  presets,
  togglingIds,
  onEdit,
  showLinkRagConfig,
  onToggle,
  onDelete,
}: {
  darkMode: boolean;
  models: ProviderModel[];
  presets: PlatformConfigView[];
  togglingIds: Set<number>;
  onEdit: (model: ProviderModel) => void;
  showLinkRagConfig: boolean;
  onToggle: (model: ProviderModel) => void;
  onDelete: (model: ProviderModel) => void;
}) {
  if (models.length === 0) return <EmptyTableState darkMode={darkMode} label="暂无匹配的模型能力" />;

  const groups = Array.from(
    models.reduce((result, model) => {
      const items = result.get(model.modelName) || [];
      items.push(model);
      result.set(model.modelName, items);
      return result;
    }, new Map<string, ProviderModel[]>()),
  )
    .map(([modelName, items]) => ({
      modelName,
      items: [...items].sort((a, b) => compareAdminModelCapabilities(a.capability, b.capability)),
    }))
    .sort((a, b) => a.modelName.localeCompare(b.modelName));

  return (
    <div className="max-h-[calc(100vh-410px)] min-h-0 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
      {groups.map((group) => {
        const representative = group.items[0];
        const activeCount = group.items.filter((model) => model.isActive).length;
        return (
          <article
            key={group.modelName}
            className={cn('rounded-md px-3 py-3', darkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-ink/[0.022]')}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h4 className={cn('truncate text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                {getModelDisplayName(representative)}
              </h4>
              <SmallBadge darkMode={darkMode}>{group.items.length} 个能力</SmallBadge>
              <SmallBadge darkMode={darkMode}>
                {activeCount}/{group.items.length} 已启用
              </SmallBadge>
            </div>
            {representative.displayName?.trim() ? (
              <p className={cn('mt-1 font-mono text-[11px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>
                ID: {representative.modelName}
              </p>
            ) : null}
            <div className={cn('mt-3 divide-y', darkMode ? 'divide-[#3a3a3a]' : 'divide-border-subtle')}>
              {group.items.map((model) => {
                const preset = showLinkRagConfig ? findPresetForModel(presets, model) : undefined;
                return (
                  <div key={model.id} className={MODEL_CAPABILITY_ROW_CLASS_NAME}>
                    <div className="grid min-w-0 flex-1 items-center gap-2 lg:grid-cols-[110px_120px_minmax(0,1fr)]">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'h-1.5 w-1.5 shrink-0 rounded-full',
                            model.isActive ? 'bg-success' : 'bg-muted-soft',
                          )}
                        />
                        <span className={cn('text-xs font-bold', darkMode ? 'text-[#d6d6d6]' : 'text-text-main/75')}>
                          {capabilityLabel(model.capability)}
                        </span>
                      </div>
                      <span className={cn('font-mono text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/50')}>
                        {model.protocol}
                      </span>
                      <span
                        className={cn('truncate font-mono text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/50')}
                        title={model.apiBaseUrl}
                      >
                        {model.apiBaseUrl}
                      </span>
                    </div>
                    {showLinkRagConfig ? (
                      <span
                        className={cn(
                          'flex items-center gap-1.5 font-mono text-[11px]',
                          darkMode ? 'text-[#a8a8a8]' : 'text-text-main/50',
                        )}
                      >
                        <KeyRound size={12} />
                        {presetMaskedKey(preset) || '未配置 Key'}
                      </span>
                    ) : null}
                    <div className="flex shrink-0 items-center gap-1">
                      <ActionButton onClick={() => onEdit(model)}>
                        <Edit2 size={13} />
                        编辑
                      </ActionButton>
                      <ToggleSwitch
                        checked={model.isActive}
                        disabled={togglingIds.has(model.id)}
                        onChange={() => onToggle(model)}
                      />
                      <ActionButton danger onClick={() => onDelete(model)}>
                        <Trash2 size={13} />
                        删除
                      </ActionButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function formatCandidateDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function formatReleaseDate(value: string | null | undefined) {
  return value || '-';
}

function formatModelSyncStatus(status: ModelSyncReviewStatus) {
  return CANDIDATE_STATUS_FILTERS.find((item) => item.value === status)?.label || status;
}

function formatModalities(value: string | null | undefined) {
  if (!value) return '-';
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) return parsed.map((item) => String(item)).join('、') || '-';
    return JSON.stringify(parsed);
  } catch {
    return value;
  }
}

function formatRawMetadata(value: string | null | undefined) {
  if (!value) return '暂无原始元数据';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function ModelSyncCandidateList({
  darkMode,
  candidateGroups,
  loading,
  onPublish,
  onReview,
  onViewMetadata,
}: {
  darkMode: boolean;
  candidateGroups: ModelSyncCandidateGroup[];
  loading: boolean;
  onPublish: (group: ModelSyncCandidateGroup) => void;
  onReview: (group: ModelSyncCandidateGroup, reviewStatus: Exclude<ModelSyncReviewStatus, 'PUBLISHED'>) => void;
  onViewMetadata: (candidate: ModelSyncCandidate) => void;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[180px] items-center justify-center">
        <Loader2 size={22} className={cn('animate-spin', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/40')} />
      </div>
    );
  }

  if (candidateGroups.length === 0) return <EmptyTableState darkMode={darkMode} label="暂无外部候选" />;

  return (
    <div className="max-h-[520px] min-h-0 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
      {candidateGroups.map((group) => {
        const candidate = group.representative;
        const published = group.candidates.every((item) => item.reviewStatus === 'PUBLISHED');
        const rejected = group.candidates.every((item) => item.reviewStatus === 'REJECTED');
        const matchedCount = group.candidates.filter((item) => item.matchedProviderModelId).length;

        return (
          <article
            key={group.key}
            className={cn(
              'flex flex-col gap-3 rounded-md px-3 py-3 2xl:flex-row 2xl:items-start 2xl:justify-between',
              darkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-ink/[0.022]',
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className={cn('truncate text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                  {candidate.displayName || candidate.modelName || candidate.externalModelId}
                </h4>
                <SmallBadge darkMode={darkMode}>{formatModelSyncStatus(candidate.reviewStatus)}</SmallBadge>
                <SmallBadge darkMode={darkMode}>{group.candidates.length} 个能力</SmallBadge>
                <SmallBadge darkMode={darkMode}>
                  {matchedCount > 0 ? `${matchedCount}/${group.candidates.length} 已存在` : '新增'}
                </SmallBadge>
              </div>
              <p className={cn('mt-1 font-mono text-[11px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>
                {candidate.modelName || '-'} · external: {candidate.externalModelId}
              </p>
              <div className="mt-3 space-y-2">
                <div className={cn('divide-y', darkMode ? 'divide-[#3a3a3a]' : 'divide-border-subtle')}>
                  {group.candidates.map((item) => {
                    const capability = candidateCapability(item);
                    return (
                      <div key={item.id} className={MODEL_CAPABILITY_ROW_CLASS_NAME}>
                        <div className="grid min-w-0 flex-1 items-center gap-2 lg:grid-cols-[110px_120px_minmax(0,1fr)]">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-soft" />
                            <span
                              className={cn('text-xs font-bold', darkMode ? 'text-[#d6d6d6]' : 'text-text-main/75')}
                            >
                              {capability ? capabilityLabel(capability) : '-'}
                            </span>
                          </div>
                          <span className={cn('font-mono text-xs', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/50')}>
                            {candidateProtocol(item) || '-'}
                          </span>
                          <span
                            className={cn(
                              'truncate font-mono text-xs',
                              darkMode ? 'text-[#a6a6a6]' : 'text-text-main/50',
                            )}
                            title={item.inferredApiBaseUrl || ''}
                          >
                            {item.inferredApiBaseUrl || '-'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <CandidateMetaItem
                    darkMode={darkMode}
                    label="发布日期"
                    value={formatReleaseDate(candidate.releaseDate)}
                  />
                  <CandidateMetaItem darkMode={darkMode} label="上下文窗口" value={candidate.contextWindow ?? '-'} />
                  <CandidateMetaItem darkMode={darkMode} label="最大输出" value={candidate.maxOutputTokens ?? '-'} />
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <CandidateMetaItem
                    darkMode={darkMode}
                    label="输入模态"
                    value={formatModalities(candidate.inputModalities)}
                  />
                  <CandidateMetaItem
                    darkMode={darkMode}
                    label="输出模态"
                    value={formatModalities(candidate.outputModalities)}
                  />
                  <CandidateMetaItem
                    darkMode={darkMode}
                    label="最后发现"
                    value={formatCandidateDate(candidate.lastSeenAt)}
                  />
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1 2xl:justify-end">
              <ActionButton onClick={() => onPublish(group)} disabled={published}>
                <Send size={13} />
                发布
              </ActionButton>
              {rejected ? (
                <ActionButton onClick={() => onReview(group, 'PENDING')}>
                  <RotateCcw size={13} />
                  恢复
                </ActionButton>
              ) : (
                <ActionButton danger onClick={() => onReview(group, 'REJECTED')} disabled={published}>
                  <Ban size={13} />
                  拒绝
                </ActionButton>
              )}
              <ActionButton onClick={() => onViewMetadata(candidate)}>
                <FileJson size={13} />
                元数据
              </ActionButton>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function CandidateMetaItem({
  darkMode,
  label,
  value,
  mono,
}: {
  darkMode: boolean;
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 text-xs leading-5">
      <span className={cn('mr-2 font-bold', darkMode ? 'text-[#8f8f8f]' : 'text-text-main/40')}>{label}</span>
      <span
        className={cn(
          'min-w-0 break-words',
          mono && 'font-mono break-all',
          darkMode ? 'text-[#b8b8b8]' : 'text-text-main/62',
        )}
      >
        {value}
      </span>
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
  iconUrl: customIconUrl,
  darkMode,
  alignIconStart,
}: {
  providerType: string;
  providerName?: string;
  iconUrl?: string | null;
  darkMode: boolean;
  alignIconStart?: boolean;
}) {
  const [customIconFailed, setCustomIconFailed] = useState(false);
  useEffect(() => setCustomIconFailed(false), [customIconUrl]);
  const fallbackIconUrl = getProviderIcon(providerType, providerName, undefined, { darkMode });
  const useCustomIcon = Boolean(customIconUrl && !customIconFailed);
  const iconUrl = useCustomIcon ? customIconUrl : fallbackIconUrl;
  const monochrome = !useCustomIcon && iconUrl ? isProviderIconMonochrome(iconUrl) : false;
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
          onError={() => {
            if (useCustomIcon) setCustomIconFailed(true);
          }}
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

function ActionButton({
  children,
  danger,
  disabled,
  onClick,
}: {
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-colors',
        danger ? 'text-error hover:bg-error/10' : 'text-text-main/65 hover:bg-primary/5 hover:text-text-main',
        disabled && 'cursor-not-allowed opacity-45 hover:bg-transparent',
      )}
    >
      {children}
    </button>
  );
}

function ToggleSwitch({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={checked ? '点击下架' : '点击上架'}
      title={checked ? '点击下架' : '点击上架'}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'group relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border px-[2px] outline-none transition-[background-color,border-color,box-shadow,transform,opacity] duration-200 ease-out active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/20',
        checked
          ? 'border-primary/40 bg-primary/85 shadow-[0_3px_10px_rgba(204,107,79,0.20)] hover:bg-primary'
          : 'border-border-subtle bg-surface-soft hover:border-primary/30 hover:bg-surface-card',
        disabled && 'cursor-wait opacity-70 active:scale-100',
      )}
    >
      {disabled ? (
        <span className="absolute inset-[2px] rounded-full bg-white/20 opacity-70 transition-opacity group-hover:opacity-90" />
      ) : null}
      <span
        className={cn(
          'relative h-4 w-4 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.16)] will-change-transform group-hover:shadow-[0_2px_6px_rgba(0,0,0,0.20)]',
          checked ? 'bg-white' : 'bg-muted-soft group-hover:bg-text-main/45',
          disabled && 'animate-pulse',
        )}
        style={{
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
          transition:
            'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 180ms ease-out, box-shadow 180ms ease-out',
        }}
      />
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
  maxWidthClassName,
  children,
  onClose,
}: {
  darkMode: boolean;
  title: string;
  maxWidthClassName?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button className="absolute inset-0 bg-black/50 " onClick={onClose} aria-label="关闭弹窗" />
      <section
        className={cn(
          'relative max-h-[90vh] w-full overflow-hidden rounded-2xl border',
          maxWidthClassName || 'max-w-[min(100vw-2rem,560px)]',
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
  disabled = false,
  children,
  onClick,
}: {
  darkMode: boolean;
  active: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-bold transition-[background-color,border-color,color,transform] duration-200 ease-out active:scale-[0.98]',
        disabled && 'cursor-not-allowed opacity-60 active:scale-100',
        active
          ? darkMode
            ? 'border-white/[0.16] bg-white/[0.09] text-[#f2f2f2]'
            : 'border-ink/10 bg-ink/[0.065] text-text-main'
          : darkMode
            ? 'border-white/[0.06] text-[#a6a6a6] hover:border-white/[0.12] hover:bg-white/[0.045] hover:text-[#f2f2f2]'
            : 'border-border-subtle text-text-main/55 hover:border-ink/10 hover:bg-ink/[0.03] hover:text-text-main',
      )}
    >
      {active ? <Check size={13} /> : null}
      {children}
    </button>
  );
}

function FormSelect({
  darkMode,
  value,
  placeholder,
  options,
  onChange,
}: {
  darkMode: boolean;
  value: string;
  placeholder: string;
  options: Array<{
    value: string;
    label: string;
    description?: string;
    icon?: { providerType: string; providerName?: string; iconUrl?: string | null };
  }>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && selectRef.current?.contains(target)) return;
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
    <div ref={selectRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex min-h-10 w-full items-center justify-between gap-3 rounded-[8px] px-3 py-2 text-left text-sm outline-none transition-[background-color,box-shadow,transform] duration-200 ease-out active:scale-[0.995]',
          darkMode
            ? 'bg-white/[0.045] text-[#f2f2f2] hover:bg-white/[0.07] focus-visible:shadow-[0_0_0_2px_rgba(255,255,255,0.12)]'
            : 'bg-bg-base/60 text-text-main hover:bg-ink/[0.035] focus-visible:shadow-[0_0_0_2px_rgba(24,24,24,0.08)]',
          open && (darkMode ? 'bg-white/[0.075]' : 'bg-ink/[0.04]'),
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          {selectedOption?.icon ? (
            <ProviderAvatar
              providerType={selectedOption.icon.providerType}
              providerName={selectedOption.icon.providerName}
              iconUrl={selectedOption.icon.iconUrl}
              darkMode={darkMode}
            />
          ) : null}
          <span className="min-w-0">
            <span
              className={cn(
                'block truncate font-bold',
                !selectedOption && (darkMode ? 'text-[#8f8f8f]' : 'text-text-main/40'),
              )}
            >
              {selectedOption?.label || placeholder}
            </span>
            {selectedOption?.description ? (
              <span
                className={cn('mt-0.5 block truncate text-[11px]', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}
              >
                {selectedOption.description}
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
              'absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-64 overflow-y-auto rounded-[8px] p-1 shadow-xl',
              darkMode ? 'bg-[#303030] shadow-black/25' : 'bg-white shadow-ink/10',
            )}
            role="listbox"
          >
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value || '__empty__'}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full min-w-0 items-start gap-3 rounded-[6px] px-2.5 py-2 text-left transition-[background-color,color] duration-150',
                    active
                      ? darkMode
                        ? 'bg-white/[0.08]'
                        : 'bg-ink/[0.045]'
                      : darkMode
                        ? 'hover:bg-white/[0.055]'
                        : 'hover:bg-ink/[0.028]',
                  )}
                >
                  {option.icon ? (
                    <ProviderAvatar
                      providerType={option.icon.providerType}
                      providerName={option.icon.providerName}
                      iconUrl={option.icon.iconUrl}
                      darkMode={darkMode}
                    />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn('block truncate text-sm font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}
                    >
                      {option.label}
                    </span>
                    {option.description ? (
                      <span
                        className={cn(
                          'mt-0.5 block truncate text-[11px]',
                          darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45',
                        )}
                      >
                        {option.description}
                      </span>
                    ) : null}
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
              iconUrl={selectedProvider.iconUrl}
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
                    iconUrl={provider.iconUrl}
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
  onUploadIcon,
  onClose,
  onSubmit,
}: {
  darkMode: boolean;
  editing: boolean;
  form: CreateProviderRequest;
  setForm: (form: CreateProviderRequest) => void;
  onUploadIcon: (file: File) => Promise<{ iconUrl: string; iconObjectKey: string }>;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const [uploadingIcon, setUploadingIcon] = useState(false);

  async function handleIconFileChange(file: File | undefined) {
    if (!file || uploadingIcon) return;
    if (file.size > 5 * 1024 * 1024) {
      window.alert('厂商图标不能超过 5MB');
      return;
    }
    setUploadingIcon(true);
    try {
      const result = await onUploadIcon(file);
      setForm({ ...form, iconUrl: result.iconUrl, iconObjectKey: result.iconObjectKey });
    } catch (error) {
      console.error(error);
      window.alert('厂商图标上传失败');
    } finally {
      setUploadingIcon(false);
    }
  }

  return (
    <DialogShell
      darkMode={darkMode}
      title={editing ? '编辑厂商' : '新增厂商'}
      maxWidthClassName="max-w-[min(100vw-2rem,700px)]"
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <div className="max-h-[calc(90vh-132px)] space-y-4 overflow-y-auto p-5 sm:p-6">
          <FormField darkMode={darkMode} label="厂商图标" hint="可选，支持常见图片格式，最大 5MB">
            <div className="flex flex-wrap items-center gap-3">
              <ProviderAvatar
                providerType={form.providerType}
                providerName={form.providerName}
                iconUrl={form.iconUrl}
                darkMode={darkMode}
              />
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <label
                  className={cn(
                    'inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3 text-xs font-bold',
                    darkMode
                      ? 'bg-white/[0.045] text-[#d6d6d6] hover:bg-white/[0.075]'
                      : 'bg-surface-soft text-text-main/70 hover:bg-ink/[0.035]',
                    uploadingIcon && 'cursor-not-allowed opacity-55',
                  )}
                >
                  {uploadingIcon ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploadingIcon ? '上传中' : '选择图片'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    disabled={uploadingIcon}
                    onChange={(event) => {
                      void handleIconFileChange(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                </label>
                {form.iconUrl ? (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, iconUrl: '', iconObjectKey: '' })}
                    className={cn(
                      'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold',
                      darkMode ? 'text-[#a6a6a6] hover:bg-white/[0.055]' : 'text-text-main/45 hover:bg-ink/[0.035]',
                    )}
                  >
                    <X size={14} />
                    移除
                  </button>
                ) : null}
              </div>
            </div>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              darkMode={darkMode}
              label="厂商标识"
              hint={editing ? '保存后不可修改' : '用于系统识别，如 openai'}
            >
              <input
                required
                disabled={editing}
                value={form.providerType}
                onChange={(e) => setForm({ ...form, providerType: e.target.value })}
                placeholder="openai"
                className={inputClassName(darkMode)}
              />
            </FormField>
            <FormField darkMode={darkMode} label="厂商名称" hint="管理端和用户侧展示名称">
              <input
                required
                value={form.providerName}
                onChange={(e) => setForm({ ...form, providerName: e.target.value })}
                placeholder="OpenAI"
                className={inputClassName(darkMode)}
              />
            </FormField>
          </div>

          <FormField darkMode={darkMode} label="默认调用地址" hint="新增模型时自动预填，可单独修改">
            <input
              required
              value={form.apiBaseUrl}
              onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className={inputClassName(darkMode)}
            />
          </FormField>

          <FormField darkMode={darkMode} label="默认协议" hint="新增模型时自动预选">
            <div className="flex flex-wrap gap-1.5">
              {PROTOCOLS.map((protocol) => (
                <FormChoice
                  key={protocol}
                  darkMode={darkMode}
                  active={form.defaultProtocol === protocol}
                  onClick={() => setForm({ ...form, defaultProtocol: protocol })}
                >
                  {protocol}
                </FormChoice>
              ))}
            </div>
          </FormField>

          <FormField darkMode={darkMode} label="优先级" hint="数值越小，展示越靠前">
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              placeholder="50"
              className={inputClassName(darkMode)}
            />
          </FormField>

          <div
            className={cn(
              'flex items-center justify-between gap-4 rounded-xl border px-3.5 py-3',
              darkMode ? 'border-[#3a3a3a] bg-white/[0.02]' : 'border-border-subtle bg-bg-base/35',
            )}
          >
            <div>
              <p className={cn('text-xs font-bold', darkMode ? 'text-[#d6d6d6]' : 'text-text-main/70')}>启用状态</p>
              <p className={cn('mt-1 text-[11px]', darkMode ? 'text-[#8f8f8f]' : 'text-text-main/40')}>
                禁用后该厂商及其模型不可用
              </p>
            </div>
            <ToggleSwitch checked={form.isActive} onChange={() => setForm({ ...form, isActive: !form.isActive })} />
          </div>
        </div>
        <FormActions darkMode={darkMode} onClose={onClose} />
      </form>
    </DialogShell>
  );
}

function PublishCandidateDialog({
  darkMode,
  candidateGroup,
  form,
  setForm,
  onClose,
  onSubmit,
}: {
  darkMode: boolean;
  candidateGroup: ModelSyncCandidateGroup;
  form: PublishCandidateFormState;
  setForm: (form: PublishCandidateFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const candidate = candidateGroup.representative;

  return (
    <DialogShell darkMode={darkMode} title="发布模型能力" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="max-h-[calc(90vh-132px)] space-y-4 overflow-y-auto p-6">
          <div className={cn('rounded-md px-3 py-2 text-xs', darkMode ? 'bg-white/[0.035]' : 'bg-ink/[0.025]')}>
            <p className={cn('font-mono', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45')}>
              external: {candidate.externalModelId}
            </p>
            <p className={cn('mt-1', darkMode ? 'text-[#d6d6d6]' : 'text-text-main/65')}>
              选择要发布的能力；不同能力会保留各自同步得到的协议和调用入口。
            </p>
          </div>
          <FormField darkMode={darkMode} label="真实模型名">
            <input
              required
              value={form.modelName}
              onChange={(e) => setForm({ ...form, modelName: e.target.value })}
              placeholder="gpt-4o"
              className={inputClassName(darkMode)}
            />
          </FormField>
          <FormField darkMode={darkMode} label="展示名">
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="GPT-4o"
              className={inputClassName(darkMode)}
            />
          </FormField>
          <FormField darkMode={darkMode} label="发布能力" hint={`已选择 ${form.candidateIds.length} 项`}>
            <div className="space-y-1.5">
              {candidateGroup.candidates.map((item) => {
                const selected = form.candidateIds.includes(item.id);
                const capability = candidateCapability(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (selected && form.candidateIds.length === 1) return;
                      setForm({
                        ...form,
                        candidateIds: selected
                          ? form.candidateIds.filter((id) => id !== item.id)
                          : [...form.candidateIds, item.id],
                      });
                    }}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
                      selected
                        ? darkMode
                          ? 'border-[#666] bg-white/[0.07]'
                          : 'border-primary/35 bg-primary/[0.045]'
                        : darkMode
                          ? 'border-[#3a3a3a] hover:bg-white/[0.035]'
                          : 'border-border-subtle hover:bg-ink/[0.025]',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        selected
                          ? 'border-primary bg-primary text-white'
                          : darkMode
                            ? 'border-[#666]'
                            : 'border-border-subtle',
                      )}
                    >
                      {selected ? <Check size={11} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-xs font-bold', darkMode ? 'text-[#f2f2f2]' : 'text-text-main')}>
                        {capability ? capabilityLabel(capability) : '-'}
                      </span>
                      <span
                        className={cn(
                          'mt-1 block truncate font-mono text-[10px]',
                          darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45',
                        )}
                      >
                        {candidateProtocol(item) || '-'} · {item.inferredApiBaseUrl || '-'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </FormField>
        </div>
        <FormActions darkMode={darkMode} onClose={onClose} />
      </form>
    </DialogShell>
  );
}

function CandidateMetadataDialog({
  darkMode,
  candidate,
  onClose,
}: {
  darkMode: boolean;
  candidate: ModelSyncCandidate;
  onClose: () => void;
}) {
  return (
    <DialogShell
      darkMode={darkMode}
      title="原始元数据"
      maxWidthClassName="max-w-[min(100vw-2rem,760px)]"
      onClose={onClose}
    >
      <div className="max-h-[calc(90vh-73px)] overflow-y-auto p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SmallBadge darkMode={darkMode}>{candidate.externalModelId}</SmallBadge>
          <SmallBadge darkMode={darkMode}>job {candidate.jobId}</SmallBadge>
          <SmallBadge darkMode={darkMode}>{candidate.syncSource}</SmallBadge>
          <SmallBadge darkMode={darkMode}>发布 {formatReleaseDate(candidate.releaseDate)}</SmallBadge>
        </div>
        <pre
          className={cn(
            'max-h-[62vh] overflow-auto rounded-md p-3 text-xs leading-5',
            darkMode ? 'bg-[#202020] text-[#d6d6d6]' : 'bg-bg-base text-text-main/75',
          )}
        >
          {formatRawMetadata(candidate.rawMetadata)}
        </pre>
      </div>
    </DialogShell>
  );
}

function LinkRagPresetDialog({
  darkMode,
  providers,
  sourceModels,
  sourceModelsLoading,
  editingPreset,
  form,
  setForm,
  onClose,
  onSubmit,
}: {
  darkMode: boolean;
  providers: SystemProvider[];
  sourceModels: ProviderModel[];
  sourceModelsLoading: boolean;
  editingPreset: PlatformConfigView | null;
  form: typeof linkRagPresetInitialState;
  setForm: (form: typeof linkRagPresetInitialState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const providerById = useMemo(() => new Map(providers.map((provider) => [provider.id, provider])), [providers]);
  const eligibleSourceModels = useMemo(() => {
    return sourceModels
      .filter((model) => {
        const provider = providerById.get(model.providerId);
        if (provider && isLinkRagProvider(provider)) return false;
        if (form.sourceProviderId && model.providerId !== Number(form.sourceProviderId)) return false;
        if (form.sourceCapability && normalizeCapability(model.capability) !== form.sourceCapability) return false;
        return model.isActive;
      })
      .sort((a, b) =>
        `${a.providerId}${a.modelName}${a.capability}`.localeCompare(`${b.providerId}${b.modelName}${b.capability}`),
      );
  }, [form.sourceCapability, form.sourceProviderId, providerById, sourceModels]);

  const sourceProviders = providers.filter((provider) => !isLinkRagProvider(provider));
  const sourceProviderOptions = [
    { value: '', label: '全部厂商', description: '不限制来源厂商' },
    ...sourceProviders.map((provider) => ({
      value: String(provider.id),
      label: provider.providerName,
      description: `${provider.providerType} · ${provider.defaultProtocol}`,
      icon: {
        providerType: provider.providerType,
        providerName: provider.providerName,
        iconUrl: provider.iconUrl,
      },
    })),
  ];
  const sourceCapabilityOptions = [
    { value: '', label: '全部能力', description: '不限制模型能力' },
    ...CAPABILITIES.map((capability) => ({
      value: capability.value,
      label: capability.label,
      description: capability.value,
    })),
  ];

  return (
    <DialogShell
      darkMode={darkMode}
      title={editingPreset ? '编辑平台模型' : '添加平台模型'}
      maxWidthClassName="max-w-[min(100vw-2rem,700px)]"
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <div className="max-h-[calc(90vh-132px)] space-y-4 overflow-y-auto p-5 sm:p-6">
          {!editingPreset ? (
            <div className="flex flex-wrap gap-1.5">
              <FormChoice
                darkMode={darkMode}
                active={form.mode === 'source'}
                onClick={() => setForm({ ...form, mode: 'source' })}
              >
                从已上架模型添加
              </FormChoice>
              <FormChoice
                darkMode={darkMode}
                active={form.mode === 'manual'}
                onClick={() => setForm({ ...form, mode: 'manual' })}
              >
                手动填写
              </FormChoice>
            </div>
          ) : null}

          {!editingPreset && form.mode === 'source' ? (
            <div className="space-y-4">
              <p className={cn('text-xs leading-5', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/50')}>
                选择已上架模型后，只需补充平台 API Key。
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField darkMode={darkMode} label="来源厂商">
                  <FormSelect
                    darkMode={darkMode}
                    value={form.sourceProviderId}
                    placeholder="选择来源厂商"
                    options={sourceProviderOptions}
                    onChange={(value) => setForm({ ...form, sourceProviderId: value, sourceProviderModelId: '' })}
                  />
                </FormField>
                <FormField darkMode={darkMode} label="来源能力">
                  <FormSelect
                    darkMode={darkMode}
                    value={form.sourceCapability}
                    placeholder="选择来源能力"
                    options={sourceCapabilityOptions}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        sourceCapability: value as '' | LLMCapability,
                        sourceProviderModelId: '',
                      })
                    }
                  />
                </FormField>
              </div>
              <FormField darkMode={darkMode} label="已上架正式模型" hint="将复制模型名、能力、协议和调用地址。">
                {sourceModelsLoading ? (
                  <div className="flex min-h-[120px] items-center justify-center">
                    <Loader2
                      size={20}
                      className={cn('animate-spin', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/40')}
                    />
                  </div>
                ) : eligibleSourceModels.length === 0 ? (
                  <EmptyTableState darkMode={darkMode} label="暂无可添加的已上架模型" />
                ) : (
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-md">
                    {eligibleSourceModels.map((model) => {
                      const provider = providerById.get(model.providerId);
                      const active = form.sourceProviderModelId === String(model.id);
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => setForm({ ...form, sourceProviderModelId: String(model.id) })}
                          className={cn(
                            'flex w-full min-w-0 items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
                            active
                              ? darkMode
                                ? 'bg-white/[0.08]'
                                : 'bg-ink/[0.055]'
                              : darkMode
                                ? 'hover:bg-white/[0.045]'
                                : 'hover:bg-ink/[0.025]',
                          )}
                        >
                          <ProviderAvatar
                            providerType={provider?.providerType || ''}
                            providerName={provider?.providerName}
                            iconUrl={provider?.iconUrl}
                            darkMode={darkMode}
                          />
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                'block truncate text-sm font-bold',
                                darkMode ? 'text-[#f2f2f2]' : 'text-text-main',
                              )}
                            >
                              {getModelDisplayName(model)}
                            </span>
                            <span
                              className={cn(
                                'mt-1 block truncate text-xs',
                                darkMode ? 'text-[#a6a6a6]' : 'text-text-main/45',
                              )}
                            >
                              {provider?.providerName || `provider ${model.providerId}`} ·{' '}
                              {capabilityLabel(model.capability)} · {model.protocol}
                            </span>
                          </span>
                          {active ? (
                            <Check size={15} className={darkMode ? 'text-[#f2f2f2]' : 'text-text-main/65'} />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </FormField>
            </div>
          ) : (
            <div className="space-y-4">
              {!editingPreset ? (
                <p className={cn('text-xs leading-5', darkMode ? 'text-[#a6a6a6]' : 'text-text-main/50')}>
                  直接创建一条可供用户选择的平台配置。
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField darkMode={darkMode} label="真实模型名" hint="API 请求中的 modelName">
                  <input
                    required
                    value={form.modelName}
                    onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                    placeholder="deepseek-chat"
                    className={inputClassName(darkMode)}
                  />
                </FormField>
                <FormField darkMode={darkMode} label="展示名" hint="可选，留空显示真实模型名">
                  <input
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    placeholder="DeepSeek Chat"
                    className={inputClassName(darkMode)}
                  />
                </FormField>
              </div>
              <div className="space-y-4">
                <FormField
                  darkMode={darkMode}
                  label="能力"
                  hint={editingPreset ? '保存后不可修改' : '一个配置对应一种能力'}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {CAPABILITIES.map((capability) => (
                      <FormChoice
                        key={capability.value}
                        darkMode={darkMode}
                        active={form.capability === capability.value}
                        disabled={Boolean(editingPreset)}
                        onClick={() => setForm({ ...form, capability: capability.value })}
                      >
                        {capability.label}
                      </FormChoice>
                    ))}
                  </div>
                </FormField>
                <FormField darkMode={darkMode} label="协议">
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
              </div>
              <FormField darkMode={darkMode} label="调用地址" hint="填写完整请求地址">
                <input
                  required
                  value={form.apiBaseUrl}
                  onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value })}
                  placeholder="https://api.example.com/v1/chat/completions"
                  className={inputClassName(darkMode)}
                />
              </FormField>
            </div>
          )}

          <FormField
            darkMode={darkMode}
            label="平台 API Key"
            hint={
              editingPreset ? `留空则保留当前 Key（${presetMaskedKey(editingPreset)}）` : '将加密保存，不会展示明文'
            }
          >
            <input
              required={!editingPreset}
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder={editingPreset ? '留空表示不修改' : 'sk-platform-...'}
              className={inputClassName(darkMode)}
            />
          </FormField>
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
  presets: PlatformConfigView[];
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
    });
  };

  return (
    <DialogShell
      darkMode={darkMode}
      title={editing ? '编辑模型' : '添加模型'}
      maxWidthClassName="max-w-[min(100vw-2rem,700px)]"
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <div className="max-h-[calc(90vh-132px)] space-y-4 overflow-y-auto p-5 sm:p-6">
          <FormField darkMode={darkMode} label="厂商" hint={editing ? '保存后不可修改' : '选择后会预填协议和调用地址'}>
            <ProviderPicker
              darkMode={darkMode}
              providers={providers}
              value={form.providerId}
              disabled={editing}
              onChange={handleProviderChange}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField darkMode={darkMode} label="真实模型名" hint="API 请求中的 modelName">
              <input
                required
                value={form.modelName}
                onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                placeholder="gpt-4o"
                className={inputClassName(darkMode)}
              />
            </FormField>
            <FormField darkMode={darkMode} label="展示名" hint="可选，留空显示真实模型名">
              <input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="GPT-4o"
                className={inputClassName(darkMode)}
              />
            </FormField>
          </div>
          <div className="space-y-4">
            <FormField
              darkMode={darkMode}
              label="能力"
              hint={currentPreset ? '保存后不可修改' : '一个配置对应一种能力'}
            >
              <div className="flex flex-wrap gap-1.5">
                {CAPABILITIES.map((capability) => (
                  <FormChoice
                    key={capability.value}
                    darkMode={darkMode}
                    active={form.capability === capability.value}
                    disabled={Boolean(currentPreset)}
                    onClick={() => setForm({ ...form, capability: capability.value })}
                  >
                    {capability.label}
                  </FormChoice>
                ))}
              </div>
            </FormField>
            <FormField darkMode={darkMode} label="协议">
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
          </div>
          <FormField darkMode={darkMode} label="调用地址" hint="填写完整请求地址">
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
                label="平台 API Key"
                hint={
                  editing && currentPreset
                    ? `留空则保留当前 Key（${presetMaskedKey(currentPreset)}）`
                    : '将加密保存，不会展示明文'
                }
              >
                <input
                  required={!editing || !currentPreset}
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder={editing && currentPreset ? '留空表示不修改' : 'sk-...'}
                  className={inputClassName(darkMode)}
                />
              </FormField>
            </div>
          ) : null}
          {editing && !linkRagModel ? (
            <div
              className={cn(
                'flex items-center justify-between gap-4 rounded-xl border px-3.5 py-3',
                darkMode ? 'border-[#3a3a3a] bg-white/[0.02]' : 'border-border-subtle bg-bg-base/35',
              )}
            >
              <div>
                <p className={cn('text-xs font-bold', darkMode ? 'text-[#d6d6d6]' : 'text-text-main/70')}>上架状态</p>
                <p className={cn('mt-1 text-[11px]', darkMode ? 'text-[#8f8f8f]' : 'text-text-main/40')}>
                  下架后用户不可选择该模型
                </p>
              </div>
              <ToggleSwitch checked={form.isActive} onChange={() => setForm({ ...form, isActive: !form.isActive })} />
            </div>
          ) : null}
        </div>
        <FormActions darkMode={darkMode} onClose={onClose} />
      </form>
    </DialogShell>
  );
}
