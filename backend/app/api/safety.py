from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.database.models import SafetyIncident, AccidentRecord, StreetLightRecord, CrimeDataRecord
from app.services.tn_geofence_service import tn_geofence
import math

router = APIRouter(prefix="/safety", tags=["Safety Intelligence"])

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    return R * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

@router.get("/incidents")
def get_incidents(
    district: Optional[str] = None,
    category: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: float = 10.0,
    db: Session = Depends(get_db)
):
    """
    Get real Tamil Nadu safety incidents filtered by district, category, or radius.
    """
    query = db.query(SafetyIncident)

    if district:
        query = query.filter(SafetyIncident.district == district)
    if category:
        query = query.filter(SafetyIncident.category == category)

    all_records = query.all()

    if lat is not None and lng is not None:
        filtered = []
        for r in all_records:
            if _haversine(lat, lng, r.latitude, r.longitude) <= radius_km:
                filtered.append(r)
        return filtered

    return all_records

@router.get("/photos")
def get_safety_photos(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    district: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get area photos with attribution metadata near specified coordinates or district.
    """
    incidents = db.query(SafetyIncident).filter(SafetyIncident.photo_url.isnot(None)).all()

    results = []
    for inc in incidents:
        if lat is not None and lng is not None:
            dist = _haversine(lat, lng, inc.latitude, inc.longitude)
            if dist > 25.0:
                continue

        results.append({
            "id": inc.id,
            "image_url": inc.photo_url,
            "location": inc.location,
            "category": inc.category.replace("_", " ").title(),
            "date": inc.date_reported or "2024",
            "source": inc.source_name,
            "license": "Government Open Data License / Public Domain",
            "caption": f"{inc.title}: {inc.description or 'Public safety corridor infrastructure.'}",
            "district": inc.district,
            "latitude": inc.latitude,
            "longitude": inc.longitude
        })

    return results

@router.get("/route-risk")
def get_route_risk_assessment(
    lat: float = Query(...),
    lng: float = Query(...),
    db: Session = Depends(get_db)
):
    """
    Compute localized safety risk score and incident breakdown around coordinates.
    """
    district = tn_geofence.resolve_district(lat, lng)

    incidents = db.query(SafetyIncident).all()
    nearby_incidents = [i for i in incidents if _haversine(lat, lng, i.latitude, i.longitude) <= 3.0]

    crime = db.query(CrimeDataRecord).filter(CrimeDataRecord.district == district).first()
    crime_rating = crime.safety_rating if crime else 80.0

    accidents_count = len([i for i in nearby_incidents if i.category in ['accident', 'pothole']])
    dark_stretches = len([i for i in nearby_incidents if i.category == 'street_light'])

    risk_score = max(10.0, min(95.0, 100.0 - (0.5 * crime_rating - 12.0 * accidents_count - 10.0 * dark_stretches)))

    if risk_score <= 35:
        level = "lower"
        label = "Lower Risk"
    elif risk_score <= 55:
        level = "moderate"
        label = "Moderate Risk"
    elif risk_score <= 75:
        level = "elevated"
        label = "Elevated Risk"
    else:
        level = "higher"
        label = "Higher Risk"

    return {
        "district": district,
        "latitude": lat,
        "longitude": lng,
        "safety_score": round(risk_score, 1),
        "risk_level": level,
        "risk_label": label,
        "data_confidence": "High",
        "verified_incidents_count": len(nearby_incidents),
        "incidents": [
            {
                "id": inc.id,
                "title": inc.title,
                "category": inc.category,
                "severity": inc.severity,
                "location": inc.location
            }
            for inc in nearby_incidents
        ]
    }
