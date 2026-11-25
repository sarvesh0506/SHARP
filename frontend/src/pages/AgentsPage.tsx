import React, { useEffect, useState } from 'react';
import {
  Eye,
  Radar,
  Stethoscope,
  Compass,
  Cpu,
  CheckCheck,
  Brain,
  ShieldCheck,
  Lock,
  Layers
} from 'lucide-react';

interface AgentInfo {
  id: string;
  name: string;
  role: string;
  icon: any;
  status: 'ACTIVE' | 'TRAINING' | 'STANDBY';
  description: string;
  responsibilities: string[];
  safetyBound: string;
}

export const AgentsPage: React.FC = () => {
  const agents: AgentInfo[] = [
    {
      id: 'sentinel',
      name: 'Sentinel Agent',
      role: 'Continuous Health Monitor',
      icon: Eye,
      status: 'ACTIVE',
      description: 'Continuously monitors system health, telemetry streams, application heartbeats, and resource saturation thresholds.',
      responsibilities: [
        'Polls application health endpoints every 1-5 seconds',
        'Ingests container CPU, memory, and IOPS metrics',
        'Validates TCP/HTTP socket responsiveness'
      ],
      safetyBound: 'Read-only observer. Cannot mutate system state.'
    },
    {
      id: 'detection',
      name: 'Detection Agent',
      role: 'Anomaly & Failure Detector',
      icon: Radar,
      status: 'ACTIVE',
      description: 'Identifies failures, memory/CPU saturation anomalies, and unexpected crashes using statistical heuristics and machine learning.',
      responsibilities: [
        'Z-score anomaly scoring on memory growth rates',
        'Detects HTTP 5xx error cascades',
        'Flags container death and restart thrashing'
      ],
      safetyBound: 'Classification only. Generates incident alerts for verification.'
    },
    {
      id: 'diagnosis',
      name: 'Diagnosis Agent',
      role: 'Root Cause Analysis Specialist',
      icon: Stethoscope,
      status: 'ACTIVE',
      description: 'Analyses logs, telemetry metrics, and events to identify probable root causes and isolate fault domains.',
      responsibilities: [
        'Analyzes log exceptions (OutOfMemoryError, deadlock, connection timeout)',
        'Correlates container restarts with host kernel metrics',
        'Computes confidence score on probable root causes'
      ],
      safetyBound: 'No system execution privileges. Produces diagnosis evidence contracts.'
    },
    {
      id: 'planning',
      name: 'Planning Agent',
      role: 'Recovery Strategy Architect',
      icon: Compass,
      status: 'ACTIVE',
      description: 'Selects an appropriate recovery strategy from strict policy definitions and classifies risk levels.',
      responsibilities: [
        'Evaluates allowlisted remediation actions against safety policies',
        'Assigns risk tier (LOW vs HIGH)',
        'Enforces administrator approval requirements for high-risk actions'
      ],
      safetyBound: 'Bound by strict allowlists. Cannot create arbitrary command plans.'
    },
    {
      id: 'recovery',
      name: 'Recovery Agent',
      role: 'Controlled Recovery Executor',
      icon: Cpu,
      status: 'ACTIVE',
      description: 'Executes permitted recovery actions through safe, controlled adapters with explicit permissions.',
      responsibilities: [
        'Executes Docker container restarts with graceful timeouts',
        'Purges transient Redis cache bottlenecks',
        'Applies rate throttling to degraded endpoints'
      ],
      safetyBound: 'No arbitrary shell access. Only allowlisted Docker/OS adapters permitted.'
    },
    {
      id: 'verification',
      name: 'Verification Agent',
      role: 'Independent Verification Specialist',
      icon: CheckCheck,
      status: 'ACTIVE',
      description: 'Independently checks whether recovery succeeded without relying on the Recovery Agent’s execution report.',
      responsibilities: [
        'Conducts multi-step post-recovery health probes',
        'Validates that CPU and memory stabilized below target thresholds',
        'Triggers rollback or escalates to operator if recovery failed'
      ],
      safetyBound: 'Operates completely independently from recovery executor pipeline.'
    },
    {
      id: 'learning',
      name: 'Learning Agent',
      role: 'Continuous Resilience Optimizer',
      icon: Brain,
      status: 'ACTIVE',
      description: 'Analyses historical incidents and recovery outcomes to improve future recommendations and reduce MTTR.',
      responsibilities: [
        'Builds Bayesian priors on recovery success per failure pattern',
        'Recommends optimal timeout and memory threshold tuning',
        'Generates weekly resilience audit analytics'
      ],
      safetyBound: 'Offline analytical recommendations. Cannot modify live policies directly.'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-dark-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-mono">
            Seven Specialized AI Agents
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Distinct, identifiable roles governing the complete autonomous self-healing resilience loop.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 text-xs font-mono">
          <ShieldCheck className="w-4 h-4" />
          7/7 AGENTS DEPLOYED & ACTIVE
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <div
              key={agent.id}
              className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg flex flex-col justify-between hover:border-dark-600 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-dark-800 border border-dark-700 text-cyan-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
                    {agent.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-200">{agent.name}</h3>
                <p className="text-xs font-mono text-cyan-400 mb-2">{agent.role}</p>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{agent.description}</p>

                <div className="space-y-1.5 mb-4">
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wide">Core Responsibilities</span>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    {agent.responsibilities.map((r, i) => (
                      <li key={i} className="leading-snug">{r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-dark-800">
                <div className="flex items-start gap-1.5 text-[11px] text-amber-400/90 font-mono">
                  <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Bound: {agent.safetyBound}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
