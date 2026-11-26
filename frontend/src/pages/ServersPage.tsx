import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Container,
  Cpu,
  Edit3,
  Eye,
  HardDrive,
  Layers,
  Network,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import apiClient from '../api/client';
import { serversApi, ServerPayload } from '../api/servers';
import { useAuth } from '../contexts/AuthContext';
import { Incident, MonitoredServer } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorBanner } from '../components/ui/Banners';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { MetricBar } from '../components/ui/MetricBar';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast } from '../components/ui/Toast';

const EMPTY_FORM: ServerPayload = {
  hostName: '',
  ipAddress: '',
  osType: 'Ubuntu 22.04 LTS',
  agentVersion: '1.0.0',
  status: 'ONLINE',
};

type SortKey = 'HOST' | 'CPU' | 'MEMORY' | 'DISK' | 'STATUS' | 'HEARTBEAT';

function getHealthReasons(server: MonitoredServer): string[] {
  const reasons: string[] = [];
  if (server.status === 'OFFLINE') reasons.push('Node heartbeat is offline or unreachable.');
  if (server.status === 'DEGRADED') reasons.push('Node is reporting a degraded operational state.');
  if ((server.cpuUsage ?? 0) >= 85) reasons.push(`High CPU utilization (${server.cpuUsage}%).`);
  if ((server.memoryUsage ?? 0) >= 85) reasons.push(`High Memory utilization (${server.memoryUsage}%).`);
  if ((server.diskUsage ?? 0) >= 90) reasons.push(`Critical Disk utilization (${server.diskUsage}%).`);
  return reasons;
}

