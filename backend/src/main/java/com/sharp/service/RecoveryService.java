package com.sharp.service;

import com.sharp.dto.RecoveryActionDto;
import com.sharp.entity.AnomalyEvent;
import com.sharp.entity.Incident;
import com.sharp.entity.RecoveryAction;
import com.sharp.entity.RecoveryRecommendation;
import com.sharp.entity.RootCauseAnalysis;
import com.sharp.exception.ApiException;
import com.sharp.exception.ResourceNotFoundException;
import com.sharp.recovery.RecoveryPolicyEngine;
import com.sharp.recovery.SafeActionExecutor;
import com.sharp.recovery.VerificationService;
import com.sharp.repository.AnomalyEventRepository;
import com.sharp.repository.IncidentRepository;
import com.sharp.repository.RecoveryActionRepository;
import com.sharp.repository.RecoveryRecommendationRepository;
import com.sharp.repository.RootCauseAnalysisRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecoveryService {

    private final RecoveryActionRepository recoveryActionRepository;
    private final RecoveryRecommendationRepository recommendationRepository;
    private final IncidentRepository incidentRepository;
    private final AnomalyEventRepository anomalyEventRepository;
    private final RootCauseAnalysisRepository rcaRepository;
    private final RecoveryPolicyEngine policyEngine;
    private final SafeActionExecutor safeActionExecutor;
    private final VerificationService verificationService;
    private final AuditService auditService;
    private final EventBroadcastService eventBroadcastService;

    @Transactional(readOnly = true)
    public List<RecoveryActionDto> getAllActions() {
        return recoveryActionRepository.findAll().stream()
                .map(this::toDto)
                .sorted((a, b) -> b.getInitiatedAt().compareTo(a.getInitiatedAt()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RecoveryActionDto getActionById(Long id) {
        RecoveryAction action = recoveryActionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecoveryAction", "id", id));
        return toDto(action);
    }

    @Transactional(readOnly = true)
    public List<RecoveryRecommendation> getAllRecommendations() {
        return recommendationRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public RecoveryRecommendation generateRecommendation(Long incidentId, String requestedActionType, String username, String ip) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", incidentId));

        String actionType = requestedActionType;
        if (actionType == null || actionType.isBlank()) {
            actionType = rcaRepository.findTopByIncidentIdOrderByCreatedAtDesc(incidentId)
                    .map(RootCauseAnalysis::getRecommendedActionType)
                    .orElse("RUN_HEALTH_PROBE");
        }

        RecoveryPolicyEngine.ActionPolicy policy = policyEngine.validateAndGetPolicy(actionType);
        String target = incident.getAffectedResource() != null ? incident.getAffectedResource() : "Host System";

        RecoveryRecommendation rec = recommendationRepository.save(RecoveryRecommendation.builder()
                .incidentId(incidentId)
                .actionType(policy.actionType())
                .actionName(policy.actionName())
                .description(policy.expectedResult())
                .targetResource(target)
                .reason("Recommended for incident #" + incidentId + ": " + incident.getTitle())
                .evidence(incident.getEvidence())
                .riskLevel(policy.riskLevel())
                .expectedResult(policy.expectedResult())
                .estimatedImpact(policy.estimatedImpact())
                .approvalRequired(policy.approvalRequired())
                .policyRule(policy.policyRule())
                .status("PENDING")
                .createdAt(Instant.now())
                .build());

        incident.setRecoveryStatus(policy.approvalRequired() ? "PENDING_APPROVAL" : "RECOMMENDED");
        incident.setUpdatedAt(Instant.now());
        incidentRepository.save(incident);

        auditService.record(username, "RECOVERY_RECOMMENDED", "RECOVERY_RECOMMENDATION", rec.getId().toString(),
                "Recommended " + policy.actionType() + " (" + policy.riskLevel() + ") for incident #" + incidentId, ip);
        eventBroadcastService.publish("RECOVERY_RECOMMENDED", rec);
        return rec;
    }

    @Transactional
    public RecoveryRecommendation approveRecommendation(Long recId, boolean isAdmin, String username, String ip) {
        RecoveryRecommendation rec = recommendationRepository.findById(recId)
                .orElseThrow(() -> new ResourceNotFoundException("RecoveryRecommendation", "id", recId));

        if (!"PENDING".equalsIgnoreCase(rec.getStatus())) {
            throw new ApiException("Recommendation is not in PENDING state", HttpStatus.BAD_REQUEST);
        }
        if (policyEngine.requiresAdminApproval(rec.getRiskLevel()) && !isAdmin) {
            throw new ApiException("Administrator role required to approve " + rec.getRiskLevel() + " risk actions", HttpStatus.FORBIDDEN);
        }

        rec.setStatus("APPROVED");
        rec = recommendationRepository.save(rec);
        auditService.record(username, "RECOMMENDATION_APPROVED", "RECOVERY_RECOMMENDATION", recId.toString(),
                "Approved recommendation " + rec.getActionType(), ip);
        eventBroadcastService.publish("RECOVERY_APPROVED", rec);
        return rec;
    }

    @Transactional
    public RecoveryRecommendation rejectRecommendation(Long recId, String reason, String username, String ip) {
        RecoveryRecommendation rec = recommendationRepository.findById(recId)
                .orElseThrow(() -> new ResourceNotFoundException("RecoveryRecommendation", "id", recId));

        if (!"PENDING".equalsIgnoreCase(rec.getStatus())) {
            throw new ApiException("Recommendation is not in PENDING state", HttpStatus.BAD_REQUEST);
        }
        rec.setStatus("REJECTED");
        rec = recommendationRepository.save(rec);
        auditService.record(username, "RECOMMENDATION_REJECTED", "RECOVERY_RECOMMENDATION", recId.toString(),
                "Rejected recommendation: " + reason, ip);
        return rec;
    }

    @Transactional
    public RecoveryRecommendation cancelRecommendation(Long recId, String username, String ip) {
        RecoveryRecommendation rec = recommendationRepository.findById(recId)
                .orElseThrow(() -> new ResourceNotFoundException("RecoveryRecommendation", "id", recId));

        if ("EXECUTED".equalsIgnoreCase(rec.getStatus())) {
            throw new ApiException("Cannot cancel an already executed recommendation", HttpStatus.BAD_REQUEST);
        }
        rec.setStatus("CANCELLED");
        rec = recommendationRepository.save(rec);
        auditService.record(username, "RECOMMENDATION_CANCELLED", "RECOVERY_RECOMMENDATION", recId.toString(),
                "Cancelled recommendation " + rec.getActionType(), ip);
        return rec;
    }

    @Transactional
    public RecoveryActionDto executeRecommendation(Long recId, boolean isAdmin, String username, String ip) {
        RecoveryRecommendation rec = recommendationRepository.findById(recId)
                .orElseThrow(() -> new ResourceNotFoundException("RecoveryRecommendation", "id", recId));

        if ("CANCELLED".equalsIgnoreCase(rec.getStatus()) || "REJECTED".equalsIgnoreCase(rec.getStatus())) {
            throw new ApiException("Cannot execute a " + rec.getStatus() + " recommendation", HttpStatus.BAD_REQUEST);
        }
        if ("EXECUTED".equalsIgnoreCase(rec.getStatus())) {
            throw new ApiException("Recommendation already executed (duplicate execution prevented)", HttpStatus.CONFLICT);
        }

        RecoveryPolicyEngine.ActionPolicy policy = policyEngine.validateAndGetPolicy(rec.getActionType());
        if (policyEngine.isManualOnly(policy.riskLevel())) {
            throw new ApiException("CRITICAL risk actions are manual-only and cannot be auto-executed", HttpStatus.FORBIDDEN);
        }
        if (policy.approvalRequired() && !"APPROVED".equalsIgnoreCase(rec.getStatus())) {
            throw new ApiException("Recommendation requires approval before execution", HttpStatus.FORBIDDEN);
        }
        if (policyEngine.requiresAdminApproval(policy.riskLevel()) && !isAdmin) {
            throw new ApiException("Administrator authorization required to execute " + policy.riskLevel() + " risk actions", HttpStatus.FORBIDDEN);
        }

        RecoveryActionDto result = executeAndVerify(
                rec.getIncidentId(), policy, rec.getId(), rec.getTargetResource(), username, ip);

        rec.setStatus("EXECUTED");
        recommendationRepository.save(rec);
        return result;
    }

    @Transactional
    public RecoveryActionDto triggerRecovery(Long incidentId, String actionType, String riskLevel, String username, String ip) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", incidentId));

        RecoveryPolicyEngine.ActionPolicy policy = policyEngine.validateAndGetPolicy(actionType);
        if (policyEngine.isManualOnly(policy.riskLevel())) {
            throw new ApiException("CRITICAL risk actions are manual-only", HttpStatus.FORBIDDEN);
        }

        boolean requiresApproval = policy.approvalRequired() || "HIGH".equalsIgnoreCase(riskLevel) || "MEDIUM".equalsIgnoreCase(riskLevel);
        if (requiresApproval) {
            RecoveryAction pending = recoveryActionRepository.save(RecoveryAction.builder()
                    .incident(incident)
                    .actionType(policy.actionType())
                    .riskLevel(policy.riskLevel())
                    .status("AWAITING_APPROVAL")
                    .requiresApproval(true)
                    .targetResource(incident.getAffectedResource())
                    .initiatedBy(username)
                    .executionDetails("Queued for approval: " + policy.actionName())
                    .verificationStatus("UNVERIFIED")
                    .initiatedAt(Instant.now())
                    .build());

            incident.setStatus("RECOVERY_PENDING");
            incident.setRecoveryStatus("PENDING_APPROVAL");
            incident.setUpdatedAt(Instant.now());
            incidentRepository.save(incident);

            auditService.record(username, "RECOVERY_INITIATED", "RECOVERY_ACTION", pending.getId().toString(),
                    "Queued " + policy.actionType() + " awaiting approval", ip);
            return toDto(pending);
        }

        return executeAndVerify(incidentId, policy, null, incident.getAffectedResource(), username, ip);
    }

    @Transactional
    public RecoveryActionDto approveRecovery(Long id, String adminUsername, String ip) {
        RecoveryAction action = recoveryActionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecoveryAction", "id", id));

        if (!"AWAITING_APPROVAL".equalsIgnoreCase(action.getStatus())) {
            throw new ApiException("Action is not in AWAITING_APPROVAL state (current status: " + action.getStatus() + ")", HttpStatus.BAD_REQUEST);
        }

        RecoveryPolicyEngine.ActionPolicy policy = policyEngine.validateAndGetPolicy(action.getActionType());
        action.setStatus("APPROVED");
        action.setApprovedBy(adminUsername);
        action.setApprovalTimestamp(Instant.now());
        recoveryActionRepository.save(action);

        auditService.record(adminUsername, "RECOVERY_APPROVED", "RECOVERY_ACTION", action.getId().toString(),
                "Administrator approved recovery action " + action.getActionType(), ip);

        return executeAndVerifyExisting(action, policy, adminUsername, ip);
    }

    @Transactional
    public RecoveryActionDto rejectRecovery(Long id, String reason, String adminUsername, String ip) {
        RecoveryAction action = recoveryActionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecoveryAction", "id", id));

        if (!"AWAITING_APPROVAL".equalsIgnoreCase(action.getStatus())) {
            throw new ApiException("Action is not in AWAITING_APPROVAL state", HttpStatus.BAD_REQUEST);
        }

        action.setStatus("REJECTED");
        action.setApprovedBy(adminUsername);
        action.setApprovalTimestamp(Instant.now());
        action.setFailureReason(reason);
        action.setCompletedAt(Instant.now());
        action.setExecutionDetails((action.getExecutionDetails() != null ? action.getExecutionDetails() + "\n" : "")
                + "Rejected by administrator: " + reason);

        action = recoveryActionRepository.save(action);
        auditService.record(adminUsername, "RECOVERY_REJECTED", "RECOVERY_ACTION", action.getId().toString(),
                "Administrator rejected recovery action: " + reason, ip);

        return toDto(action);
    }

    private RecoveryActionDto executeAndVerify(
            Long incidentId, RecoveryPolicyEngine.ActionPolicy policy, Long recId,
            String targetResource, String username, String ip) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", incidentId));

        // Prevent duplicate concurrent execution on the same incident
        boolean alreadyRunning = recoveryActionRepository.findAll().stream()
                .anyMatch(a -> a.getIncident() != null && a.getIncident().getId().equals(incidentId)
                        && ("EXECUTING".equals(a.getStatus()) || "VERIFYING".equals(a.getStatus())));
        if (alreadyRunning) {
            throw new ApiException("A recovery execution is already in progress for incident #" + incidentId, HttpStatus.CONFLICT);
        }

        RecoveryAction action = recoveryActionRepository.save(RecoveryAction.builder()
                .incident(incident)
                .recommendationId(recId)
                .actionType(policy.actionType())
                .riskLevel(policy.riskLevel())
                .status("EXECUTING")
                .requiresApproval(policy.approvalRequired())
                .targetResource(targetResource)
                .initiatedBy(username)
                .executionDetails("Executing safe allowlisted action: " + policy.actionName())
                .verificationStatus("UNVERIFIED")
                .initiatedAt(Instant.now())
                .build());

        return executeAndVerifyExisting(action, policy, username, ip);
    }

    private RecoveryActionDto executeAndVerifyExisting(
            RecoveryAction action, RecoveryPolicyEngine.ActionPolicy policy, String username, String ip) {
        Incident incident = action.getIncident();
        incident.setStatus("RECOVERING");
        incident.setRecoveryStatus("EXECUTING");
        incident.setUpdatedAt(Instant.now());
        incidentRepository.save(incident);

        SafeActionExecutor.ExecutionResult execResult = safeActionExecutor.execute(
                policy.actionType(), action.getTargetResource());

        if (!execResult.success()) {
            action.setStatus("FAILED");
            action.setVerificationStatus("UNVERIFIED");
            action.setFailureReason(execResult.failureReason());
            action.setExecutionDetails(execResult.summary());
            action.setCompletedAt(Instant.now());
            action = recoveryActionRepository.save(action);

            incident.setStatus("FAILED");
            incident.setRecoveryStatus("FAILED");
            incident.setUpdatedAt(Instant.now());
            incidentRepository.save(incident);

            auditService.record(username, "RECOVERY_FAILED", "RECOVERY_ACTION", action.getId().toString(),
                    "Execution failed: " + execResult.failureReason(), ip);
            eventBroadcastService.publish("RECOVERY_FAILED", toDto(action));
            return toDto(action);
        }

        // Independent Verification
        action.setStatus("VERIFYING");
        action.setVerificationStatus("VERIFYING");
        action.setExecutionDetails(execResult.summary());
        recoveryActionRepository.save(action);

        incident.setStatus("VERIFYING");
        incident.setRecoveryStatus("VERIFYING");
        incidentRepository.save(incident);

        VerificationService.VerificationOutcome outcome = verificationService.verify(incident, action);
        action.setVerificationStatus(outcome.status());
        action.setVerificationEvidence(outcome.evidence());
        action.setCompletedAt(Instant.now());

        if (outcome.resolved()) {
            action.setStatus("VERIFIED");
            incident.setStatus("RESOLVED");
            incident.setRecoveryStatus("VERIFIED");
            incident.setResolvedAt(Instant.now());

            // Resolve linked anomalies
            List<AnomalyEvent> linked = anomalyEventRepository.findByIncidentId(incident.getId());
            for (AnomalyEvent a : linked) {
                a.setStatus("RESOLVED");
                a.setUpdatedAt(Instant.now());
                anomalyEventRepository.save(a);
            }
            eventBroadcastService.publish("RECOVERY_VERIFIED", toDto(action));
        } else {
            // Do NOT falsely resolve incident when verification fails
            action.setStatus("FAILED");
            action.setFailureReason("Independent verification did not confirm recovery");
            incident.setStatus("OPEN");
            incident.setRecoveryStatus("FAILED");
            eventBroadcastService.publish("RECOVERY_FAILED", toDto(action));
        }

        incident.setUpdatedAt(Instant.now());
        incidentRepository.save(incident);
        action = recoveryActionRepository.save(action);

        auditService.record(username, "RECOVERY_" + action.getVerificationStatus(), "RECOVERY_ACTION", action.getId().toString(),
                "Verification=" + outcome.status() + " for incident #" + incident.getId(), ip);
        return toDto(action);
    }

    public RecoveryActionDto toDto(RecoveryAction action) {
        return RecoveryActionDto.builder()
                .id(action.getId())
                .incidentId(action.getIncident() != null ? action.getIncident().getId() : null)
                .incidentTitle(action.getIncident() != null ? action.getIncident().getTitle() : null)
                .actionType(action.getActionType())
                .riskLevel(action.getRiskLevel())
                .status(action.getStatus())
                .requiresApproval(action.getRequiresApproval())
                .approvedBy(action.getApprovedBy())
                .approvalTimestamp(action.getApprovalTimestamp())
                .executionDetails(action.getExecutionDetails())
                .verificationStatus(action.getVerificationStatus())
                .recommendationId(action.getRecommendationId())
                .targetResource(action.getTargetResource())
                .initiatedBy(action.getInitiatedBy())
                .verificationEvidence(action.getVerificationEvidence())
                .failureReason(action.getFailureReason())
                .initiatedAt(action.getInitiatedAt())
                .completedAt(action.getCompletedAt())
                .build();
    }
}
