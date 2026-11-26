import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { notificationsApi } from '../../api/notifications';
import { NotificationItem } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';

const getSeverityAccent = (severity: string) => {
  const s = (severity || '').toUpperCase();
  if (s === 'CRITICAL' || s === 'HIGH') {
    return 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/35';
  }
  if (s === 'MEDIUM' || s === 'WARNING') {
    return 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/35';
  }
  return 'bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/35';
};

const formatRelativeTime = (iso: string) => {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(iso).toLocaleDateString();
};

const resolveTargetRoute = (n: NotificationItem): string | null => {
  if (n.recoveryExecutionId || n.type.startsWith('RECOVERY_')) return '/recovery';
  if (n.incidentId || n.type.startsWith('INCIDENT_')) return '/incidents';
  if (n.anomalyId || n.type === 'ANOMALY_DETECTED') return '/detection';
  return null;
};

export const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const pollInFlightRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD'>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    try {
      const count = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Non-blocking background poll
    } finally {
      pollInFlightRef.current = false;
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationsApi.listNotifications({
        isRead: filterTab === 'UNREAD' ? false : undefined,
        page: 0,
        size: 15,
      });
      setItems(data.items ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [filterTab]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [open, fetchNotifications, fetchUnreadCount]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleMarkAsRead = async (item: NotificationItem) => {
    if (item.read) return;
    try {
      const updated = await notificationsApi.markAsRead(item.id);
      setItems((prev) =>
        filterTab === 'UNREAD'
          ? prev.filter((n) => n.id !== item.id)
          : prev.map((n) => (n.id === item.id ? updated : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to mark notification as read.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setUnreadCount(0);
      setItems((prev) =>
        filterTab === 'UNREAD'
          ? []
          : prev.map((n) => ({ ...n, read: true }))
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to mark all notifications as read.');
    }
  };

  const handleDelete = async (item: NotificationItem) => {
    try {
      await notificationsApi.deleteNotification(item.id);
      setItems((prev) => prev.filter((n) => n.id !== item.id));
      if (!item.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete notification.');
    }
  };

  const handleClearAll = async () => {
    try {
      setClearing(true);
      await notificationsApi.deleteAllNotifications();
      setItems([]);
      setUnreadCount(0);
      setConfirmClearOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to clear notifications.');
      setConfirmClearOpen(false);
    } finally {
      setClearing(false);
    }
  };

  const handleNavigate = async (item: NotificationItem) => {
    if (!item.read) {
      await handleMarkAsRead(item);
    }
    const route = resolveTargetRoute(item);
    if (route) {
      setOpen(false);
      navigate(route);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Notifications"
        aria-label="Open notification center"
        className="relative p-2 text-[#94A3B8] hover:text-[#22D3EE] hover:bg-[var(--bg-elevated)] rounded-lg border border-transparent hover:border-[var(--border-subtle)] transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F43F5E] text-white text-[10px] font-mono font-bold flex items-center justify-center shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[380px] max-w-[92vw] rounded-xl bg-dark-900 border border-dark-700 shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 bg-dark-850 border-b border-dark-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 text-[#22D3EE] hover:underline"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Read all</span>
                </button>
              )}
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(true)}
                  className="text-slate-400 hover:text-[#F43F5E]"
                  title="Clear all notifications"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="px-4 py-2 border-b border-dark-800 flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterTab('ALL')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterTab === 'ALL'
                    ? 'bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('UNREAD')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterTab === 'UNREAD'
                    ? 'bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Unread
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
              className="inline-flex items-center gap-1 text-[#A78BFA] hover:underline"
            >
              <span>View all</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {error && (
            <div className="px-4 py-2 bg-[#F43F5E]/10 border-b border-[#F43F5E]/30 text-[11px] text-[#F43F5E]">
              {error}
            </div>
          )}

          <div className="max-h-[360px] overflow-y-auto divide-y divide-dark-800/80">
            {loading ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs font-mono text-slate-400">
                <div className="w-5 h-5 border-2 border-[#22D3EE] border-t-transparent rounded-full animate-spin" />
                <span>Loading notifications...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 px-4 text-center text-xs text-slate-500">
                {filterTab === 'UNREAD'
                  ? 'You are all caught up — no unread notifications.'
                  : 'No notifications recorded yet.'}
              </div>
            ) : (
              items.map((item) => {
                const targetRoute = resolveTargetRoute(item);
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 transition-colors ${
                      item.read ? 'bg-transparent' : 'bg-[#7C3AED]/5'
                    } hover:bg-dark-850/80`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={`min-w-0 flex-1 ${targetRoute ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (targetRoute) handleNavigate(item);
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-[#22D3EE] shrink-0" />
                          )}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${getSeverityAccent(
                              item.severity
                            )}`}
                          >
                            {item.severity}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 truncate">
                            {item.type}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-100 truncate">
                          {item.title}
                        </div>
                        {item.message && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                            {item.message}
                          </p>
                        )}
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          {formatRelativeTime(item.createdAt)}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {!item.read && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(item)}
                            title="Mark as read"
                            className="p-1 rounded text-slate-400 hover:text-[#34D399] hover:bg-dark-800 transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          title="Delete notification"
                          className="p-1 rounded text-slate-500 hover:text-[#F43F5E] hover:bg-dark-800 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

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
