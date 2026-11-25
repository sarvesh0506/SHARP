import React, { useState, useEffect } from 'react';
import { Container, Cpu, RefreshCw, Activity, AlertCircle, Box } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { UnavailableBanner } from '../components/ui/Banners';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricBar } from '../components/ui/MetricBar';
import apiClient from '../api/client';
import { Application } from '../types';

export const DockerMonitoringPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selected, setSelected] = useState<Application | null>(null);
  const [filter, setFilter] = useState<string>('ALL');

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const res = await apiClient.get('/applications');
      if (res.data?.data) {
        const list: Application[] = res.data.data;
        setApplications(list);
        if (!selected && list.length > 0) setSelected(list[0]);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 15000);
    return () => clearInterval(id);
  }, []);

  const dockerApps = applications.filter((a) => a.dockerContainerId || a.dockerImage);
  const filtered =
    filter === 'ALL' ? dockerApps : dockerApps.filter((a) => a.status === filter);

  const running = dockerApps.filter((a) => a.status === 'HEALTHY' || a.status === 'DEGRADED').length;
  const stopped = dockerApps.filter((a) => a.status === 'STOPPED' || a.status === 'UNHEALTHY').length;

  const statuses = ['ALL', 'HEALTHY', 'DEGRADED', 'UNHEALTHY', 'STOPPED'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Docker Container Monitoring"
        subtitle="Real-time container health, resource usage, and restart tracking for registered Docker applications."
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      <UnavailableBanner
        feature="Live Docker metrics"
        message="Phase 2 DockerMonitorService not yet active. Container data below is sourced from the application registry. Live CPU/memory/net-io stats require Docker socket integration."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Docker Applications" value={dockerApps.length} subtitle="Registered with container ID or image" icon={Box} color="text-[#A78BFA]" />
        <StatCard title="Running" value={running} subtitle="Healthy or degraded state" icon={Activity} trendType="positive" color="text-emerald-400" />
        <StatCard title="Stopped / Unhealthy" value={stopped} subtitle="Requires attention" icon={AlertCircle} trendType={stopped > 0 ? 'negative' : 'positive'} color={stopped > 0 ? 'text-rose-400' : 'text-emerald-400'} />
        <StatCard
          title="Avg CPU"
          value={dockerApps.length ? `${(dockerApps.reduce((a, x) => a + x.cpuUsage, 0) / dockerApps.length).toFixed(1)}%` : 'N/A'}
          subtitle="Across running containers"
          icon={Cpu}
          color="text-cyan-400"
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition ${
              filter === s
                ? 'bg-[#7C3AED]/15 text-[#A78BFA] border-[#7C3AED]/40'
                : 'bg-dark-850 text-slate-400 border-dark-700 hover:bg-dark-800'
            }`}
          >
            {s}
          </button>
        ))}
        <span className="ml-auto text-xs font-mono text-slate-500 self-center">
          {filtered.length} container{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Container list */}
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 bg-dark-850 border-b border-dark-700 text-xs font-mono text-slate-300 font-semibold uppercase">
            Containers
          </div>
          <div className="divide-y divide-dark-800 max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#7C3AED]" />
                Loading containers...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center">
                <Container className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-xs">No Docker applications found.</p>
                <p className="text-slate-600 text-xs mt-1">Register applications with a Docker container ID or image name.</p>
              </div>
            ) : (
              filtered.map((app) => (
                <div
                  key={app.id}
                  onClick={() => setSelected(app)}
                  className={`p-4 cursor-pointer hover:bg-dark-850/70 transition ${
                    selected?.id === app.id ? 'bg-dark-850 border-l-2 border-[#7C3AED]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-200 font-mono truncate max-w-[140px]">{app.name}</span>
                    <StatusBadge status={app.status} />
                  </div>
                  {app.dockerImage && (
                    <div className="text-[11px] text-slate-500 font-mono truncate">{app.dockerImage}</div>
                  )}
                  {app.dockerContainerId && (
                    <div className="text-[11px] text-slate-600 font-mono truncate mt-0.5">
                      ID: {app.dockerContainerId.substring(0, 12)}...
                    </div>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>CPU <span className="text-slate-200 font-bold">{app.cpuUsage}%</span></div>
                    <div>MEM <span className="text-slate-200 font-bold">{app.memoryUsage}%</span></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-100 font-mono">{selected.name}</h2>
                  {selected.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{selected.description}</p>
                  )}
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="space-y-1">
                  <span className="text-slate-500 block">Container ID</span>
                  <span className="text-slate-200">{selected.dockerContainerId || '—'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block">Image</span>
                  <span className="text-slate-200">{selected.dockerImage || '—'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block">Port</span>
                  <span className="text-slate-200">{selected.port || '—'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block">Health Endpoint</span>
                  <span className="text-slate-200">{selected.healthEndpoint}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block">Restart Count</span>
                  <span className={`font-bold ${selected.restartCount > 3 ? 'text-rose-400' : 'text-slate-200'}`}>
                    {selected.restartCount}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block">Auto-Recovery</span>
                  <span className={selected.isAutoRecoveryEnabled ? 'text-emerald-400' : 'text-slate-400'}>
                    {selected.isAutoRecoveryEnabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-dark-800">
                <MetricBar label="CPU Utilization" value={selected.cpuUsage} />
                <MetricBar label="Memory Utilization" value={selected.memoryUsage} color="bg-indigo-500" />
              </div>

              <div className="p-3 rounded-lg bg-dark-850 border border-dark-700/80">
                <span className="text-[11px] font-mono text-slate-500 block mb-2 uppercase">Live Container Stats</span>
                <div className="text-xs text-amber-400/80 font-mono flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Live Docker stats (net I/O, block I/O, PID count) require Phase 2 Docker socket integration.
                </div>
              </div>

              {selected.lastHeartbeat && (
                <div className="text-xs text-slate-500 font-mono">
                  Last heartbeat: {new Date(selected.lastHeartbeat).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-12 text-center shadow-lg">
              <Container className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Select a container to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
