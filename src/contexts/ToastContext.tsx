import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastMessage {
  id: string;
  type: 'error' | 'success' | 'info';
  message: string;
  durationMs?: number;
  /** 每次"刷新"时更新，用于重置 ToastItem 内的自动关闭计时器 */
  refreshedAt: number;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], message: string, durationMs?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastMessage['type'], message: string, durationMs?: number) => {
    // 用 type+message 作为确定性 ID：同类同文案只保留一条，重复触发时刷新计时器
    const id = `${type}:${message}`;
    setToasts((prev) => {
      const exists = prev.some((t) => t.id === id);
      if (exists) {
        return prev.map((t) => (t.id === id ? { ...t, refreshedAt: Date.now() } : t));
      }
      return [...prev, { id, type, message, durationMs, refreshedAt: Date.now() }];
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return <ToastContext.Provider value={{ toasts, addToast, removeToast }}>{children}</ToastContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: (id: string) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onClose(toast.id);
    }, toast.durationMs ?? 5000);

    return () => window.clearTimeout(timer);
  }, [toast.durationMs, toast.id, toast.refreshedAt, onClose]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-slide-in',
        toast.type === 'error' && 'bg-red-500 text-white',
        toast.type === 'success' && 'bg-green-500 text-white',
        toast.type === 'info' && 'bg-blue-500 text-white',
      )}
    >
      {toast.type === 'error' && <AlertCircle size={16} />}
      {toast.type === 'success' && <CheckCircle size={16} />}
      {toast.type === 'info' && <Info size={16} />}
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={() => onClose(toast.id)} className="ml-2 hover:opacity-80">
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const context = useContext(ToastContext);
  if (!context) return null;
  const { toasts, removeToast } = context;

  return (
    <div className="fixed left-1/2 top-28 z-[110] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div key={toast.id}>
          <ToastItem toast={toast} onClose={removeToast} />
        </div>
      ))}
    </div>
  );
}
