import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useLiveEvents } from '../contexts/LiveEventsContext';
import { LiveEvent } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';

const EVENT_CATEGORIES = ['ALL', 'ANOMALY', 'INCIDENT', 'RCA', 'RECOVERY'] as const;

const getEventBadgeClasses = (type: string) => {
  if (type.includes('FAILED') || type.includes('ANOMALY_DETECTED')) {
    return 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/35';
  }
  if (type.includes('VERIFIED') || type.includes('RESOLVED')) {
    return 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/35';
  }
  if (type.includes('RECOMMENDED') || type.includes('RCA')) {
    return 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/35';
  }
  return 'bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/35';
};

const resolveRouteForEvent = (type: string): string | null => {
  if (type.startsWith('RECOVERY_')) return '/recovery';
  if (type.startsWith('INCIDENT_')) return '/incidents';
  if (type.startsWith('ANOMALY_')) return '/detection';
  if (type.startsWith('RCA_')) return '/diagnosis';
  return null;
};

const summarizePayload = (event: LiveEvent): string => {
  const p = event.payload as Record<string, unknown> | null;
  if (!p || typeof p !== 'object') return event.type;
  if (typeof p.title === 'string') return p.title;
  if (typeof p.actionType === 'string') {
    return `${p.actionType}${p.status ? ` (${String(p.status)})` : ''}`;
  }
  if (typeof p.metricName === 'string' && typeof p.resourceName === 'string') {
    return `${p.metricName} on ${p.resourceName}`;
  }
  if (typeof p.hypothesis === 'string') return p.hypothesis;
  return `Event #${String(p.id ?? '')}`.trim();
};

export const LiveEventsPage: React.FC = () => {
  const navigate = useNavigate();
  const { status, events, paused, setPaused, clearEvents, reconnect } = useLiveEvents();

  const [category, setCategory] = useState<(typeof EVENT_CATEGORIES)[number]>('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (category !== 'ALL' && !ev.type.toUpperCase().includes(category)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${ev.type} ${summarizePayload(ev)} ${JSON.stringify(ev.payload ?? {})}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, category, search]);

  const statusColor =
    status === 'CONNECTED'
      ? 'text-[#34D399]'
      : status === 'CONNECTING' || status === 'RECONNECTING'
      ? 'text-[#F59E0B]'
      : 'text-[#F43F5E]';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Event Stream"
        subtitle="Real-time STOMP WebSocket telemetry, anomaly, RCA, and recovery events from /topic/events."
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="WebSocket Stream"
          value={status}
          subtitle="STOMP /ws-direct (/topic/events)"
          icon={status === 'CONNECTED' ? Wifi : WifiOff}
          color={statusColor}
        />
        <StatCard
          title="Buffered Events"
          value={events.length}
          subtitle={paused ? 'Stream paused' : 'Live ring buffer (max 100)'}
          icon={Radio}
          color="text-[#22D3EE]"
        />
        <StatCard
          title="Filtered View"
          value={filteredEvents.length}
          subtitle={`Category: ${category}`}
          icon={Search}
          color="text-[#A78BFA]"
        />
      </div>

      {/* Controls Toolbar */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by event type, resource, payload..."
              aria-label="Filter live events"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {EVENT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1.5 rounded-lg border transition ${
                  category === cat
                    ? 'bg-[#7C3AED]/20 text-[#A78BFA] border-[#7C3AED]/40'
                    : 'bg-dark-850 text-slate-400 border-dark-700 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border transition ${
              paused
                ? 'bg-[#34D399]/10 border-[#34D399]/30 text-[#34D399]'
                : 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]'
            }`}
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{paused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            type="button"
            onClick={reconnect}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 hover:border-[#22D3EE] hover:text-[#22D3EE] transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reconnect</span>
          </button>

          <button
            type="button"
            disabled={events.length === 0}
            onClick={clearEvents}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/30 text-[#F43F5E] hover:bg-[#F43F5E]/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Event Stream Feed */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
        {filteredEvents.length === 0 ? (
          <EmptyState
            title="Awaiting live platform events"
            description={
              status === 'CONNECTED'
                ? 'Connected to /topic/events. New anomaly, incident, RCA, and recovery events will stream here in real time.'
                : `WebSocket status is ${status}. Click Reconnect to establish the live stream.`
            }
            icon={<Radio className="w-8 h-8" />}
            action={
              status !== 'CONNECTED' ? (
                <button
                  type="button"
                  onClick={reconnect}
                  className="px-3.5 py-2 rounded-lg text-xs font-mono bg-[#22D3EE]/15 border border-[#22D3EE]/35 text-[#22D3EE] hover:bg-[#22D3EE]/25 transition"
                >
                  Reconnect Stream
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-dark-800/80">
            {filteredEvents.map((ev) => {
              const isExpanded = expandedId === ev.id;
              const route = resolveRouteForEvent(ev.type);
              return (
                <div key={ev.id} className="p-4 hover:bg-dark-850/60 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-dark-800"
                        aria-label="Toggle event payload"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border shrink-0 ${getEventBadgeClasses(
                          ev.type
                        )}`}
                      >
                        {ev.type}
                      </span>

                      <span className="text-xs font-medium text-slate-100 truncate">
                        {summarizePayload(ev)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                      {route && (
                        <button
                          type="button"
                          onClick={() => navigate(route)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-dark-850 border border-dark-700 text-[11px] font-mono text-slate-300 hover:text-[#22D3EE] hover:border-[#22D3EE]/40 transition"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <pre className="mt-3 ml-8 p-3 rounded-lg bg-dark-950 border border-dark-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                      {JSON.stringify(ev.payload, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
