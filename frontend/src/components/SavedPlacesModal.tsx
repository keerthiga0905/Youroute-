import React, { useState } from 'react';
import { createSavedPlace } from '../services/api';
import { SavedPlace } from '../types';
import { Bookmark, X, Home, Briefcase, Heart, MapPin, Plus } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (place: SavedPlace) => void;
}

export const SavedPlacesModal: React.FC<Props> = ({ isOpen, onClose, onAdded }) => {
  const [category, setCategory] = useState<'home' | 'work' | 'favorite'>('favorite');
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('11.0168');
  const [lng, setLng] = useState('76.9558');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const place = await createSavedPlace({
        category,
        label: label || (category === 'home' ? 'Home' : (category === 'work' ? 'Work' : 'Favorite Place')),
        address: address || 'Coimbatore, Tamil Nadu',
        latitude: parseFloat(lat) || 11.0168,
        longitude: parseFloat(lng) || 76.9558
      });
      onAdded(place);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#131924] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden night-panel space-y-4 p-6">
        
        <div className="flex justify-between items-center pb-3 border-b border-gray-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-400" />
            Add Saved Place
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'home', label: 'Home', icon: Home },
                { id: 'work', label: 'Work', icon: Briefcase },
                { id: 'favorite', label: 'Favorite', icon: Heart },
              ].map((item) => {
                const Icon = item.icon;
                const active = category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id as any)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      active
                        ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">Place Name / Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. My Apartment, Campus Library"
              className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">Address / Landmark</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Avinashi Road, Coimbatore"
              className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{loading ? 'Saving...' : 'Save Place'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
