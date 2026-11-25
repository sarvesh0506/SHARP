package com.sharp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "incidents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "application_id")
    private ApplicationEntity application;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "server_id")
    private MonitoredServer server;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String severity = "MEDIUM"; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "OPEN"; // OPEN, DIAGNOSING, RECOVERING, RESOLVED, FAILED

    @Column(name = "root_cause", columnDefinition = "TEXT")
    private String rootCause;

    @Column(name = "detected_by_agent", length = 50)
    @Builder.Default
    private String detectedByAgent = "Sentinel Agent";

    @Column(columnDefinition = "TEXT")
    private String evidence;

    @Column(length = 40)
    @Builder.Default
    private String source = "MANUAL"; // AUTO_DETECTION, MANUAL

    @Column(name = "affected_resource", length = 150)
    private String affectedResource;

    @Column(name = "anomaly_id")
    private Long anomalyId;

    @Column(name = "rca_status", length = 30)
    @Builder.Default
    private String rcaStatus = "PENDING"; // PENDING, COMPLETED, FALLBACK_COMPLETED

    @Column(name = "recovery_status", length = 30)
    @Builder.Default
    private String recoveryStatus = "NONE"; // NONE, RECOMMENDED, PENDING_APPROVAL, EXECUTING, VERIFYING, VERIFIED, FAILED

    @CreationTimestamp
    @Column(name = "opened_at", updatable = false)
    private Instant openedAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;
}
