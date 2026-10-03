import React, { useEffect } from 'react';
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, Tooltip, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ConnectedFamilyMember, FamilyEmergencyAlert } from '../types';
import { Shield, Navigation, AlertOctagon, Clock, Activity, MapPin } from 'lucide-react';

interface FamilyMapProps {
  members: ConnectedFamilyMember[];
  userLocation?: { lat: number; lng: number } | null;
  emergencies?: FamilyEmergencyAlert[];
  selectedMemberId?: number | null;
  onSelectMember?: (member: ConnectedFamilyMember) => void;
  onRouteToMember?: (member: ConnectedFamilyMember) => void;
}

const getRelationshipEmoji = (relationship: string): string => {
  const rel = relationship.toLowerCase();
  if (rel.includes('father') || rel.includes('dad')) return '👨';
  if (rel.includes('mother') || rel.includes('mom')) return '👩';
  if (rel.includes('brother') || rel.includes('sister') || rel.includes('sibling')) return '👫';
  if (rel.includes('husband') || rel.includes('wife') || rel.includes('spouse')) return '💍';
  if (rel.includes('daughter')) return '👧';
  if (rel.includes('son')) return '👦';
  return '🧑';
};

const createFamilyMemberIcon = (member: ConnectedFamilyMember) => {
  const emoji = getRelationshipEmoji(member.relationship);
  let statusBg = '#10b981'; // Green (Live)
  let borderPulse = '0 0 12px rgba(16, 185, 129, 0.6)';

  if (member.location_status === 'Stale') {
    statusBg = '#f59e0b'; // Yellow
    borderPulse = '0 0 10px rgba(245, 158, 11, 0.5)';
  } else if (member.location_status === 'Offline') {
    statusBg = '#6b7280'; // Gray
    borderPulse = 'none';
  } else if (member.location_status === 'Sharing Disabled' || !member.sharing_enabled) {
    statusBg = '#ef4444'; // Red
    borderPulse = 'none';
  }

  return L.divIcon({
    className: 'custom-family-member-icon',
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 4px 14px rgba(0,0,0,0.3);
          border: 3px solid ${statusBg};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        ">
          ${emoji}
        </div>
        <div style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background-color: ${statusBg};
          border: 2px solid white;
          box-shadow: ${borderPulse};
        "></div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22]
  });
};

