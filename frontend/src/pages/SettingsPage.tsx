import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { UnavailableBanner } from '../components/ui/Banners';
import { Settings, Shield, Sliders, Bot, Save, Lock } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { isAdmin, user } = useAuth();

  const [cpuWarning, setCpuWarning] = useState(75);
  const [cpuCritical, setCpuCritical] = useState(90);
  const [memWarning, setMemWarning] = useState(80);
  const [memCritical, setMemCritical] = useState(92);
  const [pollInterval, setPollInterval] = useState(5);
  const [aiPipelineEnabled, setAiPipelineEnabled] = useState(true);
  const [autoExecuteLowRisk, setAutoExecuteLowRisk] = useState(true);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSavedNotice(null);

    if (cpuWarning >= cpuCritical) {
      setValidationError('CPU Warning threshold must be strictly lower than CPU Critical threshold.');
      return;
    }
    if (memWarning >= memCritical) {
      setValidationError('Memory Warning threshold must be strictly lower than Memory Critical threshold.');
      return;
    }
    if (pollInterval < 1 || pollInterval > 300) {
      setValidationError('Polling interval must be between 1 and 300 seconds.');
      return;
    }

    setSavedNotice(
      'Configuration validated locally. Persistent saving will take effect once Phase 2 /api/v1/config endpoints are implemented.'
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        subtitle="Configure detection thresholds, Sentinel polling frequency, AI agent pipeline toggles, and safety gates."
      />

      <UnavailableBanner
        feature="Persistent Configuration API"
        message="Backend endpoints GET/PUT /api/v1/config are scheduled for Phase 2. Changes below are validated in-browser and not yet persisted to the database."
      />

      {!isAdmin && (
        <div className="p-4 rounded-xl bg-dark-900 border border-dark-700 text-xs text-slate-400 font-mono flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          Signed in as <strong className="text-slate-200">{user?.username}</strong> (OPERATOR). Only Administrators can modify system policies.
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detection Thresholds */}
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#A78BFA]" />
            Anomaly Detection Thresholds
          </h2>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-mono mb-1">CPU Warning (%)</label>
              <input
                type="number"
                min={10}
                max={95}
                disabled={!isAdmin}
                value={cpuWarning}
                onChange={(e) => setCpuWarning(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-mono mb-1">CPU Critical (%)</label>
              <input
                type="number"
                min={20}
                max={100}
                disabled={!isAdmin}
                value={cpuCritical}
                onChange={(e) => setCpuCritical(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-mono mb-1">Memory Warning (%)</label>
              <input
                type="number"
                min={10}
                max={95}
                disabled={!isAdmin}
                value={memWarning}
                onChange={(e) => setMemWarning(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-mono mb-1">Memory Critical (%)</label>
              <input
                type="number"
                min={20}
                max={100}
                disabled={!isAdmin}
                value={memCritical}
                onChange={(e) => setMemCritical(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED] disabled:opacity-50"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-slate-400 font-mono mb-1">Sentinel Polling Interval (seconds)</label>
            <input
              type="number"
              min={1}
              max={300}
              disabled={!isAdmin}
              value={pollInterval}
              onChange={(e) => setPollInterval(Number(e.target.value))}
              className="w-full max-w-xs px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-slate-200 font-mono focus:outline-none focus:border-[#7C3AED] disabled:opacity-50"
            />
          </div>
        </div>

        {/* AI & Safety Controls */}
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Bot className="w-4 h-4 text-cyan-400" />
            AI Pipeline & Safety Controls
          </h2>

          <div className="space-y-4 text-xs">
            <label className="flex items-start justify-between gap-4 p-3 rounded-lg bg-dark-850 border border-dark-700 cursor-pointer">
              <div>
                <div className="font-semibold text-slate-200">Enable 7-Agent AI Pipeline</div>
                <div className="text-slate-400 mt-0.5">
                  Routes anomalous snapshots to Detection, Diagnosis, and Planning agents.
                </div>
              </div>
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={aiPipelineEnabled}
                onChange={(e) => setAiPipelineEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#7C3AED]"
              />
            </label>

            <label className="flex items-start justify-between gap-4 p-3 rounded-lg bg-dark-850 border border-dark-700 cursor-pointer">
              <div>
                <div className="font-semibold text-slate-200">Auto-Execute Low-Risk Actions</div>
                <div className="text-slate-400 mt-0.5">
                  Allows allowlisted LOW risk actions to execute automatically. HIGH risk actions always require Admin approval.
                </div>
              </div>
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={autoExecuteLowRisk}
                onChange={(e) => setAutoExecuteLowRisk(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#7C3AED]"
              />
            </label>

            <div className="p-3 rounded-lg bg-dark-950 border border-dark-800 flex items-center gap-2 text-[11px] font-mono text-amber-400">
              <Shield className="w-4 h-4 shrink-0" />
              Safety invariant: High-risk recovery execution without Administrator approval is permanently disabled.
            </div>
          </div>
        </div>

        {/* Feedback & Submit */}
        <div className="lg:col-span-2 space-y-3">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs font-mono">
              {validationError}
            </div>
          )}
          {savedNotice && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-mono">
              {savedNotice}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isAdmin}
              className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-xs font-medium flex items-center gap-2 transition"
            >
              <Save className="w-4 h-4" />
              Validate & Save Configuration
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
