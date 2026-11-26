import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
    {icon && (
      <div className="mb-3.5 w-11 h-11 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]">
        {icon}
      </div>
    )}
    <h3 className="text-sm font-semibold text-[var(--text-main)] mb-1">{title}</h3>
    {description && (
      <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
