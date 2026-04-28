import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Database, Plus, Search, ArrowRight, X } from 'lucide-react';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { getDatasets, createDataset } from '@/services/dataset';
import type { DatasetDTO } from '@/types/api';

interface DatasetsPageProps {
  darkMode?: boolean;
}

export default function DatasetsPage({ darkMode }: DatasetsPageProps) {
  const navigate = useNavigate();
  const [searchString, setSearchString] = useState('');
  const [datasets, setDatasets] = useState<DatasetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetDesc, setNewDatasetDesc] = useState('');

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const result = await getDatasets(1, 100);
      setDatasets(result.items);
    } catch (error) {
      console.error('Failed to load datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDataset = async () => {
    if (!newDatasetName.trim()) return;
    try {
      const ds = await createDataset({ name: newDatasetName, description: newDatasetDesc });
      setDatasets((prev) => [ds, ...prev]);
      setNewDatasetName('');
      setNewDatasetDesc('');
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create dataset:', error);
    }
  };

  const filteredDatasets = datasets.filter((d) =>
    d.name.toLowerCase().includes(searchString.toLowerCase())
  );

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
                "w-48 pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-[#c586c0]",
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
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Stats Bar */}
        <div className={cn("flex items-center gap-6 mb-6 mono-label", darkMode ? "text-[#858585]" : "")}>
          <span>共 {datasets.length} 个知识库</span>
        </div>

        {/* Dataset Grid */}
        <div className="grid grid-cols-3 gap-4">
          {filteredDatasets.map((dataset) => (
            <div
              key={dataset.id}
              onClick={() => navigate(`/datasets/${dataset.id}`)}
              className={cn(
                "rounded-2xl p-5 transition-colors cursor-pointer group",
                darkMode
                  ? "bg-[#2d2d2d] border border-[#3c3c3c] hover:border-[#c586c0]"
                  : "art-card hover:border-primary"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  darkMode ? "bg-[#094771]/30" : "bg-primary/20"
                )}>
                  <Database size={18} className={darkMode ? "text-[#c586c0]" : "text-primary"} />
                </div>
                <ArrowRight size={14} className={cn(
                  "group-hover:translate-x-1 transition-all",
                  darkMode ? "text-[#6b6b6b] group-hover:text-[#c586c0]" : "text-text-main/20 group-hover:text-primary"
                )} />
              </div>
              <h3 className={cn("font-bold text-sm uppercase tracking-wider mb-1 group-hover:text-[#c586c0] transition-colors", darkMode ? "text-[#e0e0e0]" : "")}>
                {dataset.name}
              </h3>
              <div className={cn("flex items-center justify-between", darkMode ? "text-[#858585]" : "")}>
                <span className={cn("mono-label", darkMode ? "text-[#858585]" : "text-text-main/50")}>
                  {dataset.status}
                </span>
                <span className="mono-label">{dataset.updatedAt}</span>
              </div>
            </div>
          ))}

          {/* Add New */}
          <div
            onClick={() => setCreateDialogOpen(true)}
            className={cn(
              "rounded-2xl border-dashed flex flex-col items-center justify-center min-h-[140px] p-5 cursor-pointer transition-colors",
              darkMode
                ? "border-[#3c3c3c] text-[#858585] hover:text-[#c586c0] hover:border-[#c586c0]"
                : "art-card text-text-main/40 hover:text-primary hover:border-primary"
            )}
          >
            <Plus size={24} className="mb-2" />
            <span className="text-xs font-bold uppercase tracking-wider">添加知识库</span>
          </div>
        </div>

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
                    placeholder="输入知识库名称"
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#c586c0]",
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
                    placeholder="输入知识库描述"
                    rows={3}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#c586c0] resize-none",
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
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-opacity",
                    darkMode
                      ? "bg-[#094771] text-white hover:bg-[#0a5280]"
                      : "bg-text-main text-white hover:opacity-90"
                  )}
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}