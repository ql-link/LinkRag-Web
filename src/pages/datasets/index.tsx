import { useState, useEffect, type MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, Database, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { getDatasets, createDataset, updateDataset, deleteDataset } from '@/services/dataset';
import { useToast } from '@/contexts/ToastContext';
import type { DatasetDTO } from '@/types/api';

interface DatasetsPageProps {
  darkMode?: boolean;
}

export default function DatasetsPage({ darkMode }: DatasetsPageProps) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchString, setSearchString] = useState('');
  const [datasets, setDatasets] = useState<DatasetDTO[]>([]);
  const [loading, setLoading] = useState(true);
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
      setDatasets((prev) => prev.map((item) => item.id === updated.id ? updated : item));
      resetEditDialog();
      addToast('success', '知识库信息已更新');
    } catch (error) {
      console.error('Failed to update dataset:', error);
    } finally {
      setUpdating(false);
    }
  };

  const filteredDatasets = datasets.filter((d) =>
    `${d.name} ${d.description ?? ''}`.toLowerCase().includes(searchString.toLowerCase())
  );
  const hasSearch = searchString.trim().length > 0;

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
              { label: '知识库' }
            ]}
            darkMode={darkMode}
          />
          <h2 className={cn("text-xl serif-heading", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>知识库</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={14} className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2",
              darkMode ? "text-[#858585]" : "text-text-main/30"
            )} />
            <input
              type="text"
              placeholder="搜索知识库..."
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              className={cn(
                "w-48 pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-[#3b82f6]",
                darkMode
                  ? "bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]"
                  : "bg-bg-base/50 border-border-subtle"
              )}
            />
          </div>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors",
              darkMode
                ? "bg-[#094771] text-white hover:bg-[#0a5280]"
                : "bg-text-main text-white hover:opacity-90"
            )}
          >
            <Plus size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">新建</span>
          </button>
          <button
            onClick={() => void loadDatasets()}
            disabled={loading}
            className={cn(
              "p-2 rounded-xl transition-colors",
              darkMode ? "hover:bg-[#2d2d2d] text-[#858585]" : "hover:bg-gray-100 text-text-main/40",
              loading && "opacity-60"
            )}
            title="刷新知识库"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Stats Bar */}
        <div className={cn("flex items-center gap-6 mb-6 mono-label", darkMode ? "text-[#858585]" : "")}>
          <span>共 {datasets.length} 个知识库</span>
          {hasSearch && <span>筛选出 {filteredDatasets.length} 个</span>}
        </div>

        {loading ? (
          <div className={cn(
            "h-56 flex flex-col items-center justify-center rounded-2xl",
            darkMode ? "bg-[#2d2d2d] border border-[#3c3c3c]" : "art-card"
          )}>
            <Loader2 size={24} className={cn("mb-3 animate-spin", darkMode ? "text-[#3b82f6]" : "text-primary")} />
            <p className={cn("mono-label", darkMode ? "text-[#858585]" : "text-text-main/50")}>正在加载知识库</p>
          </div>
        ) : errorMessage ? (
          <div className={cn(
            "h-56 flex flex-col items-center justify-center rounded-2xl text-center",
            darkMode ? "bg-[#2d2d2d] border border-[#3c3c3c]" : "art-card"
          )}>
            <AlertCircle size={26} className="mb-3 text-red-500" />
            <p className={cn("text-sm mb-4", darkMode ? "text-[#cccccc]" : "text-text-main")}>{errorMessage}</p>
            <button
              onClick={() => void loadDatasets()}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider",
                darkMode ? "bg-[#094771] text-white hover:bg-[#0a5280]" : "bg-text-main text-white hover:opacity-90"
              )}
            >
              重试
            </button>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className={cn(
            "h-56 flex flex-col items-center justify-center rounded-2xl text-center",
            darkMode ? "bg-[#2d2d2d] border border-[#3c3c3c]" : "art-card"
          )}>
            <Database size={30} className={cn("mb-3", darkMode ? "text-[#6b6b6b]" : "text-text-main/20")} />
            <p className={cn("text-sm font-bold mb-2", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
              {hasSearch ? '没有匹配的知识库' : '还没有知识库'}
            </p>
            <p className={cn("text-sm mb-4", darkMode ? "text-[#858585]" : "text-text-main/50")}>
              {hasSearch ? '换个关键词试试' : '新建一个知识库后，就可以上传文件并开始问答'}
            </p>
            {!hasSearch && (
              <button
                onClick={() => setCreateDialogOpen(true)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider",
                  darkMode ? "bg-[#094771] text-white hover:bg-[#0a5280]" : "bg-text-main text-white hover:opacity-90"
                )}
              >
                <Plus size={14} />
                新建知识库
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filteredDatasets.map((dataset) => {
              const deleting = deletingDatasetIds.includes(dataset.id);

              return (
                <div
                  key={dataset.id}
                  onClick={() => navigate(`/datasets/${dataset.id}`)}
                  className={cn(
                    "rounded-2xl p-5 transition-colors cursor-pointer group flex flex-col aspect-[1.618]",
                    darkMode
                      ? "bg-[#2d2d2d] border border-[#3c3c3c] hover:border-[#3b82f6]"
                      : "art-card hover:border-primary"
                  )}
                >
                  <div className="mb-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      darkMode ? "bg-[#094771]/30" : "bg-primary/20"
                    )}>
                      <Database size={18} className={darkMode ? "text-[#3b82f6]" : "text-primary"} />
                    </div>
                  </div>
                  <h3 className={cn("font-bold text-sm uppercase tracking-wider mb-1 group-hover:text-[#3b82f6] transition-colors", darkMode ? "text-[#e0e0e0]" : "")}>
                    {dataset.name}
                  </h3>
                  {dataset.description && (
                    <p className={cn("text-xs line-clamp-2 mb-3", darkMode ? "text-[#858585]" : "text-text-main/60")}>
                      {dataset.description}
                    </p>
                  )}
                  <div className={cn("mt-auto flex items-end justify-between gap-3", darkMode ? "text-[#858585]" : "")}>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className={cn("mono-label", darkMode ? "text-[#858585]" : "text-text-main/50")}>
                        {getStatusLabel(dataset.status)}
                      </span>
                      <span className="mono-label">{formatDatasetTime(dataset.updatedAt)}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(event) => handleEditDataset(dataset, event)}
                        className={cn(
                          "p-2 rounded-xl transition-colors",
                          darkMode ? "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#3b82f6]" : "text-text-main/35 hover:bg-blue-50 hover:text-blue-500"
                        )}
                        title="编辑知识库"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(event) => void handleDeleteDataset(dataset, event)}
                        disabled={deleting}
                        className={cn(
                          "p-2 rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                          darkMode ? "text-[#858585] hover:bg-[#3c3c3c] hover:text-red-400" : "text-text-main/35 hover:bg-red-50 hover:text-red-500"
                        )}
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
              className={cn(
                "rounded-2xl border-dashed flex flex-col items-center justify-center aspect-[1.618] p-5 cursor-pointer transition-colors",
                darkMode
                  ? "border-[#3c3c3c] text-[#858585] hover:text-[#3b82f6] hover:border-[#3b82f6]"
                  : "art-card text-text-main/40 hover:text-primary hover:border-primary"
              )}
            >
              <Plus size={24} className="mb-2" />
              <span className="text-xs font-bold uppercase tracking-wider">添加知识库</span>
            </div>
          </div>
        )}

        {/* Create Dataset Dialog */}
        {createDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCreateDialogOpen(false)} />
            <div className={cn(
              "relative w-[480px] rounded-2xl shadow-2xl overflow-hidden",
              darkMode ? "bg-[#252526] border border-[#3c3c3c]" : "bg-white border border-border-subtle"
            )}>
              <div className={cn("flex items-center justify-between px-6 py-4 border-b", darkMode ? "border-[#3c3c3c]" : "border-border-subtle")}>
                <h3 className={cn("text-lg font-bold", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>新建知识库</h3>
                <button onClick={() => setCreateDialogOpen(false)} className={cn("p-2 rounded-xl hover:bg-[#2d2d2d] transition-colors", darkMode ? "text-[#858585]" : "text-text-main/50")}>
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className={cn("block mb-2 text-xs font-bold uppercase tracking-wider", darkMode ? "text-[#cccccc]" : "text-text-main")}>
                    知识库名称
                  </label>
                  <input
                    type="text"
                    value={newDatasetName}
                    onChange={(e) => setNewDatasetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleCreateDataset();
                    }}
                    maxLength={128}
                    placeholder="输入知识库名称"
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#3b82f6]",
                      darkMode
                        ? "bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]"
                        : "bg-bg-base/50 border-border-subtle"
                    )}
                  />
                </div>
                <div>
                  <label className={cn("block mb-2 text-xs font-bold uppercase tracking-wider", darkMode ? "text-[#cccccc]" : "text-text-main")}>
                    描述（可选）
                  </label>
                  <textarea
                    value={newDatasetDesc}
                    onChange={(e) => setNewDatasetDesc(e.target.value)}
                    maxLength={512}
                    placeholder="输入知识库描述"
                    rows={3}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#3b82f6] resize-none",
                      darkMode
                        ? "bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]"
                        : "bg-bg-base/50 border-border-subtle"
                    )}
                  />
                </div>
              </div>
              <div className={cn("flex items-center justify-end gap-3 px-6 py-4 border-t bg-bg-base/30", darkMode ? "border-[#3c3c3c]" : "border-border-subtle")}>
                <button
                  onClick={() => setCreateDialogOpen(false)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors",
                    darkMode
                      ? "text-[#cccccc] hover:bg-[#2d2d2d]"
                      : "hover:bg-gray-100"
                  )}
                >
                  取消
                </button>
                <button
                  onClick={handleCreateDataset}
                  disabled={!newDatasetName.trim() || creating}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-opacity disabled:cursor-not-allowed disabled:opacity-60",
                    darkMode
                      ? "bg-[#094771] text-white hover:bg-[#0a5280]"
                      : "bg-text-main text-white hover:opacity-90"
                  )}
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
            <div className={cn(
              "relative w-[480px] rounded-2xl shadow-2xl overflow-hidden",
              darkMode ? "bg-[#252526] border border-[#3c3c3c]" : "bg-white border border-border-subtle"
            )}>
              <div className={cn("flex items-center justify-between px-6 py-4 border-b", darkMode ? "border-[#3c3c3c]" : "border-border-subtle")}>
                <h3 className={cn("text-lg font-bold", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>编辑知识库</h3>
                <button onClick={handleCloseEditDialog} disabled={updating} className={cn("p-2 rounded-xl transition-colors disabled:opacity-60", darkMode ? "text-[#858585] hover:bg-[#2d2d2d]" : "text-text-main/50 hover:bg-gray-100")}>
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className={cn("block mb-2 text-xs font-bold uppercase tracking-wider", darkMode ? "text-[#cccccc]" : "text-text-main")}>
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
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#3b82f6]",
                      darkMode
                        ? "bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]"
                        : "bg-bg-base/50 border-border-subtle"
                    )}
                  />
                </div>
                <div>
                  <label className={cn("block mb-2 text-xs font-bold uppercase tracking-wider", darkMode ? "text-[#cccccc]" : "text-text-main")}>
                    描述（可选）
                  </label>
                  <textarea
                    value={editDatasetDesc}
                    onChange={(e) => setEditDatasetDesc(e.target.value)}
                    maxLength={512}
                    placeholder="输入知识库描述"
                    rows={3}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#3b82f6] resize-none",
                      darkMode
                        ? "bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]"
                        : "bg-bg-base/50 border-border-subtle"
                    )}
                  />
                </div>
              </div>
              <div className={cn("flex items-center justify-end gap-3 px-6 py-4 border-t bg-bg-base/30", darkMode ? "border-[#3c3c3c]" : "border-border-subtle")}>
                <button
                  onClick={handleCloseEditDialog}
                  disabled={updating}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-60",
                    darkMode
                      ? "text-[#cccccc] hover:bg-[#2d2d2d]"
                      : "hover:bg-gray-100"
                  )}
                >
                  取消
                </button>
                <button
                  onClick={() => void handleUpdateDataset()}
                  disabled={!editDatasetName.trim() || updating}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-opacity disabled:cursor-not-allowed disabled:opacity-60",
                    darkMode
                      ? "bg-[#094771] text-white hover:bg-[#0a5280]"
                      : "bg-text-main text-white hover:opacity-90"
                  )}
                >
                  {updating ? '保存中' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
