package com.sharp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "applications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "docker_container_id", length = 100)
    private String dockerContainerId;

    @Column(name = "docker_image", length = 255)
    private String dockerImage;

    @Column(name = "health_endpoint", length = 255)
    @Builder.Default
    private String healthEndpoint = "/health";

    private Integer port;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "HEALTHY"; // HEALTHY, DEGRADED, UNHEALTHY, STOPPED

    @Column(name = "cpu_usage")
    @Builder.Default
    private Double cpuUsage = 0.0;

    @Column(name = "memory_usage")
    @Builder.Default
    private Double memoryUsage = 0.0;

    @Column(name = "restart_count")
    @Builder.Default
    private Integer restartCount = 0;

    @Column(name = "is_auto_recovery_enabled")
    @Builder.Default
    private Boolean isAutoRecoveryEnabled = true;

    @Column(name = "last_heartbeat")
    private Instant lastHeartbeat;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
