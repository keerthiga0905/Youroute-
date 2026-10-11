import React, { useState, useEffect, useRef } from 'react';
import { FamilyChatMessage, ConnectedFamilyMember } from '../types';
import { sendFamilyChatMessage, getFamilyChatMessages, markFamilyChatMessagesRead } from '../services/api';
import { Send, MapPin, AlertOctagon, MessageSquare, Clock, Check, CheckCheck, Navigation, Sparkles } from 'lucide-react';

interface FamilyChatProps {
  currentUserId?: number | null;
  currentUserName?: string;
  connectedMembers: ConnectedFamilyMember[];
  userLocation?: { lat: number; lng: number } | null;
  incomingWebSocketMessage?: any;
  onViewLocationOnMap?: (lat: number, lng: number, label: string) => void;
}

export const FamilyChat: React.FC<FamilyChatProps> = ({
  currentUserId,
  currentUserName = 'You',
  connectedMembers,
  userLocation,
  incomingWebSocketMessage,
  onViewLocationOnMap
}) => {
  const [messages, setMessages] = useState<FamilyChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load persistent chat history from backend SQLite database
  const loadChatHistory = async () => {
    try {
      setLoading(true);
      const data = await getFamilyChatMessages(100, 0);
      setMessages(data.messages || []);
      await markFamilyChatMessagesRead();
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChatHistory();
  }, []);

  // Listen to live WebSocket message events
  useEffect(() => {
    if (!incomingWebSocketMessage) return;

    if (incomingWebSocketMessage.type === 'CHAT_MESSAGE' && incomingWebSocketMessage.message) {
      const newMsg: FamilyChatMessage = incomingWebSocketMessage.message;
      setMessages(prev => {
        // Prevent duplicate appending if already in state
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Gentle audio notification tone
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.25);
        }
      } catch (e) {}

      // Mark read
      markFamilyChatMessagesRead().catch(() => {});
    }
  }, [incomingWebSocketMessage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const created = await sendFamilyChatMessage({
        content: textToSend,
        message_type: 'TEXT'
      });
      // In case WebSocket broadcast is delayed, add immediately
      setMessages(prev => {
        if (prev.some(m => m.id === created.id)) return prev;
        return [...prev, created];
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      setInputText(textToSend); // Restore on error
    } finally {
      setSending(false);
    }
  };

  const handleShareCurrentLocation = async () => {
    if (!userLocation) {
      alert('Your current GPS location is not available yet. Please ensure location permissions are granted.');
      return;
    }

    setSending(true);
    try {
      const created = await sendFamilyChatMessage({
        content: `📍 Shared live GPS location: (${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)})`,
        message_type: 'LOCATION_SHARE',
        location_lat: userLocation.lat,
        location_lng: userLocation.lng
      });
      setMessages(prev => {
        if (prev.some(m => m.id === created.id)) return prev;
        return [...prev, created];
      });
    } catch (err) {
      console.error('Failed to share location in chat:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSendSOSNotice = async () => {
    setSending(true);
    try {
      const created = await sendFamilyChatMessage({
        content: `🚨 EMERGENCY SOS ALERT: I need immediate family assistance!`,
        message_type: 'SOS_ALERT',
        location_lat: userLocation?.lat,
        location_lng: userLocation?.lng
      });
      setMessages(prev => {
        if (prev.some(m => m.id === created.id)) return prev;
        return [...prev, created];
      });
    } catch (err) {
      console.error('Failed to send SOS chat notification:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[650px] bg-[#071C14] border border-[#D4AF37]/30 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-[#0B2A1E]/80 backdrop-blur-md border-b border-[#D4AF37]/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0B2A1E] to-[#104834] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] shadow-lg">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base flex items-center gap-2">
              Family Mesh Group Chat
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </h3>
            <p className="text-xs text-[#D4AF37]/80">
              {connectedMembers.length} active family member{connectedMembers.length === 1 ? '' : 's'} connected
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {userLocation && (
            <button
              onClick={handleShareCurrentLocation}
              disabled={sending}
              className="px-3 py-1.5 bg-[#0B2A1E] hover:bg-[#104834] text-[#D4AF37] border border-[#D4AF37]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              title="Pin your current GPS coordinates into the group chat"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Share Location</span>
            </button>
          )}

          <button
            onClick={handleSendSOSNotice}
            disabled={sending}
            className="px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-red-900/30"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Alert Chat</span>
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-[#071C14] via-[#092319] to-[#071C14]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-8 h-8 border-3 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-[#D4AF37]/70 font-medium">Loading family conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
            <div className="w-16 h-16 rounded-3xl bg-[#0B2A1E] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mb-4 shadow-xl">
              <MessageSquare className="w-8 h-8 opacity-70" />
            </div>
            <h4 className="text-white font-bold text-base mb-1">Family Group Chat Active</h4>
            <p className="text-xs text-emerald-200/70 max-w-sm mb-4">
              Send a message or pin your GPS coordinates. All connected family members receive updates instantaneously.
            </p>
            {userLocation && (
              <button
                onClick={handleShareCurrentLocation}
                className="px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] text-[#071C14] rounded-xl text-xs font-black flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition"
              >
                <MapPin className="w-4 h-4" />
                <span>Share My Current Location</span>
              </button>
            )}
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = currentUserId ? msg.sender_id === currentUserId : msg.sender_name === currentUserName;
            const isSOS = msg.message_type === 'SOS_ALERT';
            const isLocation = msg.message_type === 'LOCATION_SHARE';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Sender Name & Timestamp */}
                <div className={`flex items-center gap-2 text-[10px] text-emerald-300/60 mb-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className="font-bold text-[#D4AF37]">{isMe ? 'You' : msg.sender_name}</span>
                  <span>•</span>
                  <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[78%] rounded-2xl p-3.5 shadow-md ${
                    isSOS
                      ? 'bg-gradient-to-r from-red-950 via-red-900 to-red-950 border-2 border-red-500 text-white animate-pulse'
                      : isMe
                      ? 'bg-gradient-to-br from-[#0B2A1E] to-[#124b37] border border-[#D4AF37]/50 text-white rounded-tr-none'
                      : 'bg-[#0A261B] border border-emerald-500/30 text-emerald-100 rounded-tl-none'
                  }`}
                >
                  {isSOS && (
                    <div className="flex items-center gap-1.5 text-red-300 font-black text-xs mb-1 uppercase tracking-wider">
                      <AlertOctagon className="w-4 h-4 text-red-400" />
                      <span>EMERGENCY SOS BROADCAST</span>
                    </div>
                  )}

                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>

                  {/* Location Action Link */}
                  {isLocation && msg.location_lat && msg.location_lng && onViewLocationOnMap && (
                    <div className="mt-2.5 pt-2 border-t border-[#D4AF37]/20 flex items-center justify-between">
                      <span className="text-[11px] text-[#D4AF37] font-mono">
                        {msg.location_lat.toFixed(4)}, {msg.location_lng.toFixed(4)}
                      </span>
                      <button
                        onClick={() => onViewLocationOnMap(msg.location_lat!, msg.location_lng!, msg.sender_name)}
                        className="px-2.5 py-1 bg-[#D4AF37] hover:bg-[#F4D06F] text-[#071C14] rounded-lg text-[11px] font-black flex items-center gap-1 transition shadow-sm active:scale-95"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>View on Map</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSendMessage} className="p-4 bg-[#0B2A1E]/90 border-t border-[#D4AF37]/20 flex items-center gap-3">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a secure message to your family..."
          className="flex-1 bg-[#071C14] border border-[#D4AF37]/30 rounded-2xl px-4 py-3 text-sm text-white placeholder-emerald-400/50 focus:outline-none focus:border-[#D4AF37] transition shadow-inner"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="px-5 py-3 bg-gradient-to-r from-[#D4AF37] to-[#F4D06F] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-[#071C14] rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg transition"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
