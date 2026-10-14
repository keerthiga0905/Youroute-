import math
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.core.database import get_db
from app.database.models import (
    User, Destination, DestinationImage, FavoriteDestination,
    PlannedJourneyTrip, PlannedJourneyStop
)
from app.schemas.schemas import (
    DestinationResponse, DestinationListResponse, DestinationImageSchema,
    MoodItemSchema, PlannedJourneyTripCreate, PlannedJourneyTripUpdate,
    PlannedJourneyTripResponse, PlannedJourneyStopResponse, FavoriteDestinationResponse
)
from app.api.auth import get_current_user, oauth2_scheme
from app.core.security import decode_access_token
from app.services.weather_service import weather_service

router = APIRouter(prefix="/journeys", tags=["Plan Journey"])

# -----------------------------------------------------------------------------
# AUTHENTICATION HELPERS
# -----------------------------------------------------------------------------
def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Allows anonymous browsing while attaching user identity if token is valid."""
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        if not payload or "sub" not in payload:
            return None
        sub = payload["sub"]
        user = db.query(User).filter(User.user_uuid == sub).first()
        if not user:
            user = db.query(User).filter(User.email == sub).first()
        if user and user.is_active:
            return user
        return None
    except Exception:
        return None

def calculate_distance_and_duration(lat1: float, lon1: float, lat2: float, lon2: float) -> tuple[float, float]:
    """
    Computes realistic road distance estimate (Haversine * road detour factor 1.25)
    and estimated driving time at ~50 km/h average speed.
    """
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    straight_line_km = R * c
    estimated_road_km = round(straight_line_km * 1.25, 1)
    estimated_duration_mins = round((estimated_road_km / 50.0) * 60.0, 0)
    return estimated_road_km, estimated_duration_mins

def enrich_destination(dest: Destination, favorite_ids: set) -> dict:
    """Enriches a Destination model instance with images and is_favorite state."""
    images = [
        {
            "id": img.id,
            "image_url": img.image_url,
            "caption": img.caption,
            "attribution": img.attribution,
            "source_url": img.source_url,
            "is_primary": img.is_primary
        }
        for img in (dest.images or [])
    ]
    if not images and dest.hero_image_url:
        images.append({
            "id": 0,
            "image_url": dest.hero_image_url,
            "caption": dest.name,
            "attribution": dest.source_attribution,
            "source_url": None,
            "is_primary": True
        })

    return {
        "id": dest.id,
        "name": dest.name,
        "slug": dest.slug,
        "country": dest.country,
        "state": dest.state,
        "city": dest.city,
        "travel_scope": dest.travel_scope,
        "category": dest.category,
        "sub_category": dest.sub_category,
        "supported_moods": dest.supported_moods or [],
        "description": dest.description,
        "why_recommended": dest.why_recommended,
        "latitude": dest.latitude,
        "longitude": dest.longitude,
        "hero_image_url": dest.hero_image_url,
        "best_season": dest.best_season,
        "typical_duration": dest.typical_duration,
        "approx_budget_tier": dest.approx_budget_tier,
        "approx_cost_per_day_inr": dest.approx_cost_per_day_inr,
        "opening_hours": dest.opening_hours,
        "accessibility_info": dest.accessibility_info,
        "official_website_url": dest.official_website_url,
        "source_attribution": dest.source_attribution,
        "is_popular": dest.is_popular,
        "is_featured": dest.is_featured,
        "is_hidden_gem": dest.is_hidden_gem,
        "is_favorite": (dest.id in favorite_ids),
        "images": images
    }

# -----------------------------------------------------------------------------
# 1. MOOD CATALOG
# -----------------------------------------------------------------------------
MOOD_DEFINITIONS = [
    {
        "id": "devotional",
        "title": "Devotional & Spiritual",
        "tagline": "Sacred Pilgrimages & Spiritual Retreats",
        "description": "Temples, sacred rivers, Jyotirlingas, Char Dham, monasteries, churches, mosques, and meditative sanctums.",
        "image_url": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80",
        "icon_name": "sparkles",
        "badge": "Special Focus"
    },
    {
        "id": "peaceful",
        "title": "Peaceful & Relaxing",
        "tagline": "Tranquil Sanctuaries & Wellness Escapes",
        "description": "Quiet lakeside retreats, Ayurvedic sanctuaries, silent meditation centers, and peaceful coastal getaways.",
        "image_url": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
        "icon_name": "lotus",
        "badge": "Relax"
    },
    {
        "id": "adventure",
        "title": "Adventure & Thrill",
        "tagline": "High-Adrenaline Mountain & River Thrills",
        "description": "White water rafting, high-altitude treks, paragliding, extreme sports, and canyoning.",
        "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
        "icon_name": "compass",
        "badge": "Active"
    },
    {
        "id": "nature",
        "title": "Nature & Mountains",
        "tagline": "Verdant Hill Stations & Forest Valleys",
        "description": "Emerald tea gardens, mist-clad peaks, pine forests, waterfalls, and pristine wildlife reserves.",
        "image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80",
        "icon_name": "mountain",
        "badge": "Scenic"
    },
    {
        "id": "beach",
        "title": "Beach & Ocean",
        "tagline": "Sun-Kissed Sands & Turquoise Waters",
        "description": "Pristine coastal beaches, tropical island atolls, sunset promenades, and calm ocean lagoons.",
        "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        "icon_name": "waves",
        "badge": "Coastal"
    },
    {
        "id": "romantic",
        "title": "Romantic Getaway",
        "tagline": "Enchanting Escapes for Two",
        "description": "Fairy-tale lakeside palaces, private backwater houseboats, cliffside sunsets, and candlelight dining.",
        "image_url": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80",
        "icon_name": "heart",
        "badge": "Romantic"
    },
    {
        "id": "family",
        "title": "Family Vacation",
        "tagline": "Memorable Experiences for All Ages",
        "description": "Illuminated royal palaces, zoological parks, botanical gardens, interactive museums, and amusement islands.",
        "image_url": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80",
        "icon_name": "users",
        "badge": "Family"
    },
    {
        "id": "friends",
        "title": "Friends Trip",
        "tagline": "Vibrant Coastlines & Group Adventures",
        "description": "Coastal beach hopping, buzzing markets, group trekking trails, water sports, and energetic beach shacks.",
        "image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80",
        "icon_name": "users-round",
        "badge": "Group"
    },
    {
        "id": "cultural",
        "title": "Cultural & Heritage",
        "tagline": "Ancient Empires & Living Traditions",
        "description": "UNESCO World Heritage sites, thousand-year-old stone architecture, royal forts, and cultural villages.",
        "image_url": "https://images.unsplash.com/photo-1600100397608-f010f4439c28?auto=format&fit=crop&w=800&q=80",
        "icon_name": "landmark",
        "badge": "Heritage"
    },
    {
        "id": "food",
        "title": "Food & Local Experiences",
        "tagline": "Authentic Regional Flavors & Street Trails",
        "description": "Legendary street food lanes, aromatic spice markets, midnight eateries, and rich regional culinary heritage.",
        "image_url": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80",
        "icon_name": "utensils",
        "badge": "Culinary"
    },
    {
        "id": "photography",
        "title": "Photography & Scenic Views",
        "tagline": "Epic Viewpoints & Golden Hour Panoramas",
        "description": "High-altitude crystal lakes, dramatic red rock canyons, misty river ghats, and star-studded skies.",
        "image_url": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80",
        "icon_name": "camera",
        "badge": "Visual"
    },
    {
        "id": "road_trip",
        "title": "Road Trip",
        "tagline": "Open Highways & Scenic Mountain Passes",
        "description": "Coastal ocean highways, thrilling 40-hairpin mountain loops, and high-altitude trans-Himalayan passes.",
        "image_url": "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80",
        "icon_name": "car",
        "badge": "Roads"
    }
]

@router.get("/moods", response_model=List[MoodItemSchema])
def get_moods():
    """Returns the curated catalog of 12 travel moods."""
    return MOOD_DEFINITIONS

# -----------------------------------------------------------------------------
# 2. DESTINATION DISCOVERY & FILTERING
# -----------------------------------------------------------------------------
@router.get("/destinations", response_model=DestinationListResponse)
def get_destinations(
    mood: Optional[str] = None,
    travel_scope: Optional[str] = None,
    country: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    category: Optional[str] = None,
    sub_category: Optional[str] = None,
    min_budget: Optional[float] = None,
    max_budget: Optional[float] = None,
    duration: Optional[str] = None,
    season: Optional[str] = None,
    search: Optional[str] = None,
    popular_only: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Search and filter destinations across mood, domestic/international,
    categories, budget ranges, and location queries.
    """
    query = db.query(Destination)

    # Filter travel scope (DOMESTIC / INTERNATIONAL)
    if travel_scope:
        query = query.filter(Destination.travel_scope == travel_scope.upper())

    # Country filter
    if country:
        query = query.filter(Destination.country.ilike(f"%{country}%"))

    # State filter
    if state:
        query = query.filter(Destination.state.ilike(f"%{state}%"))

    # City filter
    if city:
        query = query.filter(Destination.city.ilike(f"%{city}%"))

    # Category & Sub-category
    if category:
        query = query.filter(Destination.category.ilike(f"%{category}%"))
    if sub_category:
        query = query.filter(Destination.sub_category.ilike(f"%{sub_category}%"))

    # Budget filters
    if min_budget is not None:
        query = query.filter(Destination.approx_cost_per_day_inr >= min_budget)
    if max_budget is not None:
        query = query.filter(Destination.approx_cost_per_day_inr <= max_budget)

    # Popular filter
    if popular_only is True:
        query = query.filter(Destination.is_popular == True)

    # Search keyword across name, city, state, country, description
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Destination.name.ilike(search_term),
                Destination.city.ilike(search_term),
                Destination.state.ilike(search_term),
                Destination.country.ilike(search_term),
                Destination.description.ilike(search_term),
                Destination.category.ilike(search_term),
                Destination.sub_category.ilike(search_term)
            )
        )

    # Fetch records and perform mood filtering in Python (since supported_moods is JSON list)
    all_matched = query.all()
    if mood:
        mood_lower = mood.lower()
        all_matched = [
            d for d in all_matched
            if d.supported_moods and mood_lower in [m.lower() for m in d.supported_moods]
        ]

    # Duration filter if specified
    if duration:
        dur_lower = duration.lower()
        all_matched = [
            d for d in all_matched
            if d.typical_duration and dur_lower in d.typical_duration.lower()
        ]

    # Season filter if specified
    if season:
        season_lower = season.lower()
        all_matched = [
            d for d in all_matched
            if d.best_season and season_lower in d.best_season.lower()
        ]

    total = len(all_matched)

    # Pagination slice
    start = (page - 1) * limit
    paginated = all_matched[start:start + limit]

    # Load user favorites for indicator
    favorite_ids = set()
    if current_user:
        favs = db.query(FavoriteDestination.destination_id).filter(
            FavoriteDestination.user_id == current_user.id
        ).all()
        favorite_ids = {f[0] for f in favs}

    enriched = [enrich_destination(d, favorite_ids) for d in paginated]

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "destinations": enriched
    }

