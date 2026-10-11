import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../services/api';
import { ShieldCheck, Mail, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // 5-minute OTP countdown timer (300 seconds)
  const [timeLeft, setTimeLeft] = useState(300);
  // 60-second resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(60);

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your registered email address.');
      return;
    }
    if (otp.trim().length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await verifyEmail({
        email: email.trim().toLowerCase(),
        otp: otp.trim()
      });
      setSuccess('Email successfully verified! Redirecting to RouteMap...');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('Verification failed. Please check the code and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email.trim()) return;

    setResending(true);
    setError('');
    setSuccess('');

    try {
      const res = await resendVerification(email.trim().toLowerCase());
      setSuccess(res.message || 'A fresh 6-digit code has been sent to your email.');
      setTimeLeft(300);
      setResendCooldown(60);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('Failed to resend code. Please try again shortly.');
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-[#071C14] via-[#0B2A1E] to-[#04130D] text-white flex items-center justify-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Decorative Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#0B2A1E]/85 backdrop-blur-xl border border-[#D4AF37]/30 rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center text-[#071C14] mx-auto shadow-[0_0_25px_rgba(212,175,55,0.4)]">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Verify Your <span className="text-[#D4AF37]">Email</span>
              </h1>
              <p className="text-xs sm:text-sm text-emerald-200/70 mt-1">
                Enter the 6-digit verification code sent to your inbox
              </p>
            </div>
          </div>

          {/* Success Banner */}
          {success && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs sm:text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-red-950/60 border border-red-500/40 rounded-2xl text-red-200 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            {/* Target Email Field */}
            <div>
              <label className="text-xs font-bold text-emerald-200/90 uppercase tracking-wider block mb-1">
                Account Email
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

            {/* 6-Digit OTP Code Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-emerald-200/90 uppercase tracking-wider">
                  6-Digit Verification Code
                </label>
                <div className="flex items-center gap-1 text-xs text-[#D4AF37] font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timeLeft > 0 ? formatTimer(timeLeft) : 'Expired'}</span>
                </div>
              </div>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                required
                className="w-full py-4 text-center tracking-[14px] text-2xl font-black bg-[#071C14]/90 border-2 border-[#D4AF37]/40 rounded-2xl text-[#D4AF37] placeholder-emerald-800 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/30 transition"
              />
              <p className="text-[11px] text-emerald-400/60 mt-1.5 text-center">
                Check your inbox and spam folder. Code expires in 5 minutes.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#D4AF37] via-[#F4D06F] to-[#D4AF37] text-[#071C14] font-black text-sm rounded-xl shadow-[0_10px_25px_rgba(212,175,55,0.3)] hover:shadow-[0_10px_35px_rgba(212,175,55,0.5)] hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#071C14] border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify & Activate Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Resend Action */}
          <div className="pt-2 border-t border-emerald-900/40 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-200/90 hover:text-[#D4AF37] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              {resendCooldown > 0 ? (
                <span>Resend Code in {resendCooldown}s</span>
              ) : (
                <span>Resend Verification Code</span>
              )}
            </button>
            <Link to="/login" className="text-xs text-emerald-400/60 hover:text-emerald-300 transition">
              Back to Sign In
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
