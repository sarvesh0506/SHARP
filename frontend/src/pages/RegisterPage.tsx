import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { SharpLogo } from '../components/ui/SharpLogo';
import { Lock, User, Mail, AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'ROLE_OPERATOR' | 'ROLE_ADMIN'>('ROLE_OPERATOR');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/register', { username, email, password, role });
      if (res.data && res.data.data) {
        login(res.data.data);
        navigate('/');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      const data = err.response?.data;
      if (data?.data && typeof data.data === 'object') {
        const fieldErrors = Object.entries(data.data)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join(' | ');
        setError(fieldErrors || data.message || 'Validation failed.');
      } else if (data?.message) {
        setError(data.message);
      } else if (!err.response || err.response.status >= 500) {
        setError('Unable to reach SHARP backend service (port 8080). Please verify the backend is running.');
      } else {
        setError('Registration failed. Please check your inputs and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#05070A] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(0, 217, 255, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 217, 255, 0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
    >
      {/* Subtle top-center cyan ambient wash */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-20"
        style={{
          background:
            'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(0, 217, 255, 0.25), transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-md w-full space-y-6">
        {/* Centered SHARP Logo + Heading */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-full max-w-[300px] rounded-xl overflow-hidden bg-[#05070A]">
            <SharpLogo variant="register" className="mx-auto" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold font-mono tracking-tight text-white">
              Create SHARP Identity
            </h1>
            <p className="text-xs text-[#94A3B8]">
              Register new administrator or operator credentials.
            </p>
          </div>
        </div>

        {/* Registration Card */}
        <div className="bg-[#10151D] border border-[#1E293B] rounded-2xl p-6 sm:p-8 shadow-2xl">
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/40 text-[#F43F5E] text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label htmlFor="reg-username" className="block text-white font-medium mb-1.5">
                Username *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                <input
                  id="reg-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#05070A] border border-[#1E293B] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF] transition-colors"
                  placeholder="e.g. ops-lead"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-white font-medium mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#05070A] border border-[#1E293B] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF] transition-colors"
                  placeholder="ops@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-white font-medium mb-1.5">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#05070A] border border-[#1E293B] rounded-lg pl-9 pr-10 py-2.5 text-white placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF] transition-colors font-mono"
                  placeholder="At least 6 characters"
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

            <div>
              <label htmlFor="reg-role" className="block text-white font-medium mb-1.5">
                Role Authorization
              </label>
              <select
                id="reg-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'ROLE_OPERATOR' | 'ROLE_ADMIN')}
                className="w-full bg-[#05070A] border border-[#1E293B] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#00D9FF] transition-colors font-mono"
              >
                <option value="ROLE_OPERATOR">OPERATOR (Standard Monitoring & Recovery)</option>
                <option value="ROLE_ADMIN">ADMIN (Full Permissions & Approvals)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#00D9FF] hover:bg-[#33E1FF] text-[#05070A] font-semibold transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#1E293B] text-center text-xs text-[#94A3B8]">
            Already registered?{' '}
            <Link to="/login" className="text-[#00D9FF] hover:underline font-medium">
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
