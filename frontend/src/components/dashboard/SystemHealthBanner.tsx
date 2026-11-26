import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, Radar, Server } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

interface SystemHealthBannerProps {
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  onlineServers: number;
  degradedServers: number;
  offlineServers: number;
  activeIncidents: number;
  activeAnomalies: number;
  collectorStatus?: string;
}

export const SystemHealthBanner: React.FC<SystemHealthBannerProps> = ({
  overallStatus,
  onlineServers,
  degradedServers,
  offlineServers,
  activeIncidents,
  activeAnomalies,
  collectorStatus,
}) => {
  const borderAccent =
    overallStatus === 'CRITICAL'
      ? 'border-l-[#F43F5E]'
      : overallStatus === 'DEGRADED'
      ? 'border-l-[#F59E0B]'
      : 'border-l-[#10B981]';

  const summaryMessage =
    overallStatus === 'CRITICAL'
      ? 'Critical severity incident or offline infrastructure requires immediate attention.'
      : overallStatus === 'DEGRADED'
      ? 'Partial degradation or active incidents detected across monitored targets.'
      : 'All monitored infrastructure nodes, telemetry collectors, and services are operating normally.';

  return (
    <div
      className={`sharp-card border-l-4 ${borderAccent} p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4`}
    >
      <div className="space-y-1.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <Activity
            className={`w-4 h-4 shrink-0 ${
              overallStatus === 'CRITICAL'
                ? 'text-[#F43F5E]'
                : overallStatus === 'DEGRADED'
                ? 'text-[#F59E0B]'
                : 'text-[#34D399]'
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

      <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs font-mono shrink-0">
        <Link
          to="/servers"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors"
        >
          <Server className="w-3.5 h-3.5 text-[#34D399]" />
          <span className="text-[var(--text-muted)]">Nodes:</span>
          <span className="text-[#34D399] font-semibold">{onlineServers}</span>
          {degradedServers > 0 && (
            <span className="text-[#F59E0B]">/ {degradedServers} deg</span>
          )}
          {offlineServers > 0 && (
            <span className="text-[#F43F5E]">/ {offlineServers} off</span>
          )}
        </Link>

        <Link
          to="/incidents"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors"
        >
          <AlertTriangle
            className={`w-3.5 h-3.5 ${
              activeIncidents > 0 ? 'text-[#F43F5E]' : 'text-[#34D399]'
            }`}
          />
          <span className="text-[var(--text-muted)]">Incidents:</span>
          <span className="text-[var(--text-main)] font-semibold">{activeIncidents}</span>
        </Link>

        <Link
          to="/detection"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors"
        >
          <Radar
            className={`w-3.5 h-3.5 ${
              activeAnomalies > 0 ? 'text-[#F59E0B]' : 'text-[#38BDF8]'
            }`}
          />
          <span className="text-[var(--text-muted)]">Anomalies:</span>
          <span className="text-[var(--text-main)] font-semibold">{activeAnomalies}</span>
          <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
        </Link>
      </div>
    </div>
  );
};
