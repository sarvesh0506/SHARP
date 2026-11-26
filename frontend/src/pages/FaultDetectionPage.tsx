import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { AnomalyEvent } from '../types';
import { useLiveEvents } from '../contexts/LiveEventsContext';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorBanner } from '../components/ui/Banners';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Radar,
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  Stethoscope,
  RefreshCw,
  CheckCircle2,
  EyeOff,
  Check,
} from 'lucide-react';

export const FaultDetectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selected, setSelected] = useState<AnomalyEvent | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');

  const fetchAnomalies = async () => {
    try {
      setIsRefreshing(true);
      const res = await apiClient.get('/anomalies');
      const list: AnomalyEvent[] = res.data?.data ?? [];
      setAnomalies(list);
      setSelected((prev) =>
        prev ? list.find((a) => a.id === prev.id) ?? list[0] ?? null : list[0] ?? null
      );
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load detected anomalies from SHARP backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
    const id = setInterval(fetchAnomalies, 15000);
    return () => clearInterval(id);
  }, []);

  const { subscribe } = useLiveEvents();
  useEffect(() => {
    return subscribe((ev) => {
      if (ev.type.startsWith('ANOMALY_')) {
        fetchAnomalies();
      }
    });
  }, [subscribe]);

  const handleLifecycleAction = async (id: number, action: 'acknowledge' | 'resolve' | 'suppress') => {
    try {
      setActionBusy(true);
      setError(null);
      setFeedback(null);
      await apiClient.post(`/anomalies/${id}/${action}`);
      setFeedback(`Anomaly #${id} marked as ${action.toUpperCase()}.`);
      await fetchAnomalies();
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to ${action} anomaly #${id}.`);
    } finally {
      setActionBusy(false);
    }
  };

  const filtered = useMemo(() => {
    return anomalies.filter((a) => {
      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (methodFilter !== 'ALL' && a.detectionMethod !== methodFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${a.id} ${a.resourceName} ${a.metricName} ${a.description} ${a.detectionMethod}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [anomalies, severityFilter, statusFilter, methodFilter, searchQuery]);

  const activeCount = anomalies.filter((a) => a.status === 'ACTIVE').length;
  const criticalCount = anomalies.filter((a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length;
  const resolvedCount = anomalies.filter((a) => a.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fault Detection"
        subtitle="Real-time anomaly detection across host telemetry and processes (rule-based, statistical, and AI analysis)."
        onRefresh={fetchAnomalies}
        isRefreshing={isRefreshing}
      />

      {error && <ErrorBanner message={error} onRetry={fetchAnomalies} />}

      {feedback && (
        <div className="p-3.5 rounded-xl bg-[#34D399]/10 border border-[#34D399]/35 text-[#34D399] text-xs font-mono">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Detected Anomalies" value={anomalies.length} subtitle="Persisted anomaly events" icon={Radar} color="text-[#A78BFA]" />
        <StatCard
          title="Active Anomalies"
          value={activeCount}
          subtitle="Ongoing fault conditions"
          icon={AlertTriangle}
          color={activeCount > 0 ? 'text-[#F59E0B]' : 'text-[#34D399]'}
        />
        <StatCard
          title="Critical Severity"
          value={criticalCount}
          subtitle="Active critical anomalies"
          icon={ShieldAlert}
          color={criticalCount > 0 ? 'text-[#F43F5E]' : 'text-[#34D399]'}
        />
        <StatCard title="Resolved Anomalies" value={resolvedCount} subtitle="Cleared or verified" icon={CheckCircle2} color="text-[#34D399]" />
      </div>

      {/* Filters */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-4 shadow-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resource, metric, description..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED]"
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED]"
        >
          <option value="ALL">All States</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="SUPPRESSED">SUPPRESSED</option>
        </select>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED]"
        >
          <option value="ALL">All Methods</option>
          <option value="RULE_BASED">RULE_BASED</option>
          <option value="STATISTICAL">STATISTICAL</option>
          <option value="AI_ANALYSIS">AI_ANALYSIS</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 bg-dark-850 border-b border-dark-700 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-semibold uppercase flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#7C3AED]" />
              Detected Anomalies
            </span>
            <span className="text-slate-500">Showing {filtered.length} of {anomalies.length}</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs font-mono">
              <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#7C3AED]" />
              Loading anomaly stream...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Radar className="w-8 h-8" />}
              title="No Anomalies Detected"
              description="System telemetry is currently within configured thresholds and statistical baselines."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-850/60 border-b border-dark-800 text-slate-400 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Metric / Resource</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Observed</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800 font-mono text-[11px]">
                  {filtered.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className={`cursor-pointer transition hover:bg-dark-850/70 ${
                        selected?.id === a.id ? 'bg-dark-850 border-l-2 border-[#7C3AED]' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-400">#{a.id}</td>
                      <td className="py-3 px-4">
                        <div className="text-slate-200 font-semibold">{a.metricName}</div>
                        <div className="text-[10px] text-slate-500">{a.resourceName}</div>
                      </td>
                      <td className="py-3 px-4 text-[#22D3EE]">{a.detectionMethod}</td>
                      <td className="py-3 px-4 text-slate-200">{a.observedValue}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={a.severity} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={a.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dark-800">
            <h2 className="text-sm font-semibold text-slate-200">Anomaly Details</h2>
            {selected && <StatusBadge status={selected.status} />}
          </div>

          {selected ? (
            <div className="space-y-4 text-xs">
              <div>
                <div className="text-[11px] font-mono text-[#A78BFA]">
                  #{selected.id} · {selected.detectionMethod}
                </div>
                <h3 className="text-base font-bold text-slate-100 mt-0.5">{selected.metricName}</h3>
                <p className="text-slate-400 mt-1">{selected.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-dark-850 border border-dark-700 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block">Observed</span>
                  <span className="text-slate-200 font-bold">{selected.observedValue}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Baseline / Limit</span>
                  <span className="text-slate-200">{selected.baselineValue ?? 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Anomaly Score</span>
                  <span className="text-[#22D3EE]">{selected.anomalyScore ?? 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">AI Confidence</span>
                  <span className="text-[#A78BFA]">
                    {selected.confidenceScore != null ? `${(selected.confidenceScore * 100).toFixed(0)}%` : 'N/A (Non-AI)'}
                  </span>
                </div>
              </div>

              {selected.evidence && (
                <div>
                  <span className="text-[11px] font-mono text-slate-500 uppercase block mb-1">Evidence</span>
                  <pre className="p-2.5 rounded-lg bg-dark-950 border border-dark-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap">
                    {selected.evidence}
                  </pre>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  disabled={actionBusy || selected.status === 'ACKNOWLEDGED'}
                  onClick={() => handleLifecycleAction(selected.id, 'acknowledge')}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-medium disabled:opacity-40 flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Acknowledge
                </button>
                <button
                  disabled={actionBusy || selected.status === 'RESOLVED'}
                  onClick={() => handleLifecycleAction(selected.id, 'resolve')}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#34D399]/20 hover:bg-[#34D399]/30 text-[#34D399] border border-[#34D399]/40 text-xs font-medium disabled:opacity-40"
                >
                  Resolve
                </button>
                <button
                  disabled={actionBusy || selected.status === 'SUPPRESSED'}
                  onClick={() => handleLifecycleAction(selected.id, 'suppress')}
                  className="py-1.5 px-2.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs disabled:opacity-40 flex items-center gap-1"
                >
                  <EyeOff className="w-3.5 h-3.5" /> Suppress
                </button>
              </div>

              {selected.incidentId && (
                <button
                  onClick={() => navigate(`/diagnosis?incidentId=${selected.incidentId}`)}
                  className="w-full py-2 px-3 rounded-lg bg-dark-850 hover:bg-dark-800 border border-[#7C3AED]/40 text-[#A78BFA] font-medium flex items-center justify-center gap-2 transition"
                >
                  <Stethoscope className="w-4 h-4" />
                  Inspect Linked Incident #{selected.incidentId}
                </button>
              )}
            </div>
          ) : (
            <EmptyState
              icon={<Radar className="w-8 h-8" />}
              title="No Anomaly Selected"
              description="Select an anomaly from the table to inspect evidence and lifecycle controls."
            />
          )}
        </div>
      </div>
    </div>
  );
};
