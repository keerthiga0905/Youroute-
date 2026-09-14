# SafeRoute AI — Personal Safety Risk Predictor

> **AI-powered geospatial navigation application that evaluates segment-level risk scores (0–100) and recommends safer travel routes based on historical incident density, environmental lighting, foot traffic, emergency proximity, and temporal patterns.**

---

## 1. Problem Statement

Conventional navigation systems (e.g. Google Maps, Waze) optimize almost exclusively for travel time or shortest physical distance. They do not account for critical contextual safety factors such as street illumination, historical incident rates, road isolation, or access to emergency precincts during late hours.

## 2. Solution Overview

**SafeRoute AI** introduces a multi-dimensional risk prediction engine.
Instead of treating an entire route as a single point, SafeRoute AI:
1. Divides navigation paths into micro-geospatial segments.
2. Synthesizes 20+ real-world environmental, temporal, spatial, and infrastructure features for each segment.
3. Passes segment feature vectors through trained Machine Learning models (Random Forest / Gradient Boosting).
4. Calculates normalized **Risk Scores (0–100)** and **Safety Scores (100 - Risk Score)**.
5. Displays color-coded risk heatmaps (🟢 Low, 🟡 Moderate, 🟠 Elevated, 🔴 High) and provides SHAP-based **Explainable AI** feature importance rationale for every prediction.

---

## 3. Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, Leaflet / Google Maps JS API.
- **Backend API**: Python FastAPI, Uvicorn, Pydantic v2, SQLAlchemy ORM, PyJWT, Passlib (Bcrypt).
- **Machine Learning**: Scikit-learn, Gradient Boosting, Random Forest Regressor, Joblib Serialization, Pandas, NumPy.
- **Geospatial & External Services**: OpenWeatherMap API, Leaflet CARTO DarkMatter Tiles, Google Maps Platform APIs (Maps JS, Places, Directions).

---

## 4. Machine Learning Pipeline

```
Raw Synthetic / Open Data (10,000 samples)
       │
       ▼
Data Cleaning & Categorical Encoding
       │
       ▼
Feature Engineering (20+ Temporal, Crime, Weather & Infrastructure Features)
       │
       ▼
Multi-Model Training & Evaluation (Ridge vs. Random Forest vs. Gradient Boosting)
       │
       ▼
Model Serialization (saferoute_rf_model.joblib + model_metadata.json)
       │
       ▼
FastAPI Prediction API Engine (/api/routes/analyze)
```

### Model Performance Metrics:
- **Winning Model**: Gradient Boosting Regressor / Random Forest
- **Variance Explained (R²)**: `0.879`
- **Mean Absolute Error (MAE)**: `2.89`
- **Risk Classification Accuracy**: `85.65%`
- **F1-Score**: `0.856`

---

## 5. Project Folder Structure

```
route map/
├── backend/
│   ├── app/
│   │   ├── api/          # Auth, routes, risk, weather, emergency, model endpoints
│   │   ├── core/         # Config, security (JWT), database setup
│   │   ├── database/     # SQLAlchemy ORM models (User, RouteHistory, SavedRoute)
│   │   ├── ml/           # Model loader & inference engine with explainability
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Route segmentation, weather provider, emergency POIs
│   │   └── main.py       # FastAPI application entrypoint
│   ├── tests/            # Test suite
│   ├── Dockerfile
│   └── requirements.txt
│
├── ml/
│   ├── generate_demo_data.py  # 10,000 synthetic sample generator
│   └── train_models.py        # ML training, evaluation & joblib serialization
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Navbar, Footer, MapContainer, WhyRouteModal
│   │   ├── pages/        # Landing, PlanRoute, DataScienceDashboard, History, Emergency, Limitations
│   │   ├── services/     # Axios API client
│   │   └── types/        # TypeScript interfaces
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 6. Installation & Running Locally

### Step 1: Clone & Setup ML Models
```bash
# 1. Generate dataset and train ML models
python ml/generate_demo_data.py
python ml/train_models.py
```

### Step 2: Run Backend API Server
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
Backend API interactive documentation is available at: [http://localhost:8000/docs](http://localhost:8000/docs)

### Step 3: Run Frontend Web App
```bash
cd frontend
npm install
npm run dev
```
### Step 4: Google Maps Platform API Setup (Optional / Optional Live Key)
Create a `.env` file inside the `frontend` folder or set the environment variable:
```env
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
```

**Required Google Cloud APIs to enable in Google Cloud Console:**
1. **Maps JavaScript API** — Renders the interactive Google Map and vector tile styles.
2. **Directions API** — Calculates route paths and alternative corridors between locations.
3. **Geocoding API** — Converts location addresses into latitude and longitude coordinates.
4. **Places API** — Provides place search and autocomplete suggestions.

*(Note: SafeRoute AI also includes a built-in Dark Vector Map renderer fallback when no Google Maps key is specified).*

---

## 7. Responsible AI & Data Bias Disclaimer

> **Responsible AI Notice**: SafeRoute AI provides statistical risk estimates derived from historical, municipal, and contextual datasets. It does NOT claim that a route is guaranteed to be safe, nor does it predict individual spontaneous crimes. Users should treat predictions as informative contextual estimates alongside personal situational awareness.
