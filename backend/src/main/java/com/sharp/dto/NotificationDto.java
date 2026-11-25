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
public class NotificationDto {
    private Long id;
    private String type;
    private String severity;
    private String title;
    private String message;
    private Long anomalyId;
    private Long incidentId;
    private Long recoveryExecutionId;
    private Boolean read;
    private Instant readAt;
    private Instant createdAt;
}
