from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

from app.core.database import get_db
from app.database.models import NavigationSession
from app.services.route_service import route_service

router = APIRouter(prefix="/navigation", tags=["Navigation Engine"])

class StartNavRequest(BaseModel):
    route_id: str
    current_lat: float
    current_lng: float

class RecalculateNavRequest(BaseModel):
    session_id: str
    current_lat: float
    current_lng: float
    destination_name: str
    destination_lat: float
    destination_lng: float

@router.post("/start")
def start_navigation(payload: StartNavRequest, db: Session = Depends(get_db)):
    """
    Start a live turn-by-turn navigation session.
    """
    session_id = f"nav_{uuid.uuid4().hex[:12]}"
    session = NavigationSession(
        id=session_id,
        route_id=payload.route_id,
        current_lat=payload.current_lat,
        current_lng=payload.current_lng,
        status="active",
        started_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(session)
    db.commit()

    return {
        "session_id": session_id,
        "status": "active",
        "route_id": payload.route_id,
        "message": "Navigation session started successfully."
    }

@router.post("/recalculate")
async def recalculate_navigation(payload: RecalculateNavRequest, db: Session = Depends(get_db)):
    """
    Recalculate route if user deviates during navigation.
    """
    session = db.query(NavigationSession).filter(NavigationSession.id == payload.session_id).first()
    if session:
        session.current_lat = payload.current_lat
        session.current_lng = payload.current_lng
        session.updated_at = datetime.utcnow()
        db.commit()

    res = await route_service.analyze_routes(
        origin_name="Current Device Location",
        destination_name=payload.destination_name,
        origin={"lat": payload.current_lat, "lng": payload.current_lng},
        destination={"lat": payload.destination_lat, "lng": payload.destination_lng}
    )

    return res
