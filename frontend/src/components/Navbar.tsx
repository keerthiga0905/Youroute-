import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Navigation, Compass, Bookmark, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const desktopNavLinks = [
    { path: '/', label: 'Plan Route', icon: Navigation },
    { path: '/trips', label: 'My Trips', icon: Compass },
    { path: '/saved', label: 'Saved Places', icon: Bookmark },
    { path: '/profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <>
      {/* Desktop Header Navbar */}
      <header className="sticky top-0 z-[1000] bg-white border-b border-slate-200 shadow-sm backdrop-blur-xl bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Concept: Location Pin + Shield + Route */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-red-50 border border-red-200 rounded-xl text-red-600 group-hover:scale-105 transition duration-300 shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-slate-900 font-sans">SafeRoute</span>
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-red-100 text-red-700 rounded-md ml-1">TN</span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block font-medium">Tamil Nadu Intelligent Route Planning & Safety</p>
            </div>
          </Link>

          {/* Desktop Navigation Menu */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {desktopNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/20 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Account Link */}
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-200 transition"
            >
              <UserIcon className="w-3.5 h-3.5 text-red-600" />
              <span className="hidden sm:inline">Account</span>
            </Link>
          </div>

        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[1000] bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center shadow-lg">
        {desktopNavLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition ${
                isActive ? 'text-red-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-red-600' : ''}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
};
