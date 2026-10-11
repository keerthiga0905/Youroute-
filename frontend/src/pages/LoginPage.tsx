import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { loginUser } from '../services/api';
import { Shield, Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRequiresVerification(false);

    try {
      await loginUser({
        email: email.trim().toLowerCase(),
        password,
        remember_me: rememberMe
      });
      navigate(from, { replace: true });
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const isUnverified = err.response?.status === 403 && typeof detail === 'string' && detail.toLowerCase().includes('verification');
      
      if (isUnverified) {
        setRequiresVerification(true);
        setError('Your email is not verified yet. Please enter the OTP sent to your inbox.');
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-[#071C14] via-[#0B2A1E] to-[#04130D] text-white flex items-center justify-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#0B2A1E]/85 backdrop-blur-xl border border-[#D4AF37]/30 rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] space-y-6">
          
          {/* Brand Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center text-[#071C14] mx-auto shadow-[0_0_25px_rgba(212,175,55,0.4)]">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome to <span className="text-[#D4AF37]">RouteMap</span>
              </h1>
              <p className="text-xs sm:text-sm text-emerald-200/70 mt-1">
                AI Personal Safety Risk Predictor & Safely Mesh
              </p>
            </div>
          </div>

          {/* Error / Alert Notice */}
          {error && (
            <div className="p-4 bg-red-950/60 border border-red-500/40 rounded-2xl text-red-200 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <span>{error}</span>
                {requiresVerification && (
                  <div>
                    <button
                      type="button"
                      onClick={() => navigate(`/verify-email?email=${encodeURIComponent(email)}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D4AF37] hover:underline"
                    >
                      Enter Verification Code <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-emerald-200/90 uppercase tracking-wider block mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#D4AF37]/70 absolute left-4 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-[#071C14]/90 border border-emerald-900/60 rounded-xl text-sm text-white placeholder-emerald-700 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-emerald-200/90 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#D4AF37] hover:text-[#F4D06F] transition"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#D4AF37]/70 absolute left-4 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-11 pr-11 py-3 bg-[#071C14]/90 border border-emerald-900/60 rounded-xl text-sm text-white placeholder-emerald-700 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-emerald-400/60 hover:text-[#D4AF37] transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs text-emerald-200/80">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-emerald-800 bg-[#071C14] text-[#D4AF37] focus:ring-[#D4AF37]"
                />
                <span>Remember me for 30 days</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#D4AF37] via-[#F4D06F] to-[#D4AF37] text-[#071C14] font-extrabold text-sm rounded-xl shadow-[0_10px_25px_rgba(212,175,55,0.3)] hover:shadow-[0_10px_35px_rgba(212,175,55,0.5)] hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#071C14] border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="text-center pt-2 border-t border-emerald-900/40">
            <p className="text-xs text-emerald-200/70">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-[#D4AF37] hover:text-[#F4D06F] transition ml-1">
                Register Now
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
