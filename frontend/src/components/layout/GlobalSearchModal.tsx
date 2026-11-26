import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Clock,
  Compass,
  Container,
  Cpu,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import apiClient from '../../api/client';
import { usersApi } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../ui/StatusBadge';

export type SearchCategory =
  | 'Navigation'
  | 'Servers'
  | 'Incidents'
  | 'Applications'
  | 'Containers'
  | 'Processes'
  | 'AI Agents'
  | 'Recovery'
  | 'Users'
  | 'Settings';

export interface SearchResultItem {
  id: string;
  category: SearchCategory;
  title: string;
  description: string;
  status?: string;
  metadata?: string;
  to: string;
  keywords?: string;
}

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
}

const RECENT_STORAGE_KEY = 'sharp_recent_searches';
const MAX_RECENT = 5;

const QUICK_SUGGESTIONS = [
  'recovery',
  'incidents',
  'servers',
  'docker',
  'cpu',
  'agents',
  'settings',
];

const NAV_ITEMS: SearchResultItem[] = [
  { id: 'nav-dashboard', category: 'Navigation', title: 'Resilience Command Center', description: 'Overview dashboard, KPIs, and self-healing pipeline', to: '/', keywords: 'home overview dashboard kpi' },
  { id: 'nav-system', category: 'Navigation', title: 'System Metrics', description: 'CPU, memory, disk, and network host telemetry', to: '/monitoring/system', keywords: 'cpu memory disk network monitoring' },
  { id: 'nav-docker', category: 'Navigation', title: 'Docker Containers', description: 'Container states, images, and runtime health', to: '/monitoring/docker', keywords: 'containers docker images' },
  { id: 'nav-processes', category: 'Navigation', title: 'Windows Processes', description: 'Active host process CPU and memory utilization', to: '/monitoring/processes', keywords: 'processes pid task cpu' },
  { id: 'nav-apps', category: 'Navigation', title: 'Applications', description: 'Registered services and health endpoints', to: '/applications', keywords: 'apps services endpoints' },
  { id: 'nav-servers', category: 'Navigation', title: 'Infrastructure Registry', description: 'Monitored servers, heartbeats, and host nodes', to: '/servers', keywords: 'infrastructure nodes hosts servers' },
  { id: 'nav-detection', category: 'Navigation', title: 'Fault Detection', description: 'Detected anomalies and baseline deviations', to: '/detection', keywords: 'anomaly anomalies fault detection' },
  { id: 'nav-agents', category: 'Navigation', title: 'AI Agents', description: 'Multi-agent connectivity, fallback mode, and status', to: '/agents', keywords: 'ai agents llm diagnostic' },
  { id: 'nav-events', category: 'Navigation', title: 'Live Events', description: 'Real-time WebSocket operational event stream', to: '/events', keywords: 'stream websocket live events' },
  { id: 'nav-incidents', category: 'Navigation', title: 'Incidents', description: 'Incident lifecycle, severity, and investigation', to: '/incidents', keywords: 'incidents alerts outages' },
  { id: 'nav-rca', category: 'Navigation', title: 'Root Cause Analysis', description: 'AI and deterministic fallback root cause diagnosis', to: '/diagnosis', keywords: 'rca diagnosis root cause' },
  { id: 'nav-recovery', category: 'Navigation', title: 'Recovery Management', description: 'Policy-gated recovery recommendations and execution', to: '/recovery', keywords: 'recovery remediation heal approve execute' },
  { id: 'nav-recovery-history', category: 'Navigation', title: 'Recovery History', description: 'Historical recovery executions and verification outcomes', to: '/recovery/history', keywords: 'recovery history logs verification' },
  { id: 'nav-analytics', category: 'Navigation', title: 'Analytics & Reports', description: 'Historical utilization, incident trends, and exports', to: '/analytics', keywords: 'analytics charts reports trends' },
  { id: 'nav-audit', category: 'Navigation', title: 'Audit Trail', description: 'Compliance logs and operator action history', to: '/audit', keywords: 'audit compliance trail logs' },
  { id: 'nav-notifications', category: 'Navigation', title: 'Notifications', description: 'Operational alerts, read state, and history', to: '/notifications', keywords: 'notifications alerts inbox' },
  { id: 'nav-settings', category: 'Navigation', title: 'Settings', description: 'Thresholds, collector intervals, and system configuration', to: '/settings', keywords: 'settings config thresholds' },
];

const CATEGORY_ICON: Record<SearchCategory, React.ElementType> = {
  Navigation: Compass,
  Servers: Server,
  Incidents: AlertTriangle,
  Applications: Layers,
  Containers: Container,
  Processes: Cpu,
  'AI Agents': Bot,
  Recovery: ShieldCheck,
  Users: Users,
  Settings: Settings,
};

