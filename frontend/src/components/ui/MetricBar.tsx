import React from 'react';

interface MetricBarProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  color?: string;
  showValue?: boolean;
}

export const MetricBar: React.FC<MetricBarProps> = ({
  label,
  value,
  max = 100,
  unit = '%',
  color,
  showValue = true,
}) => {
  const pct = Math.min((value / max) * 100, 100);
  const barColor =
    color ??
    (pct >= 90 ? 'bg-[#F43F5E]' : pct >= 75 ? 'bg-[#F59E0B]' : 'bg-[#7C3AED]');

  return (
    <div>
      <div className="flex justify-between text-xs font-mono mb-1.5">
        <span className="text-[var(--text-muted)]">{label}</span>
        {showValue && (
          <span
            className={
              pct >= 90
                ? 'text-[#F43F5E] font-bold'
                : pct >= 75
                ? 'text-[#F59E0B] font-bold'
                : 'text-[var(--text-main)] font-bold'
            }
          >
            {value.toFixed(1)}{unit}
          </span>
        )}
      </div>
      <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
        <div
          className={`${barColor} h-full rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
