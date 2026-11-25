import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    APP_NAME: str = "SHARP AI Intelligence Service"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    AI_SERVICE_HOST: str = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
    AI_SERVICE_PORT: int = int(os.getenv("AI_SERVICE_PORT", "8000"))
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8080/api/v1")
    ANOMALY_CPU_THRESHOLD: float = 85.0
    ANOMALY_MEM_THRESHOLD: float = 85.0

settings = Settings()
