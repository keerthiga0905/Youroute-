import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSavedPlaces, deleteSavedPlace } from '../services/api';
import { SavedPlace } from '../types';
import { SavedPlacesModal } from '../components/SavedPlacesModal';
import { WeatherBackground } from '../components/WeatherBackground';
import { Bookmark, Home, Briefcase, Heart, Plus, Trash2, Navigation, MapPin } from 'lucide-react';

export const SavedPlacesPage: React.FC = () => {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    try {
      const data = await getSavedPlaces();
      setPlaces(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSavedPlace(id);
      setPlaces(places.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const displayPlaces: SavedPlace[] = places.length > 0 ? places : [
    {
      id: 1,
      category: 'home',
      label: 'Residence / Home',
      address: 'Cheran Ma Nagar, Coimbatore',
      latitude: 11.0400,
      longitude: 76.9900,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      category: 'work',
      label: 'Campus / Office (CIT)',
      address: 'Peelamedu, Coimbatore',
      latitude: 11.0478,
      longitude: 76.8524,
      created_at: new Date().toISOString()
    }
  ];

  const handleLaunchRoute = (place: SavedPlace) => {
    navigate('/results', {
      state: {
        originName: 'Coimbatore Railway Station',
        destinationName: place.label,
        destCoords: { lat: place.latitude, lng: place.longitude }
      }
    });
  };

  return (
    <WeatherBackground condition="Clear" defaultImage="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=2000&q=80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        
        <div className="forest-card p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#F4D06F] text-xs font-mono font-bold mb-1">
              <Bookmark className="w-4 h-4" />
              <span>FREQUENT DESTINATION VAULT</span>
            </div>
            <h1 className="text-3xl font-serif font-black text-white">
              Saved Places & <span className="gold-text-gradient">Locations</span>
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Store your home, work, and frequent destinations for 1-click safe route planning.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="gold-btn-primary px-5 py-2.5 text-xs tracking-wider uppercase font-bold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Location</span>
          </button>
        </div>

        {/* Places Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {displayPlaces.map((place) => {
            const Icon = place.category === 'home' ? Home : (place.category === 'work' ? Briefcase : Heart);

            return (
              <div
                key={place.id}
                className="forest-card p-6 space-y-4 hover:border-[#D4AF37] transition-all group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#0B2A1E] border border-[#D4AF37]/40 rounded-xl text-[#F4D06F]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-serif font-bold text-white group-hover:text-[#F4D06F] transition-colors">
                          {place.label}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400 capitalize">{place.category}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(place.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 font-mono flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{place.address}</span>
                  </p>
                </div>

                <button
                  onClick={() => handleLaunchRoute(place)}
                  className="gold-btn-primary w-full py-3 text-xs tracking-wider uppercase font-bold flex items-center justify-center gap-2 mt-4"
                >
                  <Navigation className="w-4 h-4 fill-current" />
                  <span>Calculate Route Here</span>
                </button>
              </div>
            );
          })}
        </div>

        {isModalOpen && (
          <SavedPlacesModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={() => fetchPlaces()}
          />
        )}

      </div>
    </WeatherBackground>
  );
};
