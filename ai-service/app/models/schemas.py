from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: datetime
    agents_registered: int

class MetricSnapshot(BaseModel):
    application_id: Optional[int] = None
    container_id: Optional[str] = None
    cpu_percent: float = Field(..., ge=0.0, le=100.0)
    memory_percent: float = Field(..., ge=0.0, le=100.0)
    response_time_ms: float = Field(default=0.0)
    http_status: int = Field(default=200)
    recent_logs: Optional[List[str]] = Field(default_factory=list)

class AnomalyDetectionResult(BaseModel):
    is_anomaly: bool
    confidence_score: float
    anomaly_type: Optional[str] = None
    severity: str
    metrics: MetricSnapshot

class DiagnosisRequest(BaseModel):
    incident_id: Optional[int] = None
    application_name: str
    metrics: MetricSnapshot
    error_logs: List[str] = Field(default_factory=list)

class DiagnosisResult(BaseModel):
    likely_root_cause: str
    confidence: float
    evidence: Dict[str, Any]
    recommended_strategy: str
    risk_level: str

class RecoveryPlanRequest(BaseModel):
    diagnosis: DiagnosisResult
    application_name: str

class RecoveryPlan(BaseModel):
    action_type: str
    risk_level: str
    requires_approval: bool
    estimated_recovery_time_sec: int
    rollback_plan: str
    execution_payload: Dict[str, Any]

class VerificationRequest(BaseModel):
    application_id: int
    action_type: str
    post_recovery_metrics: MetricSnapshot

class VerificationResult(BaseModel):
    verified_successful: bool
    health_score: float
    details: str
    requires_fallback: bool
