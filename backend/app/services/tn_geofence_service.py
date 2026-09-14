from typing import Tuple, Dict, Any
from shapely.geometry import Point, Polygon

# Accurate Tamil Nadu State Boundary Polygon (lat, lng)
TN_POLYGON_COORDS = [
    (13.48, 80.30), # Tiruvallur / Pulicat North
    (13.50, 79.90), # TN-AP border
    (13.25, 79.60), # Arakkonam / Chittoor border
    (12.95, 79.15), # Vellore North
    (12.85, 78.55), # Tirupattur North
    (12.72, 77.85), # Krishnagiri / Hosur border (Bangalore is north of this)
    (12.10, 77.70), # Dharmapuri West
    (11.95, 77.20), # Erode North / Karnataka border
    (11.60, 76.50), # Nilgiris / Mudumalai
    (11.45, 76.25), # Nilgiris West / Kerala border
    (11.00, 76.70), # Coimbatore West / Walayar border
    (10.60, 76.85), # Pollachi West
    (10.20, 77.15), # Valparai / Anamalai
    (9.75, 77.10),  # Theni / Kerala border
    (9.40, 77.25),  # Srivilliputhur / Cardamom Hills
    (8.80, 77.15),  # Tenkasi West
    (8.35, 77.55),  # Kanyakumari South-West
    (8.07, 77.55),  # Kanyakumari Tip (Cape Comorin)
    (8.15, 77.80),  # Kanyakumari East
    (9.25, 79.30),  # Rameshwaram / Dhanushkodi
    (9.90, 79.15),  # Mimisal Coast
    (10.80, 79.85), # Nagapattinam Coast
    (11.80, 79.85), # Cuddalore / Puducherry Coast
    (12.80, 80.25), # Chennai Coast
    (13.48, 80.30)  # Close loop
]

# Shapely Polygon object (using lng, lat order for spatial standard)
TN_POLYGON = Polygon([(lng, lat) for lat, lng in TN_POLYGON_COORDS])

# Major TN Districts
TN_DISTRICT_BOUNDS = [
    {"name": "Coimbatore", "lat_min": 10.75, "lat_max": 11.35, "lng_min": 76.65, "lng_max": 77.30},
    {"name": "Chennai", "lat_min": 12.80, "lat_max": 13.30, "lng_min": 80.00, "lng_max": 80.35},
    {"name": "Madurai", "lat_min": 9.70, "lat_max": 10.15, "lng_min": 77.80, "lng_max": 78.40},
    {"name": "Salem", "lat_min": 11.35, "lat_max": 12.00, "lng_min": 77.75, "lng_max": 78.60},
    {"name": "Tiruchirappalli", "lat_min": 10.50, "lat_max": 11.10, "lng_min": 78.40, "lng_max": 79.10},
    {"name": "Tiruppur", "lat_min": 10.70, "lat_max": 11.30, "lng_min": 77.20, "lng_max": 77.65},
    {"name": "Erode", "lat_min": 11.10, "lat_max": 11.85, "lng_min": 76.90, "lng_max": 77.80},
    {"name": "Nilgiris (Ooty)", "lat_min": 11.20, "lat_max": 11.70, "lng_min": 76.30, "lng_max": 77.00},
    {"name": "Thanjavur", "lat_min": 10.30, "lat_max": 11.10, "lng_min": 78.80, "lng_max": 79.50},
    {"name": "Tirunelveli", "lat_min": 8.30, "lat_max": 9.00, "lng_min": 77.20, "lng_max": 77.90},
    {"name": "Vellore", "lat_min": 12.70, "lat_max": 13.20, "lng_min": 78.80, "lng_max": 79.50},
    {"name": "Thoothukudi", "lat_min": 8.40, "lat_max": 9.30, "lng_min": 77.80, "lng_max": 78.40},
    {"name": "Dindigul", "lat_min": 10.00, "lat_max": 10.70, "lng_min": 77.40, "lng_max": 78.20},
    {"name": "Karur", "lat_min": 10.70, "lat_max": 11.10, "lng_min": 77.90, "lng_max": 78.40},
    {"name": "Namakkal", "lat_min": 11.00, "lat_max": 11.50, "lng_min": 77.80, "lng_max": 78.40},
]

class TNGeofenceService:
    @staticmethod
    def is_inside_tamil_nadu(lat: float, lng: float) -> bool:
        """
        Validates whether a coordinate point lies strictly within Tamil Nadu boundary polygon.
        """
        if lat is None or lng is None:
            return False
        pt = Point(lng, lat)
        return TN_POLYGON.contains(pt) or TN_POLYGON.touches(pt)

    @staticmethod
    def resolve_district(lat: float, lng: float) -> str:
        for d in TN_DISTRICT_BOUNDS:
            if d["lat_min"] <= lat <= d["lat_max"] and d["lng_min"] <= lng <= d["lng_max"]:
                return d["name"]
        return "Tamil Nadu Region"

    @staticmethod
    def validate_trip_coords(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> Tuple[bool, str]:
        if not TNGeofenceService.is_inside_tamil_nadu(origin_lat, origin_lng):
            return False, "SafeRoute currently supports routes within Tamil Nadu. Origin location is outside Tamil Nadu."
        if not TNGeofenceService.is_inside_tamil_nadu(dest_lat, dest_lng):
            return False, "SafeRoute currently supports routes within Tamil Nadu. Destination location is outside Tamil Nadu."
        return True, ""

tn_geofence = TNGeofenceService()
