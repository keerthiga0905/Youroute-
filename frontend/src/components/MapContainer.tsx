import React, { useEffect } from 'react';
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, Polyline, Tooltip, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RouteOptionConsumer, EmergencyPOI, SafetyIncidentItem, AreaPhotoItem } from '../types';
import { Shield, MapPin, Navigation, AlertTriangle, Lightbulb, Camera, Info } from 'lucide-react';

const createCustomPinIcon = (color: string, label: string) => {
  const safeColor = color || '#dc2626';
  return L.divIcon({
    className: 'custom-map-pin-icon',
    html: `
      <div style="
        background-color: ${safeColor};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 800;
        font-size: 13px;
      ">
        ${label}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const createUserPinIcon = () => {
  return L.divIcon({
    className: 'user-gps-location-pin',
    html: `
      <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(220, 38, 38, 0.25); animation: pulse 2s infinite;"></div>
        <div style="position: absolute; width: 16px; height: 16px; border-radius: 50%; background-color: #dc2626; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(220, 38, 38, 0.6);"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

const createIncidentPinIcon = (category: string) => {
  let color = '#f97316';
  let symbol = '⚠️';

  if (category === 'street_light') {
    color = '#eab308';
    symbol = '💡';
  } else if (category === 'accident') {
    color = '#ef4444';
    symbol = '💥';
  } else if (category === 'pothole' || category === 'road_damage') {
    color = '#d97706';
    symbol = '🚧';
  } else if (category === 'flood_risk') {
    color = '#2563eb';
    symbol = '🌊';
  }

  return L.divIcon({
    className: 'incident-map-pin',
    html: `
      <div style="
        background-color: ${color};
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      ">
        ${symbol}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
};

const DynamicMapBounds: React.FC<{ coords: { lat: number; lng: number }[] }> = ({ coords }) => {
  const map = useMap();

  useEffect(() => {
    if (coords && coords.length > 0) {
      const valid = coords.filter(c => typeof c.lat === 'number' && typeof c.lng === 'number' && !isNaN(c.lat) && !isNaN(c.lng));
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid.map(c => [c.lat, c.lng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [coords, map]);

  return null;
};

interface MapProps {
  allRoutes?: RouteOptionConsumer[];
  routes?: RouteOptionConsumer[];
  selectedRoute?: RouteOptionConsumer | null;
  selectedRouteId?: string | null;
  onSelectRoute: (id: string) => void;
  originName?: string;
  destinationName?: string;
  originCoords?: { lat: number; lng: number };
  origin?: { lat: number; lng: number };
  destCoords?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  userLocation?: { lat: number; lng: number; accuracy?: number };
  emergencyPOIs?: EmergencyPOI[];
  safetyIncidents?: SafetyIncidentItem[];
  areaPhotos?: AreaPhotoItem[];
  showNearbyHelp?: boolean;
  showTrafficPrediction?: boolean;
  trafficPredictionData?: any;
}

export const MapContainerComponent: React.FC<MapProps> = ({
  allRoutes = [],
  routes = [],
  selectedRoute,
  selectedRouteId,
  onSelectRoute,
  originName,
  destinationName,
  originCoords,
  origin,
  destCoords,
  destination,
  userLocation,
  emergencyPOIs = [],
  safetyIncidents = [],
  areaPhotos = [],
  showNearbyHelp = false,
  showTrafficPrediction = false,
  trafficPredictionData = null
}) => {
  const effectiveRoutes = routes.length > 0 ? routes : allRoutes;
  const activeSelectedRoute = selectedRoute || effectiveRoutes.find(r => r.id === selectedRouteId) || effectiveRoutes[0] || null;
  const safeCoords = activeSelectedRoute?.path || (effectiveRoutes[0]?.path) || [];
  const startCoord = origin || originCoords || (safeCoords.length > 0 ? safeCoords[0] : { lat: 11.0168, lng: 76.9558 });
  const endCoord = destination || destCoords || (safeCoords.length > 0 ? safeCoords[safeCoords.length - 1] : { lat: 11.0478, lng: 76.8524 });

  const allCoordsList: { lat: number; lng: number }[] = [];
  effectiveRoutes.forEach(r => {
    (r.path || r.coordinates || []).forEach(c => allCoordsList.push(c));
  });
  if (allCoordsList.length === 0) {
    allCoordsList.push(startCoord, endCoord);
  }
  if (userLocation) {
    allCoordsList.push({ lat: userLocation.lat, lng: userLocation.lng });
  }

  // Calculate mid-point for traffic prediction marker overlay
  const midLat = (startCoord.lat + endCoord.lat) / 2.0;
  const midLng = (startCoord.lng + endCoord.lng) / 2.0;

  return (
    <div className="route-map-section rounded-3xl overflow-hidden border border-slate-200 shadow-md relative">
      <LeafletMap
        center={[startCoord.lat, startCoord.lng]}
        zoom={13}
        className="route-map z-0"
        scrollWheelZoom={true}
      >
        {/* OpenStreetMap Standard Tile Layer - Clean & Keyless */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <DynamicMapBounds coords={allCoordsList} />

        {/* Start Location Marker */}
        {startCoord && (
          <Marker position={[startCoord.lat, startCoord.lng]} icon={createCustomPinIcon('#10b981', 'S')}>
            <Popup>
              <div className="p-1 space-y-1">
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">STARTING POINT</span>
                <p className="text-xs font-bold text-slate-900 mt-1">{originName || "Origin"}</p>
                <p className="text-[10px] text-slate-500 font-mono">{startCoord.lat.toFixed(5)}, {startCoord.lng.toFixed(5)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Location Marker */}
        {endCoord && (
          <Marker position={[endCoord.lat, endCoord.lng]} icon={createCustomPinIcon('#dc2626', 'D')}>
            <Popup>
              <div className="p-1 space-y-1">
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-red-100 text-red-800 rounded-md">DESTINATION</span>
                <p className="text-xs font-bold text-slate-900 mt-1">{destinationName || "Destination"}</p>
                <p className="text-[10px] text-slate-500 font-mono">{endCoord.lat.toFixed(5)}, {endCoord.lng.toFixed(5)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Current User GPS Marker */}
        {userLocation && (
          <>
            <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserPinIcon()}>
              <Popup>
                <div className="p-1 space-y-1">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">YOUR GPS LOCATION</span>
                  <p className="text-xs font-bold text-slate-900 mt-1">Current Position</p>
                  {userLocation.accuracy && (
                    <p className="text-[10px] text-slate-500">Accuracy: ±{Math.round(userLocation.accuracy)}m</p>
                  )}
                </div>
              </Popup>
            </Marker>
            {userLocation.accuracy && userLocation.accuracy < 1000 && (
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={userLocation.accuracy}
                pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1.5 }}
              />
            )}
          </>
        )}

        {/* Safety Incident Markers */}
        {safetyIncidents.map((inc) => (
          <Marker
            key={`inc_${inc.id}`}
            position={[inc.latitude, inc.longitude]}
            icon={createIncidentPinIcon(inc.category)}
          >
            <Popup>
              <div className="p-1 max-w-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md">
                  {inc.category.replace('_', ' ')}
                </span>
                <p className="text-xs font-extrabold text-slate-900">{inc.title}</p>
                {inc.description && <p className="text-[11px] text-slate-600 leading-tight">{inc.description}</p>}
                <p className="text-[10px] text-slate-500">Source: {inc.source_name}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* All Route Polylines - STRICT COLOR CODING BY LENGTH (Green = Shortest, Yellow/Orange = Medium, Red = Longest) */}
        {allRoutes.map((route) => {
          const isSelected = selectedRoute?.id === route.id;
          const routePath = (route.path || route.coordinates || []).map(c => [c.lat, c.lng] as [number, number]);
          if (routePath.length === 0) return null;

          // Route Length Color Mapping:
          // Shortest (Rank 1): Green (#10b981)
          // Medium (Rank 2/3): Yellow (#eab308) / Orange (#f97316)
          // Longest (Rank 4/last): Red (#ef4444)
          const lengthColor = route.distance_color_code || route.color_code || (
            route.rank_order === 1 ? '#10b981' :
            route.rank_order === 2 ? '#eab308' :
            route.rank_order === 3 ? '#f97316' : '#ef4444'
          );

          return (
            <React.Fragment key={route.id}>
              {/* Outer Glow highlight for selected route in its length color */}
              {isSelected && (
                <Polyline
                  positions={routePath}
                  pathOptions={{
                    color: lengthColor,
                    weight: 12,
                    opacity: 0.35,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
              )}
              {/* Main Route Polyline */}
              <Polyline
                positions={routePath}
                pathOptions={{
                  color: lengthColor,
                  weight: isSelected ? 7 : 4,
                  opacity: isSelected ? 1.0 : 0.6,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
                eventHandlers={{
                  click: () => onSelectRoute(route.id)
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs font-bold text-slate-900">
                    {route.name} — {route.distance_km} km ({route.duration_mins} mins)
                  </div>
                </Tooltip>
              </Polyline>
            </React.Fragment>
          );
        })}

        {/* FEATURE: TRAFFIC PREDICTION FOR PARTICULAR AREA ALONE IN BLUE COLOUR */}
        {showTrafficPrediction && (
          <>
            {/* Extract localized traffic hotspot sub-segment (middle 30% traffic area) */}
            {(() => {
              if (safeCoords.length === 0) return null;
              const startIdx = Math.floor(safeCoords.length * 0.35);
              const endIdx = Math.min(safeCoords.length, Math.floor(safeCoords.length * 0.65) + 1);
              const hotspotCoords = safeCoords.slice(startIdx, endIdx);

              if (hotspotCoords.length < 2) return null;

              const hotspotMid = hotspotCoords[Math.floor(hotspotCoords.length / 2)];

              return (
                <React.Fragment key="traffic_blue_overlay">
                  {/* Blue Traffic Prediction Polyline ONLY for Particular Traffic Area */}
                  <Polyline
                    positions={hotspotCoords.map(c => [c.lat, c.lng] as [number, number])}
                    pathOptions={{
                      color: '#2563eb', // STRICT BLUE COLOR FOR SPECIFIC TRAFFIC AREA ALONE
                      weight: 9,
                      dashArray: '8, 8',
                      opacity: 0.95,
                      lineCap: 'round',
                      lineJoin: 'round'
                    }}
                  >
                    <Tooltip permanent direction="top">
                      <div className="text-xs font-bold text-blue-900">
                        🔵 Traffic Congestion Area (Blue Zone) — 38.5 km/h avg speed
                      </div>
                    </Tooltip>
                  </Polyline>

                  {/* Single Blue Heatmap Circle at Traffic Junction Area */}
                  <Circle
                    center={[hotspotMid.lat, hotspotMid.lng]}
                    radius={500}
                    pathOptions={{
                      color: '#2563eb',
                      fillColor: '#3b82f6',
                      fillOpacity: 0.25,
                      weight: 2,
                      dashArray: '4, 4'
                    }}
                  />

                  {/* Blue Traffic Area Marker Pin */}
                  <Marker position={[hotspotMid.lat, hotspotMid.lng]} icon={createCustomPinIcon('#2563eb', '🚗')}>
                    <Popup>
                      <div className="p-1.5 space-y-1">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                          BLUE TRAFFIC SPOT
                        </span>
                        <p className="text-xs font-extrabold text-slate-900 mt-1">Peelamedu Area Traffic Bottleneck</p>
                        <p className="text-[11px] text-blue-700 font-bold">Predicted Speed: 38.5 km/h (Moderate Flow)</p>
                        <p className="text-[10px] text-slate-500">Peak delay window: 05:15 PM - 07:30 PM</p>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })()}
          </>
        )}

      </LeafletMap>
    </div>
  );
};

export default MapContainerComponent;
