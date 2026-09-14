# pyrefly: ignore [missing-import]
import httpx
from typing import Dict, Any
from app.services.providers.base_provider import (
    BaseCrimeDataProvider,
    BaseWeatherDataProvider,
    BaseRoadDataProvider,
    BaseActivityDataProvider
)

class DemoCrimeDataProvider(BaseCrimeDataProvider):
    """
    Demo Crime Data Provider.
    Source: Synthetic Open-Safety Dataset v1.0
    Coverage: Urban Corridors & Micro-Grid Density
    """
    def get_crime_density(self, lat: float, lng: float) -> Dict[str, Any]:
        # Spatial deterministic pseudo-random incident estimation based on lat/lng micro-grid
        grid = int((abs(lat) * 100 + abs(lng) * 100) % 10)
        base_rate = 15.0 + grid * 4.5
        return {
            "source": "Demo Open-Safety Grid Dataset",
            "historical_crime_rate": base_rate,
            "recent_crime_count": int(base_rate * 0.2),
            "crime_density": round(base_rate * 0.4, 1),
            "data_quality": "Good"
        }

class DemoWeatherDataProvider(BaseWeatherDataProvider):
    """
    Demo/Live Weather Data Provider (OpenWeatherMap API fallback).
    """
    def __init__(self, api_key: str = ""):
        self.api_key = api_key

    async def get_weather(self, lat: float, lng: float) -> Dict[str, Any]:
        if self.api_key:
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={self.api_key}&units=metric"
                    res = await client.get(url)
                    if res.status_code == 200:
                        d = res.json()
                        rain = d.get("rain", {}).get("1h", 0.0)
                        vis = d.get("visibility", 10000) / 1000.0
                        temp = d.get("main", {}).get("temp", 26.0)
                        cond = d.get("weather", [{}])[0].get("main", "Clear")
                        return {
                            "condition": cond,
                            "temperature": round(temp, 1),
                            "rainfall": round(rain, 1),
                            "visibility": round(vis, 1),
                            "source": "OpenWeatherMap API",
                            "data_quality": "Good"
                        }
            except Exception:
                pass

        return {
            "condition": "Clear",
            "temperature": 26.5,
            "rainfall": 0.0,
            "visibility": 10.0,
            "source": "Demo Environmental Data Provider",
            "data_quality": "Good"
        }

class DemoRoadDataProvider(BaseRoadDataProvider):
    """
    Demo Road & Infrastructure Provider. Handles missing street light dataset scenarios.
    """
    def get_road_metadata(self, lat: float, lng: float) -> Dict[str, Any]:
        # Handle missing lighting dataset for certain segments
        grid = int((abs(lat) * 1000 + abs(lng) * 1000) % 7)
        if grid == 3:
            # Missing lighting data scenario
            return {
                "road_type": 3,
                "street_lighting": "Unknown",
                "street_light_density": -1, # missing flag
                "road_isolation": 0.5,
                "data_quality": "Limited"
            }

        lighting_density = 85.0 if grid in [0, 1, 2] else 45.0
        return {
            "road_type": 2,
            "street_lighting": "High" if lighting_density > 70 else "Medium",
            "street_light_density": lighting_density,
            "road_isolation": 0.2,
            "data_quality": "Good"
        }

class DemoActivityDataProvider(BaseActivityDataProvider):
    """
    Demo Foot Traffic & Public Transit Activity Provider.
    """
    def get_activity_level(self, lat: float, lng: float, hour: int) -> Dict[str, Any]:
        is_night = 1 if (hour < 6 or hour >= 21) else 0
        grid = int((abs(lat) * 50 + abs(lng) * 50) % 5)
        base_activity = 75.0 if grid in [0, 1] else 35.0
        active_level = base_activity * 0.3 if is_night else base_activity

        return {
            "pedestrian_activity": round(active_level, 1),
            "business_density": round(active_level * 0.9, 1),
            "public_transit_distance": 350.0 if grid in [0, 1] else 1400.0,
            "police_station_distance": 800.0 if grid in [0, 1] else 2800.0,
            "data_quality": "Good"
        }

# Provider instances
crime_provider = DemoCrimeDataProvider()
weather_provider = DemoWeatherDataProvider()
road_provider = DemoRoadDataProvider()
activity_provider = DemoActivityDataProvider()
