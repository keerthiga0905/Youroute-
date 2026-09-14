import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSavedPlaces, deleteSavedPlace } from '../services/api';
import { SavedPlace } from '../types';
import { SavedPlacesModal } from '../components/SavedPlacesModal';
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
      label: 'Home',
      address: 'Cheran Ma Nagar, Coimbatore',
      latitude: 11.0400,
      longitude: 76.9900,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      category: 'work',
      label: 'Office / Campus',
      address: 'Nehru Nagar, Coimbatore',
      latitude: 11.0478,
      longitude: 76.8524,
      created_at: new Date().toISOString()
    }
  ];

  const handleLaunchRoute = (place: SavedPlace) => {
    navigate('/results', {
      state: {
        originName: 'Chitra Bus Stand, Coimbatore',
        destinationName: place.label,
        destCoords: { lat: place.latitude, lng: place.longitude }
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 font-sans">
      
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Bookmark className="w-6 h-6 text-red-600" />
            <span>Saved Places</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Save locations you visit frequently to calculate routes instantly.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md shadow-red-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add a place</span>
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {displayPlaces.map((place) => {
          const Icon = place.category === 'home' ? Home : (place.category === 'work' ? Briefcase : Heart);

          return (
            <div key={place.id} className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4 flex flex-col justify-between shadow-sm hover:border-red-300 transition">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                    <div className="p-1.5 bg-red-50 border border-red-200 rounded-lg text-red-600">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{place.label}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(place.id)}
                    className="text-slate-400 hover:text-red-600 p-1 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{place.address}</span>
                </p>
              </div>

              <button
                onClick={() => handleLaunchRoute(place)}
                className="w-full py-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 transition flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5 text-red-600" />
                <span>Find Route to {place.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      <SavedPlacesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdded={(newP) => setPlaces([...places, newP])}
      />

    </div>
  );
};
