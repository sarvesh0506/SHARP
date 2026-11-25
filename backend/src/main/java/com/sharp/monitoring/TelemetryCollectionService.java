package com.sharp.monitoring;

import com.sharp.detection.AnomalyDetectionEngine;
import com.sharp.entity.ContainerMetric;
import com.sharp.entity.ProcessMetric;
import com.sharp.entity.SystemMetric;
import com.sharp.repository.ContainerMetricRepository;
import com.sharp.repository.ProcessMetricRepository;
import com.sharp.repository.SystemMetricRepository;
import com.sharp.service.ConfigurationService;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import org.springframework.context.annotation.Lazy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class TelemetryCollectionService {

    private static final Logger log = LoggerFactory.getLogger(TelemetryCollectionService.class);

    private final HostTelemetryCollector hostCollector;
    private final WindowsProcessCollector processCollector;
    private final DockerMonitorService dockerMonitorService;
    private final SystemMetricRepository systemMetricRepository;
    private final ProcessMetricRepository processMetricRepository;
    private final ContainerMetricRepository containerMetricRepository;
    private final ConfigurationService configurationService;
    private final AnomalyDetectionEngine anomalyDetectionEngine;

    public TelemetryCollectionService(
            HostTelemetryCollector hostCollector,
            WindowsProcessCollector processCollector,
            DockerMonitorService dockerMonitorService,
            SystemMetricRepository systemMetricRepository,
            ProcessMetricRepository processMetricRepository,
            ContainerMetricRepository containerMetricRepository,
            ConfigurationService configurationService,
            @Lazy AnomalyDetectionEngine anomalyDetectionEngine) {
        this.hostCollector = hostCollector;
        this.processCollector = processCollector;
        this.dockerMonitorService = dockerMonitorService;
        this.systemMetricRepository = systemMetricRepository;
        this.processMetricRepository = processMetricRepository;
        this.containerMetricRepository = containerMetricRepository;
        this.configurationService = configurationService;
        this.anomalyDetectionEngine = anomalyDetectionEngine;
    }

    @Value("${sharp.monitoring.process-limit:100}")
    private int processLimit;

    private final AtomicBoolean collecting = new AtomicBoolean(false);
    private final AtomicLong totalCollections = new AtomicLong(0);

    private volatile Instant lastAttemptAt;
    private volatile Instant lastSuccessAt;
    private volatile Instant lastFailureAt;
    private volatile String lastError;
    private volatile String status = "INITIALIZING";
    private volatile DockerMonitorService.DockerSnapshotResult latestDockerSnapshot =
            DockerMonitorService.DockerSnapshotResult.builder()
                    .available(false)
                    .statusMessage("Docker check pending...")
                    .containers(Collections.emptyList())
                    .build();

    @Scheduled(fixedDelayString = "${sharp.monitoring.poll-interval-ms:10000}", initialDelay = 1500)
    public void scheduledCollect() {
        boolean enabled = configurationService.getBoolean("monitoring.enabled", true);
        if (!enabled) {
            status = "DISABLED";
            return;
        }

        int configuredIntervalSec = configurationService.getInt("monitoring.interval_sec", 10);
        if (lastAttemptAt != null && ChronoUnit.SECONDS.between(lastAttemptAt, Instant.now()) < configuredIntervalSec) {
            return;
        }

        collectNow();
    }

    @Transactional
    public void collectNow() {
        if (!collecting.compareAndSet(false, true)) {
            log.debug("Skipping overlapping telemetry collection cycle");
            return;
        }

        lastAttemptAt = Instant.now();
        try {
            // 1. Host system metrics
            SystemMetric metric = hostCollector.collect();
            systemMetricRepository.save(metric);

            // 2. Windows process metrics
            List<ProcessMetric> procs = processCollector.collect(processLimit);
            if (!procs.isEmpty()) {
                processMetricRepository.saveAll(procs);
            }

            // 3. Docker container metrics (if available)
            DockerMonitorService.DockerSnapshotResult dockerRes = dockerMonitorService.collect();
            latestDockerSnapshot = dockerRes;
            if (dockerRes.isAvailable() && !dockerRes.getContainers().isEmpty()) {
                containerMetricRepository.saveAll(dockerRes.getContainers());
            }

            // 4. Retention cleanup
            int retentionHours = configurationService.getInt("monitoring.retention_hours", 24);
            Instant cutoff = Instant.now().minus(retentionHours, ChronoUnit.HOURS);
            systemMetricRepository.deleteByCollectedAtBefore(cutoff);
            processMetricRepository.deleteByCollectedAtBefore(cutoff);
            containerMetricRepository.deleteByCollectedAtBefore(cutoff);

            lastSuccessAt = Instant.now();
            lastError = null;
            status = "HEALTHY";
            totalCollections.incrementAndGet();

            // 5. Run Phase 4C Anomaly Detection pipeline safely (never crashes telemetry collection)
            try {
                anomalyDetectionEngine.analyzeLatestSample(metric, procs);
            } catch (Exception detEx) {
                log.warn("Post-collection anomaly detection error: {}", detEx.getMessage());
            }
        } catch (Exception e) {
            lastFailureAt = Instant.now();
            lastError = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            status = "DEGRADED";
            log.error("Telemetry collection failed: {}", lastError, e);
        } finally {
            collecting.set(false);
        }
    }

    public DockerMonitorService.DockerSnapshotResult getLatestDockerSnapshot() {
        return latestDockerSnapshot;
    }

    public CollectorStatus getCollectorStatus() {
        boolean enabled = configurationService.getBoolean("monitoring.enabled", true);
        int intervalSec = configurationService.getInt("monitoring.interval_sec", 10);
        int retentionHours = configurationService.getInt("monitoring.retention_hours", 24);
        return CollectorStatus.builder()
                .status(enabled ? status : "DISABLED")
                .enabled(enabled)
                .intervalSeconds(intervalSec)
                .retentionHours(retentionHours)
                .totalCollections(totalCollections.get())
                .lastAttemptAt(lastAttemptAt)
                .lastSuccessAt(lastSuccessAt)
                .lastFailureAt(lastFailureAt)
                .lastError(lastError)
                .hostDataAvailable(systemMetricRepository.findTopByOrderByCollectedAtDesc().isPresent())
                .processDataAvailable(processMetricRepository.findTopByOrderByCollectedAtDesc().isPresent())
                .dockerAvailable(latestDockerSnapshot != null && latestDockerSnapshot.isAvailable())
                .dockerStatusMessage(latestDockerSnapshot != null ? latestDockerSnapshot.getStatusMessage() : "Not checked")
                .build();
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class CollectorStatus {
        private String status;
        private boolean enabled;
        private int intervalSeconds;
        private int retentionHours;
        private long totalCollections;
        private Instant lastAttemptAt;
        private Instant lastSuccessAt;
        private Instant lastFailureAt;
        private String lastError;
        private boolean hostDataAvailable;
        private boolean processDataAvailable;
        private boolean dockerAvailable;
        private String dockerStatusMessage;
    }
}
