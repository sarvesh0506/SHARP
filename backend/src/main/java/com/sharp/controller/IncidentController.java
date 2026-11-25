package com.sharp.controller;

import com.sharp.dto.ApiResponse;
import com.sharp.dto.IncidentDto;
import com.sharp.service.IncidentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/incidents")
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentService incidentService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<IncidentDto>>> getAllIncidents() {
        return ResponseEntity.ok(ApiResponse.ok(incidentService.getAllIncidents()));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<IncidentDto>>> getActiveIncidents() {
        return ResponseEntity.ok(ApiResponse.ok(incidentService.getActiveIncidents()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<IncidentDto>> getIncidentById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(incidentService.getIncidentById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<IncidentDto>> createIncident(
            @Valid @RequestBody IncidentDto dto,
            Authentication authentication,
            HttpServletRequest request) {
        String username = authentication != null ? authentication.getName() : "OPERATOR";
        return ResponseEntity.ok(ApiResponse.ok("Incident logged successfully",
                incidentService.createIncident(dto, username, request.getRemoteAddr())));
    }

    @PostMapping("/{id}/acknowledge")
    public ResponseEntity<ApiResponse<IncidentDto>> acknowledgeIncident(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication,
            HttpServletRequest request) {
        String username = authentication != null ? authentication.getName() : "OPERATOR";
        String notes = body != null ? body.get("notes") : null;
        return ResponseEntity.ok(ApiResponse.ok("Incident acknowledged",
                incidentService.transitionStatus(id, "ACKNOWLEDGED", notes, username, request.getRemoteAddr())));
    }

    @PostMapping("/{id}/investigate")
    public ResponseEntity<ApiResponse<IncidentDto>> investigateIncident(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication,
            HttpServletRequest request) {
        String username = authentication != null ? authentication.getName() : "OPERATOR";
        String notes = body != null ? body.get("notes") : null;
        return ResponseEntity.ok(ApiResponse.ok("Incident moved to investigating",
                incidentService.transitionStatus(id, "INVESTIGATING", notes, username, request.getRemoteAddr())));
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<ApiResponse<IncidentDto>> resolveIncident(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication,
            HttpServletRequest request) {
        String username = authentication != null ? authentication.getName() : "OPERATOR";
        String notes = body != null ? body.get("resolutionNotes") : "Resolved manually";
        return ResponseEntity.ok(ApiResponse.ok("Incident marked as resolved",
                incidentService.resolveIncident(id, notes, username, request.getRemoteAddr())));
    }

    @PostMapping("/{id}/reopen")
    public ResponseEntity<ApiResponse<IncidentDto>> reopenIncident(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication,
            HttpServletRequest request) {
        String username = authentication != null ? authentication.getName() : "OPERATOR";
        String notes = body != null ? body.get("notes") : "Reopened for further investigation";
        return ResponseEntity.ok(ApiResponse.ok("Incident reopened",
                incidentService.transitionStatus(id, "REOPENED", notes, username, request.getRemoteAddr())));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<ApiResponse<IncidentDto>> closeIncident(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication,
            HttpServletRequest request) {
        String username = authentication != null ? authentication.getName() : "OPERATOR";
        String notes = body != null ? body.get("notes") : "Closed";
        return ResponseEntity.ok(ApiResponse.ok("Incident closed",
                incidentService.transitionStatus(id, "CLOSED", notes, username, request.getRemoteAddr())));
    }
}
