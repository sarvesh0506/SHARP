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
  <div className="flex items-start gap-3 p-4 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-xs">
    <span className="shrink-0 font-mono font-semibold bg-[#F59E0B]/15 px-1.5 py-0.5 rounded text-[#F59E0B] border border-[#F59E0B]/35">
      UNAVAILABLE
    </span>
    <div className="text-[var(--text-secondary)] leading-relaxed">
      <span className="font-semibold text-[#F59E0B]">{feature}</span>
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
    className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/35 text-[#F43F5E] text-xs"
  >
    <div className="flex items-center gap-2.5 min-w-0">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span className="truncate sm:whitespace-normal">{message}</span>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F43F5E]/15 hover:bg-[#F43F5E]/25 border border-[#F43F5E]/35 font-mono text-[11px] text-[#F1F5F9] shrink-0 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        <span>Retry</span>
      </button>
    )}
  </div>
);
