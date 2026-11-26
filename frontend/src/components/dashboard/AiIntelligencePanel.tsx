import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Radar, ShieldCheck, Stethoscope } from 'lucide-react';
import { AnomalyEvent, Incident, RecoveryRecommendation } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';

interface AiIntelligencePanelProps {
  incidents: Incident[];
  anomalies: AnomalyEvent[];
  recommendations: RecoveryRecommendation[];
}

export const AiIntelligencePanel: React.FC<AiIntelligencePanelProps> = ({
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
    <div className="sharp-card p-5 flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[#10B981]/10 border border-[#10B981]/30 text-[#34D399]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="sharp-section-title">AI Intelligence &amp; RCA Insights</h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Derived from live RCA records, anomaly detections, and policy recommendations
            </p>
          </div>
        </div>
        <Link
          to="/diagnosis"
          className="text-xs font-mono text-[#34D399] hover:underline inline-flex items-center gap-1 shrink-0"
        >
          <span>Open RCA</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {!hasInsights ? (
        <div className="py-10 px-4 text-center border border-dashed border-[var(--border-subtle)] rounded-lg text-xs font-mono text-[var(--text-muted)]">
          No AI insights available yet.
        </div>
      ) : (
        <div className="space-y-3">
          {diagnosedIncidents.slice(0, 2).map((inc) => (
            <div
              key={`rca-${inc.id}`}
              className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#38BDF8]">
                  <Stethoscope className="w-3 h-3" />
                  RCA · Incident #{inc.id}
                </span>
                <StatusBadge status={inc.rcaStatus || 'COMPLETED'} />
              </div>
              <p className="text-xs text-[var(--text-main)] line-clamp-2 leading-relaxed">
                {inc.rootCause}
              </p>
            </div>
          ))}

          {activeAnomalies.slice(0, 2).map((anom) => (
            <div
              key={`anom-${anom.id}`}
              className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#F59E0B]">
                  <Radar className="w-3 h-3" />
                  {anom.detectionMethod} · {anom.metricName}
                </span>
                <StatusBadge status={anom.severity} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                {anom.resourceName}: {anom.description}
              </p>
            </div>
          ))}

          {pendingRecommendations.slice(0, 2).map((rec) => (
            <div
              key={`rec-${rec.id}`}
              className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#34D399]">
                  <ShieldCheck className="w-3 h-3" />
                  {rec.actionType}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono truncate">
                  Incident #{rec.incidentId} · Risk: {rec.riskLevel}
                </div>
              </div>
              <StatusBadge status={rec.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
