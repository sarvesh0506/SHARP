# SHARP — Phase 4C: AI Anomaly Detection, Root Cause Analysis & Controlled Self-Healing

**Status:** Implemented & Verified  
**Orchestrator:** Spring Boot 3.2.11 (`com.sharp`)  
**Optional AI Service:** Python FastAPI (`ai-service` on port `8000`)

---

## 1. End-to-End Self-Healing Pipeline

```
TelemetryCollectionService (OSHI real host + Windows process sampling)
        │
        ▼
AnomalyDetectionEngine (Rule-based + Statistical Z-score + Optional AI Detection)
        │  [Deduplicated per (resourceName, metricName) + Cooldown]
        ▼
IncidentService (Auto-creates OPEN incident for eligible anomalies; prevents duplicates)
        │
        ▼
RootCauseService (AI Diagnosis Agent OR clearly labeled DETERMINISTIC_FALLBACK)
        │
        ▼
RecoveryPolicyEngine + RecoveryService (Allowlisted actions + Risk/Admin Approval Gate)
        │
        ▼
SafeActionExecutor (Controlled, non-shell allowlisted actions)
        │
        ▼
VerificationService (Collects fresh telemetry, verifies thresholds cleared; keeps incident OPEN if failed)
```

---

## 2. AI Service Integration & Fallback

- **Client:** [AiServiceClient.java](file:///c:/Users/sarve/OneDrive/Desktop/Project%20SHARP/backend/src/main/java/com/sharp/ai/AiServiceClient.java)
- **Configuration (`sharp.ai.*` in `application.yml`):**
  - `enabled` (`true`), `base-url` (`http://localhost:8000`), `connection-timeout-ms` (`3000`), `response-timeout-ms` (`10000`), `max-retries` (`1`).
- **Circuit Breaker:** If the AI service fails, the circuit opens for `30s` so telemetry collection is never blocked. Correlation IDs (`X-Correlation-ID`) are attached to every request.
- **Honest Labeling:** Rule-based/statistical detections use `RULE_BASED` / `STATISTICAL` with `confidenceScore = null`. Fallback RCA uses `DETERMINISTIC_FALLBACK` with `confidenceScore = null`.

---

## 3. Supported Allowlisted Recovery Actions & Policy

| Action Type | Risk Level | Approval Policy | Safe Executor Behavior |
|---|---|---|---|
| `RUN_HEALTH_PROBE` | `LOW` | Auto-permitted | Triggers fresh host telemetry & health probe |
| `COLLECT_DIAGNOSTIC_SNAPSHOT` | `LOW` | Auto-permitted | Captures fresh host + top-100 process snapshot |
| `CLEAR_STALE_TELEMETRY_CACHE` | `LOW` | Auto-permitted | Purges expired (>6h) telemetry rows |
| `RESTART_MONITORED_SERVICE` | `MEDIUM` | Approval required | Controlled restart counter/status on registered `ApplicationEntity` |
| `THROTTLE_OR_SCALE_SERVICE` | `HIGH` | `ROLE_ADMIN` required | Applies approved capacity/throttling marker |
| `MANUAL_INTERVENTION` | `CRITICAL` | Manual-only | Automated execution blocked |

---

## 4. APIs Implemented

- **Anomalies (`/api/v1/anomalies`):** `GET /`, `GET /{id}`, `POST /{id}/acknowledge`, `POST /{id}/resolve`, `POST /{id}/suppress`
- **Incidents (`/api/v1/incidents`):** `GET /`, `GET /active`, `GET /{id}`, `POST /`, `POST /{id}/acknowledge`, `POST /{id}/investigate`, `POST /{id}/resolve`, `POST /{id}/reopen`, `POST /{id}/close`
- **RCA (`/api/v1/rca`):** `GET /incident/{incidentId}`, `POST /incident/{incidentId}/analyze`
- **Recovery (`/api/v1/recovery`):** `GET /recommendations`, `POST /recommendations/incident/{incidentId}`, `POST /recommendations/{id}/approve`, `POST /recommendations/{id}/reject`, `POST /recommendations/{id}/execute`, `POST /recommendations/{id}/cancel`, `GET /executions`, `GET /executions/{id}`, plus `/trigger`, `/{id}/approve`, `/{id}/reject`
- **Agents (`/api/v1/agents/status`):** Live AI service reachability + backend orchestrator engine statuses.
- **WebSocket Broadcasts:** `EventBroadcastService` publishes `ANOMALY_DETECTED`, `INCIDENT_CREATED`, `INCIDENT_STATUS_CHANGED`, `RCA_COMPLETED`, `RECOVERY_RECOMMENDED`, `RECOVERY_APPROVED`, `RECOVERY_VERIFIED`, and `RECOVERY_FAILED` to STOMP `/topic/events`.
