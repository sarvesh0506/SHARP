package com.sharp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "recovery_actions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecoveryAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "incident_id")
    private Incident incident;

    @Column(name = "action_type", nullable = false, length = 100)
    private String actionType; // RESTART_CONTAINER, SCALE_REPLICAS, FLUSH_REDIS_CACHE, RELOAD_CONFIG

    @Column(name = "risk_level", nullable = false, length = 20)
    @Builder.Default
    private String riskLevel = "LOW"; // LOW, MEDIUM, HIGH

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING"; // PENDING, AWAITING_APPROVAL, APPROVED, REJECTED, EXECUTING, SUCCESS, FAILED

    @Column(name = "requires_approval")
    @Builder.Default
    private Boolean requiresApproval = false;

    @Column(name = "approved_by", length = 50)
    private String approvedBy;

    @Column(name = "approval_timestamp")
    private Instant approvalTimestamp;

    @Column(name = "execution_details", columnDefinition = "TEXT")
    private String executionDetails;

    @Column(name = "verification_status", length = 30)
    @Builder.Default
    private String verificationStatus = "UNVERIFIED"; // UNVERIFIED, VERIFYING, VERIFIED_SUCCESS, VERIFIED_FAILURE

    @CreationTimestamp
    @Column(name = "initiated_at", updatable = false)
    private Instant initiatedAt;

    @Column(name = "completed_at")
    private Instant completedAt;
}
