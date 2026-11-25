package com.sharp.controller;

import com.sharp.dto.ApiResponse;
import com.sharp.entity.ProcessMetric;
import com.sharp.entity.SystemMetric;
import com.sharp.exception.ApiException;
import com.sharp.monitoring.DockerMonitorService;
import com.sharp.monitoring.TelemetryCollectionService;
import com.sharp.repository.ProcessMetricRepository;
import com.sharp.repository.SystemMetricRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/monitoring")
@RequiredArgsConstructor
public class MonitoringController {

    private final SystemMetricRepository systemMetricRepository;
    private final ProcessMetricRepository processMetricRepository;
    private final TelemetryCollectionService telemetryCollectionService;

    @GetMapping("/system/latest")
    public ResponseEntity<ApiResponse<SystemMetric>> getLatestSystemMetric() {
        Optional<SystemMetric> latest = systemMetricRepository.findTopByOrderByCollectedAtDesc();
        return latest
                .map(m -> ResponseEntity.ok(ApiResponse.ok("Latest host telemetry", m)))
                .orElseGet(() -> ResponseEntity.ok(ApiResponse.ok("Awaiting initial telemetry collection", null)));
    }

    @GetMapping("/system/history")
    public ResponseEntity<ApiResponse<List<SystemMetric>>> getSystemHistory(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "200") int limit) {

        if (limit < 1) {
            throw new ApiException("limit must be at least 1", HttpStatus.BAD_REQUEST);
        }
        int safeLimit = Math.min(limit, 500);

        Instant toTime = to != null && !to.isBlank() ? Instant.parse(to.trim()) : Instant.now();
        Instant fromTime = from != null && !from.isBlank() ? Instant.parse(from.trim()) : toTime.minus(1, ChronoUnit.HOURS);

        if (fromTime.isAfter(toTime)) {
            throw new ApiException("'from' timestamp must be before or equal to 'to' timestamp", HttpStatus.BAD_REQUEST);
        }

        // Fetch the newest 'safeLimit' records in [fromTime, toTime], then reverse into chronological order for charting.
        List<SystemMetric> newestDesc = systemMetricRepository.findByCollectedAtBetweenOrderByCollectedAtDescIdDesc(
                fromTime, toTime, PageRequest.of(0, safeLimit));

        Map<Instant, SystemMetric> dedupedByTimestamp = new LinkedHashMap<>();
        for (int i = newestDesc.size() - 1; i >= 0; i--) {
            SystemMetric metric = newestDesc.get(i);
            // Because newestDesc is ordered DESC, iterating backwards visits older duplicates first,
            // so put() retains the latest record for any duplicate timestamp while preserving chronological order.
            dedupedByTimestamp.put(metric.getCollectedAt(), metric);
        }

        return ResponseEntity.ok(ApiResponse.ok(new ArrayList<>(dedupedByTimestamp.values())));
    }

    @GetMapping("/processes")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProcesses(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "cpu") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {

        Optional<ProcessMetric> latestOpt = processMetricRepository.findTopByOrderByCollectedAtDesc();
        if (latestOpt.isEmpty()) {
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("available", false);
            empty.put("collectedAt", null);
            empty.put("items", Collections.emptyList());
            empty.put("totalElements", 0);
            empty.put("totalPages", 0);
            empty.put("page", 0);
            empty.put("size", size);
            return ResponseEntity.ok(ApiResponse.ok("Awaiting process telemetry collection", empty));
        }

        Instant latestTs = latestOpt.get().getCollectedAt();
        List<ProcessMetric> all = processMetricRepository.findByCollectedAt(latestTs);

        String q = search != null ? search.trim().toLowerCase() : "";
        String statusFilter = status != null ? status.trim().toUpperCase() : "";

        List<ProcessMetric> filtered = all.stream()
                .filter(p -> q.isEmpty()
                        || p.getProcessName().toLowerCase().contains(q)
                        || String.valueOf(p.getPid()).contains(q))
                .filter(p -> statusFilter.isEmpty() || "ALL".equals(statusFilter)
                        || (p.getStatus() != null && p.getStatus().equalsIgnoreCase(statusFilter)))
                .sorted(buildProcessComparator(sortBy, sortDir))
                .collect(Collectors.toList());

        int safeSize = Math.max(1, Math.min(size, 100));
        int totalElements = filtered.size();
        int totalPages = (int) Math.ceil((double) totalElements / safeSize);
        int safePage = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
        int fromIdx = safePage * safeSize;
        int toIdx = Math.min(fromIdx + safeSize, totalElements);

        List<ProcessMetric> pageItems = fromIdx < totalElements ? filtered.subList(fromIdx, toIdx) : Collections.emptyList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("available", true);
        result.put("collectedAt", latestTs);
        result.put("items", pageItems);
        result.put("totalElements", totalElements);
        result.put("totalPages", totalPages);
        result.put("page", safePage);
        result.put("size", safeSize);
        result.put("totalHostProcessesSampled", all.size());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/docker/containers")
    public ResponseEntity<ApiResponse<DockerMonitorService.DockerSnapshotResult>> getDockerContainers() {
        DockerMonitorService.DockerSnapshotResult snapshot = telemetryCollectionService.getLatestDockerSnapshot();
        return ResponseEntity.ok(ApiResponse.ok(snapshot));
    }

    @GetMapping("/collector/status")
    public ResponseEntity<ApiResponse<TelemetryCollectionService.CollectorStatus>> getCollectorStatus() {
        return ResponseEntity.ok(ApiResponse.ok(telemetryCollectionService.getCollectorStatus()));
    }

    @PostMapping("/collector/collect")
    public ResponseEntity<ApiResponse<TelemetryCollectionService.CollectorStatus>> triggerCollection() {
        telemetryCollectionService.collectNow();
        return ResponseEntity.ok(ApiResponse.ok("Telemetry collection executed", telemetryCollectionService.getCollectorStatus()));
    }

    private Comparator<ProcessMetric> buildProcessComparator(String sortBy, String sortDir) {
        Comparator<ProcessMetric> cmp = switch (sortBy.toLowerCase()) {
            case "pid" -> Comparator.comparingInt(ProcessMetric::getPid);
            case "name" -> Comparator.comparing(ProcessMetric::getProcessName, String.CASE_INSENSITIVE_ORDER);
            case "memory" -> Comparator.comparingLong(p -> p.getMemoryBytes() != null ? p.getMemoryBytes() : 0L);
            default -> Comparator.comparingDouble(p -> p.getCpuPercent() != null ? p.getCpuPercent() : 0.0);
        };
        return "asc".equalsIgnoreCase(sortDir) ? cmp : cmp.reversed();
    }
}
