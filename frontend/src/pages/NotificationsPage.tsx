import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { notificationsApi } from '../api/notifications';
import { NotificationItem, NotificationPageResponse } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorBanner } from '../components/ui/Banners';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const NOTIFICATION_TYPES = [
  'ALL',
  'ANOMALY_DETECTED',
  'INCIDENT_CREATED',
  'INCIDENT_UPDATED',
  'INCIDENT_RESOLVED',
  'RECOVERY_APPROVAL_REQUIRED',
  'RECOVERY_STARTED',
  'RECOVERY_SUCCEEDED',
  'RECOVERY_FAILED',
  'SYSTEM_ALERT',
];

const getSeverityBadge = (severity: string) => {
  const s = (severity || '').toUpperCase();
  if (s === 'CRITICAL' || s === 'HIGH') {
    return 'bg-[#EAE7D6]/10 text-[#EAE7D6] border-[#EAE7D6]/30';
  }
  if (s === 'MEDIUM' || s === 'WARNING') {
    return 'bg-[#EAE7D6]/10 text-[#EAE7D6] border-[#EAE7D6]/30';
  }
  return 'bg-[#D7F9FA]/10 text-[#D7F9FA] border-[#D7F9FA]/30';
};

const resolveRoute = (n: NotificationItem): string | null => {
  if (n.recoveryExecutionId || n.type.startsWith('RECOVERY_')) return '/recovery';
  if (n.incidentId || n.type.startsWith('INCIDENT_')) return '/incidents';
  if (n.anomalyId || n.type === 'ANOMALY_DETECTED') return '/detection';
  return null;
};

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();

  const [pageData, setPageData] = useState<NotificationPageResponse>({
    items: [],
    totalElements: 0,
    totalPages: 0,
    page: 0,
    size: 20,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [readFilter, setReadFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const isRead =
        readFilter === 'ALL' ? undefined : readFilter === 'READ';
      const [listRes, countRes] = await Promise.all([
        notificationsApi.listNotifications({
          isRead,
          type: typeFilter,
          page,
          size,
        }),
        notificationsApi.getUnreadCount(),
      ]);
      setPageData(listRes);
      setUnreadCount(countRes);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load notifications from SHARP backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [readFilter, typeFilter, page, size]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkAsRead = async (item: NotificationItem) => {
    if (item.read) return;
    try {
      await notificationsApi.markAsRead(item.id);
      await fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to mark notification as read.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      await fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to mark all notifications as read.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await notificationsApi.deleteNotification(id);
      await fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete notification.');
    }
  };

  const handleClearAll = async () => {
    try {
      setClearing(true);
      await notificationsApi.deleteAllNotifications();
      setConfirmClearOpen(false);
      setPage(0);
      await fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to clear notifications.');
      setConfirmClearOpen(false);
    } finally {
      setClearing(false);
    }
  };

  const items = pageData.items ?? [];
  const hasFilters = readFilter !== 'ALL' || typeFilter !== 'ALL';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Center"
        subtitle={`Real-time operational alerts, anomaly detections, and recovery approval notifications (${unreadCount} unread).`}
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* Filter & Bulk Action Toolbar */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={readFilter}
            onChange={(e) => {
              setReadFilter(e.target.value as 'ALL' | 'UNREAD' | 'READ');
              setPage(0);
            }}
            aria-label="Filter by read status"
            className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)] focus:outline-none focus:border-[#5D7B6F]"
          >
            <option value="ALL">All Notifications</option>
            <option value="UNREAD">Unread Only</option>
            <option value="READ">Read Only</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(0);
            }}
            aria-label="Filter by notification type"
            className="px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)] focus:outline-none focus:border-[#5D7B6F]"
          >
            {NOTIFICATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === 'ALL' ? 'All Types' : t}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setReadFilter('ALL');
                setTypeFilter('ALL');
                setPage(0);
              }}
              className="px-3 py-2 rounded-lg bg-[#5D7B6F]/15 border border-[#5D7B6F]/35 text-[#A4C3A2] hover:bg-[#5D7B6F]/25 transition"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={unreadCount === 0}
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D7F9FA]/10 border border-[#D7F9FA]/30 text-[#D7F9FA] hover:bg-[#D7F9FA]/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Read</span>
          </button>

          <button
            type="button"
            disabled={pageData.totalElements === 0}
            onClick={() => setConfirmClearOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#EAE7D6]/10 border border-[#EAE7D6]/30 text-[#EAE7D6] hover:bg-[#EAE7D6]/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-xs font-mono text-[var(--text-muted)]">
            <div className="w-7 h-7 border-2 border-[#D7F9FA] border-t-transparent rounded-full animate-spin" />
            <span>Loading notifications...</span>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No notifications found"
            description={
              hasFilters
                ? 'No notifications match your current read-status or type filters.'
                : 'You have no notifications at this time.'
            }
            icon={<Bell className="w-8 h-8" />}
          />
        ) : (
          <>
            <div className="divide-y divide-dark-800/80">
              {items.map((item) => {
                const route = resolveRoute(item);
                return (
                  <div
                    key={item.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                      item.read ? 'bg-transparent' : 'bg-[#5D7B6F]/5'
                    } hover:bg-dark-850/70`}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-[#D7F9FA] shrink-0" />
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${getSeverityBadge(
                            item.severity
                          )}`}
                        >
                          {item.severity}
                        </span>
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                          {item.type}
                        </span>
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                          • {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-[var(--text-main)]">
                        {item.title}
                      </h3>
                      {item.message && (
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                          {item.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {route && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!item.read) {
                              await handleMarkAsRead(item);
                            }
                            navigate(route);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-dark-850 border border-dark-700 text-[var(--text-main)] hover:border-[#5D7B6F] hover:text-[#A4C3A2] transition"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}

                      {!item.read && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-[#B0D4B8]/10 border border-[#B0D4B8]/30 text-[#B0D4B8] hover:bg-[#B0D4B8]/20 transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Read</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        title="Delete notification"
                        className="p-1.5 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-muted)] hover:text-[#EAE7D6] hover:border-[#EAE7D6]/40 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 bg-dark-850 border-t border-dark-700/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[var(--text-muted)]">
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
                  aria-label="Notifications per page"
                  className="px-2 py-1 rounded bg-dark-900 border border-dark-700 text-[var(--text-main)] focus:outline-none focus:border-[#5D7B6F]"
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
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-900 border border-dark-700 text-[var(--text-secondary)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  disabled={pageData.page + 1 >= pageData.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-900 border border-dark-700 text-[var(--text-secondary)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear All Notifications"
        description="Are you sure you want to permanently delete all of your notifications?"
        confirmLabel="Clear All"
        variant="danger"
        loading={clearing}
        onConfirm={handleClearAll}
        onCancel={() => {
          if (!clearing) setConfirmClearOpen(false);
        }}
      />
    </div>
  );
};
