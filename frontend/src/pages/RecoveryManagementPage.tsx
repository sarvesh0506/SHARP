import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { Incident, RecoveryAction, RecoveryRecommendation } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorBanner } from '../components/ui/Banners';
import { EmptyState } from '../components/ui/EmptyState';
import {
  ShieldCheck,
  RotateCcw,
  CheckCircle,
  XCircle,
  Lock,
  Play,
  RefreshCw,
  AlertTriangle,
  Ban,
} from 'lucide-react';

const ALLOWLISTED_ACTIONS = [
  { type: 'RUN_HEALTH_PROBE', label: 'Run Service & Host Health Probe', risk: 'LOW', desc: 'Read-only telemetry & health probe.' },
  { type: 'COLLECT_DIAGNOSTIC_SNAPSHOT', label: 'Collect Diagnostic Snapshot', risk: 'LOW', desc: 'Captures fresh host & process telemetry.' },
  { type: 'CLEAR_STALE_TELEMETRY_CACHE', label: 'Purge Expired Telemetry Buffers', risk: 'LOW', desc: 'Removes expired (>6h) telemetry rows.' },
  { type: 'RESTART_MONITORED_SERVICE', label: 'Restart Registered Service', risk: 'MEDIUM', desc: 'Controlled restart of registered application.' },
  { type: 'THROTTLE_OR_SCALE_SERVICE', label: 'Throttle / Scale Service', risk: 'HIGH', desc: 'Admin approval required.' },
];

