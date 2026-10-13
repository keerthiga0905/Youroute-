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
  user_id?: string;
  public_user_id?: string;
  email: string;
  full_name: string;
  phone?: string;
  is_verified?: boolean;
  preferred_priority: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  session_id: string;
  user: User;
}

export interface UserSessionItem {
  session_id: string;
  device_info: string;
  ip_address?: string;
  created_at: string;
  last_used_at: string;
  is_current: boolean;
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

// --- Family Safety Interfaces ---

export interface FamilyInvitePayload {
  member_name: string;
  relationship: string;
  phone?: string;
  email: string;
}

export interface FamilyInviteResponse {
  id: number;
  member_name: string;
  relationship: string;
  phone?: string;
  email: string;
  secure_token: string;
  invite_url: string;
  expires_at: string;
  created_at: string;
  status: string;
}

export interface InviteDetailsResponse {
  token: string;
  requester_name: string;
  member_name: string;
  relationship: string;
  email: string;
  expires_at: string;
  status: string;
}

export interface ConnectedFamilyMember {
  id: number;
  connection_id?: number;
  member_user_id?: number;
  name: string;
  member_name?: string;
  relationship: string;
  email: string;
  phone?: string;
  member_phone?: string;
  profile_image?: string;
  status: 'ACTIVE' | 'PENDING' | 'DECLINED' | 'REVOKED';
  sharing_enabled: boolean;
  location_sharing_active?: boolean;
  permission_type?: 'WHILE_USING' | 'ALWAYS' | 'PAUSED' | 'DISABLED';
  location_status: 'Live' | 'Stale' | 'Offline' | 'Sharing Disabled';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  speed?: number;
  battery_level?: number;
  last_updated?: string;
  sharing_started_at?: string;
  emergency_status?: string;
}

export interface PendingFamilyRequest {
  id: number;
  name: string;
  target_name?: string;
  relationship: string;
  email: string;
  target_email?: string;
  phone?: string;
  target_phone?: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export interface FamilyMembersData {
  connected_members: ConnectedFamilyMember[];
  pending_requests: PendingFamilyRequest[];
  my_sharing_status: {
    sharing_enabled: boolean;
    permission_type?: string;
    history_opt_in: boolean;
    voice_detection_enabled?: boolean;
    media_recording_enabled?: boolean;
    last_updated?: string;
    latitude?: number;
    longitude?: number;
    battery_level?: number;
  };
}

export interface EmergencyAcknowledgement {
  id: number;
  name: string;
  acknowledged_at?: string;
}

export interface EmergencyMediaItem {
  id: number;
  type: string;
  url: string;
  media_url?: string;
}

export interface FamilyEmergencyAlert {
  id: number;
  user_id: number;
  user_name: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  trigger_method?: 'BUTTON' | 'VOICE' | 'AUTOMATED_SAFETY_TRIGGER';
  status: 'NORMAL' | 'SOS_TRIGGERED' | 'LOCATION_CAPTURED' | 'FAMILY_NOTIFIED' | 'EMERGENCY_ACTIVE' | 'FAMILY_ACKNOWLEDGED' | 'EMERGENCY_RESOLVED' | 'EMERGENCY_CANCELLED';
  message: string;
  battery_level?: number;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  acknowledged_by?: EmergencyAcknowledgement[];
  media_recordings?: EmergencyMediaItem[];
  media_records?: EmergencyMediaItem[];
  live_camera_frame?: string;
  live_camera_time?: string;
}

export interface FamilyQRInviteResponse {
  qr_token: string;
  expires_at: string;
  requester_name: string;
  requester_email: string;
}

export interface LocationHistoryItem {
  id: number;
  latitude: number;
  longitude: number;
  place_name?: string;
  timestamp: string;
  created_at?: string;
  battery_level?: number;
}

export interface FamilyChatMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  message_type: 'TEXT' | 'LOCATION_SHARE' | 'SOS_ALERT';
  location_lat?: number;
  location_lng?: number;
  created_at: string;
  is_read: boolean;
}

export interface FamilyQRVerification {
  valid: boolean;
  requester_id: number;
  requester_name: string;
  requester_email: string;
  profile_image?: string;
  expires_at: string;
  status?: string;
}
