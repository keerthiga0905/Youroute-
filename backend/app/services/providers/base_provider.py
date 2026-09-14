from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseCrimeDataProvider(ABC):
    @abstractmethod
    def get_crime_density(self, lat: float, lng: float) -> Dict[str, Any]:
        """Returns crime density, historical incident rate, and recent counts."""
        pass

class BaseWeatherDataProvider(ABC):
    @abstractmethod
    async def get_weather(self, lat: float, lng: float) -> Dict[str, Any]:
        """Returns weather condition, temperature, rainfall, and visibility."""
        pass

class BaseRoadDataProvider(ABC):
    @abstractmethod
    def get_road_metadata(self, lat: float, lng: float) -> Dict[str, Any]:
        """Returns road type, lighting availability, and road isolation factor."""
        pass

class BaseActivityDataProvider(ABC):
    @abstractmethod
    def get_activity_level(self, lat: float, lng: float, hour: int) -> Dict[str, Any]:
        """Returns pedestrian activity, business density, and public transit proximity."""
        pass
