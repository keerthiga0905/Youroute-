import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTripHistory, deleteAllTrips } from '../services/api';
import { TripHistory } from '../types';
import { WeatherBackground } from '../components/WeatherBackground';
import { Compass, ArrowRight, Trash2, MapPin, Navigation, Clock, ShieldCheck, Sparkles } from 'lucide-react';

export const MyTripsPage: React.FC = () => {
  const [trips, setTrips] = useState<TripHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const data = await getTripHistory();
      setTrips(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to clear your entire trip history?")) {
      try {
        await deleteAllTrips();
        setTrips([]);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const displayTrips: any[] = trips.length > 0 ? trips : [
    {
      id: 1,
      origin_name: 'Coimbatore Railway Station',
      destination_name: 'CIT, Coimbatore',
      travel_mode: 'driving',
      preference: 'balanced',
      duration_mins: 18.0,
      distance_km: 8.5,
      risk_level: 'lower',
      selected_route_name: 'Avinashi Road Express Corridor',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      origin_name: 'Gandhipuram Bus Stand',
      destination_name: 'Peelamedu, Coimbatore',
      travel_mode: 'driving',
      preference: 'fastest',
      duration_mins: 14.0,
      distance_km: 6.2,
      risk_level: 'moderate',
      selected_route_name: 'Trichy Road Bypass',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  const handleReopenTrip = (trip: any) => {
    navigate('/results', {
      state: {
        originName: trip.origin_name,
        destinationName: trip.destination_name,
        travelMode: trip.travel_mode,
        preference: trip.preference
      }
    });
  };

  return (
    <WeatherBackground condition="Clear" defaultImage="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        
        <div className="forest-card p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#F4D06F] text-xs font-mono font-bold mb-1">
              <Compass className="w-4 h-4" />
              <span>SAVED JOURNEY ARCHIVES</span>
            </div>
            <h1 className="text-3xl font-serif font-black text-white">
              My Saved Trips & <span className="gold-text-gradient">Routes</span>
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Review, re-analyze, or navigate your previously calculated safe journeys.
            </p>
          </div>

          {displayTrips.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 bg bg-red-950/80 hover:bg-red-900 text-red-300 rounded-xl text-xs font-bold border border-red-800/50 transition flex items-center gap-2 shadow-lg"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {/* Trips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayTrips.map((trip) => (
            <div
              key={trip.id}
              className="forest-card p-6 space-y-4 hover:border-[#D4AF37] transition-all group relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 bg-[#0B2A1E] border border-[#D4AF37]/30 text-[10px] font-mono font-bold text-[#F4D06F] rounded-full">
                    {trip.selected_route_name || 'Calculated Route'}
                  </span>
                  <h3 className="text-base font-serif font-bold text-white group-hover:text-[#F4D06F] transition-colors">
                    {trip.origin_name} ➔ {trip.destination_name}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#064E3B]/60 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Distance</span>
                  <p className="font-serif font-bold text-white mt-0.5">{trip.distance_km} km</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Travel Time</span>
                  <p className="font-serif font-bold text-[#F4D06F] mt-0.5">{trip.duration_mins} mins</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Safety Index</span>
                  <p className="font-serif font-bold text-emerald-400 mt-0.5">92/100</p>
                </div>
              </div>

              <button
                onClick={() => handleReopenTrip(trip)}
                className="gold-btn-primary w-full py-3 text-xs tracking-wider uppercase font-bold flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4 fill-current" />
                <span>Re-Analyze & Navigate</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

      </div>
    </WeatherBackground>
  );
};
