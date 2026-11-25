import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { Incident, RecoveryAction } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorBanner } from '../components/ui/Banners';
import { useAuth } from '../contexts/AuthContext';
import {
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [recoveryActions, setRecoveryActions] = useState<RecoveryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Inline action forms (replacing native alert/prompt)
  const [rejectingActionId, setRejectingActionId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [resolvingIncidentId, setResolvingIncidentId] = useState<number | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { isAdmin } = useAuth();

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
      setRecoveryActions(recList);
      setSelectedIncident((prev) =>
        prev ? incList.find((i) => i.id === prev.id) ?? incList[0] ?? null : prev
      );
      setError(null);
    } catch (err: any) {
      console.error('Failed to load incidents/recovery data:', err);
      setError(err?.response?.data?.message || 'Unable to load incidents and recovery actions from SHARP backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (actionId: number) => {
    try {
      setActionLoading(true);
      setError(null);
      setFeedback(null);
      await apiClient.post(`/recovery/${actionId}/approve`);
      setFeedback(`Recovery action #${actionId} approved by administrator.`);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to approve recovery:', err);
      setError(err?.response?.data?.message || 'Approval failed. Administrator permissions required.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (actionId: number) => {
    if (!rejectReason.trim()) {
      setError('Please enter a rejection reason.');
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      setFeedback(null);
      await apiClient.post(`/recovery/${actionId}/reject`, { reason: rejectReason.trim() });
      setRejectingActionId(null);
      setRejectReason('');
      setFeedback(`Recovery action #${actionId} rejected.`);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to reject recovery:', err);
      setError(err?.response?.data?.message || 'Rejection failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveSubmit = async (incidentId: number) => {
    const notes = resolutionNotes.trim() || 'Resolved manually by operator';
    try {
      setActionLoading(true);
      setError(null);
      setFeedback(null);
      await apiClient.post(`/incidents/${incidentId}/resolve`, { resolutionNotes: notes });
      setResolvingIncidentId(null);
      setResolutionNotes('');
      setFeedback(`Incident #${incidentId} marked as resolved.`);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to resolve incident:', err);
      setError(err?.response?.data?.message || 'Failed to resolve incident.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-dark-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-mono">
            Incident Management & Recovery Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous failure detection, root cause diagnostics, approval workflows, and audit logging.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700 text-xs text-slate-300 font-medium transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#7C3AED]' : ''}`} />
          Refresh Incidents
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {feedback && (
        <div className="p-3.5 rounded-xl bg-[#34D399]/10 border border-[#34D399]/35 text-[#34D399] text-xs font-mono">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 bg-dark-850 border-b border-dark-700 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold uppercase">Incident Stream</span>
              <span className="text-slate-500">Total: {incidents.length}</span>
            </div>

            <div className="divide-y divide-dark-800">
              {loading ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#7C3AED]" />
                  Loading incident ledger...
                </div>
              ) : incidents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  {error
                    ? 'Unable to display incidents due to backend connection error.'
                    : 'No active or recorded incidents. Systems are resilient and healthy.'}
                </div>
              ) : (
                incidents.map((incident) => {
                  const action = recoveryActions.find((a) => a.incidentId === incident.id);
                  return (
                    <div
                      key={incident.id}
                      onClick={() => {
                        setSelectedIncident(incident);
                        setRejectingActionId(null);
                        setResolvingIncidentId(null);
                      }}
                      className={`p-4 hover:bg-dark-850/70 transition cursor-pointer ${
                        selectedIncident?.id === incident.id ? 'bg-dark-850 border-l-2 border-[#7C3AED]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <AlertTriangle
                              className={`w-4 h-4 ${
                                incident.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'
                              }`}
                            />
                            <span className="font-semibold text-slate-200 text-sm">{incident.title}</span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">{incident.description}</p>
                        </div>
                        <StatusBadge status={incident.status} />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] font-mono text-slate-500">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            incident.severity === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {incident.severity}
                        </span>
                        <span>Agent: {incident.detectedByAgent}</span>
                        <span>·</span>
                        <span>{new Date(incident.openedAt).toLocaleString()}</span>
                        {action && (
                          <span className="ml-auto text-cyan-400 font-semibold">
                            Recovery: {action.actionType} ({action.status})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Selected Incident & Recovery Side Panel */}
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dark-800">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              Recovery & Diagnosis Panel
            </h2>
          </div>

          {selectedIncident ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[11px] font-mono text-slate-500 uppercase block mb-1">
                  Incident # {selectedIncident.id}
                </span>
                <h3 className="text-base font-bold text-slate-100">{selectedIncident.title}</h3>
                <p className="text-slate-400 mt-1">{selectedIncident.description}</p>
              </div>

              {selectedIncident.rootCause && (
                <div className="p-3 rounded-lg bg-dark-850 border border-dark-700/80 space-y-1">
                  <span className="text-[11px] font-semibold text-cyan-400 font-mono block">
                    AI Root Cause Diagnosis
                  </span>
                  <p className="text-slate-300 leading-relaxed">{selectedIncident.rootCause}</p>
                </div>
              )}

              {selectedIncident.evidence && (
                <div>
                  <span className="text-[11px] font-mono text-slate-500 block mb-1">
                    Evidence & Telemetry Snapshot
                  </span>
                  <pre className="p-2.5 rounded bg-dark-950 border border-dark-800 text-[11px] font-mono text-slate-400 overflow-x-auto">
                    {selectedIncident.evidence}
                  </pre>
                </div>
              )}

              {/* Recovery Action Card for this incident */}
              {(() => {
                const action = recoveryActions.find((a) => a.incidentId === selectedIncident.id);
                if (!action) {
                  return (
                    <div className="p-3 rounded-lg bg-dark-850 text-slate-400 text-center font-mono text-[11px]">
                      No active recovery action attached.
                    </div>
                  );
                }

                return (
                  <div className="p-3.5 rounded-lg bg-dark-850 border border-dark-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 font-mono">Action: {action.actionType}</span>
                      <StatusBadge status={action.status} />
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono space-y-1">
                      <div>
                        Risk Level:{' '}
                        <span className={action.riskLevel === 'HIGH' ? 'text-rose-400' : 'text-[#A78BFA]'}>
                          {action.riskLevel}
                        </span>
                      </div>
                      <div>Requires Admin Approval: {action.requiresApproval ? 'YES' : 'NO'}</div>
                      <div>
                        Verification: <span className="text-emerald-400">{action.verificationStatus}</span>
                      </div>
                    </div>

                    {/* Admin Approval Buttons */}
                    {action.status === 'AWAITING_APPROVAL' && isAdmin && (
                      <div className="pt-2 space-y-2">
                        <div className="flex gap-2">
                          <button
                            disabled={actionLoading}
                            onClick={() => handleApprove(action.id)}
                            className="flex-1 py-1.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve Action
                          </button>
                          <button
                            disabled={actionLoading}
                            onClick={() => setRejectingActionId(action.id)}
                            className="flex-1 py-1.5 px-3 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>

                        {rejectingActionId === action.id && (
                          <div className="space-y-2 pt-1">
                            <input
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Enter rejection reason..."
                              className="w-full px-3 py-1.5 rounded bg-dark-950 border border-dark-700 text-slate-200 focus:outline-none focus:border-rose-500"
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingActionId(null);
                                  setRejectReason('');
                                }}
                                className="px-2.5 py-1 rounded bg-dark-800 text-slate-300"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleRejectSubmit(action.id)}
                                className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium disabled:opacity-50"
                              >
                                Confirm Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {selectedIncident.status !== 'RESOLVED' && (
                <div className="space-y-2">
                  {resolvingIncidentId === selectedIncident.id ? (
                    <div className="p-3 rounded-lg bg-dark-850 border border-dark-700 space-y-2">
                      <label className="block text-[11px] font-mono text-slate-400">
                        Resolution Notes
                      </label>
                      <input
                        type="text"
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Describe how the incident was resolved..."
                        className="w-full px-3 py-1.5 rounded bg-dark-950 border border-dark-700 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResolvingIncidentId(null);
                            setResolutionNotes('');
                          }}
                          className="px-2.5 py-1 rounded bg-dark-800 text-slate-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleResolveSubmit(selectedIncident.id)}
                          className="px-3 py-1 rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium disabled:opacity-50"
                        >
                          {actionLoading ? 'Resolving...' : 'Confirm Resolve'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResolvingIncidentId(selectedIncident.id)}
                      className="w-full py-2 px-3 rounded-lg bg-dark-800 hover:bg-dark-750 border border-dark-700 text-slate-300 font-medium transition"
                    >
                      Mark Incident as Resolved
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              Select an incident from the stream to inspect root causes, metrics, and recovery actions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
