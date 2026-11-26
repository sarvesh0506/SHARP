import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, Cpu, HardDrive, RefreshCw, Wifi, Server, Clock, Play } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { MetricBar } from '../components/ui/MetricBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorBanner } from '../components/ui/Banners';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import apiClient from '../api/client';
import { CollectorStatus, SystemMetric } from '../types';

const formatBytes = (bytes: number | null | undefined): string => {
  if (bytes == null) return 'N/A';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};

const formatRate = (bps: number | null | undefined): string => {
  if (bps == null) return 'Calculating...';
  if (bps >= 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
  if (bps >= 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${bps.toFixed(0)} B/s`;
};

const formatUptime = (sec: number | null | undefined): string => {
  if (sec == null) return 'N/A';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1D2B26] border border-[#24352F] rounded-lg p-3 text-xs font-mono shadow-xl text-[#EAE7D6]">
        <p className="text-[#98AB9C] mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {p.value != null ? `${Number(p.value).toFixed(1)}%` : 'N/A'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const SystemMonitoringPage: React.FC = () => {
  const [latest, setLatest] = useState<SystemMetric | null>(null);
  const [history, setHistory] = useState<SystemMetric[]>([]);
  const [collectorStatus, setCollectorStatus] = useState<CollectorStatus | null>(null);
  const [timeRange, setTimeRange] = useState<'15m' | '1h' | '6h' | '24h'>('1h');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const now = new Date();
      const hoursMap = { '15m': 0.25, '1h': 1, '6h': 6, '24h': 24 };
      const from = new Date(now.getTime() - hoursMap[timeRange] * 3600 * 1000).toISOString();

      const [latestRes, histRes, statusRes] = await Promise.all([
        apiClient.get('/monitoring/system/latest'),
        apiClient.get('/monitoring/system/history', {
          params: { from, to: now.toISOString(), limit: 200 },
        }),
        apiClient.get('/monitoring/collector/status'),
      ]);

      setLatest(latestRes.data?.data ?? null);
      setHistory(histRes.data?.data ?? []);
      setCollectorStatus(statusRes.data?.data ?? null);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load host telemetry:', err);
      setError(err?.response?.data?.message || 'Unable to load host system telemetry from backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, 10000);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  const handleCollectNow = async () => {
    try {
      setTriggering(true);
      await apiClient.post('/monitoring/collector/collect');
      await fetchMetrics();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Manual collection trigger failed.');
    } finally {
      setTriggering(false);
    }
  };

  const chartData = history.map((m) => ({
    time: new Date(m.collectedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    cpu: m.cpuPercent,
    memory: m.memoryPercent,
    disk: m.diskPercent,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Monitoring"
        subtitle="Real-time host CPU, memory, disk, network throughput, and collector health."
        onRefresh={fetchMetrics}
        isRefreshing={isRefreshing}
        badge={collectorStatus ? <StatusBadge status={collectorStatus.status} /> : undefined}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-dark-900 border border-dark-700 p-0.5 text-[11px] font-mono">
              {(['15m', '1h', '6h', '24h'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 rounded-md transition ${
                    timeRange === r ? 'bg-[#5D7B6F]/20 text-[#A4C3A2]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={handleCollectNow}
              disabled={triggering}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5D7B6F] hover:bg-[#4D685D] text-white text-xs font-medium transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {triggering ? 'Collecting...' : 'Collect Now'}
            </button>
          </div>
        }
      />

      {error && <ErrorBanner message={error} onRetry={fetchMetrics} />}

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Host CPU"
          value={latest?.cpuPercent != null ? `${latest.cpuPercent.toFixed(1)}%` : 'N/A'}
          subtitle={latest?.hostName || 'Awaiting telemetry'}
          icon={Cpu}
          color="text-[#D7F9FA]"
        />
        <StatCard
          title="Host Memory"
          value={latest?.memoryPercent != null ? `${latest.memoryPercent.toFixed(1)}%` : 'N/A'}
          subtitle={
            latest ? `${formatBytes(latest.memoryUsedBytes)} / ${formatBytes(latest.memoryTotalBytes)}` : 'Awaiting telemetry'
          }
          icon={Monitor}
          color="text-[#5D7B6F]"
        />
        <StatCard
          title="Disk Utilization"
          value={latest?.diskPercent != null ? `${latest.diskPercent.toFixed(1)}%` : 'N/A'}
          subtitle={
            latest ? `${formatBytes(latest.diskUsedBytes)} / ${formatBytes(latest.diskTotalBytes)}` : 'Awaiting telemetry'
          }
          icon={HardDrive}
          color="text-[#B0D4B8]"
        />
        <StatCard
          title="System Uptime"
          value={formatUptime(latest?.uptimeSeconds)}
          subtitle={latest?.osName || 'Host OS'}
          icon={Clock}
          color="text-[#A4C3A2]"
        />
      </div>

      {loading && !latest ? (
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-12 text-center text-[var(--text-muted)] font-mono text-xs">
          <RefreshCw className="w-5 h-5 animate-spin inline mr-2 text-[#D7F9FA]" />
          Loading real host telemetry...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Host & Collector Details */}
          <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
                <Server className="w-4 h-4 text-[#D7F9FA]" />
                Host & Collector Info
              </h2>
              {collectorStatus && (
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  Every {collectorStatus.intervalSeconds}s
                </span>
              )}
            </div>

            {latest ? (
              <>
                <div className="space-y-3">
                  {latest.cpuPercent != null ? (
                    <MetricBar label="CPU Utilization" value={latest.cpuPercent} color="bg-[#D7F9FA]" />
                  ) : (
                    <div className="text-xs font-mono text-[#EAE7D6]">CPU Utilization: Calculating delta...</div>
                  )}
                  {latest.memoryPercent != null && (
                    <MetricBar label="Memory Utilization" value={latest.memoryPercent} color="bg-[#5D7B6F]" />
                  )}
                  {latest.diskPercent != null && (
                    <MetricBar label="Disk Utilization" value={latest.diskPercent} color="bg-[#B0D4B8]" />
                  )}
                </div>

                <div className="pt-3 border-t border-dark-800 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Hostname:</span>
                    <span className="text-[var(--text-main)]">{latest.hostName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">RAM Available:</span>
                    <span className="text-[var(--text-main)]">{formatBytes(latest.memoryAvailableBytes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Disk Free:</span>
                    <span className="text-[var(--text-main)]">{formatBytes(latest.diskFreeBytes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Last Sample:</span>
                    <span className="text-[var(--text-secondary)]">
                      {new Date(latest.collectedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-xs font-mono text-[var(--text-muted)] border border-dashed border-dark-700 rounded-lg">
                Awaiting first telemetry sample. Click "Collect Now" to sample immediately.
              </div>
            )}

            {/* Network Card */}
            <div className="pt-3 border-t border-dark-800 space-y-2">
              <div className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-2">
                <Wifi className="w-3.5 h-3.5 text-[#D7F9FA]" />
                Network Throughput
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2.5 rounded-lg bg-dark-850 border border-dark-700">
                  <div className="text-[var(--text-muted)]">RX Rate</div>
                  <div className="text-[#D7F9FA] font-bold mt-0.5">{formatRate(latest?.netRecvRateBps)}</div>
                  <div className="text-[var(--text-muted)] mt-0.5">Total: {formatBytes(latest?.netBytesRecv)}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-dark-850 border border-dark-700">
                  <div className="text-[var(--text-muted)]">TX Rate</div>
                  <div className="text-[#A4C3A2] font-bold mt-0.5">{formatRate(latest?.netSentRateBps)}</div>
                  <div className="text-[var(--text-muted)] mt-0.5">Total: {formatBytes(latest?.netBytesSent)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Chart */}
          <div className="lg:col-span-2 bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-main)]">
                  Historical Resource Utilization ({timeRange})
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {chartData.length} real host samples persisted in database
                </p>
              </div>
              {collectorStatus?.lastSuccessAt && (
                <span className="text-[11px] font-mono text-[#B0D4B8]">
                  Last OK: {new Date(collectorStatus.lastSuccessAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            {chartData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-xs font-mono text-[var(--text-muted)] border border-dashed border-dark-800 rounded-lg">
                No historical samples in this time range yet. Samples are recorded every {collectorStatus?.intervalSeconds ?? 10}s.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D7F9FA" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#D7F9FA" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5D7B6F" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#5D7B6F" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="diskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B0D4B8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#B0D4B8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#24352F" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#98AB9C', fontFamily: 'monospace' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#98AB9C' }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#98AB9C' }} />
                  <Area type="monotone" dataKey="cpu" stroke="#D7F9FA" fill="url(#cpuGrad)" strokeWidth={1.75} dot={false} name="CPU" connectNulls />
                  <Area type="monotone" dataKey="memory" stroke="#5D7B6F" fill="url(#memGrad)" strokeWidth={1.75} dot={false} name="Memory" connectNulls />
                  <Area type="monotone" dataKey="disk" stroke="#B0D4B8" fill="url(#diskGrad)" strokeWidth={1.5} dot={false} name="Disk" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
