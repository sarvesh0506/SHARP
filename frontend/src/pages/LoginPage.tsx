import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { SharpLogo } from '../components/ui/SharpLogo';
import { Lock, User, AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/login', {
        username: username.trim(),
        password,
      });
      if (res.data?.data) {
        login(res.data.data);
        navigate('/');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (!err.response || err.response.status >= 500) {
        setError('Unable to reach SHARP authentication service (port 8080).');
      } else {
        setError('Invalid username or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#05070A] text-white flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(0, 217, 255, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 217, 255, 0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
    >
      {/* Subtle top-center cyan ambient wash (no excessive neon) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-20"
        style={{
          background:
            'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(0, 217, 255, 0.25), transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left: Branding Section */}
        <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left space-y-5">
          <div className="w-full max-w-md rounded-2xl overflow-hidden bg-[#05070A]">
            <SharpLogo variant="auth" className="mx-auto lg:mx-0" />
          </div>

          <div className="space-y-2 max-w-md">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#10151D] border border-[#00D9FF]/25 text-[11px] font-mono text-[#00D9FF] tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF]" />
              SHARP
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Self-Healing Autonomous Resilience Platform
            </h1>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              Intelligent infrastructure monitoring, autonomous fault detection, root cause analysis, and self-healing recovery.
            </p>
          </div>
        </div>

        {/* Right: Login Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto lg:ml-auto">
          <div className="bg-[#10151D] border border-[#1E293B] rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">Sign in to SHARP</h2>
              <p className="text-xs text-[#94A3B8] mt-1">
                Authenticate with your operator or administrator credentials.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 p-3 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/40 text-[#F43F5E] text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
              <div>
                <label htmlFor="login-username" className="block text-white font-medium mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                  <input
                    id="login-username"
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#05070A] border border-[#1E293B] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF] transition-colors"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-white font-medium mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#05070A] border border-[#1E293B] rounded-lg pl-9 pr-10 py-2.5 text-white placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF] transition-colors font-mono"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-2 p-1 text-[#94A3B8] hover:text-[#00D9FF] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#00D9FF] hover:bg-[#33E1FF] text-[#05070A] font-semibold transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#1E293B] flex items-center justify-between text-xs text-[#94A3B8]">
              <span>New operator?</span>
              <Link to="/register" className="text-[#00D9FF] hover:underline font-medium">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
