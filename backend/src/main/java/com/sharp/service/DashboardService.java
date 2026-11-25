package com.sharp.service;

import com.sharp.dto.DashboardSummaryDto;
import com.sharp.entity.ApplicationEntity;
import com.sharp.entity.Incident;
import com.sharp.entity.RecoveryAction;
import com.sharp.repository.ApplicationRepository;
import com.sharp.repository.IncidentRepository;
import com.sharp.repository.RecoveryActionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.OptionalDouble;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final List<String> RESOLVED_STATUSES = List.of("RESOLVED", "CLOSED");

    private final ApplicationRepository applicationRepository;
    private final IncidentRepository incidentRepository;
    private final RecoveryActionRepository recoveryActionRepository;
    private final ApplicationService applicationService;
    private final IncidentService incidentService;

    @Transactional(readOnly = true)
    public DashboardSummaryDto getSummary() {
        List<ApplicationEntity> allApps = applicationRepository.findAll();
        long totalApps = allApps.size();
        long healthyApps = allApps.stream().filter(a -> "HEALTHY".equalsIgnoreCase(a.getStatus())).count();
        long unhealthyApps = totalApps - healthyApps;

        long activeIncidents = incidentRepository.countByStatusNotIn(RESOLVED_STATUSES);

        List<RecoveryAction> allActions = recoveryActionRepository.findAll();
        long totalActions = allActions.size();
        long successfulActions = allActions.stream()
                .filter(a -> "VERIFIED".equalsIgnoreCase(a.getStatus())
                        || "VERIFIED".equalsIgnoreCase(a.getVerificationStatus())
                        || "SUCCESS".equalsIgnoreCase(a.getStatus()))
                .count();

        Double successRate = totalActions > 0
                ? Math.round(((double) successfulActions / totalActions * 100.0) * 10.0) / 10.0
                : null;

        // Calculate MTTR (Mean Time To Resolve) in seconds from actual resolved incidents (openedAt -> resolvedAt).
        // Returns null when no resolved incidents with valid timestamps exist (never fabricated).
        Double mttrSeconds = calculateMttrSeconds(incidentRepository.findByStatusIn(RESOLVED_STATUSES));

        double avgCpu = allApps.stream()
                .mapToDouble(a -> a.getCpuUsage() != null ? a.getCpuUsage() : 0.0)
                .average()
                .orElse(0.0);

        double avgMemory = allApps.stream()
                .mapToDouble(a -> a.getMemoryUsage() != null ? a.getMemoryUsage() : 0.0)
                .average()
                .orElse(0.0);

        return DashboardSummaryDto.builder()
                .totalApplications(totalApps)
                .healthyApplications(healthyApps)
                .unhealthyApplications(unhealthyApps)
                .activeIncidents(activeIncidents)
                .recoverySuccessRate(successRate)
                .avgRecoveryTimeSeconds(mttrSeconds)
                .avgCpuUsage(Math.round(avgCpu * 10.0) / 10.0)
                .avgMemoryUsage(Math.round(avgMemory * 10.0) / 10.0)
                .recentApplications(applicationService.getAllApplications())
                .recentIncidents(incidentRepository.findTop10ByOrderByOpenedAtDesc().stream()
                        .map(incidentService::toDto)
                        .collect(Collectors.toList()))
                .build();
    }

    public Double calculateMttrSeconds(List<Incident> resolvedIncidents) {
        if (resolvedIncidents == null || resolvedIncidents.isEmpty()) {
            return null;
        }
        OptionalDouble avg = resolvedIncidents.stream()
                .filter(i -> i.getOpenedAt() != null && i.getResolvedAt() != null)
                .filter(i -> !i.getResolvedAt().isBefore(i.getOpenedAt()))
                .mapToDouble(i -> Duration.between(i.getOpenedAt(), i.getResolvedAt()).toMillis() / 1000.0)
                .average();
        if (avg.isEmpty()) {
            return null;
        }
        return Math.round(avg.getAsDouble() * 10.0) / 10.0;
    }
}
