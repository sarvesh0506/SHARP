import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import {
  CollectorStatus,
  DashboardSummary,
  DockerSnapshotResponse,
  RecoveryAction,
  SystemMetric,
} from '../types';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricBar } from '../components/ui/MetricBar';
import {
  Layers,
  AlertTriangle,
  RotateCcw,
  Zap,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  Legend,
} from 'recharts';

const formatRate = (bps: number | null | undefined): string => {
  if (bps == null) return 'Calculating...';
  if (bps >= 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
  if (bps >= 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${bps.toFixed(0)} B/s`;
};

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recoveries, setRecoveries] = useState<RecoveryAction[]>([]);
  const [latestMetric, setLatestMetric] = useState<SystemMetric | null>(null);
  const [metricHistory, setMetricHistory] = useState<SystemMetric[]>([]);
  const [collectorStatus, setCollectorStatus] = useState<CollectorStatus | null>(null);
  const [dockerSnapshot, setDockerSnapshot] = useState<DockerSnapshotResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeWindow, setTimeWindow] = useState<'15m' | '1h' | '6h' | '24h'>('1h');

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const now = new Date();
      const hoursMap = { '15m': 0.25, '1h': 1, '6h': 6, '24h': 24 };
      const from = new Date(now.getTime() - hoursMap[timeWindow] * 3600 * 1000).toISOString();

      const [sumRes, recRes, latestRes, histRes, colRes, docRes] = await Promise.all([
        apiClient.get('/dashboard/summary'),
        apiClient.get('/recovery'),
        apiClient.get('/monitoring/system/latest'),
        apiClient.get('/monitoring/system/history', {
          params: { from, to: now.toISOString(), limit: 120 },
        }),
        apiClient.get('/monitoring/collector/status'),
        apiClient.get('/monitoring/docker/containers'),
      ]);

      setSummary(sumRes.data?.data ?? null);
      setRecoveries(recRes.data?.data ?? []);
      setLatestMetric(latestRes.data?.data ?? null);
      setMetricHistory(histRes.data?.data ?? []);
      setCollectorStatus(colRes.data?.data ?? null);
      setDockerSnapshot(docRes.data?.data ?? null);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard telemetry:', err);
      setError('Unable to connect to SHARP backend service.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [timeWindow]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 font-mono text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-3 text-[#22D3EE]" />
        Querying live host telemetry & incident records...
      </div>
    );
  }

  const totalApps = summary?.totalApplications ?? 0;
  const healthyApps = summary?.healthyApplications ?? 0;
  const degradedApps = summary?.unhealthyApplications ?? 0;
  const criticalIncidents = (summary?.recentIncidents ?? []).filter(
    (i) => i.severity === 'CRITICAL' && i.status !== 'RESOLVED'
  ).length;
  const activeRecoveries = recoveries.filter((r) =>
    ['PENDING', 'AWAITING_APPROVAL', 'APPROVED', 'EXECUTING'].includes(r.status)
  ).length;

  const overallHealthStatus =
    criticalIncidents > 0
      ? 'CRITICAL'
      : degradedApps > 0 || (summary?.activeIncidents ?? 0) > 0 || collectorStatus?.status === 'DEGRADED'
      ? 'DEGRADED'
      : 'HEALTHY';

  const availabilityChartData = [
    { name: 'Healthy', count: healthyApps, fill: '#34D399' },
    { name: 'Degraded / Down', count: degradedApps, fill: '#F59E0B' },
  ];

  const timelineData = metricHistory.map((m) => ({
    time: new Date(m.collectedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    cpu: m.cpuPercent,
    memory: m.memoryPercent,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-dark-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-mono">
              Resilience Command Center
            </h1>
            <StatusBadge status={overallHealthStatus} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time host telemetry, monitored services, active incidents, and autonomous recovery operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-dark-900 border border-dark-700 p-0.5 text-[11px] font-mono">
            {(['15m', '1h', '6h', '24h'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`px-2.5 py-1 rounded-md transition ${
                  timeWindow === w ? 'bg-[#7C3AED]/20 text-[#A78BFA]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700 text-xs text-slate-300 font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#7C3AED]' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <span className="font-mono text-[11px] underline cursor-pointer" onClick={fetchDashboardData}>
            Retry connection
          </span>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Host CPU & Memory"
          value={latestMetric?.cpuPercent != null ? `${latestMetric.cpuPercent.toFixed(1)}%` : 'N/A'}
          subtitle={
            latestMetric?.memoryPercent != null
              ? `Memory: ${latestMetric.memoryPercent.toFixed(1)}% (${latestMetric.hostName})`
              : 'Awaiting telemetry'
          }
          icon={Cpu}
          color="text-[#22D3EE]"
        />
        <StatCard
          title="Monitored Services"
          value={totalApps}
          subtitle={`${healthyApps} Healthy / ${degradedApps} Degraded`}
          icon={Layers}
          trend={totalApps > 0 ? `${Math.round((healthyApps / totalApps) * 100)}% Healthy` : 'No Apps'}
          trendType={degradedApps > 0 ? 'neutral' : 'positive'}
          color="text-[#A78BFA]"
        />
        <StatCard
          title="Critical & Active Incidents"
          value={summary?.activeIncidents ?? 0}
          subtitle={`${criticalIncidents} Critical severity`}
          icon={AlertTriangle}
          trend={criticalIncidents > 0 ? 'Critical' : summary?.activeIncidents ? 'Investigating' : 'All Clear'}
          trendType={summary?.activeIncidents ? 'negative' : 'positive'}
          color={criticalIncidents > 0 ? 'text-rose-400' : summary?.activeIncidents ? 'text-amber-400' : 'text-emerald-400'}
        />
        <StatCard
          title="Active Recoveries"
          value={activeRecoveries}
          subtitle={`MTTR: ${summary?.avgRecoveryTimeSeconds != null ? `${summary.avgRecoveryTimeSeconds}s` : 'N/A'}`}
          icon={RotateCcw}
          trend={activeRecoveries > 0 ? 'In Progress' : 'Idle'}
          trendType="neutral"
          color="text-[#34D399]"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real System Health Timeline */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Host System Telemetry ({timeWindow})</h2>
              <p className="text-xs text-slate-500">
                Real CPU % vs Memory % from {latestMetric?.hostName || 'host'} ({timelineData.length} samples)
              </p>
            </div>
            {collectorStatus && <StatusBadge status={collectorStatus.status} />}
          </div>
          <div className="h-64 w-full">
            {timelineData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500 border border-dashed border-dark-800 rounded-lg">
                Awaiting telemetry samples in the selected {timeWindow} window.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22D3EE" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26324A" />
                  <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1B2540', borderColor: '#26324A', borderRadius: '8px', fontSize: '12px', color: '#E2E8F0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
                  <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#22D3EE" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" connectNulls />
                  <Area type="monotone" dataKey="memory" name="Memory %" stroke="#7C3AED" strokeWidth={2} fillOpacity={1} fill="url(#colorMem)" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Service Availability & Host Utilization */}
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Service Availability & Host Resources</h2>
            <div className="h-28 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={availabilityChartData} layout="vertical" margin={{ top: 0, right: 16, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26324A" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1B2540', borderColor: '#26324A', fontSize: 11 }} />
                  <Bar dataKey="count" name="Services" radius={[0, 4, 4, 0]}>
                    {availabilityChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {latestMetric?.cpuPercent != null ? (
                <MetricBar label="Host CPU" value={latestMetric.cpuPercent} color="bg-[#22D3EE]" />
              ) : (
                <div className="text-xs font-mono text-slate-400">Host CPU: Awaiting telemetry</div>
              )}
              {latestMetric?.memoryPercent != null ? (
                <MetricBar label="Host Memory" value={latestMetric.memoryPercent} color="bg-[#7C3AED]" />
              ) : (
                <div className="text-xs font-mono text-slate-400">Host Memory: Awaiting telemetry</div>
              )}
              {latestMetric?.diskPercent != null ? (
                <MetricBar label="Host Disk" value={latestMetric.diskPercent} color="bg-[#34D399]" />
              ) : (
                <div className="text-xs font-mono text-slate-400">Host Disk: Awaiting telemetry</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3">
              <Link
                to="/monitoring/docker"
                className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[#22D3EE]/50 transition"
              >
                <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Docker</div>
                <div className={`text-xs font-bold font-mono mt-0.5 ${dockerSnapshot?.available ? 'text-[#22D3EE]' : 'text-[#F59E0B]'}`}>
                  {dockerSnapshot?.available
                    ? `${dockerSnapshot.containers.filter((c) => c.status === 'RUNNING').length}/${dockerSnapshot.containers.length} Running`
                    : 'Unavailable'}
                </div>
              </Link>
              <Link
                to="/monitoring/processes"
                className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[#22D3EE]/50 transition"
              >
                <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Processes</div>
                <div className={`text-xs font-bold font-mono mt-0.5 ${collectorStatus?.processDataAvailable ? 'text-[#34D399]' : 'text-[#F59E0B]'}`}>
                  {collectorStatus?.processDataAvailable ? 'Live Collector' : 'Awaiting sample'}
                </div>
              </Link>
            </div>
          </div>

          <div className="pt-3 border-t border-dark-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-[#22D3EE]" />
              Net RX / TX:
            </span>
            <span className="text-slate-200">
              {formatRate(latestMetric?.netRecvRateBps)} / {formatRate(latestMetric?.netSentRateBps)}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Incidents & Recent Recovery Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Recent Incidents
            </h2>
            <Link to="/detection" className="text-xs font-mono text-[#A78BFA] hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-dark-800">
            {summary?.recentIncidents && summary.recentIncidents.length > 0 ? (
              summary.recentIncidents.slice(0, 5).map((incident) => (
                <div key={incident.id} className="py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-200">{incident.title}</span>
                    <StatusBadge status={incident.status} />
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">{incident.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-slate-500">
                    <span className="text-rose-400">Severity: {incident.severity}</span>
                    <span>·</span>
                    <span>Agent: {incident.detectedByAgent}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center font-mono">No active or recorded incidents.</p>
            )}
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Recent Recovery Activities
            </h2>
            <Link to="/recovery/history" className="text-xs font-mono text-[#A78BFA] hover:underline flex items-center gap-1">
              Full History <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-dark-800">
            {recoveries.length > 0 ? (
              recoveries.slice(0, 5).map((act) => (
                <div key={act.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-200 font-mono">
                      {act.actionType} <span className="text-slate-500 font-normal">· Incident #{act.incidentId}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Risk: {act.riskLevel} · Verification: {act.verificationStatus}
                    </div>
                  </div>
                  <StatusBadge status={act.status} />
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center font-mono">No recovery actions recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
