import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { verifyInviteToken, acceptFamilyInvite, declineFamilyInvite, updateLocationPayload, registerUser, loginUser } from '../services/api';
import { InviteDetailsResponse } from '../types';
import { Shield, CheckCircle2, XCircle, MapPin, Lock, AlertTriangle, UserCheck, Smartphone, Eye, UserPlus, LogIn } from 'lucide-react';

export const FamilyConsentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [inviteDetails, setInviteDetails] = useState<InviteDetailsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const [locationObtained, setLocationObtained] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Authentication State if user is guest
  const isLoggedIn = !!localStorage.getItem('saferoute_token');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing invitation token. Please check the link sent to your email.");
      setLoading(false);
      return;
    }

    verifyInviteToken(token)
      .then((details) => {
        setInviteDetails(details);
        setAuthEmail(details.email);
        setAuthFullName(details.member_name);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Invalid or expired invitation link.");
        setLoading(false);
      });
  }, [token]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        await registerUser({
          email: authEmail,
          password: authPassword,
          full_name: authFullName
        });
      } else {
        await loginUser({
          email: authEmail,
          password: authPassword
        });
      }
      setAuthLoading(false);
    } catch (err: any) {
      setAuthError(err.response?.data?.detail || "Authentication failed. Please try again.");
      setAuthLoading(false);
    }
  };

  const handleAllowSharing = () => {
    if (!token) return;
    setSubmitting(true);
    setGeoDenied(false);

    if (!navigator.geolocation) {
      setGeoDenied(true);
      setError("Geolocation is not supported by your browser.");
      setSubmitting(false);
      return;
    }

    // Explicit Device Location API Call
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        setLocationObtained({ lat, lng });

        try {
          // Accept family invitation
          await acceptFamilyInvite(token);
          // Send initial location update
          await updateLocationPayload({
            latitude: lat,
            longitude: lng,
            accuracy: accuracy
          });

          setAccepted(true);
          setSubmitting(false);
        } catch (err: any) {
          setError(err.response?.data?.detail || "Failed to process location sharing consent.");
          setSubmitting(false);
        }
      },
      (geoErr) => {
        console.error("Location permission denied or failed:", geoErr);
        setGeoDenied(true);
        setSubmitting(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleDecline = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      await declineFamilyInvite(token);
      setDeclined(true);
      setSubmitting(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to decline invitation.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium text-sm">Verifying secure invitation token...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Invalid Invitation</h2>
          <p className="text-slate-600 text-sm mb-6">{error}</p>
          <Link
            to="/family-safety"
            className="inline-block w-full py-3 px-4 bg-slate-900 text-white font-bold rounded-2xl shadow-md hover:bg-slate-800 transition"
          >
            Go to Family Safety Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Request Declined</h2>
          <p className="text-slate-600 text-sm mb-6">
            You have declined the location sharing request from <strong className="text-slate-900">{inviteDetails?.requester_name}</strong>. No location data has been or will be shared.
          </p>
          <Link
            to="/family-safety"
            className="inline-block w-full py-3 px-4 bg-slate-900 text-white font-bold rounded-2xl shadow-md hover:bg-slate-800 transition"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-emerald-200 shadow-2xl text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-black text-xs uppercase tracking-wider rounded-full mb-3 inline-block">
            🟢 Location Sharing Active
          </span>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Consent Approved!</h2>
          <p className="text-slate-600 text-sm mb-6">
            You are now connected with <strong className="text-slate-900">{inviteDetails?.requester_name}</strong> ({inviteDetails?.relationship}). Your location is safely shared under your control.
          </p>

          <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200 mb-6 text-xs text-slate-600 space-y-2">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-bold text-emerald-600">🟢 Active Sharing</span>
            </div>
            <div className="flex justify-between">
              <span>Connected With:</span>
              <span className="font-bold text-slate-900">{inviteDetails?.requester_name}</span>
            </div>
            {locationObtained && (
              <div className="flex justify-between">
                <span>Initial Location:</span>
                <span className="font-mono text-slate-800">{locationObtained.lat.toFixed(4)}, {locationObtained.lng.toFixed(4)}</span>
              </div>
            )}
            <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
              💡 You can pause or stop location sharing at any time from your Family Safety Dashboard.
            </p>
          </div>

          <button
            onClick={() => navigate('/family-safety')}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-lg transition"
          >
            View Family Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-red-200">Family Safety Consent</span>
              <h1 className="text-2xl font-black tracking-tight">Location Request Invitation</h1>
            </div>
          </div>
          <p className="text-red-100 text-sm leading-relaxed">
            <strong className="text-white font-bold">{inviteDetails?.requester_name}</strong> has invited you to join their trusted Family Safety network as their <strong className="text-white font-bold">{inviteDetails?.relationship}</strong>.
          </p>
        </div>

        <div className="p-8 space-y-6">
          {/* Identity Verification Step if guest */}
          {!isLoggedIn ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm mb-2">
                <UserCheck className="w-5 h-5 text-amber-600" />
                <span>Account Authentication Required</span>
              </div>
              <p className="text-xs text-amber-800 mb-4">
                To ensure location safety and give you full control over permissions, please login or set up your account for <strong>{inviteDetails?.email}</strong>.
              </p>

              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    authMode === 'register' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Create Account
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    authMode === 'login' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" /> Login
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={authFullName}
                      onChange={(e) => setAuthFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-red-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Set account password"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {authError && (
                  <p className="text-xs text-red-600 font-bold">{authError}</p>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  {authLoading ? "Authenticating..." : authMode === 'register' ? "Verify Email & Save Account" : "Login to Continue"}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">Authenticated Account</span>
                <span className="text-sm font-black text-slate-900">{inviteDetails?.email}</span>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
            </div>
          )}

          {/* Requested Permissions List */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">Requested Permissions</h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3.5 bg-red-50/60 rounded-2xl border border-red-100">
                <CheckCircle2 className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Share Current Location</h4>
                  <p className="text-[11px] text-slate-600">Allows {inviteDetails?.requester_name} to view your current coordinates on their safe map.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-red-50/60 rounded-2xl border border-red-100">
                <CheckCircle2 className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Share Live Location While Enabled</h4>
                  <p className="text-[11px] text-slate-600">Periodically updates your location while location sharing remains active.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Explicit Privacy Statement */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl text-xs space-y-2 border border-slate-800 shadow-md">
            <div className="flex items-center gap-2 text-red-400 font-extrabold text-xs">
              <Lock className="w-4 h-4" />
              <span>Explicit Consent Guarantee</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              "Your location will <strong>ONLY</strong> be shared after you explicitly approve this request. Entering a phone number or email address alone can never reveal anyone's location."
            </p>
          </div>

          {/* Device Location Denied Alert */}
          {geoDenied && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-2xl flex items-start gap-3 text-red-800 text-xs">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold block mb-0.5 text-red-900">Location permission was denied.</strong>
                <span>Location permission was denied by your browser or device settings. Your location will not be shared until permission is granted in your browser settings.</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAllowSharing}
              disabled={submitting || !isLoggedIn}
              className="flex-1 py-3.5 px-6 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 transition"
            >
              <Smartphone className="w-4 h-4" />
              <span>{submitting ? "Processing Consent..." : "Allow Location Sharing"}</span>
            </button>

            <button
              onClick={handleDecline}
              disabled={submitting}
              className="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl border border-slate-300 transition"
            >
              Decline
            </button>
          </div>

          {!isLoggedIn && (
            <p className="text-[11px] text-center text-slate-500">
              * Please verify or log in to your account above before approving location sharing.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
