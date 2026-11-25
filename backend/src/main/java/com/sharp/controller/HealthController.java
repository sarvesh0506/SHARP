package com.sharp.controller;

import com.sharp.dto.ApiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    @Value("${spring.application.name:sharp-backend}")
    private String appName;

    @Value("${sharp.ai-service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkHealth() {
        Map<String, Object> healthInfo = new HashMap<>();
        healthInfo.put("status", "UP");
        healthInfo.put("service", appName);
        healthInfo.put("version", "1.0.0");
        healthInfo.put("timestamp", Instant.now().toString());
        healthInfo.put("aiServiceConfiguredUrl", aiServiceUrl);
        return ResponseEntity.ok(ApiResponse.ok("Service is healthy", healthInfo));
    }
}
