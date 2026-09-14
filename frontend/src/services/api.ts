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
