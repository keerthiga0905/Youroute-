import axios from 'axios';
import { RouteAnalyzeResponse, EmergencyPOI, SavedPlace, TripHistory, User } from '../types';

const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('saferoute_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const ensureDemoSession = async (): Promise<string> => {
  let token = localStorage.getItem('saferoute_token');
  if (!token) {
    try {
      const res = await axios.post('/api/auth/demo-session');
      if (res.data && res.data.access_token) {
        token = res.data.access_token;
        localStorage.setItem('saferoute_token', token);
      }
    } catch (e) {
      console.warn("Could not obtain demo session token", e);
    }
  }
  return token || '';
};

export const analyzeRoutes = async (payload: {
  origin_name: string;
  destination_name: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  departure_time?: string;
  travel_mode: string;
  preference: string;
}): Promise<RouteAnalyzeResponse> => {
  const response = await api.post<RouteAnalyzeResponse>('/routes/analyze', payload);
  const data = response.data;

  if (data.routes && data.routes.length > 0) {
    data.routes = data.routes.map(r => ({
      ...r,
      duration_minutes: r.duration_mins,
      risk_score: r.safety_score,
      risk_label: r.safety_label,
      safety_indicator: Math.max(10, Math.min(99, Math.round(100 - r.safety_score))),
      coordinates: r.path || [],
      steps: (r.maneuvers || []).map((m, sIdx) => ({
        ...m,
        step_index: sIdx + 1,
        street_name: m.road_name,
        duration_s: m.duration_sec || 45,
        maneuver: (m.maneuver_type as any) || 'straight'
      })),
      why_recommended: r.safety_explanation?.key_factors || ["Verified street lighting", "High data confidence"],
      negative_points: r.safety_score > 50 ? ["Higher historical incident density on corridor"] : [],
      influential_factors: [
        { factor: "crime", label: "Crime Rating", weight_percent: 40 },
        { factor: "lighting", label: "Street Lights", weight_percent: 30 },
        { factor: "accidents", label: "Blackspots", weight_percent: 30 }
      ],
      segments: (r.segments || []).map(s => ({
        ...s,
        street_name: s.road_name,
        distance_m: Math.round(s.segment_length_km * 1000),
        duration_s: Math.round((s.segment_length_km / 35.0) * 3600)
      }))
    }));
  }

  return data;
};

export const getNearbyEmergencyServices = async (lat: number, lng: number): Promise<EmergencyPOI[]> => {
  const response = await api.get<EmergencyPOI[]>('/safety/nearby', { params: { lat, lng } });
  return response.data;
};

// Saved Places APIs
export const getSavedPlaces = async (): Promise<SavedPlace[]> => {
  const response = await api.get<SavedPlace[]>('/saved-places');
  return response.data;
};

export const createSavedPlace = async (data: {
  category: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
}): Promise<SavedPlace> => {
  const response = await api.post<SavedPlace>('/saved-places', data);
  return response.data;
};

export const deleteSavedPlace = async (id: number) => {
  const response = await api.delete(`/saved-places/${id}`);
  return response.data;
};

// My Trips APIs
export const getTripHistory = async (): Promise<TripHistory[]> => {
  const response = await api.get<TripHistory[]>('/trips');
  return response.data;
};

export const saveTrip = async (data: any): Promise<TripHistory> => {
  const response = await api.post<TripHistory>('/trips', data);
  return response.data;
};

export const deleteAllTrips = async () => {
  const response = await api.delete('/trips/all');
  return response.data;
};

// Auth & Settings APIs
export const registerUser = async (data: any) => {
  const response = await api.post('/auth/register', data);
  if (response.data.access_token) {
    localStorage.setItem('saferoute_token', response.data.access_token);
  }
  return response.data;
};

export const loginUser = async (data: any) => {
  const response = await api.post('/auth/login', data);
  if (response.data.access_token) {
    localStorage.setItem('saferoute_token', response.data.access_token);
  }
  return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<User>('/auth/me');
  return response.data;
};

export const updatePriority = async (preferred_priority: string): Promise<User> => {
  const response = await api.put<User>('/auth/priority', { preferred_priority });
  return response.data;
};

export const deleteUserAccount = async () => {
  const response = await api.delete('/auth/account');
  localStorage.removeItem('saferoute_token');
  return response.data;
};

export const getTrafficPrediction = async (lat: number, lng: number, district?: string) => {
  const response = await api.get('/safety/traffic-prediction', { params: { lat, lng, district } });
  return response.data;
};

// --- Family Safety API Functions ---

export const sendFamilyInvite = async (payload: {
  member_name: string;
  relationship: string;
  phone?: string;
  email: string;
}) => {
  await ensureDemoSession();
  const response = await api.post('/family/invite', payload);
  return response.data;
};

export const verifyInviteToken = async (token: string) => {
  const response = await api.get(`/family/invite/verify/${token}`);
  return response.data;
};

