import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LiveEventsProvider } from './contexts/LiveEventsContext';
import { AppLayout } from './components/layout/AppLayout';
import { RouteErrorBoundary } from './components/ui/RouteErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';

const ApplicationsPage = lazy(() =>
  import('./pages/ApplicationsPage').then((m) => ({ default: m.ApplicationsPage }))
);
const ServersPage = lazy(() =>
  import('./pages/ServersPage').then((m) => ({ default: m.ServersPage }))
);
const IncidentsPage = lazy(() =>
  import('./pages/IncidentsPage').then((m) => ({ default: m.IncidentsPage }))
);
const AgentsPage = lazy(() =>
  import('./pages/AgentsPage').then((m) => ({ default: m.AgentsPage }))
);
const AuditPage = lazy(() =>
  import('./pages/AuditPage').then((m) => ({ default: m.AuditPage }))
);
const SystemMonitoringPage = lazy(() =>
  import('./pages/SystemMonitoringPage').then((m) => ({ default: m.SystemMonitoringPage }))
);
const DockerMonitoringPage = lazy(() =>
  import('./pages/DockerMonitoringPage').then((m) => ({ default: m.DockerMonitoringPage }))
);
const ProcessMonitoringPage = lazy(() =>
  import('./pages/ProcessMonitoringPage').then((m) => ({ default: m.ProcessMonitoringPage }))
);
const FaultDetectionPage = lazy(() =>
  import('./pages/FaultDetectionPage').then((m) => ({ default: m.FaultDetectionPage }))
);
const RootCauseAnalysisPage = lazy(() =>
  import('./pages/RootCauseAnalysisPage').then((m) => ({ default: m.RootCauseAnalysisPage }))
);
const RecoveryManagementPage = lazy(() =>
  import('./pages/RecoveryManagementPage').then((m) => ({ default: m.RecoveryManagementPage }))
);
const RecoveryHistoryPage = lazy(() =>
  import('./pages/RecoveryHistoryPage').then((m) => ({ default: m.RecoveryHistoryPage }))
);
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const UserManagementPage = lazy(() =>
  import('./pages/UserManagementPage').then((m) => ({ default: m.UserManagementPage }))
);
const NotificationsPage = lazy(() =>
  import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
);
const LiveEventsPage = lazy(() =>
  import('./pages/LiveEventsPage').then((m) => ({ default: m.LiveEventsPage }))
);

const RouteFallback: React.FC = () => (
  <div className="flex items-center justify-center h-64 text-xs font-mono text-[var(--text-muted)]">
    <span className="w-5 h-5 border-2 border-[#D7F9FA] border-t-transparent rounded-full animate-spin mr-3" />
    Loading module...
  </div>
);

const LazyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RouteErrorBoundary>
    <Suspense fallback={<RouteFallback />}>{children}</Suspense>
  </RouteErrorBoundary>
);

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <LiveEventsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Application Routes */}
            <Route path="/" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="applications" element={<LazyRoute><ApplicationsPage /></LazyRoute>} />
              <Route path="servers" element={<LazyRoute><ServersPage /></LazyRoute>} />
              <Route path="monitoring/system" element={<LazyRoute><SystemMonitoringPage /></LazyRoute>} />
              <Route path="monitoring/docker" element={<LazyRoute><DockerMonitoringPage /></LazyRoute>} />
              <Route path="monitoring/processes" element={<LazyRoute><ProcessMonitoringPage /></LazyRoute>} />
              <Route path="incidents" element={<LazyRoute><IncidentsPage /></LazyRoute>} />
              <Route path="detection" element={<LazyRoute><FaultDetectionPage /></LazyRoute>} />
              <Route path="diagnosis" element={<LazyRoute><RootCauseAnalysisPage /></LazyRoute>} />
              <Route path="recovery" element={<LazyRoute><RecoveryManagementPage /></LazyRoute>} />
              <Route path="recovery/history" element={<LazyRoute><RecoveryHistoryPage /></LazyRoute>} />
              <Route path="agents" element={<LazyRoute><AgentsPage /></LazyRoute>} />
              <Route path="analytics" element={<LazyRoute><AnalyticsPage /></LazyRoute>} />
              <Route path="audit" element={<LazyRoute><AuditPage /></LazyRoute>} />
              <Route path="notifications" element={<LazyRoute><NotificationsPage /></LazyRoute>} />
              <Route path="events" element={<LazyRoute><LiveEventsPage /></LazyRoute>} />
              <Route path="users" element={<LazyRoute><UserManagementPage /></LazyRoute>} />
              <Route path="settings" element={<LazyRoute><SettingsPage /></LazyRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </LiveEventsProvider>
    </AuthProvider>
  );
};

export default App;
