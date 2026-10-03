from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets
import hashlib
import os
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.core.security import decode_access_token
from app.api.auth import get_current_user
from app.database.models import (
    User, FamilyConnection, Invitation, LocationSharing, UserLiveLocation,
    FamilyEmergencyAlert, EmergencyRecipientRecord, EmergencyMediaRecord, LocationHistoryRecord
)
from app.schemas.schemas import (
    FamilyInviteCreate, FamilyInviteResponse, InviteDetailsResponse,
    InviteActionPayload, LocationUpdatePayload, FamilyMemberResponse,
    FamilyEmergencyPayload, FamilyEmergencyAlertResponse, LocationHistoryItem,
    LocationSharingSettingsPayload, FamilyQRInviteResponse, FamilyQRScanPayload
)

router = APIRouter(prefix="/family", tags=["Family Safety"])

# --- Helper: Generate Token & Hash ---
def generate_invite_token() -> str:
    return secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

def calculate_location_status(last_updated: Optional[datetime], sharing_enabled: bool) -> str:
    if not sharing_enabled:
        return "Sharing Disabled"
    if not last_updated:
        return "Offline"
    diff_seconds = (datetime.utcnow() - last_updated).total_seconds()
    if diff_seconds <= 120:
        return "Live"
    elif diff_seconds <= 600:
        return "Stale"
    else:
        return "Offline"

