import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { geolocationService, GPSResult } from '../services/geolocationService';
import { reverseGeocodeService } from '../services/reverseGeocodeService';
import { placesService } from '../services/placesService';
import { validateTNLocation } from '../services/geofenceService';
import { LocationResult } from '../services/locationService';
import { Shield, MapPin, Navigation, ArrowRight, Loader2, AlertCircle, LocateFixed, CheckCircle2 } from 'lucide-react';

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
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16 space-y-8 font-sans">
      
      {/* Header Branding */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-black tracking-wide shadow-sm">
          <Shield className="w-4 h-4 text-red-600" />
          <span>SafeRoute — Tamil Nadu Intelligent Route Planning</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Where are you traveling?
        </h1>

        <p className="text-sm text-slate-600 max-w-lg mx-auto font-medium">
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
            <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-red-600" />
              <span>STEP 2 — DESTINATION</span>
            </label>

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
                <span>Calculating Road Routes & Safety Corridors...</span>
              </>
            ) : (
              <>
                <span>FIND ALL ROUTES →</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};

export default HomePage;
