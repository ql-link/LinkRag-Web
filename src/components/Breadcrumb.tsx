import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** @deprecated Use ThemeContext instead. Will be removed in a future version. */
  darkMode?: boolean;
}

export function Breadcrumb({ items, darkMode: darkModeProp }: BreadcrumbProps) {
  const { darkMode: darkModeCtx } = useTheme();
  const darkMode = darkModeProp ?? darkModeCtx;

  return (
    <nav className="flex items-center gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight size={14} className={cn('text-text-main/30', darkMode && 'text-gray-500')} />}
          {item.path ? (
            <Link
              to={item.path}
              className={cn(
                'font-mono text-xs font-bold uppercase tracking-[0.14em] transition-colors hover:text-primary',
                darkMode ? 'text-gray-400 hover:text-primary' : 'text-text-main/50',
              )}
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={cn(
                'font-mono text-xs font-bold uppercase tracking-[0.14em]',
                darkMode ? 'text-gray-300' : 'text-text-main/70',
              )}
            >
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
