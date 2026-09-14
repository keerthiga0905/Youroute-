import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, updatePriority, deleteAllTrips, deleteUserAccount } from '../services/api';
import { User } from '../types';
import { User as UserIcon, Sliders, Trash2, LogOut, Check, Lock } from 'lucide-react';

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
        email: 'user@saferoute.ai',
        full_name: 'SafeRoute User',
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
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 font-sans">
      
      <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <UserIcon className="w-6 h-6 text-red-600" />
            <span>Profile & Account Settings</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your route preferences and privacy settings.
          </p>
        </div>

        {savedMsg && (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>{savedMsg}</span>
          </span>
        )}
      </div>

      {/* Account Info Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center font-black text-lg">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-base">{user?.full_name || 'SafeRoute User'}</h2>
            <p className="text-xs text-slate-500 font-mono">{user?.email || 'user@saferoute.ai'}</p>
          </div>
        </div>
      </div>

      {/* Priority Preference Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-red-600" />
          Default Route Priority
        </h2>

        <div className="space-y-3">
          {[
            { id: 'fastest', title: 'Fastest', desc: 'Prioritize shortest duration.' },
            { id: 'balanced', title: 'Balanced', desc: 'Balance travel time, distance, and road conditions.' },
            { id: 'lower_risk', title: 'Lower Predicted Risk', desc: 'Prefer corridors with lower predicted safety risk.' },
          ].map((item) => {
            const active = priority === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleUpdatePriority(item.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  active
                    ? 'bg-red-50 border-red-500 text-slate-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-red-200'
                }`}
              >
                <div>
                  <p className="font-extrabold text-xs text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
                {active && <Check className="w-4 h-4 text-red-600" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Privacy Actions */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Lock className="w-4 h-4 text-red-600" />
          Privacy Controls
        </h2>

        <div className="space-y-3">
          <button
            onClick={handleDeleteHistory}
            className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-2xl text-xs font-bold border border-slate-200 transition flex items-center justify-between"
          >
            <span>Delete my trip history</span>
            <Trash2 className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={handleDeleteAccount}
            className="w-full p-3.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-2xl text-xs font-bold border border-red-200 transition flex items-center justify-between"
          >
            <span>Delete my account</span>
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* Sign Out */}
      <div className="pt-2">
        <button
          onClick={handleSignOut}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

    </div>
  );
};
