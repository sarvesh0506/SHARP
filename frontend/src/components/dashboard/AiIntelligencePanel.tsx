import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Cpu, Radar, ShieldCheck, Stethoscope } from 'lucide-react';
import { AnomalyEvent, Incident, RecoveryRecommendation } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';

interface AiIntelligencePanelProps {
  aiReachable: boolean | null;
  incidents: Incident[];
  anomalies: AnomalyEvent[];
  recommendations: RecoveryRecommendation[];
}

export const AiIntelligencePanel: React.FC<AiIntelligencePanelProps> = ({
  aiReachable,
  incidents,
  anomalies,
  recommendations,
}) => {
  const diagnosedIncidents = incidents.filter(
    (i) => i.rootCause && i.rootCause.trim().length > 0
  );
  const activeAnomalies = anomalies.filter((a) => a.status === 'ACTIVE');
  const pendingRecommendations = recommendations.filter(
    (r) => r.status === 'PENDING' || r.status === 'APPROVED'
  );

  const hasInsights =
    diagnosedIncidents.length > 0 ||
    activeAnomalies.length > 0 ||
    pendingRecommendations.length > 0;

  return (
    <section
      aria-labelledby="ai-intel-heading"
      className="sharp-card border-t-2 border-t-[#D7F9FA]/60 p-5 flex flex-col justify-between space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#D7F9FA]/10 border border-[#D7F9FA]/30 text-[#D7F9FA]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="ai-intel-heading" className="sharp-section-title">
                SHARP AI Intelligence Center
              </h2>
              {aiReachable !== null && (
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                    aiReachable
                      ? 'bg-[#5D7B6F]/10 text-[#B0D4B8] border-[#5D7B6F]/30'
                      : 'bg-[#EAE7D6]/10 text-[#EAE7D6] border-[#EAE7D6]/30'
                  }`}
                >
                  <Cpu className="w-2.5 h-2.5" />
                  {aiReachable ? 'AI ENGINE ONLINE' : 'FALLBACK MODE'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Live RCA syntheses, anomaly correlations, and policy-scored recommendations
            </p>
          </div>
        </div>
        <Link
          to="/diagnosis"
          className="text-xs font-mono text-[#D7F9FA] hover:underline inline-flex items-center gap-1 shrink-0"
        >
          <span>Root Cause Analysis</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {!hasInsights ? (
        <div className="py-10 px-4 text-center border border-dashed border-[var(--border-subtle)] rounded-lg space-y-1.5">
          <div className="text-xs font-mono text-[var(--text-secondary)]">
            No AI insights available yet.
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            AI diagnoses, anomaly correlations, and recovery plans will appear here when SHARP processes incidents or anomalies.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {diagnosedIncidents.slice(0, 2).map((inc) => (
            <Link
              key={`rca-${inc.id}`}
              to={`/diagnosis?incidentId=${inc.id}`}
              className="block p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[#D7F9FA]/40 transition-colors space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#D7F9FA]">
                  <Stethoscope className="w-3 h-3" />
                  RCA · Incident #{inc.id}
                </span>
                <StatusBadge status={inc.rcaStatus || 'COMPLETED'} />
              </div>
              <p className="text-xs text-[var(--text-main)] line-clamp-2 leading-relaxed">
                {inc.rootCause}
              </p>
            </Link>
          ))}

          {activeAnomalies.slice(0, 2).map((anom) => (
            <Link
              key={`anom-${anom.id}`}
              to="/detection"
              className="block p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[#EAE7D6]/40 transition-colors space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#EAE7D6]">
                  <Radar className="w-3 h-3" />
                  {anom.detectionMethod} · {anom.metricName}
                  {anom.confidenceScore != null && (
                    <span className="text-[#D7F9FA]">
                      ({Math.round(anom.confidenceScore * 100)}% conf)
                    </span>
                  )}
                </span>
                <StatusBadge status={anom.severity} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                {anom.resourceName}: {anom.description}
              </p>
            </Link>
          ))}

          {pendingRecommendations.slice(0, 2).map((rec) => (
            <Link
              key={`rec-${rec.id}`}
              to="/recovery"
              className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[#5D7B6F]/40 transition-colors flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#B0D4B8]">
                  <ShieldCheck className="w-3 h-3" />
                  {rec.actionType}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono truncate">
                  Incident #{rec.incidentId} · Risk: {rec.riskLevel}
                  {rec.approvalRequired ? ' · Approval required' : ' · Auto-permitted'}
                </div>
              </div>
              <StatusBadge status={rec.status} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};
