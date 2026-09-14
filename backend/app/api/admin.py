from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.database.models import SafetyIncident, DataSourceRecord

router = APIRouter(prefix="/admin", tags=["Admin Dataset Management"])

class SafetyRecordPayload(BaseModel):
    category: str
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    location: str
    district: str
    city: Optional[str] = None
    source_name: str
    source_url: Optional[str] = None
    verification_status: str = "verified"
    severity: str = "moderate"
    photo_url: Optional[str] = None
    photo_source: Optional[str] = None

@router.post("/safety-records")
def add_safety_record(payload: SafetyRecordPayload, db: Session = Depends(get_db)):
    """
    Add a verified safety record or community report.
    """
    incident = SafetyIncident(
        category=payload.category,
        title=payload.title,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location=payload.location,
        district=payload.district,
        city=payload.city,
        date_reported=datetime.utcnow().strftime("%Y-%m-%d"),
        source_name=payload.source_name,
        source_url=payload.source_url,
        verification_status=payload.verification_status,
        severity=payload.severity,
        photo_url=payload.photo_url,
        photo_source=payload.photo_source,
        is_demo=False,
        created_at=datetime.utcnow()
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    return {
        "success": True,
        "id": incident.id,
        "message": "Safety record created successfully."
    }

@router.post("/import-dataset")
def import_dataset(db: Session = Depends(get_db)):
    """
    Trigger ingestion of official Tamil Nadu safety datasets.
    """
    from app.database.tn_safety_data_seeder import run_seeder
    run_seeder()
    count = db.query(SafetyIncident).count()

    return {
        "success": True,
        "total_incidents": count,
        "message": "Tamil Nadu safety dataset imported successfully."
    }

@router.get("/data-status")
def get_data_status(db: Session = Depends(get_db)):
    """
    Get backend safety data status & source coverage.
    """
    sources = db.query(DataSourceRecord).all()
    incidents_count = db.query(SafetyIncident).count()

    return {
        "status": "active",
        "region_coverage": "Tamil Nadu",
        "verified_incidents": incidents_count,
        "data_sources_count": len(sources),
        "data_sources": [
            {
                "source_name": s.source_name,
                "dataset_name": s.dataset_name,
                "last_updated": s.last_updated,
                "coverage": s.coverage,
                "license": s.license
            }
            for s in sources
        ]
    }
