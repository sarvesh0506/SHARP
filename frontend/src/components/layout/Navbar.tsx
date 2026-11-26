import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SharpLogo } from '../ui/SharpLogo';
import { NotificationCenter } from './NotificationCenter';
import apiClient from '../../api/client';
import { LogOut, Cpu, Activity } from 'lucide-react';

type EngineHealthStatus = 'CHECKING' | 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';

export const Navbar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const [engineStatus, setEngineStatus] = useState<EngineHealthStatus>('CHECKING');
  const [aiStatus, setAiStatus] = useState<'CHECKING' | 'ONLINE' | 'OFFLINE'>('CHECKING');
  const inFlightRef = useRef(false);

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

  const statusColor =
    engineStatus === 'ONLINE'
      ? 'text-[#34D399]'
      : engineStatus === 'DEGRADED' || engineStatus === 'CHECKING'
      ? 'text-[#F59E0B]'
      : engineStatus === 'OFFLINE'
      ? 'text-[#F43F5E]'
      : 'text-[#94A3B8]';

  return (
    <header className="min-h-[4rem] sm:h-[72px] bg-[var(--bg-sidebar)] border-b border-[var(--border-subtle)] px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div className="shrink-0 rounded-lg bg-[#05070A] border border-[var(--border-subtle)] px-2.5 py-1 flex items-center">
          <SharpLogo variant="navbar" />
        </div>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/30">
            v1.0-alpha
          </span>
          <span className="hidden xl:inline text-xs text-[#94A3B8] font-sans truncate">
            Self-Healing Autonomous Resilience Platform
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Live System Indicator */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs">
          <Activity className={`w-4 h-4 ${statusColor}`} />
          <span className="text-[#94A3B8] font-medium">Engine:</span>
          <span className={`font-mono ${statusColor}`}>{engineStatus}</span>
        </div>

        {/* AI Service Indicator */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs">
          <Cpu className={`w-4 h-4 ${aiStatus === 'ONLINE' ? 'text-[#22D3EE]' : aiStatus === 'CHECKING' ? 'text-[#F59E0B]' : 'text-[#94A3B8]'}`} />
          <span className="text-[#94A3B8] font-medium">AI Service:</span>
          <span className={`font-mono ${aiStatus === 'ONLINE' ? 'text-[#22D3EE]' : aiStatus === 'CHECKING' ? 'text-[#F59E0B]' : 'text-[#F43F5E]'}`}>
            {aiStatus}
          </span>
        </div>

        {/* Notification Center */}
        <NotificationCenter />

        {/* User profile & Logout */}
        <div className="flex items-center pl-4 border-l border-[var(--border-subtle)] space-x-3">
          <div className="text-right">
            <div className="text-sm font-medium text-[#E2E8F0]">{user?.username || 'Operator'}</div>
            <div className="text-[11px] font-mono text-[#94A3B8] flex items-center justify-end gap-1">
              {isAdmin ? (
                <span className="text-[#F59E0B] font-semibold">ADMIN</span>
              ) : (
                <span className="text-[#22D3EE] font-medium">OPERATOR</span>
              )}
            </div>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-2 text-[#94A3B8] hover:text-[#F43F5E] hover:bg-[var(--bg-elevated)] rounded-lg border border-transparent hover:border-[var(--border-subtle)] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
