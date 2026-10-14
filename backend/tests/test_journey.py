from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_get_moods():
    response = client.get("/api/journeys/moods")
    assert response.status_code == 200
    moods = response.json()
    assert len(moods) == 12
    mood_ids = [m["id"] for m in moods]
    assert "devotional" in mood_ids
    assert "peaceful" in mood_ids
    assert "adventure" in mood_ids
    assert "beach" in mood_ids

def test_get_destinations():
    response = client.get("/api/journeys/destinations?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert data["total"] > 0
    assert len(data["destinations"]) > 0
    dest = data["destinations"][0]
    assert "name" in dest
    assert "latitude" in dest
    assert "longitude" in dest
    assert "hero_image_url" in dest

def test_mood_filter_devotional():
    response = client.get("/api/journeys/destinations?mood=devotional")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for d in data["destinations"]:
        assert "devotional" in [m.lower() for m in d["supported_moods"]]

def test_travel_scope_filter():
    response_dom = client.get("/api/journeys/destinations?travel_scope=DOMESTIC")
    assert response_dom.status_code == 200
    for d in response_dom.json()["destinations"]:
        assert d["travel_scope"] == "DOMESTIC"

    response_intl = client.get("/api/journeys/destinations?travel_scope=INTERNATIONAL")
    assert response_intl.status_code == 200
    for d in response_intl.json()["destinations"]:
        assert d["travel_scope"] == "INTERNATIONAL"

def test_temples_endpoint():
    response = client.get("/api/journeys/temples")
    assert response.status_code == 200
    temples = response.json()
    assert len(temples) > 0
    names = [t["name"] for t in temples]
    assert any("Meenakshi" in n for n in names)
    assert any("Ramanathaswamy" in n for n in names)

def test_recommendations():
    response = client.get("/api/journeys/recommendations?mood=devotional&limit=5")
    assert response.status_code == 200
    recs = response.json()
    assert len(recs) <= 5
    assert len(recs) > 0
    for r in recs:
        assert r["why_recommended"] is not None

def test_destination_detail_and_weather():
    dest_res = client.get("/api/journeys/destinations?limit=1")
    dest_id = dest_res.json()["destinations"][0]["id"]
    
    detail_res = client.get(f"/api/journeys/destinations/{dest_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == dest_id

    weather_res = client.get(f"/api/journeys/weather/{dest_id}")
    assert weather_res.status_code == 200
    weather_data = weather_res.json()
    assert "weather" in weather_data

def run_all_journey_tests():
    test_get_moods()
    print("[PASS] test_get_moods")
    test_get_destinations()
    print("[PASS] test_get_destinations")
    test_mood_filter_devotional()
    print("[PASS] test_mood_filter_devotional")
    test_travel_scope_filter()
    print("[PASS] test_travel_scope_filter")
    test_temples_endpoint()
    print("[PASS] test_temples_endpoint")
    test_recommendations()
    print("[PASS] test_recommendations")
    test_destination_detail_and_weather()
    print("[PASS] test_destination_detail_and_weather")

if __name__ == "__main__":
    run_all_journey_tests()
    print("\nAll Backend Journey API Tests Passed Successfully!")
