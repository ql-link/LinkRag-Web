import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** @deprecated Dark mode is disabled; this prop is ignored. */
  darkMode?: boolean;
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight size={14} className="text-text-faint" />}
          {item.path ? (
            <Link
              to={item.path}
              className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-text-tertiary transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
