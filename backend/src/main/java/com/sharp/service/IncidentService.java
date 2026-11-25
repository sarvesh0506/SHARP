package com.sharp.service;

import com.sharp.dto.IncidentDto;
import com.sharp.entity.ApplicationEntity;
import com.sharp.entity.Incident;
import com.sharp.exception.ResourceNotFoundException;
import com.sharp.repository.ApplicationRepository;
import com.sharp.repository.IncidentRepository;
import com.sharp.repository.MonitoredServerRepository;
import lombok.RequiredArgsConstructor;
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
    private final MonitoredServerRepository monitoredServerRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<IncidentDto> getAllIncidents() {
        return incidentRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<IncidentDto> getActiveIncidents() {
        return incidentRepository.findByStatus("OPEN").stream()
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

        Incident incident = Incident.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .application(app)
                .severity(dto.getSeverity() != null ? dto.getSeverity() : "MEDIUM")
                .status("OPEN")
                .rootCause(dto.getRootCause())
                .detectedByAgent(dto.getDetectedByAgent() != null ? dto.getDetectedByAgent() : "Sentinel Agent")
                .evidence(dto.getEvidence())
                .openedAt(Instant.now())
                .build();

        incident = incidentRepository.save(incident);
        auditService.record(username, "INCIDENT_CREATED", "INCIDENT", incident.getId().toString(), "Opened incident " + incident.getTitle(), ip);
        return toDto(incident);
    }

    @Transactional
    public IncidentDto resolveIncident(Long id, String resolutionNotes, String username, String ip) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", id));

        incident.setStatus("RESOLVED");
        incident.setResolvedAt(Instant.now());
        if (resolutionNotes != null && !resolutionNotes.isBlank()) {
            incident.setDescription(incident.getDescription() + "\nResolution: " + resolutionNotes);
        }

        incident = incidentRepository.save(incident);
        auditService.record(username, "INCIDENT_RESOLVED", "INCIDENT", incident.getId().toString(), "Resolved incident " + incident.getTitle(), ip);
        return toDto(incident);
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
                .openedAt(incident.getOpenedAt())
                .resolvedAt(incident.getResolvedAt())
                .build();
    }
}
