import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import {
  Eye,
  Radar,
  Stethoscope,
  Compass,
  Cpu,
  CheckCheck,
  Brain,
  Lock,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorBanner } from '../components/ui/Banners';

interface AgentCatalogItem {
  id: string;
  name: string;
  role: string;
  icon: any;
  description: string;
  responsibilities: string[];
  safetyBound: string;
}

const AGENT_CATALOG: AgentCatalogItem[] = [
  {
    id: 'sentinel',
    name: 'Sentinel Agent',
    role: 'Continuous Health Monitor',
    icon: Eye,
    description: 'Continuously monitors system health, telemetry streams, application heartbeats, and resource saturation thresholds.',
    responsibilities: [
      'Evaluates host & application metric snapshots',
      'Ingests container CPU, memory, and IOPS metrics',
      'Validates HTTP/TCP responsiveness',
    ],
    safetyBound: 'Read-only observer. Cannot mutate system state.',
  },
  {
    id: 'detection',
    name: 'Detection Agent',
    role: 'Anomaly & Failure Detector',
    icon: Radar,
    description: 'Identifies failures, memory/CPU saturation anomalies, and unexpected crashes using statistical heuristics and ML.',
    responsibilities: [
      'Z-score & IsolationForest anomaly scoring',
      'Detects HTTP 5xx error cascades',
      'Flags container crashes and restart thrashing',
    ],
    safetyBound: 'Classification only. Generates incident alerts for verification.',
  },
  {
    id: 'diagnosis',
    name: 'Diagnosis Agent',
    role: 'Root Cause Analysis Specialist',
    icon: Stethoscope,
    description: 'Analyses logs, telemetry metrics, and events to identify probable root causes and isolate fault domains.',
    responsibilities: [
      'Analyzes log exceptions (OOM, deadlock, timeout)',
      'Correlates container restarts with host metrics',
      'Computes confidence score on probable root causes',
    ],
    safetyBound: 'No system execution privileges. Produces diagnosis evidence contracts.',
  },
  {
    id: 'planning',
    name: 'Planning Agent',
    role: 'Recovery Strategy Architect',
    icon: Compass,
    description: 'Selects an appropriate recovery strategy from strict policy definitions and classifies risk levels.',
    responsibilities: [
      'Evaluates allowlisted remediation actions against safety policies',
      'Assigns risk tier (LOW vs HIGH)',
      'Enforces administrator approval requirements for high-risk actions',
    ],
    safetyBound: 'Bound by strict allowlists. Cannot create arbitrary command plans.',
  },
  {
    id: 'recovery',
    name: 'Recovery Agent',
    role: 'Controlled Recovery Executor',
    icon: Cpu,
    description: 'Executes permitted recovery actions through safe, controlled adapters with explicit permissions.',
    responsibilities: [
      'Executes graceful restarts within allowlist',
      'Purges transient Redis cache bottlenecks',
      'Applies safe configuration reloads',
    ],
    safetyBound: 'No arbitrary shell access. Only allowlisted adapters permitted.',
  },
  {
    id: 'verification',
    name: 'Verification Agent',
    role: 'Independent Verification Specialist',
    icon: CheckCheck,
    description: 'Independently checks whether recovery succeeded without relying on the Recovery Agent report.',
    responsibilities: [
      'Conducts multi-step post-recovery health probes',
      'Validates that CPU and memory stabilized below thresholds',
      'Escalates to operator if recovery failed',
    ],
    safetyBound: 'Operates independently from recovery executor pipeline.',
  },
  {
    id: 'learning',
    name: 'Learning Agent',
    role: 'Continuous Resilience Optimizer',
    icon: Brain,
    description: 'Analyses historical incidents and recovery outcomes to improve future recommendations and reduce MTTR.',
    responsibilities: [
      'Analyzes historical MTTR and success rates',
      'Recommends threshold tuning',
      'Supports resilience audit analytics',
    ],
    safetyBound: 'Offline analytical recommendations. Cannot modify live policies directly.',
  },
];

export const AgentsPage: React.FC = () => {
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);
  const [liveAgents, setLiveAgents] = useState<{ name: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgentStatus = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/agents/status');
      const data = res.data?.data;
      setReachable(Boolean(data?.reachable));
      setServiceMessage(data?.message || null);
      setLiveAgents(Array.isArray(data?.agents) ? data.agents : []);
      setError(null);
    } catch (err: any) {
      setReachable(false);
      setError(err?.response?.data?.message || 'Failed to query backend AI agent status proxy.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentStatus();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Autonomous AI Agents"
        subtitle="Specialized agent architecture with explicit safety boundaries and live Python AI service status."
        onRefresh={fetchAgentStatus}
        isRefreshing={loading}
        badge={
          reachable === null ? (
            <StatusBadge status="CHECKING" />
          ) : (
            <StatusBadge status={reachable ? 'ONLINE' : 'OFFLINE'} />
          )
        }
      />

      {error && <ErrorBanner message={error} onRetry={fetchAgentStatus} />}

      {reachable === false && (
        <div className="p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs space-y-1">
          <div className="font-mono font-bold text-[#F59E0B]">AI SERVICE OFFLINE</div>
          <p className="text-[#E2E8F0]">
            {serviceMessage || 'Python FastAPI AI service is not currently running on port 8000. Agent statuses are shown as OFFLINE.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {AGENT_CATALOG.map((agent) => {
          const Icon = agent.icon;
          const live = liveAgents.find((a) => a.name.toLowerCase() === agent.name.toLowerCase());
          const status = loading ? 'CHECKING' : reachable ? (live?.status || 'ACTIVE') : 'OFFLINE';

          return (
            <div
              key={agent.id}
              className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/35 text-[#A78BFA]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100 font-mono">{agent.name}</h3>
                      <p className="text-[11px] text-[#22D3EE]">{agent.role}</p>
                    </div>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{agent.description}</p>

                <ul className="space-y-1 text-[11px] text-slate-300 font-mono">
                  {agent.responsibilities.map((r) => (
                    <li key={r} className="flex items-start gap-1.5">
                      <span className="text-[#7C3AED]">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-dark-800 flex items-start gap-1.5 text-[11px] text-amber-400/90 font-mono">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Bound: {agent.safetyBound}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
