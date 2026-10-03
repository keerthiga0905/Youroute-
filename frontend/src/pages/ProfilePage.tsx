import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, updatePriority, deleteAllTrips, deleteUserAccount } from '../services/api';
import { User } from '../types';
import { WeatherBackground } from '../components/WeatherBackground';
import { User as UserIcon, Sliders, Trash2, LogOut, Check, Lock, ShieldCheck, Sparkles } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [priority, setPriority] = useState('balanced');
  const [savedMsg, setSavedMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const data = await getCurrentUser();
      setUser(data);
      setPriority(data.preferred_priority || 'balanced');
    } catch (e) {
      setUser({
        id: 1,
        email: 'keerthigamurali3116@gmail.com',
        full_name: 'Keerthiga Murali',
        preferred_priority: 'balanced',
        created_at: new Date().toISOString()
      });
    }
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
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        await deleteUserAccount();
        navigate('/');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('saferoute_token');
    navigate('/');
  };

  return (
    <WeatherBackground condition="Clear" defaultImage="https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=2000&q=80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        
        <div className="forest-card p-8 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 text-[#F4D06F] text-xs font-mono font-bold mb-1">
              <UserIcon className="w-4 h-4" />
              <span>USER PROFILE & PREFERENCES</span>
            </div>
            <h1 className="text-3xl font-serif font-black text-white">
              Account <span className="gold-text-gradient">Settings</span>
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Manage your safety algorithm priorities, history logs, and security credentials.
            </p>
          </div>

          {savedMsg && (
            <span className="px-3.5 py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{savedMsg}</span>
            </span>
          )}
        </div>

        {/* User Card */}
        <div className="forest-card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] text-[#071C14] flex items-center justify-center font-serif font-black text-2xl shadow-lg">
              {user?.full_name?.charAt(0) || 'K'}
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-white">{user?.full_name}</h3>
              <p className="text-xs text-slate-400 font-mono">{user?.email}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 bg-[#0B2A1E] border border-[#D4AF37]/30 text-[10px] font-mono font-bold text-[#F4D06F] rounded-full">
                VERIFIED PROTECTED SESSION
              </span>
            </div>
          </div>
        </div>

        {/* Priority Setting */}
        <div className="forest-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-serif font-bold text-base border-b border-[#064E3B] pb-3">
            <Sliders className="w-5 h-5 text-[#F4D06F]" />
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
                className={`p-4 rounded-xl border text-left transition-all ${
                  priority === item.id
                    ? 'bg-[#0B2A1E] border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                    : 'bg-[#071C14]/60 border-[#064E3B] hover:border-slate-700'
                }`}
              >
                <h4 className="text-xs font-bold text-white mb-1">{item.label}</h4>
                <p className="text-[11px] text-slate-400">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="forest-card p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <button
            onClick={handleDeleteHistory}
            className="px-4 py-2.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/50 text-xs font-bold rounded-xl flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Trip Logs</span>
          </button>

          <button
            onClick={handleSignOut}
            className="gold-btn-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>

      </div>
    </WeatherBackground>
  );
};
