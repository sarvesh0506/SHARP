package com.sharp.recovery;

import com.sharp.ai.AiServiceClient;
import com.sharp.entity.AnomalyEvent;
import com.sharp.entity.Incident;
import com.sharp.entity.RecoveryAction;
import com.sharp.entity.SystemMetric;
import com.sharp.monitoring.TelemetryCollectionService;
import com.sharp.repository.AnomalyEventRepository;
import com.sharp.repository.SystemMetricRepository;
import com.sharp.service.ConfigurationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class VerificationService {

    public record VerificationOutcome(String status, String evidence, boolean resolved) {}

    private final TelemetryCollectionService telemetryCollectionService;
    private final SystemMetricRepository systemMetricRepository;
    private final AnomalyEventRepository anomalyEventRepository;
    private final ConfigurationService configurationService;
    private final AiServiceClient aiServiceClient;

    public VerificationOutcome verify(Incident incident, RecoveryAction action) {
        // 1. Independently collect fresh telemetry
        telemetryCollectionService.collectNow();
        Optional<SystemMetric> latestOpt = systemMetricRepository.findTopByOrderByCollectedAtDesc();
        if (latestOpt.isEmpty()) {
            return new VerificationOutcome("VERIFICATION_TIMEOUT",
                    "Fresh telemetry unavailable after recovery execution.", false);
        }

        SystemMetric m = latestOpt.get();
        double cpuWarn = configurationService.getInt("threshold.cpu.warning", 75);
        double memWarn = configurationService.getInt("threshold.memory.warning", 80);
        double diskWarn = configurationService.getInt("threshold.disk.warning", 85);

        double cpu = m.getCpuPercent() != null ? m.getCpuPercent() : 0.0;
        double mem = m.getMemoryPercent() != null ? m.getMemoryPercent() : 0.0;
        double disk = m.getDiskPercent() != null ? m.getDiskPercent() : 0.0;

        // 2. Check whether the original anomaly condition still violates thresholds
        List<AnomalyEvent> linked = anomalyEventRepository.findByIncidentId(incident.getId());
        boolean cpuClear = cpu < cpuWarn;
        boolean memClear = mem < memWarn;
        boolean diskClear = disk < diskWarn;

        boolean specificMetricStillBad = linked.stream().anyMatch(a -> switch (a.getMetricName()) {
            case "CPU_PERCENT" -> !cpuClear;
            case "MEMORY_PERCENT" -> !memClear;
            case "DISK_PERCENT" -> !diskClear;
            default -> false;
        });

        // 3. Optional independent AI Verification Agent check
        Optional<Boolean> aiVerified = aiServiceClient
                .verifyRecovery(incident.getApplication() != null ? incident.getApplication().getId().intValue() : 1,
                        action.getActionType(), cpu, mem)
                .map(res -> Boolean.TRUE.equals(res.get("verified_successful")));

        String evidence = String.format(
                "Independent probe at %s: Host=%s, CPU=%.1f%% (limit %.0f%%), Mem=%.1f%% (limit %.0f%%), Disk=%.1f%% (limit %.0f%%)%s",
                m.getCollectedAt(), m.getHostName(), cpu, cpuWarn, mem, memWarn, disk, diskWarn,
                aiVerified.map(v -> ", AI Verification=" + (v ? "PASS" : "FAIL")).orElse(""));

        if (!specificMetricStillBad && cpuClear && memClear && aiVerified.orElse(true)) {
            return new VerificationOutcome("VERIFIED", evidence, true);
        }

        if (!specificMetricStillBad && (cpuClear || memClear)) {
            return new VerificationOutcome("PARTIALLY_RECOVERED",
                    evidence + " — Target metric improved, but secondary resource pressure remains.", false);
        }

        return new VerificationOutcome("FAILED",
                evidence + " — Original fault condition persists; incident remains open.", false);
    }
}
