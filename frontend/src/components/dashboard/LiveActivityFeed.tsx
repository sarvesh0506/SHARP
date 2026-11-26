import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Radar,
  Radio,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
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

const getEventIcon = (type: string) => {
  if (type.startsWith('ANOMALY_')) return { Icon: Radar, color: 'text-[#EAE7D6]' };
  if (type.startsWith('INCIDENT_')) return { Icon: AlertTriangle, color: 'text-[#EAE7D6]' };
  if (type.startsWith('RCA_')) return { Icon: Stethoscope, color: 'text-[#D7F9FA]' };
  if (type.includes('VERIFIED')) return { Icon: CheckCircle2, color: 'text-[#B0D4B8]' };
  return { Icon: ShieldCheck, color: 'text-[#B0D4B8]' };
};

export const LiveActivityFeed: React.FC = () => {
  const { status, events, reconnect } = useLiveEvents();

  return (
    <section aria-labelledby="live-timeline-heading" className="sharp-card p-5 flex flex-col justify-between space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio
            className={`w-4 h-4 ${
              status === 'CONNECTED'
                ? 'text-[#B0D4B8]'
                : status === 'DISCONNECTED'
                ? 'text-[#EAE7D6]'
                : 'text-[#EAE7D6]'
            }`}
          />
          <h2 id="live-timeline-heading" className="sharp-section-title">
            Real-Time Activity Timeline
          </h2>
          <StatusBadge status={status} />
        </div>
        <div className="flex items-center gap-2.5">
          {status !== 'CONNECTED' && (
            <button
              type="button"
              onClick={reconnect}
              className="text-[11px] font-mono text-[#D7F9FA] hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reconnect</span>
            </button>
          )}
          <Link
            to="/events"
            className="text-xs font-mono text-[#B0D4B8] hover:underline inline-flex items-center gap-1"
          >
            <span>Full Stream</span>
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
        <div className="relative pl-4 border-l border-[var(--border-subtle)] space-y-3">
          {events.slice(0, 6).map((ev) => {
            const { Icon, color } = getEventIcon(ev.type);
            return (
              <Link
                key={ev.id}
                to={resolveRoute(ev.type)}
                className="relative block p-2.5 rounded-lg bg-[var(--bg-elevated)]/60 hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] transition-colors"
              >
                <span
                  aria-hidden="true"
                  className="absolute -left-[21px] top-3.5 w-2.5 h-2.5 rounded-full bg-[var(--bg-card)] border-2 border-[#5D7B6F]"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono ${color}`}>
                    <Icon className="w-3 h-3" />
                    {ev.type}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-main)] truncate mt-0.5">
                  {summarizeEvent(ev)}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};
