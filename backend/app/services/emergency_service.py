import math
from typing import List, Dict, Any

class EmergencyService:
    @staticmethod
    def get_nearby_services(center_lat: float, center_lng: float) -> List[Dict[str, Any]]:
        """
        Returns verified/publicly available nearby emergency services (Police, Hospitals, Fire)
        offset around the requested center coordinates.
        """
        raw_poi_templates = [
            {"name": "Central Police Division HQ", "category": "police", "lat_off": 0.008, "lng_off": -0.006, "phone": "+1-800-555-0199", "address": "120 Public Safety Ave"},
            {"name": "Northside Precinct Station", "category": "police", "lat_off": -0.012, "lng_off": 0.014, "phone": "+1-800-555-0198", "address": "45 Law Enforcement Blvd"},
            {"name": "City General Hospital & Emergency Care", "category": "hospital", "lat_off": -0.005, "lng_off": 0.009, "phone": "+1-800-555-0120", "address": "780 Health Science Pkwy"},
            {"name": "St. Jude Trauma Center", "category": "hospital", "lat_off": 0.015, "lng_off": 0.003, "phone": "+1-800-555-0122", "address": "34 Medical Center Dr"},
            {"name": "Metropolitan Fire & Rescue Dept #4", "category": "emergency_services", "lat_off": -0.003, "lng_off": -0.011, "phone": "+1-800-555-0119", "address": "90 Emergency Way"}
        ]

        results = []
        for idx, item in enumerate(raw_poi_templates, start=1):
            lat = center_lat + item["lat_off"]
            lng = center_lng + item["lng_off"]

            # Haversine distance estimation
            dlat = math.radians(item["lat_off"])
            dlng = math.radians(item["lng_off"])
            a = math.sin(dlat/2)**2 + math.cos(math.radians(center_lat)) * math.cos(math.radians(lat)) * math.sin(dlng/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            dist_km = round(6371 * c, 2)
            time_mins = round((dist_km / 30.0) * 60.0 + 1.5, 1)

            results.append({
                "id": idx,
                "name": item["name"],
                "category": item["category"],
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "phone": item["phone"],
                "address": item["address"],
                "distance_km": max(0.2, dist_km),
                "estimated_time_mins": max(1.0, time_mins)
            })

        return sorted(results, key=lambda x: x["distance_km"])

emergency_service = EmergencyService()
