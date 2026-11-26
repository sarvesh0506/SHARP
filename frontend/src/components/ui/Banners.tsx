import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface UnavailableBannerProps {
  feature?: string;
  message?: string;
}

export const UnavailableBanner: React.FC<UnavailableBannerProps> = ({
  feature = 'This feature',
  message,
}) => (
  <div className="flex items-start gap-3 p-4 rounded-lg bg-[#EAE7D6]/10 border border-[#EAE7D6]/30 text-[#EAE7D6] text-xs">
    <span className="shrink-0 font-mono font-semibold bg-[#EAE7D6]/15 px-1.5 py-0.5 rounded text-[#EAE7D6] border border-[#EAE7D6]/35">
      UNAVAILABLE
    </span>
    <div className="text-[var(--text-secondary)] leading-relaxed">
      <span className="font-semibold text-[#EAE7D6]">{feature}</span>
      {message
        ? ` — ${message}`
        : ' is currently unavailable until the required service is active.'}
    </div>
  </div>
);

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => (
  <div
    role="alert"
    className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-[#EAE7D6]/10 border border-[#EAE7D6]/35 text-[#EAE7D6] text-xs"
  >
    <div className="flex items-center gap-2.5 min-w-0">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span className="truncate sm:whitespace-normal">{message}</span>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EAE7D6]/15 hover:bg-[#EAE7D6]/25 border border-[#EAE7D6]/35 font-mono text-[11px] text-[#EAE7D6] shrink-0 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        <span>Retry</span>
      </button>
    )}
  </div>
);
