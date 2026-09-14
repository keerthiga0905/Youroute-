from fastapi.testclient import TestClient
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "SafeRoute" in data["service"]

def test_analyze_route():
    payload = {
        "origin_name": "Coimbatore Railway Station",
        "destination_name": "Coimbatore Institute of Technology",
        "origin": {"lat": 11.0168, "lng": 76.9558},
        "destination": {"lat": 11.0210, "lng": 76.9370},
        "departure_time": "2026-08-22T21:00:00",
        "travel_mode": "walking",
        "preference": "safest"
    }
    response = client.post("/api/routes/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["origin"]["name"] == "Coimbatore Railway Station"
    assert len(data["routes"]) >= 1
    
    rec_route = data["routes"][0]
    assert rec_route["safety_score"] >= 0
    assert len(rec_route["segments"]) >= 1

def test_nearby_emergency():
    response = client.get("/api/safety/nearby?lat=11.0168&lng=76.9558")
    assert response.status_code == 200
    pois = response.json()
    assert len(pois) > 0
    assert "category" in pois[0]

def test_model_metrics():
    response = client.get("/api/model/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert len(data["feature_importance"]) > 0
