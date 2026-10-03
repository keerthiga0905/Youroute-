import React, { useEffect, useState, useRef } from 'react';
import { RouteOptionConsumer, NavigationStep } from '../types';
import { MapContainerComponent } from './MapContainer';
import { navigationService } from '../services/navigationService';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Compass,
  Volume2,
  VolumeX,
  X,
  Shield,
  AlertTriangle,
  LocateFixed,
  MapPin,
  CheckCircle2
} from 'lucide-react';

interface NavigationOverlayProps {
  route: RouteOptionConsumer;
  originName: string;
  destinationName: string;
  userLocation?: { lat: number; lng: number };
  onClose?: () => void;
  onExitNavigation?: () => void;
}

export const NavigationOverlay: React.FC<NavigationOverlayProps> = ({
  route,
  originName,
  destinationName,
  userLocation,
  onClose,
  onExitNavigation
}) => {
  const handleExit = onExitNavigation || onClose || (() => {});
  const defaultCoord = route.path?.[0] || { lat: 11.0168, lng: 76.9558 };
  const destCoord = route.path?.[route.path.length - 1] || { lat: 11.0478, lng: 76.8524 };

  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number }>(userLocation || defaultCoord);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [remainingDistKm, setRemainingDistKm] = useState<number>(route.distance_km);
  const [remainingMins, setRemainingMins] = useState<number>(route.duration_mins);
  const [isOffRoute, setIsOffRoute] = useState<boolean>(false);
  const [isArrived, setIsArrived] = useState<boolean>(false);

  const watchIdRef = useRef<number | null>(null);

  const steps: NavigationStep[] = (route.steps && route.steps.length > 0)
    ? route.steps
    : (route.maneuvers && route.maneuvers.length > 0)
    ? route.maneuvers
    : (route.segments || []).map((seg, idx) => ({
        step_index: idx + 1,
        instruction: `Head on ${seg.road_name || seg.street_name || 'route segment'}`,
        road_name: seg.road_name || seg.street_name || `Segment ${idx + 1}`,
        street_name: seg.road_name || seg.street_name || `Segment ${idx + 1}`,
        distance_m: seg.distance_m || Math.round(seg.segment_length_km * 1000),
        duration_s: seg.duration_s || 60,
        maneuver_type: idx === 0 ? 'depart' : idx === route.segments.length - 1 ? 'arrive' : 'straight',
        location: seg.start || defaultCoord
      }));

  const activeStep = steps[currentStepIdx] || steps[0];

  useEffect(() => {
    navigationService.resetVoice();

    if (voiceEnabled && activeStep) {
      navigationService.speakInstruction(`Starting navigation to ${destinationName}. ${activeStep.instruction}`);
    }

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserPos({ lat, lng });

          const distToDest = navigationService.getDistanceMeters(lat, lng, destCoord.lat, destCoord.lng);
          const remKm = Math.max(0.1, Math.round((distToDest / 1000) * 10) / 10);
          setRemainingDistKm(remKm);
          setRemainingMins(Math.max(1, Math.round(remKm / (route.distance_km / Math.max(1, route.duration_mins)))));

          if (distToDest < 25) {
            setIsArrived(true);
            if (voiceEnabled) {
              navigationService.speakInstruction(`You have arrived at your destination: ${destinationName}`);
            }
          }
        },
        (err) => {
          console.warn("GPS tracking notice:", err.message);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      navigationService.resetVoice();
    };
  }, []);

  const toggleVoice = () => {
    const nextState = !voiceEnabled;
    setVoiceEnabled(nextState);
    if (!nextState) {
      navigationService.resetVoice();
    } else if (activeStep) {
      navigationService.speakInstruction(activeStep.instruction, true);
    }
  };

  const getManeuverIcon = (mType?: string) => {
    if (mType?.includes('left')) return <ArrowLeft className="w-8 h-8 text-red-600" />;
    if (mType?.includes('right')) return <ArrowRight className="w-8 h-8 text-red-600" />;
    if (mType === 'arrive') return <MapPin className="w-8 h-8 text-emerald-600" />;
    return <ArrowUp className="w-8 h-8 text-slate-800" />;
  };

  const etaClock = navigationService.calculateEtaTime(remainingMins);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900 text-white flex flex-col overflow-hidden font-sans">
      
      {/* Top Header Bar */}
      <div className="p-4 bg-white text-slate-900 border-b border-slate-200 flex items-center justify-between shadow-md shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              navigationService.resetVoice();
              onClose();
            }}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <X className="w-4 h-4" />
            <span>Stop Navigation</span>
          </button>

          <div className="hidden sm:block border-l border-slate-200 pl-3">
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Active Route</p>
            <p className="text-xs font-black text-slate-900">{route.name}</p>
          </div>
        </div>

        {/* Live ETA & Stats */}
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider">ETA {etaClock}</p>
            <p className="text-sm font-black text-slate-900 font-mono">
              {remainingDistKm} km · {remainingMins} min remaining
            </p>
          </div>

          <button
            onClick={toggleVoice}
            className={`p-2.5 rounded-2xl border transition ${
              voiceEnabled
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            title={voiceEnabled ? "Voice Guidance ON" : "Voice Guidance OFF"}
          >
            {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* TURN-BY-TURN STEP BANNER */}
      <div className="p-4 bg-slate-800 text-white border-b border-slate-700 flex items-center justify-between gap-4 shadow-xl z-20">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white text-slate-900 shadow-md shrink-0">
            {getManeuverIcon(activeStep?.maneuver_type || activeStep?.maneuver)}
          </div>

          <div className="space-y-0.5">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Next Step Instruction</p>
            <h2 className="text-base sm:text-lg font-black text-white">
              {activeStep?.instruction || `Proceed toward ${destinationName}`}
            </h2>
            <p className="text-xs text-slate-300">
              In ~{Math.round(activeStep?.distance_m || 300)} meters on {activeStep?.street_name || activeStep?.road_name || 'road'}
            </p>
          </div>
        </div>

        <div className="hidden md:flex gap-2">
          <button
            disabled={currentStepIdx === 0}
            onClick={() => {
              const prev = Math.max(0, currentStepIdx - 1);
              setCurrentStepIdx(prev);
              if (voiceEnabled && steps[prev]) navigationService.speakInstruction(steps[prev].instruction);
            }}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold disabled:opacity-50"
          >
            Prev Step
          </button>

          <button
            disabled={currentStepIdx === steps.length - 1}
            onClick={() => {
              const next = Math.min(steps.length - 1, currentStepIdx + 1);
              setCurrentStepIdx(next);
              if (voiceEnabled && steps[next]) navigationService.speakInstruction(steps[next].instruction);
            }}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
          >
            Next Step
          </button>
        </div>
      </div>

      {/* MAIN NAVIGATION MAP VIEWPORT */}
      <div className="relative flex-1 w-full h-full">
        <MapContainerComponent
          allRoutes={[route]}
          selectedRoute={route}
          onSelectRoute={() => {}}
          originName={originName}
          destinationName={destinationName}
          originCoords={userPos}
          destCoords={destCoord}
          userLocation={userPos}
        />

        {/* Live Navigation Active Badge */}
        <div className="absolute bottom-6 left-6 z-[400] bg-white/95 text-slate-900 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200 flex items-center gap-3 text-xs shadow-lg font-bold">
          <span className="w-3 h-3 rounded-full bg-red-600 animate-ping inline-block"></span>
          <span>Live GPS Navigation Active</span>
        </div>
      </div>

      {/* ARRIVAL MODAL */}
      {isArrived && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl border border-emerald-300 max-w-md w-full text-center space-y-6 shadow-2xl text-slate-900">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
                Destination Arrived
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-3">YOU HAVE ARRIVED!</h2>
              <p className="text-sm font-semibold text-slate-600 mt-1">{destinationName}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2 text-left">
              <div className="flex justify-between text-slate-600">
                <span>Total Distance:</span>
                <span className="font-bold text-slate-900">{route.distance_km} km</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Duration:</span>
                <span className="font-bold text-slate-900">{route.duration_mins} mins</span>
              </div>
            </div>

            <button
              onClick={() => {
                navigationService.resetVoice();
                onClose();
              }}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-2xl transition shadow-lg shadow-red-600/25"
            >
              DONE
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default NavigationOverlay;
