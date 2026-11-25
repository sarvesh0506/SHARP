package com.sharp.controller;

import com.sharp.dto.ApiResponse;
import com.sharp.dto.ApplicationDto;
import com.sharp.service.ApplicationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ApplicationDto>>> getAllApplications() {
        List<ApplicationDto> applications = applicationService.getAllApplications();
        return ResponseEntity.ok(ApiResponse.ok(applications));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ApplicationDto>> getApplicationById(@PathVariable Long id) {
        ApplicationDto application = applicationService.getApplicationById(id);
        return ResponseEntity.ok(ApiResponse.ok(application));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ApplicationDto>> registerApplication(
            @Valid @RequestBody ApplicationDto dto,
            Authentication authentication,
            HttpServletRequest request) {
        String username = authentication != null ? authentication.getName() : "OPERATOR";
        ApplicationDto created = applicationService.registerApplication(dto, username, request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok("Application registered successfully", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ApplicationDto>> updateApplication(
            @PathVariable Long id,
            @Valid @RequestBody ApplicationDto dto,
            Authentication authentication,
            HttpServletRequest request) {
        String username = authentication != null ? authentication.getName() : "OPERATOR";
        ApplicationDto updated = applicationService.updateApplication(id, dto, username, request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok("Application updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteApplication(
            @PathVariable Long id,
            Authentication authentication,
            HttpServletRequest request) {
        String username = authentication != null ? authentication.getName() : "ADMIN";
        applicationService.deleteApplication(id, username, request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok("Application deleted successfully", null));
    }
}
