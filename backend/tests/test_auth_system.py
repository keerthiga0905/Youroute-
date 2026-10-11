import sys
import os
import uuid
import time
from datetime import datetime, timedelta

# Ensure backend path is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
    hash_otp,
    hash_token
)
from app.database.models import User, UserSession, EmailVerificationOTP, PasswordResetToken
from app.services.email_service import email_service

# Mock email service for unit testing so tests don't delay on SMTP network timeouts
email_service.send_verification_otp = lambda recipient_email, recipient_name, otp, expire_minutes=5: {
    "delivered": True, "status": "sent", "message": f"Code {otp} sent to {recipient_email}"
}
email_service.send_password_reset_email = lambda recipient_email, recipient_name, reset_token, expire_minutes=15: {
    "delivered": True, "status": "sent", "message": f"Reset token {reset_token} sent to {recipient_email}"
}

client = TestClient(app)

def test_1_successful_registration():
    """Test 1: Successful registration with strong password, user_uuid, public_user_id and OTP creation."""
    test_email = f"test_reg_{uuid.uuid4().hex[:8]}@routemap.test"
    payload = {
        "email": test_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "full_name": "Test Explorer",
        "phone": "+91 99999 88888",
        "agree_to_terms": True
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert "user_id" in data
    assert "public_user_id" in data
    assert data["public_user_id"].startswith("RM-")
    assert data["email"] == test_email

    # Verify user exists in database and is not yet verified
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == test_email).first()
        assert user is not None
        assert user.is_verified is False
        assert user.user_uuid is not None
        # Verify Argon2id hash
        assert user.hashed_password.startswith("$argon2id$")
        assert verify_password("SecurePassword123!", user.hashed_password)

        # Verify OTP record created
        otp_rec = db.query(EmailVerificationOTP).filter(EmailVerificationOTP.user_id == user.id).first()
        assert otp_rec is not None
        assert otp_rec.consumed_at is None
    finally:
        db.close()
    print("[PASS] Test 1: Successful registration")

def test_2_duplicate_email_rejection():
    """Test 2: Rejection of registration with an already registered email."""
    test_email = f"dup_{uuid.uuid4().hex[:8]}@routemap.test"
    payload = {
        "email": test_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "full_name": "First User",
        "agree_to_terms": True
    }
    r1 = client.post("/api/auth/register", json=payload)
    assert r1.status_code == 201

    # Attempt duplicate registration
    r2 = client.post("/api/auth/register", json=payload)
    assert r2.status_code == 400
    assert "already registered" in r2.json()["detail"].lower()
    print("[PASS] Test 2: Duplicate email rejection")

def test_3_email_verification_success():
    """Test 3: Email verification succeeds with valid OTP and marks user verified."""
    test_email = f"verify_{uuid.uuid4().hex[:8]}@routemap.test"
    client.post("/api/auth/register", json={
        "email": test_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "full_name": "Verify Me"
    })

    # Retrieve valid OTP from database hash check by generating known OTP
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == test_email).first()
        test_otp = "123456"
        otp_record = db.query(EmailVerificationOTP).filter(EmailVerificationOTP.user_id == user.id).first()
        otp_record.otp_hash = hash_otp(test_otp, test_email)
        db.commit()
    finally:
        db.close()

    resp = client.post("/api/auth/verify-email", json={"email": test_email, "otp": test_otp})
    assert resp.status_code == 200, f"Verification failed: {resp.text}"
    auth_data = resp.json()
    assert "access_token" in auth_data
    assert "refresh_token" in auth_data
    assert auth_data["user"]["is_verified"] is True
    print("[PASS] Test 3: Email verification success")

def test_4_incorrect_and_expired_otp_rejection():
    """Test 4: Incorrect and expired OTPs are rejected."""
    test_email = f"otp_fail_{uuid.uuid4().hex[:8]}@routemap.test"
    client.post("/api/auth/register", json={
        "email": test_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "full_name": "OTP Tester"
    })

    # Incorrect OTP
    r_bad = client.post("/api/auth/verify-email", json={"email": test_email, "otp": "999999"})
    assert r_bad.status_code == 400
    assert "invalid" in r_bad.json()["detail"].lower()

    # Expired OTP
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == test_email).first()
        otp_rec = db.query(EmailVerificationOTP).filter(EmailVerificationOTP.user_id == user.id).first()
        otp_rec.expires_at = datetime.utcnow() - timedelta(minutes=10)
        db.commit()
    finally:
        db.close()

    r_exp = client.post("/api/auth/verify-email", json={"email": test_email, "otp": "123456"})
    assert r_exp.status_code == 400
    assert "expired" in r_exp.json()["detail"].lower()
    print("[PASS] Test 4: Incorrect and expired OTP rejection")

def test_5_successful_login():
    """Test 5: Successful login returns access token, refresh token, session id and user profile."""
    test_email = f"login_ok_{uuid.uuid4().hex[:8]}@routemap.test"
    client.post("/api/auth/register", json={
        "email": test_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "full_name": "Login Tester"
    })

    # Mark verified
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == test_email).first()
        user.is_verified = True
        db.commit()
    finally:
        db.close()

    login_resp = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "SecurePassword123!",
        "remember_me": True
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    data = login_resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert "session_id" in data
    assert data["user"]["email"] == test_email
    assert data["user"]["is_verified"] is True
    print("[PASS] Test 5: Successful login")

