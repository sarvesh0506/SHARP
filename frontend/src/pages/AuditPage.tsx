import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import { AuditLog } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorBanner } from '../components/ui/Banners';
import { RefreshCw, Search } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = async () => {
    try {
      setIsRefreshing(true);
      const res = await apiClient.get('/audit');
      if (res.data?.data) {
        setLogs(res.data.data);
      }
      setError(null);
    } catch {
      setError('Unable to load audit trail from SHARP backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const ts = new Date(log.timestamp).getTime();
      if (dateFrom && ts < new Date(dateFrom).getTime()) return false;
      if (dateTo && ts > new Date(dateTo).getTime() + 86400000 - 1) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${log.username} ${log.action} ${log.resourceType} ${log.resourceId ?? ''} ${log.details ?? ''} ${log.ipAddress ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance & Audit Trail"
        subtitle="Immutable records of operator authorizations, agent recoveries, and administrative changes."
        onRefresh={fetchLogs}
        isRefreshing={isRefreshing}
      />

      {error && <ErrorBanner message={error} onRetry={fetchLogs} />}

      {/* Search & Date Filters */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-4 shadow-lg flex flex-wrap items-center gap-3 text-xs font-mono">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor, action, resource, details..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
        <span className="text-slate-500 ml-auto">
          Showing {filteredLogs.length} of {logs.length}
        </span>
      </div>

      <div className="bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-850 border-b border-dark-700/80 text-slate-400 uppercase font-mono tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Resource</th>
                <th className="py-3.5 px-4">Details</th>
                <th className="py-3.5 px-4 font-mono">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800 text-slate-300 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#7C3AED]" />
                    Querying audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-dark-850/60 transition">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {log.username}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action.includes('RECOVERY')
                            ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                            : log.action.includes('LOGIN')
                            ? 'bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/35'
                            : 'bg-dark-800 text-slate-300'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {log.resourceType} {log.resourceId ? `#${log.resourceId}` : ''}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-300 max-w-xl truncate">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
