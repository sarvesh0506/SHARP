import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { Application } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { Layers, Plus, RefreshCw, Trash2, Container, Activity } from 'lucide-react';

export const ApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dockerContainerId: '',
    dockerImage: '',
    healthEndpoint: '/health',
    port: 8080,
    isAutoRecoveryEnabled: true,
  });

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/applications');
      if (res.data && res.data.data) {
        setApplications(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/applications', formData);
      setShowModal(false);
      setFormData({
        name: '',
        description: '',
        dockerContainerId: '',
        dockerImage: '',
        healthEndpoint: '/health',
        port: 8080,
        isAutoRecoveryEnabled: true,
      });
      fetchApplications();
    } catch (err) {
      console.error('Failed to register application:', err);
      alert('Error registering application. Please check input details.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to de-register this application?')) return;
    try {
      await apiClient.delete(`/applications/${id}`);
      fetchApplications();
    } catch (err) {
      console.error('Failed to delete application:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-dark-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-mono">
            Application Registry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Docker containers, health endpoints, and autonomous recovery configurations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-medium shadow-md shadow-[#7C3AED]/20 transition"
          >
            <Plus className="w-4 h-4" />
            Register Application
          </button>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-850 border-b border-dark-700/80 text-slate-400 uppercase font-mono tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Application</th>
                <th className="py-3.5 px-4">Container ID / Image</th>
                <th className="py-3.5 px-4">Port / Endpoint</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Telemetry (CPU / Mem)</th>
                <th className="py-3.5 px-4">Auto-Recovery</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 font-mono">
                    <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#7C3AED]" />
                    Fetching application registry...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 font-mono">
                    No applications registered yet. Click 'Register Application' above to add your first Docker container.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-dark-850/60 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <Container className="w-4 h-4 text-[#A78BFA]" />
                        <div>
                          <div className="font-semibold">{app.name}</div>
                          <div className="text-[11px] text-slate-500">{app.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      <div>{app.dockerContainerId || 'N/A'}</div>
                      <div className="text-[11px] text-slate-500">{app.dockerImage || 'default'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      <div>Port: {app.port || '80'}</div>
                      <div className="text-[11px] text-slate-500">{app.healthEndpoint}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div>CPU: {app.cpuUsage}%</div>
                      <div className="text-slate-500">MEM: {app.memoryUsage}%</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                        app.isAutoRecoveryEnabled
                          ? 'bg-[#7C3AED]/15 text-[#A78BFA] border-[#7C3AED]/35'
                          : 'bg-dark-800 text-slate-500 border-dark-700'
                      }`}>
                        {app.isAutoRecoveryEnabled ? 'ENABLED' : 'MANUAL ONLY'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-dark-800 rounded transition"
                          title="De-register Application"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100 font-mono mb-4 flex items-center gap-2">
              <Container className="w-5 h-5 text-[#A78BFA]" />
              Register New Application
            </h2>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Application Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
                  placeholder="e.g. payment-gateway"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#7C3AED]"
                  placeholder="Service purpose..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Docker Container ID</label>
                  <input
                    type="text"
                    value={formData.dockerContainerId}
                    onChange={(e) => setFormData({ ...formData, dockerContainerId: e.target.value })}
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#7C3AED] font-mono"
                    placeholder="e.g. 7f8a9b2c3d"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Port</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 80 })}
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#7C3AED] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Docker Image</label>
                <input
                  type="text"
                  value={formData.dockerImage}
                  onChange={(e) => setFormData({ ...formData, dockerImage: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#7C3AED] font-mono"
                  placeholder="e.g. org/service:latest"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Health Endpoint</label>
                <input
                  type="text"
                  value={formData.healthEndpoint}
                  onChange={(e) => setFormData({ ...formData, healthEndpoint: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#7C3AED] font-mono"
                  placeholder="/health"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="autoRecovery"
                  checked={formData.isAutoRecoveryEnabled}
                  onChange={(e) => setFormData({ ...formData, isAutoRecoveryEnabled: e.target.checked })}
                  className="rounded bg-dark-800 border-dark-700 text-blue-600 focus:ring-0"
                />
                <label htmlFor="autoRecovery" className="text-slate-300">
                  Enable Autonomous Self-Healing Recovery Policies
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-dark-800 text-slate-300 hover:bg-dark-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#7C3AED] text-white font-medium hover:bg-[#6D28D9] transition"
                >
                  Confirm & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
