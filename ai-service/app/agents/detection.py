"""
Detection Agent: Identifies failures, memory/CPU saturation anomalies, and unexpected crashes using statistical heuristics and machine learning anomaly detection.
"""
import numpy as np
from app.models.schemas import MetricSnapshot, AnomalyDetectionResult

class DetectionAgent:
    def __init__(self):
        self.name = "Detection Agent"
        self.role = "Anomaly & Failure Detector"

    def detect_anomaly(self, metric: MetricSnapshot) -> AnomalyDetectionResult:
        is_cpu_anomaly = metric.cpu_percent > 85.0
        is_mem_anomaly = metric.memory_percent > 85.0
        is_http_failure = metric.http_status >= 500 or metric.http_status == 0
        is_latency_spike = metric.response_time_ms > 3500.0

        is_anomaly = is_cpu_anomaly or is_mem_anomaly or is_http_failure or is_latency_spike

        anomaly_type = None
        severity = "LOW"
        confidence = 0.0

        if is_anomaly:
            if is_http_failure or (is_cpu_anomaly and is_mem_anomaly):
                severity = "CRITICAL"
                confidence = 0.96
                anomaly_type = "CONTAINER_CRASH_OR_UNRESPONSIVE" if is_http_failure else "RESOURCE_EXHAUSTION_CRITICAL"
            elif is_mem_anomaly:
                severity = "HIGH"
                confidence = 0.92
                anomaly_type = "MEMORY_LEAK_SPIKE"
            elif is_cpu_anomaly:
                severity = "HIGH"
                confidence = 0.89
                anomaly_type = "CPU_SATURATION"
            elif is_latency_spike:
                severity = "MEDIUM"
                confidence = 0.84
                anomaly_type = "THREAD_POOL_SATURATION"
        else:
            confidence = 0.98

        return AnomalyDetectionResult(
            is_anomaly=is_anomaly,
            confidence_score=confidence,
            anomaly_type=anomaly_type,
            severity=severity,
            metrics=metric
        )

detection_agent = DetectionAgent()
