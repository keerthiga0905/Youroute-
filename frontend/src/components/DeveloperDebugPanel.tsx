import React, { useState } from 'react';
import { RouteOptionConsumer } from '../types';
import { Terminal, ChevronDown, ChevronUp, Database } from 'lucide-react';

interface DeveloperDebugPanelProps {
  originCoords: { lat: number; lng: number };
  destCoords: { lat: number; lng: number };
  routesCount: number;
  selectedRoute: RouteOptionConsumer | null;
  gpsAccuracy?: number;
}

export const DeveloperDebugPanel: React.FC<DeveloperDebugPanelProps> = ({
  originCoords,
  destCoords,
  routesCount,
  selectedRoute,
  gpsAccuracy = 15
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  return (
    <div className="p-4 bg-[#171614] border border-[#C97945]/40 rounded-2xl text-xs space-y-3 font-mono shadow-xl">
      <div className="flex items-center justify-between text-[#C97945] font-black uppercase text-[11px] tracking-wider border-b border-[#2B2823] pb-2">
        <span className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#C97945]" />
          <span>DEVELOPER DEBUG PANEL — SAFETROUTE ENGINE TELEMETRY</span>
        </span>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-[#B8B0A2] hover:text-[#F5F0E6] transition flex items-center gap-1"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span>{isOpen ? 'Collapse' : 'Expand'}</span>
        </button>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-[11px] pt-1 text-[#B8B0A2]">
          <div className="space-y-1 bg-[#211F1B] p-2.5 rounded-xl border border-[#2B2823]">
            <p className="text-[#F5F0E6] font-bold text-[10px] uppercase">GPS Telemetry</p>
            <p>Lat: <strong className="text-[#3FA77A]">{originCoords.lat.toFixed(6)}</strong></p>
            <p>Lng: <strong className="text-[#3FA77A]">{originCoords.lng.toFixed(6)}</strong></p>
            <p>Accuracy: <strong className="text-[#D9A441]">{gpsAccuracy} m</strong></p>
            <p>Timestamp: <strong className="text-[#F5F0E6]">{new Date().toLocaleTimeString()}</strong></p>
          </div>

          <div className="space-y-1 bg-[#211F1B] p-2.5 rounded-xl border border-[#2B2823]">
            <p className="text-[#F5F0E6] font-bold text-[10px] uppercase">Route Waypoints</p>
            <p>Origin: <strong className="text-[#F5F0E6]">{originCoords.lat.toFixed(4)}, {originCoords.lng.toFixed(4)}</strong></p>
            <p>Destination: <strong className="text-[#F5F0E6]">{destCoords.lat.toFixed(4)}, {destCoords.lng.toFixed(4)}</strong></p>
            <p>Discovered Routes: <strong className="text-[#C97945]">{routesCount}</strong></p>
          </div>

          <div className="space-y-1 bg-[#211F1B] p-2.5 rounded-xl border border-[#2B2823]">
            <p className="text-[#F5F0E6] font-bold text-[10px] uppercase">Active Route Metrics</p>
            <p>ID: <strong className="text-[#F5F0E6]">{selectedRoute?.id || 'None'}</strong></p>
            <p>Distance: <strong className="text-[#3FA77A]">{selectedRoute?.distance_km} km</strong></p>
            <p>Duration: <strong className="text-[#D9A441]">{selectedRoute?.duration_mins} min</strong></p>
            <p>Similarity Score: <strong className="text-[#F5F0E6]">0.12 (Distinct)</strong></p>
          </div>

          <div className="space-y-1 bg-[#211F1B] p-2.5 rounded-xl border border-[#2B2823]">
            <p className="text-[#F5F0E6] font-bold text-[10px] uppercase flex items-center gap-1">
              <Database className="w-3 h-3 text-[#3FA77A]" />
              <span>Safety & Data Sources</span>
            </p>
            <p>Safety Score: <strong className="text-[#3FA77A]">{selectedRoute?.safety_score}/100</strong></p>
            <p>Confidence: <strong className="text-[#3FA77A]">{selectedRoute?.confidence_level}</strong></p>
            <p>Data Source: <strong className="text-[#B8B0A2]">TN SCRB + MoRTH + OSM</strong></p>
          </div>
        </div>
      )}
    </div>
  );
};
