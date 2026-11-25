import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { Incident, RecoveryAction } from '../types';
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
  Clock,
  Lock,
  Play,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

const ALLOWLISTED_ACTIONS = [
  {
    type: 'RESTART_CONTAINER',
    label: 'Restart Container',
    defaultRisk: 'LOW',
    description: 'Gracefully restarts the affected Docker container with health verification.',
  },
  {
    type: 'FLUSH_REDIS_CACHE',
    label: 'Flush Redis Cache',
    defaultRisk: 'LOW',
    description: 'Purges transient cache keys to clear stale or corrupted session state.',
  },
  {
    type: 'RELOAD_CONFIG',
    label: 'Reload Service Config',
    defaultRisk: 'LOW',
    description: 'Signals the target application to reload configuration without downtime.',
  },
  {
    type: 'SCALE_REPLICAS',
    label: 'Scale Service Replicas',
    defaultRisk: 'HIGH',
    description: 'Modifies cluster replica count. Always requires administrator approval.',
  },
];

export const RecoveryManagementPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Trigger Form state
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [selectedActionType, setSelectedActionType] = useState<string>('RESTART_CONTAINER');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reject modal state
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const [recRes, incRes] = await Promise.all([
        apiClient.get('/recovery'),
        apiClient.get('/incidents'),
      ]);
      const recList: RecoveryAction[] = recRes.data?.data ?? [];
      const incList: Incident[] = incRes.data?.data ?? [];
      setActions(recList);
      setIncidents(incList);
      const openInc = incList.filter((i) => i.status !== 'RESOLVED');
      if (!selectedIncidentId && openInc.length > 0) {
        setSelectedIncidentId(String(openInc[0].id));
      }
      setError(null);
    } catch {
      setError('Unable to load recovery actions from SHARP backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedPolicy = ALLOWLISTED_ACTIONS.find((a) => a.type === selectedActionType) ?? ALLOWLISTED_ACTIONS[0];

  const handleTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFeedback(null);

    if (!selectedIncidentId) {
      setFormError('Please select an active incident before initiating recovery.');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/recovery/trigger', {
        incidentId: Number(selectedIncidentId),
        actionType: selectedPolicy.type,
        riskLevel: selectedPolicy.defaultRisk,
      });
      setFeedback(
        selectedPolicy.defaultRisk === 'HIGH'
          ? `Action ${selectedPolicy.type} queued for Administrator Approval.`
          : `Low-risk action ${selectedPolicy.type} initiated via backend Recovery Engine.`
      );
      await fetchData();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to trigger recovery action.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      setFeedback(null);
      await apiClient.post(`/recovery/${id}/approve`);
      setFeedback(`Recovery action #${id} approved by administrator.`);
      await fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Approval failed. Administrator role required.');
    }
  };

  const handleRejectSubmit = async (id: number) => {
    if (!rejectReason.trim()) return;
    try {
      await apiClient.post(`/recovery/${id}/reject`, { reason: rejectReason.trim() });
      setRejectingId(null);
      setRejectReason('');
      setFeedback(`Recovery action #${id} rejected.`);
      await fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Rejection failed.');
    }
  };

  const pendingApprovals = actions.filter((a) => a.status === 'AWAITING_APPROVAL');
  const activeExecutions = actions.filter((a) =>
    ['PENDING', 'APPROVED', 'EXECUTING'].includes(a.status)
  );
  const verifiedSuccessCount = actions.filter(
    (a) => a.verificationStatus === 'VERIFIED_SUCCESS' || a.status === 'SUCCESS'
  ).length;
  const openIncidents = incidents.filter((i) => i.status !== 'RESOLVED');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recovery Management"
        subtitle="Controlled allowlisted recovery execution, administrator approval gates, and verification status."
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-mono">
          {feedback}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Awaiting Approval"
          value={pendingApprovals.length}
          subtitle="High-risk safety gate"
          icon={Lock}
          trend={pendingApprovals.length > 0 ? 'Admin Required' : 'Clear'}
          trendType={pendingApprovals.length > 0 ? 'negative' : 'positive'}
          color={pendingApprovals.length > 0 ? 'text-amber-400' : 'text-emerald-400'}
        />
        <StatCard
          title="Active Executions"
          value={activeExecutions.length}
          subtitle="Pending or executing"
          icon={RotateCcw}
          color="text-[#A78BFA]"
        />
        <StatCard
          title="Verified Recoveries"
          value={verifiedSuccessCount}
          subtitle="Passed independent check"
          icon={ShieldCheck}
          color="text-emerald-400"
        />
        <StatCard
          title="Open Incidents"
          value={openIncidents.length}
          subtitle="Eligible for remediation"
          icon={AlertTriangle}
          color="text-cyan-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Allowlisted Trigger Form + Safety Policies */}
        <div className="space-y-6">
          <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Play className="w-4 h-4 text-[#A78BFA]" />
              Initiate Controlled Recovery
            </h2>

            <form onSubmit={handleTrigger} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Target Incident</label>
                <select
                  value={selectedIncidentId}
                  onChange={(e) => setSelectedIncidentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED]"
                >
                  <option value="">-- Select an active incident --</option>
                  {openIncidents.map((inc) => (
                    <option key={inc.id} value={String(inc.id)}>
                      #{inc.id} [{inc.severity}] {inc.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Allowlisted Action</label>
                <select
                  value={selectedActionType}
                  onChange={(e) => setSelectedActionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED]"
                >
                  {ALLOWLISTED_ACTIONS.map((act) => (
                    <option key={act.type} value={act.type}>
                      {act.label} ({act.defaultRisk} RISK)
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-dark-850 border border-dark-700/80 space-y-1.5">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-400">Risk Tier:</span>
                  <span
                    className={`font-bold ${
                      selectedPolicy.defaultRisk === 'HIGH' ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {selectedPolicy.defaultRisk}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{selectedPolicy.description}</p>
                {selectedPolicy.defaultRisk === 'HIGH' && (
                  <p className="text-[11px] text-amber-400 font-mono flex items-center gap-1 pt-1">
                    <Lock className="w-3 h-3" />
                    Requires Administrator Approval before execution.
                  </p>
                )}
              </div>

              {formError && (
                <div className="p-2.5 rounded bg-rose-950/50 border border-rose-800 text-rose-300 text-[11px]">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || openIncidents.length === 0}
                className="w-full py-2 px-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white font-medium transition flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit Recovery Request'}
              </button>
            </form>
          </div>
        </div>

        {/* Right 2 Columns: Approval Queue + Active/Recent Recovery Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Approval Queue */}
          <div className="bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 bg-dark-850 border-b border-dark-700 flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-amber-400 uppercase flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                Administrator Approval Queue ({pendingApprovals.length})
              </span>
              {!isAdmin && (
                <span className="text-[11px] font-mono text-slate-500">Read-only (Operator)</span>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#7C3AED]" />
                Loading approval queue...
              </div>
            ) : pendingApprovals.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs font-mono">
                No high-risk recovery actions awaiting approval.
              </div>
            ) : (
              <div className="divide-y divide-dark-800">
                {pendingApprovals.map((act) => (
                  <div key={act.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-200 font-mono">
                          #{act.id} · {act.actionType}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Incident #{act.incidentId} {act.incidentTitle ? `— ${act.incidentTitle}` : ''}
                        </div>
                      </div>
                      <StatusBadge status={act.status} />
                    </div>

                    {isAdmin && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleApprove(act.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve & Authorize
                        </button>
                        <button
                          onClick={() => setRejectingId(act.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1.5 transition"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}

                    {rejectingId === act.id && (
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Enter rejection reason..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-dark-850 border border-dark-700 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                        />
                        <button
                          onClick={() => handleRejectSubmit(act.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-dark-800 text-slate-300 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All Recovery Execution Statuses */}
          <div className="bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 bg-dark-850 border-b border-dark-700 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold uppercase">Recovery Execution & Verification</span>
              <span className="text-slate-500">Total: {actions.length}</span>
            </div>

            {actions.length === 0 ? (
              <EmptyState
                icon={<RotateCcw className="w-8 h-8" />}
                title="No Recovery Actions Yet"
                description="Initiate a recovery action from the panel on the left or wait for autonomous remediation."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-dark-850/60 border-b border-dark-800 text-slate-400 uppercase font-mono text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Incident</th>
                      <th className="py-3 px-4">Risk</th>
                      <th className="py-3 px-4">Execution</th>
                      <th className="py-3 px-4">Verification</th>
                      <th className="py-3 px-4">Initiated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800 font-mono text-[11px]">
                    {actions.map((act) => (
                      <tr key={act.id} className="hover:bg-dark-850/60 transition">
                        <td className="py-3 px-4 text-slate-200 font-semibold">{act.actionType}</td>
                        <td className="py-3 px-4 text-slate-400">#{act.incidentId}</td>
                        <td className="py-3 px-4">
                          <span className={act.riskLevel === 'HIGH' ? 'text-rose-400 font-bold' : 'text-[#A78BFA]'}>
                            {act.riskLevel}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={act.status} />
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={act.verificationStatus} />
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(act.initiatedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
