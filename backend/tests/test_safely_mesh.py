import sys
import os
import uuid

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.database import models
from app.database.models import User
from app.services.email_service import email_service

# Mock email service for unit testing
email_service.send_verification_otp = lambda recipient_email, recipient_name, otp, expire_minutes=5: {
    "delivered": True, "status": "sent", "message": f"Code {otp} sent to {recipient_email}"
}

client = TestClient(app)

def test_full_safely_mesh_lifecycle():
    # Setup unique run suffix to ensure independent accounts
    suffix = uuid.uuid4().hex[:6]
    
    # 1. Register 4 Independent Family Accounts: Father, Mother, Daughter, Son
    father_email = f"father_{suffix}@safely.mesh"
    mother_email = f"mother_{suffix}@safely.mesh"
    daughter_email = f"daughter_{suffix}@safely.mesh"
    son_email = f"son_{suffix}@safely.mesh"

    users = [
        {"email": father_email, "password": "Password123!", "full_name": "Father Robert"},
        {"email": mother_email, "password": "Password123!", "full_name": "Mother Sarah"},
        {"email": daughter_email, "password": "Password123!", "full_name": "Daughter Emily"},
        {"email": son_email, "password": "Password123!", "full_name": "Son Alex"},
    ]

    tokens = {}

    for u in users:
        # Register
        reg_res = client.post("/api/auth/register", json={
            "email": u["email"],
            "password": u["password"],
            "confirm_password": u["password"],
            "full_name": u["full_name"],
            "agree_to_terms": True
        })
        assert reg_res.status_code in [200, 201], f"Failed to register {u['email']}: {reg_res.text}"

        # Mark user verified
        db = SessionLocal()
        try:
            db_user = db.query(User).filter(User.email == u["email"]).first()
            db_user.is_verified = True
            db.commit()
        finally:
            db.close()

        # Login
        login_res = client.post("/api/auth/login", json={
            "email": u["email"],
            "password": u["password"]
        })
        assert login_res.status_code == 200, f"Failed to login {u['email']}: {login_res.text}"
        tokens[u['email']] = login_res.json()["access_token"]

    father_token = tokens[father_email]
    mother_token = tokens[mother_email]
    daughter_token = tokens[daughter_email]
    son_token = tokens[son_email]

    father_headers = {"Authorization": f"Bearer {father_token}"}
    mother_headers = {"Authorization": f"Bearer {mother_token}"}
    daughter_headers = {"Authorization": f"Bearer {daughter_token}"}
    son_headers = {"Authorization": f"Bearer {son_token}"}

    # 2. Test QR Code Token Generation (Father generates QR invitation)
    qr_gen_res = client.post("/api/family/invite/qr/generate", headers=father_headers)
    assert qr_gen_res.status_code == 200, f"QR generation failed: {qr_gen_res.text}"
    qr_data = qr_gen_res.json()
    raw_token = qr_data["qr_token"]
    assert raw_token.startswith("QR_"), "Token format mismatch"

    # 3. Test QR Token Verification Endpoint (Mother views profile before connecting)
    verify_res = client.get(f"/api/family/invite/qr/verify/{raw_token}")
    assert verify_res.status_code == 200, f"QR verify failed: {verify_res.text}"
    verify_data = verify_res.json()
    assert verify_data["valid"] is True
    assert verify_data["requester_name"] == "Father Robert"

    # 4. Test QR Code Scan & Pairing (Mother scans Father's QR code)
    scan_res = client.post("/api/family/invite/qr/scan", json={
        "qr_token": raw_token,
        "relationship": "Husband"
    }, headers=mother_headers)
    assert scan_res.status_code == 200, f"QR scan pairing failed: {scan_res.text}"
    assert scan_res.json()["status"] == "ACTIVE"

    # Connect Daughter and Son to Father as well via QR tokens
    d_qr_res = client.post("/api/family/invite/qr/generate", headers=father_headers)
    client.post("/api/family/invite/qr/scan", json={"qr_token": d_qr_res.json()["qr_token"], "relationship": "Father"}, headers=daughter_headers)

    s_qr_res = client.post("/api/family/invite/qr/generate", headers=father_headers)
    client.post("/api/family/invite/qr/scan", json={"qr_token": s_qr_res.json()["qr_token"], "relationship": "Father"}, headers=son_headers)

    # Verify connected members list
    members_res = client.get("/api/family/members", headers=father_headers)
    assert members_res.status_code == 200
    connected_list = members_res.json()["connected_members"]
    assert len(connected_list) >= 3, "Father should have at least 3 connected members"

    # 5. Test Real-time GPS Location Reporting & Validation
    loc_payload = {
        "latitude": 11.0168,
        "longitude": 76.9558,
        "accuracy": 8.5,
        "speed": 1.2,
        "heading": 90.0,
        "battery_level": 88
    }
    loc_res = client.post("/api/family/location/update", json=loc_payload, headers=father_headers)
    assert loc_res.status_code == 200, f"Location update failed: {loc_res.text}"
    assert loc_res.json()["status"] == "success"

    # Verify Mother can see Father's live coordinates
    mother_view_res = client.get("/api/family/members", headers=mother_headers)
    assert mother_view_res.status_code == 200
    father_in_mother_view = next(m for m in mother_view_res.json()["connected_members"] if "Father Robert" in m["name"])
    assert father_in_mother_view["latitude"] == 11.0168
    assert father_in_mother_view["longitude"] == 76.9558
    assert father_in_mother_view["location_status"] == "Live"
    assert father_in_mother_view["battery_level"] == 88

    # 6. Test Privacy Controls: Father disables location sharing
    client.post("/api/family/privacy/settings", json={"sharing_enabled": False}, headers=father_headers)
    mother_view_disabled = client.get("/api/family/members", headers=mother_headers)
    father_updated = next(m for m in mother_view_disabled.json()["connected_members"] if "Father Robert" in m["name"])
    assert father_updated["latitude"] is None, "Disabled sharing must redact coordinates"
    assert father_updated["location_status"] == "Sharing Disabled"

    # Re-enable sharing
    client.post("/api/family/privacy/settings", json={"sharing_enabled": True}, headers=father_headers)

    # 7. Test Family Group Chat: Persistent SQLite storage & retrieval
    chat_send_res = client.post("/api/family/chat/messages", json={
        "content": "Family safety check-in: Everyone home safe?",
        "message_type": "TEXT"
    }, headers=father_headers)
    assert chat_send_res.status_code == 200, f"Chat message send failed: {chat_send_res.text}"
    assert chat_send_res.json()["content"] == "Family safety check-in: Everyone home safe?"

    # Daughter replies with GPS location link
    client.post("/api/family/chat/messages", json={
        "content": "I am at campus library",
        "message_type": "LOCATION_SHARE",
        "location_lat": 11.0250,
        "location_lng": 76.9600
    }, headers=daughter_headers)

    # Mother retrieves chat history
    chat_history_res = client.get("/api/family/chat/messages", headers=mother_headers)
    assert chat_history_res.status_code == 200
    chat_msgs = chat_history_res.json()["messages"]
    assert len(chat_msgs) >= 2, "Family members should see shared chat messages"

    # 8. Test Emergency SOS Lifecycle: 2-Second Hold Trigger
    sos_payload = {
        "latitude": 11.0168,
        "longitude": 76.9558,
        "accuracy": 5.0,
        "trigger_method": "BUTTON",
        "battery_level": 75,
        "message": "🚨 SOS Emergency Alert Triggered!"
    }
    sos_res = client.post("/api/family/emergency/trigger", json=sos_payload, headers=son_headers)
    assert sos_res.status_code == 200, f"SOS trigger failed: {sos_res.text}"
    sos_event = sos_res.json()
    assert sos_event["status"] == "EMERGENCY_ACTIVE"
    event_id = sos_event["id"]

    # Verify Father receives active emergency alert
    father_emergencies_res = client.get("/api/family/emergencies", headers=father_headers)
    assert father_emergencies_res.status_code == 200
    active_list = father_emergencies_res.json()["emergencies"]
    assert any(e["id"] == event_id for e in active_list), "Father must receive Son's SOS alert"

    # 9. Test Emergency Acknowledgement
    ack_res = client.post(f"/api/family/emergency/{event_id}/acknowledge", headers=father_headers)
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "FAMILY_ACKNOWLEDGED"

    # 10. Test Emergency Evidence Media Upload & Static Serving
    import io
    import json
    dummy_video_bytes = b"dummy_webm_binary_content_evidence"
    files = {"file": ("test_evidence.webm", io.BytesIO(dummy_video_bytes), "video/webm")}
    upload_res = client.post(
        f"/api/family/emergency/{event_id}/media",
        files=files,
        data={"media_type": "AUDIO_VIDEO"},
        headers=son_headers
    )
    assert upload_res.status_code == 200, f"Upload media failed: {upload_res.text}"
    media_data = upload_res.json()
    assert "storage_url" in media_data
    storage_url = media_data["storage_url"]
    assert storage_url.startswith("/scratch/uploads/")

    # Verify static file serves the uploaded content
    static_res = client.get(storage_url)
    assert static_res.status_code == 200
    assert static_res.content == dummy_video_bytes

    # 11. Test Real-Time WebSocket Connection & SOS Camera Frame Processing
    with client.websocket_connect(f"/api/family/ws?token={father_token}") as father_ws:
        # Send an SOS camera visual frame packet
        test_frame = {
            "type": "SOS_CAMERA_FRAME",
            "event_id": event_id,
            "user_name": "Father Robert",
            "image": "data:image/jpeg;base64,dummy_live_camera_frame_data",
            "timestamp": "2026-10-13T12:00:00Z"
        }
        father_ws.send_text(json.dumps(test_frame))

    # 12. Test Emergency Resolution
    resolve_res = client.post(f"/api/family/emergency/{event_id}/resolve", headers=son_headers)
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "EMERGENCY_RESOLVED"

    # Verify no more active emergency
    after_resolve_res = client.get("/api/family/emergencies", headers=father_headers)
    assert not any(e["id"] == event_id for e in after_resolve_res.json()["emergencies"])

    print("\n[SUCCESS] All Safely & Mesh automated integration tests passed successfully!")

if __name__ == "__main__":
    test_full_safely_mesh_lifecycle()
