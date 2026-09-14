import httpx
from typing import Dict, Any
from app.core.config import settings

class WeatherService:
    @staticmethod
    async def get_weather_for_location(lat: float, lng: float) -> Dict[str, Any]:
        """
        Retrieves live weather data if API key is provided, or returns realistic weather condition.
        """
        if settings.WEATHER_API_KEY:
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={settings.WEATHER_API_KEY}&units=metric"
                    res = await client.get(url)
                    if res.status_code == 200:
                        data = res.json()
                        rain = data.get("rain", {}).get("1h", 0.0)
                        visibility = data.get("visibility", 10000) / 1000.0 # to km
                        temp = data.get("main", {}).get("temp", 25.0)
                        cond = data.get("weather", [{}])[0].get("main", "Clear")
                        
                        warning = None
                        if rain > 5.0:
                            warning = "Moderate rain expected. Road surface visibility may be reduced."
                        elif visibility < 3.0:
                            warning = "Low atmospheric visibility detected."

                        return {
                            "condition": cond,
                            "temperature": round(temp, 1),
                            "rainfall": round(rain, 1),
                            "visibility": round(visibility, 1),
                            "warning": warning
                        }
            except Exception as e:
                print(f"Weather API exception: {e}")

        # Default realistic weather state for demo mode
        return {
            "condition": "Clear / Mild",
            "temperature": 27.5,
            "rainfall": 0.0,
            "visibility": 10.0,
            "warning": None
        }

weather_service = WeatherService()
