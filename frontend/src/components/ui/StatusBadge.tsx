import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const SUCCESS_STATUSES = new Set([
  'HEALTHY',
  'ONLINE',
  'CONNECTED',
  'RESOLVED',
  'CLOSED',
  'COMPLETED',
  'SUCCESS',
  'VERIFIED',
  'VERIFIED_SUCCESS',
  'ACTIVE',
]);

const WARNING_STATUSES = new Set([
  'WARNING',
  'DEGRADED',
  'RECOVERING',
  'DIAGNOSING',
  'EXECUTING',
  'VERIFYING',
  'AWAITING_APPROVAL',
  'RECOVERY_PENDING',
  'PENDING_APPROVAL',
  'PENDING',
  'PARTIALLY_RECOVERED',
  'REOPENED',
  'RECONNECTING',
]);

const CRITICAL_STATUSES = new Set([
  'UNHEALTHY',
  'OFFLINE',
  'DISCONNECTED',
  'OPEN',
  'FAILED',
  'VERIFIED_FAILURE',
  'VERIFICATION_TIMEOUT',
  'CRITICAL',
  'REJECTED',
]);

const TRANSIENT_PULSE = new Set([
  'RECOVERING',
  'EXECUTING',
  'VERIFYING',
  'RECONNECTING',
]);

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = (status || '').toUpperCase();

  let colorClasses =
    'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]';

  if (SUCCESS_STATUSES.has(normalized)) {
    colorClasses = 'bg-[#B0D4B8]/15 text-[#B0D4B8] border-[#B0D4B8]/35';
  } else if (WARNING_STATUSES.has(normalized)) {
    colorClasses = 'bg-[#EAE7D6]/12 text-[#EAE7D6] border-dashed border-[#EAE7D6]/45';
  } else if (CRITICAL_STATUSES.has(normalized)) {
    colorClasses = 'bg-[#EAE7D6]/20 text-[#EAE7D6] border-[#EAE7D6]/75 ring-1 ring-[#EAE7D6]/30';
  }

  const isTransient = TRANSIENT_PULSE.has(normalized);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold font-mono border ${colorClasses} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full mr-1.5 bg-current ${
          isTransient ? 'animate-pulse motion-reduce:animate-none' : ''
        }`}
      />
      {status}
    </span>
  );
};
