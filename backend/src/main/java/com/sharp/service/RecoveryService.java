package com.sharp.service;

import com.sharp.dto.RecoveryActionDto;
import com.sharp.entity.Incident;
import com.sharp.entity.RecoveryAction;
import com.sharp.exception.ApiException;
import com.sharp.exception.ResourceNotFoundException;
import com.sharp.repository.IncidentRepository;
import com.sharp.repository.RecoveryActionRepository;
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
    private final IncidentRepository incidentRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<RecoveryActionDto> getAllActions() {
        return recoveryActionRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RecoveryActionDto getActionById(Long id) {
        RecoveryAction action = recoveryActionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecoveryAction", "id", id));
        return toDto(action);
    }

    @Transactional
    public RecoveryActionDto triggerRecovery(Long incidentId, String actionType, String riskLevel, String username, String ip) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", incidentId));

        boolean requiresApproval = "HIGH".equalsIgnoreCase(riskLevel);

        RecoveryAction action = RecoveryAction.builder()
                .incident(incident)
                .actionType(actionType)
                .riskLevel(riskLevel != null ? riskLevel : "LOW")
                .status(requiresApproval ? "AWAITING_APPROVAL" : "EXECUTING")
                .requiresApproval(requiresApproval)
                .executionDetails("Initiated controlled recovery: " + actionType)
                .verificationStatus("UNVERIFIED")
                .initiatedAt(Instant.now())
                .build();

        action = recoveryActionRepository.save(action);
        auditService.record(username, "RECOVERY_INITIATED", "RECOVERY_ACTION", action.getId().toString(),
                "Initiated " + actionType + " for incident " + incident.getTitle() + " (Requires approval: " + requiresApproval + ")", ip);

        return toDto(action);
    }

    @Transactional
    public RecoveryActionDto approveRecovery(Long id, String adminUsername, String ip) {
        RecoveryAction action = recoveryActionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecoveryAction", "id", id));

        if (!"AWAITING_APPROVAL".equalsIgnoreCase(action.getStatus())) {
            throw new ApiException("Action is not in AWAITING_APPROVAL state (current status: " + action.getStatus() + ")", HttpStatus.BAD_REQUEST);
        }

        action.setStatus("APPROVED");
        action.setApprovedBy(adminUsername);
        action.setApprovalTimestamp(Instant.now());
        action.setExecutionDetails(action.getExecutionDetails() + "\nApproved by administrator: " + adminUsername);

        action = recoveryActionRepository.save(action);
        auditService.record(adminUsername, "RECOVERY_APPROVED", "RECOVERY_ACTION", action.getId().toString(),
                "Administrator approved recovery action " + action.getActionType(), ip);

        return toDto(action);
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
        action.setExecutionDetails(action.getExecutionDetails() + "\nRejected by administrator: " + reason);

        action = recoveryActionRepository.save(action);
        auditService.record(adminUsername, "RECOVERY_REJECTED", "RECOVERY_ACTION", action.getId().toString(),
                "Administrator rejected recovery action: " + reason, ip);

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
                .initiatedAt(action.getInitiatedAt())
                .completedAt(action.getCompletedAt())
                .build();
    }
}
