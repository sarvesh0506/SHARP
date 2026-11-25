import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SharpLogo } from '../ui/SharpLogo';
import {
  LayoutDashboard,
  Layers,
  Server,
  AlertTriangle,
  Bot,
  FileText,
  Activity,
  CheckCircle2,
  Monitor,
  Container,
  Cpu,
  Radar,
  Stethoscope,
  RotateCcw,
  History,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: { name: string; href: string; icon: React.ElementType }[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    name: 'Monitoring',
    icon: Activity,
    children: [
      { name: 'System Metrics', href: '/monitoring/system', icon: Monitor },
      { name: 'Docker Containers', href: '/monitoring/docker', icon: Container },
      { name: 'Windows Processes', href: '/monitoring/processes', icon: Cpu },
    ],
  },
  { name: 'Applications', href: '/applications', icon: Layers },
  { name: 'Infrastructure', href: '/servers', icon: Server },
  {
    name: 'Fault Management',
    icon: AlertTriangle,
    children: [
      { name: 'Incidents', href: '/incidents', icon: AlertTriangle },
      { name: 'Fault Detection', href: '/detection', icon: Radar },
      { name: 'Root Cause Analysis', href: '/diagnosis', icon: Stethoscope },
    ],
  },
  {
    name: 'Recovery',
    icon: RotateCcw,
    children: [
      { name: 'Recovery Management', href: '/recovery', icon: ShieldCheck },
      { name: 'Recovery History', href: '/recovery/history', icon: History },
    ],
  },
  { name: 'AI Agents', href: '/agents', icon: Bot },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Audit Trail', href: '/audit', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const NavGroup: React.FC<{ item: NavItem }> = ({ item }) => {
  const [open, setOpen] = useState(true);
  const Icon = item.icon;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] transition-all"
      >
        <span className="flex items-center space-x-3">
          <Icon className="w-4 h-4 shrink-0" />
          <span>{item.name}</span>
        </span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        )}
      </button>
      {open && item.children && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-[var(--border-subtle)] pl-3">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            return (
              <NavLink
                key={child.name}
                to={child.href}
                end={child.href === '/'}
                className={({ isActive }) =>
                  `flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/35'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)]'
                  }`
                }
              >
                <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{child.name}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, isAdmin, logout } = useAuth();

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] overflow-y-auto transition-all duration-200`}
    >
      <div className="p-3 space-y-1">
        {/* Sidebar Brand + Collapse Toggle */}
        <div className="flex items-center justify-between px-2 py-2 mb-2 border-b border-[var(--border-subtle)] gap-2">
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="rounded-md bg-[#05070A] border border-[var(--border-subtle)] px-1.5 py-0.5 flex items-center min-w-0">
                <SharpLogo variant="sidebar" />
              </div>
              <span className="text-[10px] font-mono text-[#22D3EE] uppercase shrink-0">OPS</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-main)] ml-auto transition"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {navigation.map((item) => {
          if (item.children) {
            if (collapsed) {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.children[0].href}
                  title={item.name}
                  className="flex items-center justify-center p-2.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] transition-all"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                </NavLink>
              );
            }
            return <NavGroup key={item.name} item={item} />;
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href!}
              end={item.href === '/'}
              title={item.name}
              className={({ isActive }) =>
                `flex items-center ${collapsed ? 'justify-center px-2' : 'space-x-3 px-3'} py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/35'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Status + User Profile */}
      <div className="p-3 space-y-2.5 border-t border-[var(--border-subtle)]">
        {!collapsed && (
          <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] space-y-1.5">
            <div className="flex items-center justify-between text-[var(--text-main)] font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                Self-Healing
              </span>
              <span className="text-[10px] bg-[#34D399]/10 text-[#34D399] px-1.5 py-0.5 rounded border border-[#34D399]/30 font-mono">
                ENGAGED
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Autonomous Sentinel & Recovery active for allowlisted targets.
            </p>
          </div>
        )}

        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]`}>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--text-main)] truncate">
                {user?.username || 'Operator'}
              </div>
              <div className={`text-[10px] font-mono ${isAdmin ? 'text-[#F59E0B]' : 'text-[#22D3EE]'}`}>
                {isAdmin ? 'ROLE_ADMIN' : 'ROLE_OPERATOR'}
              </div>
            </div>
          )}
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[#F43F5E] hover:bg-[var(--bg-card)] transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
