import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveEvents } from '../../contexts/LiveEventsContext';
import { SharpLogo } from '../ui/SharpLogo';
import { NotificationCenter } from './NotificationCenter';
import apiClient from '../../api/client';
import {
  Activity,
  Bell,
  ChevronDown,
  ChevronRight,
  Cpu,
  LogOut,
  Menu,
  Radio,
  Shield,
  Users,
} from 'lucide-react';

type EngineHealthStatus = 'CHECKING' | 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';

interface RouteMeta {
  section: string;
  label: string;
}

const ROUTE_META: Record<string, RouteMeta> = {
  '/': { section: 'Overview', label: 'Command Center' },
  '/monitoring/system': { section: 'Monitoring', label: 'System Metrics' },
  '/monitoring/docker': { section: 'Monitoring', label: 'Docker Containers' },
  '/monitoring/processes': { section: 'Monitoring', label: 'Windows Processes' },
  '/applications': { section: 'Monitoring', label: 'Applications' },
  '/servers': { section: 'Monitoring', label: 'Infrastructure' },
  '/detection': { section: 'Intelligence', label: 'Fault Detection' },
  '/agents': { section: 'Intelligence', label: 'AI Agents' },
  '/events': { section: 'Intelligence', label: 'Live Events' },
  '/incidents': { section: 'Incident & Recovery', label: 'Incidents' },
  '/diagnosis': { section: 'Incident & Recovery', label: 'Root Cause Analysis' },
  '/recovery': { section: 'Incident & Recovery', label: 'Recovery Management' },
  '/recovery/history': { section: 'Incident & Recovery', label: 'Recovery History' },
  '/analytics': { section: 'Analytics & Admin', label: 'Analytics & Reports' },
  '/audit': { section: 'Analytics & Admin', label: 'Audit Trail' },
  '/notifications': { section: 'Analytics & Admin', label: 'Notifications' },
  '/users': { section: 'Analytics & Admin', label: 'User Management' },
  '/settings': { section: 'Analytics & Admin', label: 'Settings' },
};

interface NavbarProps {
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { status: wsStatus } = useLiveEvents();

  const [engineStatus, setEngineStatus] = useState<EngineHealthStatus>('CHECKING');
  const [aiStatus, setAiStatus] = useState<'CHECKING' | 'ONLINE' | 'OFFLINE'>('CHECKING');
  const [profileOpen, setProfileOpen] = useState(false);

