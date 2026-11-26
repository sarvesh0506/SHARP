import React, { useState, useEffect, useCallback } from 'react';
import { Container, Cpu, RefreshCw, Activity, AlertCircle, Box, Search } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { ErrorBanner } from '../components/ui/Banners';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricBar } from '../components/ui/MetricBar';
import apiClient from '../api/client';
import { ContainerMetric, DockerSnapshotResponse } from '../types';

export const DockerMonitoringPage: React.FC = () => {
  const [snapshot, setSnapshot] = useState<DockerSnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContainerMetric | null>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await apiClient.get('/monitoring/docker/containers');
      const data: DockerSnapshotResponse | null = res.data?.data ?? null;
      setSnapshot(data);
      if (data?.containers && data.containers.length > 0) {
        setSelected((prev) =>
          prev ? data.containers.find((c) => c.containerId === prev.containerId) ?? data.containers[0] : data.containers[0]
        );
      } else {
        setSelected(null);
      }
      setError(null);
    } catch (err: any) {
      console.error('Failed to load Docker telemetry:', err);
      setError(err?.response?.data?.message || 'Unable to query Docker monitoring endpoint.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 15000);
    return () => clearInterval(id);
  }, [fetchData]);

  const containers = snapshot?.containers ?? [];
  const filtered = containers.filter((c) => {
    if (filter !== 'ALL' && c.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.containerName.toLowerCase().includes(q) ||
        c.containerId.toLowerCase().includes(q) ||
        c.image.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const running = containers.filter((c) => c.status === 'RUNNING').length;
  const stopped = containers.filter((c) => c.status !== 'RUNNING').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Docker Container Monitoring"
        subtitle="Live Docker daemon inspection, container resource utilization, health checks, and network I/O."
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
        badge={
          snapshot ? (
            <StatusBadge status={snapshot.available ? 'ONLINE' : 'OFFLINE'} />
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {snapshot && !snapshot.available && (
        <div className="p-4 rounded-xl bg-[#EAE7D6]/10 border border-[#EAE7D6]/30 text-xs space-y-1">
          <div className="font-mono font-bold text-[#EAE7D6]">DOCKER DAEMON UNAVAILABLE</div>
          <p className="text-[#EAE7D6]">{snapshot.statusMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Docker Engine"
          value={snapshot?.available ? `v${snapshot.dockerVersion || 'OK'}` : 'UNAVAILABLE'}
          subtitle={snapshot?.available ? 'Connected to host daemon' : 'Daemon not detected'}
          icon={Box}
          color={snapshot?.available ? 'text-[#D7F9FA]' : 'text-[#EAE7D6]'}
        />
        <StatCard
          title="Running Containers"
          value={snapshot?.available ? running : 'N/A'}
          subtitle={`${containers.length} total discovered`}
          icon={Activity}
          color="text-[#B0D4B8]"
        />
        <StatCard
          title="Stopped Containers"
          value={snapshot?.available ? stopped : 'N/A'}
          subtitle="Exited or paused"
          icon={AlertCircle}
          color={stopped > 0 ? 'text-[#EAE7D6]' : 'text-[#98AB9C]'}
        />
        <StatCard
          title="Avg Container CPU"
          value={
            snapshot?.available && containers.length > 0
              ? `${(containers.reduce((acc, c) => acc + (c.cpuPercent ?? 0), 0) / containers.length).toFixed(1)}%`
              : 'N/A'
          }
          subtitle="Across running containers"
          icon={Cpu}
          color="text-[#A4C3A2]"
        />
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search container name, ID, image..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-[var(--text-main)] font-mono focus:outline-none focus:border-[#5D7B6F]"
          />
        </div>
        {(['ALL', 'RUNNING', 'STOPPED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition ${
              filter === s
                ? 'bg-[#5D7B6F]/15 text-[#A4C3A2] border-[#5D7B6F]/40'
                : 'bg-dark-850 text-[var(--text-muted)] border-dark-700 hover:bg-dark-800'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Container list */}
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 bg-dark-850 border-b border-dark-700 text-xs font-mono text-[var(--text-secondary)] font-semibold uppercase flex justify-between">
            <span>Containers</span>
            <span className="text-[var(--text-muted)]">{filtered.length}</span>
          </div>
          <div className="divide-y divide-dark-800 max-h-[500px] overflow-y-auto">
            {loading && !snapshot ? (
              <div className="p-8 text-center text-[var(--text-muted)] text-xs">
                <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#D7F9FA]" />
                Querying Docker daemon...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center">
                <Container className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-[var(--text-muted)] text-xs">
                  {snapshot?.available
                    ? 'No Docker containers match the current filter.'
                    : 'Docker is unavailable on this host.'}
                </p>
              </div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.containerId}
                  onClick={() => setSelected(c)}
                  className={`p-4 cursor-pointer hover:bg-dark-850/70 transition ${
                    selected?.containerId === c.containerId ? 'bg-dark-850 border-l-2 border-[#D7F9FA]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--text-main)] font-mono truncate">{c.containerName}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] font-mono truncate">{c.image}</div>
                  <div className="text-[11px] text-[var(--text-muted)] font-mono truncate mt-0.5">ID: {c.containerId}</div>
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
                  <h2 className="text-base font-semibold text-[var(--text-main)] font-mono">{selected.containerName}</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">{selected.image}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-[var(--text-muted)] block">Container ID</span>
                  <span className="text-[var(--text-main)]">{selected.containerId}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Health Check</span>
                  <span className="text-[var(--text-main)]">{selected.healthStatus || 'NONE'}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Network I/O</span>
                  <span className="text-[#D7F9FA]">{selected.netIo || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Uptime / State</span>
                  <span className="text-[var(--text-main)]">{selected.uptimeText || 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-dark-800">
                <MetricBar label="CPU Utilization" value={selected.cpuPercent ?? 0} color="bg-[#D7F9FA]" />
                <MetricBar label="Memory Utilization" value={selected.memoryPercent ?? 0} color="bg-[#5D7B6F]" />
              </div>
            </div>
          ) : (
            <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-12 text-center shadow-lg">
              <Container className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-muted)]">
                {snapshot?.available
                  ? 'Select a container to inspect live stats.'
                  : 'Docker container monitoring will activate automatically when Docker is available on the host.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
