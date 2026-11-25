"""
Sentinel Agent: Continuously monitors system health, telemetry streams, and application heartbeats.
"""
from typing import Dict, Any
from app.models.schemas import MetricSnapshot

class SentinelAgent:
    def __init__(self):
        self.name = "Sentinel Agent"
        self.role = "Continuous Health Monitor"

    def evaluate_heartbeat(self, metric: MetricSnapshot) -> Dict[str, Any]:
        """Performs initial boundary checks on live telemetry."""
        is_responsive = metric.http_status in [200, 204]
        latency_healthy = metric.response_time_ms < 2000.0

        return {
            "agent": self.name,
            "status": "HEALTHY" if is_responsive and latency_healthy else "DEGRADED",
            "is_responsive": is_responsive,
            "latency_healthy": latency_healthy,
            "observed_latency_ms": metric.response_time_ms
        }

sentinel_agent = SentinelAgent()
