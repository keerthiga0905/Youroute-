import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../services/api';
import { Lock, KeyRound, Eye, EyeOff, Check, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  // Strength Policy Validation
  const hasMinLength = newPassword.length >= 12;
  const hasUpperLower = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
  const hasNumberOrSymbol = /\d/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('Please provide your password reset token.');
      return;
    }
    if (!hasMinLength) {
      setError('New password must be at least 12 characters long.');
      return;
    }
    if (!hasUpperLower || !hasNumberOrSymbol) {
      setError('Password must include uppercase, lowercase, and at least one number or symbol.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({
        token: token.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      setSuccess(true);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('Failed to reset password. The token may be expired or already consumed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-[#071C14] via-[#0B2A1E] to-[#04130D] text-white flex items-center justify-center px-4 py-12 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#0B2A1E]/85 backdrop-blur-xl border border-[#D4AF37]/30 rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] space-y-6">
          
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center text-[#071C14] mx-auto shadow-[0_0_25px_rgba(212,175,55,0.4)]">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Set New <span className="text-[#D4AF37]">Password</span>
              </h1>
              <p className="text-xs sm:text-sm text-emerald-200/70 mt-1">
                Enter your reset token and select a new secure password
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-950/60 border border-red-500/40 rounded-2xl text-red-200 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="space-y-5 text-center">
              <div className="p-5 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl space-y-3">
                <CheckCircle2 className="w-10 h-10 text-[#D4AF37] mx-auto" />
                <h3 className="font-bold text-base text-white">Password Updated!</h3>
                <p className="text-xs text-emerald-200/80 leading-relaxed">
                  Your password has been securely updated using Argon2id encryption. All prior active device sessions have been revoked for your safety.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#D4AF37] via-[#F4D06F] to-[#D4AF37] text-[#071C14] font-black text-sm rounded-xl shadow-[0_10px_25px_rgba(212,175,55,0.3)] hover:scale-[1.01] transition flex items-center justify-center gap-2"
              >
                <span>Sign In With New Password</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Reset Token Input */}
              <div>
                <label className="text-xs font-bold text-emerald-200/90 uppercase tracking-wider block mb-1">
                  Reset Token *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#D4AF37]/70 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste your reset token"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-[#071C14]/90 border border-emerald-900/60 rounded-xl text-xs sm:text-sm text-white placeholder-emerald-700 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition font-mono"
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="text-xs font-bold text-emerald-200/90 uppercase tracking-wider block mb-1">
                  New Password * (min 12 chars)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#D4AF37]/70 absolute left-4 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
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

              {/* Confirm Password */}
              <div>
                <label className="text-xs font-bold text-emerald-200/90 uppercase tracking-wider block mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#D4AF37]/70 absolute left-4 top-3.5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    className="w-full pl-11 pr-11 py-3 bg-[#071C14]/90 border border-emerald-900/60 rounded-xl text-sm text-white placeholder-emerald-700 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3.5 text-emerald-400/60 hover:text-[#D4AF37] transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Requirements Checklist */}
              <div className="bg-[#071C14]/80 p-3 rounded-xl border border-emerald-900/50 space-y-1.5 text-[11px] text-emerald-300/80">
                <span className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <Check className="w-3 h-3" /> Minimum 12 characters
                </span>
                <span className={`flex items-center gap-1.5 ${hasUpperLower ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <Check className="w-3 h-3" /> Uppercase and lowercase letters
                </span>
                <span className={`flex items-center gap-1.5 ${hasNumberOrSymbol ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <Check className="w-3 h-3" /> Number or special symbol
                </span>
                <span className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <Check className="w-3 h-3" /> Passwords match
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#D4AF37] via-[#F4D06F] to-[#D4AF37] text-[#071C14] font-black text-sm rounded-xl shadow-[0_10px_25px_rgba(212,175,55,0.3)] hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#071C14] border-t-transparent rounded-full animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Reset Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2 border-t border-emerald-900/40">
                <Link to="/login" className="text-xs font-semibold text-emerald-300 hover:text-[#D4AF37] transition">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
