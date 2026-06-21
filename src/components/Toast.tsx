import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastMessage {
  id: string;
  type: 'error' | 'success' | 'info';
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl  animate-slide-in',
        toast.type === 'error' && 'bg-red-500 text-white',
        toast.type === 'success' && 'bg-green-500 text-white',
        toast.type === 'info' && 'bg-blue-500 text-white',
      )}
    >
      <AlertCircle size={16} />
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={() => onClose(toast.id)} className="ml-2 hover:opacity-80">
        <X size={14} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id}>
          <Toast toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}
