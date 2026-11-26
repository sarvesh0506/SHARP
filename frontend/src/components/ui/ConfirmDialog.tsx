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
          iconBg: 'bg-[#EAE7D6]/15 border-[#EAE7D6]/55 text-[#EAE7D6]',
          button: 'bg-[#EAE7D6] hover:bg-[#D4D2C4] text-[#0D1311]',
          Icon: ShieldAlert,
        }
      : variant === 'warning'
      ? {
          iconBg: 'bg-[#A4C3A2]/15 border-[#A4C3A2]/45 text-[#EAE7D6]',
          button: 'bg-[#A4C3A2] hover:bg-[#8EB08C] text-[#0D1311]',
          Icon: AlertTriangle,
        }
      : {
          iconBg: 'bg-[#5D7B6F]/25 border-[#A4C3A2]/45 text-[#D7F9FA]',
          button: 'bg-[#5D7B6F] hover:bg-[#4D685D] text-[#F6F4EC]',
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
        className="w-full max-w-md rounded-xl bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-[var(--shadow-elevated)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${accent.iconBg}`}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 id="confirm-dialog-title" className="text-sm font-semibold text-[var(--text-main)]">
              {title}
            </h3>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] disabled:opacity-50 transition"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{description}</p>
          {details && (
            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-muted)]">
              {details}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-4 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)]">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="sharp-btn-secondary"
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
