package com.sharp.controller;

import com.sharp.ai.AiServiceClient;
import com.sharp.dto.ApiResponse;
import com.sharp.monitoring.TelemetryCollectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
@RequestMapping("/api/v1/agents")
@RequiredArgsConstructor
public class AgentStatusController {

    private final AiServiceClient aiServiceClient;
    private final TelemetryCollectionService telemetryCollectionService;

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAgentStatus() {
        Optional<Map<String, Object>> aiResponse = aiServiceClient.getAgentStatus();
        TelemetryCollectionService.CollectorStatus colStatus = telemetryCollectionService.getCollectorStatus();

        Map<String, Object> result = new LinkedHashMap<>();
        boolean reachable = aiResponse.isPresent();
        result.put("reachable", reachable);
        result.put("serviceStatus", reachable ? "ONLINE" : "OFFLINE");
        result.put("aiServiceUrl", aiServiceClient.getBaseUrl());
        result.put("circuitOpen", aiServiceClient.isCircuitOpen());
        result.put("lastSuccessAt", aiServiceClient.getLastSuccessAt());
        result.put("lastError", aiServiceClient.getLastError());

        if (reachable) {
            result.put("agents", aiResponse.get().getOrDefault("agents", Collections.emptyList()));
        } else {
            result.put("message", "Python AI service is currently offline. Backend deterministic detection, RCA fallback, and safe recovery engines remain operational.");
            result.put("agents", Collections.emptyList());
        }

        // Real backend orchestrator module statuses
        List<Map<String, Object>> backendEngines = List.of(
                Map.of(
                        "name", "Telemetry Collector",
                        "status", colStatus.getStatus(),
                        "lastSuccessAt", String.valueOf(colStatus.getLastSuccessAt()),
                        "task", "OSHI host & Windows process sampling"
                ),
                Map.of(
                        "name", "Anomaly Detection Engine",
                        "status", colStatus.isEnabled() ? "ACTIVE" : "IDLE",
                        "lastSuccessAt", String.valueOf(colStatus.getLastSuccessAt()),
                        "task", "Rule-based, statistical & AI anomaly triage"
                )
        );
        result.put("backendEngines", backendEngines);

        return ResponseEntity.ok(ApiResponse.ok(reachable ? "AI service reachable" : "AI service offline", result));
    }
}
