import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Cpu,
  Edit3,
  Eye,
  HardDrive,
  Plus,
  RefreshCw,
  Search,
  Server,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { serversApi, ServerPayload } from '../api/servers';
import { useAuth } from '../contexts/AuthContext';
import { MonitoredServer } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorBanner } from '../components/ui/Banners';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const EMPTY_FORM: ServerPayload = {
  hostName: '',
  ipAddress: '',
  osType: 'Ubuntu 22.04 LTS',
  agentVersion: '1.0.0',
  status: 'ONLINE',
};

export const ServersPage: React.FC = () => {
  const { isAdmin } = useAuth();

  const [servers, setServers] = useState<MonitoredServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'DEGRADED' | 'OFFLINE'>('ALL');

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
      setError(null);
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

  const filteredServers = useMemo(() => {
    return servers.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${s.id} ${s.hostName} ${s.ipAddress} ${s.osType} ${s.agentVersion}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [servers, search, statusFilter]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-dark-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-mono">
            Infrastructure Registry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered nodes, bare-metal / VM instances, and daemon connection status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchServers}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700 text-xs text-slate-300 font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#7C3AED]' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-medium shadow-md shadow-[#7C3AED]/20 transition"
          >
            <Plus className="w-4 h-4" />
            Register Host Node
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchServers} />}

      {feedback && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#34D399]/10 border border-[#34D399]/35 text-[#34D399] text-xs font-mono">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-[#34D399]/15"
            aria-label="Dismiss feedback"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Status Filter */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-4 shadow-lg flex flex-wrap items-center gap-3 text-xs font-mono">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search host name, IP, OS..."
            aria-label="Search servers"
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ONLINE' | 'DEGRADED' | 'OFFLINE')}
          aria-label="Filter servers by status"
          className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
        >
          <option value="ALL">All Statuses</option>
          <option value="ONLINE">ONLINE</option>
          <option value="DEGRADED">DEGRADED</option>
          <option value="OFFLINE">OFFLINE</option>
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
            }}
            className="px-3 py-2 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/35 text-[#A78BFA] hover:bg-[#7C3AED]/25 transition"
          >
            Reset
          </button>
        )}
        <span className="text-slate-500 ml-auto">
          Showing {filteredServers.length} of {servers.length}
        </span>
      </div>

      {/* Servers Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 font-mono text-xs bg-dark-900 border border-dark-700/80 rounded-xl">
          <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#7C3AED]" />
          Discovering registered infrastructure nodes...
        </div>
      ) : filteredServers.length === 0 ? (
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl">
          <EmptyState
            icon={<Server className="w-8 h-8" />}
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
                  className="px-3.5 py-2 rounded-lg text-xs font-mono bg-[#7C3AED]/15 border border-[#7C3AED]/35 text-[#A78BFA] hover:bg-[#7C3AED]/25 transition"
                >
                  Clear Filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServers.map((server) => (
            <div
              key={server.id}
              className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg hover:border-dark-600 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-dark-800 border border-dark-700 text-[#A78BFA] shrink-0">
                      <Server className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-200 font-mono truncate">
                        {server.hostName}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-500">{server.ipAddress}</p>
                    </div>
                  </div>
                  <StatusBadge status={server.status} />
                </div>

                <div className="space-y-3 pt-3 border-t border-dark-800 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1 font-mono text-[11px]">
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-[#A78BFA]" /> CPU Load
                      </span>
                      <span>{server.cpuUsage ?? 0}%</span>
                    </div>
                    <div className="w-full bg-dark-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#7C3AED] h-full rounded-full"
                        style={{ width: `${Math.min(100, server.cpuUsage ?? 0)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1 font-mono text-[11px]">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-cyan-400" /> Memory
                      </span>
                      <span>{server.memoryUsage ?? 0}%</span>
                    </div>
                    <div className="w-full bg-dark-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#22D3EE] h-full rounded-full"
                        style={{ width: `${Math.min(100, server.memoryUsage ?? 0)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1 font-mono text-[11px]">
                      <span className="flex items-center gap-1">
                        <Terminal className="w-3 h-3 text-emerald-400" /> Disk
                      </span>
                      <span>{server.diskUsage ?? 0}%</span>
                    </div>
                    <div className="w-full bg-dark-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#34D399] h-full rounded-full"
                        style={{ width: `${Math.min(100, server.diskUsage ?? 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-dark-800 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span className="truncate">OS: {server.osType}</span>
                  <span className="shrink-0">Agent: v{server.agentVersion}</span>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailServer(server)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-850 border border-dark-700 text-[11px] font-mono text-slate-300 hover:text-[#22D3EE] hover:border-[#22D3EE]/40 transition"
                    title="View server details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(server)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-850 border border-dark-700 text-[11px] font-mono text-slate-300 hover:text-[#A78BFA] hover:border-[#7C3AED]/40 transition"
                    title="Edit server configuration"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setDeletingServer(server)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/30 text-[11px] font-mono text-[#F43F5E] hover:bg-[#F43F5E]/20 transition"
                      title="Delete server"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showFormModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-100 font-mono flex items-center gap-2">
                <Server className="w-5 h-5 text-[#A78BFA]" />
                {editingServer ? `Edit Host #${editingServer.id}` : 'Register Monitored Host'}
              </h2>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowFormModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/40 text-[#F43F5E] text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label htmlFor="server-host-name" className="block text-slate-300 font-medium mb-1">
                  Host Name *
                </label>
                <input
                  id="server-host-name"
                  type="text"
                  required
                  value={formData.hostName}
                  onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#7C3AED] font-mono"
                  placeholder="e.g. prod-node-03.infra.sharp"
                />
              </div>

              <div>
                <label htmlFor="server-ip" className="block text-slate-300 font-medium mb-1">
                  IP Address *
                </label>
                <input
                  id="server-ip"
                  type="text"
                  required
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#7C3AED] font-mono"
                  placeholder="e.g. 192.168.1.10"
                />
              </div>

              <div>
                <label htmlFor="server-os" className="block text-slate-300 font-medium mb-1">
                  Operating System
                </label>
                <input
                  id="server-os"
                  type="text"
                  value={formData.osType}
                  onChange={(e) => setFormData({ ...formData, osType: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#7C3AED] font-mono"
                />
              </div>

              <div>
                <label htmlFor="server-agent-ver" className="block text-slate-300 font-medium mb-1">
                  Monitoring Agent Version
                </label>
                <input
                  id="server-agent-ver"
                  type="text"
                  value={formData.agentVersion}
                  onChange={(e) => setFormData({ ...formData, agentVersion: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#7C3AED] font-mono"
                />
              </div>

              {editingServer && (
                <div>
                  <label htmlFor="server-status" className="block text-slate-300 font-medium mb-1">
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
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#7C3AED] font-mono"
                  >
                    <option value="ONLINE">ONLINE</option>
                    <option value="DEGRADED">DEGRADED</option>
                    <option value="OFFLINE">OFFLINE</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-800">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowFormModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-dark-800 text-slate-300 hover:bg-dark-700 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-[#7C3AED] text-white font-medium hover:bg-[#6D28D9] transition disabled:opacity-50"
                >
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

      {/* Detail Modal */}
      {detailServer && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetailServer(null)}
        >
          <div
            className="bg-dark-900 border border-dark-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-[#22D3EE]" />
                <h2 className="text-sm font-bold text-slate-100 font-mono">
                  {detailServer.hostName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailServer(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
                aria-label="Close server details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <dt className="text-slate-500">Server ID</dt>
                <dd className="text-slate-200">#{detailServer.id}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd><StatusBadge status={detailServer.status} /></dd>
              </div>
              <div>
                <dt className="text-slate-500">IP Address</dt>
                <dd className="text-slate-200">{detailServer.ipAddress}</dd>
              </div>
              <div>
                <dt className="text-slate-500">OS Type</dt>
                <dd className="text-slate-200">{detailServer.osType}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Agent Version</dt>
                <dd className="text-slate-200">v{detailServer.agentVersion}</dd>
              </div>
              <div>
                <dt className="text-slate-500">CPU / Mem / Disk</dt>
                <dd className="text-slate-200">
                  {detailServer.cpuUsage ?? 0}% / {detailServer.memoryUsage ?? 0}% / {detailServer.diskUsage ?? 0}%
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500">Last Seen</dt>
                <dd className="text-slate-300">
                  {detailServer.lastSeen ? new Date(detailServer.lastSeen).toLocaleString() : '—'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500">Created At</dt>
                <dd className="text-slate-300">
                  {detailServer.createdAt ? new Date(detailServer.createdAt).toLocaleString() : '—'}
                </dd>
              </div>
            </dl>
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
