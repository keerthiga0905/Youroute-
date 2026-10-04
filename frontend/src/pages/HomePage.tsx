import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { geolocationService, GPSResult } from '../services/geolocationService';
import { reverseGeocodeService } from '../services/reverseGeocodeService';
import { placesService } from '../services/placesService';
import { validateTNLocation } from '../services/geofenceService';
import { LocationResult } from '../services/locationService';
import { getFamilyMembers } from '../services/api';
import { ConnectedFamilyMember } from '../types';
import { WeatherBackground } from '../components/WeatherBackground';
import {
  Shield, MapPin, Navigation, ArrowRight, Loader2, AlertCircle, LocateFixed, CheckCircle2,
  Users, CloudSun, Sparkles, Activity, ShieldCheck, Zap, Compass, Lock, Mountain, Sun, Waves
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  // Origin State
  const [originInput, setOriginInput] = useState('');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<LocationResult[]>([]);
  const [gpsData, setGpsData] = useState<GPSResult | null>(null);
  const [locationSource, setLocationSource] = useState<string | null>(null);

  // Destination State
  const [destInput, setDestInput] = useState('');
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destSuggestions, setDestSuggestions] = useState<LocationResult[]>([]);

  // UI & Error States
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [tnValidationError, setTnValidationError] = useState<string | null>(null);
  const [connectedFamilyMembers, setConnectedFamilyMembers] = useState<ConnectedFamilyMember[]>([]);

  useEffect(() => {
    // Check if target family member was set from Family Safety module
    const targetLat = sessionStorage.getItem('family_target_lat');
    const targetLng = sessionStorage.getItem('family_target_lng');
    const targetName = sessionStorage.getItem('family_target_name');

    if (targetLat && targetLng && targetName) {
      setDestInput(targetName);
      setDestCoords({ lat: parseFloat(targetLat), lng: parseFloat(targetLng) });
      sessionStorage.removeItem('family_target_lat');
      sessionStorage.removeItem('family_target_lng');
      sessionStorage.removeItem('family_target_name');
    }

    // Load active family members for quick selection
    getFamilyMembers()
      .then((data) => {
        if (data.connected_members) {
          setConnectedFamilyMembers(data.connected_members.filter((m: any) => m.sharing_enabled && m.latitude && m.longitude));
        }
      })
      .catch((err) => console.log("Family members load info:", err));
  }, []);

  // Handle Device Geolocation API
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    setTnValidationError(null);

    try {
      const gps = await geolocationService.getCurrentPosition();
      setGpsData(gps);

      const geocodeRes = await reverseGeocodeService.reverseGeocode(gps.lat, gps.lng);

      const tnVal = validateTNLocation(geocodeRes.formattedAddress || geocodeRes.address, gps.lat, gps.lng);
      if (!tnVal.isValid) {
        setTnValidationError("SafeRoute currently supports routes within Tamil Nadu.");
        setOriginCoords(null);
        setOriginInput('');
        setLocationSource(null);
        return;
      }

      const actualAddress = geocodeRes.formattedAddress || geocodeRes.address;
      setOriginInput(actualAddress);
      setOriginCoords({ lat: gps.lat, lng: gps.lng });
      setLocationSource("Device GPS Geolocation");
    } catch (err: any) {
      console.warn("GPS Geolocation notice:", err);
      setLocationError("Unable to determine your current location. Please enable location permission or search for your starting point manually.");
      setGpsData(null);
      setLocationSource(null);
    } finally {
      setIsLocating(false);
    }
  };

  // Autocomplete for Origin
  const handleOriginChange = (val: string) => {
    setOriginInput(val);
    setGpsData(null);
    setLocationSource(null);
    setLocationError(null);
    setTnValidationError(null);

    if (!val.trim()) {
      setOriginCoords(null);
      setOriginSuggestions([]);
      return;
    }

    placesService.fetchSuggestions(val, (results) => {
      setOriginSuggestions(results);
    });
  };

  // Autocomplete for Destination
  const handleDestChange = (val: string) => {
    setDestInput(val);
    setLocationError(null);
    setTnValidationError(null);

    if (!val.trim()) {
      setDestCoords(null);
      setDestSuggestions([]);
      return;
    }

    placesService.fetchSuggestions(val, (results) => {
      setDestSuggestions(results);
    });
  };

  const handleSelectOrigin = (item: LocationResult) => {
    setOriginInput(item.formattedAddress || item.displayName);
    setOriginCoords({ lat: item.lat, lng: item.lng });
    setLocationSource("Search Autocomplete");
    setOriginSuggestions([]);
  };

  const handleSelectDest = (item: LocationResult) => {
    setDestInput(item.formattedAddress || item.displayName);
    setDestCoords({ lat: item.lat, lng: item.lng });
    setDestSuggestions([]);
  };

  // Route calculation navigation
  const handleFindRoutes = async (e: React.FormEvent) => {
    e.preventDefault();
    setTnValidationError(null);
    setLocationError(null);

    if (!originInput.trim()) {
      setLocationError("Please enter or select a starting location.");
      return;
    }

    if (!destInput.trim()) {
      setTnValidationError("Please enter a destination.");
      return;
    }

    setIsSearching(true);

    try {
      let finalOrigin = originCoords;
      if (!finalOrigin) {
        const geoOrigin = await placesService.geocodeText(originInput);
        if (geoOrigin) {
          finalOrigin = { lat: geoOrigin.lat, lng: geoOrigin.lng };
          setOriginCoords(finalOrigin);
        }
      }

      let finalDest = destCoords;
      if (!finalDest) {
        const geoDest = await placesService.geocodeText(destInput);
        if (geoDest) {
          finalDest = { lat: geoDest.lat, lng: geoDest.lng };
          setDestCoords(finalDest);
        }
      }

      if (!finalOrigin || !finalDest) {
        setTnValidationError("Could not resolve location coordinates. Please select from search suggestions.");
        setIsSearching(false);
        return;
      }

      // Navigate to Route Results Page
      navigate('/results', {
        state: {
          originName: originInput,
          destinationName: destInput,
          originCoords: finalOrigin,
          destCoords: finalDest,
          gpsAccuracy: gpsData?.accuracy,
          gpsAccuracyLabel: gpsData?.accuracyLabel
        }
      });
    } catch (err: any) {
      setTnValidationError("Error resolving route locations. Please check connection and try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <WeatherBackground condition="Clear">
      <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
        
        {/* HERO SECTION */}
        <section className="relative text-center space-y-8 max-w-5xl mx-auto">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0B2A1E]/90 border border-[#D4AF37]/40 shadow-[0_0_20px_rgba(212,175,55,0.25)] backdrop-blur-xl">
            <Sparkles className="w-4 h-4 text-[#F4D06F] animate-spin" style={{ animationDuration: '4s' }} />
            <span className="text-xs font-serif font-extrabold uppercase tracking-widest text-[#F4D06F]">
              3D PRO MAX INTELLIGENT ROUTE MESH
            </span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-black tracking-tight leading-none text-white">
              Plan your journey. <br />
              <span className="gold-text-gradient">Understand the route.</span> <br />
              Travel safer.
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-sans">
              Advanced spatial risk prediction combining real-time meteorological conditions, street illumination indices, historical incident density, and emergency POI mesh.
            </p>
          </div>

          {/* 3D MAP JOURNEY ILLUSTRATION CANVAS CARD (MATCHES USER REFERENCE IMAGE CONCEPT) */}
          <div className="perspective-3d my-8 max-w-4xl mx-auto">
            <div className="tilt-card-3d relative rounded-3xl p-6 bg-gradient-to-br from-[#0B2A1E]/90 via-[#103526]/85 to-[#071C14]/95 border-2 border-[#D4AF37]/40 shadow-[0_30px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden group">
              
              {/* Background Glows */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#064E3B]/30 rounded-full blur-3xl pointer-events-none" />

              {/* Interactive SVG 3D Animated Route Illustration */}
              <div className="relative h-64 sm:h-72 w-full flex items-center justify-center">
                <svg viewBox="0 0 900 360" className="w-full h-full object-contain">
                  
                  {/* Curved Path Road */}
                  <path
                    d="M 60 280 Q 250 80, 450 200 T 840 100"
                    fill="none"
                    stroke="#064E3B"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 60 280 Q 250 80, 450 200 T 840 100"
                    fill="none"
                    stroke="#D4AF37"
                    strokeWidth="4"
                    strokeDasharray="12 12"
                    className="animate-road-dash"
                  />

                  {/* 3D Waypoint Pin 1 (Origin) */}
                  <g transform="translate(60, 280)" className="animate-float-3d">
                    <circle r="22" fill="#10b981" fillOpacity="0.3" className="animate-ping" />
                    <circle r="14" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                    <text x="0" y="5" textAnchor="middle" fill="white" fontSize="12" fontWeight="900">S</text>
                  </g>

                  {/* 3D Waypoint Pin 2 (Checkpoint) */}
                  <g transform="translate(450, 200)" className="animate-float-reverse-3d">
                    <circle r="18" fill="#F4D06F" fillOpacity="0.3" className="animate-ping" />
                    <circle r="12" fill="#F4D06F" stroke="#071C14" strokeWidth="2" />
                    <text x="0" y="4" textAnchor="middle" fill="#071C14" fontSize="10" fontWeight="900">✓</text>
                  </g>

                  {/* 3D Waypoint Pin 3 (Destination) */}
                  <g transform="translate(840, 100)" className="animate-float-3d">
                    <circle r="24" fill="#ef4444" fillOpacity="0.3" className="animate-ping" />
                    <circle r="16" fill="#ef4444" stroke="#ffffff" strokeWidth="2.5" />
                    <text x="0" y="5" textAnchor="middle" fill="white" fontSize="13" fontWeight="900">D</text>
                  </g>

                  {/* Floating Badges */}
                  <g transform="translate(240, 120)" className="animate-float-reverse-3d">
                    <rect x="-60" y="-15" width="120" height="30" rx="15" fill="#0B2A1E" stroke="#D4AF37" strokeWidth="1.5" />
                    <text x="0" y="4" textAnchor="middle" fill="#F4D06F" fontSize="11" fontWeight="800">🏔️ Scenic Pass</text>
                  </g>

                  <g transform="translate(650, 130)" className="animate-float-3d">
                    <rect x="-65" y="-15" width="130" height="30" rx="15" fill="#0B2A1E" stroke="#10b981" strokeWidth="1.5" />
                    <text x="0" y="4" textAnchor="middle" fill="#a7f3d0" fontSize="11" fontWeight="800">🛡️ 99.4% Safe Index</text>
                  </g>
                </svg>
              </div>

              {/* Floating Overlay Badge Tag */}
              <div className="absolute top-4 left-4 px-3 py-1 bg-[#0B2A1E]/90 border border-[#D4AF37]/30 rounded-xl text-[11px] font-mono text-[#F4D06F]">
                📍 Coimbatore ➔ CIT Interactive Route Mesh
              </div>
            </div>
          </div>

          {/* ROUTE SEARCH INPUT CARD (MAIN FEATURE) */}
          <div className="forest-card p-6 sm:p-8 space-y-6 text-left relative z-20">
            <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-4">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#F4D06F]" />
                <h3 className="font-serif font-bold text-lg text-white">Route Search & Risk Engine</h3>
              </div>
              <span className="text-[11px] font-mono text-[#D4AF37] px-3 py-1 rounded-full bg-[#0B2A1E] border border-[#D4AF37]/30">
                LIVE GPS READY
              </span>
            </div>

            <form onSubmit={handleFindRoutes} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Starting Location Input */}
                <div className="relative space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#F4D06F]">
                    Starting Location (Origin) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Coimbatore or My Location"
                      value={originInput}
                      onChange={(e) => handleOriginChange(e.target.value)}
                      className="w-full pl-11 pr-24 py-3.5 bg-[#071C14]/90 border border-[#D4AF37]/40 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#F4D06F] focus:ring-1 focus:ring-[#F4D06F]"
                    />
                    <MapPin className="w-5 h-5 text-[#F4D06F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocating}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#0B2A1E] hover:bg-[#103526] text-[#F4D06F] border border-[#D4AF37]/30 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all"
                    >
                      {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                      <span>GPS</span>
                    </button>
                  </div>

                  {/* Origin Autocomplete List */}
                  {originSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#0B2A1E] border border-[#D4AF37]/40 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                      {originSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectOrigin(item)}
                          className="w-full p-3 text-left hover:bg-[#103526] border-b border-[#064E3B]/60 text-xs text-white flex items-center gap-2 transition"
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#F4D06F] shrink-0" />
                          <span className="truncate">{item.formattedAddress || item.displayName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Destination Input */}
                <div className="relative space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#F4D06F]">
                    Destination *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. CIT, Coimbatore or Airport"
                      value={destInput}
                      onChange={(e) => handleDestChange(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-[#071C14]/90 border border-[#D4AF37]/40 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#F4D06F] focus:ring-1 focus:ring-[#F4D06F]"
                    />
                    <Navigation className="w-5 h-5 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Destination Autocomplete List */}
                  {destSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#0B2A1E] border border-[#D4AF37]/40 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                      {destSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectDest(item)}
                          className="w-full p-3 text-left hover:bg-[#103526] border-b border-[#064E3B]/60 text-xs text-white flex items-center gap-2 transition"
                        >
                          <Navigation className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{item.formattedAddress || item.displayName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Error messages */}
              {(locationError || tnValidationError) && (
                <div className="p-3.5 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{locationError || tnValidationError}</span>
                </div>
              )}

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-1">
                <span className="font-semibold text-slate-300">Popular Destinations:</span>
                {[
                  { name: 'CIT, Coimbatore', origin: 'Coimbatore Railway Station' },
                  { name: 'PSG Tech, Coimbatore', origin: 'Gandhipuram' },
                  { name: 'Chennai Central', origin: 'T. Nagar, Chennai' }
                ].map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => {
                      setOriginInput(preset.origin);
                      setDestInput(preset.name);
                    }}
                    className="px-3 py-1 bg-[#0B2A1E] hover:bg-[#103526] text-[#F4D06F] border border-[#D4AF37]/30 rounded-lg text-[11px] font-semibold transition"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSearching}
                className="gold-btn-primary w-full py-4 text-sm font-serif font-black tracking-wider uppercase flex items-center justify-center gap-2 shadow-2xl"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-[#071C14]" />
                    <span>Calculating Optimal Safe Route...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5 fill-current" />
                    <span>Plan Journey & Calculate Risk</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Metrics Header Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
            <div className="forest-card p-5 space-y-1 hover:border-[#D4AF37] transition-all">
              <div className="flex items-center gap-2 text-[#F4D06F]">
                <Activity className="w-5 h-5" />
                <span className="font-serif font-bold text-xl text-white">99.4% Accuracy</span>
              </div>
              <p className="text-xs text-slate-400">ML-weighted risk scoring engine updated continuously.</p>
            </div>

            <div className="forest-card p-5 space-y-1 hover:border-[#D4AF37] transition-all">
              <div className="flex items-center gap-2 text-emerald-400">
                <CloudSun className="w-5 h-5" />
                <span className="font-serif font-bold text-xl text-white">Live Weather Sync</span>
              </div>
              <p className="text-xs text-slate-400">Destination weather mapping drives cinematic UI background.</p>
            </div>

            <div className="forest-card p-5 space-y-1 hover:border-[#D4AF37] transition-all">
              <div className="flex items-center gap-2 text-[#F4D06F]">
                <ShieldCheck className="w-5 h-5" />
                <span className="font-serif font-bold text-xl text-white">Consent Family Mesh</span>
              </div>
              <p className="text-xs text-slate-400">Double opt-in location sharing and 2s SOS trigger.</p>
            </div>
          </div>
        </section>

        {/* FEATURE HIGHLIGHTS GRID */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-white">
              Commercial Grade <span className="gold-text-gradient">Safety Intelligence</span>
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Built with mathematical rigor and multi-source spatial data integration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="forest-card p-6 space-y-4 hover:scale-[1.03] transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-[#0B2A1E] border border-[#D4AF37]/40 text-[#F4D06F] flex items-center justify-center font-bold shadow-lg">
                <Navigation className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-white">Multi-Route Analysis</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Compare fastest, safest, and balanced routes with explicit trade-offs and segment lighting breakdown.
              </p>
            </div>

            <div className="forest-card p-6 space-y-4 hover:scale-[1.03] transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-[#0B2A1E] border border-[#D4AF37]/40 text-emerald-400 flex items-center justify-center font-bold shadow-lg">
                <CloudSun className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-white">Weather-Adaptive Video</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Live Open-Meteo weather API dynamically transitions the background video and generates safety precautions.
              </p>
            </div>

            <div className="forest-card p-6 space-y-4 hover:scale-[1.03] transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-[#0B2A1E] border border-[#D4AF37]/40 text-[#F4D06F] flex items-center justify-center font-bold shadow-lg">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-white">Family Protection Mesh</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add trusted family members via Email, Direct App Push, or 3D QR Code matrix with consent verification.
              </p>
            </div>

            <div className="forest-card p-6 space-y-4 hover:scale-[1.03] transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-[#0B2A1E] border border-[#D4AF37]/40 text-red-400 flex items-center justify-center font-bold shadow-lg">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-white">Emergency SOS & Media</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Voice detection, 2-second hold SOS, high-priority speech alarm, and automatic video evidence capture.
              </p>
            </div>
          </div>
        </section>

      </div>
    </WeatherBackground>
  );
};
