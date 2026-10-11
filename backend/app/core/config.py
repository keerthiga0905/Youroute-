import os
from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment variables from .env file
load_dotenv()


class Settings(BaseModel):
    PROJECT_NAME: str = "SafeRoute AI - Personal Safety Risk Predictor"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security & Auth Settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "saferoute_super_secret_key_2026_change_in_production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15)) # 15 minutes
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7)) # 7 days
    OTP_EXPIRE_MINUTES: int = int(os.getenv("OTP_EXPIRE_MINUTES", 5)) # 5 minutes
    RESET_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", 15)) # 15 minutes
    TOKEN_ISSUER: str = os.getenv("TOKEN_ISSUER", "RouteMap-Auth")
    TOKEN_AUDIENCE: str = os.getenv("TOKEN_AUDIENCE", "RouteMap-App")
    RATE_LIMIT_LOGIN_ATTEMPTS: int = int(os.getenv("RATE_LIMIT_LOGIN_ATTEMPTS", 5))
    LOCKOUT_MINUTES: int = int(os.getenv("LOCKOUT_MINUTES", 15))
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./saferoute.db")
    
    # External APIs
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "")

    # Gmail SMTP Configuration
    GMAIL_USER: str = os.getenv("GMAIL_USER", os.getenv("SMTP_USER", ""))
    GMAIL_APP_PASSWORD: str = os.getenv("GMAIL_APP_PASSWORD", os.getenv("SMTP_PASSWORD", ""))
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    LOCATION_REQUEST_EXPIRE_MINUTES: int = int(os.getenv("LOCATION_REQUEST_EXPIRE_MINUTES", 30))
    
    # Configuration Flags
    DEMO_MODE: bool = True

settings = Settings()

