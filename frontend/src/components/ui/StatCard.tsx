import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendType = 'neutral',
  color = 'text-[#B0D4B8]',
}) => {
  return (
    <div className="sharp-card sharp-card-interactive p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="sharp-label truncate">{title}</span>
        <div
          className={`p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shrink-0 ${color}`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="sharp-kpi-value truncate">{value}</div>
        {trend && (
          <span
            className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border shrink-0 ${
              trendType === 'positive'
                ? 'bg-[#5D7B6F]/10 text-[#B0D4B8] border-[#5D7B6F]/30'
                : trendType === 'negative'
                ? 'bg-[#EAE7D6]/10 text-[#EAE7D6] border-[#EAE7D6]/30'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-[11px] text-[var(--text-muted)] mt-2 font-mono truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
};
