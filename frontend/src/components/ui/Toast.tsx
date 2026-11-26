import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  variant?: ToastVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const STYLES: Record<ToastVariant, { wrap: string; icon: React.ReactNode }> = {
  success: {
    wrap: 'bg-[#10B981]/12 border-[#10B981]/35 text-[#34D399]',
    icon: <CheckCircle2 className="w-4 h-4 shrink-0" />,
  },
  error: {
    wrap: 'bg-[#F43F5E]/12 border-[#F43F5E]/35 text-[#FDA4AF]',
    icon: <AlertCircle className="w-4 h-4 shrink-0" />,
  },
  warning: {
    wrap: 'bg-[#F59E0B]/12 border-[#F59E0B]/35 text-[#FCD34D]',
    icon: <AlertCircle className="w-4 h-4 shrink-0" />,
  },
  info: {
    wrap: 'bg-[#38BDF8]/12 border-[#38BDF8]/35 text-[#7DD3FC]',
    icon: <Info className="w-4 h-4 shrink-0" />,
  },
};

export const Toast: React.FC<ToastProps> = ({
  variant = 'info',
  title,
  message,
  onDismiss,
  className = '',
}) => {
  const style = STYLES[variant];
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-4 py-3 flex items-start justify-between gap-3 text-xs ${style.wrap} ${className}`.trim()}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="mt-0.5">{style.icon}</span>
        <div className="min-w-0">
          {title && <p className="font-semibold">{title}</p>}
          <p className={title ? 'opacity-90 mt-0.5' : ''}>{message}</p>
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="p-0.5 rounded opacity-75 hover:opacity-100 transition-opacity"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
