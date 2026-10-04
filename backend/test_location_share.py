import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, engine, Base
from app.database.models import User, LocationShareRequest

# Create test database tables
Base.metadata.create_all(bind=engine)
client = TestClient(app)

def run_tests():
    print("\n=======================================================")
    print("RUNNING SECURE LOCATION SHARING TESTS")
    print("=======================================================\n")

    # 1. Login / Register Test User
    auth_resp = client.post("/api/auth/register", json={
        "email": "test_requester@saferoute.ai",
        "password": "Password123!",
        "full_name": "Keerthiga"
    })
    if auth_resp.status_code == 400: # Email already exists
        login_resp = client.post("/api/auth/login", json={
            "email": "test_requester@saferoute.ai",
            "password": "Password123!"
        })
        token = login_resp.json()["access_token"]
    else:
        token = auth_resp.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    print("[TEST 1 SUCCESS] Authenticated test user token acquired.")

    # 2. Request Location via Email API
    req_resp = client.post("/api/location/request", json={
        "recipientEmail": "friend@example.com"
    }, headers=headers)
    
    assert req_resp.status_code == 200, f"Request failed: {req_resp.text}"
    req_data = req_resp.json()
    assert req_data["success"] == True
    req_token = req_data["token"]
    print(f"[TEST 2 SUCCESS] Location request created. Token: {req_token[:10]}...")

    # 3. Get Consent Details (Public Token Verification)
    details_resp = client.get(f"/api/location/share/{req_token}")
    assert details_resp.status_code == 200, f"Details failed: {details_resp.text}"
    details_data = details_resp.json()
    assert details_data["valid"] == True
    assert details_data["status"] == "PENDING"
    assert details_data["requester_name"] == "Keerthiga"
    print("[TEST 3 SUCCESS] Consent page token verified successfully.")

    # 4. Submit Shared Location (Consent Approved)
    share_resp = client.post("/api/location/share", json={
        "token": req_token,
        "latitude": 11.0168,
        "longitude": 76.9558,
        "accuracy": 15.5
    })
    assert share_resp.status_code == 200, f"Share failed: {share_resp.text}"
    assert share_resp.json()["success"] == True
    print("[TEST 4 SUCCESS] Voluntary location shared and saved in backend.")

    # 5. Verify Requesting User can retrieve shared location
    list_resp = client.get("/api/location/requests", headers=headers)
    assert list_resp.status_code == 200
    user_reqs = list_resp.json()
    matched = [r for r in user_reqs if r["token"] == req_token]
    assert len(matched) == 1
    assert matched[0]["status"] == "ACCEPTED"
    assert matched[0]["latitude"] == 11.0168
    assert matched[0]["longitude"] == 76.9558
    print("[TEST 5 SUCCESS] Requesting user received shared coordinates accurately.")

    # 6. Decline Test
    req_resp2 = client.post("/api/location/request", json={
        "recipientEmail": "decline_friend@example.com"
    }, headers=headers)
    token2 = req_resp2.json()["token"]
    decline_resp = client.post("/api/location/decline", json={"token": token2})
    assert decline_resp.status_code == 200
    assert decline_resp.json()["status"] == "DECLINED"
    print("[TEST 6 SUCCESS] Location request decline flow tested. No coordinates saved.")

    print("\n=======================================================")
    print("ALL LOCATION SHARING BACKEND TESTS PASSED CLEANLY!")

    print("=======================================================\n")

if __name__ == "__main__":
    run_tests()
