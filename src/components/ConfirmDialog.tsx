import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = '确认',
  cancelLabel = '取消',
  confirmVariant = 'danger',
  loading = false,
  loadingLabel,
  disabled = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onCancel, open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={loading ? undefined : onCancel}
        aria-label="关闭确认弹窗"
      />
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-[520px] rounded-2xl border border-hairline bg-bg-card-solid p-6 shadow-dialog"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold leading-7 text-ink">
          {title}
        </h2>
        <div className="mt-6 space-y-2 text-sm leading-6 text-body">{children}</div>
        <div className="mt-7 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-hairline bg-canvas px-4 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled || loading}
            className={cn(
              'inline-flex h-10 min-w-20 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-colors',
              confirmVariant === 'danger' ? 'bg-error hover:bg-[#a83838]' : 'bg-primary hover:bg-primary-active',
              (disabled || loading) && 'cursor-not-allowed opacity-60',
            )}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? (loadingLabel ?? '处理中') : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
