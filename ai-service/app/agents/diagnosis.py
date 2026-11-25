"""
Diagnosis Agent: Analyses logs, telemetry metrics, and events to identify probable root causes.
"""
from typing import List, Dict, Any
from app.models.schemas import DiagnosisRequest, DiagnosisResult

class DiagnosisAgent:
    def __init__(self):
        self.name = "Diagnosis Agent"
        self.role = "Root Cause Analysis Specialist"

    def diagnose(self, request: DiagnosisRequest) -> DiagnosisResult:
        metrics = request.metrics
        logs = " ".join(request.error_logs).lower()

        evidence: Dict[str, Any] = {
            "cpu_percent": metrics.cpu_percent,
            "memory_percent": metrics.memory_percent,
            "response_time_ms": metrics.response_time_ms,
            "log_keywords_matched": []
        }

        # Root cause classification logic
        if "outofmemory" in logs or "heap space" in logs or metrics.memory_percent > 90.0:
            evidence["log_keywords_matched"].append("OutOfMemoryError / Heap Exhaustion")
            root_cause = "JVM Heap / Container Memory Saturation due to uncollected objects or leak"
            recommended_strategy = "RESTART_CONTAINER"
            risk_level = "LOW"
            confidence = 0.95
        elif "connection refused" in logs or "timeout" in logs or metrics.http_status == 503:
            evidence["log_keywords_matched"].append("Connection Timeout / Refused")
            root_cause = "Upstream connection pool exhaustion or target process deadlock"
            recommended_strategy = "RELOAD_CONFIGURATION_AND_RESET_CONNECTIONS"
            risk_level = "LOW"
            confidence = 0.88
        elif metrics.cpu_percent > 90.0:
            evidence["log_keywords_matched"].append("High CPU utilization")
            root_cause = "Infinite loop or unoptimized algorithmic burst in worker routine"
            recommended_strategy = "SCALE_REPLICAS_OR_THROTTLE"
            risk_level = "HIGH"
            confidence = 0.86
        else:
            root_cause = "Transient latency surge or container degradation"
            recommended_strategy = "CLEAR_CACHE_AND_RESTART"
            risk_level = "LOW"
            confidence = 0.78

        return DiagnosisResult(
            likely_root_cause=root_cause,
            confidence=confidence,
            evidence=evidence,
            recommended_strategy=recommended_strategy,
            risk_level=risk_level
        )

diagnosis_agent = DiagnosisAgent()