export const acceptFamilyInvite = async (token: string) => {
  await ensureDemoSession();
  const response = await api.post('/family/invite/accept', { token });
  return response.data;
};

export const declineFamilyInvite = async (token: string) => {
  await ensureDemoSession();
  const response = await api.post('/family/invite/decline', { token });
  return response.data;
};

export const getFamilyMembers = async () => {
  await ensureDemoSession();
  const response = await api.get('/family/members');
  return response.data;
};

export const enableLocationSharing = async () => {
  await ensureDemoSession();
  const response = await api.post('/family/location-sharing/enable');
  return response.data;
};

export const disableLocationSharing = async () => {
  await ensureDemoSession();
  const response = await api.post('/family/location-sharing/disable');
  return response.data;
};

export const sendDirectFamilyInvite = async (payload: {
  member_name: string;
  relationship: string;
  phone?: string;
  email: string;
}) => {
  await ensureDemoSession();
  const response = await api.post('/family/invite/direct', payload);
  return response.data;
};

export const generateQRConnectionToken = async () => {
  await ensureDemoSession();
  const response = await api.post('/family/invite/qr/generate');
  return response.data;
};

export const scanQRConnectionToken = async (payload: { qr_token: string; relationship: string }) => {
  await ensureDemoSession();
  const response = await api.post('/family/invite/qr/scan', payload);
  return response.data;
};

export const updateLocationPayload = async (payload: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  battery_level?: number;
}) => {
  const response = await api.post('/family/location/update', payload);
  return response.data;
};

export const getFamilyMemberLocation = async (connectionId: number) => {
  const response = await api.get(`/family/member/${connectionId}/location`);
  return response.data;
};

export const removeFamilyMember = async (connectionId: number) => {
  const response = await api.delete(`/family/member/${connectionId}`);
  return response.data;
};

export const triggerFamilyEmergency = async (payload: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  trigger_method?: 'BUTTON' | 'VOICE' | 'AUTOMATED_SAFETY_TRIGGER';
  battery_level?: number;
  message?: string;
}) => {
  const response = await api.post('/family/emergency/trigger', payload);
  return response.data;
};

export const acknowledgeEmergencyAlert = async (eventId: number) => {
  const response = await api.post(`/family/emergency/${eventId}/acknowledge`);
  return response.data;
};

export const resolveEmergencyAlert = async (eventId: number) => {
  const response = await api.post(`/family/emergency/${eventId}/resolve`);
  return response.data;
};

export const uploadEmergencyMedia = async (eventId: number, blob: Blob, mediaType: string = "AUDIO_VIDEO") => {
  const formData = new FormData();
  formData.append('file', blob, `evidence_${eventId}_${Date.now()}.webm`);
  formData.append('media_type', mediaType);
  const response = await api.post(`/family/emergency/${eventId}/media`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const getActiveEmergencies = async () => {
  const response = await api.get('/family/emergencies');
  return response.data;
};

export const getEmergencyHistoryLog = async () => {
  const response = await api.get('/family/emergency/history');
  return response.data;
};

export const deleteEmergencyEventRecord = async (eventId: number) => {
  const response = await api.delete(`/family/emergency/history/${eventId}`);
  return response.data;
};

export const updatePrivacySettings = async (payload: {
  sharing_enabled: boolean;
  permission_type?: string;
  history_opt_in?: boolean;
  voice_detection_enabled?: boolean;
  media_recording_enabled?: boolean;
}) => {
  const response = await api.post('/family/privacy/settings', payload);
  return response.data;
};

export const getLocationHistory = async () => {
  const response = await api.get('/family/location-history');
  return response.data;
};

export const deleteLocationHistory = async () => {
  const response = await api.delete('/family/location-history');
  return response.data;
};

export const updateHistoryOptIn = async (payload: { sharing_enabled: boolean; history_opt_in: boolean }) => {
  const response = await api.post('/family/location-history/opt-in', payload);
  return response.data;
};

export const resendFamilyInvite = async (inviteId: number) => {
  const response = await api.post(`/family/invite/resend/${inviteId}`);
  return response.data;
};

// --- Secure Location Sharing via Email API Functions ---
export const sendLocationShareRequestViaEmail = async (recipientEmail: string) => {
  await ensureDemoSession();
  const response = await api.post('/location/request', { recipientEmail });
  return response.data;
};

export const getLocationShareTokenDetails = async (token: string) => {
  const response = await api.get(`/location/share/${token}`);
  return response.data;
};

export const submitSharedLocationCoordinates = async (payload: {
  token: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
}) => {
  const response = await api.post('/location/share', payload);
  return response.data;
};

export const declineLocationShareRequest = async (token: string) => {
  const response = await api.post('/location/decline', { token });
  return response.data;
};

export const getUserLocationShareRequests = async () => {
  await ensureDemoSession();
  const response = await api.get('/location/requests');
  return response.data;
};

export const deleteUserLocationShareRequest = async (id: number) => {
  await ensureDemoSession();
  const response = await api.delete(`/location/requests/${id}`);
  return response.data;
};



