package com.sharp.service;

import com.sharp.dto.ApplicationDto;
import com.sharp.entity.ApplicationEntity;
import com.sharp.exception.ResourceNotFoundException;
import com.sharp.repository.ApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<ApplicationDto> getAllApplications() {
        return applicationRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ApplicationDto getApplicationById(Long id) {
        ApplicationEntity app = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", id));
        return toDto(app);
    }

    @Transactional
    public ApplicationDto registerApplication(ApplicationDto dto, String username, String ip) {
        ApplicationEntity app = ApplicationEntity.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .dockerContainerId(dto.getDockerContainerId())
                .dockerImage(dto.getDockerImage())
                .healthEndpoint(dto.getHealthEndpoint() != null ? dto.getHealthEndpoint() : "/health")
                .port(dto.getPort())
                .status("HEALTHY")
                .cpuUsage(0.0)
                .memoryUsage(0.0)
                .restartCount(0)
                .isAutoRecoveryEnabled(dto.getIsAutoRecoveryEnabled() != null ? dto.getIsAutoRecoveryEnabled() : true)
                .lastHeartbeat(Instant.now())
                .build();

        app = applicationRepository.save(app);
        auditService.record(username, "APPLICATION_REGISTERED", "APPLICATION", app.getId().toString(), "Registered application " + app.getName(), ip);
        return toDto(app);
    }

    @Transactional
    public ApplicationDto updateApplication(Long id, ApplicationDto dto, String username, String ip) {
        ApplicationEntity app = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", id));

        app.setName(dto.getName());
        app.setDescription(dto.getDescription());
        app.setDockerContainerId(dto.getDockerContainerId());
        app.setDockerImage(dto.getDockerImage());
        app.setHealthEndpoint(dto.getHealthEndpoint());
        app.setPort(dto.getPort());
        if (dto.getIsAutoRecoveryEnabled() != null) {
            app.setIsAutoRecoveryEnabled(dto.getIsAutoRecoveryEnabled());
        }

        app = applicationRepository.save(app);
        auditService.record(username, "APPLICATION_UPDATED", "APPLICATION", app.getId().toString(), "Updated configuration for " + app.getName(), ip);
        return toDto(app);
    }

    @Transactional
    public void deleteApplication(Long id, String username, String ip) {
        ApplicationEntity app = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", id));

        applicationRepository.delete(app);
        auditService.record(username, "APPLICATION_DELETED", "APPLICATION", id.toString(), "Removed application " + app.getName(), ip);
    }

    public ApplicationDto toDto(ApplicationEntity app) {
        return ApplicationDto.builder()
                .id(app.getId())
                .name(app.getName())
                .description(app.getDescription())
                .dockerContainerId(app.getDockerContainerId())
                .dockerImage(app.getDockerImage())
                .healthEndpoint(app.getHealthEndpoint())
                .port(app.getPort())
                .status(app.getStatus())
                .cpuUsage(app.getCpuUsage())
                .memoryUsage(app.getMemoryUsage())
                .restartCount(app.getRestartCount())
                .isAutoRecoveryEnabled(app.getIsAutoRecoveryEnabled())
                .lastHeartbeat(app.getLastHeartbeat())
                .createdAt(app.getCreatedAt())
                .build();
    }
}
