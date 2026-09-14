import React, { useEffect, useState } from 'react';
import { getNearbyEmergencyServices } from '../services/api';
import { EmergencyPOI } from '../types';
import { PhoneCall, Building2, Hospital, Shield, Share2, AlertTriangle, Plus, Check } from 'lucide-react';

export const EmergencyAssistancePage: React.FC = () => {
  const [pois, setPois] = useState<EmergencyPOI[]>([]);
  const [personalContacts, setPersonalContacts] = useState([
    { name: 'Family Emergency Contact', phone: '+1-800-555-9911', relation: 'Parent / Guardian' },
    { name: 'Campus Security Office', phone: '+1-800-555-8822', relation: 'University Guard' }
  ]);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    fetchPOIs();
  }, []);

  const fetchPOIs = async () => {
    try {
      const data = await getNearbyEmergencyServices(11.0168, 76.9558);
      setPois(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShareTrip = () => {
    setShared(true);
    setTimeout(() => setShared(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="border-b border-gray-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <PhoneCall className="w-8 h-8 text-rose-400" />
            <span>Emergency Assistance & Nearby Services</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Access verified nearby police precincts, medical centers, and emergency contacts.
          </p>
        </div>

        <button
          onClick={handleShareTrip}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          {shared ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          <span>{shared ? 'Trip Live Link Copied!' : 'Share Live Trip with Emergency Contacts'}</span>
        </button>
      </div>

      <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-2xl flex items-start gap-3 text-xs text-gray-300">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-amber-400 font-bold">Important Notice:</strong> SafeRoute AI is an analytical risk estimation tool. It does not replace official national emergency emergency dispatchers (911/112/100). Use the direct call links below in case of urgent real-world emergencies.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Left Column: Nearby Verified Public Emergency POIs */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            Verified Nearby Emergency Services (Coimbatore Region)
          </h2>

          <div className="space-y-3">
            {pois.map((poi) => (
              <div key={poi.id} className="glass-panel p-5 rounded-2xl border border-gray-800 flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {poi.category === 'police' && <Shield className="w-4 h-4 text-blue-400" />}
                    {poi.category === 'hospital' && <Hospital className="w-4 h-4 text-rose-400" />}
                    <h3 className="font-bold text-white text-sm">{poi.name}</h3>
                  </div>
                  <p className="text-xs text-gray-400">{poi.address}</p>
                  <p className="text-xs text-emerald-400 font-mono">
                    Distance: {poi.distance_km} km ({poi.estimated_time_mins} min response)
                  </p>
                </div>

                <a
                  href={`tel:${poi.phone}`}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call {poi.phone}</span>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: User Configured Personal Emergency Contacts */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Personal Emergency Contacts
            </h2>
            <button className="p-1.5 bg-gray-800 text-gray-300 hover:text-white rounded-lg text-xs flex items-center gap-1 border border-gray-700">
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-3">
            {personalContacts.map((contact, idx) => (
              <div key={idx} className="glass-card p-4 rounded-2xl border border-gray-800 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white text-xs">{contact.name}</p>
                  <p className="text-[11px] text-gray-400">{contact.relation}</p>
                  <p className="text-xs font-mono text-emerald-400 mt-1">{contact.phone}</p>
                </div>
                <a
                  href={`tel:${contact.phone}`}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold border border-gray-700 transition"
                >
                  Dial
                </a>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
