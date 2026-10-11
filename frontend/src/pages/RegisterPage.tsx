import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api';
import { Shield, Lock, Mail, User, Phone, Check, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Password Strength Calculations
  const hasMinLength = password.length >= 12;
  const hasUpperLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumberOrSymbol = /\d/.test(password) || /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const strengthScore = [hasMinLength, hasUpperLower, hasNumberOrSymbol].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (password.length === 0) return '';
    if (strengthScore === 3 && passwordsMatch) return 'Strong & Secure';
    if (strengthScore >= 2) return 'Moderate';
    return 'Weak (Needs 12+ chars, mixed case, number/symbol)';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasMinLength) {
      setError('Password must be at least 12 characters long.');
      return;
    }
    if (!hasUpperLower || !hasNumberOrSymbol) {
      setError('Password must include uppercase, lowercase, and a number or symbol.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setError('You must accept the terms of service and privacy policy to register.');
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirm_password: confirmPassword,
        phone: phone.trim() || undefined,
        agree_to_terms: agreeTerms
      });

      // Redirect to verification screen with email prefilled
      navigate(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('Registration failed. Please check your inputs and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-[#071C14] via-[#0B2A1E] to-[#04130D] text-white flex items-center justify-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-[#0B2A1E]/85 backdrop-blur-xl border border-[#D4AF37]/30 rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center text-[#071C14] mx-auto shadow-[0_0_20px_rgba(212,175,55,0.4)]">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Create Your <span className="text-[#D4AF37]">RouteMap</span> Account
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/70">
              Join AI Personal Safety Risk Predictor & Family Mesh Network
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-4 bg-red-950/60 border border-red-500/40 rounded-2xl text-red-200 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="text-xs font-bold text-emerald-200/90 uppercase tracking-wider block mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#D4AF37]/70 absolute left-4 top-3.5" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Keerthiga Murali"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-[#071C14]/90 border border-emerald-900/60 rounded-xl text-sm text-white placeholder-emerald-700 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="text-xs font-bold text-emerald-200/90 uppercase tracking-wider block mb-1">
                Email Address *
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

            {/* Optional Phone Number */}
            <div>
              <label className="text-xs font-bold text-emerald-200/90 uppercase tracking-wider block mb-1">
                Phone Number <span className="text-emerald-400/50 lowercase">(optional for SMS alerts)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#D4AF37]/70 absolute left-4 top-3.5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-11 pr-4 py-3 bg-[#071C14]/90 border border-emerald-900/60 rounded-xl text-sm text-white placeholder-emerald-700 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-bold text-emerald-200/90 uppercase tracking-wider block mb-1">
                Password * (min 12 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#D4AF37]/70 absolute left-4 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
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
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#D4AF37]/70 absolute left-4 top-3.5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
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

            {/* Password Policy Meter */}
            {password.length > 0 && (
              <div className="bg-[#071C14]/80 p-3 rounded-xl border border-emerald-900/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-300 font-semibold">Password Strength:</span>
                  <span className={`font-bold ${strengthScore === 3 ? 'text-[#D4AF37]' : strengthScore === 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {getStrengthLabel()}
                  </span>
                </div>
                
                {/* Visual Bar */}
                <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full">
                  <div className={`h-full rounded-full transition-all ${strengthScore >= 1 ? 'bg-red-500' : 'bg-emerald-950'}`} />
                  <div className={`h-full rounded-full transition-all ${strengthScore >= 2 ? 'bg-yellow-400' : 'bg-emerald-950'}`} />
                  <div className={`h-full rounded-full transition-all ${strengthScore === 3 ? 'bg-[#D4AF37]' : 'bg-emerald-950'}`} />
                </div>

                <div className="grid grid-cols-2 gap-1 text-[11px] text-emerald-300/80 pt-1">
                  <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    <Check className="w-3 h-3" /> 12+ characters
                  </span>
                  <span className={`flex items-center gap-1 ${hasUpperLower ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    <Check className="w-3 h-3" /> Uppercase & lowercase
                  </span>
                  <span className={`flex items-center gap-1 ${hasNumberOrSymbol ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    <Check className="w-3 h-3" /> Number or symbol
                  </span>
                  <span className={`flex items-center gap-1 ${passwordsMatch ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    <Check className="w-3 h-3" /> Passwords match
                  </span>
                </div>
              </div>
            )}

            {/* Terms and Privacy Policy */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-emerald-200/80 select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  required
                  className="w-4 h-4 mt-0.5 rounded border-emerald-800 bg-[#071C14] text-[#D4AF37] focus:ring-[#D4AF37]"
                />
                <span>
                  I agree to RouteMap's <span className="text-[#D4AF37] font-bold">Privacy Policy</span> and{' '}
                  <span className="text-[#D4AF37] font-bold">Terms of Service</span>, including family safety mesh location sharing rules.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#D4AF37] via-[#F4D06F] to-[#D4AF37] text-[#071C14] font-black text-sm rounded-xl shadow-[0_10px_25px_rgba(212,175,55,0.3)] hover:shadow-[0_10px_35px_rgba(212,175,55,0.5)] hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#071C14] border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account & Generating OTP...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center pt-2 border-t border-emerald-900/40">
            <p className="text-xs text-emerald-200/70">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-[#D4AF37] hover:text-[#F4D06F] transition ml-1">
                Log In Here
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
