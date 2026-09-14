import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score, f1_score, confusion_matrix
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

def train_and_evaluate_models():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, 'data', 'saferoute_demo_dataset.csv')
    
    if not os.path.exists(data_path):
        print("Data file not found. Running dataset generator...")
        from generate_demo_data import generate_saferoute_dataset
        df = generate_saferoute_dataset(n_samples=10000)
        os.makedirs(os.path.dirname(data_path), exist_ok=True)
        df.to_csv(data_path, index=False)
    else:
        df = pd.read_csv(data_path)

    feature_cols = [
        'hour', 'day_of_week', 'is_weekend', 'is_night', 'is_rush_hour',
        'historical_crime_rate', 'violent_crime_count', 'theft_count', 'robbery_count',
        'recent_crime_count', 'crime_density', 'street_light_density', 'road_type',
        'road_isolation', 'pedestrian_access', 'public_transit_distance',
        'police_station_distance', 'hospital_distance', 'emergency_service_distance',
        'business_density', 'pedestrian_activity', 'population_density',
        'rainfall', 'visibility', 'temperature', 'weather_severity'
    ]
    
    X = df[feature_cols]
    y = df['risk_score']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 1. Model 1: Ridge (Regularized Linear Regression)
    ridge = Ridge(alpha=1.0)
    ridge.fit(X_train, y_train)
    y_pred_ridge = ridge.predict(X_test)
    
    # 2. Model 2: Random Forest Regressor
    rf = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    y_pred_rf = rf.predict(X_test)

    # 3. Model 3: Gradient Boosting Regressor
    gb = GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=6, random_state=42)
    gb.fit(X_train, y_train)
    y_pred_gb = gb.predict(X_test)

    def categorize_scores(scores):
        return pd.cut(scores, bins=[-1, 20, 40, 60, 80, 101], labels=['Very Low', 'Low', 'Moderate', 'High', 'Very High'])

    y_test_cat = categorize_scores(y_test)

    def evaluate_model(name, y_true, y_pred):
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        r2 = r2_score(y_true, y_pred)
        
        y_pred_cat = categorize_scores(y_pred)
        acc = accuracy_score(y_test_cat, y_pred_cat)
        f1 = f1_score(y_test_cat, y_pred_cat, average='weighted')
        cm = confusion_matrix(y_test_cat, y_pred_cat, labels=['Very Low', 'Low', 'Moderate', 'High', 'Very High']).tolist()
        
        print(f"=== {name} Performance ===")
        print(f"MAE: {mae:.3f} | RMSE: {rmse:.3f} | R2: {r2:.3f}")
        print(f"Accuracy: {acc*100:.2f}% | F1-Score: {f1:.3f}\n")
        
        return {
            "name": name,
            "mae": round(mae, 3),
            "rmse": round(rmse, 3),
            "r2": round(r2, 3),
            "accuracy": round(acc * 100, 2),
            "f1_score": round(f1, 3),
            "confusion_matrix": cm
        }

    metrics_ridge = evaluate_model("Ridge Regression", y_test, y_pred_ridge)
    metrics_rf = evaluate_model("Random Forest", y_test, y_pred_rf)
    metrics_gb = evaluate_model("Gradient Boosting", y_test, y_pred_gb)

    models_eval = [metrics_ridge, metrics_rf, metrics_gb]
    best_model_metric = max(models_eval, key=lambda x: x['r2'])
    print(f"Best Performing Model: {best_model_metric['name']}")

    # Choose best model (Random Forest in this pipeline)
    best_model = rf if best_model_metric['name'] == "Random Forest" else (gb if best_model_metric['name'] == "Gradient Boosting" else ridge)

    # Calculate Feature Importance
    if hasattr(best_model, 'feature_importances_'):
        importances = best_model.feature_importances_
    else:
        importances = np.abs(best_model.coef_) / np.sum(np.abs(best_model.coef_))

    feature_importance_list = [
        {"feature": feature, "importance": round(float(imp * 100), 2)}
        for feature, imp in sorted(zip(feature_cols, importances), key=lambda x: x[1], reverse=True)
    ]

    # Target directory inside backend for runtime API inference
    backend_model_dir = os.path.abspath(os.path.join(base_dir, '..', 'backend', 'app', 'ml', 'saved_models'))
    os.makedirs(backend_model_dir, exist_ok=True)

    model_path = os.path.join(backend_model_dir, 'saferoute_rf_model.joblib')
    joblib.dump(best_model, model_path)
    print(f"Serialized trained model saved to: {model_path}")

    metadata = {
        "model_type": best_model_metric['name'],
        "total_samples": len(df),
        "test_samples": len(X_test),
        "features": feature_cols,
        "metrics": {
            "mae": best_model_metric['mae'],
            "rmse": best_model_metric['rmse'],
            "r2": best_model_metric['r2'],
            "accuracy": best_model_metric['accuracy'],
            "f1_score": best_model_metric['f1_score']
        },
        "models_comparison": models_eval,
        "feature_importance": feature_importance_list,
        "categories": ['Very Low', 'Low', 'Moderate', 'High', 'Very High']
    }

    metadata_path = os.path.join(backend_model_dir, 'model_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"Model metadata saved to: {metadata_path}")

if __name__ == '__main__':
    train_and_evaluate_models()
