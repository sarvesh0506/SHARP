import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import { SystemConfig } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorBanner } from '../components/ui/Banners';
import { Shield, Sliders, Save, Lock, RefreshCw, Database } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { isAdmin, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [intervalSec, setIntervalSec] = useState(10);
  const [retentionHours, setRetentionHours] = useState(24);
  const [cpuWarning, setCpuWarning] = useState(75);
  const [cpuCritical, setCpuCritical] = useState(90);
  const [memWarning, setMemWarning] = useState(80);
  const [memCritical, setMemCritical] = useState(92);
  const [diskWarning, setDiskWarning] = useState(85);
  const [netMbpsWarning, setNetMbpsWarning] = useState(100);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/config');
      const list: SystemConfig[] = res.data?.data ?? [];
      const map: Record<string, string> = {};
      list.forEach((c) => {
        map[c.configKey] = c.configValue;
      });

      if (map['monitoring.enabled'] !== undefined) setMonitoringEnabled(map['monitoring.enabled'] === 'true');
      if (map['monitoring.interval_sec'] !== undefined) setIntervalSec(Number(map['monitoring.interval_sec']));
      if (map['monitoring.retention_hours'] !== undefined) setRetentionHours(Number(map['monitoring.retention_hours']));
      if (map['threshold.cpu.warning'] !== undefined) setCpuWarning(Number(map['threshold.cpu.warning']));
      if (map['threshold.cpu.critical'] !== undefined) setCpuCritical(Number(map['threshold.cpu.critical']));
      if (map['threshold.memory.warning'] !== undefined) setMemWarning(Number(map['threshold.memory.warning']));
      if (map['threshold.memory.critical'] !== undefined) setMemCritical(Number(map['threshold.memory.critical']));
      if (map['threshold.disk.warning'] !== undefined) setDiskWarning(Number(map['threshold.disk.warning']));
      if (map['threshold.network.mbps_warning'] !== undefined) setNetMbpsWarning(Number(map['threshold.network.mbps_warning']));
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load system configuration from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedNotice(null);

    if (cpuWarning >= cpuCritical) {
      setError('CPU Warning threshold must be strictly lower than CPU Critical threshold.');
      return;
    }
    if (memWarning >= memCritical) {
      setError('Memory Warning threshold must be strictly lower than Memory Critical threshold.');
      return;
    }
    if (intervalSec < 2 || intervalSec > 300) {
      setError('Monitoring interval must be between 2 and 300 seconds.');
      return;
    }
    if (retentionHours < 1 || retentionHours > 720) {
      setError('Retention period must be between 1 and 720 hours.');
      return;
    }

    try {
      setSaving(true);
      await apiClient.put('/config', {
        'monitoring.enabled': String(monitoringEnabled),
        'monitoring.interval_sec': String(intervalSec),
        'monitoring.retention_hours': String(retentionHours),
        'threshold.cpu.warning': String(cpuWarning),
        'threshold.cpu.critical': String(cpuCritical),
        'threshold.memory.warning': String(memWarning),
        'threshold.memory.critical': String(memCritical),
        'threshold.disk.warning': String(diskWarning),
        'threshold.network.mbps_warning': String(netMbpsWarning),
      });
      setSavedNotice('System configuration persisted to database and active for telemetry collection.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save configuration. Administrator role required.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        subtitle="Persistent monitoring intervals, metric retention, and resource threshold configuration."
        onRefresh={fetchConfigs}
        isRefreshing={loading}
      />

      {error && <ErrorBanner message={error} onRetry={fetchConfigs} />}

      {!isAdmin && (
        <div className="p-4 rounded-xl bg-dark-900 border border-dark-700 text-xs text-[var(--text-muted)] font-mono flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#EAE7D6]" />
          Signed in as <strong className="text-[var(--text-main)]">{user?.username}</strong> (OPERATOR). Only Administrators can persist configuration changes.
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-[var(--text-muted)] font-mono text-xs">
          <RefreshCw className="w-5 h-5 animate-spin inline mr-2 text-[#5D7B6F]" />
          Loading persisted configuration...
        </div>
      ) : (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Thresholds */}
          <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#A4C3A2]" />
              Resource Thresholds
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] font-mono mb-1">CPU Warning (%)</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  disabled={!isAdmin}
                  value={cpuWarning}
                  onChange={(e) => setCpuWarning(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)] font-mono focus:outline-none focus:border-[#5D7B6F] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[var(--text-muted)] font-mono mb-1">CPU Critical (%)</label>
                <input
                  type="number"
                  min={2}
                  max={100}
                  disabled={!isAdmin}
                  value={cpuCritical}
                  onChange={(e) => setCpuCritical(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)] font-mono focus:outline-none focus:border-[#5D7B6F] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[var(--text-muted)] font-mono mb-1">Memory Warning (%)</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  disabled={!isAdmin}
                  value={memWarning}
                  onChange={(e) => setMemWarning(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)] font-mono focus:outline-none focus:border-[#5D7B6F] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[var(--text-muted)] font-mono mb-1">Memory Critical (%)</label>
                <input
                  type="number"
                  min={2}
                  max={100}
                  disabled={!isAdmin}
                  value={memCritical}
                  onChange={(e) => setMemCritical(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)] font-mono focus:outline-none focus:border-[#5D7B6F] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[var(--text-muted)] font-mono mb-1">Disk Warning (%)</label>
                <input
                  type="number"
                  min={10}
                  max={99}
                  disabled={!isAdmin}
                  value={diskWarning}
                  onChange={(e) => setDiskWarning(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)] font-mono focus:outline-none focus:border-[#5D7B6F] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[var(--text-muted)] font-mono mb-1">Network Warning (Mbps)</label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  disabled={!isAdmin}
                  value={netMbpsWarning}
                  onChange={(e) => setNetMbpsWarning(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)] font-mono focus:outline-none focus:border-[#5D7B6F] disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Telemetry Collection & Retention */}
          <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#D7F9FA]" />
              Telemetry Collection & Retention
            </h2>

            <label className="flex items-start justify-between gap-4 p-3 rounded-lg bg-dark-850 border border-dark-700 cursor-pointer text-xs">
              <div>
                <div className="font-semibold text-[var(--text-main)]">Enable Background Telemetry Collector</div>
                <div className="text-[var(--text-muted)] mt-0.5">
                  Periodically collects real host CPU, memory, disk, network, and OS process metrics.
                </div>
              </div>
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={monitoringEnabled}
                onChange={(e) => setMonitoringEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#5D7B6F]"
              />
            </label>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] font-mono mb-1">Collection Interval (sec)</label>
                <input
                  type="number"
                  min={2}
                  max={300}
                  disabled={!isAdmin}
                  value={intervalSec}
                  onChange={(e) => setIntervalSec(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)] font-mono focus:outline-none focus:border-[#5D7B6F] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[var(--text-muted)] font-mono mb-1">Metric Retention (hours)</label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  disabled={!isAdmin}
                  value={retentionHours}
                  onChange={(e) => setRetentionHours(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-dark-850 border border-dark-700 text-[var(--text-main)] font-mono focus:outline-none focus:border-[#5D7B6F] disabled:opacity-50"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-dark-950 border border-dark-800 flex items-center gap-2 text-[11px] font-mono text-[#EAE7D6]">
              <Shield className="w-4 h-4 shrink-0" />
              Safety invariant: High-risk recovery execution without Administrator approval remains permanently disabled.
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {savedNotice && (
              <div className="p-3 rounded-xl bg-[#B0D4B8]/10 border border-[#B0D4B8]/35 text-[#B0D4B8] text-xs font-mono">
                {savedNotice}
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!isAdmin || saving}
                className="px-4 py-2 rounded-lg bg-[#5D7B6F] hover:bg-[#4D685D] disabled:opacity-50 text-white text-xs font-medium flex items-center gap-2 transition"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
