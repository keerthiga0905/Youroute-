import os
from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment variables from .env file
load_dotenv()


class Settings(BaseModel):
    PROJECT_NAME: str = "SafeRoute AI - Personal Safety Risk Predictor"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "saferoute_super_secret_key_2026_change_in_production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
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

