from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.database import models
from app.database.tn_safety_data_seeder import run_seeder
from app.api import auth, routes, trips, saved_places, emergency, weather, model, geocode, safety, navigation, admin, family

# Initialize Database tables and seed datasets
Base.metadata.create_all(bind=engine)
try:
    run_seeder()
except Exception as e:
    print(f"[Seeder Warning]: {e}")

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
