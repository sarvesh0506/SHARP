import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import { RecoveryAction } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorBanner } from '../components/ui/Banners';
import { EmptyState } from '../components/ui/EmptyState';
import { History, CheckCircle2, XCircle, Clock, Search, RefreshCw } from 'lucide-react';

export const RecoveryHistoryPage: React.FC = () => {
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const fetchHistory = async () => {
    try {
      setIsRefreshing(true);
      const res = await apiClient.get('/recovery');
      setActions(res.data?.data ?? []);
      setError(null);
    } catch {
      setError('Unable to load recovery history from SHARP backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filtered = useMemo(() => {
    return actions.filter((a) => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${a.id} ${a.actionType} ${a.incidentId} ${a.incidentTitle ?? ''} ${a.approvedBy ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [actions, statusFilter, search]);

  const successCount = actions.filter((a) => a.status === 'SUCCESS').length;
  const failedCount = actions.filter((a) => a.status === 'FAILED' || a.status === 'REJECTED').length;
  const avgDuration = (() => {
    const completed = actions.filter((a) => a.initiatedAt && a.completedAt);
    if (completed.length === 0) return 'N/A';
    const totalSec = completed.reduce(
      (acc, a) => acc + (new Date(a.completedAt!).getTime() - new Date(a.initiatedAt).getTime()) / 1000,
      0
    );
    return `${(totalSec / completed.length).toFixed(1)}s`;
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recovery History"
        subtitle="Complete ledger of executed recovery actions, administrator approvals, and verification outcomes."
        onRefresh={fetchHistory}
        isRefreshing={isRefreshing}
      />

      {error && <ErrorBanner message={error} onRetry={fetchHistory} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Actions" value={actions.length} subtitle="All recorded attempts" icon={History} color="text-[#A78BFA]" />
        <StatCard title="Succeeded" value={successCount} subtitle="Completed recovery" icon={CheckCircle2} color="text-emerald-400" />
        <StatCard title="Failed / Rejected" value={failedCount} subtitle="Unsuccessful or denied" icon={XCircle} color={failedCount > 0 ? 'text-rose-400' : 'text-slate-400'} />
        <StatCard title="Avg Execution Time" value={avgDuration} subtitle="Initiated → Completed" icon={Clock} color="text-cyan-400" />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, incident ID, approver..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#7C3AED] font-mono"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by recovery status"
          className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED]"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="AWAITING_APPROVAL">AWAITING_APPROVAL</option>
          <option value="EXECUTING">EXECUTING</option>
        </select>
        <span className="text-xs font-mono text-slate-500 sm:ml-auto">
          Showing {filtered.length} of {actions.length}
        </span>
      </div>

      <div className="bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-xs">
            <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#7C3AED]" />
            Loading recovery ledger...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<History className="w-8 h-8" />}
            title="No Recovery History Found"
            description="No recovery records match your current search or status filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-850 border-b border-dark-700/80 text-slate-400 uppercase font-mono tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">ID</th>
                  <th className="py-3.5 px-4">Action Type</th>
                  <th className="py-3.5 px-4">Incident</th>
                  <th className="py-3.5 px-4">Risk</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Verification</th>
                  <th className="py-3.5 px-4">Approved By</th>
                  <th className="py-3.5 px-4">Initiated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800 text-slate-300 font-mono text-[11px]">
                {filtered.map((act) => (
                  <tr key={act.id} className="hover:bg-dark-850/60 transition">
                    <td className="py-3 px-4 text-slate-500">#{act.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-200">{act.actionType}</td>
                    <td className="py-3 px-4 text-slate-400">
                      #{act.incidentId} {act.incidentTitle ? `· ${act.incidentTitle}` : ''}
                    </td>
                    <td className="py-3 px-4">
                      <span className={act.riskLevel === 'HIGH' ? 'text-rose-400 font-bold' : 'text-[#A78BFA]'}>
                        {act.riskLevel}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={act.status} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={act.verificationStatus} />
                    </td>
                    <td className="py-3 px-4 text-slate-400">{act.approvedBy || (act.requiresApproval ? 'Pending' : 'Auto-Policy')}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(act.initiatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
