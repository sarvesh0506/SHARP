package com.sharp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "container_metrics", indexes = {
        @Index(name = "idx_cont_metrics_collected_at", columnList = "collected_at"),
        @Index(name = "idx_cont_metrics_cid", columnList = "container_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContainerMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "container_id", nullable = false, length = 100)
    private String containerId;

    @Column(name = "container_name", length = 255)
    private String containerName;

    @Column(length = 255)
    private String image;

    @Column(length = 40)
    private String status;

    @Column(name = "health_status", length = 40)
    private String healthStatus;

    @Column(name = "cpu_percent")
    private Double cpuPercent;

    @Column(name = "memory_usage_bytes")
    private Long memoryUsageBytes;

    @Column(name = "memory_limit_bytes")
    private Long memoryLimitBytes;

    @Column(name = "memory_percent")
    private Double memoryPercent;

    @Column(name = "net_io", length = 100)
    private String netIo;

    @Column(name = "restart_count")
    private Integer restartCount;

    @Column(name = "uptime_text", length = 100)
    private String uptimeText;

    @Column(name = "collected_at", nullable = false)
    private Instant collectedAt;
}
