import React, { useEffect } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  details?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  details,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const accent =
    variant === 'danger'
      ? {
          iconBg: 'bg-[#F43F5E]/15 border-[#F43F5E]/35 text-[#F43F5E]',
          button: 'bg-[#F43F5E] hover:bg-[#E11D48] text-white',
          Icon: ShieldAlert,
        }
      : variant === 'warning'
      ? {
          iconBg: 'bg-[#F59E0B]/15 border-[#F59E0B]/35 text-[#F59E0B]',
          button: 'bg-[#F59E0B] hover:bg-[#D97706] text-slate-950',
          Icon: AlertTriangle,
        }
      : {
          iconBg: 'bg-[#22D3EE]/15 border-[#22D3EE]/35 text-[#22D3EE]',
          button: 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white',
          Icon: ShieldAlert,
        };

  const Icon = accent.Icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={() => {
        if (!loading) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="w-full max-w-md rounded-xl bg-dark-900 border border-dark-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-dark-700/80">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${accent.iconBg}`}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 id="confirm-dialog-title" className="text-sm font-semibold text-slate-100">
              {title}
            </h3>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-dark-800 disabled:opacity-50 transition"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
          {details && (
            <div className="p-3 rounded-lg bg-dark-850 border border-dark-700 text-xs font-mono text-slate-400">
              {details}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-4 bg-dark-850 border-t border-dark-700/80">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg text-xs font-medium bg-dark-800 border border-dark-700 text-slate-300 hover:text-white hover:bg-dark-700 disabled:opacity-50 transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 transition flex items-center gap-2 ${accent.button}`}
          >
            {loading && (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            <span>{loading ? 'Processing...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
