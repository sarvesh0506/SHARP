package com.sharp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "root_cause_analyses", indexes = {
        @Index(name = "idx_rca_incident_id", columnList = "incident_id"),
        @Index(name = "idx_rca_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RootCauseAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "incident_id", nullable = false)
    private Long incidentId;

    @Column(name = "anomaly_id")
    private Long anomalyId;

    @Column(name = "analysis_method", nullable = false, length = 40)
    private String analysisMethod; // AI_ANALYSIS, DETERMINISTIC_FALLBACK

    @Column(nullable = false, length = 30)
    private String status; // COMPLETED, FAILED

    @Column(columnDefinition = "TEXT", nullable = false)
    private String hypothesis;

    @Column(name = "supporting_evidence", columnDefinition = "TEXT")
    private String supportingEvidence;

    @Column(name = "contributing_factors", columnDefinition = "TEXT")
    private String contributingFactors;

    @Column(name = "affected_components", columnDefinition = "TEXT")
    private String affectedComponents;

    @Column(name = "recommended_investigation", columnDefinition = "TEXT")
    private String recommendedInvestigation;

    @Column(name = "recommended_action_type", length = 100)
    private String recommendedActionType;

    @Column(name = "confidence_score")
    private Double confidenceScore; // Only populated when AI service returns it

    @Column(name = "analyzed_by", length = 60)
    private String analyzedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
