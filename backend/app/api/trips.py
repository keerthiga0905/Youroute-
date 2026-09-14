from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.database.models import TripHistory, User
from app.schemas.schemas import TripHistoryCreate, TripHistoryResponse
from app.api.auth import get_current_user

router = APIRouter(prefix="/trips", tags=["My Trips"])

@router.get("", response_model=List[TripHistoryResponse])
def get_trip_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trips = db.query(TripHistory).filter(TripHistory.user_id == current_user.id).order_by(TripHistory.created_at.desc()).all()
    return trips

@router.post("", response_model=TripHistoryResponse, status_code=status.HTTP_201_CREATED)
def save_trip(payload: TripHistoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = TripHistory(
        user_id=current_user.id,
        origin_name=payload.origin_name,
        destination_name=payload.destination_name,
        origin_lat=payload.origin_lat,
        origin_lng=payload.origin_lng,
        destination_lat=payload.destination_lat,
        destination_lng=payload.destination_lng,
        travel_mode=payload.travel_mode,
        preference=payload.preference,
        duration_mins=payload.duration_mins,
        distance_km=payload.distance_km,
        risk_level=payload.risk_level,
        safety_score=payload.safety_score,
        selected_route_name=payload.selected_route_name
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip

@router.delete("/all")
def delete_all_trips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(TripHistory).filter(TripHistory.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Trip history deleted successfully"}
