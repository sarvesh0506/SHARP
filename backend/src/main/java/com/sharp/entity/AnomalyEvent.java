package com.sharp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "anomalies", indexes = {
        @Index(name = "idx_anomalies_detected_at", columnList = "detected_at"),
        @Index(name = "idx_anomalies_status", columnList = "status"),
        @Index(name = "idx_anomalies_resource", columnList = "resource_name, metric_name")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnomalyEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "resource_type", nullable = false, length = 40)
    private String resourceType; // HOST, PROCESS, APPLICATION

    @Column(name = "resource_name", nullable = false, length = 150)
    private String resourceName;

    @Column(name = "metric_name", nullable = false, length = 80)
    private String metricName; // CPU_PERCENT, MEMORY_PERCENT, DISK_PERCENT, NETWORK_MBPS, PROCESS_CPU, PROCESS_MEMORY

    @Column(name = "observed_value", nullable = false)
    private Double observedValue;

    @Column(name = "baseline_value")
    private Double baselineValue;

    @Column(name = "detection_method", nullable = false, length = 40)
    private String detectionMethod; // RULE_BASED, STATISTICAL, AI_ANALYSIS

    @Column(nullable = false, length = 20)
    private String severity; // INFO, LOW, MEDIUM, HIGH, CRITICAL

    @Column(name = "anomaly_score")
    private Double anomalyScore;

    @Column(name = "confidence_score")
    private Double confidenceScore; // Only populated when returned by AI service

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, ACKNOWLEDGED, RESOLVED, SUPPRESSED

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String evidence;

    @Column(name = "recommended_step", columnDefinition = "TEXT")
    private String recommendedStep;

    @Column(name = "system_metric_id")
    private Long systemMetricId;

    @Column(name = "incident_id")
    private Long incidentId;

    @Column(name = "detected_at", nullable = false)
    private Instant detectedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
