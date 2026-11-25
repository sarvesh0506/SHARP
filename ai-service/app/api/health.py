from fastapi import APIRouter
from datetime import datetime
from app.models.schemas import HealthResponse

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="UP",
        service="SHARP AI Intelligence Service",
        version="1.0.0",
        timestamp=datetime.utcnow(),
        agents_registered=7
    )