# -----------------------------------------------------------------------------
# 3. DESTINATION DETAILS & IMAGES
# -----------------------------------------------------------------------------
@router.get("/destinations/{destination_id}", response_model=DestinationResponse)
def get_destination_detail(
    destination_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Retrieves full details for a single destination."""
    dest = db.query(Destination).filter(Destination.id == destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    favorite_ids = set()
    if current_user:
        fav = db.query(FavoriteDestination).filter(
            FavoriteDestination.user_id == current_user.id,
            FavoriteDestination.destination_id == destination_id
        ).first()
        if fav:
            favorite_ids.add(destination_id)

    return enrich_destination(dest, favorite_ids)

@router.get("/destinations/{destination_id}/images", response_model=List[DestinationImageSchema])
def get_destination_images(destination_id: int, db: Session = Depends(get_db)):
    """Retrieves photo gallery for a destination."""
    dest = db.query(Destination).filter(Destination.id == destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    images = db.query(DestinationImage).filter(DestinationImage.destination_id == destination_id).all()
    if not images and dest.hero_image_url:
        return [{
            "id": 0,
            "image_url": dest.hero_image_url,
            "caption": dest.name,
            "attribution": dest.source_attribution,
            "source_url": None,
            "is_primary": True
        }]
    return images

# -----------------------------------------------------------------------------
# 4. SMART RECOMMENDATIONS ENGINE
# -----------------------------------------------------------------------------
@router.get("/recommendations", response_model=List[DestinationResponse])
def get_recommendations(
    mood: Optional[str] = "devotional",
    travel_scope: Optional[str] = None,
    budget_tier: Optional[str] = None,
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Transparent rule-based recommendation engine scoring destinations based on:
    - Primary mood match (50 pts)
    - Travel scope preference (20 pts)
    - Featured / Popularity boost (15 pts)
    - Proximity to user coordinates when provided (up to 15 pts)
    """
    all_destinations = db.query(Destination).all()
    if not all_destinations:
        return []

    mood_clean = (mood or "devotional").lower()
    scope_clean = travel_scope.upper() if travel_scope else None

    scored_items = []
    for d in all_destinations:
        score = 0.0
        reasons = []

        # Mood match
        if d.supported_moods and mood_clean in [m.lower() for m in d.supported_moods]:
            score += 50.0
            reasons.append(f"Matches your selected '{mood_clean.title()}' mood")
        
        # Scope match
        if scope_clean and d.travel_scope == scope_clean:
            score += 20.0
            reasons.append(f"Fits your {scope_clean.capitalize()} travel preference")

        # Popular / Featured
        if d.is_featured:
            score += 10.0
            reasons.append("Handpicked featured destination")
        if d.is_popular:
            score += 8.0

        # Budget tier match
        if budget_tier and d.approx_budget_tier and budget_tier.lower() in d.approx_budget_tier.lower():
            score += 10.0
            reasons.append(f"Aligns with your {budget_tier} budget")

        # Proximity score if user location provided
        if user_lat is not None and user_lng is not None:
            dist_km, _ = calculate_distance_and_duration(user_lat, user_lng, d.latitude, d.longitude)
            if dist_km < 300:
                score += 15.0
                reasons.append(f"Nearby drive ({round(dist_km)} km away)")
            elif dist_km < 700:
                score += 8.0
                reasons.append(f"Convenient regional journey ({round(dist_km)} km)")

        # Prepare customized rationale explanation
        why_text = d.why_recommended
        if reasons:
            why_text = f"{'. '.join(reasons[:2])}."

        scored_items.append((score, d, why_text))

    # Sort descending by score
    scored_items.sort(key=lambda x: x[0], reverse=True)
    top_destinations = scored_items[:limit]

    # Hydrate favorites
    favorite_ids = set()
    if current_user:
        favs = db.query(FavoriteDestination.destination_id).filter(
            FavoriteDestination.user_id == current_user.id
        ).all()
        favorite_ids = {f[0] for f in favs}

    results = []
    for score, dest, custom_why in top_destinations:
        item = enrich_destination(dest, favorite_ids)
        if custom_why:
            item["why_recommended"] = custom_why
        results.append(item)

    return results

# -----------------------------------------------------------------------------
# 5. DEVOTIONAL & SPIRITUAL MODULE
# -----------------------------------------------------------------------------
@router.get("/temples", response_model=List[DestinationResponse])
def get_spiritual_destinations(
    sub_category: Optional[str] = None,
    travel_scope: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Dedicated spiritual destination discovery endpoint.
    Filters temples, jyotirlingas, ancient shrines, monasteries, and churches.
    """
    query = db.query(Destination).filter(
        or_(
            Destination.category == "Temples",
            Destination.category == "Spiritual Retreat",
            Destination.sub_category.isnot(None)
        )
    )

    if travel_scope:
        query = query.filter(Destination.travel_scope == travel_scope.upper())

    if sub_category:
        query = query.filter(Destination.sub_category.ilike(f"%{sub_category}%"))

    temples = query.all()

    favorite_ids = set()
    if current_user:
        favs = db.query(FavoriteDestination.destination_id).filter(
            FavoriteDestination.user_id == current_user.id
        ).all()
        favorite_ids = {f[0] for f in favs}

    return [enrich_destination(t, favorite_ids) for t in temples]

@router.get("/temples/{destination_id}", response_model=DestinationResponse)
def get_temple_detail(
    destination_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Retrieves dedicated spiritual destination details."""
    dest = db.query(Destination).filter(Destination.id == destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Spiritual destination not found")

    favorite_ids = set()
    if current_user:
        fav = db.query(FavoriteDestination).filter(
            FavoriteDestination.user_id == current_user.id,
            FavoriteDestination.destination_id == destination_id
        ).first()
        if fav:
            favorite_ids.add(destination_id)

    return enrich_destination(dest, favorite_ids)

# -----------------------------------------------------------------------------
# 6. DESTINATION WEATHER
# -----------------------------------------------------------------------------
@router.get("/weather/{destination_id}")
async def get_destination_weather(destination_id: int, db: Session = Depends(get_db)):
    """
    Fetches real live weather data for the destination's verified coordinates
    via Open-Meteo or configured weather providers with graceful fallback.
    """
    dest = db.query(Destination).filter(Destination.id == destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    weather_data = await weather_service.get_weather_for_location(dest.latitude, dest.longitude)
    return {
        "destination_id": dest.id,
        "destination_name": dest.name,
        "city": dest.city,
        "latitude": dest.latitude,
        "longitude": dest.longitude,
        "weather": weather_data
    }

# -----------------------------------------------------------------------------
# 7. USER FAVORITES
# -----------------------------------------------------------------------------
@router.get("/favorites", response_model=List[FavoriteDestinationResponse])
def get_user_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns saved favorite destinations for the authenticated user."""
    favs = db.query(FavoriteDestination).filter(
        FavoriteDestination.user_id == current_user.id
    ).order_by(desc(FavoriteDestination.created_at)).all()

    fav_ids = {f.destination_id for f in favs}
    results = []
    for f in favs:
        if f.destination:
            results.append({
                "id": f.id,
                "destination_id": f.destination_id,
                "created_at": f.created_at,
                "destination": enrich_destination(f.destination, fav_ids)
            })
    return results

@router.post("/favorites/{destination_id}", status_code=status.HTTP_201_CREATED)
def add_favorite(
    destination_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Saves a destination to the user's personal favorites collection."""
    dest = db.query(Destination).filter(Destination.id == destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    existing = db.query(FavoriteDestination).filter(
        FavoriteDestination.user_id == current_user.id,
        FavoriteDestination.destination_id == destination_id
    ).first()

    if existing:
        return {"message": "Destination already in favorites", "id": existing.id}

    fav = FavoriteDestination(
        user_id=current_user.id,
        destination_id=destination_id
    )
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return {"message": "Destination added to favorites", "id": fav.id}

@router.delete("/favorites/{destination_id}")
def remove_favorite(
    destination_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Removes a destination from the user's favorites collection."""
    fav = db.query(FavoriteDestination).filter(
        FavoriteDestination.user_id == current_user.id,
        FavoriteDestination.destination_id == destination_id
    ).first()

    if not fav:
        raise HTTPException(status_code=404, detail="Favorite not found")

    db.delete(fav)
    db.commit()
    return {"message": "Favorite removed successfully"}

# -----------------------------------------------------------------------------
# 8. MULTI-STOP TRIP ITINERARY PLANNER
# -----------------------------------------------------------------------------
@router.post("/trips", response_model=PlannedJourneyTripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(
    payload: PlannedJourneyTripCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates a new multi-stop itinerary trip with ordered destinations,
    computing cumulative road distance and driving duration.
    """
    trip = PlannedJourneyTrip(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        primary_mood=payload.primary_mood,
        travel_scope=payload.travel_scope or "DOMESTIC",
        start_date=payload.start_date,
        end_date=payload.end_date,
        status="PLANNED"
    )
    db.add(trip)
    db.flush()

    total_dist = 0.0
    total_duration = 0.0
    prev_lat, prev_lng = None, None

    for idx, s in enumerate(payload.stops):
        leg_dist = 0.0
        if prev_lat is not None and prev_lng is not None:
            leg_dist, leg_dur = calculate_distance_and_duration(prev_lat, prev_lng, s.latitude, s.longitude)
            total_dist += leg_dist
            total_duration += leg_dur

        stop = PlannedJourneyStop(
            trip_id=trip.id,
            destination_id=s.destination_id,
            stop_order=idx + 1,
            custom_location_name=s.custom_location_name,
            latitude=s.latitude,
            longitude=s.longitude,
            stay_duration_hours=s.stay_duration_hours or 2.0,
            distance_from_prev_km=leg_dist,
            notes=s.notes
        )
        db.add(stop)
        prev_lat, prev_lng = s.latitude, s.longitude

    trip.total_distance_km = round(total_dist, 1)
    trip.total_duration_mins = round(total_duration, 0)

    db.commit()
    db.refresh(trip)
    return trip

@router.get("/trips", response_model=List[PlannedJourneyTripResponse])
def get_user_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves all planned trips and itineraries for the current user."""
    trips = db.query(PlannedJourneyTrip).filter(
        PlannedJourneyTrip.user_id == current_user.id
    ).order_by(desc(PlannedJourneyTrip.created_at)).all()
    return trips

@router.get("/trips/{trip_id}", response_model=PlannedJourneyTripResponse)
def get_trip_detail(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves a specific trip with all its stops."""
    trip = db.query(PlannedJourneyTrip).filter(
        PlannedJourneyTrip.id == trip_id,
        PlannedJourneyTrip.user_id == current_user.id
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip

@router.put("/trips/{trip_id}", response_model=PlannedJourneyTripResponse)
def update_trip(
    trip_id: int,
    payload: PlannedJourneyTripUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Updates trip details or replaces/reorders its stops."""
    trip = db.query(PlannedJourneyTrip).filter(
        PlannedJourneyTrip.id == trip_id,
        PlannedJourneyTrip.user_id == current_user.id
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if payload.title is not None:
        trip.title = payload.title
    if payload.description is not None:
        trip.description = payload.description
    if payload.primary_mood is not None:
        trip.primary_mood = payload.primary_mood
    if payload.travel_scope is not None:
        trip.travel_scope = payload.travel_scope
    if payload.start_date is not None:
        trip.start_date = payload.start_date
    if payload.end_date is not None:
        trip.end_date = payload.end_date
    if payload.status is not None:
        trip.status = payload.status

    if payload.stops is not None:
        # Delete existing stops and re-insert updated stops
        db.query(PlannedJourneyStop).filter(PlannedJourneyStop.trip_id == trip.id).delete()
        
        total_dist = 0.0
        total_duration = 0.0
        prev_lat, prev_lng = None, None

        for idx, s in enumerate(payload.stops):
            leg_dist = 0.0
            if prev_lat is not None and prev_lng is not None:
                leg_dist, leg_dur = calculate_distance_and_duration(prev_lat, prev_lng, s.latitude, s.longitude)
                total_dist += leg_dist
                total_duration += leg_dur

            stop = PlannedJourneyStop(
                trip_id=trip.id,
                destination_id=s.destination_id,
                stop_order=idx + 1,
                custom_location_name=s.custom_location_name,
                latitude=s.latitude,
                longitude=s.longitude,
                stay_duration_hours=s.stay_duration_hours or 2.0,
                distance_from_prev_km=leg_dist,
                notes=s.notes
            )
            db.add(stop)
            prev_lat, prev_lng = s.latitude, s.longitude

        trip.total_distance_km = round(total_dist, 1)
        trip.total_duration_mins = round(total_duration, 0)

    db.commit()
    db.refresh(trip)
    return trip

@router.delete("/trips/{trip_id}")
def delete_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes a planned trip."""
    trip = db.query(PlannedJourneyTrip).filter(
        PlannedJourneyTrip.id == trip_id,
        PlannedJourneyTrip.user_id == current_user.id
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    db.delete(trip)
    db.commit()
    return {"message": "Trip deleted successfully"}
