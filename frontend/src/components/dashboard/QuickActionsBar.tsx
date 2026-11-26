import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Server,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'View Incidents', to: '/incidents', icon: AlertTriangle, accent: 'text-[#F43F5E]' },
  { label: 'Infrastructure', to: '/servers', icon: Server, accent: 'text-[#34D399]' },
  { label: 'System Metrics', to: '/monitoring/system', icon: Activity, accent: 'text-[#38BDF8]' },
  { label: 'Root Cause Analysis', to: '/diagnosis', icon: Stethoscope, accent: 'text-[#F59E0B]' },
  { label: 'Manage Recoveries', to: '/recovery', icon: ShieldCheck, accent: 'text-[#34D399]' },
  { label: 'Analytics & Reports', to: '/analytics', icon: BarChart3, accent: 'text-[#38BDF8]' },
];

export const QuickActionsBar: React.FC = () => {
  return (
    <div className="sharp-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="sharp-label">Quick Actions</span>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="sharp-btn-secondary"
              >
                <Icon className={`w-3.5 h-3.5 ${action.accent}`} />
                <span>{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
