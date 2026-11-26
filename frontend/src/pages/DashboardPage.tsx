import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Radar,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import apiClient from '../api/client';
import { useLiveEvents } from '../contexts/LiveEventsContext';
import {
  AnomalyEvent,
  CollectorStatus,
  DashboardSummary,
  DockerSnapshotResponse,
  MonitoredServer,
  RecoveryAction,
  RecoveryRecommendation,
  SystemMetric,
} from '../types';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricBar } from '../components/ui/MetricBar';
import { ErrorBanner } from '../components/ui/Banners';
import { SystemHealthBanner } from '../components/dashboard/SystemHealthBanner';
import { SelfHealingLifecycle } from '../components/dashboard/SelfHealingLifecycle';
import { AiIntelligencePanel } from '../components/dashboard/AiIntelligencePanel';
import { LiveActivityFeed } from '../components/dashboard/LiveActivityFeed';
import { QuickActionsBar } from '../components/dashboard/QuickActionsBar';

const formatRate = (bps?: number | null) => {
  if (bps == null) return '0 B/s';
  if (bps < 1024) return `${bps.toFixed(0)} B/s`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
};

const formatAge = (iso?: string | null) => {
  if (!iso) return '—';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
};

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [servers, setServers] = useState<MonitoredServer[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [recoveries, setRecoveries] = useState<RecoveryAction[]>([]);
  const [recommendations, setRecommendations] = useState<RecoveryRecommendation[]>([]);
  const [latestMetric, setLatestMetric] = useState<SystemMetric | null>(null);
  const [metricHistory, setMetricHistory] = useState<SystemMetric[]>([]);
  const [collectorStatus, setCollectorStatus] = useState<CollectorStatus | null>(null);
  const [dockerSnapshot, setDockerSnapshot] = useState<DockerSnapshotResponse | null>(null);
  const [aiReachable, setAiReachable] = useState<boolean | null>(null);

  const [timeWindow, setTimeWindow] = useState<'15m' | '1h' | '6h' | '24h'>('1h');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const now = new Date();
      const hoursMap = { '15m': 0.25, '1h': 1, '6h': 6, '24h': 24 };
      const from = new Date(now.getTime() - hoursMap[timeWindow] * 3600 * 1000).toISOString();

      const [
        sumRes,
        srvRes,
        anomRes,
        recRes,
        recPlanRes,
        latestRes,
        histRes,
        colRes,
        docRes,
        agentRes,
      ] = await Promise.all([
        apiClient.get('/dashboard/summary'),
        apiClient.get('/servers'),
        apiClient.get('/anomalies'),
        apiClient.get('/recovery'),
        apiClient.get('/recovery/recommendations'),
        apiClient.get('/monitoring/system/latest'),
        apiClient.get('/monitoring/system/history', {
          params: { from, to: now.toISOString(), limit: 120 },
        }),
        apiClient.get('/monitoring/collector/status'),
        apiClient.get('/monitoring/docker/containers'),
        apiClient.get('/agents/status').catch(() => ({ data: { data: { reachable: false } } })),
      ]);

      setSummary(sumRes.data?.data ?? null);
      setServers(srvRes.data?.data ?? []);
      setAnomalies(anomRes.data?.data ?? []);
      setRecoveries(recRes.data?.data ?? []);
      setRecommendations(recPlanRes.data?.data ?? []);
      setLatestMetric(latestRes.data?.data ?? null);
      setMetricHistory(histRes.data?.data ?? []);
      setCollectorStatus(colRes.data?.data ?? null);
      setDockerSnapshot(docRes.data?.data ?? null);
      setAiReachable(Boolean(agentRes.data?.data?.reachable));
      setLastUpdated(new Date());
      setError(null);
    } catch {
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

  const { subscribe } = useLiveEvents();
  useEffect(() => {
    return subscribe(() => {
      fetchDashboardData();
    });
  }, [subscribe, fetchDashboardData]);

  const recentIncidents = useMemo(() => summary?.recentIncidents ?? [], [summary]);
  const activeIncidentList = useMemo(
    () => recentIncidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status)),
    [recentIncidents]
  );

  const onlineServers = servers.filter((s) => s.status === 'ONLINE').length;
  const degradedServers = servers.filter((s) => s.status === 'DEGRADED').length;
  const offlineServers = servers.filter((s) => s.status === 'OFFLINE').length;

  const totalApps = summary?.totalApplications ?? 0;
  const healthyApps = summary?.healthyApplications ?? 0;
  const degradedApps = summary?.unhealthyApplications ?? 0;

  const criticalIncidents = activeIncidentList.filter((i) => i.severity === 'CRITICAL').length;
  const highIncidents = activeIncidentList.filter((i) => i.severity === 'HIGH').length;
  const mediumIncidents = activeIncidentList.filter((i) => i.severity === 'MEDIUM').length;
  const lowIncidents = activeIncidentList.filter((i) => i.severity === 'LOW').length;

  const activeAnomalies = anomalies.filter((a) => a.status === 'ACTIVE').length;

  const verifiedRecoveries = recoveries.filter(
    (r) => r.status === 'VERIFIED' || r.verificationStatus === 'VERIFIED'
  ).length;
  const failedRecoveries = recoveries.filter((r) => r.status === 'FAILED').length;
  const pendingRecoveries = recoveries.filter((r) =>
    ['PENDING', 'AWAITING_APPROVAL', 'APPROVED', 'EXECUTING', 'VERIFYING'].includes(r.status)
  ).length;

  const degradationReasons: string[] = [];
  if (criticalIncidents > 0) {
    degradationReasons.push(`${criticalIncidents} critical incident${criticalIncidents > 1 ? 's' : ''} active`);
  } else if ((summary?.activeIncidents ?? 0) > 0) {
    degradationReasons.push(`${summary?.activeIncidents} active incident${(summary?.activeIncidents ?? 0) > 1 ? 's' : ''}`);
  }
  if (offlineServers > 0) {
    degradationReasons.push(`${offlineServers} infrastructure node${offlineServers > 1 ? 's' : ''} offline`);
  }
  if (degradedServers > 0) {
    degradationReasons.push(`${degradedServers} infrastructure node${degradedServers > 1 ? 's' : ''} degraded`);
  }
  if (degradedApps > 0) {
    degradationReasons.push(`${degradedApps} monitored service${degradedApps > 1 ? 's' : ''} unhealthy`);
  }
  if (failedRecoveries > 0) {
    degradationReasons.push(`${failedRecoveries} failed recovery attempt${failedRecoveries > 1 ? 's' : ''}`);
  }
  if (collectorStatus?.status === 'DEGRADED') {
    degradationReasons.push('Telemetry collector degraded');
  }
  if (aiReachable === false) {
    degradationReasons.push('AI service offline (deterministic fallback active)');
  }

  const overallHealthStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' =
    criticalIncidents > 0 || offlineServers > 0
      ? 'CRITICAL'
      : degradedApps > 0 ||
        degradedServers > 0 ||
        (summary?.activeIncidents ?? 0) > 0 ||
        collectorStatus?.status === 'DEGRADED'
      ? 'DEGRADED'
      : 'HEALTHY';

  const serverChartData = [
    { name: 'Online', value: onlineServers, color: '#34D399' },
    { name: 'Degraded', value: degradedServers, color: '#F59E0B' },
    { name: 'Offline', value: offlineServers, color: '#F43F5E' },
  ].filter((d) => d.value > 0);

  const timelineData = metricHistory.map((m) => ({
    time: new Date(m.collectedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    cpu: m.cpuPercent,
    memory: m.memoryPercent,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-muted)] font-mono text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-3 text-[#10B981] motion-reduce:animate-none" />
        Querying live host telemetry &amp; incident records...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="sharp-page-title font-mono">Resilience Command Center</h1>
            <StatusBadge status={overallHealthStatus} />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Autonomous infrastructure observability, anomaly triage, root cause analysis, and closed-loop recovery.
            {lastUpdated && (
              <span className="font-mono text-[#64748B] ml-2">
                · Last updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label="Telemetry time window"
            className="flex rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] p-0.5 text-[11px] font-mono"
          >
            {(['15m', '1h', '6h', '24h'] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setTimeWindow(w)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  timeWindow === w
                    ? 'bg-[#10B981]/15 text-[#34D399]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={isRefreshing}
            className="sharp-btn-secondary"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRefreshing ? 'animate-spin text-[#10B981] motion-reduce:animate-none' : ''
              }`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchDashboardData} />}

      {/* 2. Platform Health */}
      <SystemHealthBanner
        overallStatus={overallHealthStatus}
        degradationReasons={degradationReasons}
        onlineServers={onlineServers}
        degradedServers={degradedServers}
        offlineServers={offlineServers}
        activeIncidents={summary?.activeIncidents ?? 0}
        activeAnomalies={activeAnomalies}
        collectorStatus={collectorStatus?.status}
      />

      {/* 3. KPI Overview */}
      <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Link to="/servers" className="block">
          <StatCard
            title="Monitored Servers"
            value={servers.length}
            subtitle={`${onlineServers} online · ${offlineServers} offline`}
            icon={Server}
            color="text-[#34D399]"
          />
        </Link>
        <Link to="/applications" className="block">
          <StatCard
            title="Healthy Services"
            value={`${healthyApps}/${totalApps}`}
            subtitle={degradedApps > 0 ? `${degradedApps} degraded` : 'All registered healthy'}
            icon={Layers}
            color="text-[#38BDF8]"
          />
        </Link>
        <Link to="/incidents" className="block">
          <StatCard
            title="Active Incidents"
            value={summary?.activeIncidents ?? 0}
            subtitle={`${criticalIncidents} critical severity`}
            icon={AlertTriangle}
            color={criticalIncidents > 0 ? 'text-[#F43F5E]' : 'text-[#F59E0B]'}
          />
        </Link>
        <Link to="/detection" className="block">
          <StatCard
            title="Active Anomalies"
            value={activeAnomalies}
            subtitle={`${anomalies.length} total recorded`}
            icon={Radar}
            color={activeAnomalies > 0 ? 'text-[#F59E0B]' : 'text-[#38BDF8]'}
          />
        </Link>
        <Link to="/recovery/history" className="block">
          <StatCard
            title="Recovery Success"
            value={
              summary?.recoverySuccessRate != null
                ? `${summary.recoverySuccessRate}%`
                : 'N/A'
            }
            subtitle={`${recoveries.length} total executions`}
            icon={CheckCircle2}
            color="text-[#34D399]"
          />
        </Link>
        <Link to="/analytics" className="block">
          <StatCard
            title="MTTR"
            value={
              summary?.avgRecoveryTimeSeconds != null
                ? `${summary.avgRecoveryTimeSeconds}s`
                : 'N/A'
            }
            subtitle="Mean time to resolve"
            icon={Clock}
            color="text-[#38BDF8]"
          />
        </Link>
      </section>

      {/* 4. Self-Healing Lifecycle Centerpiece */}
      <SelfHealingLifecycle
        anomalies={anomalies}
        incidents={recentIncidents}
        recommendations={recommendations}
        recoveries={recoveries}
      />

      {/* 5. Resource Intelligence + Infrastructure Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section aria-labelledby="resource-heading" className="lg:col-span-2 sharp-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="resource-heading" className="sharp-section-title flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#38BDF8]" />
                <span>Host Resource Intelligence ({timeWindow})</span>
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Real CPU % and Memory % on {latestMetric?.hostName || 'host'} ({timelineData.length} samples)
              </p>
            </div>
            <div className="flex items-center gap-3">
              {collectorStatus && <StatusBadge status={collectorStatus.status} />}
              <Link
                to="/monitoring/system"
                className="text-xs font-mono text-[#34D399] hover:underline inline-flex items-center gap-1"
              >
                <span>System Monitoring</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="h-56 w-full">
            {timelineData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-mono text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-lg">
                Awaiting telemetry samples in the selected {timeWindow} window.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cmdCpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cmdMemGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="time" stroke="#8B9BB4" fontSize={10} />
                  <YAxis stroke="#8B9BB4" fontSize={10} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#192230',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#F1F5F9',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#8B9BB4' }} />
                  <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#cmdCpuGrad)" connectNulls />
                  <Area type="monotone" dataKey="memory" name="Memory %" stroke="#38BDF8" strokeWidth={2} fillOpacity={1} fill="url(#cmdMemGrad)" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[var(--border-subtle)]">
            {latestMetric?.cpuPercent != null ? (
              <MetricBar label="Host CPU" value={latestMetric.cpuPercent} color="bg-[#10B981]" />
            ) : (
              <div className="text-xs font-mono text-[var(--text-muted)]">Host CPU: Awaiting telemetry</div>
            )}
            {latestMetric?.memoryPercent != null ? (
              <MetricBar label="Host Memory" value={latestMetric.memoryPercent} color="bg-[#38BDF8]" />
            ) : (
              <div className="text-xs font-mono text-[var(--text-muted)]">Host Memory: Awaiting telemetry</div>
            )}
            {latestMetric?.diskPercent != null ? (
              <MetricBar label="Host Disk" value={latestMetric.diskPercent} color="bg-[#F59E0B]" />
            ) : (
              <div className="text-xs font-mono text-[var(--text-muted)]">Host Disk: Awaiting telemetry</div>
            )}
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-[#38BDF8]" />
              Network RX / TX:{' '}
              <strong className="text-[var(--text-main)]">
                {formatRate(latestMetric?.netRecvRateBps)} / {formatRate(latestMetric?.netSentRateBps)}
              </strong>
            </span>
            <div className="flex items-center gap-3">
              <Link to="/monitoring/docker" className="hover:text-[#34D399]">
                Docker:{' '}
                {dockerSnapshot?.available
                  ? `${dockerSnapshot.containers.filter((c) => c.status === 'RUNNING').length}/${dockerSnapshot.containers.length} Running`
                  : 'Unavailable'}
              </Link>
              <Link to="/monitoring/processes" className="hover:text-[#34D399]">
                Processes: {collectorStatus?.processDataAvailable ? 'Live Collector' : 'Awaiting'}
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="infra-heading" className="sharp-card p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id="infra-heading" className="sharp-section-title flex items-center gap-2">
              <Server className="w-4 h-4 text-[#34D399]" />
              <span>Infrastructure Intelligence</span>
            </h2>
            <Link
              to="/servers"
              className="text-xs font-mono text-[#34D399] hover:underline inline-flex items-center gap-1"
            >
              <span>All Nodes</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
            <div className="p-2 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30">
              <div className="text-[#34D399] font-bold text-sm">{onlineServers}</div>
              <div className="text-[var(--text-muted)] text-[10px]">ONLINE</div>
            </div>
            <div className="p-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30">
              <div className="text-[#F59E0B] font-bold text-sm">{degradedServers}</div>
              <div className="text-[var(--text-muted)] text-[10px]">DEGRADED</div>
            </div>
            <div className="p-2 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/30">
              <div className="text-[#F43F5E] font-bold text-sm">{offlineServers}</div>
              <div className="text-[var(--text-muted)] text-[10px]">OFFLINE</div>
            </div>
          </div>

          {serverChartData.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-lg">
              No monitored servers registered yet.
            </div>
          ) : (
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serverChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={34}
                    outerRadius={54}
                    paddingAngle={3}
                  >
                    {serverChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#192230',
                      borderColor: '#334155',
                      fontSize: 12,
                      color: '#F1F5F9',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#8B9BB4' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="divide-y divide-[var(--border-subtle)]">
            {servers.slice(0, 4).map((srv) => (
              <div key={srv.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-mono text-[var(--text-main)] truncate">{srv.hostName}</div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                    {srv.ipAddress} · {srv.osType}
                  </div>
                </div>
                <StatusBadge status={srv.status} />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 6. Incident Intelligence + SHARP AI Intelligence Center */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section aria-labelledby="incident-intel-heading" className="sharp-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id="incident-intel-heading" className="sharp-section-title flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#F43F5E]" />
              <span>Incident Intelligence</span>
            </h2>
            <Link
              to="/incidents"
              className="text-xs font-mono text-[#34D399] hover:underline inline-flex items-center gap-1"
            >
              <span>Manage Incidents</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center font-mono text-[11px]">
            <div className="p-2 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/30">
              <div className="text-[#F43F5E] font-bold text-sm">{criticalIncidents}</div>
              <div className="text-[var(--text-muted)] text-[10px]">CRITICAL</div>
            </div>
            <div className="p-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30">
              <div className="text-[#F59E0B] font-bold text-sm">{highIncidents}</div>
              <div className="text-[var(--text-muted)] text-[10px]">HIGH</div>
            </div>
            <div className="p-2 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/30">
              <div className="text-[#38BDF8] font-bold text-sm">{mediumIncidents}</div>
              <div className="text-[var(--text-muted)] text-[10px]">MEDIUM</div>
            </div>
            <div className="p-2 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30">
              <div className="text-[#34D399] font-bold text-sm">{lowIncidents}</div>
              <div className="text-[var(--text-muted)] text-[10px]">LOW</div>
            </div>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {recentIncidents.length > 0 ? (
              recentIncidents.slice(0, 4).map((incident) => (
                <div key={incident.id} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[var(--text-main)] truncate">
                      #{incident.id} {incident.title}
                    </span>
                    <StatusBadge status={incident.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-[var(--text-muted)]">
                    <span
                      className={
                        incident.severity === 'CRITICAL'
                          ? 'text-[#F43F5E]'
                          : incident.severity === 'HIGH'
                          ? 'text-[#F59E0B]'
                          : 'text-[#38BDF8]'
                      }
                    >
                      {incident.severity}
                    </span>
                    <span>·</span>
                    <span>Age: {formatAge(incident.openedAt)}</span>
                    <span>·</span>
                    <span>RCA: {incident.rcaStatus || 'PENDING'}</span>
                    <span>·</span>
                    <span>Recovery: {incident.recoveryStatus || 'NONE'}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--text-muted)] py-6 text-center font-mono">
                No active or recorded incidents.
              </p>
            )}
          </div>
        </section>

        <AiIntelligencePanel
          aiReachable={aiReachable}
          incidents={recentIncidents}
          anomalies={anomalies}
          recommendations={recommendations}
        />
      </div>

      {/* 7. Recovery Operations + Real-Time Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section aria-labelledby="recovery-ops-heading" className="sharp-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id="recovery-ops-heading" className="sharp-section-title flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#34D399]" />
              <span>Recovery Operations</span>
            </h2>
            <div className="flex items-center gap-3 text-xs font-mono">
              <Link to="/recovery" className="text-[#38BDF8] hover:underline">
                Manage
              </Link>
              <Link
                to="/recovery/history"
                className="text-[#34D399] hover:underline inline-flex items-center gap-1"
              >
                <span>History</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
            <div className="p-2 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30">
              <div className="text-[#34D399] font-bold text-sm">{verifiedRecoveries}</div>
              <div className="text-[var(--text-muted)] text-[10px]">VERIFIED</div>
            </div>
            <div className="p-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30">
              <div className="text-[#F59E0B] font-bold text-sm">{pendingRecoveries}</div>
              <div className="text-[var(--text-muted)] text-[10px]">IN FLIGHT</div>
            </div>
            <div className="p-2 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/30">
              <div className="text-[#F43F5E] font-bold text-sm">{failedRecoveries}</div>
              <div className="text-[var(--text-muted)] text-[10px]">FAILED</div>
            </div>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {recoveries.length > 0 ? (
              recoveries.slice(0, 5).map((act) => (
                <div key={act.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--text-main)] font-mono truncate">
                      {act.actionType}{' '}
                      <span className="text-[var(--text-muted)] font-normal">
                        · Incident #{act.incidentId}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5 truncate">
                      Risk: {act.riskLevel} · Verification: {act.verificationStatus} · {formatAge(act.initiatedAt)}
                    </div>
                  </div>
                  <StatusBadge status={act.status} />
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--text-muted)] py-6 text-center font-mono">
                No recovery actions executed yet.
              </p>
            )}
          </div>
        </section>

        <LiveActivityFeed />
      </div>

      {/* 8. Quick Operations */}
      <QuickActionsBar />
    </div>
  );
};
