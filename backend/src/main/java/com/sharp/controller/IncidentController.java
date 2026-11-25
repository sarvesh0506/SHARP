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
        List<IncidentDto> incidents = incidentService.getAllIncidents();
        return ResponseEntity.ok(ApiResponse.ok(incidents));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<IncidentDto>>> getActiveIncidents() {
        List<IncidentDto> incidents = incidentService.getActiveIncidents();
        return ResponseEntity.ok(ApiResponse.ok(incidents));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<IncidentDto>> getIncidentById(@PathVariable Long id) {
        IncidentDto incident = incidentService.getIncidentById(id);
        return ResponseEntity.ok(ApiResponse.ok(incident));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<IncidentDto>> createIncident(
            @Valid @RequestBody IncidentDto dto,
            Authentication authentication,
            HttpServletRequest request) {
        String username = authentication != null ? authentication.getName() : "SENTINEL";
        IncidentDto created = incidentService.createIncident(dto, username, request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok("Incident logged successfully", created));
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<ApiResponse<IncidentDto>> resolveIncident(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication,
            HttpServletRequest request) {
        String username = authentication != null ? authentication.getName() : "OPERATOR";
        String notes = body != null ? body.get("resolutionNotes") : "Resolved manually";
        IncidentDto resolved = incidentService.resolveIncident(id, notes, username, request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok("Incident marked as resolved", resolved));
    }
}
