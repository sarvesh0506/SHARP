package com.sharp.controller;

import com.sharp.dto.ApiResponse;
import com.sharp.entity.RootCauseAnalysis;
import com.sharp.service.RootCauseService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rca")
@RequiredArgsConstructor
public class RcaController {

    private final RootCauseService rootCauseService;

    @GetMapping("/incident/{incidentId}")
    public ResponseEntity<ApiResponse<List<RootCauseAnalysis>>> getByIncident(@PathVariable Long incidentId) {
        return ResponseEntity.ok(ApiResponse.ok(rootCauseService.getAnalysesForIncident(incidentId)));
    }

    @PostMapping("/incident/{incidentId}/analyze")
    public ResponseEntity<ApiResponse<RootCauseAnalysis>> analyzeIncident(
            @PathVariable Long incidentId,
            Authentication authentication,
            HttpServletRequest request) {
        String user = authentication != null ? authentication.getName() : "OPERATOR";
        RootCauseAnalysis rca = rootCauseService.analyzeIncident(incidentId, user, request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok("Root cause analysis completed", rca));
    }
}
