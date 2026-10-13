import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_token,
    generate_otp,
    hash_otp,
    verify_otp,
    generate_reset_token,
    generate_public_user_id,
)
from app.database.models import User, UserSession, EmailVerificationOTP, PasswordResetToken
from app.schemas.schemas import (
    UserRegister,
    UserVerifyEmail,
    ResendVerificationRequest,
    UserLogin,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserResponse,
    AuthResponse,
    Token,
    SessionResponse,
    UserUpdatePriority
)
from app.services.email_service import email_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# Common weak passwords to reject
COMMON_PASSWORDS = {
    "password12345",
    "password123456",
    "123456789012",
    "qwertyuiopas",
    "admin1234567",
    "route12345678",
    "password!12345",
    "letmein123456"
}

def validate_password_strength(password: str) -> None:
    """
    Enforces password policy:
    - Minimum 12 characters
    - Not in common passwords list
    - Must contain mixed case and either number or special symbol
    """
    if len(password) < 12:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 12 characters long."
        )
    if password.lower() in COMMON_PASSWORDS:
        raise HTTPException(
            status_code=400,
            detail="Password is too common and easily compromised. Please choose a stronger password."
        )
    if not (re.search(r'[a-z]', password) and re.search(r'[A-Z]', password) and (re.search(r'\d', password) or re.search(r'[^A-Za-z0-9]', password))):
        raise HTTPException(
            status_code=400,
            detail="Password must contain lowercase, uppercase, and at least one number or special symbol."
        )

