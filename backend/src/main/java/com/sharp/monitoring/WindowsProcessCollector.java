package com.sharp.monitoring;

import com.sharp.entity.ProcessMetric;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import oshi.SystemInfo;
import oshi.hardware.GlobalMemory;
import oshi.software.os.OSProcess;
import oshi.software.os.OperatingSystem;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WindowsProcessCollector {

    private static final Logger log = LoggerFactory.getLogger(WindowsProcessCollector.class);

    private final SystemInfo systemInfo = new SystemInfo();
    private final OperatingSystem os = systemInfo.getOperatingSystem();
    private final GlobalMemory memory = systemInfo.getHardware().getMemory();

    private final Map<Integer, OSProcess> previousProcesses = new ConcurrentHashMap<>();

    public List<ProcessMetric> collect(int limit) {
        Instant now = Instant.now();
        List<ProcessMetric> results = new ArrayList<>();

        long totalMemory = Math.max(1L, memory.getTotal());
        int cpuCount = Math.max(1, systemInfo.getHardware().getProcessor().getLogicalProcessorCount());

        List<OSProcess> processes;
        try {
            processes = os.getProcesses(
                    OperatingSystem.ProcessFiltering.ALL_PROCESSES,
                    OperatingSystem.ProcessSorting.RSS_DESC,
                    limit
            );
        } catch (Exception e) {
            log.warn("Failed to enumerate OS processes: {}", e.getMessage());
            return results;
        }

        Map<Integer, OSProcess> nextSnapshot = new ConcurrentHashMap<>();
        for (OSProcess proc : processes) {
            if (proc == null) continue;
            try {
                int pid = proc.getProcessID();
                nextSnapshot.put(pid, proc);

                double cpuPct = 0.0;
                OSProcess prev = previousProcesses.get(pid);
                if (prev != null) {
                    double raw = proc.getProcessCpuLoadBetweenTicks(prev) * 100.0 / cpuCount;
                    if (!Double.isNaN(raw) && raw >= 0.0) {
                        cpuPct = Math.round(Math.min(raw, 100.0) * 100.0) / 100.0;
                    }
                }

                long rss = proc.getResidentSetSize();
                double memPct = Math.round(((double) rss / totalMemory) * 10000.0) / 100.0;

                Instant startTime = proc.getStartTime() > 0 ? Instant.ofEpochMilli(proc.getStartTime()) : null;
                String path = safeString(proc.getPath());
                String user = safeString(proc.getUser());
                String state = proc.getState() != null ? proc.getState().name() : "UNKNOWN";

                results.add(ProcessMetric.builder()
                        .pid(pid)
                        .processName(proc.getName() != null ? proc.getName() : "unknown")
                        .cpuPercent(cpuPct)
                        .memoryBytes(rss)
                        .memoryPercent(memPct)
                        .status(state)
                        .startTime(startTime)
                        .executablePath(path)
                        .userName(user)
                        .collectedAt(now)
                        .build());
            } catch (Exception ex) {
                // Process may have terminated or be permission-restricted during collection
                log.debug("Skipping process during collection: {}", ex.getMessage());
            }
        }

        previousProcesses.clear();
        previousProcesses.putAll(nextSnapshot);
        return results;
    }

    private String safeString(String val) {
        if (val == null || val.isBlank() || "unknown".equalsIgnoreCase(val)) {
            return null;
        }
        return val.length() > 490 ? val.substring(0, 490) : val;
    }
}
