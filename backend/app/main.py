import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import (
    admin,
    auth,
    emergency,
    family,
    geocode,
    journeys,
    location_share,
    model,
    navigation,
    routes,
    safety,
    saved_places,
    trips,
    weather,
)
from app.core.config import settings
from app.core.database import Base, engine
from app.database import models as _models  # noqa: F401 (registers models with Base metadata)
from app.database.journey_seeder import run_journey_seeder
from app.database.migration import run_auth_migrations
from app.database.tn_safety_data_seeder import run_seeder

# Initialize Database tables, auth schema, and seed datasets
Base.metadata.create_all(bind=engine)
try:
    run_auth_migrations()
except Exception as e:  # noqa: BLE001
    print(f"[Migration Warning]: {e}")
try:
    run_seeder()
except Exception as e:  # noqa: BLE001
    print(f"[Seeder Warning]: {e}")
try:
    run_journey_seeder()
except Exception as e:  # noqa: BLE001
    print(f"[Journey Seeder Warning]: {e}")

app = FastAPI(
    title="SafeRoute AI — Personal Safety Route Engine",
    version=settings.VERSION,
    description="Backend API service providing segment risk prediction and consumer route recommendations."
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup evidence upload directory and static mounting
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scratch", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/scratch/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Register API Routers
app.include_router(geocode.router, prefix=settings.API_V1_STR)
app.include_router(routes.router, prefix=settings.API_V1_STR)
app.include_router(safety.router, prefix=settings.API_V1_STR)
app.include_router(navigation.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(trips.router, prefix=settings.API_V1_STR)
app.include_router(saved_places.router, prefix=settings.API_V1_STR)
app.include_router(emergency.router, prefix=settings.API_V1_STR)
app.include_router(weather.router, prefix=settings.API_V1_STR)
app.include_router(model.router, prefix=settings.API_V1_STR)
app.include_router(family.router, prefix=settings.API_V1_STR)
app.include_router(location_share.router, prefix=settings.API_V1_STR)
app.include_router(journeys.router, prefix=settings.API_V1_STR)



@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "SafeRoute AI Service",
        "version": settings.VERSION,
        "demo_mode": True
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
