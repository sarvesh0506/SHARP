import React, { useState } from 'react';
import { Cpu, Terminal, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { UnavailableBanner } from '../components/ui/Banners';

// Structural demo — clearly labeled
const DEMO_PROCESSES = [
  { pid: 4, processName: 'System', cpuPercent: 0.3, memoryKb: 141312, status: 'Running', sessionName: 'Services' },
  { pid: 1052, processName: 'svchost.exe', cpuPercent: 2.1, memoryKb: 65536, status: 'Running', sessionName: 'Services' },
  { pid: 2340, processName: 'sharp-backend.jar', cpuPercent: 12.4, memoryKb: 512000, status: 'Running', sessionName: 'Console' },
  { pid: 3812, processName: 'node.exe', cpuPercent: 4.7, memoryKb: 180000, status: 'Running', sessionName: 'Console' },
  { pid: 6124, processName: 'python.exe', cpuPercent: 1.8, memoryKb: 92000, status: 'Running', sessionName: 'Console' },
  { pid: 7980, processName: 'chrome.exe', cpuPercent: 8.3, memoryKb: 410000, status: 'Running', sessionName: 'Console' },
  { pid: 9440, processName: 'docker.exe', cpuPercent: 0.5, memoryKb: 128000, status: 'Running', sessionName: 'Services' },
  { pid: 10220, processName: 'SearchHost.exe', cpuPercent: 0.1, memoryKb: 72000, status: 'Running', sessionName: 'Console' },
  { pid: 11024, processName: 'Idle', cpuPercent: 68.2, memoryKb: 8, status: 'Running', sessionName: 'Services' },
  { pid: 12288, processName: 'msedge.exe', cpuPercent: 3.1, memoryKb: 320000, status: 'Running', sessionName: 'Console' },
];

export const ProcessMonitoringPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'cpu' | 'memory' | 'pid' | 'name'>('cpu');
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortAsc((v) => !v);
    else { setSortBy(col); setSortAsc(false); }
  };

  const filtered = DEMO_PROCESSES
    .filter((p) => p.processName.toLowerCase().includes(search.toLowerCase()) || String(p.pid).includes(search))
    .sort((a, b) => {
      let va: number | string, vb: number | string;
      if (sortBy === 'cpu') { va = a.cpuPercent; vb = b.cpuPercent; }
      else if (sortBy === 'memory') { va = a.memoryKb; vb = b.memoryKb; }
      else if (sortBy === 'pid') { va = a.pid; vb = b.pid; }
      else { va = a.processName.toLowerCase(); vb = b.processName.toLowerCase(); }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

  const SortHeader: React.FC<{ col: typeof sortBy; label: string }> = ({ col, label }) => (
    <th
      className="py-3.5 px-4 cursor-pointer select-none hover:text-slate-200 transition"
      onClick={() => toggleSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortBy === col && <span>{sortAsc ? '↑' : '↓'}</span>}
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Windows Process Monitoring"
        subtitle="Per-process CPU, memory, and status from the Windows host. Sortable, filterable process table."
      />

      <UnavailableBanner
        feature="Live process data"
        message="Phase 2 ProcessMetricsCollector (Windows tasklist integration) not yet active. The table below shows structural demo data to illustrate the interface. Actual PID/CPU/memory data requires backend Phase 2."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Processes" value={DEMO_PROCESSES.length} subtitle="Demo data" icon={Terminal} color="text-[#A78BFA]" />
        <StatCard title="Running" value={DEMO_PROCESSES.filter((p) => p.status === 'Running').length} subtitle="Normal status" icon={Cpu} trendType="positive" color="text-emerald-400" />
        <StatCard
          title="Top CPU Process"
          value={DEMO_PROCESSES.sort((a, b) => b.cpuPercent - a.cpuPercent)[0]?.processName ?? '—'}
          subtitle={`${DEMO_PROCESSES[0]?.cpuPercent}% CPU`}
          icon={AlertCircle}
          color="text-amber-400"
        />
        <StatCard
          title="Top Memory Process"
          value={[...DEMO_PROCESSES].sort((a, b) => b.memoryKb - a.memoryKb)[0]?.processName ?? '—'}
          subtitle={`${(([...DEMO_PROCESSES].sort((a, b) => b.memoryKb - a.memoryKb)[0]?.memoryKb ?? 0) / 1024).toFixed(0)} MB`}
          icon={Cpu}
          color="text-indigo-400"
        />
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by process name or PID..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-dark-850 border border-dark-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#7C3AED] font-mono"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono">{filtered.length} processes</span>
      </div>

      {/* Process Table */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-850 border-b border-dark-700/80 text-slate-400 uppercase font-mono tracking-wider">
              <tr>
                <SortHeader col="pid" label="PID" />
                <SortHeader col="name" label="Process Name" />
                <SortHeader col="cpu" label="CPU %" />
                <SortHeader col="memory" label="Memory" />
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800 text-slate-300 font-mono text-[11px]">
              {filtered.map((p) => (
                <tr key={p.pid} className="hover:bg-dark-850/60 transition">
                  <td className="py-3 px-4 text-slate-500">{p.pid}</td>
                  <td className="py-3 px-4 text-slate-200 font-semibold">{p.processName}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-bold ${
                        p.cpuPercent > 20 ? 'text-rose-400' : p.cpuPercent > 10 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {p.cpuPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{(p.memoryKb / 1024).toFixed(1)} MB</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{p.sessionName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-slate-600 font-mono flex items-center gap-2">
        <RefreshCw className="w-3 h-3" />
        Process table will auto-refresh every 5 seconds once Phase 2 backend is active.
      </div>
    </div>
  );
};
