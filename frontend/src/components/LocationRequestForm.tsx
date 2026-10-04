import React, { useState, useEffect } from 'react';
import {
  sendLocationShareRequestViaEmail,
  getUserLocationShareRequests,
  deleteUserLocationShareRequest
} from '../services/api';
import { Mail, Send, CheckCircle2, Clock, XCircle, Trash2, MapPin, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';

interface LocationShareItem {
  id: number;
  recipient_email: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  created_at: string;
  expires_at: string;
  updated_at: string;
}

interface LocationRequestFormProps {
  onSelectSharedLocation?: (lat: number, lng: number, email: string) => void;
}

export const LocationRequestForm: React.FC<LocationRequestFormProps> = ({ onSelectSharedLocation }) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  const [requests, setRequests] = useState<LocationShareItem[]>([]);
  const [fetchingRequests, setFetchingRequests] = useState(false);

  const loadRequests = async () => {
    setFetchingRequests(true);
    try {
      const data = await getUserLocationShareRequests();
      setRequests(data);
    } catch (err) {
      console.error("Failed to fetch location share requests:", err);
    } finally {
      setFetchingRequests(false);
    }
  };

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 10000); // Polling every 10s to see if recipient approved
    return () => clearInterval(interval);
  }, []);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setLoading(true);
    setStatusMessage({ type: 'info', text: 'Sending location request...' });

    try {
      const response = await sendLocationShareRequestViaEmail(recipientEmail);
      setStatusMessage({
        type: 'success',
        text: response.message || 'Location request sent successfully. Waiting for recipient to approve.'
      });
      setRecipientEmail('');
      await loadRequests();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.detail || "We couldn't send the request. Please check credentials or try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteUserLocationShareRequest(id);
      setRequests(requests.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete location request:", err);
    }
  };

  return (
    <div className="bg-[#063022]/90 border border-[#d4af37]/40 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl text-white font-sans">
      {/* Title & Intro */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#d4af37]/20">
        <div className="p-3 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-2xl">
          <Mail className="w-6 h-6 text-[#d4af37]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight text-white">Secure Location Sharing via Email</h2>
            <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-[10px] uppercase rounded-full">
              Consent-Based
            </span>
          </div>
          <p className="text-xs text-emerald-200/80">
            Request someone's location via email. They will receive a Gmail link to voluntarily share coordinates.
          </p>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendRequest} className="space-y-4 mb-8">
        <div>
          <label className="block text-xs font-bold text-[#d4af37] uppercase tracking-wider mb-2">
            Recipient Email Address
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 text-emerald-400/60 absolute left-4 top-3.5" />
            <input
              type="email"
              required
              placeholder="e.g. family.member@gmail.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-[#041a12] border border-emerald-500/30 rounded-2xl text-sm font-semibold text-white placeholder-emerald-400/40 focus:ring-2 focus:ring-[#d4af37] focus:border-transparent outline-none transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !recipientEmail}
          className="w-full py-4 px-6 bg-gradient-to-r from-[#d4af37] via-[#eab308] to-[#b8860b] hover:brightness-110 disabled:opacity-50 text-[#041a12] font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition transform active:scale-98"
        >
          <Send className="w-4 h-4 fill-current" />
          <span>{loading ? "Sending location request..." : "Request Location"}</span>
        </button>
      </form>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-start gap-3 mb-8 transition ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-red-500/10 border-red-500/40 text-red-200'
              : 'bg-amber-500/10 border-amber-500/40 text-amber-200'
          }`}
        >
          {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {statusMessage.type === 'error' && <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
          {statusMessage.type === 'info' && <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
          <div>
            <strong className="font-extrabold block mb-0.5">
              {statusMessage.type === 'success'
                ? 'Request Sent'
                : statusMessage.type === 'error'
                ? 'Error'
                : 'Processing'}
            </strong>
            <span>{statusMessage.text}</span>
          </div>
        </div>
      )}

      {/* Requests Status Log & Received Coordinates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Location Requests Status
          </h3>
          <button
            type="button"
            onClick={loadRequests}
            disabled={fetchingRequests}
            className="text-[11px] text-emerald-300 hover:text-white font-bold flex items-center gap-1 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingRequests ? 'animate-spin' : ''}`} /> Refresh Status
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="text-center p-8 bg-[#041a12]/50 border border-emerald-500/20 rounded-2xl text-emerald-300/60 text-xs">
            No active email location requests. Send a request above to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-4 bg-[#041a12]/80 border border-emerald-500/30 rounded-2xl space-y-2 hover:border-[#d4af37]/50 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#d4af37]" /> {req.recipient_email}
                  </span>

                  {/* Status Badge */}
                  {req.status === 'PENDING' && (
                    <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 animate-spin" /> Waiting for permission...
                    </span>
                  )}

                  {req.status === 'ACCEPTED' && (
                    <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-[11px] rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Location shared successfully
                    </span>
                  )}

                  {req.status === 'DECLINED' && (
                    <span className="px-2.5 py-1 bg-red-500/20 border border-red-500/40 text-red-300 font-extrabold text-[11px] rounded-full flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-red-400" /> Request declined
                    </span>
                  )}

                  {req.status === 'EXPIRED' && (
                    <span className="px-2.5 py-1 bg-slate-700/60 border border-slate-600 text-slate-300 font-extrabold text-[11px] rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> Request expired
                    </span>
                  )}
                </div>

                {/* Display Shared Location Details if ACCEPTED */}
                {req.status === 'ACCEPTED' && req.latitude !== null && req.longitude !== null && (
                  <div className="mt-3 p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-emerald-300">
                      <span className="font-bold flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-amber-400" /> Last shared location:
                      </span>
                      <span className="font-mono text-white font-bold">
                        {req.latitude.toFixed(6)}, {req.longitude.toFixed(6)}
                      </span>
                    </div>

                    {req.accuracy && (
                      <div className="text-[11px] text-emerald-200/80 flex justify-between">
                        <span>Accuracy radius:</span>
                        <span className="font-mono">±{Math.round(req.accuracy)} meters</span>
                      </div>
                    )}

                    <div className="text-[11px] text-emerald-400/60 flex justify-between">
                      <span>Updated:</span>
                      <span>{new Date(req.updated_at).toLocaleTimeString()}</span>
                    </div>

                    {onSelectSharedLocation && (
                      <button
                        type="button"
                        onClick={() => onSelectSharedLocation(req.latitude!, req.longitude!, req.recipient_email)}
                        className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-[#041a12] font-black text-xs rounded-xl shadow hover:brightness-110 transition flex items-center justify-center gap-1.5"
                      >
                        <MapPin className="w-3.5 h-3.5" /> View Shared Location on Map
                      </button>
                    )}
                  </div>
                )}

                {/* Action Row */}
                <div className="flex items-center justify-between text-[11px] text-emerald-400/60 pt-2 border-t border-emerald-500/20">
                  <span>Sent: {new Date(req.created_at).toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(req.id)}
                    className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Data
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationRequestForm;
