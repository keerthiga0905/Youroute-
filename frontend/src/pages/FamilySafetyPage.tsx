import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  getFamilyMembers, sendFamilyInvite, sendDirectFamilyInvite, generateQRConnectionToken, scanQRConnectionToken,
  resendFamilyInvite, removeFamilyMember, disableLocationSharing, enableLocationSharing,
  triggerFamilyEmergency, acknowledgeEmergencyAlert, resolveEmergencyAlert, uploadEmergencyMedia,
  getActiveEmergencies, getEmergencyHistoryLog, deleteEmergencyEventRecord, updateLocationPayload,
  getLocationHistory, deleteLocationHistory, updatePrivacySettings, acceptFamilyInvite, declineFamilyInvite,
  ensureDemoSession
} from '../services/api';
import { ConnectedFamilyMember, PendingFamilyRequest, FamilyEmergencyAlert, LocationHistoryItem } from '../types';
import { FamilyMap } from '../components/FamilyMap';
import {
  Shield, Users, UserPlus, Radio, Activity, Clock, MapPin, AlertOctagon,
  Copy, Check, Trash2, Power, Eye, EyeOff, Lock, RefreshCw, Send, AlertTriangle,
  Navigation, Mic, MicOff, Camera, Video, QrCode, Phone, MessageSquare, Battery,
  Volume2, VolumeX, ShieldAlert, Sparkles, CheckCircle2, XCircle, Loader2,
  Smartphone, Mail, Zap, ExternalLink, ShieldCheck, Cpu, Radar, BellRing
} from 'lucide-react';

