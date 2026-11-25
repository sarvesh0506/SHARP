package com.sharp.ai;

import lombok.Data;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

@Component
public class AiServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AiServiceClient.class);

    @Value("${sharp.ai.enabled:true}")
    private boolean enabled;

    @Value("${sharp.ai.base-url:http://localhost:8000}")
    private String baseUrl;

    @Value("${sharp.ai.connection-timeout-ms:3000}")
    private int connectTimeoutMs;

    @Value("${sharp.ai.response-timeout-ms:10000}")
    private int responseTimeoutMs;

    @Value("${sharp.ai.max-retries:1}")
    private int maxRetries;

    private final AtomicReference<Instant> circuitOpenUntil = new AtomicReference<>(null);
    private volatile String lastError;
    private volatile Instant lastSuccessAt;

    private RestTemplate buildRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(responseTimeoutMs);
        return new RestTemplate(factory);
    }

    public boolean isCircuitOpen() {
        Instant until = circuitOpenUntil.get();
        return until != null && Instant.now().isBefore(until);
    }

    public boolean isEnabled() {
        return enabled;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public String getLastError() {
        return lastError;
    }

    public Instant getLastSuccessAt() {
        return lastSuccessAt;
    }

    @SuppressWarnings("unchecked")
    public Optional<Map<String, Object>> getAgentStatus() {
        if (!enabled) return Optional.empty();
        return executeWithRetry(HttpMethod.GET, "/api/v1/agents/status", null, Map.class)
                .map(m -> (Map<String, Object>) m);
    }

    @SuppressWarnings("unchecked")
    public Optional<Map<String, Object>> detectAnomaly(double cpuPercent, double memoryPercent, double responseTimeMs) {
        if (!enabled || isCircuitOpen()) return Optional.empty();
        Map<String, Object> payload = Map.of(
                "cpu_percent", Math.max(0.0, Math.min(100.0, cpuPercent)),
                "memory_percent", Math.max(0.0, Math.min(100.0, memoryPercent)),
                "response_time_ms", responseTimeMs,
                "http_status", 200
        );
        return executeWithRetry(HttpMethod.POST, "/api/v1/agents/detection/detect", payload, Map.class)
                .map(m -> (Map<String, Object>) m);
    }

    @SuppressWarnings("unchecked")
    public Optional<Map<String, Object>> diagnoseIncident(Long incidentId, String appName, double cpuPercent, double memoryPercent, List<String> logs) {
        if (!enabled || isCircuitOpen()) return Optional.empty();
        Map<String, Object> metrics = Map.of(
                "cpu_percent", Math.max(0.0, Math.min(100.0, cpuPercent)),
                "memory_percent", Math.max(0.0, Math.min(100.0, memoryPercent)),
                "response_time_ms", 0.0,
                "http_status", 200
        );
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("incident_id", incidentId);
        payload.put("application_name", appName != null ? appName : "windows-host");
        payload.put("metrics", metrics);
        payload.put("error_logs", logs != null ? logs : Collections.emptyList());

        return executeWithRetry(HttpMethod.POST, "/api/v1/agents/diagnosis/analyze", payload, Map.class)
                .map(m -> (Map<String, Object>) m);
    }

    @SuppressWarnings("unchecked")
    public Optional<Map<String, Object>> verifyRecovery(int applicationId, String actionType, double cpuPercent, double memoryPercent) {
        if (!enabled || isCircuitOpen()) return Optional.empty();
        Map<String, Object> metrics = Map.of(
                "cpu_percent", Math.max(0.0, Math.min(100.0, cpuPercent)),
                "memory_percent", Math.max(0.0, Math.min(100.0, memoryPercent)),
                "response_time_ms", 50.0,
                "http_status", 200
        );
        Map<String, Object> payload = Map.of(
                "application_id", applicationId,
                "action_type", actionType,
                "post_recovery_metrics", metrics
        );
        return executeWithRetry(HttpMethod.POST, "/api/v1/agents/verification/verify", payload, Map.class)
                .map(m -> (Map<String, Object>) m);
    }

    private <T> Optional<T> executeWithRetry(HttpMethod method, String path, Object body, Class<T> responseType) {
        String correlationId = UUID.randomUUID().toString();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Correlation-ID", correlationId);
        HttpEntity<Object> entity = new HttpEntity<>(body, headers);

        RestTemplate restTemplate = buildRestTemplate();
        int attempts = Math.max(1, 1 + maxRetries);

        for (int i = 0; i < attempts; i++) {
            try {
                ResponseEntity<T> response = restTemplate.exchange(baseUrl + path, method, entity, responseType);
                circuitOpenUntil.set(null);
                lastError = null;
                lastSuccessAt = Instant.now();
                return Optional.ofNullable(response.getBody());
            } catch (Exception e) {
                lastError = e.getMessage();
                log.debug("AI service call failed [cid={}, attempt={}/{}]: {} {}",
                        correlationId, i + 1, attempts, path, e.getMessage());
            }
        }

        // Open circuit for 30 seconds so telemetry collector is never blocked
        circuitOpenUntil.set(Instant.now().plusSeconds(30));
        return Optional.empty();
    }
}
