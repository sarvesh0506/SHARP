import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Play,
  Radar,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import {
  AnomalyEvent,
  Incident,
  RecoveryAction,
  RecoveryRecommendation,
} from '../../types';

interface SelfHealingLifecycleProps {
  anomalies: AnomalyEvent[];
  incidents: Incident[];
  recommendations: RecoveryRecommendation[];
  recoveries: RecoveryAction[];
}

interface StageItem {
  key: string;
  step: string;
  label: string;
  to: string;
  icon: React.ElementType;
  primaryMetric: string;
  secondaryMetric: string;
  state: 'active' | 'healthy' | 'warning' | 'idle';
}

export const SelfHealingLifecycle: React.FC<SelfHealingLifecycleProps> = ({
  anomalies,
  incidents,
  recommendations,
  recoveries,
}) => {
  const activeAnomalies = anomalies.filter((a) => a.status === 'ACTIVE').length;
  const rcaCompleted = incidents.filter(
    (i) => i.rcaStatus === 'COMPLETED' || i.rcaStatus === 'FALLBACK_COMPLETED'
  ).length;
  const rcaPending = incidents.filter(
    (i) => !['RESOLVED', 'CLOSED'].includes(i.status) && i.rcaStatus === 'PENDING'
  ).length;
  const pendingRecs = recommendations.filter(
    (r) => r.status === 'PENDING' || r.status === 'APPROVED'
  ).length;
  const executingRecs = recoveries.filter(
    (r) => r.status === 'EXECUTING' || r.status === 'AWAITING_APPROVAL'
  ).length;
  const failedExecs = recoveries.filter((r) => r.status === 'FAILED').length;
  const verifiedCount = recoveries.filter(
    (r) => r.verificationStatus === 'VERIFIED' || r.status === 'VERIFIED'
  ).length;
  const verifyingCount = recoveries.filter(
    (r) => r.status === 'VERIFYING' || r.verificationStatus === 'VERIFYING'
  ).length;
  const resolvedIncidents = incidents.filter(
    (i) => i.status === 'RESOLVED' || i.status === 'CLOSED'
  ).length;

  const stages: StageItem[] = [
    {
      key: 'detect',
      step: '01',
      label: 'DETECT',
      to: '/detection',
      icon: Radar,
      primaryMetric: `${activeAnomalies} Active`,
      secondaryMetric: `${anomalies.length} total anomalies`,
      state: activeAnomalies > 0 ? 'warning' : anomalies.length > 0 ? 'healthy' : 'idle',
    },
    {
      key: 'diagnose',
      step: '02',
      label: 'DIAGNOSE',
      to: '/diagnosis',
      icon: Stethoscope,
      primaryMetric: `${rcaCompleted} Analyzed`,
      secondaryMetric: rcaPending > 0 ? `${rcaPending} pending RCA` : 'RCA queue clear',
      state: rcaPending > 0 ? 'active' : rcaCompleted > 0 ? 'healthy' : 'idle',
    },
    {
      key: 'recommend',
      step: '03',
      label: 'RECOMMEND',
      to: '/recovery',
      icon: ClipboardCheck,
      primaryMetric: `${pendingRecs} Queued`,
      secondaryMetric: `${recommendations.length} total plans`,
      state: pendingRecs > 0 ? 'warning' : recommendations.length > 0 ? 'healthy' : 'idle',
    },
    {
      key: 'execute',
      step: '04',
      label: 'EXECUTE',
      to: '/recovery',
      icon: Play,
      primaryMetric: executingRecs > 0 ? `${executingRecs} Running` : `${recoveries.length} Runs`,
      secondaryMetric: failedExecs > 0 ? `${failedExecs} failed` : 'Allowlist enforced',
      state: failedExecs > 0 ? 'warning' : executingRecs > 0 ? 'active' : recoveries.length > 0 ? 'healthy' : 'idle',
    },
    {
      key: 'verify',
      step: '05',
      label: 'VERIFY',
      to: '/recovery/history',
      icon: ShieldCheck,
      primaryMetric: verifyingCount > 0 ? `${verifyingCount} Probing` : `${verifiedCount} Verified`,
      secondaryMetric: 'Independent check',
      state: verifyingCount > 0 ? 'active' : verifiedCount > 0 ? 'healthy' : 'idle',
    },
    {
      key: 'resolve',
      step: '06',
      label: 'RESOLVE',
      to: '/incidents',
      icon: CheckCircle2,
      primaryMetric: `${resolvedIncidents} Resolved`,
      secondaryMetric: `${incidents.length} total incidents`,
      state: resolvedIncidents > 0 ? 'healthy' : 'idle',
    },
  ];

  const getStageStyles = (state: StageItem['state']) => {
    switch (state) {
      case 'healthy':
        return {
          border: 'border-[#5D7B6F]/35',
          iconBg: 'bg-[#5D7B6F]/12 text-[#B0D4B8] border-[#5D7B6F]/30',
          dot: 'bg-[#B0D4B8]',
        };
      case 'warning':
        return {
          border: 'border-[#EAE7D6]/35',
          iconBg: 'bg-[#EAE7D6]/12 text-[#EAE7D6] border-[#EAE7D6]/30',
          dot: 'bg-[#EAE7D6]',
        };
      case 'active':
        return {
          border: 'border-[#D7F9FA]/35',
          iconBg: 'bg-[#D7F9FA]/12 text-[#D7F9FA] border-[#D7F9FA]/30',
          dot: 'bg-[#D7F9FA]',
        };
      default:
        return {
          border: 'border-[var(--border-subtle)]',
          iconBg: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]',
          dot: 'bg-[#6A7F72]',
        };
    }
  };

  return (
    <section aria-labelledby="lifecycle-heading" className="sharp-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="lifecycle-heading" className="sharp-section-title">
            Autonomous Self-Healing Lifecycle
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            End-to-end closed-loop resilience pipeline backed by live telemetry, RCA, policy gates, and independent verification
          </p>
        </div>
        <Link
          to="/recovery"
          className="text-xs font-mono text-[#B0D4B8] hover:underline inline-flex items-center gap-1"
        >
          <span>Recovery Console</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const styles = getStageStyles(stage.state);
          return (
            <Link
              key={stage.key}
              to={stage.to}
              className={`relative p-3.5 rounded-lg bg-[var(--bg-elevated)] border ${styles.border} hover:border-[var(--border-strong)] transition-colors flex flex-col justify-between gap-2.5 group`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#7D8F82]">{stage.step}</span>
                  <span className="text-[11px] font-mono font-semibold tracking-wider text-[var(--text-main)]">
                    {stage.label}
                  </span>
                </div>
                <div className={`p-1.5 rounded-md border ${styles.iconBg}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold font-mono text-[var(--text-main)] flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                  <span>{stage.primaryMetric}</span>
                </div>
                <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5 truncate">
                  {stage.secondaryMetric}
                </div>
              </div>

              {idx < stages.length - 1 && (
                <ArrowRight
                  aria-hidden="true"
                  className="hidden xl:block w-3.5 h-3.5 text-[#6A7F72] absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 bg-[var(--bg-card)] rounded-full"
                />
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
};
