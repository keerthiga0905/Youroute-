from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: str
    password: str
    confirm_password: Optional[str] = None
    full_name: str
    phone: Optional[str] = None
    agree_to_terms: Optional[bool] = True

class UserVerifyEmail(BaseModel):
    email: str
    otp: str

class ResendVerificationRequest(BaseModel):
    email: str

class UserLogin(BaseModel):
    email: str
    password: str
    remember_me: Optional[bool] = False

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: Optional[str] = None

class UserUpdatePriority(BaseModel):
    preferred_priority: str # fastest, balanced, lower_risk

class UserResponse(BaseModel):
    id: int
    user_id: Optional[str] = None
    public_user_id: Optional[str] = None
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_verified: bool = False
    preferred_priority: str = "balanced"
    created_at: datetime

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 900
    session_id: str
    user: UserResponse

class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: Optional[int] = 900
    session_id: Optional[str] = None
    user: UserResponse

class SessionResponse(BaseModel):
    session_id: str
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    last_used_at: datetime
    is_current: bool = False

    class Config:
        from_attributes = True

# --- Location & Route Request Schemas ---
class Coordinate(BaseModel):
    lat: float
    lng: float

class RouteAnalyzeRequest(BaseModel):
    origin_name: str
    destination_name: str
    origin: Coordinate
    destination: Coordinate
    departure_time: Optional[str] = None
    travel_mode: str = "driving"
    preference: str = "balanced"

# --- Weather Schema ---
class WeatherSummary(BaseModel):
    condition: str
    temperature: float
    rainfall: float
    visibility: float
    user_note: Optional[str] = None

# --- Multi-Route Safety Schemas ---
class FactorImpact(BaseModel):
    factor: str
    label: str
    weight_percent: float

class SegmentDetail(BaseModel):
    segment_index: int
    road_name: str
    street_name: Optional[str] = None
    start: Coordinate
    end: Coordinate
    segment_length_km: float
    distance_m: Optional[float] = 0.0
    duration_s: Optional[float] = 0.0
    risk_score: float
    risk_level: str
    risk_label: str
    lighting_status: Optional[str] = "Good"
    data_confidence: Optional[str] = "High"
    reasons: List[str]

class ManeuverStep(BaseModel):
    step_index: Optional[int] = 1
    instruction: str
    road_name: str
    street_name: Optional[str] = None
    distance_m: float
    duration_sec: Optional[float] = 0.0
    duration_s: Optional[float] = 0.0
    maneuver_type: Optional[str] = "straight"
    location: Coordinate

class RouteOptionConsumer(BaseModel):
    id: str
    name: str
    rank_order: int
    distance_km: float
    duration_mins: float
    duration_minutes: Optional[float] = None
    badge_text: str
    badge_color: str
    color_code: str
    safety_score: float
    risk_score: Optional[float] = None
    safety_label: str
    risk_level: str
    risk_label: Optional[str] = None
    safety_indicator: Optional[float] = None
    confidence_level: str
    path: List[Coordinate]
    coordinates: Optional[List[Coordinate]] = None
    segments: List[SegmentDetail]
    maneuvers: Optional[List[ManeuverStep]] = []
    steps: Optional[List[ManeuverStep]] = []
    trade_off_text: Optional[str] = None
    why_recommended: Optional[List[str]] = []
    negative_points: Optional[List[str]] = []
    influential_factors: Optional[List[FactorImpact]] = []
    safety_explanation: Optional[Dict[str, Any]] = {}

class RouteAnalyzeResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    origin: Optional[Dict[str, Any]] = None
    destination: Optional[Dict[str, Any]] = None
    routes: List[RouteOptionConsumer] = []
    total_routes_discovered: Optional[int] = 0
    route_count_note: Optional[str] = None
    data_sources: Optional[List[str]] = []

# --- Reroute Schema ---
class RerouteRequest(BaseModel):
    current_location: Coordinate
    destination: Coordinate
    destination_name: str

# --- Emergency Services ---
class EmergencyPOI(BaseModel):
    id: int
    name: str
    category: str
    lat: float
    lng: float
    phone: str
    address: str
    distance_km: float
    estimated_time_mins: float

