import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, AlertTriangle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600 text-xs py-10 mb-16 md:mb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 border border-red-200 rounded-xl text-red-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-sm">SafeRoute Tamil Nadu</p>
              <p className="text-slate-500">Choose your route. Understand its risk. Travel with better information.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-slate-600 text-xs font-semibold">
            <Link to="/" className="hover:text-red-600 transition">Plan Route</Link>
            <Link to="/trips" className="hover:text-red-600 transition">My Trips</Link>
            <Link to="/saved" className="hover:text-red-600 transition">Saved Places</Link>
            <Link to="/help" className="hover:text-red-600 transition">Help & Privacy</Link>
            <Link to="/profile" className="hover:text-red-600 transition">Profile</Link>
          </div>
        </div>

        {/* Responsible Safety Notice */}
        <div className="p-4 bg-red-50/60 rounded-2xl border border-red-100 flex items-start gap-3 text-[11px] text-slate-700 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p>
            <strong className="text-red-700 font-extrabold">Responsible Route Intelligence Notice:</strong> SafeRoute provides statistical route-risk estimates derived from historical, municipal, and public infrastructure data in Tamil Nadu. It does not guarantee personal safety. Route risk indicators are designed to provide extra context alongside personal judgment and road awareness.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-slate-500 text-[11px]">
          <p>© {new Date().getFullYear()} SafeRoute Tamil Nadu. All rights reserved.</p>
          <p>Powered by OpenStreetMap, OSRM Engine & Tamil Nadu Safety Datasets.</p>
        </div>

      </div>
    </footer>
  );
};
