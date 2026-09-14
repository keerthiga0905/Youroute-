from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.route_service import route_service
from app.database.models import DataSourceRecord
from app.schemas.schemas import RouteAnalyzeRequest, RouteAnalyzeResponse, RerouteRequest

router = APIRouter(prefix="/routes", tags=["Routes"])

@router.post("/analyze", response_model=RouteAnalyzeResponse)
async def analyze_routes(payload: RouteAnalyzeRequest):
    try:
        result = await route_service.analyze_routes(
            origin_name=payload.origin_name,
            destination_name=payload.destination_name,
            origin={"lat": payload.origin.lat, "lng": payload.origin.lng},
            destination={"lat": payload.destination.lat, "lng": payload.destination.lng},
            departure_time_str=payload.departure_time,
            travel_mode=payload.travel_mode,
            preference=payload.preference
        )
        return result
    except Exception as e:
        print(f"[Route Analysis Error]: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze routes: {str(e)}")

@router.post("/reroute", response_model=RouteAnalyzeResponse)
async def reroute(payload: RerouteRequest):
    try:
        result = await route_service.analyze_routes(
            origin_name="Current Location",
            destination_name=payload.destination_name,
            origin={"lat": payload.current_location.lat, "lng": payload.current_location.lng},
            destination={"lat": payload.destination.lat, "lng": payload.destination.lng},
            travel_mode="driving",
            preference="balanced"
        )
        return result
    except Exception as e:
        print(f"[Reroute Error]: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to recalculate route: {str(e)}")

@router.get("/data-sources")
def get_data_sources(db: Session = Depends(get_db)):
    sources = db.query(DataSourceRecord).all()
    return [
        {
            "id": s.id,
            "source_name": s.source_name,
            "source_url": s.source_url,
            "dataset_name": s.dataset_name,
            "last_updated": s.last_updated,
            "coverage": s.coverage,
            "license": s.license,
            "retrieved_at": s.retrieved_at.isoformat() if s.retrieved_at else None
        }
        for s in sources
    ]
