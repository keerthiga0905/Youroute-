import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { generateQRConnectionToken, scanQRConnectionToken, verifyQRConnectionToken } from '../services/api';
import { FamilyQRInviteResponse, FamilyQRVerification } from '../types';
import {
  QrCode, Camera, CameraOff, Upload, RefreshCw, Copy, Check, ShieldCheck,
  UserCheck, AlertTriangle, Sparkles, X, Loader2, Smartphone, ArrowRight
} from 'lucide-react';

interface FamilyQRManagerProps {
  onConnectionEstablished?: () => void;
}

export const FamilyQRManager: React.FC<FamilyQRManagerProps> = ({ onConnectionEstablished }) => {
  // Mode: 'my_qr' or 'scan_qr'
  const [activeSubTab, setActiveSubTab] = useState<'my_qr' | 'scan_qr'>('my_qr');

  // --- 1. My QR Code State ---
  const [qrInvite, setQrInvite] = useState<FamilyQRInviteResponse | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // --- 2. Camera Viewfinder State ---
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // --- 3. Manual Token / Upload / Scanned Verification State ---
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [verifiedTokenData, setVerifiedTokenData] = useState<FamilyQRVerification | null>(null);
  const [scannedRawToken, setScannedRawToken] = useState<string | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState('Father');
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Fetch or regenerate QR code
  const handleGenerateQR = async () => {
    try {
      setQrLoading(true);
      const data = await generateQRConnectionToken();
      setQrInvite(data);
    } catch (err: any) {
      console.error('Failed to generate QR token:', err);
    } finally {
      setQrLoading(false);
    }
  };

  useEffect(() => {
    handleGenerateQR();
  }, []);

  // Render QR Code onto canvas
  useEffect(() => {
    if (!qrInvite || !qrCanvasRef.current) return;

    QRCode.toCanvas(
      qrCanvasRef.current,
      qrInvite.qr_token,
      {
        width: 240,
        margin: 2,
        color: {
          dark: '#071C14',
          light: '#F4D06F'
        }
      },
      (error) => {
        if (error) console.error('QR rendering error:', error);
      }
    );
  }, [qrInvite]);

  // Start Camera Viewfinder
  const startCamera = async () => {
    setCameraError(null);
    setConnectError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        startScanLoop();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Camera access denied or unavailable. You can upload an image or type the token below.');
      setIsCameraActive(false);
    }
  };

  // Stop Camera Viewfinder
  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Frame Scanning Loop using jsQR
  const startScanLoop = () => {
    const scanFrame = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data && code.data.trim()) {
            const foundToken = code.data.trim();
            handleProcessScannedToken(foundToken);
            stopCamera();
            return;
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // Clean up camera on unmount or tab change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Process and verify scanned/entered token
  const handleProcessScannedToken = async (token: string) => {
    setConnectError(null);
    setConnectSuccess(null);
    setScannedRawToken(token);

    try {
      setConnectLoading(true);
      const verified = await verifyQRConnectionToken(token);
      setVerifiedTokenData(verified);
    } catch (err: any) {
      console.error('Failed to verify token:', err);
      setConnectError(err.response?.data?.detail || 'Invalid or expired QR connection token.');
      setVerifiedTokenData(null);
    } finally {
      setConnectLoading(false);
    }
  };

  // Handle Image File Upload for QR Decoding
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleProcessScannedToken(code.data.trim());
        } else {
          setConnectError('No valid QR code was detected in the uploaded image. Please try another image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Confirm and Finalize Connection
  const handleConfirmConnection = async () => {
    if (!scannedRawToken) return;

    setConnectLoading(true);
    setConnectError(null);

    try {
      const res = await scanQRConnectionToken({
        qr_token: scannedRawToken,
        relationship: selectedRelationship
      });

      setConnectSuccess(res.message || 'Family member successfully connected to your mesh network!');
      setVerifiedTokenData(null);
      setScannedRawToken(null);
      setManualTokenInput('');

      if (onConnectionEstablished) {
        onConnectionEstablished();
      }
    } catch (err: any) {
      console.error('Failed to connect accounts:', err);
      setConnectError(err.response?.data?.detail || 'Connection failed. The token may be expired or already used.');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (qrInvite?.qr_token) {
      navigator.clipboard.writeText(qrInvite.qr_token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <div className="bg-[#071C14] border border-[#D4AF37]/30 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
      {/* Sub-tabs header */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex bg-[#0B2A1E] p-1.5 rounded-2xl border border-[#D4AF37]/30 shadow-inner">
          <button
            onClick={() => {
              setActiveSubTab('my_qr');
              stopCamera();
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeSubTab === 'my_qr'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] shadow-lg'
                : 'text-emerald-300/70 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>My Family QR Code</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('scan_qr');
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeSubTab === 'scan_qr'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] shadow-lg'
                : 'text-emerald-300/70 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Scan Another Member's QR</span>
          </button>
        </div>
      </div>

      {/* --- TAB 1: MY QR CODE --- */}
      {activeSubTab === 'my_qr' && (
        <div className="flex flex-col items-center text-center max-w-lg mx-auto">
          <div className="p-4 bg-gradient-to-br from-[#0B2A1E] to-[#104834] border-2 border-[#D4AF37]/50 rounded-3xl shadow-2xl mb-6 relative">
            <div className="p-3 bg-[#F4D06F] rounded-2xl shadow-inner">
              <canvas ref={qrCanvasRef} className="rounded-xl shadow-md" />
            </div>

            {qrLoading && (
              <div className="absolute inset-0 bg-[#071C14]/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
              </div>
            )}
          </div>

          <h4 className="text-xl font-black text-white mb-2 flex items-center gap-2">
            <span>{qrInvite?.requester_name || 'Your Account'}</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </h4>

          <p className="text-xs text-emerald-200/70 max-w-md mb-6 leading-relaxed">
            Have your family member (e.g. Father, Mother, Daughter, Son) scan this QR code with their device camera to connect securely to your Family Safety Mesh.
          </p>

          <div className="w-full bg-[#0B2A1E] border border-[#D4AF37]/20 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <div className="text-left overflow-hidden mr-3">
              <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider block">Connection Token</span>
              <span className="text-xs text-white font-mono truncate block">{qrInvite?.qr_token || 'Generating...'}</span>
            </div>

            <button
              onClick={handleCopyToken}
              className="px-3 py-2 bg-[#071C14] hover:bg-[#104834] text-[#D4AF37] border border-[#D4AF37]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm shrink-0"
            >
              {copiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedToken ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <button
            onClick={handleGenerateQR}
            disabled={qrLoading}
            className="px-5 py-2.5 bg-[#0B2A1E] hover:bg-[#104834] text-[#D4AF37] border border-[#D4AF37]/50 rounded-2xl font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${qrLoading ? 'animate-spin' : ''}`} />
            <span>Regenerate Secure Token (Expires 15m)</span>
          </button>
        </div>
      )}

      {/* --- TAB 2: SCAN QR CODE --- */}
      {activeSubTab === 'scan_qr' && (
        <div className="max-w-xl mx-auto">
          {/* Camera Viewfinder Box */}
          <div className="relative w-full aspect-video sm:h-[300px] bg-black rounded-3xl overflow-hidden border-2 border-[#D4AF37]/40 shadow-2xl flex items-center justify-center mb-6">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
            />

            {/* Viewfinder Target Graphic & Laser */}
            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#D4AF37] rounded-tl-xl"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#D4AF37] rounded-tr-xl"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#D4AF37] rounded-bl-xl"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#D4AF37] rounded-br-xl"></div>
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse absolute top-1/2"></div>
                </div>
              </div>
            )}

            {!isCameraActive && (
              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-[#0B2A1E] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] mx-auto mb-3 shadow-xl">
                  <Camera className="w-8 h-8 opacity-70" />
                </div>
                <h5 className="text-white font-bold text-sm mb-1">Live Camera Viewfinder</h5>
                <p className="text-xs text-emerald-200/60 max-w-xs mb-4">
                  Point your camera at a family member's QR code to scan instantly.
                </p>
                <button
                  onClick={startCamera}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] rounded-xl font-black text-xs flex items-center gap-2 mx-auto shadow-lg hover:brightness-110 active:scale-95 transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera Viewfinder</span>
                </button>
              </div>
            )}

            {isCameraActive && (
              <button
                onClick={stopCamera}
                className="absolute top-3 right-3 px-3 py-1.5 bg-black/60 hover:bg-black/90 text-white rounded-xl text-xs font-bold backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition active:scale-95"
              >
                <CameraOff className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            )}
          </div>

          {cameraError && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-2xl text-amber-200 text-xs mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Alternative: Upload QR Image or Enter Token Manually */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <label className="p-4 bg-[#0B2A1E] border border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition group shadow-md">
              <Upload className="w-6 h-6 text-[#D4AF37] group-hover:scale-110 transition mb-2" />
              <span className="text-xs font-bold text-white">Upload QR Image</span>
              <span className="text-[10px] text-emerald-300/60">From photo album / files</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            <div className="p-4 bg-[#0B2A1E] border border-[#D4AF37]/30 rounded-2xl flex flex-col justify-between shadow-md">
              <div>
                <span className="text-xs font-bold text-white block mb-1">Enter Token Manually</span>
                <input
                  type="text"
                  value={manualTokenInput}
                  onChange={(e) => setManualTokenInput(e.target.value)}
                  placeholder="Paste QR_..."
                  className="w-full bg-[#071C14] border border-[#D4AF37]/30 rounded-xl px-3 py-1.5 text-xs text-white placeholder-emerald-400/50 mb-2 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <button
                onClick={() => handleProcessScannedToken(manualTokenInput.trim())}
                disabled={!manualTokenInput.trim() || connectLoading}
                className="w-full py-1.5 bg-[#D4AF37] hover:bg-[#F4D06F] text-[#071C14] rounded-xl text-xs font-black transition disabled:opacity-40"
              >
                Verify Token
              </button>
            </div>
          </div>

          {/* Verified Member Confirmation Card */}
          {verifiedTokenData && (
            <div className="p-6 bg-gradient-to-br from-[#0B2A1E] to-[#124b37] border-2 border-[#D4AF37] rounded-3xl shadow-2xl animate-fade-in mb-6">
              <div className="flex items-center gap-2 text-[#D4AF37] font-black text-xs uppercase tracking-wider mb-3">
                <Sparkles className="w-4 h-4" />
                <span>Verified Family Member Detected</span>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-[#071C14] border-2 border-[#D4AF37] flex items-center justify-center text-2xl shadow-lg">
                  {selectedRelationship.toLowerCase().includes('father') ? '👨' :
                   selectedRelationship.toLowerCase().includes('mother') ? '👩' :
                   selectedRelationship.toLowerCase().includes('daughter') ? '👧' :
                   selectedRelationship.toLowerCase().includes('son') ? '👦' : '🧑'}
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">{verifiedTokenData.requester_name}</h4>
                  <p className="text-xs text-emerald-200/80">{verifiedTokenData.requester_email}</p>
                </div>
              </div>

              <div className="mb-5">
                <label className="text-xs font-bold text-[#D4AF37] block mb-1.5">
                  Specify Relationship with this Member:
                </label>
                <select
                  value={selectedRelationship}
                  onChange={(e) => setSelectedRelationship(e.target.value)}
                  className="w-full bg-[#071C14] border border-[#D4AF37]/40 rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Son">Son</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Friend">Friend / Relative</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleConfirmConnection}
                  disabled={connectLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] hover:brightness-110 active:scale-95 text-[#071C14] rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition"
                >
                  {connectLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>Confirm & Connect to Family Mesh</span>
                </button>

                <button
                  onClick={() => {
                    setVerifiedTokenData(null);
                    setScannedRawToken(null);
                  }}
                  className="px-4 py-3 bg-[#071C14] hover:bg-black/60 text-white rounded-2xl text-xs font-bold transition border border-white/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Success / Error alerts */}
          {connectSuccess && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-500 rounded-2xl text-emerald-200 text-xs mb-4 flex items-center gap-2.5 shadow-lg">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{connectSuccess}</span>
            </div>
          )}

          {connectError && (
            <div className="p-4 bg-red-950/60 border border-red-500 rounded-2xl text-red-200 text-xs mb-4 flex items-center gap-2.5 shadow-lg">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{connectError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
