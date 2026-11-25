package com.sharp.controller;

import com.sharp.dto.ApiResponse;
import com.sharp.dto.UpdateUserRoleRequest;
import com.sharp.dto.UpdateUserStatusRequest;
import com.sharp.dto.UserSummaryDto;
import com.sharp.service.UserManagementService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
public class UserController {

    private final UserManagementService userManagementService;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                userManagementService.listUsers(search, role, enabled, sortBy, sortDir, page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserSummaryDto>> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(userManagementService.getUserById(id)));
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<ApiResponse<UserSummaryDto>> updateUserRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRoleRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        String admin = authentication.getName();
        UserSummaryDto updated = userManagementService.updateUserRole(id, request.getRole(), admin, httpRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok("User role updated", updated));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<UserSummaryDto>> updateUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        String admin = authentication.getName();
        UserSummaryDto updated = userManagementService.updateUserStatus(id, request.getEnabled(), admin, httpRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok(
                Boolean.TRUE.equals(request.getEnabled()) ? "User account enabled" : "User account disabled",
                updated));
    }
}
