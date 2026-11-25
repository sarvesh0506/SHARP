package com.sharp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentDto {
    private Long id;
    private String title;
    private String description;
    private Long applicationId;
    private String applicationName;
    private Long serverId;
    private String serverHostName;
    private String severity;
    private String status;
    private String rootCause;
    private String detectedByAgent;
    private String evidence;
    private Instant openedAt;
    private Instant resolvedAt;
}
