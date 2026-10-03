import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, AlertTriangle, Sparkles, Navigation, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#D4AF37]/30 bg-[#071C14] text-slate-300 text-xs py-12 mb-16 md:mb-0 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#0B2A1E] border border-[#D4AF37]/50 rounded-2xl text-[#F4D06F] shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="font-serif font-black text-lg text-white tracking-wide">
                SafeRoute <span className="gold-text-gradient">AI</span>
              </p>
              <p className="text-slate-400 text-xs max-w-md">
                Plan your journey. Understand the route. Travel safer. Real-time weather, routing, and risk intelligence mesh.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-slate-300 text-xs font-bold">
            <Link to="/" className="hover:text-[#F4D06F] transition">Home</Link>
            <Link to="/plan-route" className="hover:text-[#F4D06F] transition">Plan Route</Link>
            <Link to="/family-safety" className="hover:text-[#F4D06F] transition">Safety & Family Mesh</Link>
            <Link to="/trips" className="hover:text-[#F4D06F] transition">My Trips</Link>
            <Link to="/saved" className="hover:text-[#F4D06F] transition">Saved Places</Link>
            <Link to="/profile" className="hover:text-[#F4D06F] transition">Account & Settings</Link>
          </div>
        </div>

        {/* Responsible Safety Notice */}
        <div className="p-5 bg-[#0B2A1E]/80 rounded-2xl border border-[#D4AF37]/30 flex items-start gap-3.5 text-xs text-slate-300 leading-relaxed backdrop-blur-xl">
          <AlertTriangle className="w-5 h-5 text-[#F4D06F] shrink-0 mt-0.5" />
          <p>
            <strong className="text-[#F4D06F] font-serif font-bold">Responsible Safety Intelligence Notice:</strong> SafeRoute AI calculates route risk estimates derived from real-time meteorological conditions, historical incident density, street illumination coverage, and live emergency proximity. Use these insights alongside personal judgment.
          </p>
        </div>

        <div className="pt-6 border-t border-[#064E3B]/80 flex flex-col sm:flex-row justify-between items-center text-slate-500 text-[11px] gap-2">
          <p>© {new Date().getFullYear()} SafeRoute AI Inc. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[#D4AF37]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Powered by Open-Meteo & OSRM Engine</span>
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
