from fastapi import APIRouter
from typing import Dict, Any, List
from app.models.schemas import (
    MetricSnapshot,
    AnomalyDetectionResult,
    DiagnosisRequest,
    DiagnosisResult,
    RecoveryPlanRequest,
    RecoveryPlan,
    VerificationRequest,
    VerificationResult
)
from app.agents import (
    sentinel_agent,
    detection_agent,
    diagnosis_agent,
    planning_agent,
    recovery_agent,
    verification_agent,
    learning_agent
)

router = APIRouter(prefix="/api/v1/agents", tags=["AI Agents"])

@router.get("/status")
async def get_all_agents():
    return {
        "agents": [
            {"name": sentinel_agent.name, "role": sentinel_agent.role, "status": "ACTIVE"},
            {"name": detection_agent.name, "role": detection_agent.role, "status": "ACTIVE"},
            {"name": diagnosis_agent.name, "role": diagnosis_agent.role, "status": "ACTIVE"},
            {"name": planning_agent.name, "role": planning_agent.role, "status": "ACTIVE"},
            {"name": recovery_agent.name, "role": recovery_agent.role, "status": "ACTIVE"},
            {"name": verification_agent.name, "role": verification_agent.role, "status": "ACTIVE"},
            {"name": learning_agent.name, "role": learning_agent.role, "status": "ACTIVE"}
        ]
    }

@router.post("/sentinel/evaluate")
async def evaluate_heartbeat(snapshot: MetricSnapshot):
    return sentinel_agent.evaluate_heartbeat(snapshot)

@router.post("/detection/detect", response_model=AnomalyDetectionResult)
async def detect_anomaly(snapshot: MetricSnapshot):
    return detection_agent.detect_anomaly(snapshot)

@router.post("/diagnosis/analyze", response_model=DiagnosisResult)
async def diagnose_incident(request: DiagnosisRequest):
    return diagnosis_agent.diagnose(request)

@router.post("/planning/plan", response_model=RecoveryPlan)
async def create_plan(request: RecoveryPlanRequest):
    return planning_agent.create_recovery_plan(request)

@router.post("/recovery/execute")
async def execute_recovery(payload: Dict[str, Any]):
    action_type = payload.get("action_type", "")
    target = payload.get("target", "")
    params = payload.get("parameters", {})
    return recovery_agent.execute_recovery(action_type, target, params)

@router.post("/verification/verify", response_model=VerificationResult)
async def verify_recovery(request: VerificationRequest):
    return verification_agent.verify_recovery(request)

@router.post("/learning/analyze")
async def analyze_learning(incidents: List[Dict[str, Any]]):
    return learning_agent.analyze_history(incidents)
