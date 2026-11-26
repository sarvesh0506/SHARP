import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Radio, RefreshCw } from 'lucide-react';
import { useLiveEvents } from '../../contexts/LiveEventsContext';
import { LiveEvent } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';

const summarizeEvent = (ev: LiveEvent): string => {
  const p = ev.payload as Record<string, unknown> | null;
  if (!p || typeof p !== 'object') return ev.type;
  if (typeof p.title === 'string') return p.title;
  if (typeof p.actionType === 'string') {
    return `${p.actionType}${p.status ? ` (${String(p.status)})` : ''}`;
  }
  if (typeof p.metricName === 'string' && typeof p.resourceName === 'string') {
    return `${p.metricName} on ${p.resourceName}`;
  }
  if (typeof p.hypothesis === 'string') return p.hypothesis;
  return ev.type;
};

const resolveRoute = (type: string): string => {
  if (type.startsWith('RECOVERY_')) return '/recovery';
  if (type.startsWith('INCIDENT_')) return '/incidents';
  if (type.startsWith('ANOMALY_')) return '/detection';
  if (type.startsWith('RCA_')) return '/diagnosis';
  return '/events';
};

export const LiveActivityFeed: React.FC = () => {
  const { status, events, reconnect } = useLiveEvents();

  return (
    <div className="sharp-card p-5 flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio
            className={`w-4 h-4 ${
              status === 'CONNECTED'
                ? 'text-[#34D399]'
                : status === 'DISCONNECTED'
                ? 'text-[#F43F5E]'
                : 'text-[#F59E0B]'
            }`}
          />
          <h2 className="sharp-section-title">Live Activity Feed</h2>
          <StatusBadge status={status} />
        </div>
        <div className="flex items-center gap-2">
          {status !== 'CONNECTED' && (
            <button
              type="button"
              onClick={reconnect}
              className="text-[11px] font-mono text-[#38BDF8] hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reconnect</span>
            </button>
          )}
          <Link
            to="/events"
            className="text-xs font-mono text-[#34D399] hover:underline inline-flex items-center gap-1"
          >
            <span>Stream</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="py-10 px-4 text-center border border-dashed border-[var(--border-subtle)] rounded-lg text-xs font-mono text-[var(--text-muted)]">
          {status === 'CONNECTED'
            ? 'Connected to /topic/events. Waiting for live platform activity...'
            : `WebSocket stream is ${status}. Reconnect to receive live events.`}
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)]">
          {events.slice(0, 6).map((ev) => (
            <Link
              key={ev.id}
              to={resolveRoute(ev.type)}
              className="py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-elevated)]/50 px-2 -mx-2 rounded-md transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-mono text-[#38BDF8] truncate">
                  {ev.type}
                </div>
                <div className="text-xs text-[var(--text-main)] truncate">
                  {summarizeEvent(ev)}
                </div>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
                {new Date(ev.timestamp).toLocaleTimeString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