export const ServersPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [servers, setServers] = useState<MonitoredServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'DEGRADED' | 'OFFLINE'>('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('HOST');

  // Operational & telemetry context (real backend endpoints)
  const [collectorStatus, setCollectorStatus] = useState<any>(null);
  const [latestTelemetry, setLatestTelemetry] = useState<any>(null);
  const [processes, setProcesses] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [recoveries, setRecoveries] = useState<any[]>([]);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingServer, setEditingServer] = useState<MonitoredServer | null>(null);
  const [formData, setFormData] = useState<ServerPayload>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [detailServer, setDetailServer] = useState<MonitoredServer | null>(null);
  const [deletingServer, setDeletingServer] = useState<MonitoredServer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchServers = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await serversApi.list();
      setServers(data);
      setDetailServer((prev) => (prev ? data.find((s) => s.id === prev.id) ?? prev : null));
      setError(null);

      // Load supporting real operational context without blocking the server list
      const [colRes, telRes, procRes, ctrRes, appRes, incRes, anomRes, recRes] =
        await Promise.allSettled([
          apiClient.get('/monitoring/collector/status'),
          apiClient.get('/monitoring/system/latest'),
          apiClient.get('/monitoring/processes', { params: { limit: 8 } }),
          apiClient.get('/monitoring/docker/containers'),
          apiClient.get('/applications'),
          apiClient.get('/incidents'),
          apiClient.get('/anomalies'),
          apiClient.get('/recovery/executions'),
        ]);

      if (colRes.status === 'fulfilled') setCollectorStatus(colRes.value.data?.data ?? null);
      if (telRes.status === 'fulfilled') setLatestTelemetry(telRes.value.data?.data ?? null);
      if (procRes.status === 'fulfilled') {
        const d = procRes.value.data?.data;
        setProcesses(Array.isArray(d) ? d : d?.processes ?? []);
      }
      if (ctrRes.status === 'fulfilled') {
        const d = ctrRes.value.data?.data;
        setContainers(Array.isArray(d) ? d : d?.containers ?? []);
      }
      if (appRes.status === 'fulfilled') setApplications(appRes.value.data?.data ?? []);
      if (incRes.status === 'fulfilled') setIncidents(incRes.value.data?.data ?? []);
      if (anomRes.status === 'fulfilled') setAnomalies(anomRes.value.data?.data ?? []);
      if (recRes.status === 'fulfilled') setRecoveries(recRes.value.data?.data ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load monitored servers from SHARP backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detailServer) setDetailServer(null);
        else if (showFormModal && !submitting) setShowFormModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDownForModal(onKeyDown));
    return () => window.removeEventListener('keydown', handleKeyDownForModal(onKeyDown));
  }, [detailServer, showFormModal, submitting]);

  const filteredServers = useMemo(() => {
    const list = servers.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${s.id} ${s.hostName} ${s.ipAddress} ${s.osType} ${s.agentVersion}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'CPU') return (b.cpuUsage ?? 0) - (a.cpuUsage ?? 0);
      if (sortBy === 'MEMORY') return (b.memoryUsage ?? 0) - (a.memoryUsage ?? 0);
      if (sortBy === 'DISK') return (b.diskUsage ?? 0) - (a.diskUsage ?? 0);
      if (sortBy === 'STATUS') return (a.status || '').localeCompare(b.status || '');
      if (sortBy === 'HEARTBEAT') {
        const ta = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const tb = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        return tb - ta;
      }
      return (a.hostName || '').localeCompare(b.hostName || '');
    });
  }, [servers, search, statusFilter, sortBy]);

  const openCreateModal = () => {
    setEditingServer(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setShowFormModal(true);
  };

  const openEditModal = (server: MonitoredServer) => {
    setEditingServer(server);
    setFormData({
      hostName: server.hostName,
      ipAddress: server.ipAddress,
      osType: server.osType || 'Ubuntu 22.04 LTS',
      agentVersion: server.agentVersion || '1.0.0',
      status: server.status || 'ONLINE',
    });
    setFormError(null);
    setShowFormModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFeedback(null);

    if (!formData.hostName.trim() || !formData.ipAddress.trim()) {
      setFormError('Host Name and IP Address are required.');
      return;
    }

    const payload: ServerPayload = {
      hostName: formData.hostName.trim(),
      ipAddress: formData.ipAddress.trim(),
      osType: formData.osType.trim() || 'Ubuntu 22.04 LTS',
      agentVersion: formData.agentVersion.trim() || '1.0.0',
      ...(editingServer ? { status: formData.status } : {}),
    };

    try {
      setSubmitting(true);
      if (editingServer) {
        await serversApi.update(editingServer.id, payload);
        setFeedback(`Host node "${payload.hostName}" updated successfully.`);
      } else {
        await serversApi.create(payload);
        setFeedback(`Host node "${payload.hostName}" registered successfully.`);
      }
      setShowFormModal(false);
      await fetchServers();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Error saving server configuration.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingServer) return;
    try {
      setDeleting(true);
      setError(null);
      setFeedback(null);
      await serversApi.remove(deletingServer.id);
      setFeedback(`Host node "${deletingServer.hostName}" removed from registry.`);
      setDeletingServer(null);
      await fetchServers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete server. Administrator role required.');
      setDeletingServer(null);
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = search.trim() !== '' || statusFilter !== 'ALL';
  const onlineCount = servers.filter((s) => s.status === 'ONLINE').length;
  const degradedCount = servers.filter((s) => s.status === 'DEGRADED').length;
  const offlineCount = servers.filter((s) => s.status === 'OFFLINE').length;

  const detailHealthReasons = detailServer ? getHealthReasons(detailServer) : [];
  const detailActiveIncidents = useMemo(() => {
    if (!detailServer) return [];
    return incidents.filter((inc) => !['RESOLVED', 'CLOSED'].includes(inc.status));
  }, [detailServer, incidents]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Infrastructure Registry"
        subtitle="Monitored host nodes, live telemetry state, health diagnostics, and connected infrastructure resources."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchServers}
              disabled={isRefreshing}
              className="sharp-btn-secondary"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#B0D4B8]' : ''}`} />
              <span>Refresh</span>
            </button>
            <button type="button" onClick={openCreateModal} className="sharp-btn-primary">
              <Plus className="w-4 h-4" />
              <span>Register Host Node</span>
            </button>
          </div>
        }
      />

      {error && <ErrorBanner message={error} onRetry={fetchServers} />}
      {feedback && <Toast variant="success" message={feedback} onDismiss={() => setFeedback(null)} />}

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="sharp-card p-3.5">
          <div className="sharp-label">Total Nodes</div>
          <div className="mt-1 text-xl font-semibold text-[var(--text-main)]">{servers.length}</div>
        </div>
        <div className="sharp-card p-3.5">
          <div className="sharp-label">Online</div>
          <div className="mt-1 text-xl font-semibold text-[#B0D4B8]">{onlineCount}</div>
        </div>
        <div className="sharp-card p-3.5">
          <div className="sharp-label">Degraded</div>
          <div className="mt-1 text-xl font-semibold text-[#EAE7D6]">{degradedCount}</div>
        </div>
        <div className="sharp-card p-3.5">
          <div className="sharp-label">Collector State</div>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={collectorStatus?.status || (offlineCount > 0 ? 'DEGRADED' : 'HEALTHY')} />
          </div>
        </div>
      </div>

      {/* Search, Filter & Sort Bar */}
      <div className="sharp-card p-4 flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search host name, IP, OS..."
            aria-label="Search servers"
            className="sharp-input w-full pl-8 pr-3 py-2"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ONLINE' | 'DEGRADED' | 'OFFLINE')}
          aria-label="Filter servers by status"
          className="sharp-input px-3 py-2"
        >
          <option value="ALL">All Statuses</option>
          <option value="ONLINE">ONLINE</option>
          <option value="DEGRADED">DEGRADED</option>
          <option value="OFFLINE">OFFLINE</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          aria-label="Sort servers"
          className="sharp-input px-3 py-2"
        >
          <option value="HOST">Sort: Hostname</option>
          <option value="CPU">Sort: Highest CPU</option>
          <option value="MEMORY">Sort: Highest Memory</option>
          <option value="DISK">Sort: Highest Disk</option>
          <option value="STATUS">Sort: Status</option>
          <option value="HEARTBEAT">Sort: Last Heartbeat</option>
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
            }}
            className="sharp-btn-outline"
          >
            Reset
          </button>
        )}
        <span className="text-[var(--text-muted)] ml-auto">
          Showing {filteredServers.length} of {servers.length}
        </span>
      </div>

      {/* Servers Grid */}
      {loading ? (
        <div className="sharp-card text-center py-12 text-[var(--text-muted)] text-xs">
          <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#A4C3A2]" />
          Discovering registered infrastructure nodes...
        </div>
      ) : filteredServers.length === 0 ? (
        <div className="sharp-card">
          <EmptyState
            icon={<Server className="w-6 h-6" />}
            title={hasFilters ? 'No matching host nodes' : 'No servers registered yet'}
            description={
              hasFilters
                ? 'No monitored servers match your search query or status filter.'
                : 'Register a host node to track infrastructure availability and agent telemetry.'
            }
            action={
              hasFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                  }}
                  className="sharp-btn-secondary"
                >
                  Clear Filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServers.map((server) => {
            const reasons = getHealthReasons(server);
            return (
              <div
                key={server.id}
                className="sharp-card sharp-card-interactive p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[#A4C3A2] shrink-0">
                        <Server className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[var(--text-main)] truncate">
                          {server.hostName}
                        </h3>
                        <p className="text-[11px] text-[var(--text-muted)]">{server.ipAddress}</p>
                      </div>
                    </div>
                    <StatusBadge status={server.status} />
                  </div>

                  {reasons.length > 0 && (
                    <div className="mb-3 px-2.5 py-2 rounded-lg bg-[#EAE7D6]/10 border border-[#EAE7D6]/35 text-[11px] text-[#EAE7D6] flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{reasons[0]}</span>
                    </div>
                  )}

                  <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)] text-xs">
                    <MetricBar label="CPU Load" value={server.cpuUsage ?? 0} />
                    <MetricBar label="Memory" value={server.memoryUsage ?? 0} color="bg-[#D7F9FA]" />
                    <MetricBar label="Disk" value={server.diskUsage ?? 0} color="bg-[#B0D4B8]" />
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span className="truncate">OS: {server.osType}</span>
                    <span className="shrink-0">Agent: v{server.agentVersion}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>
                      Heartbeat:{' '}
                      {server.lastSeen ? new Date(server.lastSeen).toLocaleTimeString() : 'Not reported'}
                    </span>
                    {latestTelemetry?.networkRxBytesPerSec != null && (
                      <span className="inline-flex items-center gap-1 text-[#D7F9FA]">
                        <Network className="w-3 h-3" />
                        {(Number(latestTelemetry.networkRxBytesPerSec) / 1024).toFixed(1)} KB/s
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailServer(server)}
                      className="sharp-btn-secondary"
                      title="View server details"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#D7F9FA]" />
                      <span>Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(server)}
                      className="sharp-btn-secondary"
                      title="Edit server configuration"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#A4C3A2]" />
                      <span>Edit</span>
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeletingServer(server)}
                        className="sharp-btn-danger !px-2.5 !py-1.5 text-[11px]"
                        title="Delete server"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showFormModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-xl p-6 max-w-md w-full shadow-[var(--shadow-elevated)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                <Server className="w-5 h-5 text-[#A4C3A2]" />
                {editingServer ? `Edit Host #${editingServer.id}` : 'Register Monitored Host'}
              </h2>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowFormModal(false)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)]"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-[#EAE7D6]/10 border border-[#EAE7D6]/40 text-[#EAE7D6] text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label htmlFor="server-host-name" className="block text-[var(--text-secondary)] font-medium mb-1">
                  Host Name *
                </label>
                <input
                  id="server-host-name"
                  type="text"
                  required
                  value={formData.hostName}
                  onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                  className="sharp-input w-full px-3 py-2"
                  placeholder="e.g. prod-node-03.infra.sharp"
                />
              </div>

              <div>
                <label htmlFor="server-ip" className="block text-[var(--text-secondary)] font-medium mb-1">
                  IP Address *
                </label>
                <input
                  id="server-ip"
                  type="text"
                  required
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  className="sharp-input w-full px-3 py-2"
                  placeholder="e.g. 192.168.1.10"
                />
              </div>

              <div>
                <label htmlFor="server-os" className="block text-[var(--text-secondary)] font-medium mb-1">
                  Operating System
                </label>
                <input
                  id="server-os"
                  type="text"
                  value={formData.osType}
                  onChange={(e) => setFormData({ ...formData, osType: e.target.value })}
                  className="sharp-input w-full px-3 py-2"
                />
              </div>

              <div>
                <label htmlFor="server-agent-ver" className="block text-[var(--text-secondary)] font-medium mb-1">
                  Monitoring Agent Version
                </label>
                <input
                  id="server-agent-ver"
                  type="text"
                  value={formData.agentVersion}
                  onChange={(e) => setFormData({ ...formData, agentVersion: e.target.value })}
                  className="sharp-input w-full px-3 py-2"
                />
              </div>

              {editingServer && (
                <div>
                  <label htmlFor="server-status" className="block text-[var(--text-secondary)] font-medium mb-1">
                    Node Status
                  </label>
                  <select
                    id="server-status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as 'ONLINE' | 'DEGRADED' | 'OFFLINE',
                      })
                    }
                    className="sharp-input w-full px-3 py-2"
                  >
                    <option value="ONLINE">ONLINE</option>
                    <option value="DEGRADED">DEGRADED</option>
                    <option value="OFFLINE">OFFLINE</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowFormModal(false)}
                  className="sharp-btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="sharp-btn-primary">
                  {submitting
                    ? editingServer
                      ? 'Saving...'
                      : 'Registering...'
                    : editingServer
                    ? 'Save Changes'
                    : 'Register Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Infrastructure Detail Modal */}
      {detailServer && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-label={`Server details for ${detailServer.hostName}`}
          onClick={() => setDetailServer(null)}
        >
          <div
            className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-xl p-6 max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-[var(--shadow-elevated)] space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <Server className="w-5 h-5 text-[#D7F9FA]" />
                <div>
                  <h2 className="text-base font-bold text-[var(--text-main)]">{detailServer.hostName}</h2>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Server #{detailServer.id} · {detailServer.ipAddress} · {detailServer.osType}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={detailServer.status} />
                <button
                  type="button"
                  onClick={() => setDetailServer(null)}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  aria-label="Close server details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Health Summary */}
            <div
              className={`p-3 rounded-lg border text-xs ${
                detailHealthReasons.length > 0
                  ? 'bg-[#EAE7D6]/12 border-[#EAE7D6]/45 text-[#EAE7D6]'
                  : 'bg-[#B0D4B8]/12 border-[#B0D4B8]/35 text-[#B0D4B8]'
              }`}
            >
              <div className="font-semibold mb-1">
                {detailHealthReasons.length > 0 ? 'Health Degradation Factors' : 'Node Health Summary: Healthy'}
              </div>
              {detailHealthReasons.length > 0 ? (
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {detailHealthReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px]">
                  Host metrics and daemon heartbeat are within normal operating thresholds.
                </p>
              )}
            </div>

            {/* Overview & Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2 text-xs">
                <div className="sharp-label">Overview & Collector</div>
                <dl className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-[10px] text-[var(--text-muted)]">Agent Version</dt>
                    <dd className="text-[var(--text-main)] font-medium">v{detailServer.agentVersion}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-[var(--text-muted)]">Collector</dt>
                    <dd className="text-[var(--text-main)] font-medium">{collectorStatus?.status || 'ACTIVE'}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] text-[var(--text-muted)]">Last Heartbeat</dt>
                    <dd className="text-[var(--text-secondary)]">
                      {detailServer.lastSeen ? new Date(detailServer.lastSeen).toLocaleString() : '—'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="p-3.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2.5 text-xs">
                <div className="sharp-label">Resource Metrics</div>
                <MetricBar label="CPU Load" value={detailServer.cpuUsage ?? 0} />
                <MetricBar label="Memory" value={detailServer.memoryUsage ?? 0} color="bg-[#D7F9FA]" />
                <MetricBar label="Disk" value={detailServer.diskUsage ?? 0} color="bg-[#B0D4B8]" />
              </div>
            </div>

            {/* Infrastructure & Operational Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setDetailServer(null);
                  navigate('/monitoring/processes');
                }}
                className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[#A4C3A2]/50 text-left transition-colors"
              >
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <Cpu className="w-3.5 h-3.5 text-[#A4C3A2]" />
                  <ArrowRight className="w-3 h-3" />
                </div>
                <div className="mt-1.5 font-semibold text-[var(--text-main)]">{processes.length} Processes</div>
                <div className="text-[10px] text-[var(--text-muted)]">View Processes</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDetailServer(null);
                  navigate('/monitoring/docker');
                }}
                className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[#A4C3A2]/50 text-left transition-colors"
              >
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <Container className="w-3.5 h-3.5 text-[#D7F9FA]" />
                  <ArrowRight className="w-3 h-3" />
                </div>
                <div className="mt-1.5 font-semibold text-[var(--text-main)]">{containers.length} Containers</div>
                <div className="text-[10px] text-[var(--text-muted)]">View Docker</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDetailServer(null);
                  navigate('/applications');
                }}
                className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[#A4C3A2]/50 text-left transition-colors"
              >
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <Layers className="w-3.5 h-3.5 text-[#B0D4B8]" />
                  <ArrowRight className="w-3 h-3" />
                </div>
                <div className="mt-1.5 font-semibold text-[var(--text-main)]">{applications.length} Apps</div>
                <div className="text-[10px] text-[var(--text-muted)]">View Services</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDetailServer(null);
                  navigate('/incidents');
                }}
                className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[#A4C3A2]/50 text-left transition-colors"
              >
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <Activity className="w-3.5 h-3.5 text-[#EAE7D6]" />
                  <ArrowRight className="w-3 h-3" />
                </div>
                <div className="mt-1.5 font-semibold text-[var(--text-main)]">{detailActiveIncidents.length} Active</div>
                <div className="text-[10px] text-[var(--text-muted)]">Incidents</div>
              </button>
            </div>

            {/* Operational Links */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--border-subtle)] text-xs">
              <div className="text-[var(--text-muted)]">
                Anomalies: <strong className="text-[var(--text-main)]">{anomalies.length}</strong> · Recovery
                Executions: <strong className="text-[var(--text-main)]">{recoveries.length}</strong>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDetailServer(null);
                    navigate('/monitoring/system');
                  }}
                  className="sharp-btn-secondary"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>System Monitoring</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDetailServer(null);
                    navigate('/recovery');
                  }}
                  className="sharp-btn-primary"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Recovery Console</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deletingServer !== null}
        title="Delete Monitored Host"
        description={`Are you sure you want to remove "${deletingServer?.hostName}" (${deletingServer?.ipAddress}) from the infrastructure registry? Existing incidents will be preserved without a host link.`}
        confirmLabel="Delete Host"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!deleting) setDeletingServer(null);
        }}
      />
    </div>
  );
};

function handleKeyDownForModal(fn: (e: KeyboardEvent) => void) {
  return fn;
}
