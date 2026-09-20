from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdatePriority(BaseModel):
    preferred_priority: str # fastest, balanced, lower_risk

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    preferred_priority: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

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
