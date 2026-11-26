import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SharpLogo } from '../ui/SharpLogo';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  Container,
  Cpu,
  FileText,
  History,
  Layers,
  LayoutDashboard,
  LogOut,
  Monitor,
  Radar,
  Radio,
  Server,
  Settings,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';

interface NavEntry {
  name: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavEntry[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [{ name: 'Dashboard', href: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Monitoring',
    items: [
      { name: 'System Metrics', href: '/monitoring/system', icon: Monitor },
      { name: 'Docker Containers', href: '/monitoring/docker', icon: Container },
      { name: 'Windows Processes', href: '/monitoring/processes', icon: Cpu },
      { name: 'Applications', href: '/applications', icon: Layers },
      { name: 'Infrastructure', href: '/servers', icon: Server },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { name: 'Fault Detection', href: '/detection', icon: Radar },
      { name: 'AI Agents', href: '/agents', icon: Bot },
      { name: 'Live Events', href: '/events', icon: Radio },
    ],
  },
  {
    title: 'Incident & Recovery',
    items: [
      { name: 'Incidents', href: '/incidents', icon: AlertTriangle },
      { name: 'Root Cause Analysis', href: '/diagnosis', icon: Stethoscope },
      { name: 'Recovery Management', href: '/recovery', icon: ShieldCheck },
      { name: 'Recovery History', href: '/recovery/history', icon: History },
    ],
  },
  {
    title: 'Analytics & Admin',
    items: [
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
      { name: 'Audit Trail', href: '/audit', icon: FileText },
      { name: 'Notifications', href: '/notifications', icon: Bell },
      { name: 'User Management', href: '/users', icon: Users, adminOnly: true },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen = false,
  onCloseMobile,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, isAdmin, logout } = useAuth();

  const sidebarBody = (isMobileDrawer: boolean) => {
    const isCompact = !isMobileDrawer && collapsed;

    return (
      <div className="flex flex-col justify-between h-full">
        <div className="p-3 space-y-4 overflow-y-auto flex-1">
          {/* Sidebar Brand + Collapse/Close Toggle */}
          <div className="flex items-center justify-between px-2 py-2 border-b border-[var(--border-subtle)] gap-2">
            {!isCompact && (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="rounded-md bg-[#05070A] border border-[var(--border-subtle)] px-1.5 py-0.5 flex items-center min-w-0">
                  <SharpLogo variant="sidebar" />
                </div>
                <span className="text-[10px] font-mono text-[#34D399] uppercase tracking-wider shrink-0">
                  AIOPS
                </span>
              </div>
            )}
            {isMobileDrawer ? (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation menu"
                className="p-1.5 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-main)] ml-auto transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="p-1.5 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-main)] ml-auto transition-colors"
              >
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`}
                />
              </button>
            )}
          </div>

          {/* Grouped Navigation */}
          <nav aria-label="Main navigation" className="space-y-4">
            {NAV_SECTIONS.map((section) => {
              const visibleItems = section.items.filter(
                (item) => !item.adminOnly || isAdmin
              );
              if (visibleItems.length === 0) return null;

              return (
                <div key={section.title} className="space-y-1">
                  {!isCompact && (
                    <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-widest text-[#64748B]">
                      {section.title}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.href}
                          to={item.href}
                          end={item.href === '/'}
                          title={isCompact ? item.name : undefined}
                          onClick={() => {
                            if (isMobileDrawer && onCloseMobile) {
                              onCloseMobile();
                            }
                          }}
                          className={({ isActive }) =>
                            `group relative flex items-center ${
                              isCompact ? 'justify-center px-2' : 'gap-3 px-3'
                            } py-2 rounded-lg text-[13px] font-medium transition-colors ${
                              isActive
                                ? 'bg-[#10B981]/12 text-[#34D399] border border-[#10B981]/30'
                                : 'text-[var(--text-muted)] border border-transparent hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)]'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && !isCompact && (
                                <span
                                  aria-hidden="true"
                                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-[#10B981]"
                                />
                              )}
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  isActive
                                    ? 'text-[#34D399]'
                                    : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'
                                }`}
                              />
                              {!isCompact && <span className="truncate">{item.name}</span>}
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Status + User Profile */}
        <div className="p-3 space-y-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
          {!isCompact && (
            <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] space-y-1.5">
              <div className="flex items-center justify-between text-[var(--text-main)] font-medium">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#34D399]" />
                  <span className="text-[11px]">Autonomous Loop</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-[#10B981]/10 text-[#34D399] px-1.5 py-0.5 rounded border border-[#10B981]/30 font-mono">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Policy-gated detection, RCA, and allowlisted recovery.
              </p>
            </div>
          )}

          <div
            className={`flex items-center ${
              isCompact ? 'justify-center' : 'justify-between'
            } p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]`}
          >
            {!isCompact && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[var(--text-main)] truncate">
                  {user?.username || 'Operator'}
                </div>
                <div
                  className={`text-[10px] font-mono ${
                    isAdmin ? 'text-[#F59E0B]' : 'text-[#38BDF8]'
                  }`}
                >
                  {isAdmin ? 'ROLE_ADMIN' : 'ROLE_OPERATOR'}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[#F43F5E] hover:bg-[var(--bg-card)] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] min-h-[calc(100vh-4rem)] transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarBody(false)}
      </aside>

      {/* Mobile / Tablet Slide-Over Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] shadow-elevated">
            {sidebarBody(true)}
          </aside>
        </div>
      )}
    </>
  );
};