const createEmergencyIcon = () => {
  return L.divIcon({
    className: 'family-emergency-sos-pin',
    html: `
      <div style="position: relative; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 50px; height: 50px; border-radius: 50%; background: rgba(239, 68, 68, 0.4); animation: pulse 1.5s infinite;"></div>
        <div style="
          position: absolute;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background-color: #dc2626;
          border: 3px solid #ffffff;
          box-shadow: 0 0 15px rgba(220, 38, 38, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
          font-weight: bold;
        ">
          🚨
        </div>
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25]
  });
};

const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'current-user-gps-pin',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(37, 99, 235, 0.25);"></div>
        <div style="position: absolute; width: 18px; height: 18px; border-radius: 50%; background-color: #2563eb; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(37, 99, 235, 0.6);"></div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
};

// Map Recenter View Helper
const MapRecenter: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom = 14 }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center[0], center[1], zoom, map]);
  return null;
};

export const FamilyMap: React.FC<FamilyMapProps> = ({
  members,
  userLocation,
  emergencies = [],
  selectedMemberId,
  onSelectMember,
  onRouteToMember
}) => {
  // Default map center: Tamil Nadu / User Location / First Member Location
  let defaultCenter: [number, number] = [11.0168, 76.9558]; // Coimbatore default

  const activeMemberWithLoc = members.find(m => m.id === selectedMemberId && m.latitude && m.longitude);

  if (activeMemberWithLoc && activeMemberWithLoc.latitude && activeMemberWithLoc.longitude) {
    defaultCenter = [activeMemberWithLoc.latitude, activeMemberWithLoc.longitude];
  } else if (userLocation) {
    defaultCenter = [userLocation.lat, userLocation.lng];
  } else {
    const validMember = members.find(m => m.latitude && m.longitude);
    if (validMember && validMember.latitude && validMember.longitude) {
      defaultCenter = [validMember.latitude, validMember.longitude];
    }
  }

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-100">
      <LeafletMap
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter center={defaultCenter} />

        {/* User Location Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserLocationIcon()}>
            <Popup>
              <div className="p-1 font-sans text-xs">
                <div className="font-bold text-blue-700 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" /> Your Current Location
                </div>
                <p className="text-slate-500 mt-1">Live GPS position from your device</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Family Member Markers */}
        {members.map((member) => {
          if (!member.latitude || !member.longitude) return null;

          const hasLoc = member.sharing_enabled && member.location_status !== 'Sharing Disabled';
          if (!hasLoc) return null;

          const isSelected = selectedMemberId === member.id;

          return (
            <React.Fragment key={member.id}>
              {member.accuracy && member.accuracy < 100 && (
                <Circle
                  center={[member.latitude, member.longitude]}
                  radius={member.accuracy}
                  pathOptions={{
                    color: member.location_status === 'Live' ? '#10b981' : '#f59e0b',
                    fillColor: member.location_status === 'Live' ? '#10b981' : '#f59e0b',
                    fillOpacity: 0.12,
                    weight: 1
                  }}
                />
              )}

              <Marker
                position={[member.latitude, member.longitude]}
                icon={createFamilyMemberIcon(member)}
                eventHandlers={{
                  click: () => onSelectMember && onSelectMember(member)
                }}
              >
                <Tooltip permanent={isSelected} direction="top" offset={[0, -24]}>
                  <div className="font-sans font-bold text-xs flex items-center gap-1">
                    <span>{getRelationshipEmoji(member.relationship)}</span>
                    <span>{member.name}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      member.location_status === 'Live' ? 'bg-emerald-500' :
                      member.location_status === 'Stale' ? 'bg-amber-500' : 'bg-slate-400'
                    }`}></span>
                  </div>
                </Tooltip>

                <Popup minWidth={260}>
                  <div className="p-2 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getRelationshipEmoji(member.relationship)}</span>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">{member.name}</h4>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {member.relationship}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        member.location_status === 'Live' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        member.location_status === 'Stale' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {member.location_status === 'Live' ? '🟢 Live' : member.location_status === 'Stale' ? '🟡 Stale' : '⚫ Offline'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Last Updated: <strong className="text-slate-800">{member.last_updated ? new Date(member.last_updated).toLocaleTimeString() : 'Just now'}</strong></span>
                      </div>
                      {member.accuracy && (
                        <div className="flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-slate-400" />
                          <span>GPS Accuracy: <strong className="text-slate-800">±{Math.round(member.accuracy)} m</strong></span>
                        </div>
                      )}
                      {member.battery_level !== undefined && member.battery_level !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-bold">🔋</span>
                          <span>Battery: <strong className={member.battery_level <= 20 ? 'text-red-600 font-extrabold' : 'text-slate-800'}>{member.battery_level}%</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {onRouteToMember && (
                        <button
                          onClick={() => onRouteToMember(member)}
                          className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Get Safe Route</span>
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Emergency SOS Markers */}
        {emergencies.map((em) => (
          <Marker
            key={em.id}
            position={[em.latitude, em.longitude]}
            icon={createEmergencyIcon()}
          >
            <Popup>
              <div className="p-2 font-sans bg-red-50 text-red-950 rounded-xl">
                <div className="flex items-center gap-2 font-black text-red-700 border-b border-red-200 pb-1.5 mb-2">
                  <AlertOctagon className="w-5 h-5 text-red-600 animate-bounce" />
                  <span>EMERGENCY SOS ALERT</span>
                </div>
                <p className="font-bold text-slate-900 text-sm mb-1">{em.user_name} triggered an SOS!</p>
                <p className="text-xs text-slate-600 mb-2">{em.message}</p>
                <span className="text-[11px] text-red-600 font-semibold">
                  Triggered at: {new Date(em.created_at).toLocaleTimeString()}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </LeafletMap>
    </div>
  );
};
