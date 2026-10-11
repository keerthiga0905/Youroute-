import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, updatePriority, deleteAllTrips, deleteUserAccount, logoutUser, logoutAllSessions, getUserSessions, revokeSession } from '../services/api';
import { User, UserSessionItem } from '../types';
import { WeatherBackground } from '../components/WeatherBackground';
import {
  User as UserIcon,
  Sliders,
  Trash2,
  LogOut,
  Check,
  ShieldCheck,
  Smartphone,
  Laptop,
  Copy,
  Key,
  QrCode,
  AlertCircle,
  Clock,
  Globe
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [priority, setPriority] = useState('balanced');
  const [savedMsg, setSavedMsg] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const data = await getCurrentUser();
      setUser(data);
      setPriority(data.preferred_priority || 'balanced');
    } catch (e) {
      console.error("Could not fetch user profile", e);
    }

    try {
      setLoadingSessions(true);
      const sessionList = await getUserSessions();
      setSessions(sessionList);
    } catch (e) {
      console.warn("Could not fetch user sessions", e);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleUpdatePriority = async (newPriority: string) => {
    setPriority(newPriority);
    try {
      await updatePriority(newPriority);
      setSavedMsg('Preference updated');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (window.confirm("Revoke this login session? The device will be signed out immediately.")) {
      try {
        await revokeSession(sessionId);
        setSessions(prev => prev.filter(s => s.session_id !== sessionId));
        setSavedMsg('Session revoked');
        setTimeout(() => setSavedMsg(''), 2500);
      } catch (e) {
        console.error("Could not revoke session", e);
      }
    }
  };

  const handleLogoutAll = async () => {
    if (window.confirm("Are you sure you want to log out from all devices? You will be returned to the login screen.")) {
      try {
        await logoutAllSessions();
        navigate('/login');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } finally {
      navigate('/login');
    }
  };

  const handleDeleteHistory = async () => {
    if (window.confirm("Are you sure you want to delete your trip history?")) {
      try {
        await deleteAllTrips();
        setSavedMsg('Trip history deleted');
        setTimeout(() => setSavedMsg(''), 2500);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to permanently delete your account and safety network? This action cannot be undone.")) {
      try {
        await deleteUserAccount();
        navigate('/');
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <WeatherBackground condition="Clear" defaultImage="https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=2000&q=80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 font-sans">
        
        {/* Profile Header */}
        <div className="bg-[#0B2A1E]/90 backdrop-blur-xl border border-[#D4AF37]/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xl">
          <div>
            <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-mono font-bold mb-1">
              <UserIcon className="w-4 h-4" />
              <span>ROUTEMAP AUTHENTICATED PROFILE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Account & <span className="text-[#D4AF37]">Security Settings</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/70 mt-1">
              Manage your permanent identifiers, family connection ID, and active device sessions.
            </p>
          </div>

          {savedMsg && (
            <span className="px-3.5 py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{savedMsg}</span>
            </span>
          )}
        </div>

        {/* User Card & Identifiers */}
        <div className="bg-[#0B2A1E]/80 backdrop-blur-xl border border-[#D4AF37]/25 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-emerald-900/60">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] text-[#071C14] flex items-center justify-center font-black text-2xl shadow-lg">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>{user?.full_name || 'RouteMap Explorer'}</span>
                  {user?.is_verified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-900/70 text-emerald-300 border border-emerald-600/40 rounded-full text-[11px] font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified
                    </span>
                  )}
                </h3>
                <p className="text-xs sm:text-sm text-emerald-200/70 font-mono">{user?.email}</p>
                {user?.phone && (
                  <p className="text-xs text-emerald-400/80 font-mono mt-0.5">{user.phone}</p>
                )}
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="self-start sm:self-center px-4 py-2 bg-red-950/40 hover:bg-red-950/80 text-red-300 border border-red-800/40 rounded-xl text-xs font-bold flex items-center gap-2 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Separation of Permanent User ID vs Public Family Connection ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Permanent User ID */}
            <div className="bg-[#071C14]/90 p-4 rounded-2xl border border-emerald-900/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/80 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#D4AF37]" /> Permanent User ID (UUID)
                </span>
                <button
                  onClick={() => handleCopy(user?.user_id || '', 'user_id')}
                  className="text-xs text-[#D4AF37] hover:text-[#F4D06F] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedField === 'user_id' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-white break-all">
                {user?.user_id || 'Not available'}
              </p>
              <p className="text-[10px] text-emerald-500/60">
                Immutable account identifier used across all devices and sessions.
              </p>
            </div>

            {/* Public Family Connection ID */}
            <div className="bg-[#071C14]/90 p-4 rounded-2xl border border-emerald-900/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/80 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-[#D4AF37]" /> Public Family Connection ID
                </span>
                <button
                  onClick={() => handleCopy(user?.public_user_id || '', 'public_id')}
                  className="text-xs text-[#D4AF37] hover:text-[#F4D06F] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedField === 'public_id' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-sm font-bold text-[#D4AF37]">
                {user?.public_user_id || 'RM-XXXXXX'}
              </p>
              <p className="text-[10px] text-emerald-500/60">
                Safe public identifier used for QR code invitations & mesh networking.
              </p>
            </div>

          </div>
        </div>

        {/* Active Device Sessions */}
        <div className="bg-[#0B2A1E]/80 backdrop-blur-xl border border-[#D4AF37]/25 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-900/60 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#D4AF37]" /> Active Device Sessions
              </h3>
              <p className="text-xs text-emerald-200/70">
                Review and revoke login sessions across your devices.
              </p>
            </div>
            
            {sessions.length > 1 && (
              <button
                onClick={handleLogoutAll}
                className="self-start sm:self-center px-3 py-1.5 bg-red-950/50 hover:bg-red-900/70 text-red-300 border border-red-700/50 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Revoke All Other Devices</span>
              </button>
            )}
          </div>

          {loadingSessions ? (
            <div className="text-center py-6 text-xs text-emerald-300 animate-pulse">
              Loading active sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-6 text-xs text-emerald-400/60">
              No active sessions recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div
                  key={s.session_id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    s.is_current
                      ? 'bg-[#071C14] border-[#D4AF37]/60 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                      : 'bg-[#071C14]/60 border-emerald-900/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-[#D4AF37]">
                      {s.device_info.toLowerCase().includes('mobile') ? (
                        <Smartphone className="w-5 h-5" />
                      ) : (
                        <Laptop className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate max-w-xs">
                          {s.device_info || 'Browser Session'}
                        </span>
                        {s.is_current && (
                          <span className="px-2 py-0.5 bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] rounded-full text-[10px] font-bold">
                            Current Device
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-emerald-400/70 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" /> {s.ip_address || 'Localhost'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(s.last_used_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!s.is_current && (
                    <button
                      onClick={() => handleRevokeSession(s.session_id)}
                      className="self-end sm:self-center px-3 py-1.5 bg-red-950/40 hover:bg-red-900/80 text-red-300 border border-red-800/40 rounded-lg text-xs font-semibold transition"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Priority Setting */}
        <div className="bg-[#0B2A1E]/80 backdrop-blur-xl border border-[#D4AF37]/25 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-white font-bold text-base border-b border-emerald-900/60 pb-3">
            <Sliders className="w-5 h-5 text-[#D4AF37]" />
            <span>Default Route Calculation Priority</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'shortest', label: 'Shortest Distance', desc: 'Prioritizes shortest travel length' },
              { id: 'fastest', label: 'Fastest Travel Time', desc: 'Prioritizes highway velocity' },
              { id: 'balanced', label: 'Balanced Safety', desc: 'Weighted ML risk minimization' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => handleUpdatePriority(item.id)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  priority === item.id
                    ? 'bg-[#0B2A1E] border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                    : 'bg-[#071C14]/70 border-emerald-900/50 hover:border-emerald-700'
                }`}
              >
                <h4 className="text-xs font-bold text-white mb-1">{item.label}</h4>
                <p className="text-[11px] text-emerald-300/70">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Account Deletion & Danger Zone */}
        <div className="bg-[#0B2A1E]/80 backdrop-blur-xl border border-red-900/40 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h4 className="text-sm font-bold text-red-300">Danger Zone</h4>
            <p className="text-xs text-red-200/60">
              Clear trip logs or permanently delete account data.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDeleteHistory}
              className="px-4 py-2 bg-red-950/40 hover:bg-red-900 text-red-300 border border-red-800/50 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Trips</span>
            </button>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition"
            >
              Delete Account
            </button>
          </div>
        </div>

      </div>
    </WeatherBackground>
  );
};

export default ProfilePage;
