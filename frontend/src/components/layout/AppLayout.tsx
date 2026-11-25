import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { SharpLogo } from '../ui/SharpLogo';
import { useAuth } from '../../contexts/AuthContext';

export const AppLayout: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-dark-950 flex flex-col items-center justify-center gap-4 text-slate-400 font-mono text-sm">
        <SharpLogo variant="loading" />
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
          Initializing SHARP Core...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen w-full bg-dark-950 flex flex-col">
      <Navbar />
      <div className="flex flex-1 w-full min-w-0">
        <Sidebar />
        <main className="flex-1 w-full max-w-none min-w-0 p-6 md:p-8 overflow-y-auto box-border">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
