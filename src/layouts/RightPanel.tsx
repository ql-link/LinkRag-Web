import { ChevronLeft, ChevronRight } from 'lucide-react';
import { OverviewRightPanel } from '@/components/OverviewRightPanel';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface RightPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function RightPanel({ collapsed, onToggle }: RightPanelProps) {
  const { darkMode } = useTheme();

  if (collapsed) {
    return (
      <aside
        className={cn(
          'relative flex h-full w-[72px] shrink-0 flex-col items-center justify-end rounded-3xl border px-0 py-4 backdrop-blur-md transition-all duration-300',
          darkMode ? 'border-[#3c3c3c] bg-[#2d2d2d]' : 'border-border-subtle bg-white/40',
        )}
      >
        <button
          onClick={onToggle}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
            darkMode
              ? 'text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]'
              : 'text-text-main/45 hover:bg-primary/5 hover:text-primary',
          )}
          title="展开右侧栏"
        >
          <ChevronLeft size={18} />
        </button>
      </aside>
    );
  }

  return (
    <div className="flex h-full w-[264px] shrink-0 flex-col gap-3">
      <OverviewRightPanel className="min-h-0 flex-1 overflow-y-auto" />
      <div className="flex shrink-0 justify-center">
        <button
          onClick={onToggle}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
            darkMode
              ? 'text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]'
              : 'text-text-main/45 hover:bg-primary/5 hover:text-primary',
          )}
          title="收起右侧栏"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
