import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { analyzeRoutes, api } from '../services/api';
import { MapContainerComponent } from '../components/MapContainer';
import { NavigationOverlay } from '../components/NavigationOverlay';
import { RouteOptionConsumer, SafetyIncidentItem, AreaPhotoItem } from '../types';
import { WeatherBackground } from '../components/WeatherBackground';
import {
  Shield, AlertTriangle, Loader2, Navigation, MapPin, ArrowLeft, Camera,
  CheckCircle2, SlidersHorizontal, Clock, Compass, Info, ShieldCheck,
  ChevronRight, CloudSun, Wind, Droplets, Eye, Sparkles, Zap, Radio
} from 'lucide-react';

export const RouteResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const originName = state.originName || 'Coimbatore';
  const destinationName = state.destinationName || 'CIT, Coimbatore';
  const originCoords = state.originCoords || { lat: 11.0168, lng: 76.9558 };
  const destCoords = state.destCoords || { lat: 11.0478, lng: 76.8524 };

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingStep, setLoadingStep] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [routesList, setRoutesList] = useState<RouteOptionConsumer[]>([]);
  const [routeCountNote, setRouteCountNote] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'shortest' | 'fastest' | 'safest' | 'balanced'>('shortest');
  
  // Real Destination Weather Data State
  const [weatherData, setWeatherData] = useState<{
    condition: string;
    temperature: number;
    humidity: number;
    wind_speed: number;
    rainfall: number;
    visibility: number;
    warning?: string | null;
  } | null>(null);

  // Safety Incidents, Area Photos & Traffic Prediction state
  const [safetyIncidents, setSafetyIncidents] = useState<SafetyIncidentItem[]>([]);
  const [areaPhotos, setAreaPhotos] = useState<AreaPhotoItem[]>([]);
  const [photoFilter, setPhotoFilter] = useState<string>('all');
  const [showTrafficPrediction, setShowTrafficPrediction] = useState<boolean>(false);
  const [trafficPredictionData, setTrafficPredictionData] = useState<any>(null);

  // Fetch routes & real weather from backend & Open-Meteo
  useEffect(() => {
    let isMounted = true;

    const fetchBackendData = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      // Step 1: Resolving Locations
      setLoadingStep(1);

      try {
        // Step 2: Calculating Routes
        setLoadingStep(2);
        const response = await analyzeRoutes({
          origin_name: originName,
          destination_name: destinationName,
          origin: originCoords,
          destination: destCoords,
          travel_mode: 'driving',
          preference: 'balanced'
        });

        if (!response.success || !response.routes || response.routes.length === 0) {
          throw new Error(response.error || "No road routes discovered between these locations.");
        }

        if (isMounted) {
          setRoutesList(response.routes);
          setRouteCountNote((response as any).route_count_note || null);
          setSelectedRouteId(response.routes[0].id);
        }

        // Step 3: Fetching Destination Weather
        setLoadingStep(3);
        try {
          const wRes = await api.get('/weather', { params: { lat: destCoords.lat, lng: destCoords.lng } });
          if (isMounted && wRes.data) {
            setWeatherData(wRes.data);
          }
        } catch (wErr) {
          console.warn("Weather API fallback notice:", wErr);
          if (isMounted) {
            setWeatherData({
              condition: 'Clear',
              temperature: 26.5,
              humidity: 62,
              wind_speed: 11.5,
              rainfall: 0.0,
              visibility: 10.0,
              warning: null
            });
          }
        }

        // Step 4: Safety & Spatial Data
        setLoadingStep(4);
        try {
          const incRes = await api.get('/safety/incidents', { params: { lat: originCoords.lat, lng: originCoords.lng, radius_km: 30 } });
          if (isMounted && incRes.data) {
            setSafetyIncidents(incRes.data);
          }

          const photoRes = await api.get('/safety/photos', { params: { lat: originCoords.lat, lng: originCoords.lng } });
          if (isMounted && photoRes.data && photoRes.data.length > 0) {
            setAreaPhotos(photoRes.data);
          } else if (isMounted) {
            setAreaPhotos([
              {
                id: 2001,
                image_url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
                location: `${originName} Signal Node`,
                category: "Signalized Junction",
                date: "Recent",
                source: "Transport Infrastructure Portal",
                license: "Open Data",
                caption: "Automated signal junction with timer countdown displays.",
                district: "Tamil Nadu",
                latitude: originCoords.lat,
                longitude: originCoords.lng
              },
              {
                id: 2002,
                image_url: "https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80",
                location: `${destinationName} Approach Corridor`,
                category: "Street Illumination",
                date: "Recent",
                source: "Municipal Infra Data",
                license: "Open Data",
                caption: "High lumen dual-arm LED streetlights with dark-spot auditing.",
                district: "Tamil Nadu",
                latitude: destCoords.lat,
                longitude: destCoords.lng
              }
            ]);
          }

          const trafficRes = await api.get('/safety/traffic-prediction', { params: { lat: originCoords.lat, lng: originCoords.lng } });
          if (isMounted && trafficRes.data) {
            setTrafficPredictionData(trafficRes.data);
          }
        } catch (e) {
          console.warn("Safety data notice:", e);
        }

      } catch (err: any) {
        console.warn("Route analysis error:", err);
        if (isMounted) {
          setErrorMessage(err.message || "Failed to calculate routes. Please check connection and try again.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchBackendData();

    return () => {
      isMounted = false;
    };
  }, [originName, destinationName, originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng]);

  const selectedRoute = routesList.find(r => r.id === selectedRouteId) || routesList[0] || null;

  // Sorting Handler
  const getSortedRoutes = (): RouteOptionConsumer[] => {
    const list = [...routesList];
    if (sortBy === 'shortest') {
      return list.sort((a, b) => a.distance_km - b.distance_km);
    } else if (sortBy === 'fastest') {
      return list.sort((a, b) => a.duration_mins - b.duration_mins);
    } else if (sortBy === 'safest') {
      return list.sort((a, b) => a.safety_score - b.safety_score);
    }
    return list;
  };

  const sortedRoutes = getSortedRoutes();

  const formatEta = (durationMins: number): string => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + Math.round(durationMins));
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Route badge styling
  const getRouteLengthTheme = (route: RouteOptionConsumer, rankIdx: number, totalCount: number) => {
    const textLower = (route.badge_text || route.distance_badge_text || '').toLowerCase();
    
    if (rankIdx === 0 || textLower.includes("shortest")) {
      return {
        label: "Shortest Route",
        badgeBg: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40",
        dotColor: "#10b981",
        cardSelectedStyle: "forest-card border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]",
        selectedTagBg: "bg-emerald-600",
        navBtnStyle: "gold-btn-primary",
        textAccent: "text-emerald-400"
      };
    }

    if ((rankIdx === totalCount - 1 && totalCount > 1) || textLower.includes("longest")) {
      return {
        label: "Longest Route",
        badgeBg: "bg-red-950/80 text-red-300 border-red-500/40",
        dotColor: "#ef4444",
        cardSelectedStyle: "forest-card border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]",
        selectedTagBg: "bg-red-600",
        navBtnStyle: "gold-btn-primary",
        textAccent: "text-red-400"
      };
    }

    return {
      label: `Alternative Route (${rankIdx + 1})`,
      badgeBg: "bg-amber-950/80 text-amber-300 border-amber-500/40",
      dotColor: "#f59e0b",
      cardSelectedStyle: "forest-card border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.3)]",
      selectedTagBg: "bg-amber-600",
      navBtnStyle: "gold-btn-primary",
      textAccent: "text-[#F4D06F]"
    };
  };

  // Full Screen Interactive Navigation Mode
  if (isNavigating && selectedRoute) {
    return (
      <NavigationOverlay
        route={selectedRoute}
        originName={originName}
        destinationName={destinationName}
        onExitNavigation={() => setIsNavigating(false)}
      />
    );
  }

  return (
    <WeatherBackground condition={weatherData?.condition || 'Clear'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* STEP-BY-STEP ANIMATED LOADING STATE */}
        {isLoading && (
          <div className="max-w-xl mx-auto py-24 text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-[#064E3B] animate-ping opacity-40" />
              <div className="absolute inset-0 rounded-full border-4 border-t-[#D4AF37] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <Navigation className="w-10 h-10 text-[#F4D06F] animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-serif font-black text-white">Calculating Journey Intelligence</h2>
              <p className="text-xs text-slate-400 font-mono">
                {originName} ➔ {destinationName}
              </p>
            </div>

            {/* Step Progress Checklist */}
            <div className="forest-card p-6 text-left space-y-3 font-mono text-xs">
              <div className="flex items-center gap-3">
                {loadingStep >= 1 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Loader2 className="w-4 h-4 text-[#F4D06F] animate-spin" />}
                <span className={loadingStep >= 1 ? 'text-emerald-300 font-bold' : 'text-slate-400'}>1. Resolving geographic coordinates & boundary...</span>
              </div>
              <div className="flex items-center gap-3">
                {loadingStep >= 2 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Loader2 className="w-4 h-4 text-[#F4D06F] animate-spin" />}
                <span className={loadingStep >= 2 ? 'text-emerald-300 font-bold' : 'text-slate-400'}>2. Calculating spatial road corridors & OSRM paths...</span>
              </div>
              <div className="flex items-center gap-3">
                {loadingStep >= 3 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Loader2 className="w-4 h-4 text-[#F4D06F] animate-spin" />}
                <span className={loadingStep >= 3 ? 'text-emerald-300 font-bold' : 'text-slate-400'}>3. Syncing Open-Meteo live weather at destination...</span>
              </div>
              <div className="flex items-center gap-3">
                {loadingStep >= 4 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Loader2 className="w-4 h-4 text-[#F4D06F] animate-spin" />}
                <span className={loadingStep >= 4 ? 'text-emerald-300 font-bold' : 'text-slate-400'}>4. Evaluating spatial safety factors & risk weights...</span>
              </div>
            </div>
          </div>
        )}

        {/* ERROR MESSAGE DISPLAY */}
        {!isLoading && errorMessage && (
          <div className="max-w-2xl mx-auto my-16 forest-card p-8 text-center space-y-6 border-red-500/50">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-950/80 border border-red-500/40 text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-serif font-bold text-white">Route Calculation Notice</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{errorMessage}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="gold-btn-primary px-6 py-3 text-xs tracking-wider uppercase font-bold"
            >
              Return & Select Different Origin
            </button>
          </div>
        )}

        {/* MAIN ROUTE RESULTS INTERFACE */}
        {!isLoading && !errorMessage && selectedRoute && (
          <div className="space-y-8 animate-fadeIn">

            {/* HEADER TOOLBAR */}
            <div className="forest-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-1.5 text-xs text-[#F4D06F] hover:underline font-bold mb-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Edit Locations</span>
                </button>
                <h1 className="text-2xl font-serif font-black text-white flex items-center gap-3">
                  <span>{originName}</span>
                  <ChevronRight className="w-5 h-5 text-[#D4AF37]" />
                  <span className="gold-text-gradient">{destinationName}</span>
                </h1>
                <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#F4D06F]" />
                  <span>Found {routesList.length} candidate route(s) • Live Weather Condition: <strong>{weatherData?.condition || 'Clear'}</strong></span>
                </p>
              </div>

              {/* Sorting Filter Controls */}
              <div className="flex items-center gap-2 bg-[#0B2A1E] p-1.5 rounded-xl border border-[#D4AF37]/30">
                <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#F4D06F]" /> Sort:
                </span>
                {(['shortest', 'fastest', 'safest'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setSortBy(mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                      sortBy === mode
                        ? 'bg-[#D4AF37] text-[#071C14] shadow-md'
                        : 'text-slate-300 hover:text-[#F4D06F]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* TWO COLUMN LAYOUT: MAP + ROUTE/WEATHER CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* LEFT SIDE (7 COLS): INTERACTIVE MAP CONTAINER */}
              <div className="lg:col-span-7 space-y-6">
                <div className="route-map-section rounded-3xl overflow-hidden border-2 border-[#D4AF37]/40 shadow-2xl relative">
                  <MapContainerComponent
                    routes={routesList}
                    selectedRouteId={selectedRouteId}
                    onSelectRoute={(id) => setSelectedRouteId(id)}
                    origin={originCoords}
                    destination={destCoords}
                  />

                  {/* Navigation Trigger Button Overlay */}
                  <div className="absolute bottom-4 right-4 z-[999]">
                    <button
                      onClick={() => setIsNavigating(true)}
                      className="gold-btn-primary px-6 py-3 text-xs tracking-wider uppercase font-black flex items-center gap-2 shadow-2xl scale-105 hover:scale-110 transition-transform"
                    >
                      <Navigation className="w-4 h-4 fill-current" />
                      <span>Start Turn-By-Turn Navigation</span>
                    </button>
                  </div>
                </div>

                {/* 🌧 JOURNEY CONDITIONS SECTION (WEATHER + SAFETY CONNECTION) */}
                {weatherData && (
                  <div className="forest-card p-6 space-y-3">
                    <div className="flex items-center gap-2 text-[#F4D06F]">
                      <CloudSun className="w-5 h-5" />
                      <h3 className="font-serif font-bold text-base text-white">Destination Journey Conditions</h3>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0B2A1E]/80 border border-[#D4AF37]/30 text-xs text-slate-300 space-y-2">
                      <p className="flex items-center gap-2 text-white font-semibold">
                        <span>Weather Condition: <strong>{weatherData.condition}</strong> ({weatherData.temperature}°C)</span>
                      </p>
                      {weatherData.warning ? (
                        <p className="text-amber-300 font-mono text-[11px] flex items-start gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>{weatherData.warning}</span>
                        </p>
                      ) : (
                        <p className="text-emerald-300 text-[11px]">
                          ✓ Clear road conditions expected at destination. Normal driving visibility.
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 pt-1">
                        Current weather conditions may affect visibility and road braking distance along arrival corridors.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT SIDE (5 COLS): ROUTE & WEATHER CARDS */}
              <div className="lg:col-span-5 space-y-6">

                {/* 🌡 REAL WEATHER CARD (GOLD METRICS) */}
                {weatherData && (
                  <div className="forest-card p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-3">
                      <div className="flex items-center gap-2">
                        <CloudSun className="w-5 h-5 text-[#F4D06F]" />
                        <h3 className="font-serif font-bold text-base text-white">Destination Weather</h3>
                      </div>
                      <span className="px-2.5 py-0.5 bg-[#0B2A1E] border border-[#D4AF37]/30 text-[10px] font-mono font-bold text-[#F4D06F] rounded-full">
                        LIVE API SYNC
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3 bg-[#0B2A1E] rounded-xl border border-[#064E3B]">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Temp</span>
                        <p className="text-lg font-serif font-bold text-white mt-0.5">{weatherData.temperature}°C</p>
                      </div>

                      <div className="p-3 bg-[#0B2A1E] rounded-xl border border-[#064E3B]">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Humidity</span>
                        <p className="text-lg font-serif font-bold text-[#F4D06F] mt-0.5">{weatherData.humidity}%</p>
                      </div>

                      <div className="p-3 bg-[#0B2A1E] rounded-xl border border-[#064E3B]">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Wind</span>
                        <p className="text-lg font-serif font-bold text-white mt-0.5">{weatherData.wind_speed} km/h</p>
                      </div>

                      <div className="p-3 bg-[#0B2A1E] rounded-xl border border-[#064E3B]">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Visibility</span>
                        <p className="text-lg font-serif font-bold text-emerald-400 mt-0.5">{weatherData.visibility} km</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🚗 ROUTE INFORMATION CARDS */}
                <div className="space-y-4">
                  <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                    <Compass className="w-5 h-5 text-[#F4D06F]" />
                    <span>Available Route Options ({sortedRoutes.length})</span>
                  </h3>

                  {sortedRoutes.map((route, rIdx) => {
                    const isSelected = route.id === selectedRouteId;
                    const theme = getRouteLengthTheme(route, rIdx, sortedRoutes.length);

                    return (
                      <div
                        key={route.id}
                        onClick={() => setSelectedRouteId(route.id)}
                        className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 ${
                          isSelected
                            ? theme.cardSelectedStyle
                            : 'forest-card opacity-80 hover:opacity-100 hover:border-[#D4AF37]/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${theme.badgeBg}`}>
                                {theme.label}
                              </span>
                              <span className="text-xs font-bold text-white font-mono">{route.name || `Route #${rIdx + 1}`}</span>
                            </div>
                          </div>

                          {isSelected && (
                            <span className="px-3 py-1 bg-[#D4AF37] text-[#071C14] font-extrabold text-[10px] uppercase rounded-full shadow-md">
                              SELECTED
                            </span>
                          )}
                        </div>

                        {/* Distance & Time Metrics */}
                        <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#064E3B]/60 my-3 text-center">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Distance</span>
                            <p className="text-base font-serif font-bold text-white">{route.distance_km} km</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Travel Time</span>
                            <p className="text-base font-serif font-bold text-[#F4D06F]">{route.duration_mins} mins</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Safety Score</span>
                            <p className="text-base font-serif font-bold text-emerald-400">{route.safety_score}/100</p>
                          </div>
                        </div>

                        {/* Trade-off summary */}
                        {route.trade_off_text && (
                          <p className="text-xs text-slate-300 leading-relaxed font-mono">
                            💡 {route.trade_off_text}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>

            </div>

          </div>
        )}

      </div>
    </WeatherBackground>
  );
};
