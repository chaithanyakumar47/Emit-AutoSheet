import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss?: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:top-auto sm:left-auto sm:translate-x-0 sm:bottom-5 sm:right-5 z-50 flex flex-col space-y-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
      {toasts.map(toast => {
        let bgColor = 'bg-slate-900/90 border-slate-800 text-slate-200';
        let icon = <Info className="w-4 h-4 text-indigo-400 shrink-0" />;

        if (toast.type === 'success') {
          bgColor = 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-lg shadow-emerald-950/50';
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
        } else if (toast.type === 'error') {
          bgColor = 'bg-rose-950/90 border-rose-500/40 text-rose-200 shadow-lg shadow-rose-950/50';
          icon = <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl border backdrop-blur-md text-xs font-semibold flex items-center justify-between shadow-2xl transition-all animate-fade-in ${bgColor}`}
          >
            <div className="flex items-center space-x-2.5 min-w-0 pr-2">
              {icon}
              <span className="truncate">{toast.message}</span>
            </div>

            {onDismiss && (
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-slate-400 hover:text-white p-0.5 rounded-lg shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
