package com.sharp.service;

import com.sharp.dto.IncidentDto;
import com.sharp.entity.AnomalyEvent;
import com.sharp.entity.ApplicationEntity;
import com.sharp.entity.Incident;
import com.sharp.exception.ApiException;
import com.sharp.exception.ResourceNotFoundException;
import com.sharp.repository.ApplicationRepository;
import com.sharp.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final ApplicationRepository applicationRepository;
    private final AuditService auditService;
    private final EventBroadcastService eventBroadcastService;

    private static final List<String> CLOSED_STATUSES = List.of("RESOLVED", "CLOSED");

    @Transactional(readOnly = true)
    public List<IncidentDto> getAllIncidents() {
        return incidentRepository.findAllByOrderByOpenedAtDesc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<IncidentDto> getActiveIncidents() {
        return incidentRepository.findAllByOrderByOpenedAtDesc().stream()
                .filter(i -> !CLOSED_STATUSES.contains(i.getStatus()))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public IncidentDto getIncidentById(Long id) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", id));
        return toDto(incident);
    }

    @Transactional
    public IncidentDto createIncident(IncidentDto dto, String username, String ip) {
        ApplicationEntity app = null;
        if (dto.getApplicationId() != null) {
            app = applicationRepository.findById(dto.getApplicationId()).orElse(null);
        }

        Instant now = Instant.now();
        Incident incident = Incident.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .application(app)
                .severity(dto.getSeverity() != null ? dto.getSeverity() : "MEDIUM")
                .status("OPEN")
                .rootCause(dto.getRootCause())
                .detectedByAgent(dto.getDetectedByAgent() != null ? dto.getDetectedByAgent() : "Manual Operator")
                .evidence(dto.getEvidence())
                .source(dto.getSource() != null ? dto.getSource() : "MANUAL")
                .affectedResource(dto.getAffectedResource() != null ? dto.getAffectedResource()
                        : (app != null ? app.getName() : "Host System"))
                .rcaStatus("PENDING")
                .recoveryStatus("NONE")
                .openedAt(now)
                .updatedAt(now)
                .build();

        incident = incidentRepository.save(incident);
        auditService.record(username, "INCIDENT_CREATED", "INCIDENT", incident.getId().toString(),
                "Opened incident " + incident.getTitle(), ip);
        IncidentDto result = toDto(incident);
        eventBroadcastService.publish("INCIDENT_CREATED", result);
        return result;
    }

    @Transactional
    public Long createOrAttachFromAnomaly(AnomalyEvent anomaly) {
        String resourceKey = anomaly.getResourceName() + ":" + anomaly.getMetricName();
        var existingOpt = incidentRepository.findTopByAffectedResourceAndStatusNotInOrderByOpenedAtDesc(
                resourceKey, CLOSED_STATUSES);

        if (existingOpt.isPresent()) {
            Incident existing = existingOpt.get();
            existing.setUpdatedAt(Instant.now());
            existing.setEvidence(anomaly.getEvidence());
            if ("CRITICAL".equalsIgnoreCase(anomaly.getSeverity())) {
                existing.setSeverity("CRITICAL");
            }
            incidentRepository.save(existing);
            return existing.getId();
        }

        Instant now = Instant.now();
        Incident created = incidentRepository.save(Incident.builder()
                .title(anomaly.getMetricName() + " Anomaly on " + anomaly.getResourceName())
                .description(anomaly.getDescription())
                .severity(anomaly.getSeverity())
                .status("OPEN")
                .detectedByAgent("AUTO_DETECTION".equals(anomaly.getDetectionMethod()) || "AI_ANALYSIS".equals(anomaly.getDetectionMethod())
                        ? "Detection Agent"
                        : "Detection Engine (" + anomaly.getDetectionMethod() + ")")
                .evidence(anomaly.getEvidence())
                .source("AUTO_DETECTION")
                .affectedResource(resourceKey)
                .anomalyId(anomaly.getId())
                .rcaStatus("PENDING")
                .recoveryStatus("NONE")
                .openedAt(now)
                .updatedAt(now)
                .build());

        auditService.record("SYSTEM", "INCIDENT_AUTO_CREATED", "INCIDENT", created.getId().toString(),
                "Auto-created from anomaly #" + anomaly.getId() + " (" + anomaly.getDetectionMethod() + ")", "127.0.0.1");
        eventBroadcastService.publish("INCIDENT_CREATED", toDto(created));
        return created.getId();
    }

    @Transactional
    public IncidentDto transitionStatus(Long id, String targetStatus, String notes, String username, String ip) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", id));

        String normalized = targetStatus.toUpperCase();
        List<String> valid = List.of(
                "OPEN", "ACKNOWLEDGED", "INVESTIGATING", "RECOVERY_PENDING",
                "RECOVERING", "VERIFYING", "RESOLVED", "FAILED", "REOPENED", "CLOSED"
        );
        if (!valid.contains(normalized)) {
            throw new ApiException("Unsupported incident status: " + targetStatus, HttpStatus.BAD_REQUEST);
        }

        incident.setStatus(normalized);
        incident.setUpdatedAt(Instant.now());
        if ("RESOLVED".equals(normalized) || "CLOSED".equals(normalized)) {
            incident.setResolvedAt(Instant.now());
        } else if ("REOPENED".equals(normalized)) {
            incident.setResolvedAt(null);
        }

        if (notes != null && !notes.isBlank()) {
            incident.setDescription((incident.getDescription() != null ? incident.getDescription() : "") +
                    "\n[" + normalized + " by " + username + "]: " + notes.trim());
        }

        incident = incidentRepository.save(incident);
        auditService.record(username, "INCIDENT_" + normalized, "INCIDENT", incident.getId().toString(),
                "Transitioned incident #" + id + " to " + normalized, ip);
        IncidentDto dto = toDto(incident);
        eventBroadcastService.publish("INCIDENT_STATUS_CHANGED", dto);
        return dto;
    }

    @Transactional
    public IncidentDto resolveIncident(Long id, String resolutionNotes, String username, String ip) {
        return transitionStatus(id, "RESOLVED", resolutionNotes, username, ip);
    }

    public IncidentDto toDto(Incident incident) {
        return IncidentDto.builder()
                .id(incident.getId())
                .title(incident.getTitle())
                .description(incident.getDescription())
                .applicationId(incident.getApplication() != null ? incident.getApplication().getId() : null)
                .applicationName(incident.getApplication() != null ? incident.getApplication().getName() : null)
                .serverId(incident.getServer() != null ? incident.getServer().getId() : null)
                .serverHostName(incident.getServer() != null ? incident.getServer().getHostName() : null)
                .severity(incident.getSeverity())
                .status(incident.getStatus())
                .rootCause(incident.getRootCause())
                .detectedByAgent(incident.getDetectedByAgent())
                .evidence(incident.getEvidence())
                .source(incident.getSource())
                .affectedResource(incident.getAffectedResource())
                .anomalyId(incident.getAnomalyId())
                .rcaStatus(incident.getRcaStatus())
                .recoveryStatus(incident.getRecoveryStatus())
                .openedAt(incident.getOpenedAt())
                .updatedAt(incident.getUpdatedAt())
                .resolvedAt(incident.getResolvedAt())
                .build();
    }
}
