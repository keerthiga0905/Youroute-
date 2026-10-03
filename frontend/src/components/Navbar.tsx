import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Navigation, Compass, Bookmark, User as UserIcon, Users, CloudSun, Info } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Home', icon: Navigation },
    { path: '/plan-route', label: 'Plan Route', icon: Navigation },
    { path: '/family-safety', label: 'Safety & Mesh', icon: Users },
    { path: '/trips', label: 'My Trips', icon: Compass },
    { path: '/saved', label: 'Saved Places', icon: Bookmark },
    { path: '/profile', label: 'Account', icon: UserIcon },
  ];

  return (
    <>
      {/* Sticky Desktop & Tablet Luxury Glass Navbar */}
      <header className="sticky top-0 z-[1000] bg-[#071C14]/90 backdrop-blur-2xl border-b border-[#D4AF37]/30 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Brand: Gold Shield + Serif Heading */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="relative p-2.5 bg-[#0B2A1E] border border-[#D4AF37]/50 rounded-2xl group-hover:border-[#F4D06F] transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <Shield className="w-6 h-6 text-[#F4D06F] group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-[#D4AF37]/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black font-serif tracking-tight text-white group-hover:text-[#F4D06F] transition-colors">
                  SafeRoute <span className="gold-text-gradient">AI</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-[#D4AF37]/15 text-[#F4D06F] border border-[#D4AF37]/30 rounded-full">
                  PRO MAX
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium tracking-wide">
                Intelligent Journey Planning & Risk Intelligence
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0B2A1E]/80 border border-[#D4AF37]/30 shadow-inner">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path || (link.path === '/plan-route' && location.pathname === '/');
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#D4AF37] via-[#F4D06F] to-[#D4AF37] text-[#071C14] shadow-[0_0_20px_rgba(212,175,55,0.4)] scale-[1.02]'
                      : 'text-slate-300 hover:text-[#F4D06F] hover:bg-[#103526]/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#071C14]' : 'text-[#D4AF37]'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Gold Accent Action CTA */}
          <div className="flex items-center gap-3">
            <Link
              to="/plan-route"
              className="gold-btn-primary px-5 py-2.5 text-xs tracking-wider uppercase font-extrabold flex items-center gap-2"
            >
              <Navigation className="w-4 h-4 fill-current" />
              <span>Plan Journey</span>
            </Link>
          </div>

        </div>
      </header>

      {/* Mobile Bottom Navigation Drawer */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[1000] bg-[#071C14]/95 backdrop-blur-2xl border-t border-[#D4AF37]/40 px-3 py-2 flex justify-around items-center shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
                isActive ? 'text-[#F4D06F]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1.5 rounded-xl ${isActive ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/40' : ''}`}>
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#F4D06F]' : 'text-slate-400'}`} />
              </div>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
};
