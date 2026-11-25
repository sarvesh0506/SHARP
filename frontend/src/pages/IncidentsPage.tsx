import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Search,
  Stethoscope,
} from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [recoveryActions, setRecoveryActions] = useState<RecoveryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

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
        prev ? incList.find((i) => i.id === prev.id) ?? incList[0] ?? null : incList[0] ?? null
      );
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load incidents from SHARP backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
      if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${inc.id} ${inc.title} ${inc.description} ${inc.affectedResource ?? ''} ${inc.detectedByAgent}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [incidents, statusFilter, severityFilter, search]);

  const handleIncidentTransition = async (id: number, endpoint: 'acknowledge' | 'investigate' | 'reopen') => {
    try {
      setActionLoading(true);
      setError(null);
      setFeedback(null);
      await apiClient.post(`/incidents/${id}/${endpoint}`);
      setFeedback(`Incident #${id} updated (${endpoint}).`);
      await fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to ${endpoint} incident.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (actionId: number) => {
    try {
      setActionLoading(true);
      setError(null);
      setFeedback(null);
      await apiClient.post(`/recovery/${actionId}/approve`);
      setFeedback(`Recovery action #${actionId} approved and verified.`);
      await fetchData();
    } catch (err: any) {
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
      await apiClient.post(`/recovery/${actionId}/reject`, { reason: rejectReason.trim() });
      setRejectingActionId(null);
      setRejectReason('');
      setFeedback(`Recovery action #${actionId} rejected.`);
      await fetchData();
    } catch (err: any) {
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
      await apiClient.post(`/incidents/${incidentId}/resolve`, { resolutionNotes: notes });
      setResolvingIncidentId(null);
      setResolutionNotes('');
      setFeedback(`Incident #${incidentId} marked as resolved.`);
      await fetchData();
    } catch (err: any) {
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
            Incident Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Full incident lifecycle tracking, triage transitions, root cause status, and linked recovery actions.
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

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incident ID, title, resource..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-slate-200 font-mono"
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
          className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-slate-200 font-mono"
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
          <option value="INVESTIGATING">INVESTIGATING</option>
          <option value="RECOVERY_PENDING">RECOVERY_PENDING</option>
          <option value="RECOVERING">RECOVERING</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="REOPENED">REOPENED</option>
          <option value="FAILED">FAILED</option>
        </select>
        <span className="text-xs font-mono text-slate-500 ml-auto">
          Showing {filteredIncidents.length} of {incidents.length}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident List */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
          <div className="divide-y divide-dark-800">
            {loading ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#7C3AED]" />
                Loading incident ledger...
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                No matching incidents found.
              </div>
            ) : (
              filteredIncidents.map((incident) => {
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
                          <span className="font-semibold text-slate-200 text-sm">
                            #{incident.id} · {incident.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{incident.description}</p>
                      </div>
                      <StatusBadge status={incident.status} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] font-mono text-slate-500">
                      <span className={incident.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}>
                        {incident.severity}
                      </span>
                      <span>Source: {incident.source || 'MANUAL'}</span>
                      <span>RCA: {incident.rcaStatus || 'PENDING'}</span>
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

        {/* Detail Panel */}
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dark-800">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              Incident Lifecycle & Actions
            </h2>
          </div>

          {selectedIncident ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[11px] font-mono text-slate-500 uppercase block mb-1">
                  Incident #{selectedIncident.id} · {selectedIncident.affectedResource || 'Host'}
                </span>
                <h3 className="text-base font-bold text-slate-100">{selectedIncident.title}</h3>
                <p className="text-slate-400 mt-1 whitespace-pre-wrap">{selectedIncident.description}</p>
              </div>

              {/* Lifecycle Buttons */}
              <div className="flex flex-wrap gap-2">
                {selectedIncident.status === 'OPEN' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleIncidentTransition(selectedIncident.id, 'acknowledge')}
                    className="px-2.5 py-1.5 rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium"
                  >
                    Acknowledge
                  </button>
                )}
                {['OPEN', 'ACKNOWLEDGED', 'REOPENED'].includes(selectedIncident.status) && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleIncidentTransition(selectedIncident.id, 'investigate')}
                    className="px-2.5 py-1.5 rounded bg-dark-800 hover:bg-dark-700 border border-dark-600 text-slate-200"
                  >
                    Investigate
                  </button>
                )}
                {['RESOLVED', 'CLOSED'].includes(selectedIncident.status) && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleIncidentTransition(selectedIncident.id, 'reopen')}
                    className="px-2.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium"
                  >
                    Reopen
                  </button>
                )}
                <button
                  onClick={() => navigate(`/diagnosis?incidentId=${selectedIncident.id}`)}
                  className="px-2.5 py-1.5 rounded bg-dark-850 border border-[#7C3AED]/40 text-[#A78BFA] flex items-center gap-1"
                >
                  <Stethoscope className="w-3.5 h-3.5" /> RCA
                </button>
              </div>

              {selectedIncident.rootCause && (
                <div className="p-3 rounded-lg bg-dark-850 border border-dark-700/80 space-y-1">
                  <span className="text-[11px] font-semibold text-cyan-400 font-mono block">Root Cause</span>
                  <p className="text-slate-300 leading-relaxed">{selectedIncident.rootCause}</p>
                </div>
              )}

              {(() => {
                const action = recoveryActions.find((a) => a.incidentId === selectedIncident.id);
                if (!action) return null;
                return (
                  <div className="p-3.5 rounded-lg bg-dark-850 border border-dark-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 font-mono">{action.actionType}</span>
                      <StatusBadge status={action.status} />
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Verification: <span className="text-emerald-400">{action.verificationStatus}</span>
                    </div>
                    {action.status === 'AWAITING_APPROVAL' && isAdmin && (
                      <div className="pt-2 space-y-2">
                        <div className="flex gap-2">
                          <button
                            disabled={actionLoading}
                            onClick={() => handleApprove(action.id)}
                            className="flex-1 py-1.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center justify-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            disabled={actionLoading}
                            onClick={() => setRejectingActionId(action.id)}
                            className="flex-1 py-1.5 px-3 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium flex items-center justify-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                        {rejectingActionId === action.id && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Rejection reason..."
                              className="w-full px-3 py-1.5 rounded bg-dark-950 border border-dark-700 text-slate-200"
                            />
                            <button
                              onClick={() => handleRejectSubmit(action.id)}
                              className="px-3 py-1 rounded bg-rose-600 text-white"
                            >
                              Confirm Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {!['RESOLVED', 'CLOSED'].includes(selectedIncident.status) && (
                <div className="space-y-2">
                  {resolvingIncidentId === selectedIncident.id ? (
                    <div className="p-3 rounded-lg bg-dark-850 border border-dark-700 space-y-2">
                      <input
                        type="text"
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Resolution notes..."
                        className="w-full px-3 py-1.5 rounded bg-dark-950 border border-dark-700 text-slate-200"
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setResolvingIncidentId(null)} className="px-2.5 py-1 rounded bg-dark-800 text-slate-300">
                          Cancel
                        </button>
                        <button onClick={() => handleResolveSubmit(selectedIncident.id)} className="px-3 py-1 rounded bg-[#7C3AED] text-white">
                          Confirm Resolve
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResolvingIncidentId(selectedIncident.id)}
                      className="w-full py-2 px-3 rounded-lg bg-dark-800 hover:bg-dark-750 border border-dark-700 text-slate-300 font-medium"
                    >
                      Mark Incident as Resolved
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              Select an incident to inspect details and lifecycle actions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
