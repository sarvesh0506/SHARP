# SHARP — Phase 4D-1C: Backend Reliability & Data Integrity

**Status:** Implemented & Verified  
**Phase:** 4D-1C (Backend Reliability & Data Integrity)  
**Scope:** Backend (`backend/`) only — no frontend, AI service, or Git history modifications.

---

## 1. Audit Findings & Root Causes

### 1.1 Dashboard MTTR & Summary Metrics (`DashboardService`, `DashboardSummaryDto`)
- **Finding 1 (Fabricated MTTR fallback):** `DashboardService.getSummary()` contained `.orElse(24.5); // Baseline demo metric`, returning a fabricated `24.5` seconds whenever no completed recovery actions existed.
- **Finding 2 (Wrong MTTR data source):** `avgRecoveryTimeSeconds` previously averaged `RecoveryAction.initiatedAt -> RecoveryAction.completedAt` (which only measured action execution time and even included `REJECTED` actions) rather than actual incident Mean Time To Resolve (`Incident.openedAt -> Incident.resolvedAt`). Furthermore, `DashboardSummaryDto.avgRecoveryTimeSeconds` was a primitive `double`, preventing `null` (unavailable) from being returned.
- **Finding 3 (Fabricated recovery success rate & status mismatch):** `recoverySuccessRate` defaulted to `100.0` when `totalActions == 0`, and checked `"SUCCESS"` / `"VERIFIED_SUCCESS"` even though `RecoveryService` records `"VERIFIED"` for both `status` and `verificationStatus`.
- **Finding 4 (Active incidents & unbounded payload):** `activeIncidents` used `countByStatusNot("RESOLVED")` (counting `"CLOSED"` incidents as active), and `recentIncidents` loaded all incidents instead of a bounded top-10 list.

### 1.2 Monitoring History (`MonitoringController.getSystemHistory`, `SystemMetricRepository`)
- **Finding 5 (Oldest records returned instead of newest):** `getSystemHistory` called `systemMetricRepository.findByCollectedAtBetweenOrderByCollectedAtAsc(fromTime, toTime, PageRequest.of(0, safeLimit))`. When more than `safeLimit` rows existed in the `[fromTime, toTime]` window, ascending pagination returned the *oldest* `safeLimit` records and truncated the newest telemetry.
- **Finding 6 (Missing input validation):** Invalid ISO-8601 `from`/`to` timestamps threw `DateTimeParseException` (resulting in HTTP `500` via `GlobalExceptionHandler`), `limit < 1` was silently clamped instead of rejected, and `from > to` was not validated.

### 1.3 Recovery Workflow Reliability (`RecoveryService`, `RecoveryController`, `RecoveryActionRepository`)
- **Finding 7 (Approval path bypassed concurrent execution check):** `RecoveryService.approveRecovery` called `executeAndVerifyExisting` directly without checking whether another recovery action was already `EXECUTING` or `VERIFYING` for the same incident.
- **Finding 8 (Unbounded scan & race window):** `executeAndVerify` scanned `recoveryActionRepository.findAll()` in memory and had no per-incident synchronization lock to prevent two concurrent requests from both passing the check before persisting `EXECUTING`.
- **Finding 9 (Rejected actions/recommendations left incident stuck):** `rejectRecovery`, `rejectRecommendation`, and `cancelRecommendation` did not update the linked `Incident` when it was in `RECOVERY_PENDING` / `PENDING_APPROVAL` / `RECOMMENDED`.
- **Finding 10 (NPE risks in `RecoveryService` & `RecoveryController`):** `getAllActions()` sorted by `initiatedAt` without null-safety, and `RecoveryController.triggerRecovery` called `.toString()` on `body.get("incidentId")` and `body.get("actionType")` without null/numeric checks.

---

## 2. Implemented Fixes

