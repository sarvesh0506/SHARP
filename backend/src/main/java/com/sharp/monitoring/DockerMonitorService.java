package com.sharp.monitoring;

import com.sharp.entity.ContainerMetric;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
public class DockerMonitorService {

    private static final Logger log = LoggerFactory.getLogger(DockerMonitorService.class);

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DockerSnapshotResult {
        private boolean available;
        private String statusMessage;
        private String dockerVersion;
        private List<ContainerMetric> containers;
        private Instant checkedAt;
    }

    public DockerSnapshotResult collect() {
        Instant now = Instant.now();
        try {
            CommandResult versionCheck = runCommand(3, "docker", "info", "--format", "{{.ServerVersion}}");
            if (!versionCheck.success) {
                return DockerSnapshotResult.builder()
                        .available(false)
                        .statusMessage(versionCheck.output.isBlank()
                                ? "Docker daemon or CLI is not available on this host."
                                : versionCheck.output)
                        .containers(Collections.emptyList())
                        .checkedAt(now)
                        .build();
            }

            String dockerVersion = versionCheck.output.trim();
            CommandResult psRes = runCommand(5, "docker", "ps", "-a", "--format", "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}");
            if (!psRes.success) {
                return DockerSnapshotResult.builder()
                        .available(false)
                        .statusMessage("Failed to query Docker containers: " + psRes.output)
                        .containers(Collections.emptyList())
                        .checkedAt(now)
                        .build();
            }

            Map<String, String[]> statsMap = new HashMap<>();
            CommandResult statsRes = runCommand(6, "docker", "stats", "--no-stream", "--format", "{{.ID}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}");
            if (statsRes.success && !statsRes.output.isBlank()) {
                for (String line : statsRes.output.split("\\R")) {
                    String[] parts = line.split("\\|");
                    if (parts.length >= 5) {
                        statsMap.put(parts[0].trim(), parts);
                    }
                }
            }

            List<ContainerMetric> list = new ArrayList<>();
            if (!psRes.output.isBlank()) {
                for (String line : psRes.output.split("\\R")) {
                    String[] parts = line.split("\\|");
                    if (parts.length < 4) continue;
                    String cid = parts[0].trim();
                    String name = parts[1].trim();
                    String image = parts[2].trim();
                    String rawStatus = parts[3].trim();

                    String[] st = statsMap.get(cid);
                    Double cpuPct = st != null ? parsePercent(st[1]) : null;
                    Double memPct = st != null ? parsePercent(st[3]) : null;
                    String netIo = st != null ? st[4].trim() : null;

                    String health = rawStatus.contains("(healthy)") ? "HEALTHY"
                            : rawStatus.contains("(unhealthy)") ? "UNHEALTHY"
                            : rawStatus.contains("(health: starting)") ? "STARTING"
                            : "NONE";

                    String state = rawStatus.toLowerCase().startsWith("up") ? "RUNNING" : "STOPPED";

                    list.add(ContainerMetric.builder()
                            .containerId(cid)
                            .containerName(name)
                            .image(image)
                            .status(state)
                            .healthStatus(health)
                            .cpuPercent(cpuPct)
                            .memoryPercent(memPct)
                            .netIo(netIo)
                            .restartCount(0)
                            .uptimeText(rawStatus)
                            .collectedAt(now)
                            .build());
                }
            }

            return DockerSnapshotResult.builder()
                    .available(true)
                    .statusMessage("Docker daemon online (v" + dockerVersion + ")")
                    .dockerVersion(dockerVersion)
                    .containers(list)
                    .checkedAt(now)
                    .build();

        } catch (Exception e) {
            log.debug("Docker unavailable: {}", e.getMessage());
            return DockerSnapshotResult.builder()
                    .available(false)
                    .statusMessage("Docker CLI not installed or daemon unreachable.")
                    .containers(Collections.emptyList())
                    .checkedAt(now)
                    .build();
        }
    }

    private Double parsePercent(String raw) {
        try {
            return Double.parseDouble(raw.replace("%", "").trim());
        } catch (Exception e) {
            return null;
        }
    }

    private CommandResult runCommand(int timeoutSec, String... cmd) {
        try {
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            Process process = pb.start();
            StringBuilder sb = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (!sb.isEmpty()) sb.append('\n');
                    sb.append(line);
                }
            }
            boolean finished = process.waitFor(timeoutSec, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return new CommandResult(false, "Docker command timed out");
            }
            return new CommandResult(process.exitValue() == 0, sb.toString());
        } catch (Exception e) {
            return new CommandResult(false, e.getMessage() != null ? e.getMessage() : "Command failed");
        }
    }

    private record CommandResult(boolean success, String output) {}
}
