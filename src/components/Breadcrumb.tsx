import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  darkMode?: boolean;
}

export function Breadcrumb({ items, darkMode }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && (
            <ChevronRight size={12} className={cn("text-text-main/30", darkMode && "text-gray-500")} />
          )}
          {item.path ? (
            <Link
              to={item.path}
              className={cn(
                "mono-label transition-colors hover:text-primary",
                darkMode ? "text-gray-400 hover:text-primary" : "text-text-main/50"
              )}
            >
              {item.label}
            </Link>
          ) : (
            <span className={cn("mono-label", darkMode ? "text-gray-300" : "text-text-main/70")}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}