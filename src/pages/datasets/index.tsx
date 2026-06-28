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
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { getDatasets, createDataset, updateDataset, deleteDataset } from '@/services/dataset';
import { useToast } from '@/contexts/ToastContext';
import type { DatasetDTO } from '@/types/api';

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
  const [creating, setCreating] = useState(false);
  const [editingDataset, setEditingDataset] = useState<DatasetDTO | null>(null);
  const [editDatasetName, setEditDatasetName] = useState('');
  const [editDatasetDesc, setEditDatasetDesc] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deletingDatasetIds, setDeletingDatasetIds] = useState<number[]>([]);
  const [datasetPendingDelete, setDatasetPendingDelete] = useState<DatasetDTO | null>(null);

  useEffect(() => {
    loadDatasets();
  }, []);

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

  const handleCreateDataset = async () => {
    const name = newDatasetName.trim();
    const description = newDatasetDesc.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const ds = await createDataset({
        name,
        ...(description ? { description } : {}),
      });
      setDatasets((prev) => [ds, ...prev]);
      setNewDatasetName('');
      setNewDatasetDesc('');
      setCreateDialogOpen(false);
      addToast('success', '知识库已创建');
    } catch (error) {
      console.error('Failed to create dataset:', error);
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
    <div className="h-full flex flex-col bg-canvas text-text-main">
      {/* Header */}
      <header className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 shrink-0 border-b border-border-subtle">
        {/* 面包屑：桌面端显示；移动端由外壳顶栏承担标题 */}
        <div className="hidden min-w-0 lg:block">
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '知识库' }]} />
        </div>
        <div className="flex flex-1 items-center gap-2 lg:flex-none lg:justify-end">
          <div className="relative flex-1 lg:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="搜索知识库..."
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              className="h-9 w-full lg:w-72 rounded-md border border-border-subtle bg-surface-soft pl-9 pr-4 text-xs text-text-main placeholder:text-muted-soft transition-colors focus:outline-none focus:border-primary/35 focus:bg-canvas"
            />
          </div>
          <button
            type="button"
            onClick={() => setSortBy((prev) => (prev === 'createdAt' ? 'updatedAt' : 'createdAt'))}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-border-subtle bg-surface-soft px-3 text-xs font-bold text-text-secondary transition-colors hover:border-primary/30 hover:bg-surface-card hover:text-ink focus:outline-none"
            title="点击切换排序方式"
          >
            <ArrowUpDown size={14} className="text-muted" />
            <span className="hidden lg:inline">{sortLabel}</span>
          </button>
          <button
            onClick={() => void loadDatasets()}
            disabled={loading}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-surface-soft px-3 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-card hover:text-ink disabled:cursor-not-allowed',
              loading && 'opacity-60',
            )}
            title="刷新知识库"
            aria-label="刷新知识库"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden lg:inline">刷新</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pb-8">
        {/* Stats Bar */}
        <div className="flex items-center gap-6 mb-6 mono-label text-muted">
          <span>共 {datasets.length} 个知识库</span>
          {hasSearch && <span>筛选出 {filteredDatasets.length} 个</span>}
        </div>

        {showInitialLoading ? (
          <div className="h-56 flex flex-col items-center justify-center rounded-2xl border border-hairline bg-bg-card-solid (--)]">
            <Loader2 size={24} className="mb-3 animate-spin text-ink" />
            <p className="mono-label text-muted">正在加载知识库</p>
          </div>
        ) : showBlockingError ? (
          <div className="h-56 flex flex-col items-center justify-center rounded-2xl border border-hairline bg-bg-card-solid text-center (--)]">
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
          <div className="h-56 flex flex-col items-center justify-center rounded-2xl border border-hairline bg-bg-card-solid text-center (--)]">
            <Database size={30} className="mb-3 text-muted" />
            <p className="text-sm font-bold mb-2 text-ink">{hasSearch ? '没有匹配的知识库' : '还没有知识库'}</p>
            <p className="text-sm mb-4 text-muted">
              {hasSearch ? '换个关键词试试' : '新建一个知识库后，就可以上传文件并开始问答'}
            </p>
            {!hasSearch && (
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-white hover:bg-primary-active"
              >
                <Plus size={14} />
                新建知识库
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-[142px] gap-4">
            {filteredDatasets.map((dataset) => {
              const deleting = deletingDatasetIds.includes(dataset.id);

              return (
                <div
                  key={dataset.id}
                  onClick={() => navigate(`/datasets/${dataset.id}`)}
                  className="rounded-2xl h-full p-4 border border-hairline bg-bg-card-solid (--)] transition-all duration-200 ease-out cursor-pointer group flex flex-col overflow-hidden hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.025] hover:shadow-card active:translate-y-0 active:scale-[0.99]"
                >
                  <div className="mb-2">
                    <div className="flex h-7 w-7 items-center justify-center bg-transparent">
                      <Database size={16} className="text-muted" />
                    </div>
                  </div>
                  <h3 className="mb-0.5 truncate text-sm font-bold uppercase tracking-wider text-ink transition-colors group-hover:text-primary">
                    {dataset.name}
                  </h3>
                  {dataset.description && (
                    <p className="mb-1 line-clamp-2 min-h-0 text-[11px] leading-4 text-text-secondary">
                      {dataset.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-end justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="mono-label text-muted">{getStatusLabel(dataset.status)}</span>
                      <span className="mono-label text-muted">{formatDatasetTime(dataset.updatedAt)}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
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
              onClick={() => setCreateDialogOpen(true)}
              className="rounded-2xl flex h-full flex-col items-center justify-center p-5 cursor-pointer transition-all duration-200 ease-out border border-dashed border-primary/25 bg-primary/[0.035] text-muted hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/[0.07] hover:text-ink hover:shadow-card active:translate-y-0 active:scale-[0.99]"
            >
              <Plus size={24} className="mb-2" />
              <span className="text-xs font-bold uppercase tracking-wider">添加知识库</span>
            </div>
          </div>
        )}

        {/* Create Dataset Dialog */}
        {createDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 " onClick={() => setCreateDialogOpen(false)} />
            <div className="relative w-[min(100vw-2rem,480px)] rounded-xl border border-hairline bg-bg-card-solid p-6 (--)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-ink">新建知识库</h3>
                  <p className="mt-1 text-xs text-muted">创建后即可上传文件并开始问答。</p>
                </div>
                <button
                  onClick={() => setCreateDialogOpen(false)}
                  className="-mr-2 -mt-2 p-2 text-muted transition-colors hover:text-ink"
                  aria-label="关闭"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-6 space-y-5">
                <div>
                  <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
                    知识库名称
                  </label>
                  <input
                    type="text"
                    value={newDatasetName}
                    onChange={(e) => setNewDatasetName(e.target.value)}
                    maxLength={128}
                    placeholder="输入知识库名称"
                    className="w-full border-0 border-b border-border-subtle bg-transparent px-0 py-2.5 text-sm text-text-main placeholder:text-muted-soft transition-colors focus:border-primary/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
                    描述（可选）
                  </label>
                  <textarea
                    value={newDatasetDesc}
                    onChange={(e) => setNewDatasetDesc(e.target.value)}
                    maxLength={512}
                    placeholder="输入知识库描述"
                    rows={3}
                    className="w-full resize-none border-0 border-b border-border-subtle bg-transparent px-0 py-2.5 text-sm text-text-main placeholder:text-muted-soft transition-colors focus:border-primary/50 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-7 flex items-center justify-end gap-3">
                <button
                  onClick={() => setCreateDialogOpen(false)}
                  className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-text-secondary transition-colors hover:text-ink"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateDataset}
                  disabled={!newDatasetName.trim() || creating}
                  className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-white hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? '创建中' : '创建'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Dataset Dialog */}
        {editingDataset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 " onClick={handleCloseEditDialog} />
            <div className="relative w-[min(100vw-2rem,480px)] rounded-2xl border border-hairline bg-bg-card-solid (--)] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                <h3 className="text-lg font-bold text-ink">编辑知识库</h3>
                <button
                  onClick={handleCloseEditDialog}
                  disabled={updating}
                  className="p-2 rounded-lg text-muted transition-colors hover:bg-primary/[0.08] hover:text-ink disabled:opacity-60"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
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
                    className="w-full px-4 py-2.5 rounded-lg border border-hairline bg-surface-soft text-sm text-text-main placeholder:text-muted-soft focus:outline-none focus:border-primary/40"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
                    描述（可选）
                  </label>
                  <textarea
                    value={editDatasetDesc}
                    onChange={(e) => setEditDatasetDesc(e.target.value)}
                    maxLength={512}
                    placeholder="输入知识库描述"
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border border-hairline bg-surface-soft text-sm text-text-main placeholder:text-muted-soft focus:outline-none focus:border-primary/40 resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-subtle bg-surface-soft">
                <button
                  onClick={handleCloseEditDialog}
                  disabled={updating}
                  className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-text-secondary transition-colors hover:bg-primary/[0.08] hover:text-ink disabled:opacity-60"
                >
                  取消
                </button>
                <button
                  onClick={() => void handleUpdateDataset()}
                  disabled={!editDatasetName.trim() || updating}
                  className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-white hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60"
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
