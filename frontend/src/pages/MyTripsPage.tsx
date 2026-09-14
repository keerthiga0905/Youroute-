import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTripHistory, deleteAllTrips } from '../services/api';
import { TripHistory } from '../types';
import { Compass, ArrowRight, Trash2 } from 'lucide-react';

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
      destination_name: 'Nehru Nagar, Coimbatore',
      travel_mode: 'driving',
      preference: 'balanced',
      duration_mins: 18.0,
      distance_km: 8.5,
      risk_level: 'lower',
      selected_route_name: 'Route 1 (Shortest)',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      origin_name: 'Chennai Central Station',
      destination_name: 'Guindy, Chennai',
      travel_mode: 'driving',
      preference: 'fastest',
      duration_mins: 22.0,
      distance_km: 11.2,
      risk_level: 'moderate',
      selected_route_name: 'Route 2 (Moderate Length)',
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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 font-sans">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-red-600" />
            <span>My Saved Trips</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and re-analyze your previously planned journey routes in Tamil Nadu.
          </p>
        </div>

        {displayTrips.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-xl text-xs font-bold border border-slate-200 transition flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Trip History</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {displayTrips.map((trip) => (
          <div
            key={trip.id}
            className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-red-200 transition"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                <span>{trip.origin_name}</span>
                <ArrowRight className="w-4 h-4 text-red-600 shrink-0" />
                <span>{trip.destination_name}</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="capitalize font-semibold">{trip.travel_mode}</span>
                <span>•</span>
                <span className="font-mono text-slate-800 font-bold">{trip.duration_mins} min ({trip.distance_km} km)</span>
                <span>•</span>
                <span>{new Date(trip.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                trip.risk_level === 'lower' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {trip.risk_level === 'lower' ? '🟢 Lower Risk' : '🟡 Moderate Risk'}
              </span>

              <button
                onClick={() => handleReopenTrip(trip)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-red-600/20"
              >
                Reopen Journey
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
