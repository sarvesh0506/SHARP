import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { Incident, RecoveryAction } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import {
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  XCircle,
  FileCode,
  ShieldCheck,
  RefreshCw,
  Search
} from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [recoveryActions, setRecoveryActions] = useState<RecoveryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const { isAdmin } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incRes, recRes] = await Promise.all([
        apiClient.get('/incidents'),
        apiClient.get('/recovery')
      ]);

      if (incRes.data?.data) setIncidents(incRes.data.data);
      if (recRes.data?.data) setRecoveryActions(recRes.data.data);
    } catch (err) {
      console.error('Failed to load incidents/recovery data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (actionId: number) => {
    try {
      await apiClient.post(`/recovery/${actionId}/approve`);
      fetchData();
    } catch (err) {
      console.error('Failed to approve recovery:', err);
      alert('Approval failed. Check permissions.');
    }
  };

  const handleReject = async (actionId: number) => {
    const reason = prompt('Enter rejection reason:') || 'Rejected by administrator';
    try {
      await apiClient.post(`/recovery/${actionId}/reject`, { reason });
      fetchData();
    } catch (err) {
      console.error('Failed to reject recovery:', err);
    }
  };

  const handleResolve = async (incidentId: number) => {
    const notes = prompt('Enter resolution notes:') || 'Resolved manually by operator';
    try {
      await apiClient.post(`/incidents/${incidentId}/resolve`, { resolutionNotes: notes });
      fetchData();
    } catch (err) {
      console.error('Failed to resolve incident:', err);
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700 text-xs text-slate-300 font-medium transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Incidents
        </button>
      </div>

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
                  No active or recorded incidents. Systems are resilient and healthy.
                </div>
              ) : (
                incidents.map((incident) => {
                  const action = recoveryActions.find((a) => a.incidentId === incident.id);
                  return (
                    <div
                      key={incident.id}
                      onClick={() => setSelectedIncident(incident)}
                      className={`p-4 hover:bg-dark-850/70 transition cursor-pointer ${
                        selectedIncident?.id === incident.id ? 'bg-dark-850 border-l-2 border-[#7C3AED]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                            incident.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                            incident.severity === 'HIGH' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            'bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/35'
                          }`}>
                            {incident.severity}
                          </span>
                          <h3 className="text-sm font-semibold text-slate-200">{incident.title}</h3>
                        </div>
                        <StatusBadge status={incident.status} />
                      </div>

                      <p className="text-xs text-slate-400 mb-2 line-clamp-2">{incident.description}</p>

                      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500 gap-2">
                        <div className="flex items-center gap-3">
                          <span>Target: {incident.applicationName || 'Host Node'}</span>
                          <span>•</span>
                          <span>Agent: {incident.detectedByAgent}</span>
                        </div>
                        {action && (
                          <span className="text-cyan-400 font-semibold">
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

        {/* Incident Detail / Approval Panel */}
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
                <span className="text-[11px] font-mono text-slate-500 uppercase block mb-1">Incident # {selectedIncident.id}</span>
                <h3 className="text-base font-bold text-slate-100">{selectedIncident.title}</h3>
                <p className="text-slate-400 mt-1">{selectedIncident.description}</p>
              </div>

              {selectedIncident.rootCause && (
                <div className="p-3 rounded-lg bg-dark-850 border border-dark-700/80 space-y-1">
                  <span className="text-[11px] font-semibold text-cyan-400 font-mono block">AI Root Cause Diagnosis</span>
                  <p className="text-slate-300 leading-relaxed">{selectedIncident.rootCause}</p>
                </div>
              )}

              {selectedIncident.evidence && (
                <div>
                  <span className="text-[11px] font-mono text-slate-500 block mb-1">Evidence & Telemetry Snapshot</span>
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
                      <div>Risk Level: <span className={action.riskLevel === 'HIGH' ? 'text-rose-400' : 'text-[#A78BFA]'}>{action.riskLevel}</span></div>
                      <div>Requires Admin Approval: {action.requiresApproval ? 'YES' : 'NO'}</div>
                      <div>Verification: <span className="text-emerald-400">{action.verificationStatus}</span></div>
                    </div>

                    {/* Admin Approval Buttons */}
                    {action.status === 'AWAITING_APPROVAL' && isAdmin && (
                      <div className="pt-2 flex gap-2">
                        <button
                          onClick={() => handleApprove(action.id)}
                          className="flex-1 py-1.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center justify-center gap-1.5 transition"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve Action
                        </button>
                        <button
                          onClick={() => handleReject(action.id)}
                          className="flex-1 py-1.5 px-3 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium flex items-center justify-center gap-1.5 transition"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {selectedIncident.status !== 'RESOLVED' && (
                <button
                  onClick={() => handleResolve(selectedIncident.id)}
                  className="w-full py-2 px-3 rounded-lg bg-dark-800 hover:bg-dark-750 border border-dark-700 text-slate-300 font-medium transition"
                >
                  Mark Incident as Resolved
                </button>
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
