import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { MonitoredServer } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorBanner } from '../components/ui/Banners';
import { Server, Plus, RefreshCw, HardDrive, Cpu, Terminal } from 'lucide-react';

export const ServersPage: React.FC = () => {
  const [servers, setServers] = useState<MonitoredServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    hostName: '',
    ipAddress: '',
    osType: 'Ubuntu 22.04 LTS',
    agentVersion: '1.0.0',
  });

  const fetchServers = async () => {
    try {
      setIsRefreshing(true);
      const res = await apiClient.get('/servers');
      setServers(res.data?.data ?? []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load servers:', err);
      setError(err?.response?.data?.message || 'Unable to load monitored servers from SHARP backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFeedback(null);

    if (!formData.hostName.trim() || !formData.ipAddress.trim()) {
      setFormError('Host Name and IP Address are required.');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/servers', {
        hostName: formData.hostName.trim(),
        ipAddress: formData.ipAddress.trim(),
        osType: formData.osType.trim() || 'Ubuntu 22.04 LTS',
        agentVersion: formData.agentVersion.trim() || '1.0.0',
      });
      setFeedback(`Host node "${formData.hostName.trim()}" registered successfully.`);
      setShowModal(false);
      setFormData({
        hostName: '',
        ipAddress: '',
        osType: 'Ubuntu 22.04 LTS',
        agentVersion: '1.0.0',
      });
      await fetchServers();
    } catch (err: any) {
      console.error('Failed to register server:', err);
      setFormError(err?.response?.data?.message || 'Error registering server. Please verify details.');
    } finally {
      setSubmitting(false);
    }
  };

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
            onClick={fetchServers}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700 text-xs text-slate-300 font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#7C3AED]' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setFormError(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-medium shadow-md shadow-[#7C3AED]/20 transition"
          >
            <Plus className="w-4 h-4" />
            Register Host Node
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchServers} />}

      {feedback && (
        <div className="p-3.5 rounded-xl bg-[#34D399]/10 border border-[#34D399]/35 text-[#34D399] text-xs font-mono">
          {feedback}
        </div>
      )}

      {/* Servers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-500 font-mono text-xs">
            <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#7C3AED]" />
            Discovering registered infrastructure nodes...
          </div>
        ) : servers.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-500 font-mono text-xs bg-dark-900 border border-dark-700/80 rounded-xl">
            {error ? 'Unable to load servers due to backend error.' : 'No servers registered yet.'}
          </div>
        ) : (
          servers.map((server) => (
            <div
              key={server.id}
              className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg hover:border-dark-600 transition"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-dark-800 border border-dark-700 text-[#A78BFA]">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 font-mono">{server.hostName}</h3>
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
                    <span>{server.cpuUsage}%</span>
                  </div>
                  <div className="w-full bg-dark-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#7C3AED] h-full rounded-full"
                      style={{ width: `${server.cpuUsage}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1 font-mono text-[11px]">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-cyan-400" /> Memory
                    </span>
                    <span>{server.memoryUsage}%</span>
                  </div>
                  <div className="w-full bg-dark-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#22D3EE] h-full rounded-full"
                      style={{ width: `${server.memoryUsage}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1 font-mono text-[11px]">
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-emerald-400" /> Disk IOPS
                    </span>
                    <span>{server.diskUsage}%</span>
                  </div>
                  <div className="w-full bg-dark-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#34D399] h-full rounded-full"
                      style={{ width: `${server.diskUsage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-dark-800 text-[11px] font-mono text-slate-500">
                <span>OS: {server.osType}</span>
                <span>Agent: v{server.agentVersion}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100 font-mono mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-[#A78BFA]" />
              Register Monitored Host
            </h2>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/40 text-[#F43F5E] text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Host Name *</label>
                <input
                  type="text"
                  required
                  value={formData.hostName}
                  onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#7C3AED] font-mono"
                  placeholder="e.g. prod-node-03.infra.sharp"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">IP Address *</label>
                <input
                  type="text"
                  required
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#7C3AED] font-mono"
                  placeholder="e.g. 192.168.1.10"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Operating System</label>
                <input
                  type="text"
                  value={formData.osType}
                  onChange={(e) => setFormData({ ...formData, osType: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#7C3AED] font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Monitoring Agent Version</label>
                <input
                  type="text"
                  value={formData.agentVersion}
                  onChange={(e) => setFormData({ ...formData, agentVersion: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#7C3AED] font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-800">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-dark-800 text-slate-300 hover:bg-dark-700 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-[#7C3AED] text-white font-medium hover:bg-[#6D28D9] transition disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
