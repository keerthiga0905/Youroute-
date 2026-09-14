import React from 'react';
import { RouteOptionConsumer } from '../types';
import { X, CheckCircle2, AlertTriangle, Clock, Sliders } from 'lucide-react';

interface WhyRouteModalProps {
  route: RouteOptionConsumer | null;
  onClose: () => void;
}

export const WhyRouteModal: React.FC<WhyRouteModalProps> = ({ route, onClose }) => {
  if (!route) return null;

  const isLowerOrMod = route.risk_level === 'lower' || route.risk_level === 'moderate';
  const title = isLowerOrMod
    ? `Why we rated this route ${route.risk_label.toLowerCase()}`
    : `Why this route has ${route.risk_label.toLowerCase()}`;

  const factors = route.influential_factors || [
    { factor: 'historical_crime', label: 'Historical Incidents', weight_percent: 32 },
    { factor: 'time_of_travel', label: 'Time of Travel', weight_percent: 22 },
    { factor: 'road_activity', label: 'Road Activity & Foot Traffic', weight_percent: 20 },
    { factor: 'accident_history', label: 'Accident History', weight_percent: 16 },
    { factor: 'weather', label: 'Weather Conditions', weight_percent: 10 }
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg night-panel border border-[#2B2823] rounded-t-3xl sm:rounded-3xl p-6 space-y-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#2B2823] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                route.risk_level === 'lower' ? 'bg-[#3FA77A]/20 text-[#3FA77A] border border-[#3FA77A]/40' : (
                  route.risk_level === 'moderate' ? 'bg-[#D9A441]/20 text-[#D9A441] border border-[#D9A441]/40' : (
                    route.risk_level === 'elevated' ? 'bg-[#D66A3A]/20 text-[#D66A3A] border border-[#D66A3A]/40' : 'bg-[#C94C4C]/20 text-[#C94C4C] border border-[#C94C4C]/40'
                  )
                )
              }`}>
                {route.risk_label}
              </span>
              <h3 className="font-extrabold text-[#F5F0E6] text-base">{route.name}</h3>
            </div>
            <p className="text-xs text-[#B8B0A2] capitalize">{title}</p>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-[#B8B0A2] hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Positive Points */}
        {route.why_recommended && route.why_recommended.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-[#F5F0E6] uppercase tracking-wider">Key Positive Factors</h4>
            <div className="space-y-1.5">
              {route.why_recommended.map((pt, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-[#F5F0E6]">
                  <CheckCircle2 className="w-4 h-4 text-[#3FA77A] shrink-0" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Consideration Points */}
        {route.negative_points && route.negative_points.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-[#F5F0E6] uppercase tracking-wider">Consideration Factors</h4>
            <div className="space-y-1.5">
              {route.negative_points.map((pt, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-[#B8B0A2]">
                  <AlertTriangle className="w-4 h-4 text-[#D9A441] shrink-0" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Influential Factors Breakdown */}
        <div className="space-y-3 pt-2 border-t border-[#2B2823]">
          <div className="flex justify-between items-center text-xs text-[#B8B0A2]">
            <span className="font-bold flex items-center gap-1.5 text-[#F5F0E6]">
              <Sliders className="w-3.5 h-3.5 text-[#C97945]" />
              <span>Most influential factors</span>
            </span>
            <span className="text-[10px]">Contextual Weight</span>
          </div>

          <div className="space-y-2.5">
            {factors.map((f, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#B8B0A2] font-medium">{f.label}</span>
                  <span className="text-[#C97945] font-mono font-semibold">{f.weight_percent}%</span>
                </div>
                <div className="w-full bg-[#171614] h-2 rounded-full overflow-hidden border border-[#2B2823]">
                  <div
                    className="bg-[#C97945] h-full rounded-full transition-all duration-500"
                    style={{ width: `${f.weight_percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trade-off summary */}
        {route.trade_off_text && (
          <div className="p-3 bg-[#171614] rounded-2xl border border-[#2B2823] flex items-center gap-2 text-xs text-[#F5F0E6]">
            <Clock className="w-4 h-4 text-[#C97945] shrink-0" />
            <span><strong>Trade-off:</strong> {route.trade_off_text}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#C97945] hover:bg-[#b56937] text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-[#C97945]/20"
          >
            Got it, thanks
          </button>
        </div>

      </div>
    </div>
  );
};
