import React, { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { GlobalSearchModal } from './GlobalSearchModal';
import { SharpLogo } from '../ui/SharpLogo';
import { useAuth } from '../../contexts/AuthContext';

export const AppLayout: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape' && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [mobileSidebarOpen]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg-main)] flex flex-col items-center justify-center gap-4 text-[var(--text-muted)] font-mono text-sm">
        <SharpLogo variant="loading" />
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#5D7B6F] border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
          Initializing SHARP Core...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg-main)] flex flex-col overflow-x-hidden">
      <Navbar
        onOpenMobileMenu={() => setMobileSidebarOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
      />
      <div className="flex flex-1 w-full min-w-0">
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
        <main className="flex-1 w-full max-w-none min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto box-border">
          <Outlet />
        </main>
      </div>
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};
