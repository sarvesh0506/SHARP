import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Search,
  Shield,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { usersApi } from '../api/users';
import { useAuth } from '../contexts/AuthContext';
import { UserPageResponse, UserRole, UserSummary } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { ErrorBanner } from '../components/ui/Banners';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

type PendingAction =
  | { type: 'role'; user: UserSummary; targetRole: UserRole }
  | { type: 'status'; user: UserSummary; targetEnabled: boolean }
  | null;

const formatTimestamp = (iso?: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export const UserManagementPage: React.FC = () => {
  const { user: currentUser, isAdmin } = useAuth();

  const [pageData, setPageData] = useState<UserPageResponse>({
    items: [],
    totalElements: 0,
    totalPages: 0,
    page: 0,
    size: 20,
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Query state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  // Confirmation modal state
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [mutating, setMutating] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    try {
      setIsRefreshing(true);
      const enabledParam =
        statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE';
      const data = await usersApi.listUsers({
        search: debouncedSearch,
        role: roleFilter,
        enabled: enabledParam,
        sortBy,
        sortDir,
        page,
        size,
      });
      setPageData(data);
      setError(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 403
          ? 'Administrator privileges are required to view user accounts.'
          : 'Unable to load users from SHARP backend.');
      setError(msg);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [isAdmin, debouncedSearch, roleFilter, statusFilter, sortBy, sortDir, page, size]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setSortBy('id');
    setSortDir('asc');
    setPage(0);
  };

  const hasActiveFilters =
    searchInput.trim() !== '' || roleFilter !== 'ALL' || statusFilter !== 'ALL';

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    try {
      setMutating(true);
      setError(null);
      setSuccessNotice(null);

      if (pendingAction.type === 'role') {
        const res = await usersApi.updateUserRole(
          pendingAction.user.id,
          pendingAction.targetRole
        );
        setSuccessNotice(
          res.message ||
            `Updated ${pendingAction.user.username} role to ${pendingAction.targetRole}.`
        );
      } else {
        const res = await usersApi.updateUserStatus(
          pendingAction.user.id,
          pendingAction.targetEnabled
        );
        setSuccessNotice(
          res.message ||
            `${pendingAction.user.username} account ${
              pendingAction.targetEnabled ? 'enabled' : 'disabled'
            }.`
        );
      }
      setPendingAction(null);
      await fetchUsers();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Unable to complete user management operation.';
      setError(msg);
      setPendingAction(null);
    } finally {
      setMutating(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="User Management"
          subtitle="Role-based access control and operator account administration."
        />
        <div className="bg-dark-900 border border-[#F59E0B]/30 rounded-xl p-8 text-center max-w-xl mx-auto shadow-lg space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-slate-100">
            Administrator Access Required
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your current account (<span className="font-mono text-slate-200">{currentUser?.username}</span>)
            holds <span className="font-mono text-[#22D3EE]">{currentUser?.role}</span>. Only{' '}
            <span className="font-mono text-[#F59E0B]">ROLE_ADMIN</span> accounts can view and
            manage platform users.
          </p>
        </div>
      </div>
    );
  }

  const users = pageData.items ?? [];
  const activeOnPage = users.filter((u) => u.enabled).length;
  const disabledOnPage = users.filter((u) => !u.enabled).length;
  const adminsOnPage = users.filter((u) => u.role === 'ROLE_ADMIN').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage SHARP operator and administrator accounts, role assignments, and access status."
        onRefresh={fetchUsers}
        isRefreshing={isRefreshing}
      />

      {error && <ErrorBanner message={error} onRetry={fetchUsers} />}

      {successNotice && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#34D399]/10 border border-[#34D399]/35 text-[#34D399] text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="p-1 rounded hover:bg-[#34D399]/15 text-[#34D399] transition"
            aria-label="Dismiss success notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Matching Users"
          value={pageData.totalElements}
          subtitle={hasActiveFilters ? 'Filtered result count' : 'Registered platform accounts'}
          icon={Users}
          color="text-[#22D3EE]"
        />
        <StatCard
          title="Active (Current Page)"
          value={activeOnPage}
          subtitle={`Of ${users.length} displayed accounts`}
          icon={UserCheck}
          color="text-[#34D399]"
        />
        <StatCard
          title="Disabled (Current Page)"
          value={disabledOnPage}
          subtitle="Blocked from authentication"
          icon={UserX}
          color="text-[#F43F5E]"
        />
        <StatCard
          title="Admins (Current Page)"
          value={adminsOnPage}
          subtitle="Privileged ROLE_ADMIN users"
          icon={ShieldCheck}
          color="text-[#F59E0B]"
        />
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-4 shadow-lg flex flex-wrap items-center gap-3 text-xs font-mono">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by username or email..."
            aria-label="Search users"
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
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(0);
          }}
          aria-label="Filter by role"
          className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
        >
          <option value="ALL">All Roles</option>
          <option value="ROLE_ADMIN">ROLE_ADMIN</option>
          <option value="ROLE_OPERATOR">ROLE_OPERATOR</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'DISABLED');
            setPage(0);
          }}
          aria-label="Filter by account status"
          className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active Only</option>
          <option value="DISABLED">Disabled Only</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setPage(0);
          }}
          aria-label="Sort users by"
          className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
        >
          <option value="id">Sort: ID</option>
          <option value="username">Sort: Username</option>
          <option value="email">Sort: Email</option>
          <option value="role">Sort: Role</option>
          <option value="createdAt">Sort: Created</option>
        </select>

        <button
          type="button"
          onClick={() => {
            setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            setPage(0);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-300 hover:text-white hover:border-slate-500 transition"
          title="Toggle sort direction"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span>{sortDir.toUpperCase()}</span>
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-2 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/35 text-[#A78BFA] hover:bg-[#7C3AED]/25 transition"
          >
            Reset
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-xs font-mono text-slate-400">
            <div className="w-7 h-7 border-2 border-[#22D3EE] border-t-transparent rounded-full animate-spin" />
            <span>Loading platform user accounts...</span>
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title="No matching users found"
            description={
              hasActiveFilters
                ? 'No user accounts match the current search query or role/status filters.'
                : 'No user accounts are currently registered.'
            }
            icon={<Users className="w-8 h-8" />}
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
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
                    <th className="px-4 py-3.5">ID</th>
                    <th className="px-4 py-3.5">User</th>
                    <th className="px-4 py-3.5">Email</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Created</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800/80">
                  {users.map((u) => {
                    const isSelf =
                      currentUser?.username?.toLowerCase() === u.username.toLowerCase();
                    const nextRole: UserRole =
                      u.role === 'ROLE_ADMIN' ? 'ROLE_OPERATOR' : 'ROLE_ADMIN';

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-dark-850/70 transition-colors"
                      >
                        <td className="px-4 py-3.5 font-mono text-slate-500">
                          #{u.id}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100">
                              {u.username}
                            </span>
                            {isSelf && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/35">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-300">
                          {u.email}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${
                              u.role === 'ROLE_ADMIN'
                                ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                                : 'bg-[#22D3EE]/10 text-[#22D3EE] border-[#22D3EE]/30'
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${
                              u.enabled
                                ? 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/30'
                                : 'bg-[#F43F5E]/10 text-[#F43F5E] border-[#F43F5E]/30'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current" />
                            {u.enabled ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-400">
                          {formatTimestamp(u.createdAt)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAction({
                                  type: 'role',
                                  user: u,
                                  targetRole: nextRole,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium bg-dark-850 border border-dark-700 text-slate-200 hover:border-[#7C3AED] hover:text-[#A78BFA] transition"
                              title={`Change role to ${nextRole}`}
                            >
                              <UserCog className="w-3.5 h-3.5" />
                              <span>
                                {u.role === 'ROLE_ADMIN'
                                  ? 'Set Operator'
                                  : 'Make Admin'}
                              </span>
                            </button>

                            <button
                              type="button"
                              disabled={isSelf && u.enabled}
                              onClick={() =>
                                setPendingAction({
                                  type: 'status',
                                  user: u,
                                  targetEnabled: !u.enabled,
                                })
                              }
                              title={
                                isSelf && u.enabled
                                  ? 'Administrators cannot disable their own account'
                                  : u.enabled
                                  ? 'Disable account'
                                  : 'Enable account'
                              }
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium border transition ${
                                isSelf && u.enabled
                                  ? 'bg-dark-850/50 border-dark-800 text-slate-600 cursor-not-allowed'
                                  : u.enabled
                                  ? 'bg-[#F43F5E]/10 border-[#F43F5E]/30 text-[#F43F5E] hover:bg-[#F43F5E]/20'
                                  : 'bg-[#34D399]/10 border-[#34D399]/30 text-[#34D399] hover:bg-[#34D399]/20'
                              }`}
                            >
                              {u.enabled ? (
                                <>
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Disable</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Enable</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 bg-dark-850 border-t border-dark-700/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-3">
                <span>
                  Page {pageData.totalPages > 0 ? pageData.page + 1 : 0} of{' '}
                  {pageData.totalPages} ({pageData.totalElements} total)
                </span>
                <select
                  value={size}
                  onChange={(e) => {
                    setSize(Number(e.target.value));
                    setPage(0);
                  }}
                  aria-label="Rows per page"
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

      {/* Confirmation Dialog for Role & Status Changes */}
      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction?.type === 'role'
            ? 'Confirm Role Change'
            : pendingAction?.targetEnabled
            ? 'Confirm Account Activation'
            : 'Confirm Account Disable'
        }
        description={
          pendingAction?.type === 'role'
            ? pendingAction.targetRole === 'ROLE_ADMIN'
              ? `Promote "${pendingAction.user.username}" to ROLE_ADMIN? Administrators can manage users, approve HIGH-risk recoveries, and modify system thresholds.`
              : `Demote "${pendingAction.user.username}" from ROLE_ADMIN to ROLE_OPERATOR? They will lose access to user management and admin-only approvals.`
            : pendingAction?.targetEnabled
            ? `Re-enable account "${pendingAction?.user.username}"? The user will be able to authenticate and access SHARP again.`
            : `Disable account "${pendingAction?.user.username}"? Their active JWT requests will be rejected and they will be unable to sign in.`
        }
        details={
          pendingAction
            ? pendingAction.type === 'role'
              ? `User: ${pendingAction.user.username} (${pendingAction.user.email})\nRole: ${pendingAction.user.role} -> ${pendingAction.targetRole}`
              : `User: ${pendingAction.user.username} (${pendingAction.user.email})\nStatus: ${pendingAction.user.enabled ? 'ACTIVE' : 'DISABLED'} -> ${pendingAction.targetEnabled ? 'ACTIVE' : 'DISABLED'}`
            : undefined
        }
        confirmLabel={
          pendingAction?.type === 'role'
            ? 'Update Role'
            : pendingAction?.targetEnabled
            ? 'Enable Account'
            : 'Disable Account'
        }
        variant={
          pendingAction?.type === 'status' && !pendingAction.targetEnabled
            ? 'danger'
            : pendingAction?.type === 'role'
            ? 'warning'
            : 'primary'
        }
        loading={mutating}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          if (!mutating) setPendingAction(null);
        }}
      />
    </div>
  );
};
