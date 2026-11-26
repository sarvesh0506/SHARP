package com.sharp.controller;

import com.sharp.dto.ApiResponse;
import com.sharp.dto.MonitoredServerDto;
import com.sharp.service.ServerService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/servers")
@RequiredArgsConstructor
public class ServerController {

    private final ServerService serverService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MonitoredServerDto>>> getAllServers() {
        List<MonitoredServerDto> servers = serverService.getAllServers();
        return ResponseEntity.ok(ApiResponse.ok(servers));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MonitoredServerDto>> getServerById(@PathVariable Long id) {
        MonitoredServerDto server = serverService.getServerById(id);
        return ResponseEntity.ok(ApiResponse.ok(server));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MonitoredServerDto>> registerServer(
            @Valid @RequestBody MonitoredServerDto dto,
            Authentication authentication,
            HttpServletRequest request) {
        String username = authentication != null ? authentication.getName() : "OPERATOR";
        MonitoredServerDto created = serverService.registerServer(dto, username, request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok("Infrastructure server registered successfully", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MonitoredServerDto>> updateServer(
            @PathVariable Long id,
            @Valid @RequestBody MonitoredServerDto dto,
            Authentication authentication,
            HttpServletRequest request) {
        String username = authentication != null ? authentication.getName() : "OPERATOR";
        MonitoredServerDto updated = serverService.updateServer(id, dto, username, request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok("Infrastructure server updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteServer(
            @PathVariable Long id,
            Authentication authentication,
            HttpServletRequest request) {
        String username = authentication != null ? authentication.getName() : "ADMIN";
        serverService.deleteServer(id, username, request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok("Infrastructure server deleted successfully", null));
    }
}
