package com.sharp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryDto {
    private long totalApplications;
    private long healthyApplications;
    private long unhealthyApplications;
    private long activeIncidents;
    private double recoverySuccessRate;
    private double avgRecoveryTimeSeconds;
    private double avgCpuUsage;
    private double avgMemoryUsage;
    private List<ApplicationDto> recentApplications;
    private List<IncidentDto> recentIncidents;
}
