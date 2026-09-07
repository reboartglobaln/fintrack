import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast floating container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const typeStyles = {
            success: 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-100 dark:border-emerald-800',
            error: 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-100 dark:border-rose-800',
            warning: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-100 dark:border-amber-800',
            info: 'bg-sky-50 text-sky-900 border-sky-300 dark:bg-sky-950/80 dark:text-sky-100 dark:border-sky-800',
          }[toast.type];

          const IconComponent = {
            success: CheckCircle2,
            error: AlertCircle,
            warning: AlertTriangle,
            info: Info,
          }[toast.type];

          const iconColor = {
            success: 'text-emerald-600 dark:text-emerald-400',
            error: 'text-rose-600 dark:text-rose-400',
            warning: 'text-amber-600 dark:text-amber-400',
            info: 'text-sky-600 dark:text-sky-400',
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm transition-all animate-in fade-in slide-in-from-bottom-5 ${typeStyles}`}
            >
              <IconComponent className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
              <div className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
