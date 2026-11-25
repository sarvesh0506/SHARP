package com.sharp;

import com.sharp.entity.ProcessMetric;
import com.sharp.entity.SystemMetric;
import com.sharp.monitoring.DockerMonitorService;
import com.sharp.monitoring.HostTelemetryCollector;
import com.sharp.monitoring.TelemetryCollectionService;
import com.sharp.monitoring.WindowsProcessCollector;
import com.sharp.repository.ProcessMetricRepository;
import com.sharp.repository.SystemMetricRepository;
import com.sharp.service.ConfigurationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
class TelemetryInfrastructureTests {

    @Autowired
    private HostTelemetryCollector hostTelemetryCollector;

    @Autowired
    private WindowsProcessCollector windowsProcessCollector;

    @Autowired
    private DockerMonitorService dockerMonitorService;

    @Autowired
    private TelemetryCollectionService telemetryCollectionService;

    @Autowired
    private SystemMetricRepository systemMetricRepository;

    @Autowired
    private ProcessMetricRepository processMetricRepository;

    @Autowired
    private ConfigurationService configurationService;

    @Test
    void hostCollectorCollectsRealMetrics() {
        // First sample initializes CPU/net baseline; second sample yields real delta rates
        SystemMetric first = hostTelemetryCollector.collect();
        assertNotNull(first);
        assertNotNull(first.getHostName());
        assertNotNull(first.getMemoryTotalBytes());
        assertTrue(first.getMemoryTotalBytes() > 0);
        assertNotNull(first.getDiskTotalBytes());
        assertTrue(first.getDiskTotalBytes() > 0);

        SystemMetric second = hostTelemetryCollector.collect();
        assertNotNull(second.getCollectedAt());
        assertNotNull(second.getMemoryPercent());
        assertTrue(second.getMemoryPercent() >= 0.0 && second.getMemoryPercent() <= 100.0);
    }

    @Test
    void windowsProcessCollectorReturnsProcesses() {
        List<ProcessMetric> procs = windowsProcessCollector.collect(25);
        assertNotNull(procs);
        assertFalse(procs.isEmpty(), "Expected running OS processes on host");
        ProcessMetric first = procs.get(0);
        assertNotNull(first.getPid());
        assertNotNull(first.getProcessName());
        assertNotNull(first.getMemoryBytes());
    }

    @Test
    void dockerMonitorHandlesAvailabilityGracefully() {
        DockerMonitorService.DockerSnapshotResult res = dockerMonitorService.collect();
        assertNotNull(res);
        assertNotNull(res.getContainers());
        assertNotNull(res.getStatusMessage());
        // If Docker is unavailable, list must be empty and available == false (never mocked)
        if (!res.isAvailable()) {
            assertTrue(res.getContainers().isEmpty());
        }
    }

    @Test
    void telemetryCollectionPersistsSnapshotsAndUpdatesStatus() {
        telemetryCollectionService.collectNow();
        TelemetryCollectionService.CollectorStatus status = telemetryCollectionService.getCollectorStatus();
        assertEquals("HEALTHY", status.getStatus());
        assertTrue(status.isHostDataAvailable());
        assertTrue(status.isProcessDataAvailable());
        assertTrue(systemMetricRepository.findTopByOrderByCollectedAtDesc().isPresent());
        assertTrue(processMetricRepository.findTopByOrderByCollectedAtDesc().isPresent());
    }

    @Test
    void configurationValidationRejectsInvalidThresholds() {
        assertThrows(RuntimeException.class, () ->
                configurationService.updateConfigs(
                        Map.of("threshold.cpu.warning", "95", "threshold.cpu.critical", "80"),
                        "admin",
                        "127.0.0.1"
                ));

        assertThrows(RuntimeException.class, () ->
                configurationService.updateConfigs(
                        Map.of("monitoring.interval_sec", "1"),
                        "admin",
                        "127.0.0.1"
                ));
    }
}
