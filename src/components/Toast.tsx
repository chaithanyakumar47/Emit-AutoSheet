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
        let bgColor = 'bg-white border-slate-200 text-slate-700';
        let icon = <Info className="w-4 h-4 text-blue-600 shrink-0" />;

        if (toast.type === 'success') {
          bgColor = 'bg-emerald-50 border-emerald-200 text-emerald-800';
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />;
        } else if (toast.type === 'error') {
          bgColor = 'bg-rose-50 border-rose-200 text-rose-800';
          icon = <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-lg border text-xs font-semibold flex items-center justify-between shadow-lg transition-all animate-fade-in ${bgColor}`}
          >
            <div className="flex items-center space-x-2.5 min-w-0 pr-2">
              {icon}
              <span className="truncate">{toast.message}</span>
            </div>

            {onDismiss && (
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-slate-500 hover:text-slate-950 p-0.5 rounded-lg shrink-0"
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
