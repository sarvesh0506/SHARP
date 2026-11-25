package com.sharp.controller;

import com.sharp.dto.ApiResponse;
import com.sharp.entity.SystemConfiguration;
import com.sharp.service.ConfigurationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/config")
@RequiredArgsConstructor
public class ConfigurationController {

    private final ConfigurationService configurationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SystemConfiguration>>> getAllConfigurations() {
        return ResponseEntity.ok(ApiResponse.ok(configurationService.getAllConfigs()));
    }

    @PutMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<SystemConfiguration>>> updateConfigurations(
            @RequestBody Map<String, String> updates,
            Authentication authentication,
            HttpServletRequest request) {
        String username = authentication != null ? authentication.getName() : "ADMIN";
        List<SystemConfiguration> updated = configurationService.updateConfigs(updates, username, request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok("System configuration updated", updated));
    }
}
