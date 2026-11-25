package com.sharp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "monitored_servers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonitoredServer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "host_name", nullable = false, length = 100)
    private String hostName;

    @Column(name = "ip_address", nullable = false, length = 50)
    private String ipAddress;

    @Column(name = "os_type", length = 50)
    @Builder.Default
    private String osType = "Linux";

    @Column(name = "agent_version", length = 30)
    @Builder.Default
    private String agentVersion = "1.0.0";

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "ONLINE"; // ONLINE, DEGRADED, OFFLINE

    @Column(name = "cpu_usage")
    @Builder.Default
    private Double cpuUsage = 0.0;

    @Column(name = "memory_usage")
    @Builder.Default
    private Double memoryUsage = 0.0;

    @Column(name = "disk_usage")
    @Builder.Default
    private Double diskUsage = 0.0;

    @Column(name = "last_seen")
    private Instant lastSeen;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
