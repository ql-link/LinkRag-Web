import { useState, useEffect, type MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, Database, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, X, ArrowUpDown } from 'lucide-react';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { getDatasets, createDataset, updateDataset, deleteDataset } from '@/services/dataset';
import { useToast } from '@/contexts/ToastContext';
import type { DatasetDTO } from '@/types/api';
import { useTheme } from '@/contexts/ThemeContext';

export default function DatasetsPage() {
  const { darkMode } = useTheme();
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

  const handleDeleteDataset = async (dataset: DatasetDTO, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (deletingDatasetIds.includes(dataset.id)) return;
    if (!confirm(`确定要删除知识库「${dataset.name}」吗？删除后无法恢复。`)) return;

    setDeletingDatasetIds((prev) => [...prev, dataset.id]);
    try {
      await deleteDataset(dataset.id);
      setDatasets((prev) => prev.filter((item) => item.id !== dataset.id));
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

  const formatDatasetTime = (value: string) => {
    if (!value) return '-';
    const time = new Date(value);
    return Number.isNaN(time.getTime()) ? value : time.toLocaleDateString('zh-CN');
  };

  const sortLabel = sortBy === 'createdAt' ? '按创建时间排序' : '按更新时间排序';

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-frosted px-8 backdrop-blur-md">
        <div className="flex flex-col gap-1">
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '知识库' }]} darkMode={darkMode} />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-main/30" />
            <input
              type="text"
              placeholder="搜索知识库..."
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              className="h-9 w-48 rounded-lg border border-border-subtle bg-bg-base/50 pl-9 pr-3 text-xs text-text-main outline-none transition-colors placeholder:text-text-main/35 focus:border-primary/50"
            />
          </div>
          <div className="flex h-9 items-center gap-2 rounded-lg border border-border-subtle bg-bg-base/50 px-3 transition-colors hover:bg-text-main/5">
            <button
              type="button"
              onClick={() => setSortBy((prev) => (prev === 'createdAt' ? 'updatedAt' : 'createdAt'))}
              className="flex items-center gap-2 bg-transparent text-xs text-text-main focus:outline-none"
              title="点击切换排序方式"
            >
              <ArrowUpDown size={14} className="text-text-main/40" />
              <span>{sortLabel}</span>
            </button>
          </div>
          <button
            onClick={() => void loadDatasets()}
            disabled={loading}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg text-text-main/40 transition-colors hover:bg-text-main/5 hover:text-text-main/70',
              loading && 'opacity-60',
            )}
            title="刷新知识库"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4 sm:px-10 sm:pb-12 sm:pt-8">
        <div className="mx-auto max-w-[1400px]">
          {/* Stats Bar */}
          <div className="mono-label mb-6 flex items-center gap-4 text-text-main/50">
            <span>共 {datasets.length} 个知识库</span>
            {hasSearch && <span>筛选出 {filteredDatasets.length} 个</span>}
          </div>

          {loading ? (
            <div className="art-card flex h-64 flex-col items-center justify-center rounded-2xl">
              <Loader2 size={24} className="mb-3 animate-spin text-primary" />
              <p className="mono-label">正在加载知识库</p>
            </div>
          ) : errorMessage ? (
            <div className="art-card flex h-64 flex-col items-center justify-center rounded-2xl text-center">
              <AlertCircle size={26} className="mb-3 text-[#d97373]" />
              <p className="mb-4 text-sm text-text-main">{errorMessage}</p>
              <button
                onClick={() => void loadDatasets()}
                className="rounded-xl bg-text-main px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 dark:bg-[#094771]"
              >
                重试
              </button>
            </div>
          ) : filteredDatasets.length === 0 ? (
            <div className="art-card flex h-64 flex-col items-center justify-center rounded-2xl text-center">
              <Database size={30} className="mb-3 text-text-main/20" />
              <p className="mb-2 text-sm font-bold text-text-main">
                {hasSearch ? '没有匹配的知识库' : '此地仍是留白，等待建立你的第一座智库'}
              </p>
              <p className="mb-4 text-sm text-text-main/50">
                {hasSearch ? '换个关键词试试' : '新建一个知识库后，就可以上传文件并开始问答'}
              </p>
              {!hasSearch && (
                <button
                  onClick={() => setCreateDialogOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-text-main px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 dark:bg-[#094771]"
                >
                  <Plus size={14} />
                  新建知识库
                </button>
              )}
            </div>
          ) : (
            <div className="grid auto-rows-[136px] grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredDatasets.map((dataset) => {
                const deleting = deletingDatasetIds.includes(dataset.id);

                return (
                  <div
                    key={dataset.id}
                    onClick={() => navigate(`/datasets/${dataset.id}`)}
                    className="group art-card relative flex h-full min-h-0 cursor-pointer flex-col rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="icon-tile flex h-9 w-9 shrink-0 items-center justify-center shadow-sm transition-transform group-hover:scale-105">
                          <Database size={17} strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold tracking-wide text-text-main transition-colors">
                            {dataset.name}
                          </h3>
                          <p className="mono-label mt-1 truncate text-text-main/45">
                            更新 {formatDatasetTime(dataset.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 min-h-0 text-xs leading-5 text-text-main/62">
                      {dataset.description || '暂无描述'}
                    </p>

                    <div className="mt-auto flex items-center justify-end">
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={(event) => handleEditDataset(dataset, event)}
                          className="control-surface inline-flex h-8 w-8 items-center justify-center rounded-xl text-text-main/55 transition-colors hover:border-text-main/20 hover:bg-text-main/5 hover:text-text-main"
                          title="编辑知识库"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(event) => void handleDeleteDataset(dataset, event)}
                          disabled={deleting}
                          className="control-surface inline-flex h-8 w-8 items-center justify-center rounded-xl text-text-main/55 transition-colors disabled:cursor-not-allowed disabled:opacity-60 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
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
                className="art-card flex h-full min-h-0 cursor-pointer flex-col items-center justify-center rounded-2xl border-dashed p-4 text-text-main/40 transition-colors hover:border-primary hover:text-text-main/65 hover:shadow-sm"
              >
                <Plus size={22} className="mb-2" />
                <span className="text-xs font-bold tracking-wide uppercase">新建知识库</span>
              </div>
            </div>
          )}

          {/* Create Dataset Dialog */}
          {createDialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setCreateDialogOpen(false)}
              />
              <div className="relative w-[480px] overflow-hidden rounded-2xl border border-border-subtle bg-bg-base shadow-2xl">
                <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
                  <h3 className="text-lg font-bold text-text-main">新建知识库</h3>
                  <button
                    onClick={() => setCreateDialogOpen(false)}
                    className="rounded-xl p-2 text-text-main/50 transition-colors hover:bg-text-main/5"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-5 p-6">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-main">
                      知识库名称
                    </label>
                    <input
                      type="text"
                      value={newDatasetName}
                      onChange={(e) => setNewDatasetName(e.target.value)}
                      maxLength={128}
                      placeholder="输入知识库名称"
                      className="w-full rounded-xl border border-border-subtle bg-bg-base/50 px-4 py-2.5 text-sm text-text-main outline-none transition-colors placeholder:text-text-main/35 focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-main">
                      描述（可选）
                    </label>
                    <textarea
                      value={newDatasetDesc}
                      onChange={(e) => setNewDatasetDesc(e.target.value)}
                      maxLength={512}
                      placeholder="输入知识库描述"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-border-subtle bg-bg-base/50 px-4 py-2.5 text-sm text-text-main outline-none transition-colors placeholder:text-text-main/35 focus:border-primary/50"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-border-subtle bg-bg-base/30 px-6 py-4">
                  <button
                    onClick={() => setCreateDialogOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-main transition-colors hover:bg-text-main/5"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateDataset}
                    disabled={!newDatasetName.trim() || creating}
                    className="rounded-xl bg-text-main px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-90 dark:bg-[#094771]"
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
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseEditDialog} />
              <div className="relative w-[480px] overflow-hidden rounded-2xl border border-border-subtle bg-bg-base shadow-2xl">
                <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
                  <h3 className="text-lg font-bold text-text-main">编辑知识库</h3>
                  <button
                    onClick={handleCloseEditDialog}
                    disabled={updating}
                    className="rounded-xl p-2 text-text-main/50 transition-colors disabled:opacity-60 hover:bg-text-main/5"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-5 p-6">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-main">
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
                      className="w-full rounded-xl border border-border-subtle bg-bg-base/50 px-4 py-2.5 text-sm text-text-main outline-none transition-colors placeholder:text-text-main/35 focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-main">
                      描述（可选）
                    </label>
                    <textarea
                      value={editDatasetDesc}
                      onChange={(e) => setEditDatasetDesc(e.target.value)}
                      maxLength={512}
                      placeholder="输入知识库描述"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-border-subtle bg-bg-base/50 px-4 py-2.5 text-sm text-text-main outline-none transition-colors placeholder:text-text-main/35 focus:border-primary/50"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-border-subtle bg-bg-base/30 px-6 py-4">
                  <button
                    onClick={handleCloseEditDialog}
                    disabled={updating}
                    className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-main transition-colors disabled:opacity-60 hover:bg-text-main/5"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => void handleUpdateDataset()}
                    disabled={!editDatasetName.trim() || updating}
                    className="rounded-xl bg-text-main px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-90 dark:bg-[#094771]"
                  >
                    {updating ? '保存中' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
