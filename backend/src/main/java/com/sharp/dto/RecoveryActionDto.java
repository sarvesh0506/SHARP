package com.sharp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecoveryActionDto {
    private Long id;
    private Long incidentId;
    private String incidentTitle;
    private String actionType;
    private String riskLevel;
    private String status;
    private Boolean requiresApproval;
    private String approvedBy;
    private Instant approvalTimestamp;
    private String executionDetails;
    private String verificationStatus;
    private Instant initiatedAt;
    private Instant completedAt;
}
