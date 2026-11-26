import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  isRefreshing,
  actions,
  badge,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="sharp-page-title">{title}</h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {actions}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="sharp-btn-secondary"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRefreshing ? 'animate-spin text-[#5D7B6F] motion-reduce:animate-none' : ''
              }`}
            />
            <span>Refresh</span>
          </button>
        )}
      </div>
    </div>
  );
};
