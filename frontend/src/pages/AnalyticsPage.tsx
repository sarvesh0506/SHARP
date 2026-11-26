import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  FileJson,
  Radar,
  RefreshCw,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
import { analyticsApi, TelemetryWindow } from '../api/analytics';
import { AnomalyEvent, Application, Incident, RecoveryAction, SystemMetric } from '../types';
import { downloadCsvReport, downloadJsonReport } from '../utils/exportReport';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { ErrorBanner } from '../components/ui/Banners';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#F43F5E',
  HIGH: '#F59E0B',
  MEDIUM: '#7C3AED',
  LOW: '#34D399',
  INFO: '#22D3EE',
};

const TELEMETRY_WINDOWS: TelemetryWindow[] = ['15m', '1h', '6h', '24h'];

export const AnalyticsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [history, setHistory] = useState<SystemMetric[]>([]);

  const [telemetryWindow, setTelemetryWindow] = useState<TelemetryWindow>('1h');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [bundle, hist] = await Promise.all([
        analyticsApi.fetchAnalyticsBundle(),
        analyticsApi.fetchSystemHistory(telemetryWindow, 200),
      ]);
      setIncidents(bundle.incidents);
      setActions(bundle.actions);
      setApplications(bundle.applications);
      setAnomalies(bundle.anomalies);
      setHistory(hist);
      setError(null);
      setHistoryError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load analytics data from SHARP backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [telemetryWindow]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleWindowChange = async (win: TelemetryWindow) => {
    setTelemetryWindow(win);
    try {
      setHistoryLoading(true);
      const hist = await analyticsApi.fetchSystemHistory(win, 200);
      setHistory(hist);
      setHistoryError(null);
    } catch (err: any) {
      setHistoryError(err?.response?.data?.message || 'Unable to load host telemetry history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const inDateRange = useCallback(
    (iso?: string | null) => {
      if (!iso) return false;
      const ts = new Date(iso).getTime();
      if (Number.isNaN(ts)) return false;
      if (dateFrom && ts < new Date(dateFrom).getTime()) return false;
      if (dateTo && ts > new Date(dateTo).getTime() + 86400000 - 1) return false;
      return true;
    },
    [dateFrom, dateTo]
  );

  const filteredIncidents = useMemo(
    () => (dateFrom || dateTo ? incidents.filter((i) => inDateRange(i.openedAt)) : incidents),
    [incidents, dateFrom, dateTo, inDateRange]
  );

  const filteredActions = useMemo(
    () => (dateFrom || dateTo ? actions.filter((a) => inDateRange(a.initiatedAt)) : actions),
    [actions, dateFrom, dateTo, inDateRange]
  );

  const filteredAnomalies = useMemo(
    () => (dateFrom || dateTo ? anomalies.filter((a) => inDateRange(a.detectedAt)) : anomalies),
    [anomalies, dateFrom, dateTo, inDateRange]
  );

  // Real computed KPIs matching Phase 4D-1C backend semantics
  const availability = applications.length
    ? `${((applications.filter((a) => a.status === 'HEALTHY').length / applications.length) * 100).toFixed(1)}%`
    : 'N/A';

  const successRate = filteredActions.length
    ? `${(
        (filteredActions.filter(
          (a) =>
            a.status === 'VERIFIED' ||
            a.verificationStatus === 'VERIFIED' ||
            a.status === 'SUCCESS'
        ).length /
          filteredActions.length) *
        100
      ).toFixed(1)}%`
    : 'N/A';

  const mttrSeconds = useMemo(() => {
    const resolved = filteredIncidents.filter(
      (i) =>
        (i.status === 'RESOLVED' || i.status === 'CLOSED') &&
        i.openedAt &&
        i.resolvedAt &&
        new Date(i.resolvedAt).getTime() >= new Date(i.openedAt).getTime()
    );
    if (resolved.length === 0) return 'N/A';
    const avg =
      resolved.reduce(
        (sum, i) =>
          sum + (new Date(i.resolvedAt!).getTime() - new Date(i.openedAt).getTime()) / 1000,
        0
      ) / resolved.length;
    return `${avg.toFixed(1)}s`;
  }, [filteredIncidents]);

  const severityData = useMemo(() => {
    const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    filteredIncidents.forEach((i) => {
      counts[i.severity] = (counts[i.severity] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredIncidents]);

  const incidentTrendData = useMemo(() => {
    const map: Record<string, { date: string; total: number; resolved: number }> = {};
    filteredIncidents.forEach((i) => {
      const d = new Date(i.openedAt).toLocaleDateString();
      if (!map[d]) map[d] = { date: d, total: 0, resolved: 0 };
      map[d].total += 1;
      if (i.status === 'RESOLVED' || i.status === 'CLOSED') map[d].resolved += 1;
    });
    return Object.values(map);
  }, [filteredIncidents]);

  const recoveryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredActions.forEach((a) => {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [filteredActions]);

  const anomalyMethodData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAnomalies.forEach((a) => {
      const key = a.detectionMethod || 'UNKNOWN';
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).map(([method, count]) => ({ method, count }));
  }, [filteredAnomalies]);

  const telemetryChartData = useMemo(() => {
    return history.map((m) => ({
      time: new Date(m.collectedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      cpu: m.cpuPercent != null ? Number(m.cpuPercent.toFixed(1)) : null,
      memory: m.memoryPercent != null ? Number(m.memoryPercent.toFixed(1)) : null,
      disk: m.diskPercent != null ? Number(m.diskPercent.toFixed(1)) : null,
    }));
  }, [history]);

  const handleExportIncidentsCsv = () => {
    downloadCsvReport(
      `sharp-incidents-report-${new Date().toISOString().slice(0, 10)}.csv`,
      ['ID', 'Title', 'Severity', 'Status', 'Source', 'Affected Resource', 'Recovery Status', 'Opened At', 'Resolved At'],
      filteredIncidents.map((i) => [
        i.id,
        i.title,
        i.severity,
        i.status,
        i.source,
        i.affectedResource,
        i.recoveryStatus,
        i.openedAt,
        i.resolvedAt,
      ])
    );
  };

  const handleExportJsonBundle = () => {
    downloadJsonReport(`sharp-analytics-report-${new Date().toISOString().slice(0, 10)}.json`, {
      generatedAt: new Date().toISOString(),
      dateFilter: { from: dateFrom || null, to: dateTo || null },
      summary: {
        availability,
        recoverySuccessRate: successRate,
        mttrSeconds,
        totalIncidents: filteredIncidents.length,
        totalRecoveryActions: filteredActions.length,
        totalAnomalies: filteredAnomalies.length,
      },
      incidents: filteredIncidents,
      recoveryActions: filteredActions,
      anomalies: filteredAnomalies,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Reports"
        subtitle="Real-time host resource trends, incident MTTR, anomaly detection breakdown, recovery outcomes, and exportable reports."
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* Date Range Filter & Export Actions */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-slate-400 uppercase">Date Range:</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Filter analytics from date"
              className="px-2.5 py-1.5 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Filter analytics to date"
              className="px-2.5 py-1.5 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="text-[#A78BFA] hover:underline"
            >
              Clear Dates
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={filteredIncidents.length === 0}
            onClick={handleExportIncidentsCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22D3EE]/10 border border-[#22D3EE]/30 text-[#22D3EE] hover:bg-[#22D3EE]/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Incidents CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportJsonBundle}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/35 text-[#A78BFA] hover:bg-[#7C3AED]/25 transition"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Export JSON Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="System Availability"
          value={availability}
          subtitle="Healthy / total services"
          icon={Activity}
          color="text-emerald-400"
        />
        <StatCard
          title="Recovery Success Rate"
          value={successRate}
          subtitle={`${filteredActions.length} total actions`}
          icon={CheckCircle2}
          color="text-[#A78BFA]"
        />
        <StatCard
          title="Mean Time to Resolve"
          value={mttrSeconds}
          subtitle="Resolved incidents (opened → resolved)"
          icon={Clock}
          color="text-cyan-400"
        />
        <StatCard
          title="Total Incidents"
          value={filteredIncidents.length}
          subtitle={`${filteredAnomalies.length} anomalies in range`}
          icon={AlertTriangle}
          color="text-amber-400"
        />
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-xs">
          <RefreshCw className="w-5 h-5 animate-spin inline mr-2 text-[#7C3AED]" />
          Computing analytics...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Historical Resource Utilization Trends (Real SystemMetric History) */}
          <div className="lg:col-span-2 bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#22D3EE]" />
                  Historical Resource Utilization Trends
                </h2>
                <p className="text-xs text-slate-500">
                  Real host CPU %, Memory %, and Disk % ({telemetryChartData.length} samples in {telemetryWindow})
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                {TELEMETRY_WINDOWS.map((win) => (
                  <button
                    key={win}
                    type="button"
                    onClick={() => handleWindowChange(win)}
                    className={`px-2.5 py-1 rounded-lg border transition ${
                      telemetryWindow === win
                        ? 'bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/40'
                        : 'bg-dark-850 text-slate-400 border-dark-700 hover:text-slate-200'
                    }`}
                  >
                    {win}
                  </button>
                ))}
              </div>
            </div>

            {historyError && <ErrorBanner message={historyError} onRetry={() => handleWindowChange(telemetryWindow)} />}

            {historyLoading ? (
              <div className="h-64 flex items-center justify-center text-xs font-mono text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin mr-2 text-[#22D3EE]" />
                Loading telemetry history...
              </div>
            ) : telemetryChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs font-mono text-slate-500 border border-dashed border-dark-800 rounded-lg">
                No host telemetry samples recorded in the {telemetryWindow} window.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={telemetryChartData}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26324A" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'monospace' }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1B2540', borderColor: '#26324A', fontSize: 12, color: '#E2E8F0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
                  <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#22D3EE" fill="url(#cpuGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="memory" name="Memory %" stroke="#A78BFA" fill="url(#memGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="disk" name="Disk %" stroke="#34D399" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Incident Trends */}
          <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#A78BFA]" />
              Incident Trends (Opened vs Resolved)
            </h2>
            {incidentTrendData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs font-mono text-slate-500 border border-dashed border-dark-800 rounded-lg">
                No incident records in the selected date range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={incidentTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26324A" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'monospace' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1B2540', borderColor: '#26324A', fontSize: 12, color: '#E2E8F0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
                  <Bar dataKey="total" name="Total Incidents" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" name="Resolved" fill="#34D399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Fault Severity Distribution */}
          <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">Fault Distribution by Severity</h2>
            {filteredIncidents.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs font-mono text-slate-500 border border-dashed border-dark-800 rounded-lg">
                No incident severity data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={severityData.filter((d) => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {severityData
                      .filter((d) => d.value > 0)
                      .map((entry) => (
                        <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#64748b'} />
                      ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1B2540', borderColor: '#26324A', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recovery Outcomes */}
          <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">Recovery Action Outcomes</h2>
            {recoveryDistribution.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs font-mono text-slate-500 border border-dashed border-dark-800 rounded-lg">
                No recovery actions recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={recoveryDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26324A" />
                  <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'monospace' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1B2540', borderColor: '#26324A', fontSize: 12 }}
                  />
                  <Bar dataKey="count" name="Actions" fill="#22D3EE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Anomaly Detection Method Breakdown */}
          <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Radar className="w-4 h-4 text-[#F59E0B]" />
              Anomaly Detection by Method
            </h2>
            {anomalyMethodData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs font-mono text-slate-500 border border-dashed border-dark-800 rounded-lg">
                No anomaly detections in the selected date range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={anomalyMethodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26324A" />
                  <XAxis dataKey="method" tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'monospace' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1B2540', borderColor: '#26324A', fontSize: 12 }}
                  />
                  <Bar dataKey="count" name="Anomalies" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
