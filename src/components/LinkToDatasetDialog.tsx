import { useState, useEffect } from 'react';
import { X, Search, Database, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DatasetDTO } from '@/types/api';

interface LinkToDatasetDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
  datasets: DatasetDTO[];
  currentKbIds: string[];
}

export function LinkToDatasetDialog({ open, onClose, onConfirm, datasets, currentKbIds }: LinkToDatasetDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(currentKbIds);

  useEffect(() => {
    if (open) {
      setSelectedIds(currentKbIds);
      setSearch('');
    }
  }, [open, currentKbIds]);

  const filteredDatasets = datasets.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  const toggleDataset = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleConfirm = () => {
    onConfirm(selectedIds);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 " onClick={onClose} />

      {/* Dialog */}
      <div className={cn('relative w-[480px] rounded-2xl  overflow-hidden', 'bg-white border border-border-subtle')}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div>
            <h3 className="text-lg font-bold text-text-main">关联到数据集</h3>
            <p className="text-xs text-text-main/50 mt-0.5">选择该文件所属的数据集</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X size={18} className="text-text-main/50" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-main/30" />
            <input
              type="text"
              placeholder="搜索数据集..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-bg-base/50 border border-border-subtle text-xs focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Dataset List */}
        <div className="px-6 pb-4 max-h-[300px] overflow-y-auto">
          <div className="space-y-2">
            {filteredDatasets.map((dataset) => {
              const datasetId = String(dataset.id);
              const isSelected = selectedIds.includes(datasetId);
              return (
                <button
                  key={dataset.id}
                  onClick={() => toggleDataset(datasetId)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
                    isSelected
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-bg-base/30 border border-transparent hover:border-border-subtle',
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      isSelected ? 'bg-primary/20' : 'bg-gray-100',
                    )}
                  >
                    <Database size={14} className={isSelected ? 'text-primary' : 'text-text-main/40'} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className={cn('text-sm font-bold', isSelected ? 'text-primary' : 'text-text-main')}>
                      {dataset.name}
                    </p>
                    <p className="mono-label text-[10px] text-text-main/40">{dataset.status}</p>
                  </div>
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors',
                      isSelected ? 'bg-[#7B6B5D] text-white' : 'border border-gray-300',
                    )}
                  >
                    {isSelected && <Check size={12} />}
                  </div>
                </button>
              );
            })}
            {filteredDatasets.length === 0 && (
              <div className="py-8 text-center">
                <Database size={24} className="mx-auto text-text-main/20 mb-2" />
                <p className="text-sm text-text-main/40">未找到数据集</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-bg-base/30">
          <p className="mono-label text-[10px] text-text-main/40">已选择 {selectedIds.length} 个数据集</p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 rounded-xl bg-[#7B6B5D] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              确认关联
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
