import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, Radar, Server } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

interface SystemHealthBannerProps {
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  degradationReasons: string[];
  onlineServers: number;
  degradedServers: number;
  offlineServers: number;
  activeIncidents: number;
  activeAnomalies: number;
  collectorStatus?: string;
}

export const SystemHealthBanner: React.FC<SystemHealthBannerProps> = ({
  overallStatus,
  degradationReasons,
  onlineServers,
  degradedServers,
  offlineServers,
  activeIncidents,
  activeAnomalies,
  collectorStatus,
}) => {
  const borderAccent =
    overallStatus === 'CRITICAL'
      ? 'border-l-[#EAE7D6]'
      : overallStatus === 'DEGRADED'
      ? 'border-l-[#EAE7D6]'
      : 'border-l-[#5D7B6F]';

  const summaryMessage =
    overallStatus === 'HEALTHY'
      ? 'All monitored infrastructure nodes, telemetry collectors, and services are operating within thresholds.'
      : degradationReasons.length > 0
      ? degradationReasons.join(' · ')
      : 'Partial degradation detected across monitored targets.';

  return (
    <section
      aria-label="Platform Health Summary"
      className={`sharp-card border-l-4 ${borderAccent} p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4`}
    >
      <div className="space-y-1.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <Activity
            className={`w-4 h-4 shrink-0 ${
              overallStatus === 'CRITICAL'
                ? 'text-[#EAE7D6]'
                : overallStatus === 'DEGRADED'
                ? 'text-[#EAE7D6]'
                : 'text-[#B0D4B8]'
            }`}
          />
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Platform Health State
          </span>
          <StatusBadge status={overallStatus} />
          {collectorStatus && (
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              Collector: <strong className="text-[var(--text-secondary)]">{collectorStatus}</strong>
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {summaryMessage}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs font-mono shrink-0">
        <Link
          to="/servers"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors"
        >
          <Server className="w-3.5 h-3.5 text-[#B0D4B8]" />
          <span className="text-[var(--text-muted)]">Nodes:</span>
          <span className="text-[#B0D4B8] font-semibold">{onlineServers}</span>
          {degradedServers > 0 && <span className="text-[#EAE7D6]">/ {degradedServers} deg</span>}
          {offlineServers > 0 && <span className="text-[#EAE7D6]">/ {offlineServers} off</span>}
        </Link>

        <Link
          to="/incidents"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors"
        >
          <AlertTriangle
            className={`w-3.5 h-3.5 ${activeIncidents > 0 ? 'text-[#EAE7D6]' : 'text-[#B0D4B8]'}`}
          />
          <span className="text-[var(--text-muted)]">Incidents:</span>
          <span className="text-[var(--text-main)] font-semibold">{activeIncidents}</span>
        </Link>

        <Link
          to="/detection"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors"
        >
          <Radar
            className={`w-3.5 h-3.5 ${activeAnomalies > 0 ? 'text-[#EAE7D6]' : 'text-[#D7F9FA]'}`}
          />
          <span className="text-[var(--text-muted)]">Anomalies:</span>
          <span className="text-[var(--text-main)] font-semibold">{activeAnomalies}</span>
          <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
        </Link>
      </div>
    </section>
  );
};
