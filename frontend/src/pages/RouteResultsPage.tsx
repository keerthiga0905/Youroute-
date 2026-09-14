import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { analyzeRoutes, api } from '../services/api';
import { MapContainerComponent } from '../components/MapContainer';
import { NavigationOverlay } from '../components/NavigationOverlay';
import { RouteOptionConsumer, SafetyIncidentItem, AreaPhotoItem } from '../types';
import {
  Shield,
  AlertTriangle,
  Loader2,
  Navigation,
  MapPin,
  ArrowLeft,
  Camera,
  CheckCircle2,
  SlidersHorizontal,
  Clock,
  Compass,
  Info,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export const RouteResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const originName = state.originName || 'Starting Point';
  const destinationName = state.destinationName || 'Destination';
  const originCoords = state.originCoords || { lat: 11.0168, lng: 76.9558 };
  const destCoords = state.destCoords || { lat: 11.0478, lng: 76.8524 };

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [routesList, setRoutesList] = useState<RouteOptionConsumer[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'shortest' | 'fastest' | 'safest' | 'balanced'>('shortest');
  
  // Safety Incidents & Area Photos state
  const [safetyIncidents, setSafetyIncidents] = useState<SafetyIncidentItem[]>([]);
  const [areaPhotos, setAreaPhotos] = useState<AreaPhotoItem[]>([]);
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number | null>(null);

  // Fetch routes from FastAPI backend
  useEffect(() => {
    let isMounted = true;

    const fetchBackendRoutes = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await analyzeRoutes({
          origin_name: originName,
          destination_name: destinationName,
          origin: originCoords,
          destination: destCoords,
          travel_mode: 'driving',
          preference: 'balanced'
        });

        if (!response.success) {
          throw new Error(response.error || "Unable to calculate routes for these locations.");
        }

        if (!response.routes || response.routes.length === 0) {
          throw new Error("No practical road routes discovered between these locations in Tamil Nadu.");
        }

        if (isMounted) {
          setRoutesList(response.routes);
          setSelectedRouteId(response.routes[0].id);
        }

        // Fetch Safety Incidents & Area Photos near origin/destination
        try {
          const incRes = await api.get('/safety/incidents', { params: { lat: originCoords.lat, lng: originCoords.lng, radius_km: 30 } });
          if (isMounted && incRes.data) {
            setSafetyIncidents(incRes.data);
          }

          const photoRes = await api.get('/safety/photos', { params: { lat: originCoords.lat, lng: originCoords.lng } });
          if (isMounted && photoRes.data) {
            setAreaPhotos(photoRes.data);
          }
        } catch (e) {
          console.warn("Notice fetching safety incidents/photos:", e);
        }

      } catch (err: any) {
        console.warn("Backend route analysis error:", err);
        if (isMounted) {
          setErrorMessage(err.message || "Failed to calculate routes. Ensure starting point and destination are in Tamil Nadu.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchBackendRoutes();

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
    return list; // default balanced rank
  };

  const sortedRoutes = getSortedRoutes();

  // Helper to format ETA time
  const formatEta = (durationMins: number): string => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + Math.round(durationMins));
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper for Route Length Badge colors
  const getRouteLengthBadge = (badgeText: string, colorCode?: string) => {
    if (badgeText.toLowerCase().includes("shortest")) {
      return { text: "Shortest Route", bg: "bg-emerald-100 text-emerald-800 border-emerald-300", dot: "#10b981" };
    }
    if (badgeText.toLowerCase().includes("longest")) {
      return { text: "Longest Alternative", bg: "bg-red-100 text-red-800 border-red-300", dot: "#ef4444" };
    }
    return { text: badgeText || "Alternative", bg: "bg-amber-100 text-amber-800 border-amber-300", dot: "#eab308" };
  };

  // Helper for Safety Risk Badge colors
  const getSafetyRiskBadge = (level: string, label: string) => {
    if (level === 'lower') {
      return { text: label || "Lower Risk", bg: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    }
    if (level === 'moderate') {
      return { text: label || "Moderate Risk", bg: "bg-amber-100 text-amber-800 border-amber-300" };
    }
    if (level === 'elevated') {
      return { text: label || "Elevated Risk", bg: "bg-orange-100 text-orange-800 border-orange-300" };
    }
    return { text: label || "Higher Risk", bg: "bg-red-100 text-red-800 border-red-300" };
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="inline-flex p-4 bg-red-50 text-red-600 rounded-full border border-red-200">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Discovering Practical Road Corridors...</h2>
        <p className="text-slate-600 text-sm max-w-md mx-auto">
          Querying OSRM road network graph & analyzing Tamil Nadu safety dataset for {originName} to {destinationName}.
        </p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-3xl text-red-700 space-y-2">
          <AlertTriangle className="w-10 h-10 text-red-600 mx-auto" />
          <h2 className="text-lg font-black text-slate-900">Route Analysis Notice</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{errorMessage}</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-red-600 text-white font-bold text-sm rounded-2xl hover:bg-red-700 transition flex items-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change Locations</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 font-sans">
      
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider rounded-md">
              Tamil Nadu Phase 1
            </span>
            <span className="text-xs text-slate-500 font-bold">
              {routesList.length} practical route{routesList.length !== 1 ? 's' : ''} returned by road engine
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex flex-wrap items-center gap-2">
            <span>{originName}</span>
            <span className="text-red-600 font-normal">→</span>
            <span>{destinationName}</span>
          </h1>
        </div>

        <button
          onClick={() => navigate('/')}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4 text-red-600" />
          <span>Change Locations</span>
        </button>
      </div>

      {/* Main Grid: Leaflet Map (Left/Top) & Route Comparison Cards (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Leaflet Map Column */}
        <div className="lg:col-span-7 space-y-4">
          <MapContainerComponent
            allRoutes={routesList}
            selectedRoute={selectedRoute}
            onSelectRoute={(id) => setSelectedRouteId(id)}
            originName={originName}
            destinationName={destinationName}
            originCoords={originCoords}
            destCoords={destCoords}
            safetyIncidents={safetyIncidents}
            areaPhotos={areaPhotos}
          />
        </div>

        {/* Route Cards & Comparison Column */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Sorting Options Bar */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-1 overflow-x-auto text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-red-600" /> Sort:
            </span>
            {[
              { id: 'shortest', label: 'Shortest' },
              { id: 'fastest', label: 'Fastest' },
              { id: 'safest', label: 'Lowest Risk' },
              { id: 'balanced', label: 'Balanced' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSortBy(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition text-[11px] whitespace-nowrap ${
                  sortBy === tab.id
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Up to 4 Route Cards */}
          <div className="space-y-4">
            {sortedRoutes.map((route, rIdx) => {
              const isSelected = selectedRoute?.id === route.id;
              const lengthBadge = getRouteLengthBadge(route.badge_text || route.distance_badge_text || '');
              const riskBadge = getSafetyRiskBadge(route.risk_level, route.safety_label);

              return (
                <div
                  key={route.id}
                  onClick={() => setSelectedRouteId(route.id)}
                  className={`p-5 rounded-3xl border transition cursor-pointer space-y-4 ${
                    isSelected
                      ? 'bg-white border-red-500 shadow-xl ring-2 ring-red-500/20'
                      : 'bg-white border-slate-200 hover:border-red-300 shadow-sm'
                  }`}
                >
                  
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900">{route.name}</h3>
                        {isSelected && (
                          <span className="px-2 py-0.5 bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-md">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ETA: <strong>{formatEta(route.duration_mins)}</strong> ({route.duration_mins} mins)
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-black text-slate-900">{route.distance_km} km</p>
                    </div>
                  </div>

                  {/* Dual Badges: ROUTE LENGTH vs SAFETY RISK */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    
                    {/* Route Length Classification */}
                    <div className={`p-2.5 rounded-2xl border ${lengthBadge.bg} flex flex-col justify-between`}>
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-75">Route Length</span>
                      <span className="font-extrabold text-[11px] mt-0.5 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lengthBadge.dot }}></span>
                        {lengthBadge.text}
                      </span>
                    </div>

                    {/* Safety Risk Classification */}
                    <div className={`p-2.5 rounded-2xl border ${riskBadge.bg} flex flex-col justify-between`}>
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-75">Safety Risk Level</span>
                      <span className="font-extrabold text-[11px] mt-0.5">
                        {riskBadge.text}
                      </span>
                    </div>

                  </div>

                  {/* Safety Metrics & Details Summary */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Safety Score: <strong className="text-slate-900">{route.safety_score}/100</strong></span>
                    </div>

                    <span className="text-[11px] text-slate-500 font-medium">
                      Confidence: <strong className="text-slate-800">{route.confidence_level}</strong>
                    </span>
                  </div>

                  {/* Start Navigation Button */}
                  {isSelected && (
                    <div className="pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsNavigating(true);
                        }}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-2xl transition shadow-md shadow-red-600/20 flex items-center justify-center gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>START NAVIGATION →</span>
                      </button>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* PHOTOS OF THE AREA SECTION (Requirement 15) */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-200">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Photos of the Area & Infrastructure</h2>
              <p className="text-xs text-slate-500">Verified photos near the selected route corridor with source attribution.</p>
            </div>
          </div>

          <span className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
            {areaPhotos.length} Verified Photos
          </span>
        </div>

        {areaPhotos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {areaPhotos.map((photo) => (
              <div key={photo.id} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div className="h-44 bg-slate-200 overflow-hidden relative">
                  <img
                    src={photo.image_url}
                    alt={photo.caption}
                    className="w-full h-full object-cover hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                  <span className="absolute top-2 left-2 px-2.5 py-1 bg-white/95 text-slate-900 text-[10px] font-black uppercase tracking-wider rounded-md shadow-sm">
                    {photo.category}
                  </span>
                </div>

                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-slate-900">{photo.location}</p>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{photo.caption}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
                    <span>Source: {photo.source}</span>
                    <span>Date: {photo.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
            <Camera className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No verified photo available for this location.</p>
            <p className="text-xs text-slate-500">Only verified government, OSM, or public domain images with attribution are displayed.</p>
          </div>
        )}
      </div>

      {/* Live Navigation Modal Overlay */}
      {isNavigating && selectedRoute && (
        <NavigationOverlay
          route={selectedRoute}
          originName={originName}
          destinationName={destinationName}
          userLocation={state.gpsCoords}
          onClose={() => setIsNavigating(false)}
        />
      )}

    </div>
  );
};

export default RouteResultsPage;
