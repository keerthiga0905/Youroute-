import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, List

class SafetyPredictor:
    def __init__(self):
        self.model = None
        self.metadata = None
        self.feature_names = []
        self._load_model()

    def _load_model(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        models_dir = os.path.join(base_dir, 'saved_models')
        model_path = os.path.join(models_dir, 'saferoute_rf_model.joblib')
        meta_path = os.path.join(models_dir, 'model_metadata.json')

        if os.path.exists(model_path) and os.path.exists(meta_path):
            try:
                self.model = joblib.load(model_path)
                with open(meta_path, 'r') as f:
                    self.metadata = json.load(f)
                self.feature_names = self.metadata.get('features', [])
                print("SafeRoute ML model and metadata loaded successfully.")
            except Exception as e:
                print(f"Error loading SafeRoute model: {e}")
                self.model = None

    def predict_segment_risk(self, feature_dict: Dict[str, Any]) -> Tuple[float, str, float, List[Dict[str, Any]], Dict[str, float]]:
        """
        Runs ML model prediction on a segment feature dictionary.
        Returns:
        - risk_score: float (0 - 100)
        - risk_category: str
        - confidence: float (% data availability & feature quality)
        - top_factors: list of feature impact weights
        - risk_breakdown: category breakdown dict
        """
        # Calculate data availability confidence
        missing_count = sum(1 for k in self.feature_names if feature_dict.get(k) is None or feature_dict.get(k) == -1)
        confidence = max(60.0, round(100.0 - (missing_count * 8.5), 1))

        # Fill defaults for missing data
        input_data = {}
        for feature in self.feature_names:
            val = feature_dict.get(feature)
            if val is None or val == -1:
                # Use neutral median fallback
                if 'distance' in feature:
                    input_data[feature] = 1000.0
                elif 'density' in feature or 'activity' in feature:
                    input_data[feature] = 50.0
                elif 'count' in feature:
                    input_data[feature] = 2.0
                else:
                    input_data[feature] = 0.0
            else:
                input_data[feature] = val

        df_input = pd.DataFrame([input_data])

        if self.model is not None:
            try:
                raw_pred = self.model.predict(df_input)[0]
                risk_score = float(np.clip(raw_pred, 0.0, 100.0))
            except Exception as e:
                print(f"Model prediction exception fallback: {e}")
                risk_score = self._rule_based_fallback(input_data)
        else:
            risk_score = self._rule_based_fallback(input_data)

        risk_score = round(risk_score, 1)

        # Categorize
        if risk_score <= 20:
            category = "Very Low"
        elif risk_score <= 40:
            category = "Low"
        elif risk_score <= 60:
            category = "Moderate"
        elif risk_score <= 80:
            category = "High"
        else:
            category = "Very High"

        # Calculate Explainable AI Feature Breakdown
        top_factors, risk_breakdown = self._explain_prediction(input_data, risk_score)

        return risk_score, category, confidence, top_factors, risk_breakdown

    def _rule_based_fallback(self, data: Dict[str, Any]) -> float:
        crime = data.get('historical_crime_rate', 20) * 0.35
        density = data.get('crime_density', 5) * 2.0
        light_penalty = (100 - data.get('street_light_density', 60)) * 0.2
        night_penalty = data.get('is_night', 0) * 18
        police_penalty = min(20, data.get('police_station_distance', 1000) / 100)
        return float(np.clip(crime + density + light_penalty + night_penalty + police_penalty, 0, 100))

    def _explain_prediction(self, data: Dict[str, Any], risk_score: float) -> Tuple[List[Dict[str, Any]], Dict[str, float]]:
        # Feature impact estimation for UI charts
        crime_weight = round(min(40.0, (data.get('historical_crime_rate', 20) * 0.3) + (data.get('recent_crime_count', 2) * 2.5)), 1)
        time_weight = round(18.0 if data.get('is_night') == 1 else 6.0, 1)
        light_weight = round(max(5.0, (100 - data.get('street_light_density', 60)) * 0.22), 1)
        activity_weight = round(max(5.0, (100 - data.get('pedestrian_activity', 50)) * 0.18), 1)
        weather_weight = round(min(15.0, data.get('rainfall', 0) * 0.5 + (10 - data.get('visibility', 10)) * 0.8), 1)
        emergency_weight = round(min(12.0, data.get('police_station_distance', 1000) / 300.0), 1)

        total_w = crime_weight + time_weight + light_weight + activity_weight + weather_weight + emergency_weight
        if total_w > 0:
            scale = 100.0 / total_w
            crime_pct = round(crime_weight * scale, 1)
            time_pct = round(time_weight * scale, 1)
            light_pct = round(light_weight * scale, 1)
            activity_pct = round(activity_weight * scale, 1)
            weather_pct = round(weather_weight * scale, 1)
            emergency_pct = round(emergency_weight * scale, 1)
        else:
            crime_pct, time_pct, light_pct, activity_pct, weather_pct, emergency_pct = 32.0, 21.0, 18.0, 14.0, 9.0, 6.0

        risk_breakdown = {
            "Historical Crime": crime_pct,
            "Time of Day": time_pct,
            "Lighting & Visibility": light_pct,
            "Street Activity": activity_pct,
            "Weather Conditions": weather_pct,
            "Emergency Proximity": emergency_pct
        }

        factors = [
            {
                "factor": "historical_crime",
                "label": "Historical Incidents",
                "impact_percent": crime_pct,
                "status": "negative" if crime_pct > 25 else "positive",
                "description": f"Area historical incident density is {data.get('historical_crime_rate', 0)}/100"
            },
            {
                "factor": "lighting",
                "label": "Street Lighting",
                "impact_percent": light_pct,
                "status": "positive" if data.get('street_light_density', 50) > 60 else "negative",
                "description": f"Street illumination estimated at {data.get('street_light_density', 50)}%"
            },
            {
                "factor": "pedestrian_activity",
                "label": "Foot Traffic",
                "impact_percent": activity_pct,
                "status": "positive" if data.get('pedestrian_activity', 50) > 40 else "negative",
                "description": f"Pedestrian activity level is {data.get('pedestrian_activity', 50)}%"
            },
            {
                "factor": "emergency_access",
                "label": "Police & Medical Access",
                "impact_percent": emergency_pct,
                "status": "positive" if data.get('police_station_distance', 1000) < 1500 else "neutral",
                "description": f"Police station proximity ~{int(data.get('police_station_distance', 1000))} meters"
            }
        ]

        return factors, risk_breakdown

predictor = SafetyPredictor()
