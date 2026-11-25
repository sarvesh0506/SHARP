import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import { Application, Incident, RecoveryAction } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { ErrorBanner, UnavailableBanner } from '../components/ui/Banners';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  Activity,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#F43F5E',
  HIGH: '#F59E0B',
  MEDIUM: '#7C3AED',
  LOW: '#34D399',
};

export const AnalyticsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const [incRes, recRes, appRes] = await Promise.all([
        apiClient.get('/incidents'),
        apiClient.get('/recovery'),
        apiClient.get('/applications'),
      ]);
      setIncidents(incRes.data?.data ?? []);
      setActions(recRes.data?.data ?? []);
      setApplications(appRes.data?.data ?? []);
      setError(null);
    } catch {
      setError('Unable to load analytics data from SHARP backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const ts = new Date(inc.openedAt).getTime();
      if (dateFrom && ts < new Date(dateFrom).getTime()) return false;
      if (dateTo && ts > new Date(dateTo).getTime() + 86400000 - 1) return false;
      return true;
    });
  }, [incidents, dateFrom, dateTo]);

  const filteredActions = useMemo(() => {
    return actions.filter((act) => {
      const ts = new Date(act.initiatedAt).getTime();
      if (dateFrom && ts < new Date(dateFrom).getTime()) return false;
      if (dateTo && ts > new Date(dateTo).getTime() + 86400000 - 1) return false;
      return true;
    });
  }, [actions, dateFrom, dateTo]);

  // Real computed KPIs
  const availability = applications.length
    ? `${((applications.filter((a) => a.status === 'HEALTHY').length / applications.length) * 100).toFixed(1)}%`
    : 'N/A';

  const successRate = filteredActions.length
    ? `${(
        (filteredActions.filter(
          (a) => a.status === 'SUCCESS' || a.verificationStatus === 'VERIFIED_SUCCESS'
        ).length /
          filteredActions.length) *
        100
      ).toFixed(1)}%`
    : 'N/A';

  const mttrSeconds = (() => {
    const completed = filteredActions.filter((a) => a.initiatedAt && a.completedAt);
    if (completed.length === 0) return 'N/A';
    const avg =
      completed.reduce(
        (sum, a) => sum + (new Date(a.completedAt!).getTime() - new Date(a.initiatedAt).getTime()) / 1000,
        0
      ) / completed.length;
    return `${avg.toFixed(1)}s`;
  })();

  // Fault distribution by severity
  const severityData = useMemo(() => {
    const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    filteredIncidents.forEach((i) => {
      counts[i.severity] = (counts[i.severity] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredIncidents]);

  // Incident trends grouped by date
  const incidentTrendData = useMemo(() => {
    const map: Record<string, { date: string; total: number; resolved: number }> = {};
    filteredIncidents.forEach((i) => {
      const d = new Date(i.openedAt).toLocaleDateString();
      if (!map[d]) map[d] = { date: d, total: 0, resolved: 0 };
      map[d].total += 1;
      if (i.status === 'RESOLVED') map[d].resolved += 1;
    });
    return Object.values(map);
  }, [filteredIncidents]);

  // Recovery outcome distribution
  const recoveryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredActions.forEach((a) => {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [filteredActions]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Reports"
        subtitle="Incident trends, system availability, MTTR, recovery success rate, and fault distribution."
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* Date Range Filter */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-4 shadow-lg flex flex-wrap items-center gap-4 text-xs font-mono">
        <span className="text-slate-400 uppercase">Date Range:</span>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
            className="text-[#A78BFA] hover:underline ml-auto"
          >
            Clear Dates
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="System Availability" value={availability} subtitle="Healthy / total services" icon={Activity} color="text-emerald-400" />
        <StatCard title="Recovery Success Rate" value={successRate} subtitle={`${filteredActions.length} total actions`} icon={CheckCircle2} color="text-[#A78BFA]" />
        <StatCard title="Mean Time to Recovery" value={mttrSeconds} subtitle="Completed recoveries" icon={Clock} color="text-cyan-400" />
        <StatCard title="Total Incidents" value={filteredIncidents.length} subtitle="Within selected range" icon={AlertTriangle} color="text-amber-400" />
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-xs">
          <RefreshCw className="w-5 h-5 animate-spin inline mr-2 text-[#7C3AED]" />
          Computing analytics...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1B2540', borderColor: '#26324A', fontSize: 12 }}
                  />
                  <Bar dataKey="count" name="Actions" fill="#22D3EE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Resource Utilization Trends Placeholder */}
          <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">Historical Resource Utilization Trends</h2>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                AWAITING PHASE 2
              </span>
            </div>
            <UnavailableBanner
              feature="Time-series resource utilization"
              message="Requires Phase 2 system_metrics table and /api/v1/metrics/system/history endpoint."
            />
          </div>
        </div>
      )}
    </div>
  );
};
