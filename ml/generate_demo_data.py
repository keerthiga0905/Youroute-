import os
import numpy as np
import pandas as pd

def generate_saferoute_dataset(n_samples=10000, random_seed=42):
    """
    Generates a realistic synthetic dataset for training SafeRoute AI risk prediction models.
    Covers 20+ environmental, temporal, spatial, infrastructure, and historical crime features.
    """
    np.random.seed(random_seed)

    # 1. Temporal Features
    hours = np.random.randint(0, 24, n_samples)
    days_of_week = np.random.randint(0, 7, n_samples)
    is_weekend = (days_of_week >= 5).astype(int)
    is_night = ((hours < 6) | (hours >= 21)).astype(int)
    is_rush_hour = (((hours >= 8) & (hours <= 10)) | ((hours >= 17) & (hours <= 19))) & (is_weekend == 0)
    is_rush_hour = is_rush_hour.astype(int)

    # 2. Historical Crime Features
    historical_crime_rate = np.random.gamma(shape=2.0, scale=12.0, size=n_samples)
    historical_crime_rate = np.clip(historical_crime_rate, 0, 100)
    
    violent_crime_count = np.random.poisson(lam=historical_crime_rate * 0.08)
    theft_count = np.random.poisson(lam=historical_crime_rate * 0.25)
    robbery_count = np.random.poisson(lam=historical_crime_rate * 0.10)
    recent_crime_count = violent_crime_count + theft_count + robbery_count
    crime_density = recent_crime_count * 1.5 + np.random.normal(0, 2, n_samples)
    crime_density = np.clip(crime_density, 0, 80)

    # 3. Infrastructure & Lighting Features
    street_light_density = np.random.uniform(10, 100, n_samples)
    # Less lighting at night in certain isolated areas
    street_light_density = np.where(is_night == 1, street_light_density * 0.8, street_light_density)
    
    road_type = np.random.choice([1, 2, 3, 4], size=n_samples, p=[0.25, 0.40, 0.25, 0.10]) # 1: Main, 2: Arterial, 3: Residential, 4: Alley/Isolated
    road_isolation = np.where(road_type == 4, np.random.uniform(0.7, 1.0, n_samples), np.random.uniform(0.0, 0.6, n_samples))
    pedestrian_access = np.where(road_type == 1, 0.3, np.random.uniform(0.5, 1.0, n_samples))
    public_transit_distance = np.random.exponential(scale=400, size=n_samples) + 50 # meters
    public_transit_distance = np.clip(public_transit_distance, 50, 3000)

    # 4. Emergency Access Features
    police_station_distance = np.random.gamma(shape=3.0, scale=500.0, size=n_samples) # meters
    police_station_distance = np.clip(police_station_distance, 100, 8000)
    
    hospital_distance = np.random.gamma(shape=3.0, scale=800.0, size=n_samples)
    hospital_distance = np.clip(hospital_distance, 200, 12000)
    
    emergency_service_distance = np.random.gamma(shape=2.5, scale=600.0, size=n_samples)
    emergency_service_distance = np.clip(emergency_service_distance, 150, 10000)

    # 5. Activity & Population Features
    business_density = np.random.uniform(5, 95, n_samples) # per sq km
    # Business density lower at night
    business_density_active = np.where(is_night == 1, business_density * 0.2, business_density)
    
    pedestrian_activity = np.random.uniform(0, 100, n_samples)
    pedestrian_activity = np.where(is_night == 1, pedestrian_activity * 0.25, pedestrian_activity)
    
    population_density = np.random.normal(8000, 3000, n_samples)
    population_density = np.clip(population_density, 500, 25000)

    # 6. Weather Conditions
    rainfall = np.random.exponential(scale=3.0, size=n_samples) # mm/hr
    rainfall = np.clip(rainfall, 0, 60)
    
    visibility = 10.0 - (rainfall * 0.12) + np.random.normal(0, 0.5, n_samples)
    visibility = np.clip(visibility, 0.5, 10.0)
    
    temperature = np.random.normal(26.0, 5.0, n_samples) # Celsius
    weather_severity = np.clip((rainfall / 50.0) + (10.0 - visibility) / 10.0, 0.0, 1.0)

    # 7. Compute Ground Truth Risk Score (0 - 100) using non-linear physics & empirical domain weights
    base_risk = (
        0.28 * historical_crime_rate +
        0.18 * crime_density +
        0.12 * (100 - street_light_density) +
        0.12 * (is_night * 25.0) +
        0.10 * (road_isolation * 35.0) +
        0.08 * (police_station_distance / 100.0) +
        0.06 * (100 - pedestrian_activity) +
        0.04 * (weather_severity * 20.0) -
        0.04 * (business_density_active * 0.3)
    )
    
    # Add non-linear interaction terms (e.g. night + isolated alley + high crime)
    compound_risk_multiplier = 1.0 + (0.35 * is_night * road_isolation) + (0.20 * (rainfall > 15).astype(int))
    raw_risk = base_risk * compound_risk_multiplier + np.random.normal(0, 3.5, n_samples)
    
    # Standardize to 0 - 100
    risk_score = np.clip(raw_risk, 0.0, 100.0)
    
    # Categorical risk classification
    risk_category = pd.cut(
        risk_score,
        bins=[-1, 20, 40, 60, 80, 101],
        labels=['Very Low', 'Low', 'Moderate', 'High', 'Very High']
    )

    df = pd.DataFrame({
        'hour': hours,
        'day_of_week': days_of_week,
        'is_weekend': is_weekend,
        'is_night': is_night,
        'is_rush_hour': is_rush_hour,
        'historical_crime_rate': np.round(historical_crime_rate, 2),
        'violent_crime_count': violent_crime_count,
        'theft_count': theft_count,
        'robbery_count': robbery_count,
        'recent_crime_count': recent_crime_count,
        'crime_density': np.round(crime_density, 2),
        'street_light_density': np.round(street_light_density, 2),
        'road_type': road_type,
        'road_isolation': np.round(road_isolation, 2),
        'pedestrian_access': np.round(pedestrian_access, 2),
        'public_transit_distance': np.round(public_transit_distance, 1),
        'police_station_distance': np.round(police_station_distance, 1),
        'hospital_distance': np.round(hospital_distance, 1),
        'emergency_service_distance': np.round(emergency_service_distance, 1),
        'business_density': np.round(business_density, 2),
        'pedestrian_activity': np.round(pedestrian_activity, 2),
        'population_density': np.round(population_density, 1),
        'rainfall': np.round(rainfall, 2),
        'visibility': np.round(visibility, 2),
        'temperature': np.round(temperature, 1),
        'weather_severity': np.round(weather_severity, 2),
        'risk_score': np.round(risk_score, 2),
        'risk_category': risk_category
    })

    return df

if __name__ == '__main__':
    output_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(output_dir, exist_ok=True)
    file_path = os.path.join(output_dir, 'saferoute_demo_dataset.csv')
    
    print("Generating synthetic SafeRoute AI dataset with 10,000 samples...")
    dataset = generate_saferoute_dataset(n_samples=10000)
    dataset.to_csv(file_path, index=False)
    print(f"Dataset saved successfully to: {file_path}")
    print(dataset.head())
