import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toUpperCase();

  let colorClasses = 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]';

  if (['HEALTHY', 'ONLINE', 'RESOLVED', 'SUCCESS', 'VERIFIED_SUCCESS', 'ACTIVE'].includes(normalized)) {
    colorClasses = 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/30';
  } else if (['DEGRADED', 'RECOVERING', 'DIAGNOSING', 'EXECUTING', 'VERIFYING', 'AWAITING_APPROVAL', 'PENDING'].includes(normalized)) {
    colorClasses = 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30';
  } else if (['UNHEALTHY', 'OFFLINE', 'OPEN', 'FAILED', 'VERIFIED_FAILURE', 'CRITICAL', 'REJECTED'].includes(normalized)) {
    colorClasses = 'bg-[#F43F5E]/10 text-[#F43F5E] border-[#F43F5E]/30';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono border ${colorClasses} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current"></span>
      {status}
    </span>
  );
};
