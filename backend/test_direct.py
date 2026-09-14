import asyncio
from app.services.route_service import route_service
from app.services.tn_geofence_service import tn_geofence

async def test_direct():
    print("Testing Tamil Nadu Geofence Validation...")
    # Test TN coordinates (Coimbatore to Nehru Nagar)
    is_valid, msg = tn_geofence.validate_trip_coords(11.0168, 76.9558, 11.0425, 77.0175)
    print(f"TN Coordinates Valid: {is_valid}")
    assert is_valid == True

    # Test Outside TN coordinates (Bangalore, Karnataka)
    is_valid_outside, msg_outside = tn_geofence.validate_trip_coords(12.9716, 77.5946, 11.0425, 77.0175)
    print(f"Outside TN Coordinates Valid: {is_valid_outside} | Msg: {msg_outside}")
    assert is_valid_outside == False

    print("\nTesting Real Tamil Nadu OSRM Route Analysis...")
    analysis = await route_service.analyze_routes(
        origin_name="Cheran Ma Nagar, Coimbatore",
        destination_name="Nehru Nagar, Coimbatore",
        origin={"lat": 11.0385, "lng": 77.0150},
        destination={"lat": 11.0425, "lng": 77.0320},
        travel_mode="driving"
    )

    print(f"Success: {analysis['success']}")
    print(f"Total Routes Discovered: {analysis['total_routes_discovered']}")

    for idx, r in enumerate(analysis['routes']):
        print(f" - Route #{r['rank_order']}: {r['name']} | Badge: '{r['badge_text']}' ({r['badge_color']}) | Distance: {r['distance_km']} km | Duration: {r['duration_mins']} min | Safety: {r['safety_label']}")

    # Verify distance sorting order
    distances = [r['distance_km'] for r in analysis['routes']]
    print(f"Discovered Distances: {distances}")
    assert distances == sorted(distances), "Routes must be sorted by distance!"

    # Verify Shortest route has Green badge
    assert analysis['routes'][0]['badge_color'] == 'green', "Shortest route must have Green color!"

    print("\nALL BACKEND ROUTE & TN GEOFENCE TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    asyncio.run(test_direct())
