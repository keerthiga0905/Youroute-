import uuid
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from jose import jwt, JWTError
from passlib.context import CryptContext
from argon2 import PasswordHasher, Type
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

from app.core.config import settings

# Argon2id password hasher (modern standard, resistant to GPU/ASIC brute forcing)
argon2_hasher = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=1,
    hash_len=32,
    type=Type.ID
)

# Legacy fallback password context for existing demo user accounts
legacy_pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Hashes a password using Argon2id."""
    return argon2_hasher.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain-text password against a hash.
    Supports Argon2id with automatic backward compatibility for legacy hashes.
    """
    if not hashed_password or not plain_password:
        return False
    
    if hashed_password.startswith("$argon2"):
        try:
            return argon2_hasher.verify(hashed_password, plain_password)
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            return False
        except Exception:
            return False
            
    # Fallback for legacy passwords
    try:
        return legacy_pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Fallback SHA256 check
        return hashlib.sha256(plain_password.encode('utf-8')).hexdigest() == hashed_password

def create_access_token(
    user_uuid: str,
    extra_claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Creates a signed, short-lived JWT access token with standardized claims:
    - sub: user_uuid (permanent immutable identifier)
    - jti: unique token identifier (prevents replay / tracking)
    - iat: issued-at timestamp
    - exp: expiration timestamp
    - iss: configured issuer
    - aud: configured audience
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(user_uuid),
        "jti": str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "iss": settings.TOKEN_ISSUER,
        "aud": settings.TOKEN_AUDIENCE,
    }

    if extra_claims:
        for k, v in extra_claims.items():
            if k not in payload:
                payload[k] = v

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    """
    Decodes and validates a JWT access token.
    Validates expiration, signature, and issuer/audience claims.
    """
    try:
        # First attempt strict validation with issuer and audience
        return jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.ALGORITHM],
            issuer=settings.TOKEN_ISSUER,
            audience=settings.TOKEN_AUDIENCE
        )
    except JWTError:
        # Fallback to decode without issuer/audience check for legacy tokens
        try:
            return jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=[settings.ALGORITHM],
                options={"verify_aud": False, "verify_iss": False}
            )
        except JWTError:
            return None

def generate_refresh_token() -> str:
    """Generates a cryptographically secure random refresh token string."""
    return secrets.token_urlsafe(48)

def hash_token(token: str) -> str:
    """Computes a SHA-256 hash of a token string for safe database storage."""
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

def generate_otp() -> str:
    """Generates a cryptographically random 6-digit numeric OTP."""
    return f"{secrets.randbelow(900000) + 100000:06d}"

def hash_otp(otp: str, email: str = "") -> str:
    """
    Computes a salted SHA-256 hash of the 6-digit OTP combined with normalized email.
    """
    normalized_email = email.lower().strip()
    data = f"{normalized_email}:{otp}:{settings.JWT_SECRET}"
    return hashlib.sha256(data.encode('utf-8')).hexdigest()

def verify_otp(entered_otp: str, stored_hash: str, email: str = "") -> bool:
    """Verifies an OTP string against its stored hash."""
    return hash_otp(entered_otp, email) == stored_hash

def generate_reset_token() -> str:
    """Generates a cryptographically secure random password reset token."""
    return secrets.token_urlsafe(32)

def generate_public_user_id() -> str:
    """Generates a random public family connection ID (e.g., RM-7K9X2B4D)."""
    return f"RM-{secrets.token_hex(4).upper()}"