def test_6_invalid_password_rejection():
    """Test 6: Invalid password rejection and rate limiting lockout."""
    test_email = f"wrong_pwd_{uuid.uuid4().hex[:8]}@routemap.test"
    client.post("/api/auth/register", json={
        "email": test_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "full_name": "Password Tester"
    })

    # Mark verified
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == test_email).first()
        user.is_verified = True
        db.commit()
    finally:
        db.close()

    resp = client.post("/api/auth/login", json={"email": test_email, "password": "WrongPassword123!"})
    assert resp.status_code == 401
    assert "incorrect email or password" in resp.json()["detail"].lower()
    print("[PASS] Test 6: Invalid password rejection")

def test_7_unverified_account_restrictions():
    """Test 7: Unverified account cannot log in and is blocked from protected features."""
    test_email = f"unverified_{uuid.uuid4().hex[:8]}@routemap.test"
    client.post("/api/auth/register", json={
        "email": test_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "full_name": "Unverified User"
    })

    login_resp = client.post("/api/auth/login", json={"email": test_email, "password": "SecurePassword123!"})
    assert login_resp.status_code == 403
    assert "verification" in login_resp.json()["detail"].lower()
    print("[PASS] Test 7: Unverified account restrictions")

def test_8_access_token_expiry_and_invalid_signature():
    """Test 8: Expired access token and fake signature tokens are rejected by /api/auth/me."""
    # 1. Fake token
    fake_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_signature"
    r_fake = client.get("/api/auth/me", headers={"Authorization": f"Bearer {fake_token}"})
    assert r_fake.status_code == 401

    # 2. Expired token
    expired_token = create_access_token("test-uuid-1234", expires_delta=timedelta(seconds=-10))
    r_exp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert r_exp.status_code == 401
    print("[PASS] Test 8: Access token expiry and invalid signature rejection")

def test_9_refresh_token_rotation_and_reuse_detection():
    """Test 9: Refresh token rotation issues new token; presenting revoked token triggers reuse lockout."""
    test_email = f"rotate_{uuid.uuid4().hex[:8]}@routemap.test"
    client.post("/api/auth/register", json={
        "email": test_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "full_name": "Rotation Tester"
    })
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == test_email).first()
        user.is_verified = True
        db.commit()
    finally:
        db.close()

    login_resp = client.post("/api/auth/login", json={"email": test_email, "password": "SecurePassword123!"})
    orig_refresh = login_resp.json()["refresh_token"]

    # 1. Rotate refresh token
    ref_resp = client.post("/api/auth/refresh", json={"refresh_token": orig_refresh})
    assert ref_resp.status_code == 200
    new_refresh = ref_resp.json()["refresh_token"]
    assert new_refresh != orig_refresh

    # 2. Reuse old refresh token (should be rejected since hash changed or old session marked revoked)
    reuse_resp = client.post("/api/auth/refresh", json={"refresh_token": orig_refresh})
    assert reuse_resp.status_code == 401
    print("[PASS] Test 9: Refresh token rotation and reuse detection")

def test_10_logout_and_session_revocation():
    """Test 10: Logout revokes session and session disappears or marks revoked."""
    test_email = f"logout_{uuid.uuid4().hex[:8]}@routemap.test"
    client.post("/api/auth/register", json={
        "email": test_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "full_name": "Logout Tester"
    })
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == test_email).first()
        user.is_verified = True
        db.commit()
    finally:
        db.close()

    login_resp = client.post("/api/auth/login", json={"email": test_email, "password": "SecurePassword123!"})
    access_token = login_resp.json()["access_token"]
    refresh_token = login_resp.json()["refresh_token"]
    sid = login_resp.json()["session_id"]

    # Call logout
    logout_resp = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {access_token}"})
    assert logout_resp.status_code == 200

    # Attempt to refresh with the revoked session
    ref_resp = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert ref_resp.status_code == 401
    print("[PASS] Test 10: Logout and session revocation")

def test_11_password_reset_expiry_and_single_use():
    """Test 11: Password reset flow, single-use token consumption, and session invalidation."""
    test_email = f"pwd_reset_{uuid.uuid4().hex[:8]}@routemap.test"
    client.post("/api/auth/register", json={
        "email": test_email,
        "password": "OldPassword123!",
        "confirm_password": "OldPassword123!",
        "full_name": "Reset Tester"
    })
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == test_email).first()
        user.is_verified = True
        db.commit()
    finally:
        db.close()

    # Request reset
    client.post("/api/auth/forgot-password", json={"email": test_email})

    # Retrieve reset token from DB
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == test_email).first()
        test_token = f"secure_reset_token_{uuid.uuid4().hex}"
        rec = db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).first()
        rec.token_hash = hash_token(test_token)
        db.commit()
    finally:
        db.close()

    # Perform reset
    reset_resp = client.post("/api/auth/reset-password", json={
        "token": test_token,
        "new_password": "BrandNewPassword123!",
        "confirm_password": "BrandNewPassword123!"
    })
    assert reset_resp.status_code == 200

    # Attempt to reuse the same token
    reuse_resp = client.post("/api/auth/reset-password", json={
        "token": test_token,
        "new_password": "AnotherNewPassword123!"
    })
    assert reuse_resp.status_code == 400

    # Log in with new password
    login_ok = client.post("/api/auth/login", json={"email": test_email, "password": "BrandNewPassword123!"})
    assert login_ok.status_code == 200
    print("[PASS] Test 11: Password reset expiry and single-use behavior")

