import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { auditApi } from '../api/audit';
import { AuditPageResponse } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorBanner } from '../components/ui/Banners';
import { EmptyState } from '../components/ui/EmptyState';

export const AuditPage: React.FC = () => {
  const requestSeqRef = useRef(0);

  const [pageData, setPageData] = useState<AuditPageResponse>({
    items: [],
    totalElements: 0,
    totalPages: 0,
    page: 0,
    size: 20,
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchLogs = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    try {
      setIsRefreshing(true);
      const data = await auditApi.listPaged({
        search: debouncedSearch,
        action: actionFilter,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        sortDir,
        page,
        size,
      });
      if (seq !== requestSeqRef.current) return;
      setPageData(data);
      setError(null);
    } catch (err: any) {
      if (seq !== requestSeqRef.current) return;
      setError(err?.response?.data?.message || 'Unable to load audit trail from SHARP backend.');
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [debouncedSearch, actionFilter, dateFrom, dateTo, sortDir, page, size]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const hasFilters =
    searchInput.trim() !== '' ||
    actionFilter !== 'ALL' ||
    dateFrom !== '' ||
    dateTo !== '';

  const resetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setActionFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setSortDir('desc');
    setPage(0);
  };

  const logs = pageData.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance & Audit Trail"
        subtitle="Immutable, server-paginated records of operator authorizations, agent recoveries, and administrative changes."
        onRefresh={fetchLogs}
        isRefreshing={isRefreshing}
      />

      {error && <ErrorBanner message={error} onRetry={fetchLogs} />}

      {/* Search, Action & Date Filters */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-4 shadow-lg flex flex-wrap items-center gap-3 text-xs font-mono">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search actor, action, resource, details..."
            aria-label="Search audit logs"
            className="w-full pl-8 pr-8 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#7C3AED]"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(0);
          }}
          aria-label="Filter by audit action"
          className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
        >
          <option value="ALL">All Actions</option>
          <option value="USER_LOGIN">USER_LOGIN</option>
          <option value="USER_REGISTERED">USER_REGISTERED</option>
          <option value="USER_ROLE_UPDATED">USER_ROLE_UPDATED</option>
          <option value="USER_STATUS_UPDATED">USER_STATUS_UPDATED</option>
          <option value="INCIDENT_CREATED">INCIDENT_CREATED</option>
          <option value="RCA_COMPLETED">RCA_COMPLETED</option>
          <option value="RECOVERY_RECOMMENDED">RECOVERY_RECOMMENDED</option>
          <option value="RECOVERY_APPROVED">RECOVERY_APPROVED</option>
          <option value="SERVER_REGISTERED">SERVER_REGISTERED</option>
          <option value="SERVER_UPDATED">SERVER_UPDATED</option>
          <option value="SERVER_DELETED">SERVER_DELETED</option>
        </select>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
            aria-label="Filter audit logs from date"
            className="px-2.5 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
            aria-label="Filter audit logs to date"
            className="px-2.5 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
            setPage(0);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-300 hover:text-white transition"
          title="Toggle timestamp sort direction"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span>{sortDir.toUpperCase()}</span>
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-2 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/35 text-[#A78BFA] hover:bg-[#7C3AED]/25 transition"
          >
            Reset
          </button>
        )}
      </div>

      <div className="bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">
            <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#7C3AED]" />
            Querying audit trail...
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="No matching audit records found"
            description={
              hasFilters
                ? 'No audit log entries match the active search or date filters.'
                : 'No audit log entries recorded yet.'
            }
            action={
              hasFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3.5 py-2 rounded-lg text-xs font-mono bg-[#7C3AED]/15 border border-[#7C3AED]/35 text-[#A78BFA] hover:bg-[#7C3AED]/25 transition"
                >
                  Clear Filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
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
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-dark-850/60 transition">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-200">{log.username}</td>
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
                      <td className="py-3 px-4 text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 bg-dark-850 border-t border-dark-700/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-3">
                <span>
                  Page {pageData.totalPages > 0 ? pageData.page + 1 : 0} of {pageData.totalPages} (
                  {pageData.totalElements} total)
                </span>
                <select
                  value={size}
                  onChange={(e) => {
                    setSize(Number(e.target.value));
                    setPage(0);
                  }}
                  aria-label="Audit logs per page"
                  className="px-2 py-1 rounded bg-dark-900 border border-dark-700 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pageData.page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-900 border border-dark-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  disabled={pageData.page + 1 >= pageData.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-900 border border-dark-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
