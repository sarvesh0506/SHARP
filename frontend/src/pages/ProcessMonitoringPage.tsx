import React, { useCallback, useEffect, useState } from 'react';
import { Cpu, Terminal, Search, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { ErrorBanner } from '../components/ui/Banners';
import { EmptyState } from '../components/ui/EmptyState';
import apiClient from '../api/client';
import { ProcessMetric, ProcessPageResponse } from '../types';

export const ProcessMonitoringPage: React.FC = () => {
  const [data, setData] = useState<ProcessPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'cpu' | 'memory' | 'pid' | 'name'>('cpu');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const fetchProcesses = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await apiClient.get('/monitoring/processes', {
        params: { search, status: statusFilter, sortBy, sortDir, page, size: pageSize },
      });
      setData(res.data?.data ?? null);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load process metrics:', err);
      setError(err?.response?.data?.message || 'Unable to load host process telemetry from SHARP backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [search, statusFilter, sortBy, sortDir, page]);

  useEffect(() => {
    fetchProcesses();
    const id = setInterval(fetchProcesses, 10000);
    return () => clearInterval(id);
  }, [fetchProcesses]);

  const toggleSort = (col: typeof sortBy) => {
    setPage(0);
    if (sortBy === col) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const items: ProcessMetric[] = data?.items ?? [];
  const topCpu = [...items].sort((a, b) => (b.cpuPercent ?? 0) - (a.cpuPercent ?? 0))[0];
  const topMem = [...items].sort((a, b) => (b.memoryBytes ?? 0) - (a.memoryBytes ?? 0))[0];

  const SortHeader: React.FC<{ col: typeof sortBy; label: string }> = ({ col, label }) => (
    <th
      className="py-3.5 px-4 cursor-pointer select-none hover:text-[var(--text-main)] transition"
      onClick={() => toggleSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortBy === col && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Windows Process Monitoring"
        subtitle="Live OS process enumeration (PID, CPU %, memory RSS, state, user/path) via OSHI host collector."
        onRefresh={fetchProcesses}
        isRefreshing={isRefreshing}
      />

      {error && <ErrorBanner message={error} onRetry={fetchProcesses} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Sampled Processes"
          value={data?.totalHostProcessesSampled ?? data?.totalElements ?? 0}
          subtitle={data?.collectedAt ? `Sampled ${new Date(data.collectedAt).toLocaleTimeString()}` : 'Awaiting sample'}
          icon={Terminal}
          color="text-[#D7F9FA]"
        />
        <StatCard
          title="Matching Filter"
          value={data?.totalElements ?? 0}
          subtitle={`Page ${(data?.page ?? 0) + 1} of ${Math.max(1, data?.totalPages ?? 1)}`}
          icon={Cpu}
          color="text-[#A4C3A2]"
        />
        <StatCard
          title="Top CPU (Current Page)"
          value={topCpu?.processName ?? 'N/A'}
          subtitle={topCpu?.cpuPercent != null ? `${topCpu.cpuPercent.toFixed(1)}% CPU` : 'Awaiting delta'}
          icon={AlertCircle}
          color="text-[#EAE7D6]"
        />
        <StatCard
          title="Top Memory (Current Page)"
          value={topMem?.processName ?? 'N/A'}
          subtitle={topMem?.memoryBytes != null ? `${(topMem.memoryBytes / (1024 * 1024)).toFixed(1)} MB` : 'N/A'}
          icon={Cpu}
          color="text-[#B0D4B8]"
        />
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
            placeholder="Search by process name or PID..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-[var(--text-main)] placeholder-slate-600 focus:outline-none focus:border-[#5D7B6F] font-mono"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(0);
            setStatusFilter(e.target.value);
          }}
          aria-label="Filter by process state"
          className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-[var(--text-main)] font-mono focus:outline-none focus:border-[#5D7B6F]"
        >
          <option value="ALL">All States</option>
          <option value="RUNNING">RUNNING</option>
          <option value="SLEEPING">SLEEPING</option>
          <option value="WAITING">WAITING</option>
          <option value="OTHER">OTHER</option>
        </select>

        <span className="text-xs text-[var(--text-muted)] font-mono ml-auto">
          Showing {items.length} of {data?.totalElements ?? 0} processes
        </span>
      </div>

      {/* Process Table */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
        {loading && !data ? (
          <div className="p-12 text-center text-[var(--text-muted)] font-mono text-xs">
            <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#D7F9FA]" />
            Loading live OS process list...
          </div>
        ) : !data?.available || items.length === 0 ? (
          <EmptyState
            icon={<Terminal className="w-8 h-8" />}
            title={data?.available === false ? 'Process Telemetry Unavailable' : 'No Matching Processes'}
            description={
              data?.available === false
                ? 'Waiting for the backend TelemetryCollectionService to complete its first host process snapshot.'
                : 'No running processes match your current search or state filter.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-850 border-b border-dark-700/80 text-[var(--text-muted)] uppercase font-mono tracking-wider text-[11px]">
                <tr>
                  <SortHeader col="pid" label="PID" />
                  <SortHeader col="name" label="Process Name" />
                  <SortHeader col="cpu" label="CPU %" />
                  <SortHeader col="memory" label="Memory" />
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Start Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800 text-[var(--text-secondary)] font-mono text-[11px]">
                {items.map((p) => {
                  const cpu = p.cpuPercent ?? 0;
                  const memMb = p.memoryBytes != null ? (p.memoryBytes / (1024 * 1024)).toFixed(1) : 'N/A';
                  return (
                    <tr key={`${p.pid}-${p.processName}`} className="hover:bg-dark-850/60 transition">
                      <td className="py-3 px-4 text-[var(--text-muted)]">{p.pid}</td>
                      <td className="py-3 px-4">
                        <div className="text-[var(--text-main)] font-semibold">{p.processName}</div>
                        {p.executablePath && (
                          <div className="text-[10px] text-[var(--text-muted)] truncate max-w-xs" title={p.executablePath}>
                            {p.executablePath}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold ${
                            cpu > 25 ? 'text-[#EAE7D6]' : cpu > 10 ? 'text-[#EAE7D6]' : 'text-[#D7F9FA]'
                          }`}
                        >
                          {p.cpuPercent != null ? `${cpu.toFixed(1)}%` : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">
                        {memMb} MB{' '}
                        {p.memoryPercent != null && (
                          <span className="text-[var(--text-muted)]">({p.memoryPercent.toFixed(1)}%)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#B0D4B8]/10 text-[#B0D4B8] border border-[#B0D4B8]/30">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">{p.userName || 'System / Restricted'}</td>
                      <td className="py-3 px-4 text-[var(--text-muted)] whitespace-nowrap">
                        {p.startTime ? new Date(p.startTime).toLocaleTimeString() : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="p-3 bg-dark-850 border-t border-dark-700 flex items-center justify-between text-xs font-mono">
            <span className="text-[var(--text-muted)]">
              Page {data.page + 1} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={data.page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-2.5 py-1 rounded bg-dark-900 border border-dark-700 text-[var(--text-secondary)] disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                disabled={data.page >= data.totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 rounded bg-dark-900 border border-dark-700 text-[var(--text-secondary)] disabled:opacity-40 flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