### 2.1 Dashboard MTTR Methodology (`DashboardService`, `DashboardSummaryDto`, `IncidentRepository`)
- Changed `DashboardSummaryDto.avgRecoveryTimeSeconds` and `recoverySuccessRate` from primitive `double` to nullable `Double`.
- Added `IncidentRepository.findByStatusIn(List<String> statuses)` and `countByStatusNotIn(List<String> statuses)`.
- **MTTR Calculation:**
  - Queries resolved incidents (`status` in `["RESOLVED", "CLOSED"]`).
  - Filters to records with non-null `openedAt` and `resolvedAt` where `!resolvedAt.isBefore(openedAt)`.
  - Computes mean resolution duration in seconds using `Duration.between(openedAt, resolvedAt).toMillis() / 1000.0`, rounded to 1 decimal place.
  - Returns `null` when zero valid resolved incidents exist (never fabricated).
- Updated `successfulActions` to count `"VERIFIED"` (`status` or `verificationStatus`) as well as `"SUCCESS"`, returning `null` when `totalActions == 0`.
- Bounded `recentIncidents` to `incidentRepository.findTop10ByOrderByOpenedAtDesc()`.

### 2.2 Monitoring History (`MonitoringController`, `SystemMetricRepository`, `GlobalExceptionHandler`)
- Added `SystemMetricRepository.findByCollectedAtBetweenOrderByCollectedAtDescIdDesc(Instant from, Instant to, Pageable pageable)`.
- `getSystemHistory` now:
  - Rejects `limit < 1` with `400 Bad Request` and caps `limit` at `500`.
  - Validates `from <= to` (`400 Bad Request` otherwise).
  - Fetches the newest `safeLimit` records descending, reverses them into chronological order (`ASC`), and collapses duplicate `collectedAt` timestamps while keeping the latest record.
- Added `@ExceptionHandler` for `DateTimeParseException` and `MethodArgumentTypeMismatchException` in `GlobalExceptionHandler` returning `400 Bad Request`.

### 2.3 Recovery Pipeline Reliability (`RecoveryService`, `RecoveryActionRepository`, `RecoveryController`)
- Added `findAllByOrderByInitiatedAtDesc()` and `existsByIncidentIdAndStatusIn(Long incidentId, List<String> statuses)` to `RecoveryActionRepository`.
- Added per-incident synchronization (`ConcurrentHashMap<Long, Object>`) + `existsByIncidentIdAndStatusIn` check in both `executeAndVerify` and `approveRecovery`, returning `409 Conflict` if `EXECUTING` or `VERIFYING` is already active for that incident.
- Updated `rejectRecovery`, `rejectRecommendation`, and `cancelRecommendation` to transition waiting `Incident.recoveryStatus` (and `RECOVERY_PENDING` status) out of pending approval.
- Added null/numeric payload validation in `RecoveryController.triggerRecovery` (`400 Bad Request`).

---

## 3. Tests Executed & Exact Results

Command executed in `backend/`:
```powershell
mvn test
```

Test suites run:
- `BackendReliabilityTests` (11 tests): MTTR calculation, zero resolved incidents (`null`), missing/negative timestamps, persisted summary MTTR, monitoring history newest-chronological ordering, empty/small/duplicate history, limit & timestamp validation, concurrent execution conflict (`409`), failed execution not resolving incident, rejection updating incident state, and trigger payload validation.
- `SelfHealingPipelineTests`
- `TelemetryInfrastructureTests`
- `UserManagementTests` (4 tests)
- `NotificationTests`
- `SharpApplicationTests`

**Exact Result:**
- `Tests run: 26, Failures: 0, Errors: 0, Skipped: 0`
- `BUILD SUCCESS` (`Total time: 21.200 s`)

---

## 4. Known Limitations
- The per-incident execution lock (`ConcurrentHashMap<Long, Object>`) protects against concurrent recovery execution within a single JVM instance; multi-instance horizontal scaling would require a database-level pessimistic lock or distributed lock.
- Verification (`VerificationService`) still depends on live host telemetry and optional Python AI service availability; if host CPU/memory remains above configured thresholds, recovery verification accurately reports `FAILED` or `PARTIALLY_RECOVERED` and keeps the incident open.