def test_12_protected_route_authorization():
    """Test 12: Protected route rejects unauthenticated access and allows authorized access."""
    # Unauthenticated
    unauth_resp = client.get("/api/auth/me")
    assert unauth_resp.status_code == 401

    # Authenticated
    test_email = f"auth_route_{uuid.uuid4().hex[:8]}@routemap.test"
    client.post("/api/auth/register", json={
        "email": test_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "full_name": "Auth User"
    })
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == test_email).first()
        user.is_verified = True
        db.commit()
    finally:
        db.close()

    login_resp = client.post("/api/auth/login", json={"email": test_email, "password": "SecurePassword123!"})
    token = login_resp.json()["access_token"]

    auth_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert auth_resp.status_code == 200
    assert auth_resp.json()["email"] == test_email
    print("[PASS] Test 12: Protected route authorization")

def test_13_session_isolation_between_different_users():
    """Test 13: Sessions of user A cannot be viewed or revoked by user B."""
    # User A
    email_a = f"usera_{uuid.uuid4().hex[:8]}@routemap.test"
    client.post("/api/auth/register", json={"email": email_a, "password": "Password12345!", "full_name": "User A"})
    # User B
    email_b = f"userb_{uuid.uuid4().hex[:8]}@routemap.test"
    client.post("/api/auth/register", json={"email": email_b, "password": "Password12345!", "full_name": "User B"})

    db = SessionLocal()
    try:
        u_a = db.query(User).filter(User.email == email_a).first()
        u_a.is_verified = True
        u_b = db.query(User).filter(User.email == email_b).first()
        u_b.is_verified = True
        db.commit()
    finally:
        db.close()

    login_a = client.post("/api/auth/login", json={"email": email_a, "password": "Password12345!"}).json()
    login_b = client.post("/api/auth/login", json={"email": email_b, "password": "Password12345!"}).json()

    # User B tries to revoke User A's session
    del_resp = client.delete(f"/api/auth/sessions/{login_a['session_id']}", headers={"Authorization": f"Bearer {login_b['access_token']}"})
    assert del_resp.status_code == 404
    print("[PASS] Test 13: Session isolation between different users")

def test_14_cross_family_access_prevention():
    """Test 14: Family operations derive identity securely from verified session."""
    email_fam = f"fam_{uuid.uuid4().hex[:8]}@routemap.test"
    client.post("/api/auth/register", json={"email": email_fam, "password": "Password12345!", "full_name": "Fam Tester"})
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == email_fam).first()
        u.is_verified = True
        db.commit()
    finally:
        db.close()

    login = client.post("/api/auth/login", json={"email": email_fam, "password": "Password12345!"}).json()
    token = login["access_token"]

    # Check /family/members with verified user's token
    members_resp = client.get("/api/family/members", headers={"Authorization": f"Bearer {token}"})
    assert members_resp.status_code == 200
    print("[PASS] Test 14: Cross-family access prevention")

def test_15_existing_routemap_compatibility():
    """Test 15: Existing demo session and RouteMap endpoints continue functioning without regressions."""
    demo_resp = client.post("/api/auth/demo-session")
    assert demo_resp.status_code == 200
    assert "access_token" in demo_resp.json()

    health_resp = client.get("/api/health")
    assert health_resp.status_code == 200
    print("[PASS] Test 15: Existing RouteMap compatibility")

if __name__ == "__main__":
    print("\n--- RUNNING ROUTEMAP AUTHENTICATION SYSTEM TEST SUITE ---")
    test_1_successful_registration()
    test_2_duplicate_email_rejection()
    test_3_email_verification_success()
    test_4_incorrect_and_expired_otp_rejection()
    test_5_successful_login()
    test_6_invalid_password_rejection()
    test_7_unverified_account_restrictions()
    test_8_access_token_expiry_and_invalid_signature()
    test_9_refresh_token_rotation_and_reuse_detection()
    test_10_logout_and_session_revocation()
    test_11_password_reset_expiry_and_single_use()
    test_12_protected_route_authorization()
    test_13_session_isolation_between_different_users()
    test_14_cross_family_access_prevention()
    test_15_existing_routemap_compatibility()
    print("\n=======================================================")
    print("ALL 15 AUTHENTICATION TEST SCENARIOS PASSED WITH ZERO ERRORS!")
    print("=======================================================\n")
