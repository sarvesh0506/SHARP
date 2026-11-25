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
  color = 'text-[#7C3AED]',
}) => {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-lg hover:border-[#334155] transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[var(--text-muted)] tracking-wide uppercase">{title}</span>
        <div className={`p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold font-mono tracking-tight text-[var(--text-main)]">{value}</div>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded border ${
              trendType === 'positive'
                ? 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/30'
                : trendType === 'negative'
                ? 'bg-[#F43F5E]/10 text-[#F43F5E] border-[#F43F5E]/30'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-[var(--text-muted)] mt-2 font-mono">{subtitle}</p>}
    </div>
  );
};
