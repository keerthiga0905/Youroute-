from fastapi import APIRouter
from app.services.weather_service import weather_service
from app.schemas.schemas import WeatherSummary

router = APIRouter(prefix="/weather", tags=["Weather"])

@router.get("", response_model=WeatherSummary)
async def get_weather(lat: float, lng: float):
    weather = await weather_service.get_weather_for_location(lat, lng)
    return weather
