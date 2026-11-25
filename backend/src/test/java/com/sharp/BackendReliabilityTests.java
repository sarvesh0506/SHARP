package com.sharp;

import com.sharp.controller.MonitoringController;
import com.sharp.dto.ApiResponse;
import com.sharp.dto.DashboardSummaryDto;
import com.sharp.dto.RecoveryActionDto;
import com.sharp.entity.Incident;
import com.sharp.entity.RecoveryAction;
import com.sharp.entity.RecoveryRecommendation;
import com.sharp.entity.SystemMetric;
import com.sharp.exception.ApiException;
import com.sharp.repository.IncidentRepository;
import com.sharp.repository.RecoveryActionRepository;
import com.sharp.repository.SystemMetricRepository;
import com.sharp.service.DashboardService;
import com.sharp.service.RecoveryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class BackendReliabilityTests {

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private RecoveryActionRepository recoveryActionRepository;

    @Autowired
    private SystemMetricRepository systemMetricRepository;

    @Autowired
    private MonitoringController monitoringController;

    @Autowired
    private RecoveryService recoveryService;

    @Autowired
    private MockMvc mockMvc;

    // -------------------------------------------------------------------------
    // 1. Dashboard MTTR Tests
    // -------------------------------------------------------------------------

    @Test
    void mttrReturnsNullWhenNoResolvedIncidentsExist() {
        recoveryActionRepository.deleteAll();
        incidentRepository.deleteAll();

        incidentRepository.save(Incident.builder()
                .title("Open Incident")
                .severity("HIGH")
                .status("OPEN")
                .openedAt(Instant.now().minusSeconds(60))
                .build());

        DashboardSummaryDto summary = dashboardService.getSummary();
        assertNull(summary.getAvgRecoveryTimeSeconds(), "MTTR must be null when no resolved incidents exist (never fabricated)");
        assertNull(summary.getRecoverySuccessRate(), "Recovery success rate must be null when no actions exist");
        assertEquals(1, summary.getActiveIncidents());
    }

    @Test
    void mttrCalculatesAccurateMeanSecondsAcrossMultipleResolvedIncidents() {
        Instant base = Instant.parse("2026-11-25T10:00:00Z");
        Incident i1 = Incident.builder()
                .title("Incident 1")
                .severity("MEDIUM")
                .status("RESOLVED")
                .openedAt(base)
                .resolvedAt(base.plusSeconds(10))
                .build();
        Incident i2 = Incident.builder()
                .title("Incident 2")
                .severity("HIGH")
                .status("CLOSED")
                .openedAt(base)
                .resolvedAt(base.plusSeconds(20))
                .build();

        Double mttr = dashboardService.calculateMttrSeconds(List.of(i1, i2));
        assertNotNull(mttr);
        assertEquals(15.0, mttr, 0.01);
    }

    @Test
    void mttrSafelyIgnoresMissingOrInvalidTimestamps() {
        Instant base = Instant.parse("2026-11-25T10:00:00Z");
        Incident missingResolved = Incident.builder()
                .title("Missing resolvedAt")
                .status("RESOLVED")
                .openedAt(base)
                .resolvedAt(null)
                .build();
        Incident missingOpened = Incident.builder()
                .title("Missing openedAt")
                .status("RESOLVED")
                .openedAt(null)
                .resolvedAt(base)
                .build();
        Incident negativeDuration = Incident.builder()
                .title("Negative duration")
                .status("RESOLVED")
                .openedAt(base.plusSeconds(30))
                .resolvedAt(base)
                .build();

        assertNull(dashboardService.calculateMttrSeconds(List.of(missingResolved, missingOpened, negativeDuration)));

        Incident valid = Incident.builder()
                .title("Valid")
                .status("RESOLVED")
                .openedAt(base)
                .resolvedAt(base.plusMillis(12500))
                .build();

        assertEquals(12.5, dashboardService.calculateMttrSeconds(List.of(missingResolved, negativeDuration, valid)), 0.01);
    }

    @Test
    void dashboardSummaryComputesMttrFromPersistedResolvedIncidents() {
        recoveryActionRepository.deleteAll();
        incidentRepository.deleteAll();

        Instant base = Instant.now().minusSeconds(120);
        Incident resolved = incidentRepository.save(Incident.builder()
                .title("Resolved Incident")
                .severity("HIGH")
                .status("RESOLVED")
                .openedAt(base)
                .resolvedAt(base.plusSeconds(30))
                .build());
        // Override @CreationTimestamp openedAt if needed for deterministic delta
        resolved.setOpenedAt(base);
        resolved.setResolvedAt(base.plusSeconds(30));
        incidentRepository.saveAndFlush(resolved);

        incidentRepository.save(Incident.builder()
                .title("Still Open")
                .severity("MEDIUM")
                .status("OPEN")
                .build());

        DashboardSummaryDto summary = dashboardService.getSummary();
        assertEquals(1, summary.getActiveIncidents());
        assertNotNull(summary.getAvgRecoveryTimeSeconds());
        assertTrue(summary.getAvgRecoveryTimeSeconds() >= 0.0);
    }

    // -------------------------------------------------------------------------
    // 2. Monitoring History Tests
    // -------------------------------------------------------------------------

    @Test
    void monitoringHistoryReturnsNewestRecordsInChronologicalOrder() {
        systemMetricRepository.deleteAll();

        Instant t0 = Instant.parse("2026-11-25T12:00:00Z");
        for (int i = 1; i <= 8; i++) {
            systemMetricRepository.save(SystemMetric.builder()
                    .hostName("host-history-test")
                    .cpuPercent(10.0 * i)
                    .memoryPercent(20.0 + i)
                    .diskPercent(40.0)
                    .collectedAt(t0.plusSeconds(i * 10L))
                    .build());
        }

        ApiResponse<List<SystemMetric>> res = monitoringController.getSystemHistory(
                t0.toString(),
                t0.plusSeconds(100).toString(),
                3
        ).getBody();

        assertNotNull(res);
        assertTrue(res.isSuccess());
        List<SystemMetric> items = res.getData();
        assertEquals(3, items.size());
        // Must be the newest 3 (i=6, 7, 8) in chronological order (60s, 70s, 80s)
        assertEquals(t0.plusSeconds(60), items.get(0).getCollectedAt());
        assertEquals(t0.plusSeconds(70), items.get(1).getCollectedAt());
        assertEquals(t0.plusSeconds(80), items.get(2).getCollectedAt());
        assertEquals(60.0, items.get(0).getCpuPercent());
        assertEquals(80.0, items.get(2).getCpuPercent());
    }

    @Test
    void monitoringHistoryHandlesEmptyAndSmallerThanLimitAndDuplicates() {
        systemMetricRepository.deleteAll();
        Instant t0 = Instant.parse("2026-11-25T13:00:00Z");

        // Empty
        List<SystemMetric> empty = monitoringController.getSystemHistory(
                t0.toString(), t0.plusSeconds(60).toString(), 10).getBody().getData();
        assertTrue(empty.isEmpty());

        // Duplicate timestamp + smaller than limit
        systemMetricRepository.save(SystemMetric.builder()
                .hostName("host-dup").cpuPercent(11.0).collectedAt(t0.plusSeconds(10)).build());
        systemMetricRepository.save(SystemMetric.builder()
                .hostName("host-dup").cpuPercent(22.0).collectedAt(t0.plusSeconds(10)).build());
        systemMetricRepository.save(SystemMetric.builder()
                .hostName("host-dup").cpuPercent(33.0).collectedAt(t0.plusSeconds(20)).build());

        List<SystemMetric> small = monitoringController.getSystemHistory(
                t0.toString(), t0.plusSeconds(60).toString(), 50).getBody().getData();
        assertEquals(2, small.size(), "Duplicate timestamps should be collapsed while keeping chronological order");
        assertEquals(t0.plusSeconds(10), small.get(0).getCollectedAt());
        assertEquals(t0.plusSeconds(20), small.get(1).getCollectedAt());
    }

    @Test
    @WithMockUser(username = "operator", roles = {"OPERATOR"})
    void monitoringHistoryValidatesLimitAndTimestamps() throws Exception {
        ApiException badLimit = assertThrows(ApiException.class, () ->
                monitoringController.getSystemHistory(null, null, 0));
        assertEquals(HttpStatus.BAD_REQUEST, badLimit.getStatus());

        Instant now = Instant.now();
        ApiException badRange = assertThrows(ApiException.class, () ->
                monitoringController.getSystemHistory(now.toString(), now.minus(5, ChronoUnit.MINUTES).toString(), 10));
        assertEquals(HttpStatus.BAD_REQUEST, badRange.getStatus());

        mockMvc.perform(get("/api/v1/monitoring/system/history")
                        .param("from", "not-a-timestamp"))
                .andExpect(status().isBadRequest());
    }

    // -------------------------------------------------------------------------
    // 3. Recovery Reliability & Safety Tests
    // -------------------------------------------------------------------------

    @Test
    void recoveryPreventsConcurrentExecutionOnSameIncident() {
        Incident incident = incidentRepository.save(Incident.builder()
                .title("Concurrent Recovery Test")
                .severity("HIGH")
                .status("RECOVERING")
                .recoveryStatus("EXECUTING")
                .affectedResource("host-1:CPU_PERCENT")
                .build());

        recoveryActionRepository.save(RecoveryAction.builder()
                .incident(incident)
                .actionType("RUN_HEALTH_PROBE")
                .riskLevel("LOW")
                .status("EXECUTING")
                .initiatedAt(Instant.now())
                .build());

        ApiException conflict = assertThrows(ApiException.class, () ->
                recoveryService.triggerRecovery(incident.getId(), "RUN_HEALTH_PROBE", "LOW", "admin", "127.0.0.1"));
        assertEquals(HttpStatus.CONFLICT, conflict.getStatus());

        RecoveryAction awaiting = recoveryActionRepository.save(RecoveryAction.builder()
                .incident(incident)
                .actionType("RESTART_MONITORED_SERVICE")
                .riskLevel("MEDIUM")
                .status("AWAITING_APPROVAL")
                .requiresApproval(true)
                .initiatedAt(Instant.now())
                .build());

        ApiException approveConflict = assertThrows(ApiException.class, () ->
                recoveryService.approveRecovery(awaiting.getId(), "admin", "127.0.0.1"));
        assertEquals(HttpStatus.CONFLICT, approveConflict.getStatus());
    }

    @Test
    void failedRecoveryExecutionDoesNotResolveIncident() {
        Incident incident = incidentRepository.save(Incident.builder()
                .title("Failed Target Restart Test")
                .severity("MEDIUM")
                .status("OPEN")
                .affectedResource("non-existent-service-xyz")
                .build());

        RecoveryAction awaiting = recoveryActionRepository.save(RecoveryAction.builder()
                .incident(incident)
                .actionType("RESTART_MONITORED_SERVICE")
                .riskLevel("MEDIUM")
                .status("AWAITING_APPROVAL")
                .requiresApproval(true)
                .targetResource("non-existent-service-xyz")
                .initiatedAt(Instant.now())
                .build());

        RecoveryActionDto result = recoveryService.approveRecovery(awaiting.getId(), "admin", "127.0.0.1");
        assertEquals("FAILED", result.getStatus());
        assertEquals("UNVERIFIED", result.getVerificationStatus());

        Incident updated = incidentRepository.findById(incident.getId()).orElseThrow();
        assertNotEquals("RESOLVED", updated.getStatus());
        assertNull(updated.getResolvedAt());
    }

    @Test
    void rejectingRecommendationOrActionUpdatesIncidentRecoveryStatus() {
        Incident incident = incidentRepository.save(Incident.builder()
                .title("Reject Recovery Test")
                .severity("HIGH")
                .status("OPEN")
                .affectedResource("host-1:CPU_PERCENT")
                .build());

        RecoveryRecommendation rec = recoveryService.generateRecommendation(
                incident.getId(), "THROTTLE_OR_SCALE_SERVICE", "admin", "127.0.0.1");
        assertEquals("PENDING_APPROVAL", incidentRepository.findById(incident.getId()).orElseThrow().getRecoveryStatus());

        recoveryService.rejectRecommendation(rec.getId(), "Not needed", "admin", "127.0.0.1");
        assertEquals("REJECTED", incidentRepository.findById(incident.getId()).orElseThrow().getRecoveryStatus());

        RecoveryActionDto queued = recoveryService.triggerRecovery(
                incident.getId(), "RESTART_MONITORED_SERVICE", "MEDIUM", "operator", "127.0.0.1");
        assertEquals("AWAITING_APPROVAL", queued.getStatus());

        recoveryService.rejectRecovery(queued.getId(), "Unsafe right now", "admin", "127.0.0.1");
        Incident afterActionReject = incidentRepository.findById(incident.getId()).orElseThrow();
        assertEquals("OPEN", afterActionReject.getStatus());
        assertEquals("REJECTED", afterActionReject.getRecoveryStatus());
    }

    @Test
    @WithMockUser(username = "operator", roles = {"OPERATOR"})
    void triggerRecoveryValidatesMissingPayloadFields() throws Exception {
        mockMvc.perform(post("/api/v1/recovery/trigger")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }
}
