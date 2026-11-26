package com.sharp.service;

import com.sharp.entity.AuditLog;
import com.sharp.exception.ApiException;
import com.sharp.repository.AuditLogRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void record(String username, String action, String resourceType, String resourceId, String details, String ipAddress) {
        AuditLog log = AuditLog.builder()
                .username(username != null ? username : "SYSTEM")
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .details(details)
                .ipAddress(ipAddress)
                .build();
        auditLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getRecentLogs() {
        return auditLogRepository.findTop20ByOrderByTimestampDesc();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPagedLogs(
            String search,
            String action,
            String from,
            String to,
            String sortDir,
            int page,
            int size) {

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 100));
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;

        Instant fromInstant = parseBoundaryInstant(from, true);
        Instant toInstant = parseBoundaryInstant(to, false);
        if (fromInstant != null && toInstant != null && fromInstant.isAfter(toInstant)) {
            throw new ApiException("'from' date must be before or equal to 'to' date", HttpStatus.BAD_REQUEST);
        }

        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("username")), pattern),
                        cb.like(cb.lower(root.get("action")), pattern),
                        cb.like(cb.lower(root.get("resourceType")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("resourceId"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("details"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("ipAddress"), "")), pattern)
                ));
            }

            if (action != null && !action.isBlank() && !"ALL".equalsIgnoreCase(action)) {
                predicates.add(cb.equal(cb.upper(root.get("action")), action.trim().toUpperCase()));
            }

            if (fromInstant != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("timestamp"), fromInstant));
            }
            if (toInstant != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("timestamp"), toInstant));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<AuditLog> resultPage = auditLogRepository.findAll(
                spec,
                PageRequest.of(safePage, safeSize, Sort.by(direction, "timestamp").and(Sort.by(direction, "id")))
        );

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("items", resultPage.getContent());
        response.put("totalElements", resultPage.getTotalElements());
        response.put("totalPages", resultPage.getTotalPages());
        response.put("page", resultPage.getNumber());
        response.put("size", resultPage.getSize());
        return response;
    }

    private Instant parseBoundaryInstant(String raw, boolean startOfDay) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String trimmed = raw.trim();
        try {
            return Instant.parse(trimmed);
        } catch (DateTimeParseException ignored) {
            try {
                LocalDate date = LocalDate.parse(trimmed);
                return startOfDay
                        ? date.atStartOfDay(ZoneOffset.UTC).toInstant()
                        : date.plusDays(1).atStartOfDay(ZoneOffset.UTC).minusNanos(1).toInstant();
            } catch (DateTimeParseException ex) {
                throw new ApiException("Invalid date/timestamp format: " + trimmed, HttpStatus.BAD_REQUEST);
            }
        }
    }
}
