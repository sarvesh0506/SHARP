package com.sharp.recovery;

import com.sharp.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

@Component
public class RecoveryPolicyEngine {

    public record ActionPolicy(
            String actionType,
            String actionName,
            String riskLevel,
            boolean approvalRequired,
            boolean autoExecutionPermitted,
            String policyRule,
            String expectedResult,
            String estimatedImpact
    ) {}

    private static final Map<String, ActionPolicy> ALLOWLIST = Map.of(
            "RUN_HEALTH_PROBE", new ActionPolicy(
                    "RUN_HEALTH_PROBE",
                    "Run Service & Host Health Probe",
                    "LOW",
                    false,
                    true,
                    "LOW_RISK_AUTO_PERMITTED",
                    "Confirms live host and application endpoint responsiveness",
                    "Zero downtime (read-only probe)"
            ),
            "COLLECT_DIAGNOSTIC_SNAPSHOT", new ActionPolicy(
                    "COLLECT_DIAGNOSTIC_SNAPSHOT",
                    "Collect Diagnostic Telemetry Snapshot",
                    "LOW",
                    false,
                    true,
                    "LOW_RISK_AUTO_PERMITTED",
                    "Captures fresh host, process, and resource telemetry for verification",
                    "Minimal CPU overhead (<1%)"
            ),
            "CLEAR_STALE_TELEMETRY_CACHE", new ActionPolicy(
                    "CLEAR_STALE_TELEMETRY_CACHE",
                    "Purge Expired Telemetry Buffers",
                    "LOW",
                    false,
                    true,
                    "LOW_RISK_AUTO_PERMITTED",
                    "Frees storage/memory consumed by expired telemetry snapshots",
                    "Zero service interruption"
            ),
            "RESTART_MONITORED_SERVICE", new ActionPolicy(
                    "RESTART_MONITORED_SERVICE",
                    "Restart Registered Application Component",
                    "MEDIUM",
                    true,
                    false,
                    "MEDIUM_RISK_APPROVAL_REQUIRED",
                    "Resets hung worker threads or memory leak state in registered service",
                    "Brief service restart window (5-15s)"
            ),
            "THROTTLE_OR_SCALE_SERVICE", new ActionPolicy(
                    "THROTTLE_OR_SCALE_SERVICE",
                    "Throttle or Scale Service Capacity",
                    "HIGH",
                    true,
                    false,
                    "HIGH_RISK_ADMIN_APPROVAL_REQUIRED",
                    "Reduces saturation by adjusting service concurrency/capacity policy",
                    "Capacity / throughput change (Admin approval required)"
            ),
            "MANUAL_INTERVENTION", new ActionPolicy(
                    "MANUAL_INTERVENTION",
                    "Manual Operator / Admin Remediation",
                    "CRITICAL",
                    true,
                    false,
                    "CRITICAL_RISK_MANUAL_ONLY",
                    "Requires direct engineering inspection and manual resolution",
                    "Manual-only — automated execution blocked"
            )
    );

    public Set<String> getAllowedActionTypes() {
        return ALLOWLIST.keySet();
    }

    public ActionPolicy validateAndGetPolicy(String actionType) {
        if (actionType == null || actionType.isBlank()) {
            throw new ApiException("Recovery action type is required", HttpStatus.BAD_REQUEST);
        }
        String normalized = actionType.trim().toUpperCase();
        ActionPolicy policy = ALLOWLIST.get(normalized);
        if (policy == null) {
            throw new ApiException(
                    "Unsupported or non-allowlisted recovery action: " + actionType +
                            ". Allowed actions: " + String.join(", ", ALLOWLIST.keySet()),
                    HttpStatus.BAD_REQUEST
            );
        }
        return policy;
    }

    public boolean requiresAdminApproval(String riskLevel) {
        return "HIGH".equalsIgnoreCase(riskLevel) || "CRITICAL".equalsIgnoreCase(riskLevel);
    }

    public boolean isManualOnly(String riskLevel) {
        return "CRITICAL".equalsIgnoreCase(riskLevel);
    }
}
