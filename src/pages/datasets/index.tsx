import { useState, useEffect, type MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertCircle,
  ArrowUpDown,
  Database,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import denseIconUrl from '@/assets/icons/color/dense.svg';
import sparseIconUrl from '@/assets/icons/color/sparse.svg';
import { Routes } from '@/routes';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { EmbeddingModelSelect } from '@/components/EmbeddingModelSelect';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { getDatasets, createDataset, updateDataset, deleteDataset } from '@/services/dataset';
import { getLLMConfigs } from '@/services/llm';
import { useToast } from '@/contexts/ToastContext';
import type { DatasetDTO, LLMConfigDTO } from '@/types/api';

function getInitialModelConfigId(configs: LLMConfigDTO[]) {
  return configs.find((config) => config.isDefault)?.id ?? configs[0]?.id ?? null;
}

export default function DatasetsPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchString, setSearchString] = useState('');
  const [datasets, setDatasets] = useState<DatasetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt'>('updatedAt');
  const [errorMessage, setErrorMessage] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetDesc, setNewDatasetDesc] = useState('');
  const [sparseEmbeddingConfigs, setSparseEmbeddingConfigs] = useState<LLMConfigDTO[]>([]);
  const [denseEmbeddingConfigs, setDenseEmbeddingConfigs] = useState<LLMConfigDTO[]>([]);
  const [embeddingConfigsLoading, setEmbeddingConfigsLoading] = useState(true);
  const [selectedSparseEmbeddingConfigId, setSelectedSparseEmbeddingConfigId] = useState<number | null>(null);
  const [selectedDenseEmbeddingConfigId, setSelectedDenseEmbeddingConfigId] = useState<number | null>(null);
  const [createFieldErrors, setCreateFieldErrors] = useState<{
    sparseEmbeddingConfigId?: string;
    denseEmbeddingConfigId?: string;
  }>({});
  const [creating, setCreating] = useState(false);
  const [editingDataset, setEditingDataset] = useState<DatasetDTO | null>(null);
  const [editDatasetName, setEditDatasetName] = useState('');
  const [editDatasetDesc, setEditDatasetDesc] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deletingDatasetIds, setDeletingDatasetIds] = useState<number[]>([]);
  const [datasetPendingDelete, setDatasetPendingDelete] = useState<DatasetDTO | null>(null);

  useEffect(() => {
    loadDatasets();
    loadEmbeddingConfigs();
  }, []);

  useEffect(() => {
    if (!createDialogOpen) return;
    setSelectedSparseEmbeddingConfigId((current) => current ?? getInitialModelConfigId(sparseEmbeddingConfigs));
    setSelectedDenseEmbeddingConfigId((current) => current ?? getInitialModelConfigId(denseEmbeddingConfigs));
  }, [createDialogOpen, denseEmbeddingConfigs, sparseEmbeddingConfigs]);

  const loadDatasets = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const result = await getDatasets(1, 100);
      setDatasets(result.items);
    } catch (error) {
      console.error('Failed to load datasets:', error);
      setErrorMessage('知识库列表加载失败，请检查后端服务或稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  const loadEmbeddingConfigs = async () => {
    setEmbeddingConfigsLoading(true);
    try {
      const [sparseConfigs, denseConfigs] = await Promise.all([
        getLLMConfigs({ capability: 'SPARSE_EMBEDDING', isActive: true }),
        getLLMConfigs({ capability: 'EMBEDDING', isActive: true }),
      ]);
      setSparseEmbeddingConfigs(
        sparseConfigs.filter((config) => config.capability === 'SPARSE_EMBEDDING' && config.isActive),
      );
      setDenseEmbeddingConfigs(denseConfigs.filter((config) => config.capability === 'EMBEDDING' && config.isActive));
    } catch (error) {
      console.error('Failed to load embedding configs:', error);
      setSparseEmbeddingConfigs([]);
      setDenseEmbeddingConfigs([]);
    } finally {
      setEmbeddingConfigsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setCreateFieldErrors({});
    setSelectedSparseEmbeddingConfigId(getInitialModelConfigId(sparseEmbeddingConfigs));
    setSelectedDenseEmbeddingConfigId(getInitialModelConfigId(denseEmbeddingConfigs));
    setCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    if (creating) return;
    setCreateDialogOpen(false);
    setCreateFieldErrors({});
  };

  const handleCreateDataset = async () => {
    const name = newDatasetName.trim();
    const description = newDatasetDesc.trim();
    if (!name || creating) return;
    const nextErrors: typeof createFieldErrors = {};
    if (!selectedSparseEmbeddingConfigId) {
      nextErrors.sparseEmbeddingConfigId = '请选择稀疏向量模型';
    }
    if (!selectedDenseEmbeddingConfigId) {
      nextErrors.denseEmbeddingConfigId = '请选择稠密向量模型';
    }
    if (Object.keys(nextErrors).length > 0) {
      setCreateFieldErrors(nextErrors);
      addToast('error', '请补全向量模型绑定');
      return;
    }

    setCreating(true);
    try {
      const ds = await createDataset({
        name,
        ...(description ? { description } : {}),
        sparse_embedding_config_id: selectedSparseEmbeddingConfigId,
        dense_embedding_config_id: selectedDenseEmbeddingConfigId,
      });
      setDatasets((prev) => [ds, ...prev]);
      setNewDatasetName('');
      setNewDatasetDesc('');
      setCreateDialogOpen(false);
      setCreateFieldErrors({});
      addToast('success', '知识库已创建');
    } catch (error) {
      console.error('Failed to create dataset:', error);
      if (error instanceof ApiError && error.code === 400) {
        const nextErrors: typeof createFieldErrors = {};
        if (error.message.includes('稀疏向量模型配置')) {
          nextErrors.sparseEmbeddingConfigId = error.message;
        }
        if (error.message.includes('稠密向量模型配置')) {
          nextErrors.denseEmbeddingConfigId = error.message;
        }
        if (Object.keys(nextErrors).length > 0) {
          setCreateFieldErrors(nextErrors);
        }
      }
    } finally {
      setCreating(false);
    }
  };

  const requestDeleteDataset = (dataset: DatasetDTO, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (deletingDatasetIds.includes(dataset.id)) return;
    setDatasetPendingDelete(dataset);
  };

  const handleConfirmDeleteDataset = async () => {
    if (!datasetPendingDelete || deletingDatasetIds.includes(datasetPendingDelete.id)) return;
    const dataset = datasetPendingDelete;
    setDeletingDatasetIds((prev) => [...prev, dataset.id]);
    try {
      await deleteDataset(dataset.id);
      setDatasets((prev) => prev.filter((item) => item.id !== dataset.id));
      setDatasetPendingDelete(null);
      addToast('success', '知识库已删除');
    } catch (error) {
      console.error('Failed to delete dataset:', error);
    } finally {
      setDeletingDatasetIds((prev) => prev.filter((id) => id !== dataset.id));
    }
  };

  const handleEditDataset = (dataset: DatasetDTO, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setEditingDataset(dataset);
    setEditDatasetName(dataset.name);
    setEditDatasetDesc(dataset.description ?? '');
  };

  const resetEditDialog = () => {
    setEditingDataset(null);
    setEditDatasetName('');
    setEditDatasetDesc('');
  };

  const handleCloseEditDialog = () => {
    if (updating) return;
    resetEditDialog();
  };

  const handleUpdateDataset = async () => {
    if (!editingDataset || updating) return;
    const name = editDatasetName.trim();
    const description = editDatasetDesc.trim();
    if (!name) return;

    setUpdating(true);
    try {
      const updated = await updateDataset(editingDataset.id, {
        name,
        description,
      });
      setDatasets((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      resetEditDialog();
      addToast('success', '知识库信息已更新');
    } catch (error) {
      console.error('Failed to update dataset:', error);
    } finally {
      setUpdating(false);
    }
  };

  const filteredDatasets = datasets
    .filter((d) => `${d.name} ${d.description ?? ''}`.toLowerCase().includes(searchString.toLowerCase()))
    .sort((a, b) => {
      const timeA = new Date(a[sortBy] || '').getTime();
      const timeB = new Date(b[sortBy] || '').getTime();
      return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
    });
  const hasSearch = searchString.trim().length > 0;
  const showInitialLoading = loading && datasets.length === 0;
  const showBlockingError = Boolean(errorMessage) && datasets.length === 0;
  const deletingPendingDataset = datasetPendingDelete ? deletingDatasetIds.includes(datasetPendingDelete.id) : false;
  const sparseModelUnavailable = !embeddingConfigsLoading && sparseEmbeddingConfigs.length === 0;
  const denseModelUnavailable = !embeddingConfigsLoading && denseEmbeddingConfigs.length === 0;
  const createDisabled =
    !newDatasetName.trim() ||
    creating ||
    embeddingConfigsLoading ||
    sparseModelUnavailable ||
    denseModelUnavailable ||
    !selectedSparseEmbeddingConfigId ||
    !selectedDenseEmbeddingConfigId;

  const formatDatasetTime = (value: string) => {
    if (!value) return '-';
    const time = new Date(value);
    return Number.isNaN(time.getTime()) ? value : time.toLocaleDateString('zh-CN');
  };

  const getStatusLabel = (status: DatasetDTO['status']) => {
    if (status === 'ACTIVE') return '已启用';
    if (status === 'INACTIVE') return '已停用';
    return '已删除';
  };
  const sortLabel = sortBy === 'createdAt' ? '按创建时间排序' : '按更新时间排序';

  return (
    <div className="flex h-full flex-col bg-canvas text-text-main">
      {/* Header */}
      <header className="shrink-0 px-4 pt-3 pb-2 lg:flex lg:h-16 lg:items-center lg:justify-between lg:gap-2 lg:border-b lg:border-border-subtle lg:px-8 lg:py-0">
        {/* 面包屑：桌面端显示；移动端由外壳顶栏承担标题 */}
        <div className="hidden min-w-0 lg:block">
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '知识库' }]} />
        </div>
        <div className="flex flex-1 items-center gap-2 lg:flex-none lg:justify-end">
          <div className="relative min-w-0 flex-1 lg:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="搜索知识库..."
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              className="h-10 w-full rounded-lg border border-border-subtle bg-surface-soft pl-9 pr-3 text-sm text-text-main placeholder:text-muted-soft transition-colors focus:border-primary/35 focus:bg-canvas focus:outline-none lg:h-9 lg:w-72 lg:rounded-md lg:pr-4 lg:text-xs"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 lg:gap-2">
            <button
              type="button"
              onClick={() => setSortBy((prev) => (prev === 'createdAt' ? 'updatedAt' : 'createdAt'))}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-soft text-text-secondary transition-colors hover:border-primary/30 hover:bg-surface-card hover:text-ink focus:outline-none lg:h-9 lg:w-auto lg:gap-2 lg:rounded-md lg:px-3 lg:text-xs lg:font-bold"
              title="点击切换排序方式"
              aria-label={sortLabel}
            >
              <ArrowUpDown size={14} className="text-muted" />
              <span className="hidden lg:inline">{sortLabel}</span>
            </button>
            <button
              onClick={() => void loadDatasets()}
              disabled={loading}
              className={cn(
                'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-soft text-text-secondary transition-colors hover:bg-surface-card hover:text-ink disabled:cursor-not-allowed lg:h-9 lg:w-auto lg:gap-2 lg:rounded-md lg:px-3 lg:text-xs lg:font-bold',
                loading && 'opacity-60',
              )}
              title="刷新知识库"
              aria-label="刷新知识库"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden lg:inline">刷新</span>
            </button>
            <button
              type="button"
              onClick={openCreateDialog}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-primary-active lg:hidden"
              aria-label="新建知识库"
            >
              <Plus size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pt-8 lg:pb-8">
        {/* Stats Bar */}
        <div className="mb-4 flex items-center gap-2 text-xs text-muted lg:mb-6 lg:gap-6 lg:mono-label">
          <span>共 {datasets.length} 个知识库</span>
          {hasSearch && <span>筛选出 {filteredDatasets.length} 个</span>}
        </div>

        {showInitialLoading ? (
          <div className="flex h-44 flex-col items-center justify-center rounded-xl border border-hairline bg-bg-card-solid lg:h-56 lg:rounded-2xl (--)]">
            <Loader2 size={24} className="mb-3 animate-spin text-ink" />
            <p className="mono-label text-muted">正在加载知识库</p>
          </div>
        ) : showBlockingError ? (
          <div className="flex h-44 flex-col items-center justify-center rounded-xl border border-hairline bg-bg-card-solid px-5 text-center lg:h-56 lg:rounded-2xl (--)]">
            <AlertCircle size={26} className="mb-3 text-error" />
            <p className="text-sm mb-4 text-ink">{errorMessage}</p>
            <button
              onClick={() => void loadDatasets()}
              className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-white hover:bg-primary-active"
            >
              重试
            </button>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="flex h-44 flex-col items-center justify-center rounded-xl border border-hairline bg-bg-card-solid px-5 text-center lg:h-56 lg:rounded-2xl (--)]">
            <Database size={30} className="mb-3 text-muted" />
            <p className="text-sm font-bold mb-2 text-ink">{hasSearch ? '没有匹配的知识库' : '还没有知识库'}</p>
            <p className="text-sm mb-4 text-muted">
              {hasSearch ? '换个关键词试试' : '新建一个知识库后，就可以上传文件并开始问答'}
            </p>
            {!hasSearch && (
              <button
                onClick={openCreateDialog}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-white hover:bg-primary-active"
              >
                <Plus size={14} />
                新建知识库
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[142px] lg:gap-4">
            {filteredDatasets.map((dataset) => {
              const deleting = deletingDatasetIds.includes(dataset.id);

              return (
                <div
                  key={dataset.id}
                  onClick={() => navigate(`/datasets/${dataset.id}`)}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-hairline bg-bg-card-solid p-4 transition-all duration-200 ease-out active:scale-[0.99] lg:h-full lg:rounded-2xl lg:hover:-translate-y-0.5 lg:hover:border-primary/40 lg:hover:bg-primary/[0.025] lg:hover:shadow-card lg:active:translate-y-0 (--)]"
                >
                  <div className="mb-2 flex items-start justify-between gap-3 lg:block">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-soft lg:h-7 lg:w-7 lg:bg-transparent">
                      <Database size={16} className="text-muted" />
                    </div>
                    <div className="flex shrink-0 items-center gap-1 lg:hidden">
                      <button
                        onClick={(event) => handleEditDataset(dataset, event)}
                        className="rounded-lg p-2 text-muted transition-colors hover:bg-primary/[0.08] hover:text-ink"
                        title="编辑知识库"
                        aria-label="编辑知识库"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/datasets/${dataset.id}/parse-config`);
                        }}
                        className="rounded-lg p-2 text-muted transition-colors hover:bg-primary/[0.08] hover:text-ink"
                        title="解析配置"
                        aria-label="解析配置"
                      >
                        <Settings size={14} />
                      </button>
                      <button
                        onClick={(event) => requestDeleteDataset(dataset, event)}
                        disabled={deleting}
                        className="rounded-lg p-2 text-muted transition-colors hover:bg-error/[0.08] hover:text-error disabled:cursor-not-allowed disabled:opacity-60"
                        title="删除知识库"
                        aria-label="删除知识库"
                      >
                        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                  <h3 className="mb-1 truncate text-base font-bold text-ink transition-colors group-hover:text-primary lg:mb-0.5 lg:text-sm lg:uppercase lg:tracking-wider">
                    {dataset.name}
                  </h3>
                  {dataset.description && (
                    <p className="mb-3 line-clamp-2 min-h-0 text-sm leading-5 text-text-secondary lg:mb-1 lg:text-[11px] lg:leading-4">
                      {dataset.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 lg:items-end">
                    <div className="flex min-w-0 items-center gap-2 lg:flex-col lg:items-start lg:gap-0.5">
                      <span className="mono-label text-muted">{getStatusLabel(dataset.status)}</span>
                      <span className="h-1 w-1 rounded-full bg-muted-soft lg:hidden" aria-hidden="true" />
                      <span className="mono-label text-muted">{formatDatasetTime(dataset.updatedAt)}</span>
                    </div>
                    <div className="hidden shrink-0 items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100 lg:flex">
                      <button
                        onClick={(event) => handleEditDataset(dataset, event)}
                        className="p-2 rounded-lg text-muted transition-colors hover:bg-primary/[0.08] hover:text-ink"
                        title="编辑知识库"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/datasets/${dataset.id}/parse-config`);
                        }}
                        className="p-2 rounded-lg text-muted transition-colors hover:bg-primary/[0.08] hover:text-ink"
                        title="解析配置"
                      >
                        <Settings size={14} />
                      </button>
                      <button
                        onClick={(event) => requestDeleteDataset(dataset, event)}
                        disabled={deleting}
                        className="p-2 rounded-lg text-muted transition-colors hover:bg-error/[0.08] hover:text-error disabled:cursor-not-allowed disabled:opacity-60"
                        title="删除知识库"
                      >
                        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add New */}
            <div
              onClick={openCreateDialog}
              className="hidden h-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/25 bg-primary/[0.035] p-5 text-muted transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/[0.07] hover:text-ink hover:shadow-card active:translate-y-0 active:scale-[0.99] lg:flex"
            >
              <Plus size={24} className="mb-2" />
              <span className="text-xs font-bold uppercase tracking-wider">添加知识库</span>
            </div>
          </div>
        )}

        {/* Create Dataset Dialog */}
        {createDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-[max(2rem,env(safe-area-inset-top))]">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={closeCreateDialog} />
            <div className="relative w-full max-w-[560px] rounded-2xl bg-bg-card-solid shadow-dialog lg:w-[min(100vw-2rem,560px)] lg:rounded-xl (--)]">
              <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5 lg:px-6">
                <div>
                  <h3 className="text-lg font-bold text-ink">新建知识库</h3>
                  <p className="mt-1 text-xs text-muted">填写基础信息并选择向量模型。</p>
                </div>
                <button
                  onClick={closeCreateDialog}
                  className="-mr-2 -mt-2 rounded-lg p-2 text-muted transition-colors hover:bg-primary/[0.08] hover:text-ink"
                  aria-label="关闭"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-5 px-5 py-4 lg:px-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-secondary">
                      知识库名称
                    </label>
                    <input
                      type="text"
                      value={newDatasetName}
                      onChange={(e) => setNewDatasetName(e.target.value)}
                      maxLength={128}
                      placeholder="输入知识库名称"
                      className="h-10 w-full border-0 border-b border-hairline bg-transparent px-0 text-sm text-text-main placeholder:text-muted-soft transition-colors focus:border-primary/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-secondary">
                      描述（可选）
                    </label>
                    <input
                      type="text"
                      value={newDatasetDesc}
                      onChange={(e) => setNewDatasetDesc(e.target.value)}
                      maxLength={512}
                      placeholder="用于知识问答、产品文档..."
                      className="h-10 w-full border-0 border-b border-hairline bg-transparent px-0 text-sm text-text-main placeholder:text-muted-soft transition-colors focus:border-primary/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <EmbeddingModelSelect
                    label="稀疏向量模型"
                    iconUrl={sparseIconUrl}
                    value={selectedSparseEmbeddingConfigId}
                    configs={sparseEmbeddingConfigs}
                    loading={embeddingConfigsLoading}
                    error={createFieldErrors.sparseEmbeddingConfigId}
                    unavailableMessage="请先配置并启用 SPARSE_EMBEDDING 能力模型"
                    helperText=""
                    onChange={(value) => {
                      setSelectedSparseEmbeddingConfigId(value);
                      setCreateFieldErrors((prev) => ({ ...prev, sparseEmbeddingConfigId: undefined }));
                    }}
                  />
                  <EmbeddingModelSelect
                    label="稠密向量模型"
                    iconUrl={denseIconUrl}
                    value={selectedDenseEmbeddingConfigId}
                    configs={denseEmbeddingConfigs}
                    loading={embeddingConfigsLoading}
                    error={createFieldErrors.denseEmbeddingConfigId}
                    unavailableMessage="请先配置并启用 EMBEDDING 能力模型"
                    helperText=""
                    onChange={(value) => {
                      setSelectedDenseEmbeddingConfigId(value);
                      setCreateFieldErrors((prev) => ({ ...prev, denseEmbeddingConfigId: undefined }));
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 px-5 pb-5 pt-3 lg:flex lg:items-center lg:justify-end lg:px-6">
                <button
                  onClick={closeCreateDialog}
                  className="h-11 rounded-lg bg-surface-soft px-3 text-xs font-bold uppercase tracking-wider text-text-secondary transition-colors hover:text-ink lg:h-auto lg:bg-transparent lg:py-2"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateDataset}
                  disabled={createDisabled}
                  className="h-11 rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60 lg:h-auto lg:py-2"
                >
                  {creating ? '创建中' : embeddingConfigsLoading ? '加载模型' : '创建'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Dataset Dialog */}
        {editingDataset && (
          <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={handleCloseEditDialog} />
            <div className="relative w-full overflow-hidden rounded-t-2xl border border-hairline bg-bg-card-solid shadow-dialog lg:w-[min(100vw-2rem,480px)] lg:rounded-2xl (--)]">
              <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4 lg:px-6">
                <h3 className="text-lg font-bold text-ink">编辑知识库</h3>
                <button
                  onClick={handleCloseEditDialog}
                  disabled={updating}
                  className="p-2 rounded-lg text-muted transition-colors hover:bg-primary/[0.08] hover:text-ink disabled:opacity-60"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4 p-5 lg:p-6">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-secondary">
                    知识库名称
                  </label>
                  <input
                    type="text"
                    value={editDatasetName}
                    onChange={(e) => setEditDatasetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleUpdateDataset();
                    }}
                    maxLength={128}
                    placeholder="输入知识库名称"
                    className="w-full rounded-lg border border-hairline bg-surface-soft px-3 py-3 text-sm text-text-main placeholder:text-muted-soft focus:border-primary/40 focus:outline-none lg:px-4 lg:py-2.5"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-secondary">
                    描述（可选）
                  </label>
                  <textarea
                    value={editDatasetDesc}
                    onChange={(e) => setEditDatasetDesc(e.target.value)}
                    maxLength={512}
                    placeholder="输入知识库描述"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-hairline bg-surface-soft px-3 py-3 text-sm text-text-main placeholder:text-muted-soft focus:border-primary/40 focus:outline-none lg:px-4 lg:py-2.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-border-subtle bg-surface-soft px-5 py-4 lg:flex lg:items-center lg:justify-end lg:px-6">
                <button
                  onClick={handleCloseEditDialog}
                  disabled={updating}
                  className="h-11 rounded-lg px-4 text-xs font-bold uppercase tracking-wider text-text-secondary transition-colors hover:bg-primary/[0.08] hover:text-ink disabled:opacity-60 lg:h-auto lg:py-2"
                >
                  取消
                </button>
                <button
                  onClick={() => void handleUpdateDataset()}
                  disabled={!editDatasetName.trim() || updating}
                  className="h-11 rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60 lg:h-auto lg:py-2"
                >
                  {updating ? '保存中' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={Boolean(datasetPendingDelete)}
          title="删除知识库？"
          confirmLabel="删除"
          loading={deletingPendingDataset}
          onCancel={() => {
            if (!deletingPendingDataset) setDatasetPendingDelete(null);
          }}
          onConfirm={() => void handleConfirmDeleteDataset()}
        >
          <p>
            这会删除 <strong className="font-bold text-ink">{datasetPendingDelete?.name}</strong>。
          </p>
          <p className="text-muted">知识库内的文件与关联配置将无法从前端继续访问，删除后无法恢复。</p>
        </ConfirmDialog>
      </div>
    </div>
  );
}
