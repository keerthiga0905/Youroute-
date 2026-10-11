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

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('saferoute_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
          if (res.data?.access_token) {
            localStorage.setItem('saferoute_token', res.data.access_token);
            if (res.data.refresh_token) {
              localStorage.setItem('saferoute_refresh_token', res.data.refresh_token);
            }
            processQueue(null, res.data.access_token);
            originalRequest.headers['Authorization'] = `Bearer ${res.data.access_token}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          localStorage.removeItem('saferoute_token');
          localStorage.removeItem('saferoute_refresh_token');
          localStorage.removeItem('saferoute_user');
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
    }
    return Promise.reject(error);
  }
);

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
export const registerUser = async (data: {
  email: string;
  password: string;
  confirm_password?: string;
  full_name: string;
  phone?: string;
  agree_to_terms?: boolean;
}) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const verifyEmail = async (data: { email: string; otp: string }) => {
  const response = await api.post('/auth/verify-email', data);
  if (response.data.access_token) {
    localStorage.setItem('saferoute_token', response.data.access_token);
    if (response.data.refresh_token) {
      localStorage.setItem('saferoute_refresh_token', response.data.refresh_token);
    }
    if (response.data.user) {
      localStorage.setItem('saferoute_user', JSON.stringify(response.data.user));
    }
  }
  return response.data;
};

export const resendVerification = async (email: string) => {
  const response = await api.post('/auth/resend-verification', { email });
  return response.data;
};

export const loginUser = async (data: {
  email: string;
  password: string;
  remember_me?: boolean;
}) => {
  const response = await api.post('/auth/login', data);
  if (response.data.access_token) {
    localStorage.setItem('saferoute_token', response.data.access_token);
    if (response.data.refresh_token) {
      localStorage.setItem('saferoute_refresh_token', response.data.refresh_token);
    }
    if (response.data.user) {
      localStorage.setItem('saferoute_user', JSON.stringify(response.data.user));
    }
  }
  return response.data;
};

export const logoutUser = async () => {
  try {
    await api.post('/auth/logout');
  } catch (e) {
    // ignore
  } finally {
    localStorage.removeItem('saferoute_token');
    localStorage.removeItem('saferoute_refresh_token');
    localStorage.removeItem('saferoute_user');
  }
};

export const logoutAllSessions = async () => {
  try {
    await api.post('/auth/logout-all');
  } catch (e) {
    // ignore
  } finally {
    localStorage.removeItem('saferoute_token');
    localStorage.removeItem('saferoute_refresh_token');
    localStorage.removeItem('saferoute_user');
  }
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<User>('/auth/me');
  localStorage.setItem('saferoute_user', JSON.stringify(response.data));
  return response.data;
};

export const getStoredUser = (): User | null => {
  const raw = localStorage.getItem('saferoute_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const forgotPassword = async (email: string) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (data: {
  token: string;
  new_password: string;
  confirm_password?: string;
}) => {
  const response = await api.post('/auth/reset-password', data);
  return response.data;
};

export const getUserSessions = async () => {
  const response = await api.get('/auth/sessions');
  return response.data;
};

export const revokeSession = async (sessionId: string) => {
  const response = await api.delete(`/auth/sessions/${sessionId}`);
  return response.data;
};

export const updatePriority = async (preferred_priority: string): Promise<User> => {
  const response = await api.put<User>('/auth/priority', { preferred_priority });
  localStorage.setItem('saferoute_user', JSON.stringify(response.data));
  return response.data;
};

export const deleteUserAccount = async () => {
  const response = await api.delete('/auth/account');
  localStorage.removeItem('saferoute_token');
  localStorage.removeItem('saferoute_refresh_token');
  localStorage.removeItem('saferoute_user');
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

// --- Family Group Chat API Functions ---
export const sendFamilyChatMessage = async (payload: {
  content: string;
  message_type?: 'TEXT' | 'LOCATION_SHARE' | 'SOS_ALERT';
  location_lat?: number;
  location_lng?: number;
}) => {
  await ensureDemoSession();
  const response = await api.post('/family/chat/messages', payload);
  return response.data;
};

export const getFamilyChatMessages = async (limit: number = 50, offset: number = 0) => {
  await ensureDemoSession();
  const response = await api.get(`/family/chat/messages?limit=${limit}&offset=${offset}`);
  return response.data;
};

export const markFamilyChatMessagesRead = async () => {
  await ensureDemoSession();
  const response = await api.post('/family/chat/messages/mark-read');
  return response.data;
};

// --- QR Verification API Function ---
export const verifyQRConnectionToken = async (token: string) => {
  await ensureDemoSession();
  const response = await api.get(`/family/invite/qr/verify/${token}`);
  return response.data;
};

// --- Web Push Notification API Functions ---
export const subscribePushNotification = async (payload: { endpoint: string; p256dh: string; auth: string }) => {
  await ensureDemoSession();
  const response = await api.post('/family/push/subscribe', payload);
  return response.data;
};

export const unsubscribePushNotification = async (endpoint: string) => {
  await ensureDemoSession();
  const response = await api.delete(`/family/push/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`);
  return response.data;
};
