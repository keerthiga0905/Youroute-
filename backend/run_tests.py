import sys
import os

backend_dir = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, backend_dir)

from tests.test_api import test_health_check, test_analyze_route, test_nearby_emergency, test_model_metrics
from tests import test_auth_system

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
    
    print("\nRunning Authentication System Tests...")
    test_auth_system.test_1_successful_registration()
    test_auth_system.test_2_duplicate_email_rejection()
    test_auth_system.test_3_email_verification_success()
    test_auth_system.test_4_incorrect_and_expired_otp_rejection()
    test_auth_system.test_5_successful_login()
    test_auth_system.test_6_invalid_password_rejection()
    test_auth_system.test_7_unverified_account_restrictions()
    test_auth_system.test_8_access_token_expiry_and_invalid_signature()
    test_auth_system.test_9_refresh_token_rotation_and_reuse_detection()
    test_auth_system.test_10_logout_and_session_revocation()
    test_auth_system.test_11_password_reset_expiry_and_single_use()
    test_auth_system.test_12_protected_route_authorization()
    test_auth_system.test_13_session_isolation_between_different_users()
    test_auth_system.test_14_cross_family_access_prevention()
    test_auth_system.test_15_existing_routemap_compatibility()
    print("[OK] All 15 Authentication Test Scenarios Passed!")

    print("\nALL BACKEND & AUTHENTICATION TESTS PASSED SUCCESSFULLY!")
