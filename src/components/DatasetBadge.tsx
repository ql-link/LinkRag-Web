import { cn } from '@/lib/utils';
import { Database } from 'lucide-react';

interface DatasetBadgeProps {
  kb_id: string;
  kb_name: string;
  darkMode?: boolean;
  onRemove?: () => void;
}

export function DatasetBadge({ kb_id, kb_name, darkMode, onRemove }: DatasetBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0",
        darkMode
          ? "bg-gray-700/50 text-gray-300 border border-gray-600"
          : "bg-primary/10 text-primary border border-primary/20"
      )}
    >
      <Database size={10} />
      <span className="truncate max-w-[80px]">{kb_name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            "ml-0.5 hover:text-red-500 transition-colors",
            darkMode ? "text-gray-400" : "text-primary/60"
          )}
        >
          ×
        </button>
      )}
    </div>
  );
}

interface DatasetBadgeListProps {
  items: { kb_id: string; kb_name: string }[];
  darkMode?: boolean;
  maxShow?: number;
  onRemove?: (kb_id: string) => void;
}

export function DatasetBadgeList({ items, darkMode, maxShow = 2, onRemove }: DatasetBadgeListProps) {
  if (!items || items.length === 0) return null;

  const showItems = items.slice(0, maxShow);
  const moreItems = items.slice(maxShow);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {showItems.map((item) => (
        <DatasetBadge
          key={item.kb_id}
          kb_id={item.kb_id}
          kb_name={item.kb_name}
          darkMode={darkMode}
          onRemove={onRemove ? () => onRemove(item.kb_id) : undefined}
        />
      ))}
      {moreItems.length > 0 && (
        <div
          className={cn(
            "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0",
            darkMode
              ? "bg-gray-700 text-gray-400"
              : "bg-gray-100 text-gray-500"
          )}
        >
          +{moreItems.length}
        </div>
      )}
    </div>
  );
}