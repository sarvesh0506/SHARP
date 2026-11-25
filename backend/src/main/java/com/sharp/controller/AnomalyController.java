package com.sharp.controller;

import com.sharp.dto.ApiResponse;
import com.sharp.entity.AnomalyEvent;
import com.sharp.exception.ResourceNotFoundException;
import com.sharp.repository.AnomalyEventRepository;
import com.sharp.service.AuditService;
import com.sharp.service.EventBroadcastService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/anomalies")
@RequiredArgsConstructor
public class AnomalyController {

    private final AnomalyEventRepository anomalyRepository;
    private final AuditService auditService;
    private final EventBroadcastService eventBroadcastService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AnomalyEvent>>> listAnomalies(
            @RequestParam(required = false) String status) {
        List<AnomalyEvent> list = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status))
                ? anomalyRepository.findByStatusOrderByDetectedAtDesc(status.toUpperCase())
                : anomalyRepository.findAllByOrderByDetectedAtDesc();
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AnomalyEvent>> getAnomaly(@PathVariable Long id) {
        AnomalyEvent anomaly = anomalyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Anomaly", "id", id));
        return ResponseEntity.ok(ApiResponse.ok(anomaly));
    }

    @PostMapping("/{id}/acknowledge")
    public ResponseEntity<ApiResponse<AnomalyEvent>> acknowledge(
            @PathVariable Long id, Authentication auth, HttpServletRequest req) {
        return updateStatus(id, "ACKNOWLEDGED", auth, req);
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<ApiResponse<AnomalyEvent>> resolve(
            @PathVariable Long id, Authentication auth, HttpServletRequest req) {
        return updateStatus(id, "RESOLVED", auth, req);
    }

    @PostMapping("/{id}/suppress")
    public ResponseEntity<ApiResponse<AnomalyEvent>> suppress(
            @PathVariable Long id, Authentication auth, HttpServletRequest req) {
        return updateStatus(id, "SUPPRESSED", auth, req);
    }

    private ResponseEntity<ApiResponse<AnomalyEvent>> updateStatus(
            Long id, String status, Authentication auth, HttpServletRequest req) {
        AnomalyEvent anomaly = anomalyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Anomaly", "id", id));
        anomaly.setStatus(status);
        anomaly.setUpdatedAt(Instant.now());
        anomaly = anomalyRepository.save(anomaly);

        String user = auth != null ? auth.getName() : "OPERATOR";
        auditService.record(user, "ANOMALY_" + status, "ANOMALY", id.toString(),
                "Marked anomaly #" + id + " as " + status, req.getRemoteAddr());
        eventBroadcastService.publish("ANOMALY_UPDATED", anomaly);
        return ResponseEntity.ok(ApiResponse.ok("Anomaly " + status.toLowerCase(), anomaly));
    }
}
