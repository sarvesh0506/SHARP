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
  const [selected, setSelected] = useState<RecoveryAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const fetchHistory = async () => {
    try {
      setIsRefreshing(true);
      const res = await apiClient.get('/recovery/executions');
      const list: RecoveryAction[] = res.data?.data ?? [];
      setActions(list);
      setSelected((prev) => (prev ? list.find((a) => a.id === prev.id) ?? list[0] ?? null : list[0] ?? null));
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
      if (actionFilter !== 'ALL' && a.actionType !== actionFilter) return false;
      const ts = new Date(a.initiatedAt).getTime();
      if (dateFrom && ts < new Date(dateFrom).getTime()) return false;
      if (dateTo && ts > new Date(dateTo).getTime() + 86400000 - 1) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${a.id} ${a.actionType} ${a.incidentId} ${a.incidentTitle ?? ''} ${a.approvedBy ?? ''} ${a.initiatedBy ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [actions, statusFilter, actionFilter, dateFrom, dateTo, search]);

  const uniqueActionTypes = useMemo(() => Array.from(new Set(actions.map((a) => a.actionType))), [actions]);
  const successCount = actions.filter((a) => a.status === 'VERIFIED' || a.status === 'SUCCESS').length;
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
        subtitle="Auditable ledger of executed recovery actions, durations, verification evidence, and failure reasons."
        onRefresh={fetchHistory}
        isRefreshing={isRefreshing}
      />

      {error && <ErrorBanner message={error} onRetry={fetchHistory} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Executions" value={actions.length} subtitle="All recorded attempts" icon={History} color="text-[#A4C3A2]" />
        <StatCard title="Verified / Succeeded" value={successCount} subtitle="Independently verified" icon={CheckCircle2} color="text-[#B0D4B8]" />
        <StatCard title="Failed / Rejected" value={failedCount} subtitle="Unsuccessful or denied" icon={XCircle} color={failedCount > 0 ? 'text-[#EAE7D6]' : 'text-[var(--text-muted)]'} />
        <StatCard title="Avg Duration" value={avgDuration} subtitle="Initiated → Verified" icon={Clock} color="text-[#D7F9FA]" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center text-xs font-mono">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, incident ID, actor..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)] focus:outline-none focus:border-[#5D7B6F]"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)]">
          <option value="ALL">All Statuses</option>
          <option value="VERIFIED">VERIFIED</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="AWAITING_APPROVAL">AWAITING_APPROVAL</option>
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)]">
          <option value="ALL">All Actions</option>
          {uniqueActionTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-2.5 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)]" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-2.5 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
          {loading ? (
            <div className="p-12 text-center text-[var(--text-muted)] font-mono text-xs">
              <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#5D7B6F]" />
              Loading recovery ledger...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<History className="w-8 h-8" />}
              title="No Recovery History Found"
              description="No recovery records match your current filters."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-850 border-b border-dark-700/80 text-[var(--text-muted)] uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Incident</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Result</th>
                    <th className="py-3 px-4">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800 font-mono text-[11px]">
                  {filtered.map((act) => {
                    const dur =
                      act.initiatedAt && act.completedAt
                        ? `${((new Date(act.completedAt).getTime() - new Date(act.initiatedAt).getTime()) / 1000).toFixed(1)}s`
                        : '—';
                    return (
                      <tr
                        key={act.id}
                        onClick={() => setSelected(act)}
                        className={`cursor-pointer hover:bg-dark-850/60 transition ${
                          selected?.id === act.id ? 'bg-dark-850 border-l-2 border-[#5D7B6F]' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-[var(--text-muted)]">#{act.id}</td>
                        <td className="py-3 px-4 font-semibold text-[var(--text-main)]">{act.actionType}</td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">#{act.incidentId}</td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">{dur}</td>
                        <td className="py-3 px-4"><StatusBadge status={act.status} /></td>
                        <td className="py-3 px-4"><StatusBadge status={act.verificationStatus} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Execution Log & Verification Evidence */}
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-main)] pb-3 border-b border-dark-800">
            Execution & Verification Log
          </h2>
          {selected ? (
            <div className="space-y-3 text-xs font-mono">
              <div className="text-[#A4C3A2]">Execution #{selected.id} · {selected.actionType}</div>
              <div className="text-[var(--text-muted)]">Target: <span className="text-[var(--text-main)]">{selected.targetResource || 'Host'}</span></div>
              <div className="text-[var(--text-muted)]">Initiated By: <span className="text-[var(--text-main)]">{selected.initiatedBy || 'SYSTEM'}</span></div>
              <div className="text-[var(--text-muted)]">Approved By: <span className="text-[var(--text-main)]">{selected.approvedBy || (selected.requiresApproval ? 'Pending' : 'Auto-Policy')}</span></div>
              {selected.executionDetails && (
                <div>
                  <div className="text-[var(--text-muted)] mb-1">Execution Output</div>
                  <pre className="p-2.5 rounded bg-dark-950 border border-dark-800 text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap">{selected.executionDetails}</pre>
                </div>
              )}
              {selected.verificationEvidence && (
                <div>
                  <div className="text-[var(--text-muted)] mb-1">Independent Verification Evidence</div>
                  <pre className="p-2.5 rounded bg-dark-950 border border-dark-800 text-[11px] text-[#D7F9FA] whitespace-pre-wrap">{selected.verificationEvidence}</pre>
                </div>
              )}
              {selected.failureReason && (
                <div className="p-2.5 rounded bg-[#EAE7D6]/10 border border-[#EAE7D6]/35 text-[#EAE7D6]">
                  Failure: {selected.failureReason}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)] font-mono">Select an execution row to inspect logs and verification evidence.</p>
          )}
        </div>
      </div>
    </div>
  );
};
