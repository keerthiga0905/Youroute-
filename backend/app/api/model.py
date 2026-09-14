import os
import json
from fastapi import APIRouter, HTTPException
from app.schemas.schemas import ModelMetricsResponse

router = APIRouter(prefix="/model", tags=["Data Science & ML"])

@router.get("/metrics", response_model=ModelMetricsResponse)
def get_model_metrics():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    meta_path = os.path.abspath(os.path.join(base_dir, '..', 'ml', 'saved_models', 'model_metadata.json'))
    
    if not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Model metadata not found. Run model training first.")
        
    try:
        with open(meta_path, 'r') as f:
            metadata = json.load(f)
        return metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read model metadata: {e}")
