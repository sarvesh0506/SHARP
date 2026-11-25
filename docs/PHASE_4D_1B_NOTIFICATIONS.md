# SHARP — Phase 4D-1B: Persistent Notification Backend

**Status:** Implemented & Verified  
**Scope:** Backend-only persistent notification architecture (no frontend modifications)

---

## 1. Architecture & Database Design

- **`NotificationType` Enum:** `ANOMALY_DETECTED`, `INCIDENT_CREATED`, `INCIDENT_UPDATED`, `RECOVERY_APPROVAL_REQUIRED`, `RECOVERY_STARTED`, `RECOVERY_SUCCEEDED`, `RECOVERY_FAILED`, `INCIDENT_RESOLVED`, `SYSTEM_ALERT`.
- **`Notification` Entity (`notifications` table):**
  - Fields: `id`, `recipientUserId`, `type`, `severity`, `title`, `message`, `anomalyId`, `incidentId`, `recoveryExecutionId`, `dedupKey`, `isRead`, `readAt`, `createdAt`.
  - Indexes: `idx_notif_recipient_created (recipient_user_id, created_at)`, `idx_notif_recipient_read (recipient_user_id, is_read)`, `idx_notif_dedup (recipient_user_id, dedup_key, created_at)`.
- **`NotificationDto`:** Safe response contract without exposing internal `recipientUserId` or `dedupKey`.

---

## 2. Recipient Targeting Rules

| Event / Type | Target Recipients |
|---|---|
| `RECOVERY_APPROVAL_REQUIRED` | Active (`enabled = true`) `ROLE_ADMIN` users only |
| `ANOMALY_DETECTED` (`HIGH` / `CRITICAL`) | Active `ROLE_ADMIN` + `ROLE_OPERATOR` users |
| `INCIDENT_CREATED`, `INCIDENT_UPDATED`, `INCIDENT_RESOLVED` | Active `ROLE_ADMIN` + `ROLE_OPERATOR` users |
| `RECOVERY_STARTED`, `RECOVERY_SUCCEEDED`, `RECOVERY_FAILED` | Active `ROLE_ADMIN` + `ROLE_OPERATOR` users |
| `SYSTEM_ALERT` | Active `ROLE_ADMIN` + `ROLE_OPERATOR` users |

---

## 3. Lifecycle Integration & Failure Isolation

- **Integration Points:**
  - `AnomalyDetectionEngine`: fires on newly created `HIGH`/`CRITICAL` anomalies (not on ongoing updates).
  - `IncidentService`: fires on `createIncident`, `createOrAttachFromAnomaly` (new only), and `transitionStatus` (`INCIDENT_RESOLVED` / `INCIDENT_UPDATED`).
  - `RecoveryService`: fires on `RECOVERY_APPROVAL_REQUIRED`, `RECOVERY_STARTED`, `RECOVERY_SUCCEEDED`, and `RECOVERY_FAILED`.
- **Duplicate Prevention:** `dedupKey` checked over a 5-minute rolling window per recipient.
- **Non-Blocking Failure Isolation:** `NotificationService.notifySafe(...)` executes in `Propagation.REQUIRES_NEW` wrapped in `try/catch`, ensuring notification persistence errors never roll back or disrupt telemetry, detection, incidents, or recovery.

---

## 4. REST APIs & Ownership Security

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/notifications` | Paginated user notifications (`isRead`, `type`, `page`, `size`) |
| `GET` | `/api/v1/notifications/unread-count` | Unread count for authenticated user |
| `GET` | `/api/v1/notifications/{id}` | Retrieve single owned notification (`403` otherwise) |
| `PUT` | `/api/v1/notifications/{id}/read` | Mark single owned notification as read |
| `PUT` | `/api/v1/notifications/read-all` | Mark all notifications for authenticated user as read |
| `DELETE` | `/api/v1/notifications/{id}` | Delete single owned notification |
| `DELETE` | `/api/v1/notifications` | Delete all notifications for authenticated user only |

---

## 5. WebSocket Compatibility

- `EventBroadcastService.publishToUser(username, "NOTIFICATION_CREATED", dto)` publishes private notifications to `/user/{username}/queue/notifications` rather than the global `/topic/events` broadcast.

---

## 6. Known Limitations

- Per-user notification channel preferences (e.g., email/Slack/mute toggles) are not yet implemented.
- Frontend Notification Bell and WebSocket subscription will be implemented in Phase 4D-2.
