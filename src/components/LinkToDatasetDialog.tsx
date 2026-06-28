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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-[480px] overflow-hidden rounded-2xl border border-border-subtle bg-bg-card-solid shadow-dialog">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-text-main">关联到数据集</h3>
            <p className="mt-0.5 text-xs text-text-main/50">选择该文件所属的数据集</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-surface-soft">
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
              className="w-full rounded-xl border border-border-subtle bg-bg-base/50 py-2.5 pl-9 pr-4 text-xs text-text-main outline-none transition-colors placeholder:text-text-main/35 focus:border-primary"
            />
          </div>
        </div>

        {/* Dataset List */}
        <div className="max-h-[300px] overflow-y-auto px-6 pb-4">
          <div className="space-y-2">
            {filteredDatasets.map((dataset) => {
              const datasetId = String(dataset.id);
              const isSelected = selectedIds.includes(datasetId);
              return (
                <button
                  key={dataset.id}
                  onClick={() => toggleDataset(datasetId)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl p-3 transition-all',
                    isSelected
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-bg-base/30 border border-transparent hover:border-border-subtle',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      isSelected ? 'bg-primary/20' : 'bg-surface-soft',
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
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors',
                      isSelected ? 'bg-primary text-white' : 'border border-border-medium',
                    )}
                  >
                    {isSelected && <Check size={12} />}
                  </div>
                </button>
              );
            })}
            {filteredDatasets.length === 0 && (
              <div className="py-8 text-center">
                <Database size={24} className="mx-auto mb-2 text-text-main/20" />
                <p className="text-sm text-text-main/40">未找到数据集</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-subtle bg-bg-base/30 px-6 py-4">
          <p className="mono-label text-[10px] text-text-main/40">已选择 {selectedIds.length} 个数据集</p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-surface-soft"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
            >
              确认关联
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
