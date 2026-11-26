import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { Incident, RecoveryRecommendation, RootCauseAnalysis } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorBanner } from '../components/ui/Banners';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Stethoscope,
  Terminal,
  Bot,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Play,
} from 'lucide-react';

export const RootCauseAnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialId = searchParams.get('incidentId');

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [analyses, setAnalyses] = useState<RootCauseAnalysis[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialId ? Number(initialId) : null
  );
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [generatedRec, setGeneratedRec] = useState<RecoveryRecommendation | null>(null);
  const [recError, setRecError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/incidents');
      const incList: Incident[] = res.data?.data ?? [];
      setIncidents(incList);
      setSelectedId((prev) => prev ?? (incList[0]?.id ?? null));
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load incidents for RCA.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalyses = useCallback(async (incId: number) => {
    try {
      const res = await apiClient.get(`/rca/incident/${incId}`);
      setAnalyses(res.data?.data ?? []);
    } catch {
      setAnalyses([]);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    if (selectedId != null) {
      setGeneratedRec(null);
      setRecError(null);
      fetchAnalyses(selectedId);
    }
  }, [selectedId, fetchAnalyses]);

  const selected = incidents.find((i) => i.id === selectedId) ?? null;
  const latestRca = analyses[0] ?? null;

  const handleAnalyze = async () => {
    if (!selected) return;
    try {
      setAnalyzing(true);
      setError(null);
      setFeedback(null);
      const res = await apiClient.post(`/rca/incident/${selected.id}/analyze`);
      const rca: RootCauseAnalysis | undefined = res.data?.data;
      setFeedback(
        rca
          ? `Root Cause Analysis completed (${rca.analysisMethod}).`
          : 'Root Cause Analysis completed.'
      );
      await Promise.all([fetchAnalyses(selected.id), fetchIncidents()]);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to run Root Cause Analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateRecommendation = async () => {
    if (!selected) return;
    try {
      setRecommending(true);
      setError(null);
      setRecError(null);
      setFeedback(null);
      const res = await apiClient.post(`/recovery/recommendations/incident/${selected.id}`, {
        actionType: latestRca?.recommendedActionType || 'RUN_HEALTH_PROBE',
      });
      const rec: RecoveryRecommendation | undefined = res.data?.data;
      if (rec) {
        setGeneratedRec(rec);
        setFeedback(`Recovery recommendation #${rec.id} (${rec.actionType}) created and queued in Recovery Management.`);
      } else {
        setFeedback('Recovery recommendation generated and queued in Recovery Management.');
      }
      await fetchIncidents();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to generate recovery recommendation.';
      setRecError(msg);
      setError(msg);
    } finally {
      setRecommending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Root Cause Analysis"
        subtitle="AI-assisted and deterministic fallback diagnostics backed by real host telemetry and anomaly evidence."
        onRefresh={fetchIncidents}
        isRefreshing={loading}
      />

      {error && <ErrorBanner message={error} onRetry={fetchIncidents} />}

      {feedback && (
        <div className="p-3.5 rounded-xl bg-[#34D399]/10 border border-[#34D399]/35 text-[#34D399] text-xs font-mono">
          {feedback}
        </div>
      )}

      {/* Incident Selector + Analyze Button */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Stethoscope className="w-4 h-4 text-[#A78BFA]" />
          <span>Target Incident:</span>
        </div>
        <select
          value={selected?.id ?? ''}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          disabled={loading || incidents.length === 0}
          className="flex-1 min-w-[240px] max-w-2xl px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED]"
        >
          {incidents.length === 0 ? (
            <option value="">No incidents available</option>
          ) : (
            incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                #{inc.id} [{inc.severity}] {inc.title} ({inc.status})
              </option>
            ))
          )}
        </select>

        <button
          disabled={!selected || analyzing}
          onClick={handleAnalyze}
          className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-50 transition"
        >
          <Play className="w-3.5 h-3.5" />
          {analyzing ? 'Analyzing...' : latestRca ? 'Reanalyze Incident' : 'Analyze Incident'}
        </button>
      </div>

      {!selected ? (
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-8">
          <EmptyState
            icon={<Stethoscope className="w-10 h-10" />}
            title="No Incidents Available"
            description="When an incident is created, select it here to run AI or deterministic Root Cause Analysis."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono text-slate-500 uppercase">
                    Incident #{selected.id} · Source: {selected.source || 'MANUAL'}
                  </span>
                  <h2 className="text-lg font-bold text-slate-100 mt-0.5">{selected.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{selected.description}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="flex flex-wrap gap-4 pt-2 border-t border-dark-800 text-[11px] font-mono text-slate-400">
                <span>Resource: <strong className="text-slate-200">{selected.affectedResource || selected.applicationName || 'Host'}</strong></span>
                <span>Severity: <strong className="text-rose-400">{selected.severity}</strong></span>
                <span>RCA Status: <strong className="text-[#A78BFA]">{selected.rcaStatus || 'PENDING'}</strong></span>
              </div>
            </div>

            {/* Latest RCA Result */}
            <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#A78BFA]" />
                  Root Cause Assessment
                </h3>
                {latestRca && (
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                      latestRca.analysisMethod === 'AI_ANALYSIS'
                        ? 'bg-[#7C3AED]/15 text-[#A78BFA] border-[#7C3AED]/35'
                        : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                    }`}
                  >
                    {latestRca.analysisMethod}
                  </span>
                )}
              </div>

              {latestRca ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 leading-relaxed">
                    {latestRca.hypothesis}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
                    <div className="p-3 rounded-lg bg-dark-850 border border-dark-700">
                      <span className="text-slate-500 block">Contributing Factors</span>
                      <span className="text-slate-300">{latestRca.contributingFactors || 'N/A'}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-dark-850 border border-dark-700">
                      <span className="text-slate-500 block">Confidence</span>
                      <span className="text-[#22D3EE]">
                        {latestRca.confidenceScore != null
                          ? `${(latestRca.confidenceScore * 100).toFixed(0)}% (AI)`
                          : 'N/A (Deterministic Fallback)'}
                      </span>
                    </div>
                  </div>

                  {latestRca.supportingEvidence && (
                    <div>
                      <span className="text-[11px] font-mono text-slate-500 uppercase block mb-1">
                        Supporting Evidence
                      </span>
                      <pre className="p-3 rounded-lg bg-dark-950 border border-dark-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap">
                        {latestRca.supportingEvidence}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-xs font-mono text-slate-500 border border-dashed border-dark-700 rounded-lg">
                  No RCA run yet for this incident. Click <strong>Analyze Incident</strong> above to run diagnostics.
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#22D3EE]" />
                Recommended Investigation
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {latestRca?.recommendedInvestigation || 'Run RCA to generate investigation steps.'}
              </p>
            </div>

            <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#34D399]" />
                Recommended Recovery Action
              </h3>
              <div className="p-3 rounded-lg bg-dark-850 border border-dark-700 font-mono text-xs text-[#22D3EE]">
                {latestRca?.recommendedActionType || 'RUN_HEALTH_PROBE'}
              </div>

              <button
                type="button"
                disabled={recommending}
                onClick={handleCreateRecommendation}
                className="w-full py-2 px-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-medium disabled:opacity-50 transition"
              >
                {recommending ? 'Generating...' : 'Generate Recovery Recommendation'}
              </button>

              {recError && (
                <div className="p-3 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/35 text-[#F43F5E] text-xs font-mono">
                  {recError}
                </div>
              )}

              {generatedRec && (
                <div className="p-3 rounded-lg bg-[#34D399]/10 border border-[#34D399]/35 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[#34D399] font-semibold">
                      Recommendation #{generatedRec.id} Created
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-dark-900 border border-dark-700 text-[10px] text-slate-200">
                      {generatedRec.riskLevel}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-200">
                    {generatedRec.actionType} · {generatedRec.status}
                  </div>
                  {generatedRec.expectedResult && (
                    <p className="text-[11px] text-slate-400">{generatedRec.expectedResult}</p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate('/recovery')}
                className="w-full py-2 px-3 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition"
              >
                Open Recovery Management
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
