import React, { useState, useEffect } from 'react';
import { Monitor, Cpu, HardDrive, RefreshCw, Wifi, Server } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { MetricBar } from '../components/ui/MetricBar';
import { UnavailableBanner } from '../components/ui/Banners';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import apiClient from '../api/client';
import { MonitoredServer } from '../types';

// Demo telemetry for visualization — labeled as DEMO clearly
const DEMO_HISTORY = Array.from({ length: 20 }, (_, i) => {
  const t = new Date(Date.now() - (19 - i) * 5000);
  return {
    time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    cpu: 30 + Math.sin(i * 0.6) * 18 + Math.random() * 8,
    memory: 55 + Math.cos(i * 0.4) * 12 + Math.random() * 5,
    disk: 38 + Math.sin(i * 0.2) * 4 + Math.random() * 2,
  };
});

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-850 border border-dark-600 rounded-lg p-3 text-xs font-mono shadow-xl">
        <p className="text-slate-400 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {p.value.toFixed(1)}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const SystemMonitoringPage: React.FC = () => {
  const [servers, setServers] = useState<MonitoredServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedServer, setSelectedServer] = useState<MonitoredServer | null>(null);

  const fetchServers = async () => {
    try {
      setIsRefreshing(true);
      const res = await apiClient.get('/servers');
      if (res.data?.data) {
        const list: MonitoredServer[] = res.data.data;
        setServers(list);
        if (!selectedServer && list.length > 0) setSelectedServer(list[0]);
      }
    } catch {
      // silently handled — servers may be empty on fresh install
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServers();
    const id = setInterval(fetchServers, 15000);
    return () => clearInterval(id);
  }, []);

  const target = selectedServer ?? servers[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Monitoring"
        subtitle="Host-level resource utilization, registered infrastructure targets, and health status."
        onRefresh={fetchServers}
        isRefreshing={isRefreshing}
      />

      <UnavailableBanner
        feature="Live metric collection"
        message="Phase 2 backend polling (SentinelPollingService) not yet active. Charts below display structural demo data. Registered servers are loaded from the live backend."
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Registered Targets"
          value={servers.length}
          subtitle={`${servers.filter((s) => s.status === 'ONLINE').length} Online`}
          icon={Server}
          color="text-[#A78BFA]"
        />
        <StatCard
          title="Avg CPU"
          value={
            servers.length
              ? `${(servers.reduce((a, s) => a + s.cpuUsage, 0) / servers.length).toFixed(1)}%`
              : 'N/A'
          }
          subtitle="Across registered hosts"
          icon={Cpu}
          color="text-cyan-400"
        />
        <StatCard
          title="Avg Memory"
          value={
            servers.length
              ? `${(servers.reduce((a, s) => a + s.memoryUsage, 0) / servers.length).toFixed(1)}%`
              : 'N/A'
          }
          subtitle="Across registered hosts"
          icon={Monitor}
          color="text-indigo-400"
        />
        <StatCard
          title="Avg Disk"
          value={
            servers.length
              ? `${(servers.reduce((a, s) => a + s.diskUsage, 0) / servers.length).toFixed(1)}%`
              : 'N/A'
          }
          subtitle="Across registered hosts"
          icon={HardDrive}
          color="text-emerald-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Server list */}
        <div className="bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 bg-dark-850 border-b border-dark-700 text-xs font-mono text-slate-300 font-semibold uppercase flex justify-between">
            <span>Infrastructure Targets</span>
            <span className="text-slate-500">{servers.length}</span>
          </div>
          <div className="divide-y divide-dark-800">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#7C3AED]" />
                Loading targets...
              </div>
            ) : servers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                No infrastructure targets registered.
                <br />
                <span className="text-slate-600">Add servers via the Infrastructure page.</span>
              </div>
            ) : (
              servers.map((s) => {
                const isSelected = selectedServer?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedServer(s)}
                    className={`p-4 cursor-pointer transition hover:bg-dark-850/70 ${
                      isSelected ? 'bg-dark-850 border-l-2 border-[#7C3AED]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-200 font-mono">{s.hostName}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold ${
                          s.status === 'ONLINE'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                            : s.status === 'DEGRADED'
                            ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                            : 'bg-rose-950/60 text-rose-400 border-rose-800'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{s.ipAddress} · {s.osType}</div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-500">CPU</span>
                        <div className="text-slate-200 font-bold">{s.cpuUsage.toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-slate-500">MEM</span>
                        <div className="text-slate-200 font-bold">{s.memoryUsage.toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-slate-500">DISK</span>
                        <div className="text-slate-200 font-bold">{s.diskUsage.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2 space-y-5">
          {target ? (
            <>
              <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-200 font-mono">{target.hostName}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{target.ipAddress} · {target.osType} · Agent v{target.agentVersion}</p>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    Last seen: {target.lastSeen ? new Date(target.lastSeen).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
                <div className="space-y-4">
                  <MetricBar label="CPU Utilization" value={target.cpuUsage} />
                  <MetricBar label="Memory Utilization" value={target.memoryUsage} color="bg-indigo-500" />
                  <MetricBar label="Disk Usage" value={target.diskUsage} color="bg-emerald-500" />
                </div>
              </div>

              {/* Chart */}
              <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-200">Resource History</h2>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                    DEMO — Live collection requires Phase 2
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={DEMO_HISTORY} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="diskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34D399" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#26324A" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'monospace' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
                    <Area type="monotone" dataKey="cpu" stroke="#7C3AED" fill="url(#cpuGrad)" strokeWidth={1.5} dot={false} name="CPU" />
                    <Area type="monotone" dataKey="memory" stroke="#22D3EE" fill="url(#memGrad)" strokeWidth={1.5} dot={false} name="Memory" />
                    <Area type="monotone" dataKey="disk" stroke="#34D399" fill="url(#diskGrad)" strokeWidth={1.5} dot={false} name="Disk" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-12 text-center shadow-lg">
              <Server className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No infrastructure targets found.</p>
              <p className="text-xs text-slate-600 mt-1">Register a server via the Infrastructure page to begin monitoring.</p>
            </div>
          )}
        </div>
      </div>

      {/* Network I/O placeholder */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-cyan-400" />
            Network I/O
          </h2>
          <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
            AWAITING PHASE 2
          </span>
        </div>
        <div className="flex items-center justify-center h-24 text-slate-600 text-xs font-mono border border-dashed border-dark-700 rounded-lg">
          Network metrics will appear here once Phase 2 monitoring pipeline is active.
        </div>
      </div>
    </div>
  );
};
