package com.sharp.service;

import com.sharp.ai.AiServiceClient;
import com.sharp.entity.AnomalyEvent;
import com.sharp.entity.Incident;
import com.sharp.entity.ProcessMetric;
import com.sharp.entity.RootCauseAnalysis;
import com.sharp.entity.SystemMetric;
import com.sharp.exception.ResourceNotFoundException;
import com.sharp.repository.AnomalyEventRepository;
import com.sharp.repository.IncidentRepository;
import com.sharp.repository.ProcessMetricRepository;
import com.sharp.repository.RootCauseAnalysisRepository;
import com.sharp.repository.SystemMetricRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RootCauseService {

    private final IncidentRepository incidentRepository;
    private final AnomalyEventRepository anomalyEventRepository;
    private final SystemMetricRepository systemMetricRepository;
    private final ProcessMetricRepository processMetricRepository;
    private final RootCauseAnalysisRepository rcaRepository;
    private final AiServiceClient aiServiceClient;
    private final AuditService auditService;
    private final EventBroadcastService eventBroadcastService;

    @Transactional(readOnly = true)
    public List<RootCauseAnalysis> getAnalysesForIncident(Long incidentId) {
        return rcaRepository.findByIncidentIdOrderByCreatedAtDesc(incidentId);
    }

    @Transactional
    public RootCauseAnalysis analyzeIncident(Long incidentId, String triggeredBy, String ip) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", incidentId));

        SystemMetric latestSys = systemMetricRepository.findTopByOrderByCollectedAtDesc().orElse(null);
        List<AnomalyEvent> linkedAnomalies = anomalyEventRepository.findByIncidentId(incidentId);
        List<ProcessMetric> topProcesses = processMetricRepository.findTopByOrderByCollectedAtDesc()
                .map(p -> processMetricRepository.findByCollectedAt(p.getCollectedAt()))
                .orElse(Collections.emptyList());

        double cpu = latestSys != null && latestSys.getCpuPercent() != null ? latestSys.getCpuPercent() : 0.0;
        double mem = latestSys != null && latestSys.getMemoryPercent() != null ? latestSys.getMemoryPercent() : 0.0;

        List<String> evidenceLines = new ArrayList<>();
        if (latestSys != null) {
            evidenceLines.add(String.format("Host=%s CPU=%.1f%% Memory=%.1f%% Disk=%.1f%%",
                    latestSys.getHostName(), cpu, mem,
                    latestSys.getDiskPercent() != null ? latestSys.getDiskPercent() : 0.0));
        }
        for (AnomalyEvent a : linkedAnomalies) {
            evidenceLines.add(String.format("Anomaly #%d [%s/%s]: %s = %.2f (%s)",
                    a.getId(), a.getSeverity(), a.getDetectionMethod(), a.getMetricName(), a.getObservedValue(), a.getDescription()));
        }
        String topProcSummary = topProcesses.stream()
                .sorted(Comparator.comparingDouble((ProcessMetric p) -> p.getCpuPercent() != null ? p.getCpuPercent() : 0.0).reversed())
                .limit(3)
                .map(p -> String.format("%s(PID %d: CPU %.1f%%, Mem %.1f MB)",
                        p.getProcessName(), p.getPid(),
                        p.getCpuPercent() != null ? p.getCpuPercent() : 0.0,
                        p.getMemoryBytes() != null ? p.getMemoryBytes() / (1024.0 * 1024.0) : 0.0))
                .collect(Collectors.joining("; "));
        if (!topProcSummary.isBlank()) {
            evidenceLines.add("Top Processes: " + topProcSummary);
        }

        // Try Python AI Diagnosis Agent first
        Optional<Map<String, Object>> aiResult = aiServiceClient.diagnoseIncident(
                incident.getId(),
                incident.getAffectedResource() != null ? incident.getAffectedResource() : "windows-host",
                cpu, mem, evidenceLines);

        RootCauseAnalysis rca;
        if (aiResult.isPresent()) {
            Map<String, Object> body = aiResult.get();
            String hypothesis = String.valueOf(body.getOrDefault("likely_root_cause", "AI analysis completed"));
            Double confidence = body.get("confidence") instanceof Number n ? n.doubleValue() : null;
            String strategy = mapStrategyToAllowedAction(String.valueOf(body.getOrDefault("recommended_strategy", "RUN_HEALTH_PROBE")));

            rca = RootCauseAnalysis.builder()
                    .incidentId(incidentId)
                    .anomalyId(incident.getAnomalyId())
                    .analysisMethod("AI_ANALYSIS")
                    .status("COMPLETED")
                    .hypothesis(hypothesis)
                    .supportingEvidence(String.join("\n", evidenceLines))
                    .contributingFactors("Correlated host telemetry, active anomalies, and process metrics")
                    .affectedComponents(incident.getAffectedResource() != null ? incident.getAffectedResource() : "Host System")
                    .recommendedInvestigation("Verify affected service health and review process/resource metrics.")
                    .recommendedActionType(strategy)
                    .confidenceScore(confidence)
                    .analyzedBy(triggeredBy)
                    .createdAt(Instant.now())
                    .build();
            incident.setRcaStatus("COMPLETED");
        } else {
            // Deterministic fallback — clearly labeled, never presented as AI
            String hypothesis = buildDeterministicHypothesis(incident, linkedAnomalies, latestSys, topProcSummary);
            String recommended = determineDeterministicAction(incident, linkedAnomalies, cpu, mem);

            rca = RootCauseAnalysis.builder()
                    .incidentId(incidentId)
                    .anomalyId(incident.getAnomalyId())
                    .analysisMethod("DETERMINISTIC_FALLBACK")
                    .status("COMPLETED")
                    .hypothesis(hypothesis)
                    .supportingEvidence(evidenceLines.isEmpty() ? "No telemetry snapshot available" : String.join("\n", evidenceLines))
                    .contributingFactors("AI service unavailable; evaluated deterministic metric & process rules")
                    .affectedComponents(incident.getAffectedResource() != null ? incident.getAffectedResource() : "Host System")
                    .recommendedInvestigation("Inspect host telemetry, top processes, and service endpoints manually.")
                    .recommendedActionType(recommended)
                    .confidenceScore(null) // Never invent AI confidence for deterministic fallback
                    .analyzedBy(triggeredBy)
                    .createdAt(Instant.now())
                    .build();
            incident.setRcaStatus("FALLBACK_COMPLETED");
        }

        rca = rcaRepository.save(rca);
        incident.setRootCause("[" + rca.getAnalysisMethod() + "] " + rca.getHypothesis());
        incident.setUpdatedAt(Instant.now());
        incidentRepository.save(incident);

        auditService.record(triggeredBy, "RCA_COMPLETED", "INCIDENT", incidentId.toString(),
                "Root cause analysis (" + rca.getAnalysisMethod() + ") completed", ip);
        eventBroadcastService.publish("RCA_COMPLETED", rca);
        return rca;
    }

    private String buildDeterministicHypothesis(Incident incident, List<AnomalyEvent> anomalies, SystemMetric sys, String topProcs) {
        String text = (incident.getTitle() + " " + (incident.getDescription() != null ? incident.getDescription() : "")).toLowerCase();
        if (text.contains("cpu") || (sys != null && sys.getCpuPercent() != null && sys.getCpuPercent() >= 75.0)) {
            return "Deterministic rule analysis: Elevated host/process CPU utilization detected. Top processes: " +
                    (topProcs.isBlank() ? "unavailable" : topProcs);
        }
        if (text.contains("memory") || (sys != null && sys.getMemoryPercent() != null && sys.getMemoryPercent() >= 80.0)) {
            return "Deterministic rule analysis: High physical memory pressure detected. Top memory consumers: " +
                    (topProcs.isBlank() ? "unavailable" : topProcs);
        }
        if (text.contains("disk") || (sys != null && sys.getDiskPercent() != null && sys.getDiskPercent() >= 85.0)) {
            return "Deterministic rule analysis: High disk capacity utilization detected on host storage.";
        }
        return "Deterministic rule analysis: Fault condition observed on " +
                (incident.getAffectedResource() != null ? incident.getAffectedResource() : "monitored resource") +
                " (" + anomalies.size() + " linked anomalies).";
    }

    private String determineDeterministicAction(Incident incident, List<AnomalyEvent> anomalies, double cpu, double mem) {
        if (mem >= 92.0 || cpu >= 90.0) {
            return incident.getApplication() != null ? "RESTART_MONITORED_SERVICE" : "COLLECT_DIAGNOSTIC_SNAPSHOT";
        }
        if (anomalies.stream().anyMatch(a -> "DISK_PERCENT".equals(a.getMetricName()))) {
            return "CLEAR_STALE_TELEMETRY_CACHE";
        }
        return "RUN_HEALTH_PROBE";
    }

    private String mapStrategyToAllowedAction(String strategy) {
        if (strategy == null) return "RUN_HEALTH_PROBE";
        String s = strategy.toUpperCase();
        if (s.contains("RESTART")) return "RESTART_MONITORED_SERVICE";
        if (s.contains("CACHE") || s.contains("CLEAR")) return "CLEAR_STALE_TELEMETRY_CACHE";
        if (s.contains("SCALE") || s.contains("THROTTLE")) return "THROTTLE_OR_SCALE_SERVICE";
        return "RUN_HEALTH_PROBE";
    }
}
