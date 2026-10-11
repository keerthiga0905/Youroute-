import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../services/api';
import { KeyRound, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await forgotPassword(email.trim().toLowerCase());
      setSubmitted(true);
    } catch (err: any) {
      setError('An error occurred. Please try again.');
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
              <KeyRound className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Reset Your <span className="text-[#D4AF37]">Password</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/70">
              Enter your account email to receive a secure single-use password reset link
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-950/60 border border-red-500/40 rounded-2xl text-red-200 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="space-y-5 text-center">
              <div className="p-5 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl space-y-3">
                <CheckCircle2 className="w-10 h-10 text-[#D4AF37] mx-auto" />
                <h3 className="font-bold text-base text-white">Instructions Dispatched</h3>
                <p className="text-xs text-emerald-200/80 leading-relaxed">
                  If an account exists with <span className="text-[#D4AF37] font-semibold">{email}</span>, password reset instructions and your reset token have been delivered to your inbox.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => navigate('/reset-password')}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#D4AF37] via-[#F4D06F] to-[#D4AF37] text-[#071C14] font-black text-sm rounded-xl shadow-[0_10px_25px_rgba(212,175,55,0.3)] hover:scale-[1.01] transition flex items-center justify-center gap-2"
                >
                  <span>Enter Reset Token</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  to="/login"
                  className="block text-xs font-bold text-emerald-300 hover:text-[#D4AF37] transition pt-1"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-emerald-200/90 uppercase tracking-wider block mb-1.5">
                  Account Email Address
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#D4AF37] via-[#F4D06F] to-[#D4AF37] text-[#071C14] font-black text-sm rounded-xl shadow-[0_10px_25px_rgba(212,175,55,0.3)] hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#071C14] border-t-transparent rounded-full animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2 border-t border-emerald-900/40">
                <Link to="/login" className="text-xs font-semibold text-emerald-300 hover:text-[#D4AF37] transition">
                  Remembered your password? Back to Login
                </Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
