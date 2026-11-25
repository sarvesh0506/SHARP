package com.sharp.service;

import com.sharp.dto.DashboardSummaryDto;
import com.sharp.entity.ApplicationEntity;
import com.sharp.entity.RecoveryAction;
import com.sharp.repository.ApplicationRepository;
import com.sharp.repository.IncidentRepository;
import com.sharp.repository.RecoveryActionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

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

        long activeIncidents = incidentRepository.countByStatusNot("RESOLVED");

        List<RecoveryAction> allActions = recoveryActionRepository.findAll();
        long totalActions = allActions.size();
        long successfulActions = allActions.stream()
                .filter(a -> "SUCCESS".equalsIgnoreCase(a.getStatus()) || "VERIFIED_SUCCESS".equalsIgnoreCase(a.getVerificationStatus()))
                .count();

        double successRate = totalActions > 0 ? (double) successfulActions / totalActions * 100.0 : 100.0;

        // Calculate average recovery time
        double avgDurationSeconds = allActions.stream()
                .filter(a -> a.getInitiatedAt() != null && a.getCompletedAt() != null)
                .mapToLong(a -> Duration.between(a.getInitiatedAt(), a.getCompletedAt()).getSeconds())
                .average()
                .orElse(24.5); // Baseline demo metric

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
                .recoverySuccessRate(Math.round(successRate * 10.0) / 10.0)
                .avgRecoveryTimeSeconds(Math.round(avgDurationSeconds * 10.0) / 10.0)
                .avgCpuUsage(Math.round(avgCpu * 10.0) / 10.0)
                .avgMemoryUsage(Math.round(avgMemory * 10.0) / 10.0)
                .recentApplications(applicationService.getAllApplications())
                .recentIncidents(incidentService.getAllIncidents())
                .build();
    }
}
