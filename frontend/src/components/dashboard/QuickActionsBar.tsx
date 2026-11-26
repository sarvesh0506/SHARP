import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  History,
  Radio,
  Server,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Infrastructure', to: '/servers', icon: Server, accent: 'text-[#B0D4B8]' },
  { label: 'System Metrics', to: '/monitoring/system', icon: Activity, accent: 'text-[#D7F9FA]' },
  { label: 'Incidents', to: '/incidents', icon: AlertTriangle, accent: 'text-[#EAE7D6]' },
  { label: 'Perform RCA', to: '/diagnosis', icon: Stethoscope, accent: 'text-[#EAE7D6]' },
  { label: 'Recovery Mgmt', to: '/recovery', icon: ShieldCheck, accent: 'text-[#B0D4B8]' },
  { label: 'Recovery History', to: '/recovery/history', icon: History, accent: 'text-[#D7F9FA]' },
  { label: 'Analytics', to: '/analytics', icon: BarChart3, accent: 'text-[#D7F9FA]' },
  { label: 'Live Events', to: '/events', icon: Radio, accent: 'text-[#B0D4B8]' },
];

export const QuickActionsBar: React.FC = () => {
  return (
    <section aria-label="Quick Operations" className="sharp-card p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="sharp-label shrink-0">Quick Operations</span>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.to} to={action.to} className="sharp-btn-secondary">
                <Icon className={`w-3.5 h-3.5 ${action.accent}`} />
                <span>{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
