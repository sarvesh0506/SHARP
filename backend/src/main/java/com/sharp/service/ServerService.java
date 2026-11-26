package com.sharp.service;

import com.sharp.dto.MonitoredServerDto;
import com.sharp.entity.Incident;
import com.sharp.entity.MonitoredServer;
import com.sharp.exception.ApiException;
import com.sharp.exception.ResourceNotFoundException;
import com.sharp.repository.IncidentRepository;
import com.sharp.repository.MonitoredServerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ServerService {

    private static final Set<String> VALID_STATUSES = Set.of("ONLINE", "DEGRADED", "OFFLINE");

    private final MonitoredServerRepository monitoredServerRepository;
    private final IncidentRepository incidentRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<MonitoredServerDto> getAllServers() {
        return monitoredServerRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MonitoredServerDto getServerById(Long id) {
        MonitoredServer server = monitoredServerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Server", "id", id));
        return toDto(server);
    }

    @Transactional
    public MonitoredServerDto registerServer(MonitoredServerDto dto, String username, String ip) {
        MonitoredServer server = MonitoredServer.builder()
                .hostName(dto.getHostName())
                .ipAddress(dto.getIpAddress())
                .osType(dto.getOsType() != null ? dto.getOsType() : "Linux")
                .agentVersion(dto.getAgentVersion() != null ? dto.getAgentVersion() : "1.0.0")
                .status("ONLINE")
                .cpuUsage(0.0)
                .memoryUsage(0.0)
                .diskUsage(0.0)
                .lastSeen(Instant.now())
                .build();

        server = monitoredServerRepository.save(server);
        auditService.record(username, "SERVER_REGISTERED", "INFRASTRUCTURE", server.getId().toString(), "Registered server " + server.getHostName(), ip);
        return toDto(server);
    }

    @Transactional
    public MonitoredServerDto updateServer(Long id, MonitoredServerDto dto, String username, String ip) {
        MonitoredServer server = monitoredServerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Server", "id", id));

        server.setHostName(dto.getHostName().trim());
        server.setIpAddress(dto.getIpAddress().trim());
        if (dto.getOsType() != null && !dto.getOsType().isBlank()) {
            server.setOsType(dto.getOsType().trim());
        }
        if (dto.getAgentVersion() != null && !dto.getAgentVersion().isBlank()) {
            server.setAgentVersion(dto.getAgentVersion().trim());
        }
        if (dto.getStatus() != null && !dto.getStatus().isBlank()) {
            String normalizedStatus = dto.getStatus().trim().toUpperCase();
            if (!VALID_STATUSES.contains(normalizedStatus)) {
                throw new ApiException("Invalid server status: " + dto.getStatus(), HttpStatus.BAD_REQUEST);
            }
            server.setStatus(normalizedStatus);
        }

        server = monitoredServerRepository.save(server);
        auditService.record(username, "SERVER_UPDATED", "INFRASTRUCTURE", server.getId().toString(),
                "Updated server " + server.getHostName(), ip);
        return toDto(server);
    }

    @Transactional
    public void deleteServer(Long id, String username, String ip) {
        MonitoredServer server = monitoredServerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Server", "id", id));

        // Preserve incident history by detaching server FK before removal
        List<Incident> linkedIncidents = incidentRepository.findByServerId(id);
        for (Incident incident : linkedIncidents) {
            incident.setServer(null);
            incidentRepository.save(incident);
        }

        monitoredServerRepository.delete(server);
        auditService.record(username, "SERVER_DELETED", "INFRASTRUCTURE", id.toString(),
                "Removed server " + server.getHostName(), ip);
    }

    public MonitoredServerDto toDto(MonitoredServer server) {
        return MonitoredServerDto.builder()
                .id(server.getId())
                .hostName(server.getHostName())
                .ipAddress(server.getIpAddress())
                .osType(server.getOsType())
                .agentVersion(server.getAgentVersion())
                .status(server.getStatus())
                .cpuUsage(server.getCpuUsage())
                .memoryUsage(server.getMemoryUsage())
                .diskUsage(server.getDiskUsage())
                .lastSeen(server.getLastSeen())
                .createdAt(server.getCreatedAt())
                .build();
    }
}
