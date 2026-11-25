package com.sharp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "recovery_recommendations", indexes = {
        @Index(name = "idx_rec_rec_incident", columnList = "incident_id"),
        @Index(name = "idx_rec_rec_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecoveryRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "incident_id", nullable = false)
    private Long incidentId;

    @Column(name = "action_type", nullable = false, length = 100)
    private String actionType;

    @Column(name = "action_name", nullable = false, length = 120)
    private String actionName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "target_resource", length = 150)
    private String targetResource;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String evidence;

    @Column(name = "risk_level", nullable = false, length = 20)
    private String riskLevel; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(name = "expected_result", columnDefinition = "TEXT")
    private String expectedResult;

    @Column(name = "estimated_impact", length = 120)
    private String estimatedImpact;

    @Column(name = "approval_required", nullable = false)
    private Boolean approvalRequired;

    @Column(name = "policy_rule", length = 150)
    private String policyRule;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED, EXECUTED, CANCELLED

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
