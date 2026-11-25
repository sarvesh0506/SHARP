package com.sharp.detection;

import com.sharp.ai.AiServiceClient;
import com.sharp.entity.AnomalyEvent;
import com.sharp.entity.ProcessMetric;
import com.sharp.entity.SystemMetric;
import com.sharp.repository.AnomalyEventRepository;
import com.sharp.repository.ProcessMetricRepository;
import com.sharp.repository.SystemMetricRepository;
import com.sharp.service.ConfigurationService;
import com.sharp.service.EventBroadcastService;
import com.sharp.service.IncidentService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
public class AnomalyDetectionEngine {

    private static final Logger log = LoggerFactory.getLogger(AnomalyDetectionEngine.class);

    private final SystemMetricRepository systemMetricRepository;
    private final ProcessMetricRepository processMetricRepository;
    private final AnomalyEventRepository anomalyEventRepository;
    private final ConfigurationService configurationService;
    private final AiServiceClient aiServiceClient;
    private final IncidentService incidentService;
    private final EventBroadcastService eventBroadcastService;

    private final AtomicBoolean analyzing = new AtomicBoolean(false);
    private final AtomicLong lastAnalyzedMetricId = new AtomicLong(-1L);

    @Transactional
    public List<AnomalyEvent> analyzeLatestSample(SystemMetric latest, List<ProcessMetric> latestProcesses) {
        if (latest == null || latest.getId() == null) {
            return Collections.emptyList();
        }
        if (lastAnalyzedMetricId.get() == latest.getId()) {
            return Collections.emptyList();
        }
        if (!analyzing.compareAndSet(false, true)) {
            return Collections.emptyList();
        }

        List<AnomalyEvent> createdOrUpdated = new ArrayList<>();
        try {
            lastAnalyzedMetricId.set(latest.getId());

            double cpuWarn = configurationService.getInt("threshold.cpu.warning", 75);
            double cpuCrit = configurationService.getInt("threshold.cpu.critical", 90);
            double memWarn = configurationService.getInt("threshold.memory.warning", 80);
            double memCrit = configurationService.getInt("threshold.memory.critical", 92);
            double diskWarn = configurationService.getInt("threshold.disk.warning", 85);
            double netWarnMbps = configurationService.getInt("threshold.network.mbps_warning", 100);

            List<SystemMetric> history = systemMetricRepository.findByOrderByCollectedAtDesc(PageRequest.of(0, 30));

            // 1. CPU evaluation (Rule + Statistical)
            if (latest.getCpuPercent() != null) {
                evaluateMetric(
                        "HOST", latest.getHostName(), "CPU_PERCENT",
                        latest.getCpuPercent(), cpuWarn, cpuCrit,
                        computeMean(history.stream().map(SystemMetric::getCpuPercent).toList()),
                        computeStdDev(history.stream().map(SystemMetric::getCpuPercent).toList()),
                        latest.getId(),
                        "Inspect high-CPU processes and worker threads"
                ).ifPresent(createdOrUpdated::add);
            }

            // 2. Memory evaluation (Rule + Statistical)
            if (latest.getMemoryPercent() != null) {
                evaluateMetric(
                        "HOST", latest.getHostName(), "MEMORY_PERCENT",
                        latest.getMemoryPercent(), memWarn, memCrit,
                        computeMean(history.stream().map(SystemMetric::getMemoryPercent).toList()),
                        computeStdDev(history.stream().map(SystemMetric::getMemoryPercent).toList()),
                        latest.getId(),
                        "Inspect top memory-consuming processes for leaks or heap growth"
                ).ifPresent(createdOrUpdated::add);
            }

            // 3. Disk evaluation
            if (latest.getDiskPercent() != null) {
                evaluateMetric(
                        "HOST", latest.getHostName(), "DISK_PERCENT",
                        latest.getDiskPercent(), diskWarn, 95.0,
                        null, null, latest.getId(),
                        "Review disk usage and telemetry retention settings"
                ).ifPresent(createdOrUpdated::add);
            }

            // 4. Network throughput (Mbps)
            if (latest.getNetRecvRateBps() != null && latest.getNetSentRateBps() != null) {
                double totalMbps = ((latest.getNetRecvRateBps() + latest.getNetSentRateBps()) * 8.0) / 1_000_000.0;
                if (totalMbps >= netWarnMbps) {
                    recordOrUpdateAnomaly(
                            "HOST", latest.getHostName(), "NETWORK_MBPS",
                            round(totalMbps), netWarnMbps, "RULE_BASED",
                            totalMbps >= netWarnMbps * 1.5 ? "HIGH" : "MEDIUM",
                            Math.min(1.0, totalMbps / (netWarnMbps * 1.5)), null,
                            String.format("Host network throughput %.2f Mbps exceeded threshold %.0f Mbps", totalMbps, netWarnMbps),
                            String.format("RX=%.0f B/s, TX=%.0f B/s", latest.getNetRecvRateBps(), latest.getNetSentRateBps()),
                            "Inspect active network sockets and process traffic",
                            latest.getId()
                    ).ifPresent(createdOrUpdated::add);
                }
            }

            // 5. Process CPU & Memory evaluation
            if (latestProcesses != null && !latestProcesses.isEmpty()) {
                latestProcesses.stream()
                        .filter(p -> p.getCpuPercent() != null && p.getCpuPercent() >= 60.0)
                        .findFirst()
                        .ifPresent(p -> recordOrUpdateAnomaly(
                                "PROCESS", p.getProcessName() + " (PID " + p.getPid() + ")", "PROCESS_CPU",
                                p.getCpuPercent(), 60.0, "RULE_BASED",
                                p.getCpuPercent() >= 85.0 ? "HIGH" : "MEDIUM",
                                Math.min(1.0, p.getCpuPercent() / 100.0), null,
                                String.format("Process %s (PID %d) consuming %.1f%% CPU", p.getProcessName(), p.getPid(), p.getCpuPercent()),
                                String.format("PID=%d, Memory=%.1f MB, State=%s", p.getPid(),
                                        p.getMemoryBytes() != null ? p.getMemoryBytes() / (1024.0 * 1024.0) : 0.0, p.getStatus()),
                                "Inspect process threads and workload",
                                latest.getId()
                        ).ifPresent(createdOrUpdated::add));
            }

            // 6. Optional Python AI Service detection (only if reachable & enabled; never fakes confidence)
            if (latest.getCpuPercent() != null && latest.getMemoryPercent() != null) {
                aiServiceClient.detectAnomaly(latest.getCpuPercent(), latest.getMemoryPercent(), 0.0)
                        .ifPresent(aiRes -> {
                            boolean isAnomaly = Boolean.TRUE.equals(aiRes.get("is_anomaly"));
                            if (isAnomaly) {
                                String sev = String.valueOf(aiRes.getOrDefault("severity", "MEDIUM"));
                                Double conf = aiRes.get("confidence_score") instanceof Number n ? n.doubleValue() : null;
                                String aType = String.valueOf(aiRes.getOrDefault("anomaly_type", "AI_DETECTED_ANOMALY"));
                                recordOrUpdateAnomaly(
                                        "HOST", latest.getHostName(), aType,
                                        Math.max(latest.getCpuPercent(), latest.getMemoryPercent()), null,
                                        "AI_ANALYSIS", sev, conf != null ? conf : 0.85, conf,
                                        "Python Detection Agent flagged anomaly: " + aType,
                                        String.format("CPU=%.1f%%, Memory=%.1f%%, AI Type=%s", latest.getCpuPercent(), latest.getMemoryPercent(), aType),
                                        "Run AI Root Cause Analysis",
                                        latest.getId()
                                ).ifPresent(createdOrUpdated::add);
                            }
                        });
            }

            // 7. Auto-create incidents for eligible anomalies (HIGH / CRITICAL or newly detected MEDIUM)
            for (AnomalyEvent anomaly : createdOrUpdated) {
                if (anomaly.getIncidentId() == null &&
                        ("CRITICAL".equalsIgnoreCase(anomaly.getSeverity())
                                || "HIGH".equalsIgnoreCase(anomaly.getSeverity())
                                || "MEDIUM".equalsIgnoreCase(anomaly.getSeverity()))) {
                    Long incId = incidentService.createOrAttachFromAnomaly(anomaly);
                    if (incId != null) {
                        anomaly.setIncidentId(incId);
                        anomalyEventRepository.save(anomaly);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Anomaly detection cycle failed: {}", e.getMessage(), e);
        } finally {
            analyzing.set(false);
        }
        return createdOrUpdated;
    }

    private Optional<AnomalyEvent> evaluateMetric(
            String resourceType, String resourceName, String metricName,
            double observed, double warnThreshold, double critThreshold,
            Double mean, Double stdDev, Long metricId, String recommendedStep) {

        if (observed >= critThreshold) {
            return recordOrUpdateAnomaly(
                    resourceType, resourceName, metricName, observed, critThreshold,
                    "RULE_BASED", "CRITICAL", Math.min(1.0, observed / 100.0), null,
                    String.format("%s reached %.1f%% (critical threshold: %.0f%%)", metricName, observed, critThreshold),
                    String.format("Observed=%.2f%%, CriticalThreshold=%.2f%%", observed, critThreshold),
                    recommendedStep, metricId);
        }

        if (observed >= warnThreshold) {
            return recordOrUpdateAnomaly(
                    resourceType, resourceName, metricName, observed, warnThreshold,
                    "RULE_BASED", "HIGH", Math.min(0.95, observed / 100.0), null,
                    String.format("%s reached %.1f%% (warning threshold: %.0f%%)", metricName, observed, warnThreshold),
                    String.format("Observed=%.2f%%, WarningThreshold=%.2f%%", observed, warnThreshold),
                    recommendedStep, metricId);
        }

        // Statistical baseline deviation (z-score > 2.5 and >= 15% jump over mean)
        if (mean != null && stdDev != null && stdDev > 1.0) {
            double zScore = (observed - mean) / stdDev;
            if (zScore >= 2.5 && observed - mean >= 15.0) {
                return recordOrUpdateAnomaly(
                        resourceType, resourceName, metricName, observed, round(mean),
                        "STATISTICAL", "MEDIUM", Math.min(0.9, zScore / 5.0), null,
                        String.format("%s spiked to %.1f%% (baseline mean: %.1f%%, z=%.2f)", metricName, observed, mean, zScore),
                        String.format("Observed=%.2f%%, BaselineMean=%.2f%%, StdDev=%.2f, ZScore=%.2f", observed, mean, stdDev, zScore),
                        recommendedStep, metricId);
            }
        }

        return Optional.empty();
    }

    private Optional<AnomalyEvent> recordOrUpdateAnomaly(
            String resourceType, String resourceName, String metricName,
            double observed, Double baseline, String method, String severity,
            double score, Double confidence, String description, String evidence,
            String recommendedStep, Long systemMetricId) {

        Instant now = Instant.now();

        // Deduplicate active/acknowledged ongoing anomaly
        Optional<AnomalyEvent> active = anomalyEventRepository
                .findTopByResourceNameAndMetricNameAndStatusInOrderByDetectedAtDesc(
                        resourceName, metricName, List.of("ACTIVE", "ACKNOWLEDGED"));

        if (active.isPresent()) {
            AnomalyEvent existing = active.get();
            existing.setObservedValue(observed);
            existing.setUpdatedAt(now);
            existing.setSystemMetricId(systemMetricId);
            existing.setEvidence(evidence);
            if ("CRITICAL".equals(severity) && !"CRITICAL".equals(existing.getSeverity())) {
                existing.setSeverity(severity);
            }
            return Optional.of(anomalyEventRepository.save(existing));
        }

        // Cooldown: do not recreate within 3 minutes of last resolved/suppressed detection
        Optional<AnomalyEvent> recent = anomalyEventRepository
                .findTopByResourceNameAndMetricNameAndDetectedAtAfterOrderByDetectedAtDesc(
                        resourceName, metricName, now.minus(3, ChronoUnit.MINUTES));
        if (recent.isPresent() && "SUPPRESSED".equalsIgnoreCase(recent.get().getStatus())) {
            return Optional.empty();
        }

        AnomalyEvent created = anomalyEventRepository.save(AnomalyEvent.builder()
                .resourceType(resourceType)
                .resourceName(resourceName)
                .metricName(metricName)
                .observedValue(observed)
                .baselineValue(baseline)
                .detectionMethod(method)
                .severity(severity)
                .anomalyScore(round(score))
                .confidenceScore(confidence)
                .status("ACTIVE")
                .description(description)
                .evidence(evidence)
                .recommendedStep(recommendedStep)
                .systemMetricId(systemMetricId)
                .detectedAt(now)
                .updatedAt(now)
                .build());

        eventBroadcastService.publish("ANOMALY_DETECTED", created);
        return Optional.of(created);
    }

    private Double computeMean(List<Double> vals) {
        List<Double> valid = vals.stream().filter(Objects::nonNull).toList();
        if (valid.size() < 5) return null;
        return valid.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
    }

    private Double computeStdDev(List<Double> vals) {
        List<Double> valid = vals.stream().filter(Objects::nonNull).toList();
        if (valid.size() < 5) return null;
        double mean = valid.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double variance = valid.stream().mapToDouble(v -> Math.pow(v - mean, 2)).average().orElse(0.0);
        return Math.sqrt(variance);
    }

    private double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
