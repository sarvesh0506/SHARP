import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { ServersPage } from './pages/ServersPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { AgentsPage } from './pages/AgentsPage';
import { AuditPage } from './pages/AuditPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SystemMonitoringPage } from './pages/SystemMonitoringPage';
import { DockerMonitoringPage } from './pages/DockerMonitoringPage';
import { ProcessMonitoringPage } from './pages/ProcessMonitoringPage';
import { FaultDetectionPage } from './pages/FaultDetectionPage';
import { RootCauseAnalysisPage } from './pages/RootCauseAnalysisPage';
import { RecoveryManagementPage } from './pages/RecoveryManagementPage';
import { RecoveryHistoryPage } from './pages/RecoveryHistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { NotificationsPage } from './pages/NotificationsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Application Routes */}
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="servers" element={<ServersPage />} />
            <Route path="monitoring/system" element={<SystemMonitoringPage />} />
            <Route path="monitoring/docker" element={<DockerMonitoringPage />} />
            <Route path="monitoring/processes" element={<ProcessMonitoringPage />} />
            <Route path="incidents" element={<IncidentsPage />} />
            <Route path="detection" element={<FaultDetectionPage />} />
            <Route path="diagnosis" element={<RootCauseAnalysisPage />} />
            <Route path="recovery" element={<RecoveryManagementPage />} />
            <Route path="recovery/history" element={<RecoveryHistoryPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