# --- Saved Places & Trip History ---
class SavedPlaceCreate(BaseModel):
    category: str
    label: str
    address: str
    latitude: float
    longitude: float

class SavedPlaceResponse(BaseModel):
    id: int
    category: str
    label: str
    address: str
    latitude: float
    longitude: float
    created_at: datetime

    class Config:
        from_attributes = True

class TripHistoryCreate(BaseModel):
    origin_name: str
    destination_name: str
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    travel_mode: str
    preference: str
    duration_mins: float
    distance_km: float
    risk_level: str
    safety_score: float
    selected_route_name: str

class TripHistoryResponse(BaseModel):
    id: int
    origin_name: str
    destination_name: str
    travel_mode: str
    preference: str
    duration_mins: float
    distance_km: float
    risk_level: str
    safety_score: float
    selected_route_name: str
    created_at: datetime

    class Config:
        from_attributes = True

class ModelMetricsResponse(BaseModel):
    model_type: str
    total_samples: int
    test_samples: int
    features: List[str]
    metrics: Dict[str, float]
    models_comparison: List[Dict[str, Any]]
    feature_importance: List[Dict[str, Any]]

# --- Family Safety Schemas ---
class FamilyInviteCreate(BaseModel):
    member_name: str
    relationship: str
    phone: Optional[str] = None
    email: str

class FamilyInviteResponse(BaseModel):
    id: int
    member_name: str
    relationship: str
    phone: Optional[str] = None
    email: str
    secure_token: str
    invite_url: str
    expires_at: datetime
    created_at: datetime
    status: str

class InviteDetailsResponse(BaseModel):
    token: str
    requester_name: str
    member_name: str
    relationship: str
    email: str
    expires_at: datetime
    status: str

class InviteActionPayload(BaseModel):
    token: str

