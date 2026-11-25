"""
Verification Agent: Independently checks whether recovery succeeded.
Independent of the Recovery Agent's execution claim.
"""
from app.models.schemas import VerificationRequest, VerificationResult

class VerificationAgent:
    def __init__(self):
        self.name = "Verification Agent"
        self.role = "Independent Verification Specialist"

    def verify_recovery(self, request: VerificationRequest) -> VerificationResult:
        metrics = request.post_recovery_metrics

        is_healthy_http = metrics.http_status in [200, 204]
        is_cpu_normal = metrics.cpu_percent < 80.0
        is_mem_normal = metrics.memory_percent < 85.0
        is_latency_acceptable = metrics.response_time_ms < 1500.0

        is_success = is_healthy_http and is_cpu_normal and is_mem_normal and is_latency_acceptable

        score = 0.0
        if is_healthy_http:
            score += 0.4
        if is_cpu_normal:
            score += 0.2
        if is_mem_normal:
            score += 0.2
        if is_latency_acceptable:
            score += 0.2

        if is_success:
            details = f"Independent post-recovery probe confirmed: HTTP {metrics.http_status}, latency {metrics.response_time_ms}ms, CPU {metrics.cpu_percent}%, Memory {metrics.memory_percent}% within normal limits."
        else:
            details = f"Verification failed: Post-recovery telemetry still reflects abnormal parameters (HTTP {metrics.http_status}, latency {metrics.response_time_ms}ms)."

        return VerificationResult(
            verified_successful=is_success,
            health_score=round(score, 2),
            details=details,
            requires_fallback=not is_success
        )

verification_agent = VerificationAgent()
