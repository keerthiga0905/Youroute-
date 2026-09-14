from fastapi import APIRouter
from typing import List
from app.services.emergency_service import emergency_service
from app.schemas.schemas import EmergencyPOI

router = APIRouter(prefix="/safety", tags=["Emergency POIs"])

@router.get("/nearby", response_model=List[EmergencyPOI])
def get_nearby_emergency_services(lat: float, lng: float):
    pois = emergency_service.get_nearby_services(lat, lng)
    return pois
