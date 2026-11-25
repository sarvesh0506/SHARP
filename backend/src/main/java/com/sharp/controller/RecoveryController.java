package com.sharp.controller;

import com.sharp.dto.ApiResponse;
import com.sharp.dto.RecoveryActionDto;
import com.sharp.entity.RecoveryRecommendation;
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
        return ResponseEntity.ok(ApiResponse.ok(recoveryService.getAllActions()));
    }

    @GetMapping("/executions")
    public ResponseEntity<ApiResponse<List<RecoveryActionDto>>> getExecutions() {
        return ResponseEntity.ok(ApiResponse.ok(recoveryService.getAllActions()));
    }

    @GetMapping("/executions/{id}")
    public ResponseEntity<ApiResponse<RecoveryActionDto>> getExecutionById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(recoveryService.getActionById(id)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RecoveryActionDto>> getActionById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(recoveryService.getActionById(id)));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<ApiResponse<List<RecoveryRecommendation>>> getAllRecommendations() {
        return ResponseEntity.ok(ApiResponse.ok(recoveryService.getAllRecommendations()));
    }

    @PostMapping("/recommendations/incident/{incidentId}")
    public ResponseEntity<ApiResponse<RecoveryRecommendation>> createRecommendation(
            @PathVariable Long incidentId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication,
            HttpServletRequest request) {
        String actionType = body != null ? body.get("actionType") : null;
        String username = authentication != null ? authentication.getName() : "OPERATOR";
        return ResponseEntity.ok(ApiResponse.ok("Recovery recommendation created",
                recoveryService.generateRecommendation(incidentId, actionType, username, request.getRemoteAddr())));
    }

    @PostMapping("/recommendations/{id}/approve")
    public ResponseEntity<ApiResponse<RecoveryRecommendation>> approveRecommendation(
            @PathVariable Long id,
            Authentication authentication,
            HttpServletRequest request) {
        boolean isAdmin = hasAdminAuthority(authentication);
        String username = authentication != null ? authentication.getName() : "OPERATOR";
        return ResponseEntity.ok(ApiResponse.ok("Recommendation approved",
                recoveryService.approveRecommendation(id, isAdmin, username, request.getRemoteAddr())));
    }

    @PostMapping("/recommendations/{id}/reject")
    public ResponseEntity<ApiResponse<RecoveryRecommendation>> rejectRecommendation(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication,
            HttpServletRequest request) {
        String reason = body != null ? body.getOrDefault("reason", "Rejected by operator") : "Rejected by operator";
        String username = authentication != null ? authentication.getName() : "OPERATOR";
        return ResponseEntity.ok(ApiResponse.ok("Recommendation rejected",
                recoveryService.rejectRecommendation(id, reason, username, request.getRemoteAddr())));
    }

    @PostMapping("/recommendations/{id}/cancel")
    public ResponseEntity<ApiResponse<RecoveryRecommendation>> cancelRecommendation(
            @PathVariable Long id,
            Authentication authentication,
            HttpServletRequest request) {
        String username = authentication != null ? authentication.getName() : "OPERATOR";
        return ResponseEntity.ok(ApiResponse.ok("Recommendation cancelled",
                recoveryService.cancelRecommendation(id, username, request.getRemoteAddr())));
    }

    @PostMapping("/recommendations/{id}/execute")
    public ResponseEntity<ApiResponse<RecoveryActionDto>> executeRecommendation(
            @PathVariable Long id,
            Authentication authentication,
            HttpServletRequest request) {
        boolean isAdmin = hasAdminAuthority(authentication);
        String username = authentication != null ? authentication.getName() : "OPERATOR";
        return ResponseEntity.ok(ApiResponse.ok("Recovery executed and independently verified",
                recoveryService.executeRecommendation(id, isAdmin, username, request.getRemoteAddr())));
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
        return ResponseEntity.ok(ApiResponse.ok("Recovery action processed",
                recoveryService.triggerRecovery(incidentId, actionType, riskLevel, username, request.getRemoteAddr())));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<RecoveryActionDto>> approveRecovery(
            @PathVariable Long id,
            Authentication authentication,
            HttpServletRequest request) {
        String admin = authentication != null ? authentication.getName() : "ADMIN";
        return ResponseEntity.ok(ApiResponse.ok("Recovery action approved and executed",
                recoveryService.approveRecovery(id, admin, request.getRemoteAddr())));
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
        return ResponseEntity.ok(ApiResponse.ok("Recovery action rejected",
                recoveryService.rejectRecovery(id, reason, admin, request.getRemoteAddr())));
    }

    private boolean hasAdminAuthority(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }
}