def serialize_user(user: User) -> UserResponse:
    """Helper to convert SQLAlchemy User into UserResponse schema."""
    return UserResponse(
        id=user.id,
        user_id=user.user_uuid or str(user.id),
        public_user_id=user.public_user_id or f"RM-{user.id:08X}",
        email=user.email,
        full_name=user.full_name or "",
        phone=user.phone,
        is_verified=bool(user.is_verified),
        preferred_priority=user.preferred_priority or "balanced",
        created_at=user.created_at
    )

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """
    Validates the bearer access token on every protected request.
    Rejects expired, malformed, or unauthorized tokens.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Access token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sub = payload["sub"]
    # Look up by immutable user_uuid first, then fallback to email for legacy tokens
    user = db.query(User).filter(User.user_uuid == sub).first()
    if not user:
        user = db.query(User).filter(User.email == sub).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )

    return user

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserRegister, db: Session = Depends(get_db)):
    """
    Registers a new user account:
    - Validates email format and normalizes it
    - Validates password policy (12+ characters, complexity, reject weak)
    - Validates confirm_password match
    - Generates permanent immutable User UUID and public family connection ID
    - Hashes password using Argon2id
    - Generates secure 6-digit OTP and delivers via SMTP
    """
    normalized_email = user_in.email.strip().lower()
    
    # 1. Email format check
    email_regex = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    if not re.match(email_regex, normalized_email):
        raise HTTPException(status_code=400, detail="Invalid email format.")

    # 2. Duplicate account check
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered.")

    # 3. Password matching and strength validation
    if user_in.confirm_password and user_in.password != user_in.confirm_password:
        raise HTTPException(status_code=400, detail="Password and confirm password do not match.")

    validate_password_strength(user_in.password)

    # 4. Create new user with permanent identifiers
    new_user = User(
        user_uuid=str(uuid.uuid4()),
        public_user_id=generate_public_user_id(),
        email=normalized_email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name.strip(),
        phone=user_in.phone.strip() if user_in.phone else None,
        is_verified=False,
        is_active=True,
        failed_login_attempts=0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 5. Generate cryptographically random 6-digit OTP
    otp = generate_otp()
    otp_hash = hash_otp(otp, normalized_email)
    expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    otp_record = EmailVerificationOTP(
        user_id=new_user.id,
        otp_hash=otp_hash,
        attempts=0,
        expires_at=expires_at
    )
    db.add(otp_record)
    db.commit()

    # 6. Deliver verification email
    delivery_status = email_service.send_verification_otp(
        recipient_email=normalized_email,
        recipient_name=new_user.full_name,
        otp=otp,
        expire_minutes=settings.OTP_EXPIRE_MINUTES
    )

    return {
        "message": "Registration successful! A 6-digit verification code has been sent to your email address.",
        "email": normalized_email,
        "user_id": new_user.user_uuid,
        "public_user_id": new_user.public_user_id,
        "email_delivery": delivery_status
    }

@router.post("/verify-email", response_model=AuthResponse)
def verify_email(payload: UserVerifyEmail, request: Request, db: Session = Depends(get_db)):
    """
    Verifies the 6-digit OTP, marks account verified, and issues the first session tokens.
    """
    normalized_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or verification code.")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Account is already verified. Please log in.")

    # Find the most recent active OTP record
    otp_record = db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.user_id == user.id,
        EmailVerificationOTP.consumed_at.is_(None)
    ).order_by(EmailVerificationOTP.created_at.desc()).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="No active verification code found. Please request a new one.")

    # Check attempt limit (max 5)
    if otp_record.attempts >= 5:
        raise HTTPException(
            status_code=400,
            detail="Maximum verification attempts exceeded. Please request a new verification code."
        )

    # Check expiration
    if datetime.utcnow() > otp_record.expires_at:
        raise HTTPException(
            status_code=400,
            detail="Verification code has expired. Please request a new code."
        )

    # Check OTP hash
    otp_record.attempts += 1
    if not verify_otp(payload.otp.strip(), otp_record.otp_hash, normalized_email):
        db.commit()
        remaining = 5 - otp_record.attempts
        raise HTTPException(
            status_code=400,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining."
        )

    # Mark OTP consumed and user verified
    otp_record.consumed_at = datetime.utcnow()
    user.is_verified = True
    db.commit()

    # Create initial authenticated session
    session_uuid = str(uuid.uuid4())
    refresh_token = generate_refresh_token()
    refresh_hash = hash_token(refresh_token)
    session_expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("User-Agent", "Web Browser")

    new_session = UserSession(
        session_uuid=session_uuid,
        user_id=user.id,
        refresh_token_hash=refresh_hash,
        device_info=user_agent[:250],
        ip_address=client_ip,
        is_revoked=False,
        expires_at=session_expires_at,
        last_used_at=datetime.utcnow()
    )
    db.add(new_session)
    db.commit()

    # Issue short-lived access token (15 mins)
    access_token = create_access_token(
        user_uuid=user.user_uuid,
        extra_claims={"sid": session_uuid}
    )

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        session_id=session_uuid,
        user=serialize_user(user)
    )

@router.post("/resend-verification")
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    """
    Resends a fresh OTP code with rate limiting (60s minimum interval).
    Protects user privacy by returning a uniform success message.
    """
    normalized_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    generic_response = {
        "message": "If an account with that email exists and is unverified, a new verification code has been sent."
    }

    if not user or user.is_verified:
        return generic_response

    # Rate limiting: check recent OTP within 60s
    recent_otp = db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.user_id == user.id,
        EmailVerificationOTP.created_at >= datetime.utcnow() - timedelta(seconds=60)
    ).first()

    if recent_otp:
        raise HTTPException(
            status_code=429,
            detail="Please wait at least 60 seconds before requesting another verification code."
        )

    # Invalidate old unconsumed OTPs
    db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.user_id == user.id,
        EmailVerificationOTP.consumed_at.is_(None)
    ).update({"consumed_at": datetime.utcnow()})

    # Generate and store new OTP
    otp = generate_otp()
    otp_hash = hash_otp(otp, normalized_email)
    expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    new_otp = EmailVerificationOTP(
        user_id=user.id,
        otp_hash=otp_hash,
        attempts=0,
        expires_at=expires_at
    )
    db.add(new_otp)
    db.commit()

    delivery_status = email_service.send_verification_otp(
        recipient_email=user.email,
        recipient_name=user.full_name or "Explorer",
        otp=otp,
        expire_minutes=settings.OTP_EXPIRE_MINUTES
    )

    return {
        "message": "A fresh 6-digit verification code has been dispatched to your email address.",
        "email_delivery": delivery_status
    }

@router.post("/login", response_model=AuthResponse)
def login_user(credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    """
    Authenticates user, verifies password via Argon2id, checks verification status,
    applies rate limiting / lockout protection, and generates session + tokens.
    """
    normalized_email = credentials.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    # Generic credential error message
    invalid_creds_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not user:
        raise invalid_creds_exc

    # Check account temporary lockout
    if user.locked_until and user.locked_until > datetime.utcnow():
        diff = int((user.locked_until - datetime.utcnow()).total_seconds() / 60) + 1
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is temporarily locked due to repeated failed logins. Please try again in {diff} minute(s)."
        )

    # Verify password hash
    if not verify_password(credentials.password, user.hashed_password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= settings.RATE_LIMIT_LOGIN_ATTEMPTS:
            user.locked_until = datetime.utcnow() + timedelta(minutes=settings.LOCKOUT_MINUTES)
        db.commit()
        raise invalid_creds_exc

    # Check if account is active
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated. Please contact support.")

    # Check email verification status
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your email address has not been verified. Please complete email verification.",
            headers={"X-Requires-Verification": "true"}
        )

    # Reset failed login count upon successful authentication
    user.failed_login_attempts = 0
    user.locked_until = None

    # Determine session expiration based on remember_me
    days_to_expire = 30 if credentials.remember_me else settings.REFRESH_TOKEN_EXPIRE_DAYS
    session_expires_at = datetime.utcnow() + timedelta(days=days_to_expire)

    session_uuid = str(uuid.uuid4())
    refresh_token = generate_refresh_token()
    refresh_hash = hash_token(refresh_token)

    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("User-Agent", "Web Browser")

    new_session = UserSession(
        session_uuid=session_uuid,
        user_id=user.id,
        refresh_token_hash=refresh_hash,
        device_info=user_agent[:250],
        ip_address=client_ip,
        is_revoked=False,
        expires_at=session_expires_at,
        last_used_at=datetime.utcnow()
    )
    db.add(new_session)
    db.commit()

    # Issue short-lived access token
    access_token = create_access_token(
        user_uuid=user.user_uuid,
        extra_claims={"sid": session_uuid}
    )

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        session_id=session_uuid,
        user=serialize_user(user)
    )

@router.post("/refresh", response_model=AuthResponse)
def refresh_session_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Rotates refresh token and issues a new access token.
    Detects reuse of revoked tokens and immediately invalidates all user sessions.
    """
    token_hash = hash_token(payload.refresh_token.strip())

    session = db.query(UserSession).filter(UserSession.refresh_token_hash == token_hash).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session refresh token."
        )

    # Reuse detection: if a revoked refresh token is presented, trigger safety lockout
    if session.is_revoked:
        db.query(UserSession).filter(UserSession.user_id == session.user_id).update({"is_revoked": True})
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked. Security alert: Please log in again."
        )

    if datetime.utcnow() > session.expires_at:
        session.is_revoked = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again."
        )

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is invalid.")

    # Refresh token rotation: issue new refresh token and update hash
    new_refresh_token = generate_refresh_token()
    session.refresh_token_hash = hash_token(new_refresh_token)
    session.last_used_at = datetime.utcnow()
    db.commit()

    # Issue fresh access token
    new_access_token = create_access_token(
        user_uuid=user.user_uuid,
        extra_claims={"sid": session.session_uuid}
    )

    return AuthResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        session_id=session.session_uuid,
        user=serialize_user(user)
    )

