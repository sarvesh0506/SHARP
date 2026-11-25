package com.sharp;

import com.sharp.detection.AnomalyDetectionEngine;
import com.sharp.dto.IncidentDto;
import com.sharp.dto.RecoveryActionDto;
import com.sharp.entity.AnomalyEvent;
import com.sharp.entity.RecoveryRecommendation;
import com.sharp.entity.RootCauseAnalysis;
import com.sharp.entity.SystemMetric;
import com.sharp.exception.ApiException;
import com.sharp.repository.AnomalyEventRepository;
import com.sharp.repository.SystemMetricRepository;
import com.sharp.service.IncidentService;
import com.sharp.service.RecoveryService;
import com.sharp.service.RootCauseService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
class SelfHealingPipelineTests {

    @Autowired
    private SystemMetricRepository systemMetricRepository;

    @Autowired
    private AnomalyDetectionEngine anomalyDetectionEngine;

    @Autowired
    private AnomalyEventRepository anomalyEventRepository;

    @Autowired
    private IncidentService incidentService;

    @Autowired
    private RootCauseService rootCauseService;

    @Autowired
    private RecoveryService recoveryService;

    @Test
    void detectionCreatesAnomalyAndAutoIncidentWithDeduplication() {
        SystemMetric highCpu = systemMetricRepository.save(SystemMetric.builder()
                .hostName("test-host-4c")
                .cpuPercent(95.5)
                .memoryPercent(52.0)
                .diskPercent(40.0)
                .collectedAt(Instant.now())
                .build());

        List<AnomalyEvent> detected = anomalyDetectionEngine.analyzeLatestSample(highCpu, Collections.emptyList());
        assertFalse(detected.isEmpty(), "Expected CPU anomaly to be detected");
        AnomalyEvent cpuAnomaly = detected.stream()
                .filter(a -> "CPU_PERCENT".equals(a.getMetricName()))
                .findFirst()
                .orElseThrow();

        assertEquals("CRITICAL", cpuAnomaly.getSeverity());
        assertEquals("RULE_BASED", cpuAnomaly.getDetectionMethod());
        assertNull(cpuAnomaly.getConfidenceScore(), "Rule-based detection must not invent AI confidence");
        assertNotNull(cpuAnomaly.getIncidentId(), "Eligible anomaly must auto-create an incident");

        // Re-analyzing the same metric ID must be skipped
        List<AnomalyEvent> duplicateRun = anomalyDetectionEngine.analyzeLatestSample(highCpu, Collections.emptyList());
        assertTrue(duplicateRun.isEmpty());
    }

    @Test
    void rcaFallbackAndRecoveryPolicyAndVerificationWorkEndToEnd() {
        IncidentDto inc = incidentService.createIncident(IncidentDto.builder()
                .title("Test High CPU Incident")
                .description("Test incident for Phase 4C verification")
                .severity("HIGH")
                .affectedResource("test-host-4c:CPU_PERCENT")
                .build(), "admin", "127.0.0.1");

        // Lifecycle transitions
        IncidentDto ack = incidentService.transitionStatus(inc.getId(), "ACKNOWLEDGED", "Acked", "admin", "127.0.0.1");
        assertEquals("ACKNOWLEDGED", ack.getStatus());

        // RCA (falls back cleanly if AI service offline)
        RootCauseAnalysis rca = rootCauseService.analyzeIncident(inc.getId(), "admin", "127.0.0.1");
        assertNotNull(rca.getId());
        assertNotNull(rca.getHypothesis());
        if ("DETERMINISTIC_FALLBACK".equals(rca.getAnalysisMethod())) {
            assertNull(rca.getConfidenceScore());
        }

        // Unsupported action must be rejected
        assertThrows(ApiException.class, () ->
                recoveryService.generateRecommendation(inc.getId(), "RM_RF_EVERYTHING", "admin", "127.0.0.1"));

        // Safe LOW risk recommendation + execution + independent verification
        RecoveryRecommendation rec = recoveryService.generateRecommendation(
                inc.getId(), "RUN_HEALTH_PROBE", "admin", "127.0.0.1");
        assertEquals("LOW", rec.getRiskLevel());
        assertFalse(rec.getApprovalRequired());

        RecoveryActionDto exec = recoveryService.executeRecommendation(rec.getId(), true, "admin", "127.0.0.1");
        assertNotNull(exec.getVerificationStatus());
        assertNotNull(exec.getVerificationEvidence());

        // High-risk recommendation requires Admin approval
        RecoveryRecommendation highRec = recoveryService.generateRecommendation(
                inc.getId(), "THROTTLE_OR_SCALE_SERVICE", "admin", "127.0.0.1");
        assertEquals("HIGH", highRec.getRiskLevel());
        assertTrue(highRec.getApprovalRequired());
        assertThrows(ApiException.class, () ->
                recoveryService.approveRecommendation(highRec.getId(), false, "operator", "127.0.0.1"));
    }
}
