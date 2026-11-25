package com.sharp.controller;

import com.sharp.dto.ApiResponse;
import com.sharp.dto.RecoveryActionDto;
import com.sharp.service.RecoveryService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/recovery")
@RequiredArgsConstructor
public class RecoveryController {

    private final RecoveryService recoveryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<RecoveryActionDto>>> getAllActions() {
        List<RecoveryActionDto> actions = recoveryService.getAllActions();
        return ResponseEntity.ok(ApiResponse.ok(actions));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RecoveryActionDto>> getActionById(@PathVariable Long id) {
        RecoveryActionDto action = recoveryService.getActionById(id);
        return ResponseEntity.ok(ApiResponse.ok(action));
    }

    @PostMapping("/trigger")
    public ResponseEntity<ApiResponse<RecoveryActionDto>> triggerRecovery(
            @RequestBody Map<String, Object> body,
            Authentication authentication,
            HttpServletRequest request) {
        Long incidentId = Long.valueOf(body.get("incidentId").toString());
        String actionType = body.get("actionType").toString();
        String riskLevel = body.getOrDefault("riskLevel", "LOW").toString();

        String username = authentication != null ? authentication.getName() : "OPERATOR";
        RecoveryActionDto action = recoveryService.triggerRecovery(incidentId, actionType, riskLevel, username, request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok("Recovery action initiated", action));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<RecoveryActionDto>> approveRecovery(
            @PathVariable Long id,
            Authentication authentication,
            HttpServletRequest request) {
        String admin = authentication != null ? authentication.getName() : "ADMIN";
        RecoveryActionDto action = recoveryService.approveRecovery(id, admin, request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok("Recovery action approved by administrator", action));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<RecoveryActionDto>> rejectRecovery(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication,
            HttpServletRequest request) {
        String admin = authentication != null ? authentication.getName() : "ADMIN";
        String reason = body != null ? body.getOrDefault("reason", "Rejected by administrator policy") : "Rejected by administrator";
        RecoveryActionDto action = recoveryService.rejectRecovery(id, reason, admin, request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok("Recovery action rejected", action));
    }
}