@router.post("/logout")
def logout_current_session(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Revokes the current session's refresh token and ends the session.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_access_token(token)
        if payload and "sid" in payload:
            session_uuid = payload["sid"]
            session = db.query(UserSession).filter(UserSession.session_uuid == session_uuid).first()
            if session:
                session.is_revoked = True
                db.commit()

    return {"message": "Successfully logged out from current session."}

@router.post("/logout-all")
def logout_all_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Revokes all active sessions for the current user across all devices.
    """
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_revoked == False
    ).update({"is_revoked": True})
    db.commit()

    return {"message": "Successfully revoked all sessions across all devices."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile and permanent identifiers."""
    return serialize_user(current_user)

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Initiates password reset flow:
    - Normalizes email
    - Sends single-use secure reset token via email
    - Uniform response prevents email enumeration
    """
    normalized_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    generic_msg = {
        "message": "If an account exists with that email address, password reset instructions have been dispatched."
    }

    if not user or not user.is_active or not user.is_verified:
        return generic_msg

    # Invalidate prior active reset tokens
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.consumed_at.is_(None)
    ).update({"consumed_at": datetime.utcnow()})

    # Generate single-use cryptographically secure reset token
    raw_token = generate_reset_token()
    token_hash = hash_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)

    reset_record = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at
    )
    db.add(reset_record)
    db.commit()

    email_service.send_password_reset_email(
        recipient_email=user.email,
        recipient_name=user.full_name or "Explorer",
        reset_token=raw_token,
        expire_minutes=settings.RESET_TOKEN_EXPIRE_MINUTES
    )

    return generic_msg

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Validates reset token, validates new password strength, updates password with Argon2id,
    invalidates reset token, and revokes all active sessions for security.
    """
    # 1. Validate matching and password strength
    if payload.confirm_password and payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirmation do not match.")

    validate_password_strength(payload.new_password)

    # 2. Look up token by SHA-256 hash
    token_hash = hash_token(payload.token.strip())
    reset_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.consumed_at.is_(None)
    ).first()

    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or already consumed password reset token.")

    if datetime.utcnow() > reset_record.expires_at:
        raise HTTPException(status_code=400, detail="Password reset token has expired. Please request a new one.")

    user = db.query(User).filter(User.id == reset_record.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User account not found.")

    # 3. Update password hash with Argon2id
    user.hashed_password = get_password_hash(payload.new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    reset_record.consumed_at = datetime.utcnow()

    # 4. Revoke all active sessions (security mandate after password change)
    db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_revoked == False
    ).update({"is_revoked": True})

    db.commit()

    # 5. Security notification email
    email_service.send_password_changed_notification(user.email, user.full_name or "User")

    return {
        "message": "Password successfully reset. All active sessions have been terminated. Please log in with your new password."
    }

@router.get("/sessions", response_model=List[SessionResponse])
def get_active_sessions(
    current_user: User = Depends(get_current_user),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Returns list of active login sessions for the current user.
    """
    current_sid = None
    if authorization and authorization.startswith("Bearer "):
        payload = decode_access_token(authorization.split(" ")[1])
        if payload:
            current_sid = payload.get("sid")

    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_revoked == False,
        UserSession.expires_at > datetime.utcnow()
    ).order_by(UserSession.last_used_at.desc()).all()

    return [
        SessionResponse(
            session_id=s.session_uuid,
            device_info=s.device_info or "Unknown Device",
            ip_address=s.ip_address,
            created_at=s.created_at,
            last_used_at=s.last_used_at,
            is_current=(s.session_uuid == current_sid)
        )
        for s in sessions
    ]

@router.delete("/sessions/{session_id}")
def revoke_specific_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allows a user to revoke a specific active device session.
    """
    session = db.query(UserSession).filter(
        UserSession.session_uuid == session_id,
        UserSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found or already revoked.")

    session.is_revoked = True
    db.commit()

    return {"message": "Session successfully revoked."}

@router.put("/priority", response_model=UserResponse)
def update_priority(
    payload: UserUpdatePriority,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Updates user route preference priority."""
    current_user.preferred_priority = payload.preferred_priority
    db.commit()
    db.refresh(current_user)
    return serialize_user(current_user)

@router.delete("/account")
def delete_user_account(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Deletes user account and associated personal data."""
    db.delete(current_user)
    db.commit()
    return {"message": "Account and associated data deleted successfully."}

@router.post("/demo-session", response_model=Token)
def create_demo_session(request: Request, db: Session = Depends(get_db)):
    """
    Development endpoint for quick testing: creates or returns a verified demo session.
    """
    demo_email = "demo@routemap.ai"
    user = db.query(User).filter(User.email == demo_email).first()
    if not user:
        user = User(
            user_uuid=str(uuid.uuid4()),
            public_user_id="RM-DEMOUSER",
            email=demo_email,
            full_name="Demo Explorer",
            phone="+91 98765 43210",
            hashed_password=get_password_hash("DemoPass123!"),
            is_verified=True,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.is_verified = True
        db.commit()

    session_uuid = str(uuid.uuid4())
    refresh_token = generate_refresh_token()
    refresh_hash = hash_token(refresh_token)

    new_session = UserSession(
        session_uuid=session_uuid,
        user_id=user.id,
        refresh_token_hash=refresh_hash,
        device_info="Demo Session",
        ip_address=request.client.host if request.client else "127.0.0.1",
        is_revoked=False,
        expires_at=datetime.utcnow() + timedelta(days=7),
        last_used_at=datetime.utcnow()
    )
    db.add(new_session)
    db.commit()

    access_token = create_access_token(user.user_uuid, extra_claims={"sid": session_uuid})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "session_id": session_uuid,
        "user": serialize_user(user)
    }
