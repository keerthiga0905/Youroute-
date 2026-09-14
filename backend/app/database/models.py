from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    preferred_priority = Column(String, default="balanced")
    created_at = Column(DateTime, default=datetime.utcnow)

    histories = relationship("TripHistory", back_populates="user", cascade="all, delete-orphan")
    saved_places = relationship("SavedPlace", back_populates="user", cascade="all, delete-orphan")

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(String, index=True, nullable=True)
    name = Column(String, nullable=False)
    formatted_address = Column(String, nullable=False)
    district = Column(String, index=True, nullable=True)
    state = Column(String, default="Tamil Nadu")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class SavedPlace(Base):
    __tablename__ = "saved_places"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String, nullable=False)
    label = Column(String, nullable=False)
    address = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="saved_places")

class RouteRecord(Base):
    __tablename__ = "routes"

    id = Column(String, primary_key=True, index=True)
    origin_name = Column(String, nullable=False)
    destination_name = Column(String, nullable=False)
    origin_lat = Column(Float, nullable=False)
    origin_lng = Column(Float, nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lng = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=False)
    duration_mins = Column(Float, nullable=False)
    rank_order = Column(Integer, nullable=False) # 1=shortest (Green), 2=yellow, 3=orange, 4=red
    color_code = Column(String, nullable=False)
    safety_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    confidence_level = Column(String, nullable=False) # HIGH, MEDIUM, LOW
    polyline_geojson = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class RouteSegmentRecord(Base):
    __tablename__ = "route_segments"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(String, ForeignKey("routes.id"), nullable=False)
    segment_index = Column(Integer, nullable=False)
    road_name = Column(String, nullable=False)
    length_km = Column(Float, nullable=False)
    start_lat = Column(Float, nullable=False)
    start_lng = Column(Float, nullable=False)
    end_lat = Column(Float, nullable=False)
    end_lng = Column(Float, nullable=False)
    lighting_score = Column(Float, nullable=True)
    accident_score = Column(Float, nullable=True)
    crime_score = Column(Float, nullable=True)
    road_condition_score = Column(Float, nullable=True)
    isolation_score = Column(Float, nullable=True)
    segment_risk_score = Column(Float, nullable=False)
    risk_category = Column(String, nullable=False) # lower, moderate, elevated, higher
    data_confidence = Column(String, nullable=False) # High, Medium, Low
    explanation = Column(JSON, nullable=True)

class SafetyDataRecord(Base):
    __tablename__ = "safety_data"

    id = Column(Integer, primary_key=True, index=True)
    district = Column(String, index=True, nullable=False)
    area_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    overall_safety_index = Column(Float, nullable=False)
    confidence = Column(String, nullable=False)
    data_sources_used = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)

class AccidentRecord(Base):
    __tablename__ = "accidents"

    id = Column(Integer, primary_key=True, index=True)
    district = Column(String, index=True, nullable=False)
    location_description = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    severity = Column(String, nullable=False) # fatal, serious, minor, blackspot
    historical_count = Column(Integer, default=1)
    year = Column(Integer, default=2024)

class CrimeDataRecord(Base):
    __tablename__ = "crime_data"

    id = Column(Integer, primary_key=True, index=True)
    district = Column(String, index=True, nullable=False)
    crime_category = Column(String, nullable=False)
    density_per_100k = Column(Float, nullable=False)
    safety_rating = Column(Float, nullable=False)
    reporting_period = Column(String, default="2023-2024")
    source_agency = Column(String, default="Tamil Nadu State Crime Records Bureau / NCRB")

class StreetLightRecord(Base):
    __tablename__ = "street_lights"

    id = Column(Integer, primary_key=True, index=True)
    district = Column(String, index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    lighting_type = Column(String, default="LED")
    status = Column(String, default="Functional")
    lit_percentage = Column(Float, default=90.0)
    osm_node_id = Column(String, nullable=True)

class RoadDataRecord(Base):
    __tablename__ = "road_data"

    id = Column(Integer, primary_key=True, index=True)
    district = Column(String, index=True, nullable=False)
    road_name = Column(String, nullable=False)
    road_classification = Column(String, nullable=False)
    surface_quality = Column(String, default="Good")
    lighting_coverage = Column(String, default="High")
    start_lat = Column(Float, nullable=False)
    start_lng = Column(Float, nullable=False)
    end_lat = Column(Float, nullable=False)
    end_lng = Column(Float, nullable=False)

class NavigationSession(Base):
    __tablename__ = "navigation_sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    route_id = Column(String, ForeignKey("routes.id"), nullable=False)
    current_lat = Column(Float, nullable=False)
    current_lng = Column(Float, nullable=False)
    status = Column(String, default="active")
    last_maneuver_index = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class TripHistory(Base):
    __tablename__ = "trip_histories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    origin_name = Column(String, nullable=False)
    destination_name = Column(String, nullable=False)
    origin_lat = Column(Float, nullable=False)
    origin_lng = Column(Float, nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lng = Column(Float, nullable=False)
    travel_mode = Column(String, nullable=False)
    preference = Column(String, nullable=False)
    duration_mins = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    safety_score = Column(Float, nullable=False)
    selected_route_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="histories")

class DataSourceRecord(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    source_name = Column(String, nullable=False)
    source_url = Column(String, nullable=False)
    dataset_name = Column(String, nullable=False)
    last_updated = Column(String, nullable=False)
    coverage = Column(String, nullable=False)
    license = Column(String, nullable=False)
    retrieved_at = Column(DateTime, default=datetime.utcnow)

class ModelVersionRecord(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, nullable=False)
    version = Column(String, nullable=False)
    algorithm = Column(String, nullable=False)
    accuracy_score = Column(Float, nullable=False)
    f1_score = Column(Float, nullable=False)
    roc_auc = Column(Float, nullable=False)
    feature_count = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class SafetyIncident(Base):
    __tablename__ = "safety_incidents"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=False) # street_light, pothole, road_damage, accident, robbery, theft, crime_statistics, flood_risk, road_closure, construction
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location = Column(String, nullable=False)
    district = Column(String, index=True, nullable=False)
    city = Column(String, nullable=True)
    date_reported = Column(String, nullable=True)
    date_occurred = Column(String, nullable=True)
    source_name = Column(String, nullable=False)
    source_url = Column(String, nullable=True)
    verification_status = Column(String, default="verified") # verified, unverified, user_reported
    severity = Column(String, default="moderate") # low, moderate, high, critical
    photo_url = Column(String, nullable=True)
    photo_source = Column(String, nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

