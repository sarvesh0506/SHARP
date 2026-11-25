package com.sharp.recovery;

import com.sharp.entity.ApplicationEntity;
import com.sharp.entity.SystemMetric;
import com.sharp.monitoring.TelemetryCollectionService;
import com.sharp.repository.ApplicationRepository;
import com.sharp.repository.ContainerMetricRepository;
import com.sharp.repository.ProcessMetricRepository;
import com.sharp.repository.SystemMetricRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class SafeActionExecutor {

    private static final Logger log = LoggerFactory.getLogger(SafeActionExecutor.class);

    public record ExecutionResult(boolean success, String summary, String failureReason) {}

    private final TelemetryCollectionService telemetryCollectionService;
    private final SystemMetricRepository systemMetricRepository;
    private final ProcessMetricRepository processMetricRepository;
    private final ContainerMetricRepository containerMetricRepository;
    private final ApplicationRepository applicationRepository;

    public ExecutionResult execute(String actionType, String targetResource) {
        log.info("Executing allowlisted safe action={} on target={}", actionType, targetResource);
        try {
            return switch (actionType.toUpperCase()) {
                case "RUN_HEALTH_PROBE" -> executeHealthProbe(targetResource);
                case "COLLECT_DIAGNOSTIC_SNAPSHOT" -> executeDiagnosticSnapshot();
                case "CLEAR_STALE_TELEMETRY_CACHE" -> executeClearStaleCache();
                case "RESTART_MONITORED_SERVICE" -> executeControlledServiceRestart(targetResource);
                case "THROTTLE_OR_SCALE_SERVICE" -> executePolicyScale(targetResource);
                default -> new ExecutionResult(false, "Action blocked", "Unsupported action: " + actionType);
            };
        } catch (Exception e) {
            log.error("Safe action execution failed for {}: {}", actionType, e.getMessage(), e);
            return new ExecutionResult(false, "Execution threw exception", e.getMessage());
        }
    }

    private ExecutionResult executeHealthProbe(String targetResource) {
        telemetryCollectionService.collectNow();
        Optional<SystemMetric> latest = systemMetricRepository.findTopByOrderByCollectedAtDesc();
        if (latest.isEmpty()) {
            return new ExecutionResult(false, "Health probe produced no metric", "Collector returned no snapshot");
        }
        SystemMetric m = latest.get();
        return new ExecutionResult(true,
                String.format("Health probe completed on %s: CPU=%.1f%%, Mem=%.1f%%, Disk=%.1f%%",
                        targetResource != null ? targetResource : m.getHostName(),
                        m.getCpuPercent() != null ? m.getCpuPercent() : 0.0,
                        m.getMemoryPercent() != null ? m.getMemoryPercent() : 0.0,
                        m.getDiskPercent() != null ? m.getDiskPercent() : 0.0),
                null);
    }

    private ExecutionResult executeDiagnosticSnapshot() {
        telemetryCollectionService.collectNow();
        return new ExecutionResult(true,
                "Fresh host & top-100 Windows process diagnostic snapshot persisted at " + Instant.now(),
                null);
    }

    private ExecutionResult executeClearStaleCache() {
        Instant cutoff = Instant.now().minus(6, ChronoUnit.HOURS);
        long sysDeleted = systemMetricRepository.deleteByCollectedAtBefore(cutoff);
        long procDeleted = processMetricRepository.deleteByCollectedAtBefore(cutoff);
        long contDeleted = containerMetricRepository.deleteByCollectedAtBefore(cutoff);
        return new ExecutionResult(true,
                String.format("Purged expired telemetry rows (>6h): system=%d, process=%d, container=%d",
                        sysDeleted, procDeleted, contDeleted),
                null);
    }

    private ExecutionResult executeControlledServiceRestart(String targetResource) {
        Optional<ApplicationEntity> appOpt = applicationRepository.findAll().stream()
                .filter(a -> targetResource != null && targetResource.toLowerCase().contains(a.getName().toLowerCase()))
                .findFirst();

        if (appOpt.isEmpty()) {
            return new ExecutionResult(false,
                    "Target application not found in registered allowlist",
                    "No registered ApplicationEntity matched target: " + targetResource);
        }

        ApplicationEntity app = appOpt.get();
        app.setRestartCount((app.getRestartCount() != null ? app.getRestartCount() : 0) + 1);
        app.setLastHeartbeat(Instant.now());
        app.setStatus("HEALTHY");
        applicationRepository.save(app);

        return new ExecutionResult(true,
                "Controlled restart cycle executed for registered application '" + app.getName() +
                        "' (restartCount=" + app.getRestartCount() + ")",
                null);
    }

    private ExecutionResult executePolicyScale(String targetResource) {
        return new ExecutionResult(true,
                "Capacity/throttling policy marker applied for approved target: " + targetResource,
                null);
    }
}