# --- WebSockets Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"ACK: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# 1. Option 1: Email Invitation
@router.post("/invite", response_model=FamilyInviteResponse, status_code=status.HTTP_201_CREATED)
def send_family_invitation(
    payload: FamilyInviteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if payload.email.lower() == current_user.email.lower():
        raise HTTPException(status_code=400, detail="You cannot invite yourself.")

    raw_token = generate_invite_token()
    token_hash = hash_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(hours=48)

    invitation = Invitation(
        requester_id=current_user.id,
        member_name=payload.member_name,
        relationship=payload.relationship,
        phone=payload.phone,
        email=payload.email.lower(),
        invitation_type="EMAIL",
        secure_token_hash=token_hash,
        expires_at=expires_at,
        status="PENDING"
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    invite_url = f"/family-safety/accept?token={raw_token}"

    return FamilyInviteResponse(
        id=invitation.id,
        member_name=invitation.member_name,
        relationship=invitation.relationship,
        phone=invitation.phone,
        email=invitation.email,
        secure_token=raw_token,
        invite_url=invite_url,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
        status=invitation.status
    )

# 2. Option 2: Direct Connection Request (if registered account exists)
@router.post("/invite/direct", status_code=status.HTTP_201_CREATED)
def send_direct_app_invitation(
    payload: FamilyInviteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not target_user:
        # Fallback to standard email invite if user does not exist yet
        return send_family_invitation(payload, db, current_user)

    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot connect with yourself.")

    # Create pending family connection directly
    conn = db.query(FamilyConnection).filter(
        FamilyConnection.requester_id == current_user.id,
        FamilyConnection.member_id == target_user.id
    ).first()

    if not conn:
        conn = FamilyConnection(
            requester_id=current_user.id,
            member_id=target_user.id,
            relationship=payload.relationship,
            status="PENDING"
        )
        db.add(conn)
    else:
        conn.status = "PENDING"
        conn.relationship = payload.relationship

    db.commit()

    requester_name = current_user.full_name or current_user.email
    return {
        "message": f"Connection request sent to {target_user.full_name or target_user.email}",
        "status": "PENDING",
        "notification": f"{requester_name} wants to connect with you through Family Safety."
    }

# 3. Option 3: Generate QR Connection Token (Expiring 15 min token)
@router.post("/invite/qr/generate", response_model=FamilyQRInviteResponse)
def generate_qr_connection_token(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    raw_token = f"QR_{generate_invite_token()}"
    token_hash = hash_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    invitation = Invitation(
        requester_id=current_user.id,
        member_name="QR Guest",
        relationship="Family Member",
        email=current_user.email,
        invitation_type="QR_CODE",
        secure_token_hash=token_hash,
        expires_at=expires_at,
        status="PENDING"
    )
    db.add(invitation)
    db.commit()

    return FamilyQRInviteResponse(
        qr_token=raw_token,
        expires_at=expires_at,
        requester_name=current_user.full_name or current_user.email,
        requester_email=current_user.email
    )

# 4. Option 3 Scan & Confirm QR Connection
@router.post("/invite/qr/scan")
def scan_qr_connection(
    payload: FamilyQRScanPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    token_hash = hash_token(payload.qr_token)
    invitation = db.query(Invitation).filter(
        Invitation.secure_token_hash == token_hash,
        Invitation.invitation_type == "QR_CODE"
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid QR connection token.")

    if invitation.expires_at < datetime.utcnow():
        invitation.status = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=400, detail="QR Code token has expired.")

    if invitation.requester_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot scan your own QR Code.")

    # Establish active relationship
    conn = db.query(FamilyConnection).filter(
        FamilyConnection.requester_id == invitation.requester_id,
        FamilyConnection.member_id == current_user.id
    ).first()

    if not conn:
        conn = FamilyConnection(
            requester_id=invitation.requester_id,
            member_id=current_user.id,
            relationship=payload.relationship,
            status="ACTIVE",
            accepted_at=datetime.utcnow()
        )
        db.add(conn)
    else:
        conn.status = "ACTIVE"
        conn.relationship = payload.relationship
        conn.accepted_at = datetime.utcnow()

    invitation.status = "ACCEPTED"
    invitation.accepted_at = datetime.utcnow()

    # Enable location sharing for both users
    for uid in [invitation.requester_id, current_user.id]:
        loc = db.query(LocationSharing).filter(LocationSharing.user_id == uid).first()
        if not loc:
            loc = LocationSharing(user_id=uid, sharing_enabled=True, permission_granted_at=datetime.utcnow())
            db.add(loc)
        else:
            loc.sharing_enabled = True

    db.commit()

    return {"message": "QR Code accounts connected successfully!", "status": "ACTIVE"}

# 5. Verify Token for Consent Page
@router.get("/invite/verify/{token}", response_model=InviteDetailsResponse)
def verify_invitation_token(token: str, db: Session = Depends(get_db)):
    token_hash = hash_token(token)
    invitation = db.query(Invitation).filter(Invitation.secure_token_hash == token_hash).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found or invalid token.")

    if invitation.expires_at < datetime.utcnow():
        invitation.status = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=400, detail="This invitation link has expired.")

    requester = db.query(User).filter(User.id == invitation.requester_id).first()
    requester_name = requester.full_name if requester and requester.full_name else (requester.email if requester else "Family Member")

    return InviteDetailsResponse(
        token=token,
        requester_name=requester_name,
        member_name=invitation.member_name,
        relationship=invitation.relationship,
        email=invitation.email,
        expires_at=invitation.expires_at,
        status=invitation.status
    )

# 6. Accept Invitation
@router.post("/invite/accept")
def accept_family_invitation(
    payload: InviteActionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    token_hash = hash_token(payload.token)
    invitation = db.query(Invitation).filter(Invitation.secure_token_hash == token_hash).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    if invitation.status == "ACCEPTED":
        raise HTTPException(status_code=400, detail="Invitation has already been accepted.")

    if invitation.expires_at < datetime.utcnow():
        invitation.status = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=400, detail="Invitation link has expired.")

    connection = db.query(FamilyConnection).filter(
        FamilyConnection.requester_id == invitation.requester_id,
        FamilyConnection.member_id == current_user.id
    ).first()

    if not connection:
        connection = FamilyConnection(
            requester_id=invitation.requester_id,
            member_id=current_user.id,
            relationship=invitation.relationship,
            status="ACTIVE",
            accepted_at=datetime.utcnow()
        )
        db.add(connection)
    else:
        connection.status = "ACTIVE"
        connection.relationship = invitation.relationship
        connection.accepted_at = datetime.utcnow()
        connection.revoked_at = None

    invitation.status = "ACCEPTED"
    invitation.accepted_at = datetime.utcnow()

    loc_sharing = db.query(LocationSharing).filter(LocationSharing.user_id == current_user.id).first()
    if not loc_sharing:
        loc_sharing = LocationSharing(
            user_id=current_user.id,
            sharing_enabled=True,
            permission_granted_at=datetime.utcnow()
        )
        db.add(loc_sharing)
    else:
        loc_sharing.sharing_enabled = True
        loc_sharing.permission_granted_at = datetime.utcnow()

    db.commit()

    return {"message": "Location sharing request accepted successfully!", "status": "ACTIVE"}

# 7. Decline Invitation
@router.post("/invite/decline")
def decline_family_invitation(
    payload: InviteActionPayload,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    token_hash = hash_token(payload.token)
    invitation = db.query(Invitation).filter(Invitation.secure_token_hash == token_hash).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    invitation.status = "DECLINED"
    db.commit()
    return {"message": "Invitation declined.", "status": "DECLINED"}

# 8. Get Connected Family Members & Pending Requests
@router.get("/members", response_model=dict)
def get_family_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    outgoing_connections = db.query(FamilyConnection).filter(
        FamilyConnection.requester_id == current_user.id,
        FamilyConnection.status == "ACTIVE"
    ).all()

    incoming_connections = db.query(FamilyConnection).filter(
        FamilyConnection.member_id == current_user.id,
        FamilyConnection.status == "ACTIVE"
    ).all()

    connected_members = []
    
    # Process outgoing & incoming connections
    all_conns = list(outgoing_connections) + list(incoming_connections)
    seen_member_ids = set()

    for conn in all_conns:
        target_id = conn.member_id if conn.requester_id == current_user.id else conn.requester_id
        if target_id in seen_member_ids:
            continue
        seen_member_ids.add(target_id)

        member_user = db.query(User).filter(User.id == target_id).first()
        if not member_user:
            continue

        loc_sharing = db.query(LocationSharing).filter(LocationSharing.user_id == member_user.id).first()
        sharing_enabled = loc_sharing.sharing_enabled if loc_sharing else False
        permission_type = loc_sharing.permission_type if loc_sharing else "ALWAYS"

        live_loc = db.query(UserLiveLocation).filter(UserLiveLocation.user_id == member_user.id).first()
        last_updated_dt = live_loc.updated_at if live_loc else None
        loc_status = calculate_location_status(last_updated_dt, sharing_enabled)

        # Check if active emergency exists
        active_emergency = db.query(FamilyEmergencyAlert).filter(
            FamilyEmergencyAlert.user_id == member_user.id,
            FamilyEmergencyAlert.status.in_(["SOS_TRIGGERED", "LOCATION_CAPTURED", "FAMILY_NOTIFIED", "EMERGENCY_ACTIVE", "FAMILY_ACKNOWLEDGED"])
        ).first()

        emergency_status_str = f"🚨 {active_emergency.status}" if active_emergency else "Normal"

        connected_members.append({
            "id": conn.id,
            "connection_id": conn.id,
            "member_user_id": member_user.id,
            "name": member_user.full_name or member_user.email.split('@')[0],
            "relationship": conn.relationship,
            "email": member_user.email,
            "phone": member_user.phone or "N/A",
            "profile_image": member_user.profile_image,
            "status": "ACTIVE",
            "sharing_enabled": sharing_enabled,
            "permission_type": permission_type,
            "location_status": loc_status,
            "latitude": live_loc.latitude if (sharing_enabled and live_loc) else None,
            "longitude": live_loc.longitude if (sharing_enabled and live_loc) else None,
            "accuracy": live_loc.accuracy if (sharing_enabled and live_loc) else None,
            "speed": live_loc.speed if (sharing_enabled and live_loc) else None,
            "battery_level": live_loc.battery_level if live_loc else None,
            "last_updated": live_loc.updated_at.isoformat() if (sharing_enabled and live_loc and live_loc.updated_at) else None,
            "sharing_started_at": conn.accepted_at.isoformat() if conn.accepted_at else conn.created_at.isoformat(),
            "emergency_status": emergency_status_str
        })

    pending_invites = db.query(Invitation).filter(
        Invitation.requester_id == current_user.id,
        Invitation.status == "PENDING"
    ).all()

    pending_requests = []
    for inv in pending_invites:
        pending_requests.append({
            "id": inv.id,
            "name": inv.member_name,
            "relationship": inv.relationship,
            "email": inv.email,
            "phone": inv.phone,
            "status": "Waiting for acceptance",
            "created_at": inv.created_at.isoformat(),
            "expires_at": inv.expires_at.isoformat()
        })

    my_sharing = db.query(LocationSharing).filter(LocationSharing.user_id == current_user.id).first()
    my_live_loc = db.query(UserLiveLocation).filter(UserLiveLocation.user_id == current_user.id).first()

    return {
        "connected_members": connected_members,
        "pending_requests": pending_requests,
        "my_sharing_status": {
            "sharing_enabled": my_sharing.sharing_enabled if my_sharing else False,
            "permission_type": my_sharing.permission_type if my_sharing else "ALWAYS",
            "history_opt_in": my_sharing.history_opt_in if my_sharing else False,
            "voice_detection_enabled": my_sharing.voice_detection_enabled if my_sharing else False,
            "media_recording_enabled": my_sharing.media_recording_enabled if my_sharing else True,
            "last_updated": my_live_loc.updated_at.isoformat() if (my_live_loc and my_live_loc.updated_at) else None,
            "latitude": my_live_loc.latitude if my_live_loc else None,
            "longitude": my_live_loc.longitude if my_live_loc else None,
            "battery_level": my_live_loc.battery_level if my_live_loc else None
        }
    }

# 9. Real-time Location Update Ingestion
@router.post("/location/update")
@router.post("/update")
def update_user_location(
    payload: LocationUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    loc_sharing = db.query(LocationSharing).filter(LocationSharing.user_id == current_user.id).first()
    if not loc_sharing or not loc_sharing.sharing_enabled:
        raise HTTPException(
            status_code=403,
            detail="Location sharing is currently disabled. Please enable location sharing first."
        )

    live_loc = db.query(UserLiveLocation).filter(UserLiveLocation.user_id == current_user.id).first()
    if not live_loc:
        live_loc = UserLiveLocation(
            user_id=current_user.id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            accuracy=payload.accuracy,
            speed=payload.speed,
            heading=payload.heading,
            battery_level=payload.battery_level,
            updated_at=datetime.utcnow()
        )
        db.add(live_loc)
    else:
        live_loc.latitude = payload.latitude
        live_loc.longitude = payload.longitude
        live_loc.accuracy = payload.accuracy
        live_loc.speed = payload.speed
        live_loc.heading = payload.heading
        if payload.battery_level is not None:
            live_loc.battery_level = payload.battery_level
        live_loc.updated_at = datetime.utcnow()

    loc_sharing.last_updated_at = datetime.utcnow()

    if loc_sharing.history_opt_in:
        history_rec = LocationHistoryRecord(
            user_id=current_user.id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            timestamp=datetime.utcnow()
        )
        db.add(history_rec)

    db.commit()

    return {"status": "success", "updated_at": live_loc.updated_at.isoformat()}

# 10. Get Authorized Family Member Location
@router.get("/member/{connection_id}/location")
def get_family_member_location(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conn = db.query(FamilyConnection).filter(
        FamilyConnection.id == connection_id,
        ((FamilyConnection.requester_id == current_user.id) | (FamilyConnection.member_id == current_user.id)),
        FamilyConnection.status == "ACTIVE"
    ).first()

    if not conn:
        raise HTTPException(status_code=403, detail="Unauthorized or inactive family connection.")

    member_id = conn.member_id if conn.requester_id == current_user.id else conn.requester_id
    member = db.query(User).filter(User.id == member_id).first()
    loc_sharing = db.query(LocationSharing).filter(LocationSharing.user_id == member_id).first()

    if not loc_sharing or not loc_sharing.sharing_enabled:
        return {
            "name": member.full_name or member.email,
            "relationship": conn.relationship,
            "sharing_enabled": False,
            "location_status": "Sharing Disabled",
            "message": "Family member has disabled location sharing."
        }

    live_loc = db.query(UserLiveLocation).filter(UserLiveLocation.user_id == member_id).first()
    if not live_loc:
        return {
            "name": member.full_name or member.email,
            "relationship": conn.relationship,
            "sharing_enabled": True,
            "location_status": "Offline",
            "message": "No location received yet."
        }

    status_str = calculate_location_status(live_loc.updated_at, True)

    return {
        "member_id": member.id,
        "name": member.full_name or member.email,
        "relationship": conn.relationship,
        "latitude": live_loc.latitude,
        "longitude": live_loc.longitude,
        "accuracy": live_loc.accuracy,
        "speed": live_loc.speed,
        "heading": live_loc.heading,
        "battery_level": live_loc.battery_level,
        "timestamp": live_loc.updated_at.isoformat(),
        "location_status": status_str,
        "sharing_enabled": True
    }

# 11. Remove Family Connection
@router.delete("/member/{connection_id}")
def remove_family_member(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conn = db.query(FamilyConnection).filter(
        FamilyConnection.id == connection_id,
        ((FamilyConnection.requester_id == current_user.id) | (FamilyConnection.member_id == current_user.id))
    ).first()

    if not conn:
        raise HTTPException(status_code=404, detail="Family connection not found.")

    conn.status = "REVOKED"
    conn.revoked_at = datetime.utcnow()
    db.commit()

    return {"message": "Family connection removed successfully.", "connection_id": connection_id}

# 12. Trigger Emergency SOS with State Machine & Multi-Family Recipient Broadcast
@router.post("/emergency", response_model=FamilyEmergencyAlertResponse)
@router.post("/emergency/trigger", response_model=FamilyEmergencyAlertResponse)
def trigger_family_emergency(
    payload: FamilyEmergencyPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # State Machine Initialization: NORMAL -> SOS_TRIGGERED -> LOCATION_CAPTURED -> FAMILY_NOTIFIED -> EMERGENCY_ACTIVE
    alert = FamilyEmergencyAlert(
        user_id=current_user.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        accuracy=payload.accuracy,
        trigger_method=payload.trigger_method or "BUTTON",
        status="EMERGENCY_ACTIVE",
        message=payload.message or "🚨 SOS Emergency Alert Triggered!",
        battery_level=payload.battery_level
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    # Find ALL connected active family members (Father, Mother, Daughter, Son)
    connections = db.query(FamilyConnection).filter(
        ((FamilyConnection.requester_id == current_user.id) | (FamilyConnection.member_id == current_user.id)),
        FamilyConnection.status == "ACTIVE"
    ).all()

    recipient_ids = set()
    for c in connections:
        r_id = c.member_id if c.requester_id == current_user.id else c.requester_id
        recipient_ids.add(r_id)

    # Create EmergencyRecipientRecords
    for r_id in recipient_ids:
        rec_record = EmergencyRecipientRecord(
            event_id=alert.id,
            recipient_id=r_id,
            notification_status="SENT"
        )
        db.add(rec_record)

    db.commit()
    db.refresh(alert)

    user_name = current_user.full_name or current_user.email.split('@')[0]

    return FamilyEmergencyAlertResponse(
        id=alert.id,
        user_id=current_user.id,
        user_name=user_name,
        latitude=alert.latitude,
        longitude=alert.longitude,
        accuracy=alert.accuracy,
        trigger_method=alert.trigger_method,
        status=alert.status,
        message=alert.message,
        battery_level=alert.battery_level,
        created_at=alert.created_at.isoformat(),
        acknowledged_at=alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
        resolved_at=alert.resolved_at.isoformat() if alert.resolved_at else None,
        acknowledged_by=[],
        media_recordings=[]
    )

# 13. Acknowledge Emergency Alert
@router.post("/emergency/{event_id}/acknowledge")
def acknowledge_emergency_alert(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(FamilyEmergencyAlert).filter(FamilyEmergencyAlert.id == event_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Emergency event not found.")

    rec_record = db.query(EmergencyRecipientRecord).filter(
        EmergencyRecipientRecord.event_id == event_id,
        EmergencyRecipientRecord.recipient_id == current_user.id
    ).first()

    if not rec_record:
        rec_record = EmergencyRecipientRecord(
            event_id=event_id,
            recipient_id=current_user.id,
            notification_status="ACKNOWLEDGED",
            acknowledged_at=datetime.utcnow()
        )
        db.add(rec_record)
    else:
        rec_record.notification_status = "ACKNOWLEDGED"
        rec_record.acknowledged_at = datetime.utcnow()

    alert.status = "FAMILY_ACKNOWLEDGED"
    alert.acknowledged_at = datetime.utcnow()
    db.commit()

    ack_user_name = current_user.full_name or current_user.email.split('@')[0]
    return {
        "message": f"{ack_user_name} has received your emergency alert.",
        "status": "FAMILY_ACKNOWLEDGED",
        "acknowledged_at": rec_record.acknowledged_at.isoformat()
    }

# 14. Resolve Emergency Alert
@router.post("/emergency/{event_id}/resolve")
def resolve_emergency_alert(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(FamilyEmergencyAlert).filter(FamilyEmergencyAlert.id == event_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Emergency event not found.")

    alert.status = "EMERGENCY_RESOLVED"
    alert.resolved_at = datetime.utcnow()
    db.commit()

    return {"message": "Emergency alert marked as resolved.", "status": "EMERGENCY_RESOLVED"}

# 15. Upload Emergency Audio/Video Evidence Recording
@router.post("/emergency/{event_id}/media")
async def upload_emergency_media(
    event_id: int,
    file: UploadFile = File(...),
    media_type: str = Form("AUDIO_VIDEO"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(FamilyEmergencyAlert).filter(FamilyEmergencyAlert.id == event_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Emergency event not found.")

    os.makedirs("scratch/uploads", exist_ok=True)
    filename = f"emergency_{event_id}_{secrets.token_hex(6)}_{file.filename}"
    filepath = os.path.join("scratch/uploads", filename)

    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    expires_at = datetime.utcnow() + timedelta(days=7) # Temporary 7-day retention
    media_record = EmergencyMediaRecord(
        event_id=event_id,
        media_type=media_type,
        storage_url=f"/scratch/uploads/{filename}",
        created_at=datetime.utcnow(),
        expires_at=expires_at
    )
    db.add(media_record)
    db.commit()
    db.refresh(media_record)

    return {
        "id": media_record.id,
        "event_id": event_id,
        "media_type": media_type,
        "storage_url": media_record.storage_url,
        "expires_at": expires_at.isoformat()
    }

# 16. Get Active Emergencies for Connected Family Members
@router.get("/emergencies")
def get_active_emergencies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    connections = db.query(FamilyConnection).filter(
        ((FamilyConnection.requester_id == current_user.id) | (FamilyConnection.member_id == current_user.id)),
        FamilyConnection.status == "ACTIVE"
    ).all()

    connected_user_ids = []
    for c in connections:
        connected_user_ids.append(c.member_id if c.requester_id == current_user.id else c.requester_id)

    if not connected_user_ids:
        return {"emergencies": []}

    alerts = db.query(FamilyEmergencyAlert).filter(
        FamilyEmergencyAlert.user_id.in_(connected_user_ids),
        FamilyEmergencyAlert.status.in_(["SOS_TRIGGERED", "LOCATION_CAPTURED", "FAMILY_NOTIFIED", "EMERGENCY_ACTIVE", "FAMILY_ACKNOWLEDGED"])
    ).all()

    results = []
    for a in alerts:
        u = db.query(User).filter(User.id == a.user_id).first()
        recipients = db.query(EmergencyRecipientRecord).filter(EmergencyRecipientRecord.event_id == a.id).all()
        acks = []
        for r in recipients:
            if r.notification_status == "ACKNOWLEDGED":
                rec_u = db.query(User).filter(User.id == r.recipient_id).first()
                acks.append({
                    "id": r.recipient_id,
                    "name": rec_u.full_name or rec_u.email if rec_u else "Family Member",
                    "acknowledged_at": r.acknowledged_at.isoformat() if r.acknowledged_at else None
                })

        media_items = db.query(EmergencyMediaRecord).filter(EmergencyMediaRecord.event_id == a.id).all()
        media_list = [{"id": m.id, "type": m.media_type, "url": m.storage_url} for m in media_items]

        results.append({
            "id": a.id,
            "user_id": a.user_id,
            "user_name": u.full_name or u.email.split('@')[0] if u else "Family Member",
            "latitude": a.latitude,
            "longitude": a.longitude,
            "accuracy": a.accuracy,
            "trigger_method": a.trigger_method,
            "status": a.status,
            "message": a.message,
            "battery_level": a.battery_level,
            "created_at": a.created_at.isoformat(),
            "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
            "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
            "acknowledged_by": acks,
            "media_recordings": media_list
        })

    return {"emergencies": results}

# 17. Emergency Event History Log
@router.get("/emergency/history")
def get_emergency_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    connections = db.query(FamilyConnection).filter(
        ((FamilyConnection.requester_id == current_user.id) | (FamilyConnection.member_id == current_user.id)),
        FamilyConnection.status == "ACTIVE"
    ).all()

    relevant_user_ids = [current_user.id]
    for c in connections:
        relevant_user_ids.append(c.member_id if c.requester_id == current_user.id else c.requester_id)

    alerts = db.query(FamilyEmergencyAlert).filter(
        FamilyEmergencyAlert.user_id.in_(relevant_user_ids)
    ).order_by(FamilyEmergencyAlert.created_at.desc()).limit(50).all()

    history = []
    for a in alerts:
        u = db.query(User).filter(User.id == a.user_id).first()
        recipients = db.query(EmergencyRecipientRecord).filter(EmergencyRecipientRecord.event_id == a.id).all()
        acks = []
        for r in recipients:
            if r.notification_status == "ACKNOWLEDGED":
                rec_u = db.query(User).filter(User.id == r.recipient_id).first()
                acks.append({
                    "id": r.recipient_id,
                    "name": rec_u.full_name or rec_u.email if rec_u else "Family Member",
                    "acknowledged_at": r.acknowledged_at.isoformat() if r.acknowledged_at else None
                })

        media_items = db.query(EmergencyMediaRecord).filter(EmergencyMediaRecord.event_id == a.id).all()
        media_list = [{"id": m.id, "type": m.media_type, "url": m.storage_url} for m in media_items]

        history.append({
            "id": a.id,
            "user_id": a.user_id,
            "user_name": u.full_name or u.email.split('@')[0] if u else "Family Member",
            "latitude": a.latitude,
            "longitude": a.longitude,
            "accuracy": a.accuracy,
            "trigger_method": a.trigger_method,
            "status": a.status,
            "message": a.message,
            "battery_level": a.battery_level,
            "created_at": a.created_at.isoformat(),
            "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
            "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
            "acknowledged_by": acks,
            "media_recordings": media_list
        })

    return {"history": history}

# 18. Delete Emergency Event Record
@router.delete("/emergency/history/{event_id}")
def delete_emergency_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(FamilyEmergencyAlert).filter(
        FamilyEmergencyAlert.id == event_id,
        FamilyEmergencyAlert.user_id == current_user.id
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Emergency event record not found or permission denied.")

    db.delete(alert)
    db.commit()
    return {"message": "Emergency event record deleted successfully."}

# 19. Privacy & Permissions Settings
@router.post("/privacy/settings")
def update_privacy_settings(
    payload: LocationSharingSettingsPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    loc_sharing = db.query(LocationSharing).filter(LocationSharing.user_id == current_user.id).first()
    if not loc_sharing:
        loc_sharing = LocationSharing(
            user_id=current_user.id,
            sharing_enabled=payload.sharing_enabled,
            permission_type=payload.permission_type or "ALWAYS",
            history_opt_in=payload.history_opt_in or False,
            voice_detection_enabled=payload.voice_detection_enabled or False,
            media_recording_enabled=payload.media_recording_enabled if payload.media_recording_enabled is not None else True
        )
        db.add(loc_sharing)
    else:
        loc_sharing.sharing_enabled = payload.sharing_enabled
        if payload.permission_type:
            loc_sharing.permission_type = payload.permission_type
        if payload.history_opt_in is not None:
            loc_sharing.history_opt_in = payload.history_opt_in
        if payload.voice_detection_enabled is not None:
            loc_sharing.voice_detection_enabled = payload.voice_detection_enabled
        if payload.media_recording_enabled is not None:
            loc_sharing.media_recording_enabled = payload.media_recording_enabled

    db.commit()
    return {
        "message": "Privacy & safety settings updated.",
        "sharing_enabled": loc_sharing.sharing_enabled,
        "permission_type": loc_sharing.permission_type,
        "history_opt_in": loc_sharing.history_opt_in,
        "voice_detection_enabled": loc_sharing.voice_detection_enabled,
        "media_recording_enabled": loc_sharing.media_recording_enabled
    }

# 20. Location History
@router.get("/location-history")
def get_location_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    loc_sharing = db.query(LocationSharing).filter(LocationSharing.user_id == current_user.id).first()
    if not loc_sharing or not loc_sharing.history_opt_in:
        return {"opt_in": False, "history": []}

    history_records = db.query(LocationHistoryRecord).filter(
        LocationHistoryRecord.user_id == current_user.id
    ).order_by(LocationHistoryRecord.timestamp.desc()).limit(50).all()

    items = []
    for h in history_records:
        items.append({
            "id": h.id,
            "latitude": h.latitude,
            "longitude": h.longitude,
            "place_name": h.place_name or "Location Ping",
            "timestamp": h.timestamp.isoformat()
        })

    return {"opt_in": True, "history": items}

# 21. Delete Location History
@router.delete("/location-history")
def delete_location_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(LocationHistoryRecord).filter(LocationHistoryRecord.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Location history successfully deleted."}
