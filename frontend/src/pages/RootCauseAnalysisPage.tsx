import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { Incident, RecoveryAction } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorBanner, UnavailableBanner } from '../components/ui/Banners';
import { EmptyState } from '../components/ui/EmptyState';
import { MetricBar } from '../components/ui/MetricBar';
import {
  Stethoscope,
  Terminal,
  Cpu,
  Bot,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export const RootCauseAnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialId = searchParams.get('incidentId');

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialId ? Number(initialId) : null
  );
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const [incRes, recRes] = await Promise.all([
        apiClient.get('/incidents'),
        apiClient.get('/recovery'),
      ]);
      const incList: Incident[] = incRes.data?.data ?? [];
      const recList: RecoveryAction[] = recRes.data?.data ?? [];
      setIncidents(incList);
      setActions(recList);

      if (!selectedId && incList.length > 0) {
        setSelectedId(incList[0].id);
      }
      setError(null);
    } catch {
      setError('Unable to load incident diagnostics from SHARP backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selected = incidents.find((i) => i.id === selectedId) ?? incidents[0] ?? null;
  const attachedActions = selected ? actions.filter((a) => a.incidentId === selected.id) : [];

  const parsedEvidence = (() => {
    if (!selected?.evidence) return null;
    try {
      return JSON.parse(selected.evidence);
    } catch {
      return null;
    }
  })();

  const recommendedActionText = (() => {
    if (!selected) return null;
    if (attachedActions.length > 0) {
      return `Linked Recovery Policy: ${attachedActions[0].actionType} (Risk: ${attachedActions[0].riskLevel})`;
    }
    const text = `${selected.title} ${selected.rootCause ?? ''}`.toLowerCase();
    if (text.includes('memory') || text.includes('oom')) return 'RESTART_CONTAINER (LOW RISK) — Graceful container restart to clear heap leak';
    if (text.includes('cache') || text.includes('redis')) return 'FLUSH_REDIS_CACHE (LOW RISK) — Purge stale transient cache keys';
    if (text.includes('cpu') || text.includes('scale')) return 'SCALE_REPLICAS (HIGH RISK) — Requires Administrator Approval';
    return 'INSPECT_LOGS_AND_HEALTH (LOW RISK) — Run Verification Probe';
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Root Cause Analysis"
        subtitle="AI Diagnosis Agent findings, correlated evidence logs, and recommended corrective actions."
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      <UnavailableBanner
        feature="Live AI Diagnosis Pipeline"
        message="Real-time DiagnosisOrchestrator (backend → FastAPI /diagnosis/analyze) is scheduled for Phase 2. Existing incident root causes and evidence snapshots stored in the database are displayed below."
      />

      {/* Incident Selector */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Stethoscope className="w-4 h-4 text-cyan-400" />
          <span>Select Incident to Diagnose:</span>
        </div>
        <select
          value={selected?.id ?? ''}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          disabled={loading || incidents.length === 0}
          className="flex-1 max-w-xl px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED]"
        >
          {incidents.length === 0 ? (
            <option value="">No incidents available</option>
          ) : (
            incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                #{inc.id} [{inc.severity}] {inc.title} ({inc.status})
              </option>
            ))
          )}
        </select>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-xs">
          <RefreshCw className="w-5 h-5 animate-spin inline mr-2 text-[#7C3AED]" />
          Loading diagnostic records...
        </div>
      ) : !selected ? (
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-8">
          <EmptyState
            icon={<Stethoscope className="w-10 h-10" />}
            title="No Incidents Recorded"
            description="Once the Sentinel or Detection agent records an incident, its root cause diagnosis and evidence will appear here."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Diagnosis + Logs + Metrics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Detected Fault Summary */}
            <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono text-slate-500 uppercase">
                    Detected Fault · Incident #{selected.id}
                  </span>
                  <h2 className="text-lg font-bold text-slate-100 mt-0.5">{selected.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{selected.description}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="flex flex-wrap gap-4 pt-2 border-t border-dark-800 text-[11px] font-mono text-slate-400">
                <span>Service: <strong className="text-slate-200">{selected.applicationName || selected.serverHostName || 'Host'}</strong></span>
                <span>Severity: <strong className="text-rose-400">{selected.severity}</strong></span>
                <span>Agent: <strong className="text-cyan-400">{selected.detectedByAgent}</strong></span>
                <span>Opened: <strong className="text-slate-300">{new Date(selected.openedAt).toLocaleString()}</strong></span>
              </div>
            </div>

            {/* AI Diagnosis Results */}
            <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  AI Diagnosis Agent Assessment
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/50 text-cyan-400 border border-cyan-800/60">
                  Diagnosis Agent
                </span>
              </div>

              {selected.rootCause ? (
                <div className="p-4 rounded-lg bg-dark-850 border border-dark-700/80 text-xs text-slate-200 leading-relaxed">
                  {selected.rootCause}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-dark-850 border border-dashed border-dark-700 text-xs text-slate-500 font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Root cause has not been populated yet for this incident.
                </div>
              )}
            </div>

            {/* Relevant Logs & Evidence */}
            <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#A78BFA]" />
                Relevant Logs & Evidence Snapshot
              </h3>
              {selected.evidence ? (
                <pre className="p-4 rounded-lg bg-dark-950 border border-dark-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {parsedEvidence ? JSON.stringify(parsedEvidence, null, 2) : selected.evidence}
                </pre>
              ) : (
                <div className="p-4 rounded-lg bg-dark-950 border border-dashed border-dark-800 text-xs font-mono text-slate-500">
                  No log or evidence payload attached to Incident #{selected.id}.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: System Metrics + Recommended Actions */}
          <div className="space-y-6">
            <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                Metrics Around Incident
              </h3>

              {parsedEvidence && (parsedEvidence.cpu !== undefined || parsedEvidence.memory !== undefined || parsedEvidence.cpu_percent !== undefined) ? (
                <div className="space-y-3">
                  <MetricBar
                    label="CPU at Incident"
                    value={Number(parsedEvidence.cpu ?? parsedEvidence.cpu_percent ?? 0)}
                  />
                  <MetricBar
                    label="Memory at Incident"
                    value={Number(parsedEvidence.memory ?? parsedEvidence.memory_percent ?? 0)}
                    color="bg-indigo-500"
                  />
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-dark-850 border border-dashed border-dark-700 text-xs font-mono text-slate-500 leading-relaxed">
                  Time-windowed metric snapshots around the incident timestamp will be displayed here once Phase 2 `system_metrics` storage is active.
                </div>
              )}
            </div>

            {/* Recommended Corrective Actions */}
            <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Recommended Corrective Action
              </h3>

              <div className="p-3.5 rounded-lg bg-dark-850 border border-dark-700 text-xs text-slate-300 font-mono leading-relaxed">
                {recommendedActionText}
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                All recovery actions are validated against the backend allowlist. High-risk operations require explicit administrator approval.
              </p>

              <button
                onClick={() => navigate('/recovery')}
                className="w-full py-2 px-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-medium flex items-center justify-center gap-2 transition"
              >
                Manage in Recovery Console
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
