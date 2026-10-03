import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { geolocationService, GPSResult } from '../services/geolocationService';
import { reverseGeocodeService } from '../services/reverseGeocodeService';
import { placesService } from '../services/placesService';
import { validateTNLocation } from '../services/geofenceService';
import { LocationResult } from '../services/locationService';
import { getFamilyMembers } from '../services/api';
import { ConnectedFamilyMember } from '../types';
import { Shield, MapPin, Navigation, ArrowRight, Loader2, AlertCircle, LocateFixed, CheckCircle2, Users } from 'lucide-react';

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

  // 1. Handle REAL Device Geolocation API
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    setTnValidationError(null);

    try {
      // 1. Fetch exact device GPS coordinates (navigator.geolocation.getCurrentPosition)
      const gps = await geolocationService.getCurrentPosition();
      setGpsData(gps);

      // 2. Perform real reverse geocoding
      const geocodeRes = await reverseGeocodeService.reverseGeocode(gps.lat, gps.lng);

      // 3. Validate Tamil Nadu boundary
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

  // 2. Autocomplete for Starting Point
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

  // 3. Autocomplete for Destination
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

  // 4. FIND ALL ROUTES Trigger
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
        setTnValidationError("Could not resolve location coordinates in Tamil Nadu. Please select from search suggestions.");
        setIsSearching(false);
        return;
      }

      // Strict Tamil Nadu Boundary Validation
      const valOrigin = validateTNLocation(originInput, finalOrigin.lat, finalOrigin.lng);
      const valDest = validateTNLocation(destInput, finalDest.lat, finalDest.lng);

      if (!valOrigin.isValid || !valDest.isValid) {
        setTnValidationError("SafeRoute currently supports routes within Tamil Nadu.");
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
    <div className="min-h-screen relative overflow-hidden py-10 sm:py-16 font-sans bg-slate-100">
      
      {/* LAYER 1: 3D MAP BACKGROUND IMAGE (COVERS THE WHITE SPACE) */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/home_map_bg.png"
          alt="3D Navigation Map Background"
          className="w-full h-full object-cover object-center opacity-85 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/60 backdrop-blur-[1px]"></div>
      </div>

      {/* LAYER 2: DARK ANIMATED HIGHWAY ROAD & TRAVELING CAR ON TOP OF MAP BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none z-1 overflow-hidden opacity-95">
        <svg viewBox="0 0 1400 550" className="w-full h-full object-cover" preserveAspectRatio="none">
          {/* Outer Highway Dark Border */}
          <path
            d="M -50 280 C 350 40, 700 480, 1450 280"
            fill="none"
            stroke="#020617"
            strokeWidth="60"
            strokeLinecap="round"
          />
          {/* Main Dark Asphalt Road Surface */}
          <path
            d="M -50 280 C 350 40, 700 480, 1450 280"
            fill="none"
            stroke="#1e293b"
            strokeWidth="46"
            strokeLinecap="round"
          />
          {/* White Highway Edge Boundary Lines */}
          <path
            d="M -50 280 C 350 40, 700 480, 1450 280"
            fill="none"
            stroke="#64748b"
            strokeWidth="48"
            strokeDasharray="none"
            strokeLinecap="round"
            className="opacity-40"
          />
          {/* Vibrant Glowing Yellow Dashed Lane Divider */}
          <path
            d="M -50 280 C 350 40, 700 480, 1450 280"
            fill="none"
            stroke="#facc15"
            strokeWidth="6"
            strokeDasharray="20, 20"
            className="animate-road-dash"
            strokeLinecap="round"
          />

          {/* Waypoint Signal 1 (Start - Green Pin) */}
          <g transform="translate(60, 260)">
            <circle r="24" fill="#10b981" fillOpacity="0.35" className="animate-ping" />
            <circle r="16" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
            <text x="0" y="5" textAnchor="middle" fill="white" fontSize="13" fontWeight="900">S</text>
          </g>

          {/* Dark Checkpoint Badge 1: Street Lit */}
          <g transform="translate(380, 110)">
            <rect x="-55" y="-14" width="110" height="22" rx="10" fill="#0f172a" stroke="#eab308" strokeWidth="1.5" />
            <text x="0" y="2" textAnchor="middle" fill="#fef08a" fontSize="11" fontWeight="800">💡 100% Street Lit</text>
          </g>

          {/* Dark Checkpoint Badge 2: Live Flow */}
          <g transform="translate(700, 360)">
            <rect x="-50" y="-14" width="100" height="22" rx="10" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
            <text x="0" y="2" textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="800">🚦 Live Flow</text>
          </g>

          {/* Dark Checkpoint Badge 3: Safety Index */}
          <g transform="translate(1020, 130)">
            <rect x="-65" y="-14" width="130" height="22" rx="10" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
            <text x="0" y="2" textAnchor="middle" fill="#a7f3d0" fontSize="11" fontWeight="800">🛡️ 92/100 Safety Index</text>
          </g>

          {/* Waypoint Signal 2 (Destination - Red Pin) */}
          <g transform="translate(1340, 260)">
            <circle r="24" fill="#ef4444" fillOpacity="0.35" className="animate-ping" />
            <circle r="16" fill="#ef4444" stroke="#ffffff" strokeWidth="2.5" />
            <text x="0" y="5" textAnchor="middle" fill="white" fontSize="13" fontWeight="900">D</text>
          </g>

          {/* BOLD DARK ANIMATED TRAVELING CAR */}
          <g className="animate-car-travel-full">
            {/* Bright Headlight Beam Cone Glow */}
            <polygon points="15,-8 75,-25 75,25 15,8" fill="#fef08a" fillOpacity="0.5" />
            {/* Deep Red Metallic Car Body */}
            <rect x="-24" y="-15" width="48" height="30" rx="10" fill="#dc2626" stroke="#ffffff" strokeWidth="3" />
            <rect x="-12" y="-11" width="22" height="22" rx="5" fill="#020617" />
            {/* Front Headlight LEDs */}
            <circle cx="21" cy="-10" r="3" fill="#fef08a" />
            <circle cx="21" cy="10" r="3" fill="#fef08a" />
            {/* Car Roof Cyan Beacon */}
            <circle cx="0" cy="0" r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
            {/* Dark Telemetry Speed Badge Tag */}
            <g transform="translate(0, -30)">
              <rect x="-46" y="-13" width="92" height="22" rx="9" fill="#020617" stroke="#38bdf8" strokeWidth="2" />
              <text x="0" y="3" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="900">🚗 45 km/h</text>
            </g>
          </g>
        </svg>
      </div>

      {/* Background Subtle Ambient Glow Orbs */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-tr from-red-500/10 via-emerald-500/10 to-transparent blur-3xl pointer-events-none rounded-full"></div>

      <div className="max-w-3xl mx-auto px-4 space-y-8 relative z-10">
        
        {/* Header Branding Container Card */}
        <div className="max-w-2xl mx-auto bg-white/95 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xl text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-black tracking-wide shadow-sm">
            <Shield className="w-4 h-4 text-red-600" />
            <span>SafeRoute — Tamil Nadu Intelligent Route Planning</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Where are you traveling?
          </h1>

          <p className="text-sm text-slate-600 max-w-lg mx-auto font-medium leading-relaxed">
            Choose your route. Understand its risk. Travel with better information.
          </p>
        </div>

        {/* Main Route Input Card - White + Red Redesign */}
        <form onSubmit={handleFindRoutes} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xl">
          
          {/* Tamil Nadu Scope Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              📍 Supported Region: <strong className="text-slate-900 font-extrabold">Tamil Nadu Only</strong> (Coimbatore, Chennai, Madurai, Salem, Trichy, Ooty, etc.)
            </span>
            <span className="text-red-600 font-black text-[10px] uppercase tracking-wider hidden sm:inline px-2 py-0.5 bg-red-50 border border-red-200 rounded-md">PHASE 1</span>
          </div>

          {/* Tamil Nadu Geofence Error Banner */}
          {tnValidationError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-slate-900 flex items-start gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-sm text-red-700">Tamil Nadu Boundary Validation</p>
                <p className="text-slate-600 mt-0.5">{tnValidationError}</p>
              </div>
            </div>
          )}

          {/* GPS Location Error Banner */}
          {locationError && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-slate-900 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-sm text-amber-800">GPS Location Notice</p>
                <p className="text-slate-700 mt-0.5">{locationError}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            
            {/* STEP 1 — STARTING POINT */}
            <div className="space-y-2 relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>STEP 1 — STARTING POINT</span>
                </label>

                {/* Use My Current Location Button */}
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                      <span>Acquiring Device GPS...</span>
                    </>
                  ) : (
                    <>
                      <LocateFixed className="w-3.5 h-3.5 text-red-600" />
                      <span>[ Use my current location ]</span>
                    </>
                  )}
                </button>
              </div>

              <input
                type="text"
                value={originInput}
                onChange={(e) => handleOriginChange(e.target.value)}
                placeholder="Search starting location (e.g. Cheran Ma Nagar, Coimbatore)..."
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 text-sm focus:outline-none focus:border-red-600 focus:bg-white transition font-medium"
                required
              />

              {/* Selected Location Info & GPS Accuracy Badge */}
              {(originCoords || gpsData) && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-extrabold text-slate-900">Selected Starting Coordinates:</span>
                    </div>
                    {locationSource && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">
                        Source: {locationSource}
                      </span>
                    )}
                  </div>

                  {originCoords && (
                    <p className="text-slate-600 font-mono text-[11px]">
                      Latitude: <strong>{originCoords.lat.toFixed(6)}</strong> | Longitude: <strong>{originCoords.lng.toFixed(6)}</strong>
                    </p>
                  )}

                  {gpsData && (
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border ${
                        gpsData.accuracyRating === 'high'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : gpsData.accuracyRating === 'good'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-orange-100 text-orange-800 border-orange-300'
                      }`}>
                        {gpsData.accuracyLabel} ({gpsData.accuracy} meters accuracy)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Autocomplete Dropdown */}
              {originSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl overflow-hidden z-50 shadow-2xl max-h-60 overflow-y-auto">
                  {originSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectOrigin(item)}
                      className="p-3.5 text-xs text-slate-900 hover:bg-red-50 cursor-pointer border-b border-slate-100 last:border-0 transition"
                    >
                      <p className="font-extrabold text-slate-900">{item.displayName}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.formattedAddress}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* STEP 2 — DESTINATION */}
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-red-600" />
                  <span>STEP 2 — DESTINATION</span>
                </label>
              </div>

              {/* Connected Family Member Target Pills */}
              {connectedFamilyMembers.length > 0 && (
                <div className="p-3 bg-red-50/70 border border-red-100 rounded-2xl space-y-1.5">
                  <span className="text-[11px] font-extrabold text-red-700 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-red-600" /> Route to Connected Family Member:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {connectedFamilyMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          if (m.latitude && m.longitude) {
                            setDestInput(`${m.name}'s Location (${m.relationship})`);
                            setDestCoords({ lat: m.latitude, lng: m.longitude });
                          }
                        }}
                        className="py-1 px-3 bg-white hover:bg-red-600 hover:text-white border border-red-200 rounded-xl text-xs font-bold text-slate-800 transition flex items-center gap-1.5 shadow-sm"
                      >
                        <span>
                          {m.relationship.toLowerCase().includes('father') ? '👨' :
                           m.relationship.toLowerCase().includes('mother') ? '👩' :
                           m.relationship.toLowerCase().includes('sibling') ? '👫' : '🧑'}
                        </span>
                        <span>{m.name}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <input
                type="text"
                value={destInput}
                onChange={(e) => handleDestChange(e.target.value)}
                placeholder="Search destination (e.g. Nehru Nagar, Coimbatore)..."
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 text-sm focus:outline-none focus:border-red-600 focus:bg-white transition font-medium"
                required
              />

              {/* Selected Destination Details */}
              {destCoords && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-red-600" />
                    <span className="font-extrabold text-slate-900">Selected Destination Coordinates:</span>
                  </div>
                  <p className="text-slate-600 font-mono text-[11px]">
                    Latitude: <strong>{destCoords.lat.toFixed(6)}</strong> | Longitude: <strong>{destCoords.lng.toFixed(6)}</strong>
                  </p>
                </div>
              )}

              {/* Autocomplete Dropdown */}
              {destSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl overflow-hidden z-50 shadow-2xl max-h-60 overflow-y-auto">
                  {destSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectDest(item)}
                      className="p-3.5 text-xs text-slate-900 hover:bg-red-50 cursor-pointer border-b border-slate-100 last:border-0 transition"
                    >
                      <p className="font-extrabold text-slate-900">{item.displayName}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.formattedAddress}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Main Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-base rounded-2xl transition shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Calculating Real Road Routes & Safety Corridors...</span>
                </>
              ) : (
                <>
                  <span>FIND REAL ROUTES →</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </>
              )}
            </button>
          </div>

        </form>

        {/* Product Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200 shrink-0">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900">Real Road Network</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">OSRM graph engine calculates up to 4 real road corridors.</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-200 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900">Spatial Risk Scoring</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">District crime indices, lighting coverage & accident blackspots.</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-200 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900">Live Area Traffic</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Predictive traffic flow analysis for specific area corridors.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomePage;
