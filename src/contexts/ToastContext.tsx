import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastMessage {
  id: string;
  type: 'error' | 'success' | 'info';
  message: string;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

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
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [toast.id, onClose]);

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-slide-in",
      toast.type === 'error' && "bg-red-500 text-white",
      toast.type === 'success' && "bg-green-500 text-white",
      toast.type === 'info' && "bg-blue-500 text-white",
    )}>
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
    <div className="fixed left-1/2 top-6 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div key={toast.id}>
          <ToastItem toast={toast} onClose={removeToast} />
        </div>
      ))}
    </div>
  );
}