function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#D7F9FA]/20 text-[#D7F9FA] rounded px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [partialError, setPartialError] = useState<string | null>(null);
  const [entityItems, setEntityItems] = useState<SearchResultItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
    } catch {
      return [];
    }
  });

  const loadSearchIndex = useCallback(async () => {
    setLoading(true);
    setPartialError(null);
    const items: SearchResultItem[] = [];
    let failedCount = 0;

    const tasks = [
      apiClient.get('/servers').then((res) => {
        const list = res.data?.data ?? [];
        if (Array.isArray(list)) {
          list.forEach((s: any) => {
            items.push({
              id: `srv-${s.id}`,
              category: 'Servers',
              title: s.hostname || s.name || `Server #${s.id}`,
              description: `${s.ipAddress || 'No IP'} · ${s.operatingSystem || 'Host'}`,
              status: s.status || 'UNKNOWN',
              metadata: s.environment || undefined,
              to: `/servers`,
              keywords: `${s.name || ''} ${s.hostname || ''} ${s.ipAddress || ''} ${s.operatingSystem || ''}`,
            });
          });
        }
      }),
      apiClient.get('/incidents').then((res) => {
        const list = res.data?.data ?? [];
        if (Array.isArray(list)) {
          list.forEach((inc: any) => {
            items.push({
              id: `inc-${inc.id}`,
              category: 'Incidents',
              title: inc.title || `Incident #${inc.id}`,
              description: inc.description || inc.rootCause || `Severity: ${inc.severity || 'UNKNOWN'}`,
              status: inc.status || 'OPEN',
              metadata: inc.severity ? `#${inc.id} · ${inc.severity}` : `#${inc.id}`,
              to: `/incidents`,
              keywords: `${inc.id} ${inc.title || ''} ${inc.severity || ''} ${inc.status || ''} ${inc.rootCause || ''}`,
            });
          });
        }
      }),
      apiClient.get('/applications').then((res) => {
        const list = res.data?.data ?? [];
        if (Array.isArray(list)) {
          list.forEach((app: any) => {
            items.push({
              id: `app-${app.id}`,
              category: 'Applications',
              title: app.name || `Application #${app.id}`,
              description: app.healthEndpoint || app.description || 'Monitored service',
              status: app.status || 'UNKNOWN',
              metadata: app.appType || undefined,
              to: '/applications',
              keywords: `${app.name || ''} ${app.appType || ''} ${app.healthEndpoint || ''}`,
            });
          });
        }
      }),
      apiClient.get('/monitoring/docker/containers').then((res) => {
        const payload = res.data?.data;
        const list = Array.isArray(payload) ? payload : payload?.containers ?? [];
        if (Array.isArray(list)) {
          list.slice(0, 30).forEach((c: any, idx: number) => {
            items.push({
              id: `ctr-${c.id || c.containerId || idx}`,
              category: 'Containers',
              title: c.name || c.names?.[0] || c.containerId || `Container ${idx + 1}`,
              description: c.image || 'Docker container',
              status: (c.state || c.status || 'UNKNOWN').toUpperCase(),
              metadata: c.containerId ? String(c.containerId).slice(0, 12) : undefined,
              to: '/monitoring/docker',
              keywords: `${c.name || ''} ${c.image || ''} ${c.state || ''}`,
            });
          });
        }
      }),
      apiClient.get('/monitoring/processes', { params: { limit: 30 } }).then((res) => {
        const payload = res.data?.data;
        const list = Array.isArray(payload) ? payload : payload?.processes ?? [];
        if (Array.isArray(list)) {
          list.slice(0, 25).forEach((p: any) => {
            items.push({
              id: `proc-${p.pid}-${p.name}`,
              category: 'Processes',
              title: p.name || `PID ${p.pid}`,
              description: `PID ${p.pid}${p.cpuPercent != null ? ` · CPU ${Number(p.cpuPercent).toFixed(1)}%` : ''}`,
              status: p.status ? String(p.status).toUpperCase() : 'RUNNING',
              metadata: p.memoryMb != null ? `${Number(p.memoryMb).toFixed(0)} MB` : undefined,
              to: '/monitoring/processes',
              keywords: `${p.name || ''} ${p.pid || ''}`,
            });
          });
        }
      }),
      apiClient.get('/agents/status').then((res) => {
        const data = res.data?.data;
        if (data) {
          const reachable = Boolean(data.reachable);
          items.push({
            id: 'agent-service',
            category: 'AI Agents',
            title: 'SHARP AI Multi-Agent Service',
            description: reachable
              ? 'Live AI anomaly & root-cause inference online'
              : 'Deterministic fallback mode active (AI service offline)',
            status: reachable ? 'ONLINE' : 'OFFLINE',
            metadata: data.mode || undefined,
            to: '/agents',
            keywords: 'ai agent diagnosis anomaly recommendation verification fallback',
          });
        }
      }),
      apiClient.get('/recovery/recommendations').then((res) => {
        const list = res.data?.data ?? [];
        if (Array.isArray(list)) {
          list.slice(0, 25).forEach((rec: any) => {
            items.push({
              id: `rec-${rec.id}`,
              category: 'Recovery',
              title: rec.actionName || rec.actionType || `Recommendation #${rec.id}`,
              description: rec.expectedResult || `Incident #${rec.incidentId} · Risk: ${rec.riskLevel || 'LOW'}`,
              status: rec.status || 'PENDING',
              metadata: `Rec #${rec.id}`,
              to: '/recovery',
              keywords: `${rec.actionType || ''} ${rec.actionName || ''} ${rec.riskLevel || ''} ${rec.status || ''}`,
            });
          });
        }
      }),
      apiClient.get('/recovery/executions').then((res) => {
        const list = res.data?.data ?? [];
        if (Array.isArray(list)) {
          list.slice(0, 20).forEach((exec: any) => {
            items.push({
              id: `exec-${exec.id}`,
              category: 'Recovery',
              title: `${exec.actionType || 'Recovery Execution'} (#${exec.id})`,
              description: exec.verificationMessage || exec.output || `Incident #${exec.incidentId}`,
              status: exec.verificationStatus || exec.status || 'COMPLETED',
              metadata: 'Execution',
              to: '/recovery/history',
              keywords: `${exec.actionType || ''} ${exec.status || ''} ${exec.verificationStatus || ''}`,
            });
          });
        }
      }),
      apiClient.get('/config').then((res) => {
        const list = res.data?.data ?? [];
        if (Array.isArray(list)) {
          list.slice(0, 20).forEach((cfg: any) => {
            items.push({
              id: `cfg-${cfg.configKey || cfg.id}`,
              category: 'Settings',
              title: cfg.configKey || 'Configuration',
              description: cfg.description || `Value: ${cfg.configValue}`,
              metadata: String(cfg.configValue ?? ''),
              to: '/settings',
              keywords: `${cfg.configKey || ''} ${cfg.description || ''} ${cfg.configValue || ''}`,
            });
          });
        }
      }),
    ];

    if (isAdmin) {
      tasks.push(
        usersApi.listUsers({ page: 0, size: 30 }).then((pageData) => {
          (pageData.items ?? []).forEach((u) => {
            items.push({
              id: `usr-${u.id}`,
              category: 'Users',
              title: u.username,
              description: u.email,
              status: u.enabled ? 'ACTIVE' : 'DISABLED',
              metadata: u.role,
              to: '/users',
              keywords: `${u.username} ${u.email} ${u.role}`,
            });
          });
        })
      );
    }

    const settled = await Promise.allSettled(tasks);
    settled.forEach((result) => {
      if (result.status === 'rejected') failedCount += 1;
    });

    if (failedCount > 0) {
      setPartialError(
        `${failedCount} live data source${failedCount > 1 ? 's' : ''} unavailable; showing available SHARP results.`
      );
    }

    setEntityItems(items);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    loadSearchIndex();
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
    return () => window.clearTimeout(timer);
  }, [open, loadSearchIndex]);

  const allNavItems = useMemo(() => {
    if (!isAdmin) return NAV_ITEMS;
    return [
      ...NAV_ITEMS,
      {
        id: 'nav-users',
        category: 'Navigation' as SearchCategory,
        title: 'User Management',
        description: 'Manage platform operators, admins, and roles',
        to: '/users',
        keywords: 'users roles admin rbac accounts',
      },
    ];
  }, [isAdmin]);

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const combined = [...allNavItems, ...entityItems];
    if (!q) {
      return allNavItems.slice(0, 8);
    }
    return combined
      .filter((item) => {
        const haystack = `${item.title} ${item.description} ${item.category} ${item.status || ''} ${item.metadata || ''} ${item.keywords || ''}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 30);
  }, [query, allNavItems, entityItems]);

  const groupedResults = useMemo(() => {
    const groups: { category: SearchCategory; items: { item: SearchResultItem; flatIndex: number }[] }[] = [];
    const map = new Map<SearchCategory, { item: SearchResultItem; flatIndex: number }[]>();

    filteredResults.forEach((item, idx) => {
      const bucket = map.get(item.category) ?? [];
      bucket.push({ item, flatIndex: idx });
      map.set(item.category, bucket);
    });

    map.forEach((items, category) => {
      groups.push({ category, items });
    });
    return groups;
  }, [filteredResults]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const el = itemRefs.current[activeIndex];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const saveRecentSearch = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    const next = [clean, ...recentSearches.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(
      0,
      MAX_RECENT
    );
    setRecentSearches(next);
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  };

  const handleSelect = (item: SearchResultItem) => {
    if (query.trim()) {
      saveRecentSearch(query);
    }
    onClose();
    navigate(item.to);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredResults.length > 0) {
        setActiveIndex((prev) => (prev + 1) % filteredResults.length);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredResults.length > 0) {
        setActiveIndex((prev) => (prev - 1 + filteredResults.length) % filteredResults.length);
      }
      return;
    }
    if (e.key === 'Enter' && filteredResults[activeIndex]) {
      e.preventDefault();
      handleSelect(filteredResults[activeIndex]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] sm:pt-[12vh] px-3 sm:px-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Global Search"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-[var(--shadow-elevated)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
          <Search className="w-4 h-4 text-[#A4C3A2] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search servers, incidents, recovery, containers, pages..."
            aria-label="Search SHARP"
            className="flex-1 bg-transparent text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-[#D7F9FA] animate-spin shrink-0" />}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={loadSearchIndex}
            disabled={loading}
            title="Refresh search index"
            aria-label="Refresh search index"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)]">
            ESC
          </kbd>
        </div>

        {/* Partial Fetch Warning */}
        {partialError && (
          <div className="px-4 py-2 bg-[#EAE7D6]/10 border-b border-[var(--border-subtle)] text-[11px] text-[#EAE7D6] flex items-center justify-between gap-2">
            <span>{partialError}</span>
          </div>
        )}

        {/* Recent Searches & Suggestions (when query is empty) */}
        {!query.trim() && (
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] space-y-2.5 bg-[var(--bg-input)]/60">
            {recentSearches.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)] mr-1">
                  <Clock className="w-3 h-3" /> Recent
                </span>
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[#A4C3A2]/50 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors"
                  >
                    {term}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setRecentSearches([]);
                    try {
                      localStorage.removeItem(RECENT_STORAGE_KEY);
                    } catch {
                      // Ignore
                    }
                  }}
                  className="text-[10px] text-[var(--text-muted)] hover:text-[#EAE7D6] ml-auto"
                >
                  Clear recent
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)] mr-1">
                <Sparkles className="w-3 h-3 text-[#D7F9FA]" /> Quick filter
              </span>
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuery(s)}
                  className="px-2 py-0.5 rounded-md bg-[#5D7B6F]/20 border border-[#A4C3A2]/30 hover:bg-[#5D7B6F]/35 text-[11px] text-[#EAE7D6] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-[54vh] overflow-y-auto p-2 space-y-3">
          {filteredResults.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-2">
              <p className="text-xs font-medium text-[var(--text-main)]">
                No matching SHARP entities or routes for "{query}"
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Try searching for a server hostname, incident title, container, recovery action, or destination like "recovery" or "settings".
              </p>
            </div>
          ) : (
            groupedResults.map((group) => {
              const CategoryIcon = CATEGORY_ICON[group.category];
              return (
                <div key={group.category} className="space-y-1">
                  <div className="px-2.5 py-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <CategoryIcon className="w-3 h-3 text-[#A4C3A2]" />
                      {group.category}
                    </span>
                    <span>{group.items.length}</span>
                  </div>
                  {group.items.map(({ item, flatIndex }) => {
                    const isSelected = flatIndex === activeIndex;
                    return (
                      <button
                        key={item.id}
                        ref={(el) => {
                          itemRefs.current[flatIndex] = el;
                        }}
                        type="button"
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        onClick={() => handleSelect(item)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors border ${
                          isSelected
                            ? 'bg-[#5D7B6F]/25 border-[#A4C3A2]/45 text-[var(--text-main)]'
                            : 'bg-transparent border-transparent hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--text-main)] truncate">
                              {highlightMatch(item.title, query)}
                            </span>
                            {item.metadata && (
                              <span className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] shrink-0">
                                {item.metadata}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                            {highlightMatch(item.description, query)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.status && <StatusBadge status={item.status} />}
                          <ArrowRight
                            className={`w-3.5 h-3.5 transition-opacity ${
                              isSelected ? 'text-[#D7F9FA] opacity-100' : 'opacity-40'
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Keyboard Navigation Footer */}
        <div className="px-4 py-2.5 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[10px]">
                ↑↓
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[10px]">
                Enter
              </kbd>{' '}
              Open
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[10px]">
                Esc
              </kbd>{' '}
              Close
            </span>
          </div>
          <span className="hidden sm:inline">
            {filteredResults.length} result{filteredResults.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
};
