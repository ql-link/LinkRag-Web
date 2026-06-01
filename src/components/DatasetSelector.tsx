import { useState } from 'react';
import { ChevronDown, Database, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dataset } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { DatasetBadgeList } from './DatasetBadge';

interface DatasetSelectorProps {
  datasets: Dataset[];
  selectedKbIds: string[];
  onChange: (selectedIds: string[]) => void;
  darkMode?: boolean;
  single?: boolean;
  placeholder?: string;
}

export function DatasetSelector({
  datasets,
  selectedKbIds,
  onChange,
  darkMode: darkModeProp,
  single = false,
  placeholder = '选择关联的数据集',
}: DatasetSelectorProps) {
  const { darkMode: darkModeCtx } = useTheme();
  const darkMode = darkModeProp ?? darkModeCtx;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedKbInfo = selectedKbIds
    .map((id) => {
      const ds = datasets.find((d) => d.id === id);
      return ds ? { kb_id: ds.id, kb_name: ds.name } : null;
    })
    .filter(Boolean) as { kb_id: string; kb_name: string }[];
  const selectedSingleName = selectedKbInfo[0]?.kb_name ?? '';

  const filteredDatasets = datasets.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleDataset = (id: string) => {
    if (single) {
      if (selectedKbIds.includes(id)) {
        onChange([]);
      } else {
        onChange([id]);
        setOpen(false);
      }
      return;
    }

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
            "min-h-[44px] rounded-xl border shadow-none cursor-pointer p-3 transition-colors",
            single ? "flex items-center justify-between gap-2" : "flex items-center flex-wrap gap-2",
            open
              ? darkMode
              ? "border-[#4a4a4a] bg-[#2d2d2d]"
              : "border-border-subtle bg-white"
              : darkMode
              ? "border-[#3c3c3c] bg-[#2d2d2d]/60 hover:border-[#4a4a4a]"
              : "border-border-subtle bg-bg-base/30 hover:border-[#c9c9c9]"
        )}
      >
        {single && selectedSingleName ? (
          <span className={cn("truncate text-sm font-semibold", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
            {selectedSingleName}
          </span>
        ) : selectedKbInfo.length > 0 ? (
          <DatasetBadgeList items={selectedKbInfo} darkMode={darkMode} onRemove={removeDataset} />
        ) : (
          <span className={cn(single ? "text-sm" : "mono-label", darkMode ? "text-gray-400" : "text-text-main/40")}>
            {placeholder}
          </span>
        )}
        <ChevronDown
          size={16}
          className={cn("ml-auto shrink-0 transition-transform", open && "rotate-180", darkMode ? "text-gray-400" : "text-text-main/30")}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl border overflow-hidden z-[70] origin-top animate-[datasetDropdownIn_140ms_ease-out] will-change-transform",
            darkMode ? "bg-[#2d2d2d] border-[#3c3c3c]" : "bg-white border-border-subtle"
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
                  "w-full pl-9 pr-4 py-2 rounded-lg text-xs focus:outline-none focus:border-border-subtle",
                  darkMode
                    ? "bg-[#1e1e1e] border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]"
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
                        ? "bg-[#1e1e1e] text-[#e0e0e0] border border-[#3c3c3c]"
                        : "bg-bg-base/70 text-text-main border border-border-subtle"
                      : darkMode
                        ? "text-gray-300 hover:bg-[#383838]"
                        : "text-text-main hover:bg-bg-base/60"
                  )}
                >
                  <Database size={14} />
                  <span className="flex-1 text-xs font-medium text-left">{dataset.name}</span>
                  {isSelected && (
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center",
                      darkMode ? "bg-[#e0e0e0]" : "bg-text-main"
                    )}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke={darkMode ? "#1e1e1e" : "#ffffff"} strokeWidth="1.5" strokeLinecap="round" />
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
