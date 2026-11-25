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
public class ApplicationDto {
    private Long id;

    @NotBlank(message = "Application name is required")
    private String name;

    private String description;
    private String dockerContainerId;
    private String dockerImage;
    private String healthEndpoint;
    private Integer port;
    private String status;
    private Double cpuUsage;
    private Double memoryUsage;
    private Integer restartCount;
    private Boolean isAutoRecoveryEnabled;
    private Instant lastHeartbeat;
    private Instant createdAt;
}
