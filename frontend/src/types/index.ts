export interface Coordinate {
  lat: number;
  lng: number;
}

export interface FactorImpact {
  factor: string;
  label: string;
  weight_percent: number;
}

export interface SegmentDetail {
  segment_index: number;
  road_name: string;
  street_name?: string;
  start: Coordinate;
  end: Coordinate;
  segment_length_km: number;
  distance_m?: number;
  duration_s?: number;
  risk_score: number;
  risk_level: 'lower' | 'moderate' | 'elevated' | 'higher';
  risk_label: string;
  lighting_status: string;
  data_confidence: string;
  reasons: string[];
}

export interface ManeuverStep {
  step_index?: number;
  instruction: string;
  road_name: string;
  street_name?: string;
  distance_m: number;
  duration_sec?: number;
  duration_s?: number;
  maneuver_type?: string;
  maneuver?: 'depart' | 'straight' | 'turn-left' | 'turn-right' | 'slight-left' | 'slight-right' | 'roundabout' | 'arrive';
  location: Coordinate;
}

export type NavigationStep = ManeuverStep;

export interface SafetyExplanation {
  crime_rate_district?: string;
  lighting_data?: string;
  accident_data?: string;
  key_factors?: string[];
}

export interface RouteOptionConsumer {
  id: string;
  name: string;
  rank_order: number;
  distance_km: number;
  duration_mins: number;
  duration_minutes?: number;
  badge_text: string;
  badge_color: 'green' | 'yellow' | 'orange' | 'red';
  color_code: string;
  distance_badge_text?: string;
  distance_color_code?: string;
  safety_score: number;
  risk_score?: number;
  safety_label: string;
  risk_level: 'lower' | 'moderate' | 'elevated' | 'higher';
  risk_label?: string;
  safety_color_code?: string;
  safety_indicator?: number;
  confidence_level: 'High' | 'Medium' | 'Low';
  path: Coordinate[];
  coordinates?: Coordinate[];
  segments: SegmentDetail[];
  maneuvers: ManeuverStep[];
  steps?: ManeuverStep[];
  trade_off_text?: string;
  why_recommended?: string[];
  negative_points?: string[];
  influential_factors?: FactorImpact[];
  safety_explanation?: SafetyExplanation;
}

export interface RouteAnalyzeResponse {
  success: boolean;
  error?: string;
  origin?: { name: string; lat: number; lng: number };
  destination?: { name: string; lat: number; lng: number };
  routes: RouteOptionConsumer[];
  total_routes_discovered?: number;
  data_sources?: string[];
}

export interface EmergencyPOI {
  id: number;
  name: string;
  category: 'police' | 'hospital' | 'emergency_services';
  lat: number;
  lng: number;
  phone: string;
  address: string;
  distance_km: number;
  estimated_time_mins: number;
}

export interface SavedPlace {
  id: number;
  category: 'home' | 'work' | 'favorite';
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface TripHistory {
  id: number;
  origin_name: string;
  destination_name: string;
  travel_mode: string;
  preference: string;
  duration_mins: number;
  distance_km: number;
  risk_level: string;
  safety_score: number;
  selected_route_name: string;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  preferred_priority: string;
  created_at: string;
}

export interface SafetyIncidentItem {
  id: number;
  category: string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  location: string;
  district: string;
  city?: string;
  date_reported?: string;
  source_name: string;
  source_url?: string;
  verification_status: string;
  severity: string;
  photo_url?: string;
  photo_source?: string;
  is_demo?: boolean;
}

export interface AreaPhotoItem {
  id: number;
  image_url: string;
  location: string;
  category: string;
  date: string;
  source: string;
  license: string;
  caption: string;
  district: string;
  latitude: number;
  longitude: number;
}

