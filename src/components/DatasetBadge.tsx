import { cn } from '@/lib/utils';
import { Database } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface DatasetBadgeProps {
  kb_id: string;
  kb_name: string;
  darkMode?: boolean;
  onRemove?: () => void;
}

export function DatasetBadge({ kb_name, darkMode: darkModeProp, onRemove }: DatasetBadgeProps) {
  const { darkMode: darkModeCtx } = useTheme();
  const darkMode = darkModeProp ?? darkModeCtx;

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider',
        darkMode
          ? 'border border-primary/20 bg-primary/10 text-primary'
          : 'border border-primary/20 bg-primary/10 text-primary',
      )}
    >
      <Database size={10} />
      <span className="max-w-[80px] truncate">{kb_name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn('ml-0.5 text-primary/60 transition-colors hover:text-error')}
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

export function DatasetBadgeList({ items, darkMode: darkModeProp, maxShow = 2, onRemove }: DatasetBadgeListProps) {
  const { darkMode: darkModeCtx } = useTheme();
  const darkMode = darkModeProp ?? darkModeCtx;

  if (!items || items.length === 0) return null;

  const showItems = items.slice(0, maxShow);
  const moreItems = items.slice(maxShow);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {showItems.map((item) => (
        <div key={item.kb_id}>
          <DatasetBadge
            kb_id={item.kb_id}
            kb_name={item.kb_name}
            darkMode={darkMode}
            onRemove={onRemove ? () => onRemove(item.kb_id) : undefined}
          />
        </div>
      ))}
      {moreItems.length > 0 && (
        <div
          className={cn(
            'shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider',
            darkMode ? 'bg-surface-card text-muted' : 'bg-surface-soft text-muted',
          )}
        >
          +{moreItems.length}
        </div>
      )}
    </div>
  );
}
