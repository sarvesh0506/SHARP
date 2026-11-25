# SHARP — Frontend Functional Audit Report

**Audit Date:** 2026-11-25  
**Scope:** All 17 frontend pages, shared layout/UI components, API client layer, authentication context, mock/demo data inventory, security posture, and UX/responsiveness.  
**Methodology:** Static code inspection of `frontend/src/**` and `backend/src/main/java/com/sharp/controller/*.java`, cross-referenced with live Vite build (`tsc && vite build`) and auth endpoint verification (`POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `GET /api/v1/auth/me`, `GET /api/v1/dashboard/summary`).

---

## 1. Executive Summary

The SHARP frontend is visually complete, builds cleanly with zero TypeScript errors (`2094` Vite modules), and has working JWT authentication, RBAC guards, and CRUD integration for core Phase 1 Spring Boot entities (`applications`, `servers`, `incidents`, `recovery`, `audit`, `dashboard/summary`).

However, **6 operational areas remain partially integrated or UI-only** because the Phase 2 backend telemetry, WebSocket broadcasting, AI orchestration, and configuration endpoints are not yet implemented:
1. **Live Host/Process/Docker Metrics** (`SystemMonitoringPage`, `ProcessMonitoringPage`, `DockerMonitoringPage`, `DashboardPage` timeline) rely on `DEMO` datasets or static registry snapshots.
2. **AI Agent Status & Header Indicators** (`AgentsPage`, `Navbar`) display hardcoded `"ACTIVE"` / `"ONLINE"` badges rather than live health/agent checks.
3. **System Settings Persistence** (`SettingsPage`) validates inputs locally with no backend `GET/PUT /api/v1/config` API.
4. **Native Browser Dialogs & Missing Edit/Error States** (`ApplicationsPage`, `ServersPage`, `IncidentsPage`) use `alert()`, `prompt()`, and `window.confirm()`, and `PUT /api/v1/applications/{id}` is unused in the UI.
5. **Security Hardening** is needed around public `ROLE_ADMIN` self-registration, `localStorage` JWT storage, and client-side token expiry checking.

---

## 2. Page-by-Page Audit

| # | Page | File | Integration Status | Working Features | Broken / Missing / Mock | Priority |
|---|---|---|---|---|---|---|
| 1 | **Login** | `pages/LoginPage.tsx` | **Fully Functional** | `POST /api/v1/auth/login`, Show/Hide password, loading/error states, redirect to `/`, verified HTTP 200 & 401 | None (no Forgot Password / Remember Me — not supported by backend) | P3 |
| 2 | **Registration** | `pages/RegisterPage.tsx` | **Fully Functional** | `POST /api/v1/auth/register`, field-level validation display, backend offline detection, Show/Hide password | Public `ROLE_ADMIN` selection allowed (security finding) | P1 |
| 3 | **Dashboard** | `pages/DashboardPage.tsx` | **Partially Functional** | Live `GET /dashboard/summary` & `GET /recovery`, 15s polling, KPI cards, availability bar chart, recent incidents & recoveries | `DEMO_TIMELINE` hardcoded; `timeWindow` (`15m`/`1h`/`24h`) only updates title, not data; Network Activity marked `AWAITING PHASE 2` | P1 |
| 4 | **System Monitoring** | `pages/SystemMonitoringPage.tsx` | **Partially Functional** | Live `GET /servers`, server selection, live CPU/Mem/Disk bars from `MonitoredServer` | `DEMO_HISTORY` uses `Math.sin`/`Math.random()`; Network I/O placeholder (`AWAITING PHASE 2`) | P1 |
| 5 | **Docker Containers** | `pages/DockerMonitoringPage.tsx` | **Partially Functional** | Live `GET /applications` filtered by Docker fields, status filter pills, detail panel | Live container stats (Net I/O, Block I/O, PIDs) unavailable (`AWAITING PHASE 2`) | P2 |
| 6 | **Windows Processes** | `pages/ProcessMonitoringPage.tsx` | **UI-Only (Demo)** | Search by name/PID, multi-column sorting | Uses hardcoded `DEMO_PROCESSES`; **bug:** `DEMO_PROCESSES.sort(...)` mutates array during render (line 73); no backend endpoint | P1 |
| 7 | **Applications** | `pages/ApplicationsPage.tsx` | **Partially Functional** | `GET /applications`, `POST /applications`, `DELETE /applications/{id}` (admin-only) | Uses `alert()`/`confirm()`; no `GET` error banner; unused `PUT /applications/{id}` edit UI | P2 |
| 8 | **Infrastructure** | `pages/ServersPage.tsx` | **Partially Functional** | `GET /servers`, `POST /servers` modal | Uses `alert()`; no `GET` error banner; no Delete/Edit UI; no backend `DELETE /servers/{id}` | P2 |
| 9 | **Incidents** | `pages/IncidentsPage.tsx` | **Functional** | `GET /incidents`, `GET /recovery`, `POST /recovery/{id}/approve`, `reject`, `POST /incidents/{id}/resolve` | Uses `alert()` and `prompt()`; no error banner on initial fetch failure | P2 |
| 10 | **Fault Detection** | `pages/FaultDetectionPage.tsx` | **Partially Functional** | Live `GET /incidents` + `/applications`, search, severity/status/service/date filters, deep-link to RCA | Confidence shows `N/A (Phase 2)`; fault category inferred via client-side keyword matching | P2 |
| 11 | **Root Cause Analysis** | `pages/RootCauseAnalysisPage.tsx` | **Partially Functional** | Reads live incident `rootCause` & `evidence` JSON, parses incident metrics if present, links to Recovery | Recommended action uses client-side string heuristics if no `RecoveryAction` attached; no live trigger to `/diagnosis/analyze` | P2 |
| 12 | **Recovery Management** | `pages/RecoveryManagementPage.tsx` | **Functional** | `GET /recovery`, `GET /incidents`, `POST /recovery/trigger`, admin `approve`/`reject` with inline reason input | Policy list (`ALLOWLISTED_ACTIONS`) is hardcoded in frontend; no auto-trigger AI planning endpoint | P2 |
| 13 | **Recovery History** | `pages/RecoveryHistoryPage.tsx` | **Functional** | `GET /recovery`, search, status filter, MTTR & outcome KPIs | No pagination for large ledgers | P3 |
| 14 | **AI Agents** | `pages/AgentsPage.tsx` | **UI-Only (Static)** | Displays 7 agent cards, responsibilities, and safety bounds | Hardcoded `agents` array (`status: 'ACTIVE'`); does NOT call `/api/v1/agents/status` | P1 |
| 15 | **Analytics** | `pages/AnalyticsPage.tsx` | **Partially Functional** | Live `/incidents`, `/recovery`, `/applications`, date range filter, real MTTR/availability/severity pie/trend charts | Resource utilization trend chart marked `AWAITING PHASE 2` | P2 |
| 16 | **Audit Trail** | `pages/AuditPage.tsx` | **Functional** | Live `GET /audit`, search + date range filters | No `DELETE`/export or pagination; no error retry verified until backend failure | P3 |
| 17 | **Settings** | `pages/SettingsPage.tsx` | **UI-Only** | Client-side validation (warning < critical, poll interval 1–300s), `ROLE_ADMIN` disabled states | No backend `GET/PUT /api/v1/config` persistence | P2 |

---

## 3. Shared Components & Core Infrastructure Audit

- **`api/client.ts`**: Axios instance with `baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'`, attaches `Authorization: Bearer <token>`, redirects to `/login` on `401`.
- **`contexts/AuthContext.tsx`**: Persists `sharp_jwt_token` and `sharp_user` in `localStorage`. Does not validate JWT `exp` claim on startup.
- **`components/layout/AppLayout.tsx`**: Protects all app routes via `isAuthenticated` check; full-width responsive `<main>` (`w-full max-w-none min-w-0`).
- **`components/layout/Navbar.tsx`**: **Mock indicator** — `Engine: ONLINE` and `AI Agents: 7 ACTIVE` are static JSX, not fetched from `/api/v1/health` or AI service.
- **`components/layout/Sidebar.tsx`**: Collapsible (`w-64` / `w-16`), grouped navigation, user profile & logout footer. Lacks mobile slide-over drawer on `< 640px` viewports.
- **`components/ui/*`**: `SharpLogo`, `StatCard`, `StatusBadge`, `MetricBar`, `PageHeader`, `EmptyState`, `Banners` are clean, reusable, and consistent.

---

## 4. API Integration Matrix

### 4.1 Frontend → Backend Endpoints

| Page | Endpoint | Method | Backend Controller | Status | Notes |
|---|---|---|---|---|---|
| Login | `/api/v1/auth/login` | `POST` | `AuthController` | **Integrated & Verified** | Returns `AuthResponse` with JWT |
| Register | `/api/v1/auth/register` | `POST` | `AuthController` | **Integrated & Verified** | Returns `AuthResponse` with JWT |
| Dashboard | `/api/v1/dashboard/summary` | `GET` | `DashboardController` | **Integrated & Verified** | Polled every 15s |
| Dashboard / Recovery Mgmt / History / Incidents / RCA / Analytics | `/api/v1/recovery` | `GET` | `RecoveryController` | **Integrated** | Full list of recovery actions |
| Recovery Mgmt | `/api/v1/recovery/trigger` | `POST` | `RecoveryController` | **Integrated** | Sends `{ incidentId, actionType, riskLevel }` |
| Recovery Mgmt / Incidents | `/api/v1/recovery/{id}/approve` | `POST` | `RecoveryController` | **Integrated** | `ROLE_ADMIN` enforced |
| Recovery Mgmt / Incidents | `/api/v1/recovery/{id}/reject` | `POST` | `RecoveryController` | **Integrated** | `ROLE_ADMIN` enforced |
| Applications / Docker / Fault Detection / Analytics | `/api/v1/applications` | `GET` | `ApplicationController` | **Integrated** | Used across 4 pages |
| Applications | `/api/v1/applications` | `POST` | `ApplicationController` | **Integrated** | Registers new app |
| Applications | `/api/v1/applications/{id}` | `DELETE` | `ApplicationController` | **Integrated** | `ROLE_ADMIN` only |
| Servers / System Monitoring | `/api/v1/servers` | `GET` | `ServerController` | **Integrated** | Returns `MonitoredServer[]` |
| Servers | `/api/v1/servers` | `POST` | `ServerController` | **Integrated** | Registers host node |
| Incidents / Fault Detection / RCA / Recovery / Analytics | `/api/v1/incidents` | `GET` | `IncidentController` | **Integrated** | Returns `Incident[]` |
| Incidents | `/api/v1/incidents/{id}/resolve` | `POST` | `IncidentController` | **Integrated** | Sends `{ resolutionNotes }` |
| Audit Trail | `/api/v1/audit` | `GET` | `AuditController` | **Integrated** | Returns `AuditLog[]` |

### 4.2 Existing Backend Endpoints NOT Used by Frontend

| Endpoint | Controller | Notes |
|---|---|---|
| `GET /api/v1/health` | `HealthController` | Not called by `Navbar.tsx` (`Engine: ONLINE` is static) |
| `GET /api/v1/auth/me` | `AuthController` | Never called by `AuthContext` to re-validate session on reload |
| `PUT /api/v1/applications/{id}` | `ApplicationController` | No Edit Application modal/action in `ApplicationsPage.tsx` |
| `GET /api/v1/applications/{id}` | `ApplicationController` | Unused |
| `GET /api/v1/servers/{id}` | `ServerController` | Unused |
| `GET /api/v1/incidents/active` | `IncidentController` | Unused (frontend filters `/incidents` client-side) |
| `POST /api/v1/incidents` | `IncidentController` | No manual "Report Incident" form in UI |
| `GET /api/v1/recovery/{id}` | `RecoveryController` | Unused |

---

## 5. Mock & Demo Data Inventory

| Location | Identifier / Element | Description | Necessary for Dev? |
|---|---|---|---|
| `pages/DashboardPage.tsx:33` | `DEMO_TIMELINE` | 7 static CPU/Memory data points; `timeWindow` buttons do not fetch data | Temporary until Phase 2 `system_metrics` |
| `pages/SystemMonitoringPage.tsx:21` | `DEMO_HISTORY` | 20 generated points using `Math.sin`/`Math.cos`/`Math.random()` | Temporary until Phase 2 `system_metrics` |
| `pages/ProcessMonitoringPage.tsx:8` | `DEMO_PROCESSES` | 10 static Windows processes | Temporary until Phase 2 `ProcessMetricsCollector` |
| `pages/AgentsPage.tsx:28` | `agents` array | Hardcoded list of 7 agents all marked `ACTIVE` | Replace with AI service `/api/v1/agents/status` |
| `components/layout/Navbar.tsx:31-42` | `Engine: ONLINE`, `AI Agents: 7 ACTIVE` | Hardcoded status pills | Replace with `/api/v1/health` polling |
| `pages/RecoveryManagementPage.tsx:22` | `ALLOWLISTED_ACTIONS` | Hardcoded list of 4 recovery policy options | Replace with `/api/v1/recovery/policies` in Phase 2 |

---

## 6. Broken or Nonfunctional Elements

1. **In-place array mutation in `ProcessMonitoringPage.tsx:73`:** `DEMO_PROCESSES.sort(...)` mutates the module-level constant during JSX render, causing `DEMO_PROCESSES[0]` on line 74 to depend on render order.
2. **Non-functional time filter in `DashboardPage.tsx:120-130`:** Clicking `15m`, `1h`, or `24h` updates the chart header text, but `DEMO_TIMELINE` does not change.
3. **Navbar live status pills (`Navbar.tsx`):** Always show `ONLINE` and `7 ACTIVE` even when backend or AI service is down.
4. **Native browser dialogs (`ApplicationsPage.tsx`, `ServersPage.tsx`, `IncidentsPage.tsx`):** `alert()`, `prompt()`, and `window.confirm()` block the thread and break enterprise dark UI consistency.
5. **Missing error states on initial fetch:** `ApplicationsPage.tsx`, `ServersPage.tsx`, `IncidentsPage.tsx`, and `AgentsPage.tsx` log fetch errors only to `console.error` with no visible `ErrorBanner`.

---

## 7. Security Findings

| Severity | Finding | Location | Recommendation |
|---|---|---|---|
| **High** | Public self-registration accepts `ROLE_ADMIN` without restriction or bootstrap check | `RegisterPage.tsx`, `AuthController` / `AuthService` | Restrict public registration to `ROLE_OPERATOR` (after first admin exists) or require an admin invite/bootstrap token |
| **Medium** | JWT stored in `localStorage` (`sharp_jwt_token`) | `AuthContext.tsx`, `client.ts` | Acceptable for academic/SPA demo with strict XSS hygiene, or migrate to `HttpOnly` cookies in production |
| **Low** | Expired JWT in `localStorage` is not checked on initial load | `AuthContext.tsx` | Decode JWT `exp` on mount (or call `GET /api/v1/auth/me`) so expired sessions clear immediately |

---

## 8. UX & Responsiveness Findings

1. **Mobile Sidebar Layout (`Sidebar.tsx`):** On narrow mobile screens (`< 640px`), the sidebar stays inline (`w-64` or `w-16`) rather than collapsing into an overlay drawer, squeezing `<main>` on phones.
2. **Missing Pagination:** `AuditPage`, `RecoveryHistoryPage`, `FaultDetectionPage`, and `ProcessMonitoringPage` render all rows at once without pagination.
3. **No Toast / Confirmation Modals:** Phase 1 pages (`ApplicationsPage`, `ServersPage`, `IncidentsPage`) still use browser `alert`/`prompt`/`confirm`.
4. **Bundle Chunk Size Warning:** Vite reports `index-*.js` at `~925 kB` (> `500 kB` threshold); route-level `React.lazy` code-splitting is not yet configured.

---

## 9. Priority List

- **P0 (Critical):**
  - Restrict unrestricted `ROLE_ADMIN` self-registration in backend + frontend (`AuthService` + `RegisterPage`) before production deployment.
- **P1 (High):**
  - Implement Phase 2 backend telemetry endpoints (`system_metrics`, `process_metrics`, `container_metrics`) and wire `DashboardPage`, `SystemMonitoringPage`, `ProcessMonitoringPage`, `DockerMonitoringPage`.
  - Wire `Navbar.tsx` and `AgentsPage.tsx` to real `/api/v1/health` and AI service `/api/v1/agents/status` (via backend proxy).
  - Fix `DEMO_PROCESSES.sort(...)` mutation bug in `ProcessMonitoringPage.tsx`.
- **P2 (Medium):**
  - Replace `alert()`/`prompt()`/`window.confirm()` in `ApplicationsPage`, `ServersPage`, `IncidentsPage` with dark-themed modal/inline banners.
  - Add `ErrorBanner` states to `ApplicationsPage`, `ServersPage`, and `IncidentsPage`.
  - Wire `SettingsPage` to Phase 2 `GET/PUT /api/v1/config` endpoints.
  - Add Edit Application modal using existing `PUT /api/v1/applications/{id}`.
- **P3 (Low):**
  - Validate session on mount via `GET /api/v1/auth/me` in `AuthContext.tsx`.
  - Add mobile drawer toggle to `Sidebar.tsx`, pagination to tables, and `React.lazy` route splitting.

---

## 10. Recommended Implementation Roadmap & Phase 4A Status

1. **Phase 4A — Quick Frontend Hygiene & Security Hardening (COMPLETED — 2026-11-25):**
   - ✅ Restricted public `ROLE_ADMIN` self-registration in `AuthService` (`403 Forbidden` when an admin exists; first-admin bootstrap preserved) & removed `ROLE_ADMIN` option from `RegisterPage.tsx`.
   - ✅ Fixed `DEMO_PROCESSES.sort(...)` in-place mutation bug in `ProcessMonitoringPage.tsx` using `useMemo`.
   - ✅ Wired `Navbar.tsx` Engine status badge to live `GET /api/v1/health` polling (`ONLINE`/`DEGRADED`/`OFFLINE`/`CHECKING`/`UNKNOWN`).
   - ✅ Wired `AuthContext.tsx` initialization to `GET /api/v1/auth/me` with automatic invalid/expired token cleanup.
   - ✅ Added visible `ErrorBanner` + success feedback and replaced native `alert()`/`prompt()`/`window.confirm()` in `ApplicationsPage.tsx`, `ServersPage.tsx`, and `IncidentsPage.tsx`.
   - ✅ Wired `PUT /api/v1/applications/{id}` Edit Application modal in `ApplicationsPage.tsx`.
2. **Phase 4B — Backend Telemetry & Frontend Live Integration (COMPLETED — 2026-11-25):**
   - ✅ Implemented `HostTelemetryCollector`, `WindowsProcessCollector`, `DockerMonitorService`, `TelemetryCollectionService`, `ConfigurationService`, `MonitoringController`, `ConfigurationController`, and `AgentStatusController`.
   - ✅ Connected `DashboardPage`, `SystemMonitoringPage`, `ProcessMonitoringPage`, `DockerMonitoringPage`, `AgentsPage`, `Navbar`, and `SettingsPage` to live backend APIs (removing `DEMO_TIMELINE`, `DEMO_HISTORY`, `DEMO_PROCESSES`, and hardcoded agent statuses).
3. **Phase 4C — AI Detection, RCA, Recovery & Independent Verification (COMPLETED — 2026-11-25):**
   - ✅ Implemented `AiServiceClient` (timeouts, bounded retry, 30s circuit breaker, correlation IDs), `AnomalyDetectionEngine`, `RootCauseService`, `RecoveryPolicyEngine`, `SafeActionExecutor`, `VerificationService`, and `EventBroadcastService`.
   - ✅ Connected `FaultDetectionPage`, `RootCauseAnalysisPage`, `IncidentsPage`, `RecoveryManagementPage`, `RecoveryHistoryPage`, and `AgentsPage` to live backend APIs.
4. **Phase 4D — Scale & Deployment Polish:**
   - Add mobile sidebar drawer, `React.lazy` route splitting, and Docker Desktop setup for container execution.
