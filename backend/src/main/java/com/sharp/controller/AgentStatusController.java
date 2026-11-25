package com.sharp.controller;

import com.sharp.dto.ApiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/agents")
public class AgentStatusController {

    @Value("${sharp.ai-service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @SuppressWarnings("unchecked")
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAgentStatus() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(1500);
        factory.setReadTimeout(2000);
        RestTemplate restTemplate = new RestTemplate(factory);

        try {
            Map<String, Object> aiResponse = restTemplate.getForObject(
                    aiServiceUrl + "/api/v1/agents/status", Map.class);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("reachable", true);
            result.put("serviceStatus", "ONLINE");
            result.put("aiServiceUrl", aiServiceUrl);
            result.put("agents", aiResponse != null && aiResponse.containsKey("agents")
                    ? aiResponse.get("agents")
                    : Collections.emptyList());
            return ResponseEntity.ok(ApiResponse.ok("AI service reachable", result));
        } catch (Exception e) {
            Map<String, Object> offline = new LinkedHashMap<>();
            offline.put("reachable", false);
            offline.put("serviceStatus", "OFFLINE");
            offline.put("aiServiceUrl", aiServiceUrl);
            offline.put("message", "Python AI service is currently unreachable. Start ai-service on port 8000 for live agent execution.");
            offline.put("agents", Collections.emptyList());
            return ResponseEntity.ok(ApiResponse.ok("AI service offline", offline));
        }
    }
}
