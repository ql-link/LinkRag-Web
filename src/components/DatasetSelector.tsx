import { useState } from 'react';
import { Plus, X, Database, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dataset } from '@/types';
import { DatasetBadgeList } from './DatasetBadge';

interface DatasetSelectorProps {
  datasets: Dataset[];
  selectedKbIds: string[];
  onChange: (selectedIds: string[]) => void;
  darkMode?: boolean;
}

export function DatasetSelector({ datasets, selectedKbIds, onChange, darkMode }: DatasetSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedKbInfo = selectedKbIds
    .map((id) => {
      const ds = datasets.find((d) => d.id === id);
      return ds ? { kb_id: ds.id, kb_name: ds.name } : null;
    })
    .filter(Boolean) as { kb_id: string; kb_name: string }[];

  const filteredDatasets = datasets.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleDataset = (id: string) => {
    if (selectedKbIds.includes(id)) {
      onChange(selectedKbIds.filter((x) => x !== id));
    } else {
      onChange([...selectedKbIds, id]);
    }
  };

  const removeDataset = (id: string) => {
    onChange(selectedKbIds.filter((x) => x !== id));
  };

  return (
    <div className="relative">
      {/* Selected Badges */}
      <div
        onClick={() => setOpen(!open)}
        className={cn(
          "min-h-[44px] rounded-xl border cursor-pointer flex items-center flex-wrap gap-2 p-3 transition-colors",
          open
            ? darkMode
              ? "border-primary bg-gray-800"
              : "border-primary bg-white"
            : darkMode
              ? "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              : "border-border-subtle bg-bg-base/30 hover:border-gray-300"
        )}
      >
        {selectedKbInfo.length > 0 ? (
          <DatasetBadgeList items={selectedKbInfo} darkMode={darkMode} onRemove={removeDataset} />
        ) : (
          <span className={cn("mono-label", darkMode ? "text-gray-400" : "text-text-main/40")}>
            选择关联的数据集
          </span>
        )}
        <Plus
          size={14}
          className={cn("ml-auto shrink-0", darkMode ? "text-gray-400" : "text-text-main/30")}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl border overflow-hidden z-10",
            darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-border-subtle"
          )}
        >
          {/* Search */}
          <div className="p-3 border-b border-border-subtle">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-main/30" />
              <input
                type="text"
                placeholder="搜索数据集..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  "w-full pl-9 pr-4 py-2 rounded-lg text-xs focus:outline-none",
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-400"
                    : "bg-bg-base/50 border-border-subtle"
                )}
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-[240px] overflow-y-auto p-2">
            {filteredDatasets.map((dataset) => {
              const isSelected = selectedKbIds.includes(dataset.id);
              return (
                <button
                  key={dataset.id}
                  onClick={() => toggleDataset(dataset.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors",
                    isSelected
                      ? darkMode
                        ? "bg-gray-700/50 text-gray-100"
                        : "bg-primary/5 text-primary"
                      : darkMode
                        ? "text-gray-300 hover:bg-gray-700"
                        : "text-text-main hover:bg-gray-50"
                  )}
                >
                  <Database size={14} />
                  <span className="flex-1 text-xs font-medium text-left">{dataset.name}</span>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
            {filteredDatasets.length === 0 && (
              <div className="py-6 text-center">
                <Database size={20} className="mx-auto text-text-main/20 mb-1" />
                <p className="text-xs text-text-main/40">未找到数据集</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}