class LocationUpdatePayload(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    battery_level: Optional[int] = None
    timestamp: Optional[str] = None

class FamilyMemberResponse(BaseModel):
    id: int
    member_user_id: Optional[int] = None
    name: str
    relationship: str
    email: str
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    status: str # PENDING, ACTIVE, DECLINED, REVOKED
    sharing_enabled: bool
    permission_type: Optional[str] = "ALWAYS"
    location_status: str # Live, Stale, Offline, Sharing Disabled
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    battery_level: Optional[int] = None
    last_updated: Optional[str] = None
    sharing_started_at: Optional[str] = None
    connection_id: Optional[int] = None
    invite_token: Optional[str] = None
    emergency_status: Optional[str] = "Normal"

class FamilyEmergencyPayload(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    trigger_method: Optional[str] = "BUTTON" # BUTTON, VOICE, AUTOMATED_SAFETY_TRIGGER
    battery_level: Optional[int] = None
    message: Optional[str] = "🚨 SOS Emergency Alert Triggered!"

class FamilyEmergencyAlertResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    trigger_method: str
    status: str # NORMAL, SOS_TRIGGERED, LOCATION_CAPTURED, FAMILY_NOTIFIED, EMERGENCY_ACTIVE, FAMILY_ACKNOWLEDGED, EMERGENCY_RESOLVED, EMERGENCY_CANCELLED
    message: str
    battery_level: Optional[int] = None
    created_at: str
    acknowledged_at: Optional[str] = None
    resolved_at: Optional[str] = None
    acknowledged_by: Optional[List[Dict[str, Any]]] = []
    media_recordings: Optional[List[Dict[str, Any]]] = []

class FamilyQRInviteResponse(BaseModel):
    qr_token: str
    expires_at: datetime
    requester_name: str
    requester_email: str

class FamilyQRScanPayload(BaseModel):
    qr_token: str
    relationship: str

class LocationHistoryItem(BaseModel):
    id: int
    latitude: float
    longitude: float
    place_name: Optional[str] = None
    timestamp: str

class LocationSharingSettingsPayload(BaseModel):
    sharing_enabled: bool
    permission_type: Optional[str] = "ALWAYS" # WHILE_USING, ALWAYS, PAUSED, DISABLED
    history_opt_in: Optional[bool] = False
    voice_detection_enabled: Optional[bool] = False
    media_recording_enabled: Optional[bool] = True

# --- Family Chat Schemas ---
class FamilyChatMessageCreate(BaseModel):
    content: str
    message_type: Optional[str] = "TEXT" # TEXT, LOCATION_SHARE, SOS_ALERT
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None

class FamilyChatMessageResponse(BaseModel):
    id: int
    sender_id: int
    sender_name: str
    content: str
    message_type: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    created_at: str
    is_read: bool

# --- Push Notification Schemas ---
class PushSubscriptionPayload(BaseModel):
    endpoint: str
    p256dh: str
    auth: str

# --- Location Sharing Via Email Schemas ---
class LocationShareRequestCreate(BaseModel):
    recipientEmail: Optional[str] = None
    recipient_email: Optional[str] = None

class LocationShareSubmit(BaseModel):
    token: str
    latitude: float
    longitude: float
    accuracy: Optional[float] = None

class LocationShareDecline(BaseModel):
    token: str

class LocationShareDetailsResponse(BaseModel):
    valid: bool
    status: str
    requester_name: str
    recipient_email: str
    expires_at: datetime
    created_at: datetime

class LocationShareRequestResponse(BaseModel):
    id: int
    recipient_email: str
    token: str
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None
    created_at: datetime
    expires_at: datetime
    updated_at: datetime
    requester_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- Plan Journey Schemas ---
class DestinationImageSchema(BaseModel):
    id: Optional[int] = None
    image_url: str
    caption: Optional[str] = None
    attribution: Optional[str] = None
    source_url: Optional[str] = None
    is_primary: bool = False

    class Config:
        from_attributes = True

class DestinationResponse(BaseModel):
    id: int
    name: str
    slug: str
    country: str
    state: Optional[str] = None
    city: str
    travel_scope: str
    category: str
    sub_category: Optional[str] = None
    supported_moods: List[str] = []
    description: str
    why_recommended: Optional[str] = None
    latitude: float
    longitude: float
    hero_image_url: str
    best_season: Optional[str] = None
    typical_duration: Optional[str] = None
    approx_budget_tier: Optional[str] = None
    approx_cost_per_day_inr: Optional[float] = None
    opening_hours: Optional[str] = None
    accessibility_info: Optional[str] = None
    official_website_url: Optional[str] = None
    source_attribution: Optional[str] = None
    is_popular: bool = False
    is_featured: bool = False
    is_hidden_gem: bool = False
    is_favorite: Optional[bool] = False
    images: List[DestinationImageSchema] = []

    class Config:
        from_attributes = True

class DestinationListResponse(BaseModel):
    total: int
    page: int
    limit: int
    destinations: List[DestinationResponse]

class MoodItemSchema(BaseModel):
    id: str
    title: str
    tagline: str
    description: str
    image_url: str
    icon_name: str
    badge: Optional[str] = None

class PlannedJourneyStopCreate(BaseModel):
    destination_id: Optional[int] = None
    custom_location_name: Optional[str] = None
    latitude: float
    longitude: float
    stop_order: int
    stay_duration_hours: Optional[float] = 2.0
    notes: Optional[str] = None

class PlannedJourneyStopResponse(BaseModel):
    id: int
    trip_id: int
    destination_id: Optional[int] = None
    stop_order: int
    custom_location_name: Optional[str] = None
    latitude: float
    longitude: float
    notes: Optional[str] = None
    stay_duration_hours: float = 2.0
    distance_from_prev_km: float = 0.0
    destination: Optional[DestinationResponse] = None

    class Config:
        from_attributes = True

class PlannedJourneyTripCreate(BaseModel):
    title: str
    description: Optional[str] = None
    primary_mood: Optional[str] = None
    travel_scope: Optional[str] = "DOMESTIC"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    stops: List[PlannedJourneyStopCreate] = []

class PlannedJourneyTripUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    primary_mood: Optional[str] = None
    travel_scope: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    stops: Optional[List[PlannedJourneyStopCreate]] = None

class PlannedJourneyTripResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    primary_mood: Optional[str] = None
    travel_scope: str
    total_distance_km: float = 0.0
    total_duration_mins: float = 0.0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    stops: List[PlannedJourneyStopResponse] = []

    class Config:
        from_attributes = True

class FavoriteDestinationResponse(BaseModel):
    id: int
    destination_id: int
    created_at: datetime
    destination: DestinationResponse

    class Config:
        from_attributes = True
