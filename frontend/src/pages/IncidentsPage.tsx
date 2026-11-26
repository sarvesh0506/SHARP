import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';
import { Incident, RecoveryAction } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorBanner } from '../components/ui/Banners';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { Toast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import { useLiveEvents } from '../contexts/LiveEventsContext';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  FilterX,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
  Stethoscope,
  XCircle,
} from 'lucide-react';

interface AnomalyItem {
  id: number;
  incidentId?: number;
  metricName: string;
  observedValue: number;
  baselineValue?: number;
  detectionMethod: string;
  detectedAt?: string;
}

interface ServerItem {
  id: number;
  name?: string;
  hostname?: string;
  ipAddress?: string;
}

interface RcaSummary {
  id: number;
  incidentId: number;
  rootCause?: string;
  confidenceScore?: number;
  recommendedActionType?: string;
  analysisMode?: string;
  createdAt?: string;
}

interface RecoveryExecutionItem {
  id: number;
  incidentId: number;
  actionType?: string;
  status?: string;
  verificationStatus?: string;
  verificationMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
}

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const PAGE_SIZE = 8;

function formatDuration(startIso?: string, endIso?: string): string {
  if (!startIso) return '—';
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end)) return '—';
  const diffSec = Math.max(0, Math.floor((end - start) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ${diffSec % 60}s`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ${min % 60}m`;
  const days = Math.floor(hr / 24);
  return `${days}d ${hr % 24}h`;
}

export const IncidentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const { subscribe } = useLiveEvents();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [recoveryActions, setRecoveryActions] = useState<RecoveryAction[]>([]);
  const [recoveryExecutions, setRecoveryExecutions] = useState<RecoveryExecutionItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [rcaRecords, setRcaRecords] = useState<RcaSummary[]>([]);
  const [rcaLoading, setRcaLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [serverFilter, setServerFilter] = useState('ALL');
  const [timeRange, setTimeRange] = useState<'ALL' | '24H' | '7D' | '30D'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'SEVERITY' | 'STATUS'>('NEWEST');
  const [page, setPage] = useState(0);

  const [rejectingActionId, setRejectingActionId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [resolvingIncidentId, setResolvingIncidentId] = useState<number | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [incRes, recRes, execRes, anomRes, srvRes] = await Promise.allSettled([
        apiClient.get('/incidents'),
        apiClient.get('/recovery'),
        apiClient.get('/recovery/executions'),
        apiClient.get('/anomalies'),
        apiClient.get('/servers'),
      ]);

      if (incRes.status === 'rejected') {
        throw incRes.reason;
      }

      const incList: Incident[] = incRes.value.data?.data ?? [];
      setIncidents(incList);
      if (recRes.status === 'fulfilled') setRecoveryActions(recRes.value.data?.data ?? []);
      if (execRes.status === 'fulfilled') setRecoveryExecutions(execRes.value.data?.data ?? []);
      if (anomRes.status === 'fulfilled') setAnomalies(anomRes.value.data?.data ?? []);
      if (srvRes.status === 'fulfilled') setServers(srvRes.value.data?.data ?? []);

      const paramId = Number(searchParams.get('incidentId'));
      setSelectedIncident((prev) => {
        if (paramId && incList.some((i) => i.id === paramId)) {
          return incList.find((i) => i.id === paramId) ?? null;
        }
        if (prev) {
          return incList.find((i) => i.id === prev.id) ?? incList[0] ?? null;
        }
        return incList[0] ?? null;
      });
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load incidents from SHARP backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    return subscribe((ev) => {
      if (ev.type.startsWith('INCIDENT_') || ev.type.startsWith('RECOVERY_')) {
        fetchData();
      }
    });
  }, [subscribe, fetchData]);

  // Fetch RCA diagnosis details whenever selectedIncident changes
  useEffect(() => {
    if (!selectedIncident) {
      setRcaRecords([]);
      return;
    }
    let cancelled = false;
    setRcaLoading(true);
    apiClient
      .get(`/rca/incident/${selectedIncident.id}`)
      .then((res) => {
        if (!cancelled) {
          const data = res.data?.data;
          setRcaRecords(Array.isArray(data) ? data : data ? [data] : []);
        }
      })
      .catch(() => {
        if (!cancelled) setRcaRecords([]);
      })
      .finally(() => {
        if (!cancelled) setRcaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedIncident]);

  const serverFilterOptions = useMemo(() => {
    const names = new Set<string>();
    incidents.forEach((inc) => {
      if (inc.affectedResource) names.add(inc.affectedResource);
    });
    servers.forEach((s) => {
      if (s.hostname) names.add(s.hostname);
    });
    return Array.from(names).sort();
  }, [incidents, servers]);

  const filteredIncidents = useMemo(() => {
    const now = Date.now();
    const maxAgeMs =
      timeRange === '24H'
        ? 24 * 3600 * 1000
        : timeRange === '7D'
        ? 7 * 24 * 3600 * 1000
        : timeRange === '30D'
        ? 30 * 24 * 3600 * 1000
        : null;

    const list = incidents.filter((inc) => {
      if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
      if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
      if (serverFilter !== 'ALL' && inc.affectedResource !== serverFilter) return false;
      if (maxAgeMs !== null) {
        const openedMs = new Date(inc.openedAt).getTime();
        if (!Number.isNaN(openedMs) && now - openedMs > maxAgeMs) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${inc.id} ${inc.title} ${inc.description} ${inc.affectedResource ?? ''} ${inc.detectedByAgent} ${inc.rootCause ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'OLDEST') {
        return new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime();
      }
      if (sortBy === 'SEVERITY') {
        const diff = (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0);
        if (diff !== 0) return diff;
        return new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime();
      }
      if (sortBy === 'STATUS') {
        return a.status.localeCompare(b.status);
      }
      return new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime();
    });
  }, [incidents, statusFilter, severityFilter, serverFilter, timeRange, search, sortBy]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, severityFilter, serverFilter, timeRange, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / PAGE_SIZE));
  const pagedIncidents = useMemo(
    () => filteredIncidents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredIncidents, page]
  );

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'ALL' ||
    severityFilter !== 'ALL' ||
    serverFilter !== 'ALL' ||
    timeRange !== 'ALL';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setSeverityFilter('ALL');
    setServerFilter('ALL');
    setTimeRange('ALL');
    setSortBy('NEWEST');
    setPage(0);
  };

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

  // Investigation context for the selected incident
  const linkedAnomalies = useMemo(() => {
    if (!selectedIncident) return [];
    return anomalies.filter((a) => a.incidentId === selectedIncident.id);
  }, [anomalies, selectedIncident]);

  const linkedAction = useMemo(() => {
    if (!selectedIncident) return undefined;
    return recoveryActions.find((a) => a.incidentId === selectedIncident.id);
  }, [recoveryActions, selectedIncident]);

  const linkedExecutions = useMemo(() => {
    if (!selectedIncident) return [];
    return recoveryExecutions.filter((e) => e.incidentId === selectedIncident.id);
  }, [recoveryExecutions, selectedIncident]);

  const matchedServer = useMemo(() => {
    if (!selectedIncident?.affectedResource) return undefined;
    return servers.find(
      (s) =>
        s.hostname === selectedIncident.affectedResource ||
        s.name === selectedIncident.affectedResource ||
        s.ipAddress === selectedIncident.affectedResource
    );
  }, [servers, selectedIncident]);

  // Chronological timeline built strictly from available timestamps
  const timelineEvents = useMemo(() => {
    if (!selectedIncident) return [];
    const events: { id: string; time: string; label: string; detail: string; category: 'DETECT' | 'RCA' | 'RECOVERY' | 'RESOLVE' }[] = [];

    events.push({
      id: `inc-open-${selectedIncident.id}`,
      time: selectedIncident.openedAt,
      label: 'Incident Detected',
      detail: `${selectedIncident.severity} severity · Source: ${selectedIncident.source || 'MONITORING'}`,
      category: 'DETECT',
    });

    linkedAnomalies.forEach((a) => {
      if (a.detectedAt) {
        events.push({
          id: `anom-${a.id}`,
          time: a.detectedAt,
          label: `Anomaly: ${a.metricName}`,
          detail: `Observed ${a.observedValue} vs baseline ${a.baselineValue ?? 'N/A'} (${a.detectionMethod})`,
          category: 'DETECT',
        });
      }
    });

    rcaRecords.forEach((r) => {
      if (r.createdAt) {
        events.push({
          id: `rca-${r.id}`,
          time: r.createdAt,
          label: `Root Cause Diagnosis (${r.analysisMode || 'RCA'})`,
          detail: r.rootCause || selectedIncident.rootCause || 'Diagnosis completed',
          category: 'RCA',
        });
      }
    });

    const actionTs = (linkedAction as any)?.createdAt || (linkedAction as any)?.executedAt;
    if (linkedAction && actionTs) {
      events.push({
        id: `rec-act-${linkedAction.id}`,
        time: actionTs,
        label: `Recovery Action: ${linkedAction.actionType}`,
        detail: `Status: ${linkedAction.status} · Verification: ${linkedAction.verificationStatus}`,
        category: 'RECOVERY',
      });
    }

    linkedExecutions.forEach((ex) => {
      const ts = ex.completedAt || ex.startedAt || ex.createdAt;
      if (ts) {
        events.push({
          id: `exec-${ex.id}`,
          time: ts,
          label: `Recovery Execution #${ex.id}: ${ex.actionType || 'ACTION'}`,
          detail: `${ex.status || 'EXECUTED'} · Verification: ${ex.verificationStatus || 'PENDING'}`,
          category: 'RECOVERY',
        });
      }
    });

    if (selectedIncident.resolvedAt) {
      events.push({
        id: `inc-res-${selectedIncident.id}`,
        time: selectedIncident.resolvedAt,
        label: 'Incident Resolved',
        detail: (selectedIncident as any).resolutionNotes || 'Marked resolved',
        category: 'RESOLVE',
      });
    }

    return events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [selectedIncident, linkedAnomalies, rcaRecords, linkedAction, linkedExecutions]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incident Management"
        subtitle="Unified incident investigation ledger connecting anomalies, root cause diagnosis, recovery execution, and verification."
        actions={
          <button
            type="button"
            onClick={fetchData}
            disabled={isRefreshing}
            className="sharp-btn-secondary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#B0D4B8]' : ''}`} />
            <span>Refresh Incidents</span>
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={fetchData} />}
      {feedback && <Toast variant="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      {/* Search, Filters & Sorting */}
      <div className="sharp-card p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search incident ID, title, resource, root cause..."
              className="sharp-input w-full pl-8 pr-3 py-2"
            />
          </div>
          <select
            aria-label="Filter by severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="sharp-input px-3 py-2"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="sharp-input px-3 py-2"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="RECOVERY_PENDING">RECOVERY_PENDING</option>
            <option value="RECOVERING">RECOVERING</option>
            <option value="VERIFYING">VERIFYING</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="REOPENED">REOPENED</option>
            <option value="FAILED">FAILED</option>
          </select>
          <select
            aria-label="Filter by server"
            value={serverFilter}
            onChange={(e) => setServerFilter(e.target.value)}
            className="sharp-input px-3 py-2"
          >
            <option value="ALL">All Servers / Resources</option>
            {serverFilterOptions.map((srv) => (
              <option key={srv} value={srv}>
                {srv}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by time range"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="sharp-input px-3 py-2"
          >
            <option value="ALL">All Time</option>
            <option value="24H">Last 24 Hours</option>
            <option value="7D">Last 7 Days</option>
            <option value="30D">Last 30 Days</option>
          </select>
          <select
            aria-label="Sort incidents"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="sharp-input px-3 py-2"
          >
            <option value="NEWEST">Sort: Newest</option>
            <option value="OLDEST">Sort: Oldest</option>
            <option value="SEVERITY">Sort: Severity</option>
            <option value="STATUS">Sort: Status</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Showing <strong className="text-[var(--text-main)]">{filteredIncidents.length}</strong> of{' '}
              <strong className="text-[var(--text-main)]">{incidents.length}</strong> incidents
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[#A4C3A2]/50 text-[11px] text-[#EAE7D6] transition-colors"
              >
                <FilterX className="w-3 h-3" />
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Incident List */}
        <div className="xl:col-span-7 sharp-card overflow-hidden flex flex-col">
          <div className="divide-y divide-[var(--border-subtle)] flex-1">
            {loading ? (
              <div className="p-10 text-center text-[var(--text-muted)] text-xs">
                <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#A4C3A2]" />
                Loading incident ledger...
              </div>
            ) : pagedIncidents.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle className="w-5 h-5" />}
                title="No matching incidents found"
                description={
                  hasActiveFilters
                    ? 'Try clearing or adjusting your active severity, status, server, or search filters.'
                    : 'No incidents have been recorded yet.'
                }
                action={
                  hasActiveFilters ? (
                    <button type="button" onClick={clearFilters} className="sharp-btn-secondary">
                      Clear Filters
                    </button>
                  ) : undefined
                }
              />
            ) : (
              pagedIncidents.map((incident) => {
                const action = recoveryActions.find((a) => a.incidentId === incident.id);
                const isSelected = selectedIncident?.id === incident.id;
                return (
                  <div
                    key={incident.id}
                    onClick={() => {
                      setSelectedIncident(incident);
                      setRejectingActionId(null);
                      setResolvingIncidentId(null);
                    }}
                    className={`p-4 hover:bg-[var(--bg-hover)] transition cursor-pointer ${
                      isSelected ? 'bg-[#5D7B6F]/18 border-l-2 border-[#A4C3A2]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                              incident.severity === 'CRITICAL'
                                ? 'bg-[#EAE7D6]/20 text-[#EAE7D6] border-[#EAE7D6]/70'
                                : incident.severity === 'HIGH'
                                ? 'bg-[#EAE7D6]/12 text-[#EAE7D6] border-dashed border-[#EAE7D6]/45'
                                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                            }`}
                          >
                            {incident.severity}
                          </span>
                          <span className="font-semibold text-[var(--text-main)] text-sm truncate">
                            #{incident.id} · {incident.title}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                          {incident.description}
                        </p>
                      </div>
                      <StatusBadge status={incident.status} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-[var(--text-muted)]">
                      <span>{incident.affectedResource || 'Platform Host'}</span>
                      <span>Source: {incident.source || 'MANUAL'}</span>
                      <span>RCA: {incident.rcaStatus || 'PENDING'}</span>
                      <span>Duration: {formatDuration(incident.openedAt, incident.resolvedAt)}</span>
                      {action && (
                        <span className="ml-auto text-[#D7F9FA] font-medium">
                          Recovery: {action.actionType} ({action.status})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={filteredIncidents.length}
            onPageChange={setPage}
          />
        </div>

        {/* Investigation & Detail Panel */}
        <div className="xl:col-span-5 sharp-card p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <h2 className="sharp-section-title flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#D7F9FA]" />
              Incident Investigation & Lifecycle
            </h2>
            {selectedIncident && <StatusBadge status={selectedIncident.status} />}
          </div>

          {selectedIncident ? (
            <div className="space-y-5 text-xs">
              {/* Header Overview */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
                  <span>
                    Incident #{selectedIncident.id} · {selectedIncident.severity}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Duration: {formatDuration(selectedIncident.openedAt, selectedIncident.resolvedAt)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[var(--text-main)]">
                  {selectedIncident.title}
                </h3>
                <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {selectedIncident.description}
                </p>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">Affected Server</div>
                    <div className="mt-0.5 font-medium text-[var(--text-main)] flex items-center justify-between gap-1">
                      <span className="truncate">
                        {selectedIncident.affectedResource || matchedServer?.hostname || 'Host'}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate('/servers')}
                        className="text-[#D7F9FA] hover:underline text-[10px] shrink-0 inline-flex items-center gap-0.5"
                      >
                        <Server className="w-3 h-3" /> View
                      </button>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">Detected By</div>
                    <div className="mt-0.5 font-medium text-[var(--text-main)] truncate">
                      {selectedIncident.detectedByAgent || 'SHARP Engine'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">Opened At</div>
                    <div className="mt-0.5 text-[var(--text-secondary)]">
                      {new Date(selectedIncident.openedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">Last Updated</div>
                    <div className="mt-0.5 text-[var(--text-secondary)]">
                      {selectedIncident.resolvedAt
                        ? new Date(selectedIncident.resolvedAt).toLocaleString()
                        : new Date(selectedIncident.openedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lifecycle Actions */}
              <div className="flex flex-wrap gap-2">
                {selectedIncident.status === 'OPEN' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleIncidentTransition(selectedIncident.id, 'acknowledge')}
                    className="sharp-btn-primary"
                  >
                    Acknowledge
                  </button>
                )}
                {['OPEN', 'ACKNOWLEDGED', 'REOPENED'].includes(selectedIncident.status) && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleIncidentTransition(selectedIncident.id, 'investigate')}
                    className="sharp-btn-secondary"
                  >
                    Investigate
                  </button>
                )}
                {['RESOLVED', 'CLOSED'].includes(selectedIncident.status) && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleIncidentTransition(selectedIncident.id, 'reopen')}
                    className="px-2.5 py-1.5 rounded-md bg-[#EAE7D6] hover:bg-[#D4D2C4] text-[#0D1311] font-semibold"
                  >
                    Reopen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/diagnosis?incidentId=${selectedIncident.id}`)}
                  className="sharp-btn-outline"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-[#A4C3A2]" />
                  <span>Open RCA</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/recovery')}
                  className="sharp-btn-outline"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#B0D4B8]" />
                  <span>Recovery</span>
                </button>
              </div>

              {/* Connected Investigation Chain: Anomalies -> Diagnosis -> Recovery */}
              <div className="space-y-2.5">
                <h4 className="sharp-label">Connected Investigation Chain</h4>

                {/* Linked Anomalies */}
                <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#D7F9FA]" />
                      Linked Anomalies ({linkedAnomalies.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/detection')}
                      className="text-[11px] text-[#D7F9FA] hover:underline inline-flex items-center gap-0.5"
                    >
                      Detection <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  {linkedAnomalies.length === 0 ? (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      No anomalies directly linked to this incident.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {linkedAnomalies.slice(0, 3).map((a) => (
                        <div key={a.id} className="text-[11px] text-[var(--text-secondary)] flex justify-between gap-2">
                          <span className="truncate">{a.metricName} ({a.detectionMethod})</span>
                          <span className="text-[#EAE7D6] shrink-0">
                            {a.observedValue} / {a.baselineValue ?? '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Root Cause Diagnosis */}
                <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#D7F9FA] flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5" />
                      AI / Fallback Diagnosis
                    </span>
                    {rcaLoading && <RefreshCw className="w-3 h-3 animate-spin text-[var(--text-muted)]" />}
                  </div>
                  {selectedIncident.rootCause || rcaRecords[0]?.rootCause ? (
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {rcaRecords[0]?.rootCause || selectedIncident.rootCause}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      No diagnosis recorded yet. Open RCA to analyze this incident.
                    </p>
                  )}
                </div>
              </div>

              {/* Linked Recovery Action & Verification */}
              {linkedAction && (
                <div className="p-3.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-main)]">{linkedAction.actionType}</span>
                    <StatusBadge status={linkedAction.status} />
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Verification: <span className="text-[#B0D4B8] font-medium">{linkedAction.verificationStatus}</span>
                  </div>
                  {linkedAction.status === 'AWAITING_APPROVAL' && isAdmin && (
                    <div className="pt-2 space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleApprove(linkedAction.id)}
                          className="flex-1 py-1.5 px-3 rounded bg-[#B0D4B8] hover:bg-[#A4C3A2] text-[#0D1311] font-semibold flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => setRejectingActionId(linkedAction.id)}
                          className="flex-1 py-1.5 px-3 rounded bg-[#EAE7D6] hover:bg-[#D4D2C4] text-[#0D1311] font-semibold flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                      {rejectingActionId === linkedAction.id && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Rejection reason..."
                            className="sharp-input w-full px-3 py-1.5"
                          />
                          <button
                            type="button"
                            onClick={() => handleRejectSubmit(linkedAction.id)}
                            className="px-3 py-1 rounded bg-[#EAE7D6] hover:bg-[#D4D2C4] text-[#0D1311] font-semibold"
                          >
                            Confirm Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Chronological Incident Timeline */}
              <div className="space-y-2">
                <h4 className="sharp-label">Chronological Timeline ({timelineEvents.length})</h4>
                <div className="space-y-2 border-l border-[var(--border-strong)] pl-3 ml-1.5">
                  {timelineEvents.map((ev) => (
                    <div key={ev.id} className="relative">
                      <span
                        aria-hidden="true"
                        className={`absolute -left-[17px] top-1.5 w-2 h-2 rounded-full ${
                          ev.category === 'RESOLVE'
                            ? 'bg-[#B0D4B8]'
                            : ev.category === 'RCA'
                            ? 'bg-[#D7F9FA]'
                            : ev.category === 'RECOVERY'
                            ? 'bg-[#A4C3A2]'
                            : 'bg-[#EAE7D6]'
                        }`}
                      />
                      <div className="text-[11px] font-semibold text-[var(--text-main)]">{ev.label}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{ev.detail}</div>
                      <div className="text-[10px] text-[var(--text-muted)] opacity-80">
                        {new Date(ev.time).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resolution Details or Resolve Form */}
              {(selectedIncident as any).resolutionNotes && (
                <div className="p-3 rounded-lg bg-[#B0D4B8]/10 border border-[#B0D4B8]/30 space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-[#B0D4B8]">Resolution Notes</div>
                  <p className="text-[var(--text-secondary)]">{(selectedIncident as any).resolutionNotes}</p>
                </div>
              )}

              {!['RESOLVED', 'CLOSED'].includes(selectedIncident.status) && (
                <div className="space-y-2">
                  {resolvingIncidentId === selectedIncident.id ? (
                    <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
                      <input
                        type="text"
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Resolution notes..."
                        className="sharp-input w-full px-3 py-1.5"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setResolvingIncidentId(null)}
                          className="sharp-btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveSubmit(selectedIncident.id)}
                          className="sharp-btn-primary"
                        >
                          Confirm Resolve
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setResolvingIncidentId(selectedIncident.id)}
                      className="w-full sharp-btn-secondary justify-center"
                    >
                      Mark Incident as Resolved
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              title="Select an incident"
              description="Choose an incident from the ledger to inspect its timeline, anomalies, diagnosis, and recovery actions."
            />
          )}
        </div>
      </div>
    </div>
  );
};
