import { File } from 'lucide-react';
import { cn } from '@/lib/utils';
import docxIconUrl from '@/assets/filetypes/file-docx.svg';
import htmlIconUrl from '@/assets/filetypes/file-html.svg';
import mdIconUrl from '@/assets/filetypes/file-md.svg';
import pdfIconUrl from '@/assets/filetypes/file-pdf.svg';

type KnowledgeFileIconProps = {
  suffix?: string | null;
  compact?: boolean;
};

function normalizeSuffix(suffix?: string | null) {
  const normalized = suffix?.trim().toLowerCase() ?? '';
  if (normalized === 'markdown') return 'md';
  if (normalized === 'htm') return 'html';
  return normalized;
}

const fileTypeMeta = {
  md: {
    label: 'Markdown',
    iconUrl: mdIconUrl,
  },
  pdf: {
    label: 'PDF',
    iconUrl: pdfIconUrl,
  },
  docx: {
    label: 'DOCX',
    iconUrl: docxIconUrl,
  },
  html: {
    label: 'HTML',
    iconUrl: htmlIconUrl,
  },
} as const;

export function KnowledgeFileIcon({ suffix, compact = false }: KnowledgeFileIconProps) {
  const meta = fileTypeMeta[normalizeSuffix(suffix) as keyof typeof fileTypeMeta];

  if (meta) {
    return (
      <img
        src={meta.iconUrl}
        alt={`${meta.label} 文件`}
        className={cn(
          'inline-flex shrink-0 object-contain transition-transform duration-200 group-hover/file:scale-105',
          compact ? 'h-8 w-8' : 'h-10 w-10',
        )}
        draggable={false}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg bg-surface-soft text-muted ring-1 ring-hairline transition-transform duration-200 group-hover/file:scale-105',
        compact ? 'h-8 w-8' : 'h-10 w-10',
      )}
      aria-label="文件"
    >
      <File size={compact ? 15 : 18} strokeWidth={1.9} />
    </span>
  );
}
