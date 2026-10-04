import secrets
import re
from datetime import datetime, timedelta
from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.database.models import User, LocationShareRequest
from app.schemas.schemas import (
    LocationShareRequestCreate,
    LocationShareSubmit,
    LocationShareDecline,
    LocationShareDetailsResponse,
    LocationShareRequestResponse
)
from app.api.auth import get_current_user
from app.services.email_service import email_service

router = APIRouter(prefix="/location", tags=["Location Sharing"])

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

@router.post("/request")
def create_location_request(
    payload: LocationShareRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates a secure location sharing request and sends an email via Gmail SMTP to the recipient.
    """
    target_email = payload.recipientEmail or payload.recipient_email
    if not target_email or not EMAIL_REGEX.match(target_email.strip()):
        raise HTTPException(status_code=400, detail="Please enter a valid recipient email address.")

    target_email = target_email.strip().lower()

    if target_email == current_user.email.lower():
        raise HTTPException(status_code=400, detail="You cannot request location sharing from your own email address.")

    # Generate cryptographically secure random token
    secure_token = secrets.token_urlsafe(32)
    expire_minutes = settings.LOCATION_REQUEST_EXPIRE_MINUTES
    expires_at = datetime.utcnow() + timedelta(minutes=expire_minutes)

    # Save request record in database
    req_record = LocationShareRequest(
        requester_id=current_user.id,
        recipient_email=target_email,
        token=secure_token,
        status="PENDING",
        expires_at=expires_at
    )
    db.add(req_record)
    db.commit()
    db.refresh(req_record)

    # Construct the consent link
    share_url = f"{settings.FRONTEND_URL.rstrip('/')}/location/share/{secure_token}"
    requester_name = current_user.full_name or current_user.email.split("@")[0]

    # Dispatch email via Gmail SMTP
    email_sent = email_service.send_location_request_email(
        recipient_email=target_email,
        requester_name=requester_name,
        share_url=share_url,
        expire_minutes=expire_minutes
    )

    return {
        "success": True,
        "message": "Location request sent successfully. Waiting for recipient to approve.",
        "request_id": req_record.id,
        "token": secure_token,
        "recipient_email": target_email,
        "share_url": share_url,
        "email_sent": email_sent,
        "expires_at": expires_at.isoformat()
    }

@router.get("/share/{token}")
def get_location_share_details(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Public endpoint: Validates the token and returns request details for the consent page.
    """
    req_record = db.query(LocationShareRequest).filter(LocationShareRequest.token == token).first()
    if not req_record:
        raise HTTPException(status_code=404, detail="Invalid or non-existent location request token.")

    # Check expiration
    if req_record.status == "PENDING" and req_record.expires_at < datetime.utcnow():
        req_record.status = "EXPIRED"
        db.commit()

    requester = db.query(User).filter(User.id == req_record.requester_id).first()
    requester_name = requester.full_name or (requester.email if requester else "Safe Route User")

    return {
        "valid": req_record.status != "EXPIRED",
        "status": req_record.status,
        "requester_name": requester_name,
        "recipient_email": req_record.recipient_email,
        "expires_at": req_record.expires_at.isoformat(),
        "created_at": req_record.created_at.isoformat()
    }

@router.post("/share")
def submit_shared_location(
    payload: LocationShareSubmit,
    db: Session = Depends(get_db)
):
    """
    Public consent endpoint: Submits voluntary location coordinates after explicit user approval.
    """
    req_record = db.query(LocationShareRequest).filter(LocationShareRequest.token == payload.token).first()
    if not req_record:
        raise HTTPException(status_code=404, detail="Invalid location request token.")

    if req_record.expires_at < datetime.utcnow():
        req_record.status = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=400, detail="This location request has expired. No location was collected.")

    if req_record.status == "DECLINED":
        raise HTTPException(status_code=400, detail="This request was previously declined. No location was collected.")

    if req_record.status == "ACCEPTED":
        # Already accepted; update latest shared location coordinates
        pass

    # Coordinate range validation
    if not (-90.0 <= payload.latitude <= 90.0):
        raise HTTPException(status_code=400, detail="Invalid latitude coordinate. Must be between -90 and 90.")
    if not (-180.0 <= payload.longitude <= 180.0):
        raise HTTPException(status_code=400, detail="Invalid longitude coordinate. Must be between -180 and 180.")

    # Update request record with explicit location
    req_record.latitude = round(payload.latitude, 6)
    req_record.longitude = round(payload.longitude, 6)
    req_record.accuracy = round(payload.accuracy, 2) if payload.accuracy is not None else None
    req_record.status = "ACCEPTED"
    req_record.updated_at = datetime.utcnow()

    db.commit()

    return {
        "success": True,
        "message": "Location shared successfully.",
        "status": "ACCEPTED"
    }

@router.post("/decline")
def decline_location_share(
    payload: LocationShareDecline,
    db: Session = Depends(get_db)
):
    """
    Public consent endpoint: Declines location sharing request. No location is stored.
    """
    req_record = db.query(LocationShareRequest).filter(LocationShareRequest.token == payload.token).first()
    if not req_record:
        raise HTTPException(status_code=404, detail="Invalid location request token.")

    req_record.status = "DECLINED"
    req_record.latitude = None
    req_record.longitude = None
    req_record.updated_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "message": "The location request has been declined. No location data was collected.",
        "status": "DECLINED"
    }

@router.get("/requests")
def get_user_location_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Authenticated endpoint: Returns all location share requests sent by the current user.
    """
    requests = db.query(LocationShareRequest)\
        .filter(LocationShareRequest.requester_id == current_user.id)\
        .order_by(LocationShareRequest.created_at.desc())\
        .all()

    now = datetime.utcnow()
    result = []
    for r in requests:
        if r.status == "PENDING" and r.expires_at < now:
            r.status = "EXPIRED"
            db.commit()
        
        result.append({
            "id": r.id,
            "recipient_email": r.recipient_email,
            "token": r.token,
            "status": r.status,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "accuracy": r.accuracy,
            "created_at": r.created_at.isoformat(),
            "expires_at": r.expires_at.isoformat(),
            "updated_at": r.updated_at.isoformat() if r.updated_at else r.created_at.isoformat(),
            "requester_name": current_user.full_name or current_user.email
        })

    return result

@router.delete("/requests/{request_id}")
def delete_location_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Authenticated endpoint: Deletes a stored location share request and clears location data.
    """
    req_record = db.query(LocationShareRequest)\
        .filter(LocationShareRequest.id == request_id, LocationShareRequest.requester_id == current_user.id)\
        .first()

    if not req_record:
        raise HTTPException(status_code=404, detail="Location share request not found.")

    db.delete(req_record)
    db.commit()

    return {"success": True, "message": "Location request deleted successfully."}
