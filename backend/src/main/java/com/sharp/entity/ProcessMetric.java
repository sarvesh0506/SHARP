package com.sharp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "process_metrics", indexes = {
        @Index(name = "idx_proc_metrics_collected_at", columnList = "collected_at"),
        @Index(name = "idx_proc_metrics_pid", columnList = "pid")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer pid;

    @Column(name = "process_name", nullable = false, length = 255)
    private String processName;

    @Column(name = "cpu_percent")
    private Double cpuPercent;

    @Column(name = "memory_bytes")
    private Long memoryBytes;

    @Column(name = "memory_percent")
    private Double memoryPercent;

    @Column(length = 40)
    private String status;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "executable_path", length = 500)
    private String executablePath;

    @Column(name = "user_name", length = 150)
    private String userName;

    @Column(name = "collected_at", nullable = false)
    private Instant collectedAt;
}
