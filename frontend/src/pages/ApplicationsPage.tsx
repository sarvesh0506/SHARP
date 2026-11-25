import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { Application } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorBanner } from '../components/ui/Banners';
import { useAuth } from '../contexts/AuthContext';
import { Plus, RefreshCw, Trash2, Container, Pencil, AlertTriangle } from 'lucide-react';

interface ApplicationFormState {
  name: string;
  description: string;
  dockerContainerId: string;
  dockerImage: string;
  healthEndpoint: string;
  port: number;
  isAutoRecoveryEnabled: boolean;
}

const INITIAL_FORM: ApplicationFormState = {
  name: '',
  description: '',
  dockerContainerId: '',
  dockerImage: '',
  healthEndpoint: '/health',
  port: 8080,
  isAutoRecoveryEnabled: true,
};

export const ApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [formData, setFormData] = useState<ApplicationFormState>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { isAdmin } = useAuth();

  const fetchApplications = async () => {
    try {
      setIsRefreshing(true);
      const res = await apiClient.get('/applications');
      setApplications(res.data?.data ?? []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load applications:', err);
      setError(err?.response?.data?.message || 'Unable to load applications from SHARP backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const openCreateModal = () => {
    setEditingApp(null);
    setFormData(INITIAL_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (app: Application) => {
    setEditingApp(app);
    setFormData({
      name: app.name || '',
      description: app.description || '',
      dockerContainerId: app.dockerContainerId || '',
      dockerImage: app.dockerImage || '',
      healthEndpoint: app.healthEndpoint || '/health',
      port: app.port ?? 8080,
      isAutoRecoveryEnabled: app.isAutoRecoveryEnabled ?? true,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFeedback(null);

    if (!formData.name.trim()) {
      setFormError('Application name is required.');
      return;
    }
    if (!Number.isInteger(formData.port) || formData.port < 1 || formData.port > 65535) {
      setFormError('Port must be a valid number between 1 and 65535.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      dockerContainerId: formData.dockerContainerId.trim() || null,
      dockerImage: formData.dockerImage.trim() || null,
      healthEndpoint: formData.healthEndpoint.trim() || '/health',
      port: formData.port,
      isAutoRecoveryEnabled: formData.isAutoRecoveryEnabled,
    };

    try {
      setSubmitting(true);
      if (editingApp) {
        await apiClient.put(`/applications/${editingApp.id}`, payload);
        setFeedback(`Application "${payload.name}" updated successfully.`);
      } else {
        await apiClient.post('/applications', payload);
        setFeedback(`Application "${payload.name}" registered successfully.`);
      }
      setShowModal(false);
      setEditingApp(null);
      setFormData(INITIAL_FORM);
      await fetchApplications();
    } catch (err: any) {
      console.error('Failed to save application:', err);
      setFormError(err?.response?.data?.message || 'Error saving application. Please verify your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setFeedback(null);
      await apiClient.delete(`/applications/${deleteTarget.id}`);
      setFeedback(`Application "${deleteTarget.name}" de-registered.`);
      setDeleteTarget(null);
      await fetchApplications();
    } catch (err: any) {
      console.error('Failed to delete application:', err);
      setError(err?.response?.data?.message || 'Failed to delete application. Administrator role required.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
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
            onClick={fetchApplications}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700 text-xs text-slate-300 font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#7C3AED]' : ''}`} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-medium shadow-md shadow-[#7C3AED]/20 transition"
          >
            <Plus className="w-4 h-4" />
            Register Application
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchApplications} />}

      {feedback && (
        <div className="p-3.5 rounded-xl bg-[#34D399]/10 border border-[#34D399]/35 text-[#34D399] text-xs font-mono">
          {feedback}
        </div>
      )}

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
                    {error
                      ? 'Unable to display applications due to backend connection failure.'
                      : "No applications registered yet. Click 'Register Application' above to add your first Docker container."}
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
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                          app.isAutoRecoveryEnabled
                            ? 'bg-[#7C3AED]/15 text-[#A78BFA] border-[#7C3AED]/35'
                            : 'bg-dark-800 text-slate-500 border-dark-700'
                        }`}
                      >
                        {app.isAutoRecoveryEnabled ? 'ENABLED' : 'MANUAL ONLY'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(app)}
                        className="p-1.5 text-slate-400 hover:text-[#22D3EE] hover:bg-dark-800 rounded transition"
                        title="Edit Application"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeleteTarget(app)}
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100 font-mono mb-4 flex items-center gap-2">
              <Container className="w-5 h-5 text-[#A78BFA]" />
              {editingApp ? `Edit Application #${editingApp.id}` : 'Register New Application'}
            </h2>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/40 text-[#F43F5E] text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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
                    min={1}
                    max={65535}
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value, 10) || 0 })}
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
                  className="rounded bg-dark-800 border-dark-700 accent-[#7C3AED]"
                />
                <label htmlFor="autoRecovery" className="text-slate-300">
                  Enable Autonomous Self-Healing Recovery Policies
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-800">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-dark-800 text-slate-300 hover:bg-dark-700 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-[#7C3AED] text-white font-medium hover:bg-[#6D28D9] transition disabled:opacity-50"
                >
                  {submitting
                    ? editingApp
                      ? 'Saving...'
                      : 'Registering...'
                    : editingApp
                    ? 'Save Changes'
                    : 'Confirm & Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-dark-900 border border-[#F43F5E]/40 rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-[#F43F5E] font-mono font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              Confirm De-registration
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-white">{deleteTarget.name}</strong> from the SHARP application registry?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-lg bg-dark-800 text-slate-300 hover:bg-dark-700 text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-lg bg-[#F43F5E] hover:bg-rose-600 text-white text-xs font-medium transition disabled:opacity-50"
              >
                {deleting ? 'Removing...' : 'De-register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
