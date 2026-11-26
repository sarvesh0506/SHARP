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
    wrap: 'bg-[#B0D4B8]/12 border-[#B0D4B8]/38 text-[#B0D4B8]',
    icon: <CheckCircle2 className="w-4 h-4 shrink-0" />,
  },
  error: {
    wrap: 'bg-[#EAE7D6]/16 border-[#EAE7D6]/65 text-[#EAE7D6]',
    icon: <AlertCircle className="w-4 h-4 shrink-0" />,
  },
  warning: {
    wrap: 'bg-[#EAE7D6]/10 border-dashed border-[#EAE7D6]/45 text-[#EAE7D6]',
    icon: <AlertCircle className="w-4 h-4 shrink-0" />,
  },
  info: {
    wrap: 'bg-[#D7F9FA]/12 border-[#D7F9FA]/35 text-[#D7F9FA]',
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
