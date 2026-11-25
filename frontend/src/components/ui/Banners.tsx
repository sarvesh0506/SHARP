import React from 'react';

interface UnavailableBannerProps {
  feature?: string;
  message?: string;
}

export const UnavailableBanner: React.FC<UnavailableBannerProps> = ({
  feature = 'This feature',
  message,
}) => (
  <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-xs">
    <span className="shrink-0 font-mono font-bold bg-[#F59E0B]/15 px-1.5 py-0.5 rounded text-[#F59E0B] border border-[#F59E0B]/35">
      PENDING
    </span>
    <div className="text-[#E2E8F0]">
      <span className="font-semibold text-[#F59E0B]">{feature}</span>
      {message
        ? ` — ${message}`
        : ' requires Phase 2 backend integration. Data shown below is unavailable until the monitoring pipeline is active.'}
    </div>
  </div>
);

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => (
  <div className="flex items-center justify-between p-4 rounded-xl bg-[#F43F5E]/10 border border-[#F43F5E]/35 text-[#F43F5E] text-xs">
    <span>{message}</span>
    {onRetry && (
      <span className="font-mono text-[11px] underline cursor-pointer ml-4 text-[#E2E8F0]" onClick={onRetry}>
        Retry
      </span>
    )}
  </div>
);
