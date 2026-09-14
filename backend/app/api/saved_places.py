from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.database.models import SavedPlace, User
from app.schemas.schemas import SavedPlaceCreate, SavedPlaceResponse
from app.api.auth import get_current_user

router = APIRouter(prefix="/saved-places", tags=["Saved Places"])

@router.get("", response_model=List[SavedPlaceResponse])
def get_saved_places(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    places = db.query(SavedPlace).filter(SavedPlace.user_id == current_user.id).all()
    return places

@router.post("", response_model=SavedPlaceResponse, status_code=status.HTTP_201_CREATED)
def create_saved_place(payload: SavedPlaceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    place = SavedPlace(
        user_id=current_user.id,
        category=payload.category,
        label=payload.label,
        address=payload.address,
        latitude=payload.latitude,
        longitude=payload.longitude
    )
    db.add(place)
    db.commit()
    db.refresh(place)
    return place

@router.delete("/{place_id}")
def delete_saved_place(place_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    place = db.query(SavedPlace).filter(SavedPlace.id == place_id, SavedPlace.user_id == current_user.id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Saved place not found")
    db.delete(place)
    db.commit()
    return {"message": "Place deleted successfully"}
