package com.sharp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "system_metrics", indexes = {
        @Index(name = "idx_sys_metrics_collected_at", columnList = "collected_at"),
        @Index(name = "idx_sys_metrics_host", columnList = "host_name, collected_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "host_name", nullable = false, length = 150)
    private String hostName;

    @Column(name = "os_name", length = 150)
    private String osName;

    @Column(name = "uptime_seconds")
    private Long uptimeSeconds;

    @Column(name = "cpu_percent")
    private Double cpuPercent;

    @Column(name = "memory_total_bytes")
    private Long memoryTotalBytes;

    @Column(name = "memory_used_bytes")
    private Long memoryUsedBytes;

    @Column(name = "memory_available_bytes")
    private Long memoryAvailableBytes;

    @Column(name = "memory_percent")
    private Double memoryPercent;

    @Column(name = "disk_total_bytes")
    private Long diskTotalBytes;

    @Column(name = "disk_used_bytes")
    private Long diskUsedBytes;

    @Column(name = "disk_free_bytes")
    private Long diskFreeBytes;

    @Column(name = "disk_percent")
    private Double diskPercent;

    @Column(name = "net_bytes_recv")
    private Long netBytesRecv;

    @Column(name = "net_bytes_sent")
    private Long netBytesSent;

    @Column(name = "net_recv_rate_bps")
    private Double netRecvRateBps;

    @Column(name = "net_sent_rate_bps")
    private Double netSentRateBps;

    @Column(name = "collected_at", nullable = false)
    private Instant collectedAt;
}