export const RecoveryManagementPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [recommendations, setRecommendations] = useState<RecoveryRecommendation[]>([]);
  const [executions, setExecutions] = useState<RecoveryAction[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [selectedActionType, setSelectedActionType] = useState<string>('RUN_HEALTH_PROBE');
  const [submitting, setSubmitting] = useState(false);

  const [confirmExecuteRec, setConfirmExecuteRec] = useState<RecoveryRecommendation | null>(null);
  const [executing, setExecuting] = useState(false);

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const [recRes, execRes, incRes] = await Promise.all([
        apiClient.get('/recovery/recommendations'),
        apiClient.get('/recovery/executions'),
        apiClient.get('/incidents'),
      ]);
      setRecommendations(recRes.data?.data ?? []);
      setExecutions(execRes.data?.data ?? []);
      const incList: Incident[] = incRes.data?.data ?? [];
      setIncidents(incList);
      const openInc = incList.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status));
      if (!selectedIncidentId && openInc.length > 0) {
        setSelectedIncidentId(String(openInc[0].id));
      }
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load recovery recommendations and executions.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateRec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentId) {
      setError('Select an open incident first.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      setFeedback(null);
      await apiClient.post(`/recovery/recommendations/incident/${selectedIncidentId}`, {
        actionType: selectedActionType,
      });
      setFeedback(`Recovery recommendation (${selectedActionType}) created for incident #${selectedIncidentId}.`);
      await fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create recovery recommendation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecAction = async (id: number, action: 'approve' | 'reject' | 'cancel') => {
    try {
      setError(null);
      setFeedback(null);
      await apiClient.post(`/recovery/recommendations/${id}/${action}`, action === 'reject' ? { reason: 'Rejected in console' } : {});
      setFeedback(`Recommendation #${id} ${action}d.`);
      await fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to ${action} recommendation #${id}.`);
    }
  };

  const handleConfirmExecute = async () => {
    if (!confirmExecuteRec) return;
    try {
      setExecuting(true);
      setError(null);
      setFeedback(null);
      const res = await apiClient.post(`/recovery/recommendations/${confirmExecuteRec.id}/execute`);
      const exec: RecoveryAction | undefined = res.data?.data;
      setConfirmExecuteRec(null);
      setFeedback(
        exec
          ? `Execution #${exec.id} completed — Verification: ${exec.verificationStatus}`
          : 'Execution & independent verification completed.'
      );
      await fetchData();
    } catch (err: any) {
      setConfirmExecuteRec(null);
      setError(err?.response?.data?.message || 'Recovery execution failed or was blocked by policy.');
    } finally {
      setExecuting(false);
    }
  };

  const pendingRecs = recommendations.filter((r) => r.status === 'PENDING' || r.status === 'APPROVED');
  const verifiedCount = executions.filter((e) => e.verificationStatus === 'VERIFIED').length;
  const openIncidents = incidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recovery Management"
        subtitle="Allowlisted recovery recommendations, policy & admin approval gates, controlled execution, and independent verification."
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {feedback && (
        <div className="p-3.5 rounded-xl bg-[#B0D4B8]/10 border border-[#B0D4B8]/35 text-[#B0D4B8] text-xs font-mono">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Recommendations" value={pendingRecs.length} subtitle="Pending or approved" icon={Lock} color="text-[#EAE7D6]" />
        <StatCard title="Total Executions" value={executions.length} subtitle="Controlled action runs" icon={RotateCcw} color="text-[#D7F9FA]" />
        <StatCard title="Independently Verified" value={verifiedCount} subtitle="Confirmed post-recovery" icon={ShieldCheck} color="text-[#B0D4B8]" />
        <StatCard title="Open Incidents" value={openIncidents.length} subtitle="Eligible for remediation" icon={AlertTriangle} color="text-[#A4C3A2]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Create Allowlisted Recommendation */}
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
            <Play className="w-4 h-4 text-[#A4C3A2]" />
            Recommend Safe Recovery
          </h2>

          <form onSubmit={handleGenerateRec} className="space-y-3 text-xs">
            <div>
              <label className="block text-[var(--text-muted)] font-mono mb-1">Target Incident</label>
              <select
                value={selectedIncidentId}
                onChange={(e) => setSelectedIncidentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)] font-mono"
              >
                <option value="">-- Select open incident --</option>
                {openIncidents.map((inc) => (
                  <option key={inc.id} value={String(inc.id)}>
                    #{inc.id} [{inc.severity}] {inc.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[var(--text-muted)] font-mono mb-1">Allowlisted Action</label>
              <select
                value={selectedActionType}
                onChange={(e) => setSelectedActionType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)] font-mono"
              >
                {ALLOWLISTED_ACTIONS.map((a) => (
                  <option key={a.type} value={a.type}>
                    {a.label} ({a.risk})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-lg bg-dark-850 border border-dark-700 text-[11px] text-[var(--text-muted)]">
              {ALLOWLISTED_ACTIONS.find((a) => a.type === selectedActionType)?.desc}
            </div>

            <button
              type="submit"
              disabled={submitting || openIncidents.length === 0}
              className="w-full py-2 px-3 rounded-lg bg-[#5D7B6F] hover:bg-[#4D685D] text-white font-medium disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Recommendation'}
            </button>
          </form>
        </div>

        {/* Right 2 Columns: Recommendations Queue */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 bg-dark-850 border-b border-dark-700 flex items-center justify-between text-xs font-mono">
            <span className="text-[var(--text-secondary)] font-semibold uppercase">Recovery Recommendations</span>
            <span className="text-[var(--text-muted)]">{recommendations.length} total</span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[var(--text-muted)] font-mono text-xs">
              <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#5D7B6F]" />
              Loading recommendations...
            </div>
          ) : recommendations.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="w-8 h-8" />}
              title="No Recommendations Yet"
              description="Generate a recommendation from RCA or the panel on the left."
            />
          ) : (
            <div className="divide-y divide-dark-800">
              {recommendations.map((rec) => {
                const canExecute =
                  rec.status === 'APPROVED' || (!rec.approvalRequired && rec.status === 'PENDING');
                const adminBlocked = (rec.riskLevel === 'HIGH' || rec.riskLevel === 'CRITICAL') && !isAdmin;

                return (
                  <div key={rec.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-main)] font-mono">
                          #{rec.id} · {rec.actionName}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                          Incident #{rec.incidentId} · Target: <span className="font-mono text-[var(--text-secondary)]">{rec.targetResource || 'Host'}</span>
                        </div>
                        <div className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
                          Risk: <span className={rec.riskLevel === 'HIGH' ? 'text-[#EAE7D6] font-bold' : 'text-[#D7F9FA]'}>{rec.riskLevel}</span> · Policy: {rec.policyRule}
                        </div>
                      </div>
                      <StatusBadge status={rec.status} />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {rec.status === 'PENDING' && (
                        <>
                          <button
                            disabled={adminBlocked}
                            onClick={() => handleRecAction(rec.id, 'approve')}
                            className="px-3 py-1 rounded bg-[#B0D4B8]/20 hover:bg-[#B0D4B8]/30 text-[#B0D4B8] border border-[#B0D4B8]/40 text-xs font-medium flex items-center gap-1 disabled:opacity-40"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleRecAction(rec.id, 'reject')}
                            className="px-3 py-1 rounded bg-[#EAE7D6]/20 hover:bg-[#EAE7D6]/30 text-[#EAE7D6] border border-[#EAE7D6]/40 text-xs font-medium flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}

                      {canExecute && rec.riskLevel !== 'CRITICAL' && (
                        <button
                          disabled={adminBlocked}
                          onClick={() => setConfirmExecuteRec(rec)}
                          className="px-3 py-1 rounded bg-[#5D7B6F] hover:bg-[#4D685D] text-white text-xs font-medium flex items-center gap-1 disabled:opacity-40"
                        >
                          <Play className="w-3.5 h-3.5" /> Execute & Verify
                        </button>
                      )}

                      {(rec.status === 'PENDING' || rec.status === 'APPROVED') && (
                        <button
                          onClick={() => handleRecAction(rec.id, 'cancel')}
                          className="px-3 py-1 rounded bg-dark-800 hover:bg-dark-700 text-[var(--text-secondary)] text-xs flex items-center gap-1"
                        >
                          <Ban className="w-3.5 h-3.5" /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmExecuteRec && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-dark-900 border border-[#5D7B6F]/40 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-main)] font-mono">Confirm Recovery Execution</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Execute <strong className="text-[#D7F9FA]">{confirmExecuteRec.actionType}</strong> on{' '}
              <strong className="text-white">{confirmExecuteRec.targetResource}</strong> (Incident #{confirmExecuteRec.incidentId})?
              SHARP will run independent post-recovery verification afterward.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={executing}
                onClick={() => setConfirmExecuteRec(null)}
                className="px-3 py-1.5 rounded bg-dark-800 text-[var(--text-secondary)] text-xs"
              >
                Cancel
              </button>
              <button
                disabled={executing}
                onClick={handleConfirmExecute}
                className="px-4 py-1.5 rounded bg-[#5D7B6F] hover:bg-[#4D685D] text-white text-xs font-medium disabled:opacity-50"
              >
                {executing ? 'Executing & Verifying...' : 'Confirm Execute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
