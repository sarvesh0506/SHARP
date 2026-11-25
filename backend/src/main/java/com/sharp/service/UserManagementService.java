package com.sharp.service;

import com.sharp.dto.UserSummaryDto;
import com.sharp.entity.Role;
import com.sharp.entity.User;
import com.sharp.exception.ApiException;
import com.sharp.exception.ResourceNotFoundException;
import com.sharp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserManagementService {

    private static final Logger log = LoggerFactory.getLogger(UserManagementService.class);

    private final UserRepository userRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public Map<String, Object> listUsers(
            String search,
            String roleFilter,
            Boolean enabledFilter,
            String sortBy,
            String sortDir,
            int page,
            int size) {

        String q = search != null ? search.trim().toLowerCase() : "";
        Role parsedRole = null;
        if (roleFilter != null && !roleFilter.isBlank() && !"ALL".equalsIgnoreCase(roleFilter)) {
            parsedRole = parseValidRole(roleFilter);
        }
        final Role targetRole = parsedRole;

        List<UserSummaryDto> filtered = userRepository.findAll().stream()
                .filter(u -> q.isEmpty()
                        || u.getUsername().toLowerCase().contains(q)
                        || u.getEmail().toLowerCase().contains(q))
                .filter(u -> targetRole == null || u.getRole() == targetRole)
                .filter(u -> enabledFilter == null || Objects.equals(u.getEnabled(), enabledFilter))
                .sorted(buildComparator(sortBy, sortDir))
                .map(this::toDto)
                .collect(Collectors.toList());

        int safeSize = Math.max(1, Math.min(size, 100));
        int totalElements = filtered.size();
        int totalPages = (int) Math.ceil((double) totalElements / safeSize);
        int safePage = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
        int fromIdx = safePage * safeSize;
        int toIdx = Math.min(fromIdx + safeSize, totalElements);

        List<UserSummaryDto> items = fromIdx < totalElements ? filtered.subList(fromIdx, toIdx) : Collections.emptyList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", items);
        result.put("totalElements", totalElements);
        result.put("totalPages", totalPages);
        result.put("page", safePage);
        result.put("size", safeSize);
        return result;
    }

    @Transactional(readOnly = true)
    public UserSummaryDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return toDto(user);
    }

    @Transactional
    public UserSummaryDto updateUserRole(Long id, String roleStr, String adminUsername, String ip) {
        Role newRole = parseValidRole(roleStr);
        User target = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        if (target.getRole() == newRole) {
            return toDto(target);
        }

        // Prevent demoting the last active administrator
        if (target.getRole() == Role.ROLE_ADMIN && newRole != Role.ROLE_ADMIN
                && Boolean.TRUE.equals(target.getEnabled())) {
            long activeAdmins = userRepository.countByRoleAndEnabledTrue(Role.ROLE_ADMIN);
            if (activeAdmins <= 1) {
                throw new ApiException("Cannot demote the last active administrator", HttpStatus.CONFLICT);
            }
        }

        Role previousRole = target.getRole();
        target.setRole(newRole);
        target = userRepository.save(target);

        log.info("Admin {} updated role for user id={} from {} to {}", adminUsername, id, previousRole, newRole);
        auditService.record(adminUsername, "USER_ROLE_UPDATED", "USER", target.getId().toString(),
                "Changed role for " + target.getUsername() + " from " + previousRole + " to " + newRole, ip);

        return toDto(target);
    }

    @Transactional
    public UserSummaryDto updateUserStatus(Long id, boolean enabled, String adminUsername, String ip) {
        User target = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        // Prevent self-lockout
        if (!enabled && target.getUsername().equalsIgnoreCase(adminUsername)) {
            throw new ApiException("Administrators cannot disable their own account", HttpStatus.BAD_REQUEST);
        }

        // Prevent disabling the last active administrator
        if (!enabled && target.getRole() == Role.ROLE_ADMIN && Boolean.TRUE.equals(target.getEnabled())) {
            long activeAdmins = userRepository.countByRoleAndEnabledTrue(Role.ROLE_ADMIN);
            if (activeAdmins <= 1) {
                throw new ApiException("Cannot disable the last active administrator", HttpStatus.CONFLICT);
            }
        }

        target.setEnabled(enabled);
        target = userRepository.save(target);

        String action = enabled ? "USER_ENABLED" : "USER_DISABLED";
        log.info("Admin {} set enabled={} for user id={}", adminUsername, enabled, id);
        auditService.record(adminUsername, action, "USER", target.getId().toString(),
                (enabled ? "Enabled" : "Disabled") + " user account " + target.getUsername(), ip);

        return toDto(target);
    }

    private Role parseValidRole(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ApiException("Role must not be blank", HttpStatus.BAD_REQUEST);
        }
        try {
            return Role.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ApiException("Invalid role: " + raw + ". Allowed roles: ROLE_ADMIN, ROLE_OPERATOR", HttpStatus.BAD_REQUEST);
        }
    }

    private Comparator<User> buildComparator(String sortBy, String sortDir) {
        Comparator<User> cmp = switch (sortBy != null ? sortBy.toLowerCase() : "id") {
            case "username" -> Comparator.comparing(User::getUsername, String.CASE_INSENSITIVE_ORDER);
            case "email" -> Comparator.comparing(User::getEmail, String.CASE_INSENSITIVE_ORDER);
            case "role" -> Comparator.comparing(u -> u.getRole().name());
            case "createdat" -> Comparator.comparing(u -> u.getCreatedAt() != null ? u.getCreatedAt() : java.time.Instant.EPOCH);
            default -> Comparator.comparingLong(User::getId);
        };
        return "desc".equalsIgnoreCase(sortDir) ? cmp.reversed() : cmp;
    }

    public UserSummaryDto toDto(User user) {
        return UserSummaryDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().name())
                .enabled(user.getEnabled())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