  const inFlightRef = useRef(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const checkEngineHealth = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const [healthRes, agentRes] = await Promise.allSettled([
          apiClient.get('/health', { timeout: 5000 }),
          apiClient.get('/agents/status', { timeout: 3000 }),
        ]);

        if (!isMounted) return;

        if (healthRes.status === 'fulfilled') {
          const status = healthRes.value.data?.data?.status?.toUpperCase?.();
          if (status === 'UP') setEngineStatus('ONLINE');
          else if (status === 'DEGRADED') setEngineStatus('DEGRADED');
          else setEngineStatus('UNKNOWN');
        } else {
          setEngineStatus('OFFLINE');
        }

        if (agentRes.status === 'fulfilled' && agentRes.value.data?.data?.reachable) {
          setAiStatus('ONLINE');
        } else {
          setAiStatus('OFFLINE');
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    checkEngineHealth();
    const interval = setInterval(checkEngineHealth, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [profileOpen]);

  const routeMeta = ROUTE_META[location.pathname] ?? {
    section: 'Platform',
    label: 'Operations',
  };

  const statusColor =
    engineStatus === 'ONLINE'
      ? 'text-[#B0D4B8]'
      : engineStatus === 'DEGRADED' || engineStatus === 'CHECKING'
      ? 'text-[#EAE7D6]'
      : engineStatus === 'OFFLINE'
      ? 'text-[#EAE7D6] underline decoration-dotted'
      : 'text-[var(--text-muted)]';

  const initials = (user?.username || 'OP').slice(0, 2).toUpperCase();

  return (
    <header className="h-16 bg-[var(--bg-sidebar)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-3 sm:px-5 flex items-center justify-between gap-3 sticky top-0 z-30">
      {/* Left: Mobile Menu + Brand + Breadcrumbs */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="shrink-0 rounded-lg bg-[var(--bg-main)] border border-[var(--border-subtle)] px-2 py-1 flex items-center">
          <SharpLogo variant="navbar" />
        </div>

        <nav
          aria-label="Breadcrumb"
          className="hidden sm:flex items-center gap-1.5 text-xs min-w-0"
        >
          <span className="text-[11px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#5D7B6F]/25 text-[#EAE7D6] border border-[#A4C3A2]/35 shrink-0">
            SHARP
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
          <span className="text-[var(--text-muted)] truncate">{routeMeta.section}</span>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
          <span className="font-medium text-[var(--text-main)] truncate">
            {routeMeta.label}
          </span>
        </nav>
      </div>

      {/* Right: Operational Status Pills + Notifications + User Menu */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Live Engine Status */}
        <div
          title="Backend Engine Health"
          className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs"
        >
          <Activity className={`w-3.5 h-3.5 ${statusColor}`} />
          <span className="text-[var(--text-muted)]">Engine:</span>
          <span className={`font-mono font-medium ${statusColor}`}>{engineStatus}</span>
        </div>

        {/* AI Service Status */}
        <div
          title="Python AI Microservice Status"
          className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs"
        >
          <Cpu
            className={`w-3.5 h-3.5 ${
              aiStatus === 'ONLINE'
                ? 'text-[#D7F9FA]'
                : aiStatus === 'CHECKING'
                ? 'text-[#A4C3A2]'
                : 'text-[var(--text-muted)]'
            }`}
          />
          <span className="text-[var(--text-muted)]">AI Service:</span>
          <span
            className={`font-mono font-medium ${
              aiStatus === 'ONLINE'
                ? 'text-[#D7F9FA]'
                : aiStatus === 'CHECKING'
                ? 'text-[#A4C3A2]'
                : 'text-[#EAE7D6]'
            }`}
          >
            {aiStatus}
          </span>
        </div>

        {/* WebSocket Stream Indicator */}
        <button
          type="button"
          onClick={() => navigate('/events')}
          title="Open Live Event Stream"
          className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[#A4C3A2]/50 text-xs transition-colors"
        >
          <Radio
            className={`w-3.5 h-3.5 ${
              wsStatus === 'CONNECTED'
                ? 'text-[#B0D4B8]'
                : wsStatus === 'DISCONNECTED'
                ? 'text-[#EAE7D6]'
                : 'text-[#A4C3A2]'
            }`}
          />
          <span className="text-[var(--text-muted)]">Stream:</span>
          <span
            className={`font-mono font-medium ${
              wsStatus === 'CONNECTED'
                ? 'text-[#B0D4B8]'
                : wsStatus === 'DISCONNECTED'
                ? 'text-[#EAE7D6]'
                : 'text-[#A4C3A2]'
            }`}
          >
            {wsStatus}
          </span>
        </button>

        {/* Notification Center */}
        <NotificationCenter />

        {/* User Profile Dropdown */}
        <div className="relative pl-2 border-l border-[var(--border-subtle)]" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((o) => !o)}
            aria-expanded={profileOpen}
            aria-label="User profile menu"
            className="flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--border-subtle)] transition-colors"
          >
            <div className="w-7 h-7 rounded-md bg-[#5D7B6F]/30 border border-[#A4C3A2]/45 text-[#EAE7D6] font-mono text-[11px] font-semibold flex items-center justify-center">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-medium text-[var(--text-main)] leading-tight">
                {user?.username || 'Operator'}
              </div>
              <div
                className={`text-[10px] font-mono leading-tight ${
                  isAdmin ? 'text-[#EAE7D6]' : 'text-[#D7F9FA]'
                }`}
              >
                {isAdmin ? 'ADMIN' : 'OPERATOR'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-elevated z-50 overflow-hidden text-xs">
              <div className="px-4 py-3 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
                <div className="font-semibold text-[var(--text-main)] truncate">
                  {user?.username || 'Operator'}
                </div>
                <div className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                  {user?.email || 'authenticated@sharp.local'}
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)]">
                  <Shield className="w-2.5 h-2.5 text-[#B0D4B8]" />
                  {user?.role || 'ROLE_OPERATOR'}
                </div>
              </div>

              <div className="p-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/notifications');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] transition-colors text-left"
                >
                  <Bell className="w-3.5 h-3.5 text-[#D7F9FA]" />
                  <span>Notification Center</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/users');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] transition-colors text-left"
                  >
                    <Users className="w-3.5 h-3.5 text-[#A4C3A2]" />
                    <span>User Management</span>
                  </button>
                )}
              </div>

              <div className="p-1.5 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#EAE7D6] hover:bg-[#EAE7D6]/12 transition-colors text-left font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
