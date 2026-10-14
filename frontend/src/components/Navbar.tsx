import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Navigation, Compass, Bookmark, User as UserIcon, Users, LogIn, LogOut, QrCode, Sparkles } from 'lucide-react';
import { getStoredUser, logoutUser } from '../services/api';
import { User } from '../types';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('saferoute_token');
    setIsAuth(!!token);
    if (token) {
      const user = getStoredUser();
      setCurrentUser(user);
    } else {
      setCurrentUser(null);
    }
  }, [location.pathname]);

  const handleSignOut = async () => {
    await logoutUser();
    setIsAuth(false);
    setCurrentUser(null);
    navigate('/login');
  };

  const navLinks = [
    { path: '/', label: 'Home', icon: Navigation },
    { path: '/plan-journey', label: 'Plan Journey', icon: Sparkles },
    { path: '/plan-route', label: 'Plan Route', icon: Navigation },
    { path: '/family-safety', label: 'Safety & Mesh', icon: Users },
    { path: '/trips', label: 'My Trips', icon: Compass },
    { path: '/saved', label: 'Saved Places', icon: Bookmark },
    { path: '/profile', label: 'Account', icon: UserIcon },
  ];

  return (
    <>
      {/* Sticky Desktop & Tablet Luxury Glass Navbar */}
      <header className="sticky top-0 z-[1000] bg-[#071C14]/95 backdrop-blur-2xl border-b border-[#D4AF37]/30 shadow-[0_10px_30px_rgba(0,0,0,0.8)] font-sans">
        <div className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3 lg:gap-6">
          
          {/* Logo Brand: Gold Shield + Serif Heading */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
            <div className="relative p-2.5 bg-[#0B2A1E] border border-[#D4AF37]/50 rounded-2xl group-hover:border-[#F4D06F] transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.2)] flex-shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-[#F4D06F] group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-[#D4AF37]/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-xl sm:text-2xl font-black font-serif tracking-tight text-white group-hover:text-[#F4D06F] transition-colors leading-none">
                  RouteMap <span className="gold-text-gradient">AI</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping flex-shrink-0" />
                <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 bg-[#D4AF37]/15 text-[#F4D06F] border border-[#D4AF37]/30 rounded-full whitespace-nowrap flex-shrink-0 leading-tight">
                  SAFETY MESH
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden xl:block font-medium tracking-wide mt-1 whitespace-nowrap leading-none">
                AI Personal Safety Risk Predictor & Safely Mesh
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 p-1 rounded-2xl bg-[#0B2A1E]/80 border border-[#D4AF37]/30 shadow-inner flex-shrink-0">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#D4AF37] via-[#F4D06F] to-[#D4AF37] text-[#071C14] shadow-[0_0_18px_rgba(212,175,55,0.4)] scale-[1.02]'
                      : 'text-slate-300 hover:text-[#F4D06F] hover:bg-[#103526]/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[#071C14]' : 'text-[#D4AF37]'}`} />
                  <span className="whitespace-nowrap">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action / Auth Status */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {isAuth ? (
              <div className="flex items-center gap-2 sm:gap-2.5">
                {currentUser?.public_user_id && (
                  <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0B2A1E] border border-[#D4AF37]/40 text-[#D4AF37] rounded-xl text-xs font-mono font-bold whitespace-nowrap">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{currentUser.public_user_id}</span>
                  </span>
                )}
                <Link
                  to="/profile"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] text-[#071C14] font-black text-xs sm:text-sm flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-105 transition flex-shrink-0"
                  title="View Profile"
                >
                  {currentUser?.full_name?.charAt(0) || 'U'}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition flex-shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-[#D4AF37] transition flex items-center gap-1.5 whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4 text-[#D4AF37]" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="gold-btn-primary px-3.5 py-2 text-xs tracking-wider uppercase font-extrabold flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Mobile Bottom Navigation Drawer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[1000] bg-[#071C14]/95 backdrop-blur-2xl border-t border-[#D4AF37]/40 px-3 py-2 flex justify-around items-center shadow-[0_-10px_30px_rgba(0,0,0,0.8)] font-sans">
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

export default Navbar;
