from fastapi import APIRouter, Query, HTTPException
import httpx
from typing import List, Optional
from app.services.tn_geofence_service import tn_geofence

router = APIRouter(prefix="", tags=["Geocoding"])

@router.get("/geocode")
async def geocode(q: str = Query(..., description="Location search text")):
    """
    Search location and return formatted address, lat, lng restricted to Tamil Nadu, India.
    """
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Search query is required.")

    query = q.strip()
    if "Tamil Nadu" not in query and "TN" not in query:
        query = f"{query}, Tamil Nadu, India"

    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": query,
        "format": "json",
        "addressdetails": 1,
        "limit": 10,
        "countrycodes": "in"
    }
    headers = {
        "User-Agent": "SafeRoute-TN-Navigation-Engine/1.0"
    }

    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                results = resp.json()
                valid_tn_items = []

                for r in results:
                    lat = float(r.get("lat", 0))
                    lng = float(r.get("lon", 0))
                    addr = r.get("address", {})
                    state = addr.get("state", "")

                    if state == "Tamil Nadu" or tn_geofence.is_inside_tamil_nadu(lat, lng):
                        display = r.get("display_name", "")
                        clean_title = r.get("name") or addr.get("road") or addr.get("suburb") or addr.get("city") or display.split(",")[0]
                        valid_tn_items.append({
                            "place_id": str(r.get("place_id")),
                            "name": clean_title,
                            "formatted_address": display,
                            "district": addr.get("county") or addr.get("state_district") or addr.get("city") or "Tamil Nadu",
                            "state": "Tamil Nadu",
                            "latitude": lat,
                            "longitude": lng
                        })

                if not valid_tn_items:
                    # Retry with Photon API
                    photon_url = f"https://photon.komoot.io/api/?q={query}&limit=10"
                    p_resp = await client.get(photon_url, headers=headers)
                    if p_resp.status_code == 200:
                        p_data = p_resp.json()
                        for feat in p_data.get("features", []):
                            props = feat.get("properties", {})
                            coords = feat.get("geometry", {}).get("coordinates", [0, 0])
                            p_lat, p_lng = coords[1], coords[0]
                            if props.get("state") == "Tamil Nadu" or tn_geofence.is_inside_tamil_nadu(p_lat, p_lng):
                                name = props.get("name") or props.get("street") or "Tamil Nadu Location"
                                formatted = ", ".join([v for v in [name, props.get("city"), props.get("district"), "Tamil Nadu, India"] if v])
                                valid_tn_items.append({
                                    "place_id": str(props.get("osm_id", "p_1")),
                                    "name": name,
                                    "formatted_address": formatted,
                                    "district": props.get("district") or props.get("city") or "Tamil Nadu",
                                    "state": "Tamil Nadu",
                                    "latitude": p_lat,
                                    "longitude": p_lng
                                })

                return {"query": q, "count": len(valid_tn_items), "results": valid_tn_items}
        except Exception as e:
            print(f"[Geocode Error]: {e}")
            raise HTTPException(status_code=500, detail=f"Geocoding failed: {str(e)}")

@router.get("/reverse-geocode")
async def reverse_geocode(lat: float = Query(...), lng: float = Query(...)):
    """
    Convert lat/lng to exact full formatted Tamil Nadu address.
    """
    if not tn_geofence.is_inside_tamil_nadu(lat, lng):
        raise HTTPException(status_code=400, detail="Requested coordinates are outside Tamil Nadu.")

    url = "https://nominatim.openstreetmap.org/reverse"
    params = {
        "lat": lat,
        "lon": lng,
        "format": "json",
        "addressdetails": 1
    }
    headers = {"User-Agent": "SafeRoute-TN-Navigation-Engine/1.0"}

    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                addr = data.get("address", {})
                display_name = data.get("display_name", "")
                district = addr.get("county") or addr.get("state_district") or addr.get("city") or tn_geofence.resolve_district(lat, lng)

                return {
                    "latitude": lat,
                    "longitude": lng,
                    "formatted_address": display_name or f"Location in {district}, Tamil Nadu, India",
                    "district": district,
                    "state": "Tamil Nadu",
                    "country": "India"
                }
        except Exception as e:
            print(f"[Reverse Geocode Error]: {e}")

    district = tn_geofence.resolve_district(lat, lng)
    return {
        "latitude": lat,
        "longitude": lng,
        "formatted_address": f"Coordinates ({lat:.4f}, {lng:.4f}), {district}, Tamil Nadu, India",
        "district": district,
        "state": "Tamil Nadu",
        "country": "India"
    }
