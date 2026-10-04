import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getLocationShareTokenDetails,
  submitSharedLocationCoordinates,
  declineLocationShareRequest
} from '../services/api';
import {
  Shield,
  CheckCircle2,
  XCircle,
  MapPin,
  Lock,
  AlertTriangle,
  Send,
  Navigation,
  Clock,
  Compass
} from 'lucide-react';

export const LocationConsentPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<{
    valid: boolean;
    status: string;
    requester_name: string;
    recipient_email: string;
    expires_at: string;
    created_at: string;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Specific browser geolocation error state messages
  const [geoError, setGeoError] = useState<string | null>(null);
  const [sharedCoords, setSharedCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing location sharing token. Please check the link sent to your email.");
      setLoading(false);
      return;
    }

    getLocationShareTokenDetails(token)
      .then((res) => {
        setDetails(res);
        if (res.status === 'ACCEPTED') {
          setAccepted(true);
        } else if (res.status === 'DECLINED') {
          setDeclined(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Invalid or expired location sharing link.");
        setLoading(false);
      });
  }, [token]);

  // Explicit action handler triggered ONLY upon button click
  const handleShareLocation = () => {
    if (!token) return;
    setSubmitting(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("We couldn't determine your location because Geolocation is not supported by your browser.");
      setSubmitting(false);
      return;
    }

    // Call device location API explicitly after user approval
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        try {
          await submitSharedLocationCoordinates({
            token,
            latitude: lat,
            longitude: lng,
            accuracy: accuracy
          });

          setSharedCoords({ lat, lng, accuracy });
          setAccepted(true);
          setSubmitting(false);
        } catch (err: any) {
          setError(err.response?.data?.detail || "Failed to submit shared location to backend.");
          setSubmitting(false);
        }
      },
      (error) => {
        setSubmitting(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError("Location permission was denied. Your location has not been shared.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError("We couldn't determine your location. Please try again.");
            break;
          case error.TIMEOUT:
            setGeoError("Location request timed out. Please try again.");
            break;
          default:
            setGeoError("An unexpected error occurred while obtaining your location. Please try again.");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const handleDecline = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      await declineLocationShareRequest(token);
      setDeclined(true);
      setSubmitting(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to decline location request.");
      setSubmitting(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#041a12] text-white p-6 font-sans">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-emerald-200 font-semibold text-sm tracking-wide">
            Verifying secure location share token...
          </p>
        </div>
      </div>
    );
  }

  // Error / Invalid Link State
  if (error || (details && !details.valid && details.status === 'EXPIRED')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#041a12] via-[#062b1e] to-[#02120b] p-6 font-sans">
        <div className="max-w-md w-full bg-[#063022]/90 border border-amber-500/30 backdrop-blur-xl rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {details?.status === 'EXPIRED' ? <Clock className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
          </div>
          <h2 className="text-2xl font-black text-white mb-2">
            {details?.status === 'EXPIRED' ? "Request Expired" : "Invalid Request Link"}
          </h2>
          <p className="text-emerald-200/80 text-sm mb-6">
            {details?.status === 'EXPIRED'
              ? "This location sharing request has expired automatically for safety."
              : (error || "The location request token is invalid or has already been completed.")}
          </p>
          <Link
            to="/"
            className="inline-block w-full py-3.5 px-4 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-[#041a12] font-black rounded-2xl shadow-lg hover:brightness-110 transition"
          >
            Go to Safe Route Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Declined State
  if (declined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#041a12] via-[#062b1e] to-[#02120b] p-6 font-sans">
        <div className="max-w-md w-full bg-[#063022]/90 border border-amber-500/30 backdrop-blur-xl rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Request Declined</h2>
          <p className="text-emerald-200/80 text-sm mb-6">
            You have declined the location sharing request from <strong className="text-white">{details?.requester_name}</strong>. No location data has been or will be collected.
          </p>
          <div className="p-4 bg-[#041a12]/80 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 text-left mb-6 space-y-1">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-bold text-red-400">Declined by recipient</span>
            </div>
            <div className="flex justify-between">
              <span>Location collected:</span>
              <span className="font-mono text-emerald-400">0.0000, 0.0000 (None)</span>
            </div>
          </div>
          <Link
            to="/"
            className="inline-block w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl shadow-lg transition"
          >
            Close & Return Home
          </Link>
        </div>
      </div>
    );
  }

  // Accepted / Shared State
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#041a12] via-[#062b1e] to-[#02120b] p-6 font-sans">
        <div className="max-w-md w-full bg-[#063022]/90 border border-emerald-500/40 backdrop-blur-xl rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-extrabold text-xs uppercase tracking-wider rounded-full mb-3 inline-block">
            Location Shared Successfully
          </span>
          <h2 className="text-2xl font-black text-white mb-2">Location Approved!</h2>
          <p className="text-emerald-100/80 text-sm mb-6">
            Your current location was securely transmitted to <strong className="text-white">{details?.requester_name}</strong> under your explicit permission.
          </p>

          <div className="bg-[#041a12]/80 border border-amber-500/30 rounded-2xl p-4 text-left text-xs text-emerald-200 space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-emerald-400">Request Status:</span>
              <span className="font-bold text-emerald-300">Accepted</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-400">Shared With:</span>
              <span className="font-bold text-white">{details?.requester_name}</span>
            </div>
            {sharedCoords && (
              <div className="flex justify-between border-t border-emerald-500/20 pt-2">
                <span className="text-amber-400">Shared Coordinates:</span>
                <span className="font-mono text-white">
                  {sharedCoords.lat.toFixed(4)}, {sharedCoords.lng.toFixed(4)}
                </span>
              </div>
            )}
            {sharedCoords?.accuracy && (
              <div className="flex justify-between">
                <span className="text-emerald-400">Estimated Accuracy:</span>
                <span className="font-mono text-emerald-300">±{Math.round(sharedCoords.accuracy)} meters</span>
              </div>
            )}
          </div>

          <Link
            to="/"
            className="inline-block w-full py-3.5 px-4 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-[#041a12] font-black rounded-2xl shadow-xl transition"
          >
            Return to Safe Route Map
          </Link>
        </div>
      </div>
    );
  }

  // Active Consent Screen (Requirement 6 & 18 Dark Green + Gold UI)
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#041a12] via-[#062b1e] to-[#02120b] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-sans text-white">
      <div className="max-w-xl w-full bg-[#063022]/90 border border-[#d4af37]/40 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-[#042418] via-[#083a28] to-[#042418] p-8 border-b border-[#d4af37]/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-2xl backdrop-blur-md">
              <Shield className="w-8 h-8 text-[#d4af37]" />
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#d4af37]">
                Safe Route Consent Engine
              </span>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Share Your Location?
              </h1>
            </div>
          </div>
          <p className="text-emerald-200/90 text-sm font-medium leading-relaxed">
            <strong className="text-amber-300 font-bold">{details?.requester_name}'s Safe Route Map</strong>
          </p>
        </div>

        <div className="p-8 space-y-6">
          {/* Main Description */}
          <div className="bg-[#041a12]/80 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
            <p className="text-sm text-emerald-100 font-medium leading-relaxed">
              Someone has requested access to your current location.
            </p>
            <p className="text-xs text-amber-300/90 font-bold leading-relaxed bg-[#d4af37]/10 border border-[#d4af37]/20 p-3 rounded-xl">
              "Your location will only be shared after you explicitly approve this request."
            </p>
          </div>

          {/* Explanation Checklist */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#d4af37] mb-3">
              When you continue:
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 bg-[#041a12]/60 rounded-2xl border border-emerald-500/20">
                <Navigation className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-100/90 leading-relaxed">
                  Your browser/device will ask for location permission.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-[#041a12]/60 rounded-2xl border border-emerald-500/20">
                <MapPin className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-100/90 leading-relaxed">
                  Your current latitude and longitude will be shared.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-[#041a12]/60 rounded-2xl border border-emerald-500/20">
                <Compass className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-100/90 leading-relaxed">
                  The location will be used only for the requested location-sharing session.
                </p>
              </div>
            </div>
          </div>

          {/* Explicit Security & No-Surveillance Guarantee */}
          <div className="p-4 bg-[#041a12] border border-amber-500/30 rounded-2xl text-xs space-y-2 shadow-inner">
            <div className="flex items-center gap-2 text-amber-400 font-extrabold">
              <Lock className="w-4 h-4" />
              <span>Consent Guarantee & Safety Notice</span>
            </div>
            <p className="text-emerald-200/80 leading-relaxed text-[11px]">
              No hidden tracking, silent background collection, or IP fingerprinting is used. Location is acquired solely from your browser's Geolocation API upon clicking <strong>Share My Location</strong>.
            </p>
          </div>

          {/* Geolocation Denial / Error Alert */}
          {geoError && (
            <div className="p-4 bg-red-500/10 border border-red-500/40 rounded-2xl flex items-start gap-3 text-red-200 text-xs">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold block mb-0.5 text-red-300">Permission Alert</strong>
                <span>{geoError}</span>
              </div>
            </div>
          )}

          {/* Explicit Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleShareLocation}
              disabled={submitting}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-[#d4af37] via-[#eab308] to-[#b8860b] hover:brightness-110 disabled:opacity-50 text-[#041a12] font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition transform active:scale-98"
            >
              <Send className="w-4 h-4 fill-current" />
              <span>{submitting ? "Requesting Browser Permission..." : "Share My Location"}</span>
            </button>

            <button
              onClick={handleDecline}
              disabled={submitting}
              className="py-4 px-6 bg-[#041a12] hover:bg-emerald-950 text-emerald-200 font-bold text-sm rounded-2xl border border-emerald-500/30 transition"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationConsentPage;
