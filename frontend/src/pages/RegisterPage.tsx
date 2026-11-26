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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/register', {
        username,
        email,
        password,
        role: 'ROLE_OPERATOR',
      });
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
      className="min-h-screen bg-[#0D1311] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden"
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
          <div className="mx-auto w-full max-w-[300px] rounded-xl overflow-hidden bg-[#0D1311]">
            <SharpLogo variant="register" className="mx-auto" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold font-mono tracking-tight text-white">
              Create SHARP Identity
            </h1>
            <p className="text-xs text-[#98AB9C]">
              Register new administrator or operator credentials.
            </p>
          </div>
        </div>

        {/* Registration Card */}
        <div className="bg-[#111916] border border-[#2A3D36] rounded-2xl p-6 sm:p-8 shadow-2xl">
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-[#EAE7D6]/10 border border-[#EAE7D6]/40 text-[#EAE7D6] text-xs flex items-center gap-2"
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
                <User className="w-4 h-4 text-[#98AB9C] absolute left-3 top-2.5" />
                <input
                  id="reg-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0D1311] border border-[#2A3D36] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-[#7D8F82] focus:outline-none focus:border-[#D7F9FA] transition-colors"
                  placeholder="e.g. ops-lead"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-white font-medium mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#98AB9C] absolute left-3 top-2.5" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0D1311] border border-[#2A3D36] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-[#7D8F82] focus:outline-none focus:border-[#D7F9FA] transition-colors"
                  placeholder="ops@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-white font-medium mb-1.5">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#98AB9C] absolute left-3 top-2.5" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0D1311] border border-[#2A3D36] rounded-lg pl-9 pr-10 py-2.5 text-white placeholder-[#7D8F82] focus:outline-none focus:border-[#D7F9FA] transition-colors font-mono"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-2 p-1 text-[#98AB9C] hover:text-[#D7F9FA] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0D1311] border border-[#2A3D36] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[#98AB9C] font-medium">Assigned Role</span>
                <span className="font-mono text-[#D7F9FA] font-semibold">ROLE_OPERATOR</span>
              </div>
              <p className="text-[11px] text-[#7D8F82]">
                Public registration provisions Operator access. Administrator privileges require authorization by an existing admin.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#D7F9FA] hover:bg-[#D7F9FA] text-[#0D1311] font-semibold transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="mt-6 pt-5 border-t border-[#2A3D36] text-center text-xs text-[#98AB9C]">
            Already registered?{' '}
            <Link to="/login" className="text-[#D7F9FA] hover:underline font-medium">
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