export const FamilySafetyPage: React.FC = () => {
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'add' | 'map' | 'privacy' | 'history' | 'emergency_history'>('dashboard');

  // Connection Method Sub-tab
  const [connectMethod, setConnectMethod] = useState<'email' | 'direct' | 'qr'>('email');

  // Dashboard Data
  const [connectedMembers, setConnectedMembers] = useState<ConnectedFamilyMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingFamilyRequest[]>([]);
  const [mySharingStatus, setMySharingStatus] = useState<{
    sharing_enabled: boolean;
    permission_type?: string;
    history_opt_in: boolean;
    voice_detection_enabled?: boolean;
    media_recording_enabled?: boolean;
    last_updated?: string;
    latitude?: number;
    longitude?: number;
    battery_level?: number;
  }>({ sharing_enabled: false, history_opt_in: false });

  const [emergencies, setEmergencies] = useState<FamilyEmergencyAlert[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<ConnectedFamilyMember | null>(null);
  const [networkOnline, setNetworkOnline] = useState<boolean>(navigator.onLine);

  // Add Family Member Form State
  const [addName, setAddName] = useState('');
  const [addRelationship, setAddRelationship] = useState('Father');
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addSuccess, setAddSuccess] = useState<{ invite_url: string; token: string; email: string } | null>(null);
  const [addDirectSuccess, setAddDirectSuccess] = useState<{ notification: string; invite_id?: number } | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // QR Code Connection State
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [scanQrInput, setScanQrInput] = useState('');
  const [scanRelationship, setScanRelationship] = useState('Mother');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);

  // 2-Second Hold Button SOS State
  const [sosHoldProgress, setSosHoldProgress] = useState<number>(0);
  const holdTimerRef = useRef<any>(null);

  // False Activation Protection (5-Second Countdown Modal)
  const [sosCountdownActive, setSosCountdownActive] = useState<boolean>(false);
  const [sosCountdownSeconds, setSosCountdownSeconds] = useState<number>(5);
  const [sosTriggerMethod, setSosTriggerMethod] = useState<'BUTTON' | 'VOICE' | 'AUTOMATED_SAFETY_TRIGGER'>('BUTTON');

  // Active Media Evidence Recording State
  const [isRecordingEvidence, setIsRecordingEvidence] = useState<boolean>(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Voice SOS Speech Recognition
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Emergency History Data
  const [emergencyHistory, setEmergencyHistory] = useState<FamilyEmergencyAlert[]>([]);
  const [historyItems, setHistoryItems] = useState<LocationHistoryItem[]>([]);
  const [historyOptIn, setHistoryOptIn] = useState(false);

  // Modals & UI helpers
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [simulatedRecipientAccepted, setSimulatedRecipientAccepted] = useState(false);

  // Ensure initial demo authentication session on mount
  useEffect(() => {
    ensureDemoSession();
  }, []);

  // Battery status tracking
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }).catch((e: any) => console.log("Battery API notice:", e));
    }

    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load Dashboard Data
  const loadFamilyData = useCallback(async () => {
    try {
      await ensureDemoSession();
      const data = await getFamilyMembers();
      setConnectedMembers(data.connected_members || []);
      setPendingRequests(data.pending_requests || []);
      setMySharingStatus(data.my_sharing_status || { sharing_enabled: false, history_opt_in: false });
      setHistoryOptIn(data.my_sharing_status?.history_opt_in || false);

      const emData = await getActiveEmergencies();
      setEmergencies(emData.emergencies || []);
    } catch (err) {
      console.error("Failed to load family safety data:", err);
    }
  }, []);

  useEffect(() => {
    loadFamilyData();
    const interval = setInterval(loadFamilyData, 6000);
    return () => clearInterval(interval);
  }, [loadFamilyData]);

  // Load Emergency History when switching tab
  useEffect(() => {
    if (activeTab === 'emergency_history') {
      getEmergencyHistoryLog().then(res => setEmergencyHistory(res.emergency_history || [])).catch(e => console.error(e));
    } else if (activeTab === 'history') {
      getLocationHistory().then(res => setHistoryItems(res.history || [])).catch(e => console.error(e));
    }
  }, [activeTab]);

  // Audio Speech Warning for Emergency SOS
  useEffect(() => {
    if (emergencies.length > 0) {
      const alert = emergencies[0];
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`Emergency alert! ${alert.user_name} has triggered an SOS alert.`);
        utterance.rate = 1.0;
        utterance.pitch = 1.2;
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [emergencies.length]);

  // Track Device Location
  useEffect(() => {
    if (!mySharingStatus.sharing_enabled || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        updateLocationPayload({
          latitude: coords.lat,
          longitude: coords.lng,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed || 0,
          heading: pos.coords.heading || 0,
          battery_level: batteryLevel || undefined
        }).catch(err => console.error("Error updating location payload:", err));
      },
      (err) => console.error("Watch location error:", err),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [mySharingStatus.sharing_enabled, batteryLevel]);

  // Voice SOS Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.toLowerCase();
          console.log("Voice speech detected:", transcript);
          if (transcript.includes("help") || transcript.includes("emergency") || transcript.includes("sos") || transcript.includes("save me")) {
            startEmergencyCountdown('VOICE');
          }
        }
      }
    };

    rec.onerror = (e: any) => console.log("Speech recognition error:", e);
    recognitionRef.current = rec;
  }, []);

  const toggleVoiceDetection = (enable: boolean) => {
    if (enable) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListeningVoice(true);
        } catch (e) {
          console.log("Speech recognition start notice:", e);
        }
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          setIsListeningVoice(false);
        } catch (e) {}
      }
    }

    updatePrivacySettings({
      sharing_enabled: mySharingStatus.sharing_enabled,
      voice_detection_enabled: enable
    }).then(loadFamilyData);
  };

  // 2-Second Hold Button SOS Handler
  const handleSosMouseDown = () => {
    setSosHoldProgress(0);
    let current = 0;
    holdTimerRef.current = setInterval(() => {
      current += 10;
      setSosHoldProgress(current);
      if (current >= 100) {
        clearInterval(holdTimerRef.current);
        startEmergencyCountdown('BUTTON');
      }
    }, 100);
  };

  const handleSosMouseUp = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
    }
    if (sosHoldProgress < 100) {
      setSosHoldProgress(0);
    }
  };

  // 5-Second False Activation Countdown
  const startEmergencyCountdown = (method: 'BUTTON' | 'VOICE' | 'AUTOMATED_SAFETY_TRIGGER') => {
    setSosTriggerMethod(method);
    setSosCountdownSeconds(5);
    setSosCountdownActive(true);
  };

  useEffect(() => {
    let timer: any = null;
    if (sosCountdownActive) {
      if (sosCountdownSeconds > 0) {
        timer = setInterval(() => {
          setSosCountdownSeconds(prev => prev - 1);
        }, 1000);
      } else {
        setSosCountdownActive(false);
        executeEmergencyBroadcast();
      }
    }
    return () => clearInterval(timer);
  }, [sosCountdownActive, sosCountdownSeconds]);

  // Execute Actual SOS Broadcast & Evidence Capture
  const executeEmergencyBroadcast = async () => {
    let lat = userLocation?.lat || 11.0168;
    let lng = userLocation?.lng || 76.9558;

    if (navigator.geolocation) {
      try {
        const pos: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e) {}
    }

    try {
      const res = await triggerFamilyEmergency({
        latitude: lat,
        longitude: lng,
        accuracy: 10,
        trigger_method: sosTriggerMethod,
        battery_level: batteryLevel || undefined,
        message: `🚨 Emergency SOS Triggered via ${sosTriggerMethod}!`
      });

      startMediaEvidenceRecording(res.id);
      loadFamilyData();
    } catch (err: any) {
      alert("Failed to send Emergency SOS alert.");
    }
  };

  // Record Camera & Microphone Evidence Video
  const startMediaEvidenceRecording = async (eventId: number) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setIsRecordingEvidence(true);
      recordedChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecordingEvidence(false);
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideoUrl(videoUrl);

        try {
          await uploadEmergencyMedia(eventId, blob, "AUDIO_VIDEO");
        } catch (uploadErr) {
          console.error("Media evidence upload notice:", uploadErr);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, 8000);
    } catch (permErr) {
      console.warn("Camera/Microphone permission notice:", permErr);
    }
  };

  const handleAcknowledgeSOS = async (eventId: number) => {
    try {
      const res = await acknowledgeEmergencyAlert(eventId);
      alert(res.message);
      loadFamilyData();
    } catch (err) {
      alert("Failed to acknowledge emergency alert.");
    }
  };

  const handleRemoveMember = async (connectionId: number) => {
    if (!window.confirm("Are you sure you want to remove this family connection? Location sharing access will be revoked.")) return;
    try {
      await removeFamilyMember(connectionId);
      loadFamilyData();
    } catch (err) {
      alert("Failed to remove family member.");
    }
  };

  const handleResolveSOS = async (eventId: number) => {
    try {
      await resolveEmergencyAlert(eventId);
      loadFamilyData();
    } catch (err) {
      alert("Failed to resolve emergency alert.");
    }
  };

  // Generate QR Token
  const handleGenerateQR = async () => {
    setQrLoading(true);
    try {
      const res = await generateQRConnectionToken();
      setQrToken(res.qr_token);
      setQrExpiresAt(res.expires_at);
      setQrLoading(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to generate 3D QR Code token.");
      setQrLoading(false);
    }
  };

  // Auto-generate QR code when opening Option 3 tab if not present
  useEffect(() => {
    if (connectMethod === 'qr' && !qrToken) {
      handleGenerateQR();
    }
  }, [connectMethod]);

  // Scan & Redeem QR Code
  const handleScanQRSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanQrInput.trim()) return;
    setScanLoading(true);
    setScanSuccess(null);
    try {
      const res = await scanQRConnectionToken({ qr_token: scanQrInput.trim(), relationship: scanRelationship });
      setScanSuccess(res.message || "Connected successfully via 3D QR token!");
      setScanQrInput('');
      setScanLoading(false);
      loadFamilyData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Invalid or expired QR token.");
      setScanLoading(false);
    }
  };

  // Option 2 — In-App Direct Request Submission
  const handleDirectInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddDirectSuccess(null);
    setAddLoading(true);
    setSimulatedRecipientAccepted(false);

    try {
      const res = await sendDirectFamilyInvite({
        member_name: addName,
        relationship: addRelationship,
        phone: addPhone,
        email: addEmail
      });

      setAddDirectSuccess({ notification: res.notification || res.message, invite_id: res.invite_id });
      setAddLoading(false);
      loadFamilyData();
    } catch (err: any) {
      setAddError(err.response?.data?.detail || "Failed to send direct in-app request.");
      setAddLoading(false);
    }
  };

  // Option 1 — Email Invite Link Submission
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);
    setAddLoading(true);

    try {
      const res = await sendFamilyInvite({
        member_name: addName,
        relationship: addRelationship,
        phone: addPhone,
        email: addEmail
      });

      setAddSuccess({
        invite_url: res.invite_url,
        token: res.token,
        email: res.email
      });
      setAddLoading(false);
      loadFamilyData();
    } catch (err: any) {
      setAddError(err.response?.data?.detail || "Failed to send family invitation.");
      setAddLoading(false);
    }
  };

  // Simulate in-app notification acceptance (Option 2 demo)
  const handleSimulateInAppAccept = async (token: string) => {
    try {
      await acceptFamilyInvite(token);
      setSimulatedRecipientAccepted(true);
      loadFamilyData();
    } catch (e) {
      console.error(e);
    }
  };

  // Copy token handler
  const copyToClipboard = (text: string, type: 'token' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2500);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // 3D Matrix QR Code SVG Generator Component
  const renderSVGQRCode = (tokenString: string) => {
    const size = 220;
    // Hash string into grid matrix
    const grid: boolean[][] = [];
    for (let r = 0; r < 15; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < 15; c++) {
        // Corner markers
        if (
          (r < 4 && c < 4) ||
          (r < 4 && c > 10) ||
          (r > 10 && c < 4)
        ) {
          const isBorder = (r === 0 || r === 3 || c === 0 || c === 3) ||
                           (r === 0 || r === 3 || c === 11 || c === 14) ||
                           (r === 11 || r === 14 || c === 0 || c === 3);
          const isCenter = (r === 1 && c === 1) || (r === 1 && c === 12) || (r === 12 && c === 1);
          row.push(isBorder || isCenter);
        } else {
          const charCode = tokenString.charCodeAt((r * 15 + c) % tokenString.length);
          row.push((charCode + r * 3 + c * 7) % 2 === 0);
        }
      }
      grid.push(row);
    }

    const cellSize = size / 15;

    return (
      <div className="relative p-6 bg-slate-950/90 border-2 border-cyan-500/40 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.3)] backdrop-blur-2xl flex flex-col items-center group overflow-hidden">
        {/* Holographic scanning laser beam line */}
        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#06b6d4] animate-pulse top-2 z-20 transition-all" style={{ animationDuration: '2s' }} />

        {/* 3D Glass Corner Brackets */}
        <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-cyan-400" />
        <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-cyan-400" />
        <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-cyan-400" />

        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="z-10 transition-transform duration-500 group-hover:scale-105">
          <rect width={size} height={size} fill="#020617" rx="16" />
          {grid.map((row, rIdx) =>
            row.map((cell, cIdx) =>
              cell ? (
                <rect
                  key={`${rIdx}-${cIdx}`}
                  x={cIdx * cellSize + 1.5}
                  y={rIdx * cellSize + 1.5}
                  width={cellSize - 3}
                  height={cellSize - 3}
                  rx="3"
                  fill={(rIdx < 4 && cIdx < 4) || (rIdx < 4 && cIdx > 10) || (rIdx > 10 && cIdx < 4) ? "#06b6d4" : "#10b981"}
                  className="transition-colors duration-300 hover:fill-amber-400"
                />
              ) : null
            )
          )}
        </svg>

        <div className="mt-4 flex items-center gap-2 bg-cyan-950/60 text-cyan-300 px-4 py-1.5 rounded-full border border-cyan-500/30 text-xs font-mono tracking-widest uppercase">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          <span>Token: <strong className="text-white text-sm tracking-wider">{tokenString}</strong></span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden selection:bg-red-500 selection:text-white">
      {/* Dynamic 3D Cyberpunk Network Background Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-25">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(16,185,129,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(239,68,68,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* Sticky High-Tech Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-2xl border-b border-slate-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300 animate-pulse" />
              <div className="relative p-2.5 bg-slate-950 rounded-2xl border border-red-500/40 flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  SafeRoute <span className="text-red-500">PRO MAX</span>
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">
                  Consent Family Network
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Protection Mesh • encrypted location sharing
              </p>
            </div>
          </div>

          {/* Quick SOS Trigger Header Pill */}
          <div className="flex items-center gap-3">
            {/* Battery Indicator */}
            {batteryLevel !== null && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300">
                <Battery className={`w-4 h-4 ${batteryLevel < 20 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`} />
                <span>{batteryLevel}%</span>
              </div>
            )}

            {/* Hold for SOS 3D Trigger Button */}
            <div className="relative group select-none">
              <button
                onMouseDown={handleSosMouseDown}
                onMouseUp={handleSosMouseUp}
                onTouchStart={handleSosMouseDown}
                onTouchEnd={handleSosMouseUp}
                className="relative px-5 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-bold rounded-2xl shadow-[0_0_25px_rgba(225,29,72,0.4)] hover:shadow-[0_0_35px_rgba(225,29,72,0.7)] transition-all transform active:scale-95 flex items-center gap-2 text-sm overflow-hidden"
              >
                <AlertOctagon className="w-4 h-4 animate-bounce" />
                <span>Hold 2s for Emergency SOS</span>

                {/* Progress Overlay */}
                {sosHoldProgress > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 bg-red-400/50 transition-all duration-100 pointer-events-none"
                    style={{ width: `${sosHoldProgress}%` }}
                  />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Nav Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto py-2 border-t border-slate-800/80 no-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard Overview', icon: Activity, badge: connectedMembers.length },
            { id: 'add', label: 'Add Family Member', icon: UserPlus, highlight: true },
            { id: 'map', label: 'Live Family Map', icon: MapPin, badge: connectedMembers.filter(m => m.location_sharing_active).length },
            { id: 'privacy', label: 'Safety & Privacy', icon: Lock },
            { id: 'history', label: 'Location History', icon: Clock },
            { id: 'emergency_history', label: 'SOS Logs & Evidence', icon: ShieldAlert, badge: emergencyHistory.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] border border-red-400/40 scale-[1.02]'
                    : tab.highlight
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${isActive ? 'bg-white text-red-600' : 'bg-red-500/20 text-red-400'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">

        {/* 🚨 Active Emergency SOS Banner (If any family member has triggered SOS) */}
        {emergencies.length > 0 && (
          <div className="relative rounded-3xl bg-gradient-to-r from-red-950 via-rose-950 to-slate-950 p-6 border-2 border-red-500/80 shadow-[0_0_60px_rgba(239,68,68,0.5)] animate-pulse overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <ShieldAlert className="w-64 h-64 text-red-500" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-red-600 text-white font-extrabold text-xs tracking-wider uppercase rounded-full animate-ping">
                    🚨 EMERGENCY SOS ACTIVE
                  </span>
                  <span className="text-xs text-red-300 font-mono">ID #{emergencies[0].id}</span>
                </div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <span>{emergencies[0].user_name}</span>
                  <span className="text-red-400">needs immediate assistance!</span>
                </h2>
                <p className="text-sm text-red-200/90 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <span>Lat: {emergencies[0].latitude.toFixed(4)}, Lng: {emergencies[0].longitude.toFixed(4)}</span>
                  <span className="text-red-400/60">•</span>
                  <span>Method: <strong>{emergencies[0].trigger_method}</strong></span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleAcknowledgeSOS(emergencies[0].id)}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Acknowledge Signal</span>
                </button>
                <button
                  onClick={() => handleResolveSOS(emergencies[0].id)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Mark All Safe</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 1: ADD FAMILY MEMBER ----------------- */}
        {activeTab === 'add' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header Title Banner */}
            <div className="relative p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 max-w-3xl space-y-2">
                <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest">
                  Consent-Based Security Mesh
                </span>
                <h2 className="text-3xl font-black text-white tracking-tight">
                  Add Family Member
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Establish a mutual, consent-based connection with your parents, spouse, or siblings.
                  Location tracking is strictly double-opt-in and cannot be activated without explicit acceptance.
                </p>
              </div>

              {/* 3 Invitation Method Sub-Tabs */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'email',
                    title: 'Option 1 — Email Link',
                    subtitle: 'Web link sent via email',
                    icon: Mail,
                    color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30'
                  },
                  {
                    id: 'direct',
                    title: 'Option 2 — Phone / App Direct',
                    subtitle: 'Instant in-app push request',
                    icon: Smartphone,
                    color: 'from-rose-500/20 to-red-500/10 border-red-500/30'
                  },
                  {
                    id: 'qr',
                    title: 'Option 3 — 3D QR Matrix Scan',
                    subtitle: 'Face-to-face instant pairing',
                    icon: QrCode,
                    color: 'from-cyan-500/20 to-emerald-500/10 border-cyan-500/30'
                  }
                ].map(method => {
                  const Icon = method.icon;
                  const isSelected = connectMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => {
                        setConnectMethod(method.id as any);
                        setAddError(null);
                      }}
                      className={`relative p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between gap-3 ${
                        isSelected
                          ? `bg-gradient-to-br ${method.color} border-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] scale-[1.02]`
                          : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/50 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-white/10 text-white' : 'bg-slate-800 text-slate-400'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {isSelected && (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-white">{method.title}</h3>
                        <p className="text-xs text-slate-400">{method.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message if any */}
            {addError && (
              <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-center gap-3 shadow-lg">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            {/* 📧 OPTION 1 CONTENT: EMAIL LINK INVITATION */}
            {connectMethod === 'email' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-2xl space-y-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-400 text-xs font-mono font-semibold">
                      <Mail className="w-4 h-4" />
                      <span>OPTION 1 FORM • WEB LINK INVITATION</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">Send Email Invitation Link</h3>
                    <p className="text-xs text-slate-400">
                      The recipient will receive an email containing a secure token link (`https://saferoute.app/invite?token=...`).
                    </p>
                  </div>

                  <form onSubmit={handleAddSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Family Member Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Appa / Father"
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Relationship *
                        </label>
                        <select
                          value={addRelationship}
                          onChange={(e) => setAddRelationship(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Son">Son</option>
                          <option value="Daughter">Daughter</option>
                          <option value="Friend">Trusted Friend</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Registered Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="family@gmail.com"
                          value={addEmail}
                          onChange={(e) => setAddEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={addLoading}
                      className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2"
                    >
                      {addLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>Send Email Invitation Link</span>
                    </button>
                  </form>

                  {addSuccess && (
                    <div className="p-6 rounded-2xl bg-blue-950/40 border border-blue-500/40 space-y-3 animate-fadeIn">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Email Invitation Link Generated!</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        An email invitation link was generated for <strong>{addSuccess.email}</strong>.
                      </p>
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-blue-300 flex items-center justify-between gap-2 overflow-x-auto">
                        <span className="truncate">{addSuccess.invite_url}</span>
                        <button
                          onClick={() => copyToClipboard(addSuccess.invite_url, 'link')}
                          className="px-3 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-200 text-[11px] font-bold rounded-lg flex items-center gap-1 shrink-0"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info Graphic Card */}
                <div className="lg:col-span-5 p-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="p-3 w-fit rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Mail className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-bold text-white">How Option 1 Works</h4>
                    <ul className="space-y-3 text-xs text-slate-400">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                        <span>Generates a unique web URL with an encrypted token.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                        <span>Recipient opens the link in their browser or mobile email client.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                        <span>Upon clicking <strong>[Accept]</strong>, location sharing is established.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
                    <span>Consent links auto-expire after 48 hours if unaccepted.</span>
                  </div>
                </div>
              </div>
            )}

            {/* 📱 OPTION 2 CONTENT: PHONE / IN-APP DIRECT REQUEST */}
            {connectMethod === 'direct' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-2xl space-y-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-semibold">
                      <Smartphone className="w-4 h-4" />
                      <span>OPTION 2 FORM • INSTANT IN-APP DIRECT PUSH</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">Send In-App Direct Request</h3>
                    <p className="text-xs text-slate-400">
                      Pings the family member directly inside their installed SafeRoute App. A modal request pop-up will appear live on their screen.
                    </p>
                  </div>

                  <form onSubmit={handleDirectInviteSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Family Member Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Amma / Mother"
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Relationship *
                        </label>
                        <select
                          value={addRelationship}
                          onChange={(e) => setAddRelationship(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-rose-500"
                        >
                          <option value="Mother">Mother</option>
                          <option value="Father">Father</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Son">Son</option>
                          <option value="Daughter">Daughter</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Registered Phone / Email *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="+91 98765 43210 or email"
                          value={addPhone || addEmail}
                          onChange={(e) => {
                            setAddPhone(e.target.value);
                            setAddEmail(e.target.value);
                          }}
                          className="w-full px-4 py-3 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={addLoading}
                      className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm rounded-xl shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2"
                    >
                      {addLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BellRing className="w-4 h-4 animate-bounce" />}
                      <span>Send In-App Direct Request</span>
                    </button>
                  </form>

                  {addDirectSuccess && (
                    <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-4 animate-fadeIn">
                      <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                        <BellRing className="w-4 h-4 animate-ping" />
                        <span>Direct Request Sent to Device!</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {addDirectSuccess.notification}
                      </p>
                    </div>
                  )}
                </div>

                {/* Interactive Phone Simulator Box */}
                <div className="lg:col-span-5 p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between relative overflow-hidden">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-rose-400">
                      <Smartphone className="w-4 h-4" />
                      <span>LIVE TARGET PHONE PREVIEW</span>
                    </div>
                    <h4 className="text-base font-bold text-white">Target Device Pop-up Preview</h4>
                  </div>

                  {/* Phone Screen Mockup */}
                  <div className="p-5 rounded-3xl bg-slate-950 border-4 border-slate-800 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[10px] text-slate-500 font-mono">
                      <span>SafeRoute Push Service</span>
                      <span className="text-emerald-400">● LIVE CONNECTED</span>
                    </div>

                    {addDirectSuccess ? (
                      <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-rose-500/50 shadow-xl space-y-3 text-center animate-pulse">
                        <div className="w-10 h-10 mx-auto rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                          <BellRing className="w-5 h-5" />
                        </div>
                        <h5 className="text-xs font-bold text-white">Family Connection Request</h5>
                        <p className="text-[11px] text-slate-300">
                          User requested to establish mutual location sharing with you.
                        </p>
                        {simulatedRecipientAccepted ? (
                          <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Connection Accepted!</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              onClick={() => setAddDirectSuccess(null)}
                              className="py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-700"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => addDirectSuccess.invite_id && handleSimulateInAppAccept(`demo_token_${addDirectSuccess.invite_id}`)}
                              className="py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 shadow-md"
                            >
                              Accept Now
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-600 text-xs font-mono">
                        Waiting to send direct request...
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 text-center">
                    Option 2 uses instant push alerts without requiring email link clicks.
                  </p>
                </div>
              </div>
            )}

            {/* ⚡ OPTION 3 CONTENT: 3D HOLOGRAPHIC QR CODE */}
            {connectMethod === 'qr' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* QR Code Generator Box */}
                <div className="lg:col-span-6 p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-2xl space-y-6 flex flex-col items-center text-center">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2 text-cyan-400 text-xs font-mono font-semibold">
                      <QrCode className="w-4 h-4" />
                      <span>OPTION 3 • 3D QR MATRIX GENERATOR</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">Generate Instant Pairing QR Code</h3>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Show this glowing encrypted 3D QR token to your family member so they can scan it with their camera.
                    </p>
                  </div>

                  {qrLoading ? (
                    <div className="h-64 flex flex-col items-center justify-center space-y-3">
                      <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                      <span className="text-xs text-cyan-300 font-mono">Generating encrypted 3D matrix...</span>
                    </div>
                  ) : qrToken ? (
                    <div className="space-y-4">
                      {renderSVGQRCode(qrToken)}
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => copyToClipboard(qrToken, 'token')}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 border border-slate-700"
                        >
                          {copiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                          <span>{copiedToken ? 'Token Copied!' : 'Copy Token Code'}</span>
                        </button>

                        <button
                          onClick={handleGenerateQR}
                          className="px-4 py-2 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-xs font-bold rounded-xl flex items-center gap-2 border border-cyan-800"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Refresh QR</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerateQR}
                      className="px-6 py-3.5 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-bold text-sm rounded-2xl shadow-xl hover:scale-105 transition-transform"
                    >
                      Generate 3D QR Matrix Now
                    </button>
                  )}
                </div>

                {/* QR Code Scanner / Redeemer Box */}
                <div className="lg:col-span-6 p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-2xl space-y-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-semibold">
                      <Camera className="w-4 h-4" />
                      <span>SCAN / REDEEM FAMILY QR TOKEN</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">Scan & Connect Family Member</h3>
                    <p className="text-xs text-slate-400">
                      Scan the QR code displayed on your family member's screen or enter their 6-character token code below.
                    </p>
                  </div>

                  {/* Simulated Camera Viewfinder */}
                  <div className="relative h-44 rounded-2xl bg-slate-950 border-2 border-dashed border-cyan-500/40 flex flex-col items-center justify-center space-y-2 overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_70%)]" />
                    <Camera className="w-8 h-8 text-cyan-400 animate-pulse z-10" />
                    <span className="text-xs font-mono text-cyan-300 z-10">Camera Viewfinder Active</span>
                    <span className="text-[10px] text-slate-500 z-10">Hold phone steady over QR code</span>

                    {/* Laser line sweep */}
                    <div className="absolute inset-x-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_#06b6d4] animate-bounce top-1/2" />
                  </div>

                  <form onSubmit={handleScanQRSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Relationship to Scanned Member *
                      </label>
                      <select
                        value={scanRelationship}
                        onChange={(e) => setScanRelationship(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Mother">Mother</option>
                        <option value="Father">Father</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Child">Child</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Enter 6-Character QR Token Code *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 7X9B2K"
                        value={scanQrInput}
                        onChange={(e) => setScanQrInput(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white font-mono tracking-widest placeholder-slate-600 uppercase focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={scanLoading || !scanQrInput.trim()}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-sm rounded-xl shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {scanLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-4 h-4" />}
                      <span>Pair & Establish Location Mesh</span>
                    </button>
                  </form>

                  {scanSuccess && (
                    <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>{scanSuccess}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- TAB 2: DASHBOARD OVERVIEW ----------------- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn">
            {/* 3D Stat Grid Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 shadow-xl backdrop-blur-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Users className="w-16 h-16" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Connected Family</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{connectedMembers.length}</span>
                  <span className="text-xs text-emerald-400 font-semibold">Active Members</span>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 shadow-xl backdrop-blur-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 text-amber-400 group-hover:scale-110 transition-transform">
                  <Clock className="w-16 h-16" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Requests</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{pendingRequests.length}</span>
                  <span className="text-xs text-amber-400 font-semibold">Awaiting Acceptance</span>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 shadow-xl backdrop-blur-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 text-cyan-400 group-hover:scale-110 transition-transform">
                  <Radio className="w-16 h-16" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location Mesh</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${mySharingStatus.sharing_enabled ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'}`} />
                  <span className="text-sm font-extrabold text-white">
                    {mySharingStatus.sharing_enabled ? 'Location Active' : 'Sharing Paused'}
                  </span>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 shadow-xl backdrop-blur-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 text-red-400 group-hover:scale-110 transition-transform">
                  <ShieldAlert className="w-16 h-16" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Voice SOS Protection</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${isListeningVoice ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
                  <span className="text-sm font-extrabold text-white">
                    {isListeningVoice ? 'Listening Enabled' : 'Voice SOS Off'}
                  </span>
                </div>
              </div>
            </div>

            {/* Connected Family Members Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-500" />
                  <span>Connected Family Members</span>
                </h3>
                <button
                  onClick={() => setActiveTab('add')}
                  className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Add New Member</span>
                </button>
              </div>

              {connectedMembers.length === 0 ? (
                <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                    <Users className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-white">No Connected Family Members Yet</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Click "Add Family Member" above to invite your mother, father, spouse, or friends using Email, Direct App Push, or 3D QR Code.
                  </p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg"
                  >
                    Add Family Member Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {connectedMembers.map(member => (
                    <div
                      key={member.id}
                      className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl backdrop-blur-2xl space-y-4 relative overflow-hidden group hover:border-slate-700 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white font-extrabold text-lg flex items-center justify-center shadow-lg">
                            {member.member_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-white group-hover:text-red-400 transition-colors">
                              {member.member_name}
                            </h4>
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-300 rounded-full">
                              {member.relationship}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                          title="Remove Member Connection"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                        <div className="flex items-center justify-between">
                          <span>Status:</span>
                          <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            Sharing Active
                          </span>
                        </div>
                        {member.battery_level !== undefined && (
                          <div className="flex items-center justify-between">
                            <span>Device Battery:</span>
                            <span className="font-mono text-slate-200">{member.battery_level}%</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span>Last Location Ping:</span>
                          <span className="font-mono text-slate-300">Just Now</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setActiveTab('map');
                          }}
                          className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all"
                        >
                          <MapPin className="w-4 h-4 text-red-400" />
                          <span>View on Map</span>
                        </button>
                        <a
                          href={`tel:${member.member_phone || ''}`}
                          className="py-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-emerald-800/50 transition-all"
                        >
                          <Phone className="w-4 h-4 text-emerald-400" />
                          <span>Call Member</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Requests Section */}
            {pendingRequests.length > 0 && (
              <div className="space-y-4 border-t border-slate-800/80 pt-8">
                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <span>Pending Invitation Requests ({pendingRequests.length})</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-white">{req.target_name} ({req.relationship})</h4>
                        <p className="text-xs text-slate-400 font-mono">{req.target_email || req.target_phone}</p>
                        <span className="text-[10px] text-amber-400 font-semibold">Status: Waiting for acceptance</span>
                      </div>
                      <button
                        onClick={async () => {
                          await resendFamilyInvite(req.id);
                          alert("Invitation resent successfully!");
                        }}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-xl flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Resend</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- TAB 3: LIVE FAMILY MAP ----------------- */}
        {activeTab === 'map' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-red-500 animate-bounce" />
                  <span>Live Tactical Family Safety Map</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time encrypted GPS coordinates update automatically every 5 seconds.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {connectedMembers.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMember(m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedMember?.id === m.id
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {m.name || m.member_name}
                  </button>
                ))}
              </div>
            </div>

            {/* Map Canvas Component Container */}
            <div className="h-[600px] rounded-3xl overflow-hidden border-2 border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative">
              <FamilyMap
                members={connectedMembers}
                userLocation={userLocation}
                selectedMemberId={selectedMember?.id}
                emergencies={emergencies}
              />
            </div>
          </div>
        )}

        {/* ----------------- TAB 4: SAFETY & PRIVACY CONTROLS ----------------- */}
        {activeTab === 'privacy' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
            <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-2xl space-y-6">
              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  PRIVACY GUARANTEE
                </span>
                <h2 className="text-2xl font-black text-white">Safety & Permission Controls</h2>
                <p className="text-xs text-slate-400">
                  You retain 100% control over when your location is shared. Revoke access anytime with a single toggle.
                </p>
              </div>

              <div className="space-y-4 divide-y divide-slate-800/80">
                {/* Location Sharing Toggle */}
                <div className="pt-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-400" />
                      <span>Live Location Sharing Mesh</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Allows connected family members to view your real-time GPS location on the tactical map.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (mySharingStatus.sharing_enabled) {
                        disableLocationSharing().then(loadFamilyData);
                      } else {
                        enableLocationSharing().then(loadFamilyData);
                      }
                    }}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                      mySharingStatus.sharing_enabled
                        ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    <span>{mySharingStatus.sharing_enabled ? 'SHARING ACTIVE' : 'SHARING PAUSED'}</span>
                  </button>
                </div>

                {/* Voice SOS Trigger Toggle */}
                <div className="pt-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Mic className="w-4 h-4 text-red-400" />
                      <span>Hands-Free Voice SOS Detection</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Listens for distress keywords ("Help", "Emergency", "Save Me") to automatically trigger SOS.
                    </p>
                  </div>
                  <button
                    onClick={() => toggleVoiceDetection(!isListeningVoice)}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                      isListeningVoice
                        ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isListeningVoice ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    <span>{isListeningVoice ? 'VOICE LISTENING ON' : 'VOICE SOS DISABLED'}</span>
                  </button>
                </div>

                {/* Location History Opt-in Toggle */}
                <div className="pt-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>Location History Timeline Record</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Store historical trip routes and stop logs for family safety audit.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const updated = !historyOptIn;
                      setHistoryOptIn(updated);
                      updatePrivacySettings({
                        sharing_enabled: mySharingStatus.sharing_enabled,
                        history_opt_in: updated
                      });
                    }}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
                      historyOptIn ? 'bg-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {historyOptIn ? 'TIMELINE ENABLED' : 'TIMELINE OFF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 5: LOCATION HISTORY TIMELINE ----------------- */}
        {activeTab === 'history' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-2xl flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Location History Logs</h2>
                <p className="text-xs text-slate-400">Chronological history of recorded safety pings.</p>
              </div>

              <button
                onClick={async () => {
                  if (window.confirm("Clear all recorded location history?")) {
                    await deleteLocationHistory();
                    setHistoryItems([]);
                  }
                }}
                className="px-4 py-2 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/50 text-xs font-bold rounded-xl flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear History Logs</span>
              </button>
            </div>

            {historyItems.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs rounded-3xl bg-slate-900/40 border border-slate-800">
                No location history logs recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {historyItems.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 text-cyan-400 flex items-center justify-center font-bold">
                        #{idx + 1}
                      </div>
                      <div>
                        <span className="font-bold text-white font-mono">{item.created_at}</span>
                        <p className="text-slate-400">Lat: {item.latitude.toFixed(4)}, Lng: {item.longitude.toFixed(4)}</p>
                      </div>
                    </div>
                    {item.battery_level !== undefined && (
                      <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full font-mono text-[11px]">
                        🔋 {item.battery_level}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ----------------- TAB 6: SOS LOGS & EVIDENCE ----------------- */}
        {activeTab === 'emergency_history' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-2xl">
              <h2 className="text-2xl font-black text-white">Emergency SOS Event Audit & Evidence</h2>
              <p className="text-xs text-slate-400">Historical records of all triggered emergency alerts and captured audio/video evidence.</p>
            </div>

            {emergencyHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs rounded-3xl bg-slate-900/40 border border-slate-800">
                No historical emergency SOS alerts recorded. System safe.
              </div>
            ) : (
              <div className="space-y-4">
                {emergencyHistory.map(evt => (
                  <div key={evt.id} className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/30">
                        SOS Event #{evt.id}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{evt.created_at}</span>
                    </div>

                    <h4 className="text-base font-bold text-white">{evt.user_name}</h4>
                    <p className="text-xs text-slate-300 font-mono">
                      Trigger Method: <strong>{evt.trigger_method}</strong> | Status: <strong>{evt.status}</strong>
                    </p>

                    {evt.media_records && evt.media_records.length > 0 && (
                      <div className="pt-2 border-t border-slate-800">
                        <h5 className="text-xs font-bold text-cyan-400 mb-2">Captured Video/Audio Evidence:</h5>
                        {evt.media_records.map(m => (
                          <a
                            key={m.id}
                            href={m.media_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-cyan-300 text-xs font-bold rounded-xl hover:bg-slate-700"
                          >
                            <Video className="w-4 h-4" />
                            <span>Download Media Evidence #{m.id}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};
