import sys
import os

# Add ai-service to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.models.schemas import MetricSnapshot, DiagnosisRequest, RecoveryPlanRequest
from app.agents import (
    sentinel_agent,
    detection_agent,
    diagnosis_agent,
    planning_agent,
    recovery_agent,
    verification_agent,
    learning_agent
)

print(f"Loaded App: {app.title}")
print(f"Sentinel Agent: {sentinel_agent.name} ({sentinel_agent.role})")
print(f"Detection Agent: {detection_agent.name} ({detection_agent.role})")
print(f"Diagnosis Agent: {diagnosis_agent.name} ({diagnosis_agent.role})")
print(f"Planning Agent: {planning_agent.name} ({planning_agent.role})")
print(f"Recovery Agent: {recovery_agent.name} ({recovery_agent.role})")
print(f"Verification Agent: {verification_agent.name} ({verification_agent.role})")
print(f"Learning Agent: {learning_agent.name} ({learning_agent.role})")

# Test end-to-end multi-agent evaluation
metric = MetricSnapshot(
    application_id=1,
    container_id="a9104c8ef2",
    cpu_percent=89.5,
    memory_percent=93.2,
    response_time_ms=4200.0,
    http_status=503,
    recent_logs=["java.lang.OutOfMemoryError: Java heap space"]
)

# 1. Sentinel
sentinel_res = sentinel_agent.evaluate_heartbeat(metric)
assert sentinel_res["status"] == "DEGRADED", "Sentinel evaluation failed"

# 2. Detection
detection_res = detection_agent.detect_anomaly(metric)
assert detection_res.is_anomaly, "Anomaly detection failed"
assert detection_res.severity in ["HIGH", "CRITICAL"], "Severity classification failed"

# 3. Diagnosis
diagnosis_res = diagnosis_agent.diagnose(DiagnosisRequest(
    application_name="notification-worker",
    metrics=metric,
    error_logs=metric.recent_logs
))
assert "Memory" in diagnosis_res.likely_root_cause or "Heap" in diagnosis_res.likely_root_cause, "Diagnosis failed"

# 4. Planning
plan = planning_agent.create_recovery_plan(RecoveryPlanRequest(
    diagnosis=diagnosis_res,
    application_name="notification-worker"
))
assert plan.action_type == "RESTART_CONTAINER", "Planning strategy mapping failed"
assert plan.risk_level == "LOW", "Risk tier classification failed"

# 5. Recovery (dry-run)
exec_res = recovery_agent.execute_recovery(plan.action_type, "notification-worker", plan.execution_payload)
assert exec_res["success"], "Recovery execution contract failed"

# 6. Verification
post_recovery_metric = MetricSnapshot(
    application_id=1,
    container_id="a9104c8ef2",
    cpu_percent=24.1,
    memory_percent=38.5,
    response_time_ms=65.0,
    http_status=200
)
verify_res = verification_agent.verify_recovery(type("VerifyReq", (), {
    "application_id": 1,
    "action_type": plan.action_type,
    "post_recovery_metrics": post_recovery_metric
})())
assert verify_res.verified_successful, "Verification failed"

# 7. Learning
learning_res = learning_agent.analyze_history([{"status": "RESOLVED"}, {"status": "RESOLVED"}])
assert learning_res["overall_recovery_rate"] == 100.0, "Learning analytics failed"

print("ALL 7 AGENTS AND PIPELINES VERIFIED SUCCESSFULLY!")
