import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { Application, Incident } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorBanner } from '../components/ui/Banners';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Radar,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Search,
  Filter,
  Stethoscope,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

const inferFaultCategory = (incident: Incident): string => {
  const text = `${incident.title} ${incident.description || ''} ${incident.rootCause || ''}`.toLowerCase();
  if (text.includes('cpu') || text.includes('saturation')) return 'CPU_SATURATION';
  if (text.includes('memory') || text.includes('oom') || text.includes('leak')) return 'MEMORY_EXHAUSTION';
  if (text.includes('timeout') || text.includes('latency') || text.includes('slow')) return 'LATENCY_DEGRADATION';
  if (text.includes('crash') || text.includes('stopped') || text.includes('exit')) return 'PROCESS_CRASH';
  if (text.includes('health') || text.includes('500') || text.includes('503')) return 'HEALTH_CHECK_FAILURE';
  return 'SERVICE_ANOMALY';
};

export const FaultDetectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const [incRes, appRes] = await Promise.all([
        apiClient.get('/incidents'),
        apiClient.get('/applications'),
      ]);
      const incList: Incident[] = incRes.data?.data ?? [];
      const appList: Application[] = appRes.data?.data ?? [];
      setIncidents(incList);
      setApplications(appList);
      setSelectedIncident((prev) =>
        prev ? incList.find((i) => i.id === prev.id) ?? incList[0] ?? null : incList[0] ?? null
      );
      setError(null);
    } catch {
      setError('Unable to load fault detection records from SHARP backend.');
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
      if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
      if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
      if (serviceFilter !== 'ALL' && String(inc.applicationId ?? '') !== serviceFilter) return false;

      if (dateFrom) {
        const opened = new Date(inc.openedAt).getTime();
        const from = new Date(dateFrom).getTime();
        if (opened < from) return false;
      }
      if (dateTo) {
        const opened = new Date(inc.openedAt).getTime();
        const to = new Date(dateTo).getTime() + 86400000 - 1;
        if (opened > to) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${inc.id} ${inc.title} ${inc.description} ${inc.applicationName ?? ''} ${inc.detectedByAgent}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [incidents, severityFilter, statusFilter, serviceFilter, dateFrom, dateTo, searchQuery]);

  const activeCount = incidents.filter((i) => i.status !== 'RESOLVED').length;
  const criticalCount = incidents.filter((i) => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length;
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED').length;

  const resetFilters = () => {
    setSearchQuery('');
    setSeverityFilter('ALL');
    setStatusFilter('ALL');
    setServiceFilter('ALL');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fault Detection"
        subtitle="Real-time anomaly triage, fault classification, and incident inspection across monitored services."
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Detected Faults"
          value={incidents.length}
          subtitle="All recorded incidents"
          icon={Radar}
          color="text-[#A78BFA]"
        />
        <StatCard
          title="Active Incidents"
          value={activeCount}
          subtitle="Open, diagnosing, or recovering"
          icon={AlertTriangle}
          trend={activeCount > 0 ? 'Attention' : 'Clear'}
          trendType={activeCount > 0 ? 'negative' : 'positive'}
          color={activeCount > 0 ? 'text-amber-400' : 'text-emerald-400'}
        />
        <StatCard
          title="Critical Severity"
          value={criticalCount}
          subtitle="Unresolved critical faults"
          icon={ShieldAlert}
          trendType={criticalCount > 0 ? 'negative' : 'positive'}
          color={criticalCount > 0 ? 'text-rose-400' : 'text-emerald-400'}
        />
        <StatCard
          title="Resolved Faults"
          value={resolvedCount}
          subtitle="Verified or manually closed"
          icon={CheckCircle2}
          color="text-emerald-400"
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#A78BFA]" />
            Fault Filters
          </span>
          <button
            onClick={resetFilters}
            className="text-xs font-mono text-slate-400 hover:text-[#A78BFA] transition"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, title, service, agent..."
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#7C3AED] font-mono"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            aria-label="Filter by severity"
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
            aria-label="Filter by status"
            className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED]"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="DIAGNOSING">DIAGNOSING</option>
            <option value="RECOVERING">RECOVERING</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="FAILED">FAILED</option>
          </select>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            aria-label="Filter by service"
            className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED]"
          >
            <option value="ALL">All Services</option>
            {applications.map((app) => (
              <option key={app.id} value={String(app.id)}>
                {app.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="From date"
              className="w-1/2 px-2 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[11px] text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED]"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="To date"
              className="w-1/2 px-2 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[11px] text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED]"
            />
          </div>
        </div>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 bg-dark-850 border-b border-dark-700 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-semibold uppercase">Detected Faults</span>
            <span className="text-slate-500">
              Showing {filteredIncidents.length} of {incidents.length}
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs font-mono">
              <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#7C3AED]" />
              Loading detected faults...
            </div>
          ) : filteredIncidents.length === 0 ? (
            <EmptyState
              icon={<Radar className="w-8 h-8" />}
              title="No matching faults found"
              description="Adjust your severity, service, or date filters to inspect other incident records."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-850/60 border-b border-dark-800 text-slate-400 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Fault & Category</th>
                    <th className="py-3 px-4">Affected Service</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800 font-mono text-[11px]">
                  {filteredIncidents.map((inc) => {
                    const isSelected = selectedIncident?.id === inc.id;
                    const category = inferFaultCategory(inc);
                    return (
                      <tr
                        key={inc.id}
                        onClick={() => setSelectedIncident(inc)}
                        className={`cursor-pointer transition hover:bg-dark-850/70 ${
                          isSelected ? 'bg-dark-850 border-l-2 border-[#7C3AED]' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-slate-400">#{inc.id}</td>
                        <td className="py-3 px-4">
                          <div className="font-sans font-medium text-slate-200 text-xs">{inc.title}</div>
                          <div className="text-[10px] text-cyan-400 mt-0.5">{category}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {inc.applicationName || inc.serverHostName || 'Host System'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              inc.severity === 'CRITICAL'
                                ? 'bg-rose-950/70 text-rose-400 border-rose-800/60'
                                : inc.severity === 'HIGH'
                                ? 'bg-amber-950/70 text-amber-400 border-amber-800/60'
                                : inc.severity === 'MEDIUM'
                                ? 'bg-[#7C3AED]/15 text-[#A78BFA] border-[#7C3AED]/35'
                                : 'bg-dark-800 text-slate-300 border-dark-700'
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">N/A (Phase 2)</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={inc.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed Incident View */}
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dark-800">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Incident Inspection
            </h2>
            {selectedIncident && <StatusBadge status={selectedIncident.status} />}
          </div>

          {selectedIncident ? (
            <div className="space-y-4 text-xs">
              <div>
                <div className="text-[11px] font-mono text-slate-500">
                  INCIDENT #{selectedIncident.id} · {inferFaultCategory(selectedIncident)}
                </div>
                <h3 className="text-base font-bold text-slate-100 mt-1">{selectedIncident.title}</h3>
                <p className="text-slate-400 mt-1 leading-relaxed">{selectedIncident.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-dark-850 border border-dark-700/80 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block">Affected Service</span>
                  <span className="text-slate-200">
                    {selectedIncident.applicationName || selectedIncident.serverHostName || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Detected By</span>
                  <span className="text-cyan-400">{selectedIncident.detectedByAgent}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Opened At</span>
                  <span className="text-slate-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(selectedIncident.openedAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Detection Confidence</span>
                  <span className="text-amber-400">Awaiting Phase 2 ML</span>
                </div>
              </div>

              {selectedIncident.evidence && (
                <div>
                  <span className="text-[11px] font-mono text-slate-500 uppercase block mb-1">
                    Collected Evidence
                  </span>
                  <pre className="p-2.5 rounded-lg bg-dark-950 border border-dark-800 text-[11px] font-mono text-slate-400 overflow-x-auto whitespace-pre-wrap">
                    {selectedIncident.evidence}
                  </pre>
                </div>
              )}

              <button
                onClick={() => navigate(`/diagnosis?incidentId=${selectedIncident.id}`)}
                className="w-full py-2 px-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium flex items-center justify-center gap-2 transition"
              >
                <Stethoscope className="w-4 h-4" />
                Open in Root Cause Analysis
              </button>
            </div>
          ) : (
            <EmptyState
              icon={<Radar className="w-8 h-8" />}
              title="No Incident Selected"
              description="Select a detected fault from the table to inspect timestamps, evidence, and service impact."
            />
          )}
        </div>
      </div>
    </div>
  );
};
