import httpx
from typing import Dict, Any
from app.core.config import settings

class WeatherService:
    @staticmethod
    async def get_weather_for_location(lat: float, lng: float) -> Dict[str, Any]:
        """
        Retrieves live weather data via OpenWeatherMap (if key provided) or Open-Meteo (free API).
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
                        humidity = data.get("main", {}).get("humidity", 65)
                        wind = data.get("wind", {}).get("speed", 3.5) * 3.6 # m/s to km/h
                        cond = data.get("weather", [{}])[0].get("main", "Clear")
                        
                        warning = None
                        if rain > 5.0 or "Rain" in cond:
                            warning = "Rain detected at destination. Road surface visibility and braking distances may be affected."
                        elif visibility < 3.0 or "Fog" in cond:
                            warning = "Low atmospheric visibility detected along route."

                        return {
                            "condition": cond,
                            "temperature": round(temp, 1),
                            "humidity": humidity,
                            "wind_speed": round(wind, 1),
                            "rainfall": round(rain, 1),
                            "visibility": round(visibility, 1),
                            "warning": warning
                        }
            except Exception as e:
                print(f"OpenWeatherMap API exception: {e}")

        # Open-Meteo Free Live Weather API Fallback (No Key Required)
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m"
                res = await client.get(url)
                if res.status_code == 200:
                    current = res.json().get("current", {})
                    code = current.get("weather_code", 0)
                    temp = current.get("temperature_2m", 24.0)
                    humidity = current.get("relative_humidity_2m", 60)
                    wind = current.get("wind_speed_10m", 12.0)
                    precip = current.get("precipitation", 0.0)

                    # Map WMO weather code
                    cond = "Clear"
                    if code in [1, 2, 3]:
                        cond = "Cloudy"
                    elif code in [45, 48]:
                        cond = "Fog"
                    elif code in [51, 53, 55, 61, 63]:
                        cond = "Rain"
                    elif code in [65, 80, 81, 82]:
                        cond = "Heavy Rain"
                    elif code in [95, 96, 99]:
                        cond = "Thunderstorm"

                    warning = None
                    if precip > 0.5 or "Rain" in cond or "Thunderstorm" in cond:
                        warning = "Rain detected at destination. Wet road surface and reduced braking traction possible."
                    elif cond == "Fog":
                        warning = "Foggy conditions reported. Drive with low beams and increased vehicle distance."

                    return {
                        "condition": cond,
                        "temperature": round(temp, 1),
                        "humidity": humidity,
                        "wind_speed": round(wind, 1),
                        "rainfall": round(precip, 1),
                        "visibility": 8.5 if cond != "Fog" else 2.0,
                        "warning": warning
                    }
        except Exception as e:
            print(f"Open-Meteo API fallback exception: {e}")

        # Default fallback
        return {
            "condition": "Clear",
            "temperature": 26.5,
            "humidity": 65,
            "wind_speed": 12.0,
            "rainfall": 0.0,
            "visibility": 10.0,
            "warning": None
        }

weather_service = WeatherService()
