package com.sharp.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonitoredServerDto {
    private Long id;

    @NotBlank(message = "Host name is required")
    private String hostName;

    @NotBlank(message = "IP address is required")
    private String ipAddress;

    private String osType;
    private String agentVersion;
    private String status;
    private Double cpuUsage;
    private Double memoryUsage;
    private Double diskUsage;
    private Instant lastSeen;
    private Instant createdAt;
}
