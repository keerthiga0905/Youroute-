import sys
import os

backend_dir = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, backend_dir)

from tests.test_api import test_health_check, test_analyze_route, test_nearby_emergency, test_model_metrics

if __name__ == "__main__":
    print("Running backend tests...")
    test_health_check()
    print("[OK] Health check passed")
    test_analyze_route()
    print("[OK] Route analysis passed")
    test_nearby_emergency()
    print("[OK] Nearby emergency passed")
    test_model_metrics()
    print("[OK] Model metrics passed")
    print("ALL BACKEND TESTS PASSED SUCCESSFULLY!")
