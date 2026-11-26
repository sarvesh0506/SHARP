# SHARP — Phase 5B: Resilience Command Center Dashboard Redesign

**Status:** Complete & Verified  
**Phase:** 5B (Resilience Command Center Dashboard Redesign)  
**Scope:** Dashboard (`DashboardPage.tsx`) and dashboard-specific modular components using Phase 5A design tokens and 100% real backend APIs.

---

## 1. Dashboard Redesign Overview
Transformed `DashboardPage.tsx` into an enterprise-grade **Resilience Command Center** with clear visual hierarchy across 9 operational sections:
1. **Command Center Header:** Title (`Resilience Command Center`), computed platform health `StatusBadge`, `Last updated` timestamp, time-window selector (`15m`, `1h`, `6h`, `24h`), and `Refresh` button.
2. **Overall System Health Banner (`SystemHealthBanner.tsx`):** Displays computed `overallHealthStatus` (`HEALTHY`, `DEGRADED`, `CRITICAL`), collector status, node counts (`online / degraded / offline`), active incidents, and active anomalies.
3. **6-Card KPI Strip:** Monitored Servers, Healthy Services, Active Incidents, Active Anomalies, Recovery Success (`N/A` when unavailable), and MTTR (`N/A` when no resolved incidents exist).
4. **Host Resource Monitoring:** Recharts `AreaChart` (CPU % and Memory % over the selected window), `MetricBar`s for Host CPU/Memory/Disk, Network RX/TX rates, and links to Docker & Process monitoring.
5. **Infrastructure Health:** Recharts `PieChart` donut (`ONLINE` / `DEGRADED` / `OFFLINE`) and live server list with link to `/servers`.
6. **Incident Overview:** Severity breakdown (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and latest incident list with link to `/incidents`.
7. **AI Intelligence & RCA Insights (`AiIntelligencePanel.tsx`):** Displays real RCA records (`rootCause`, `rcaStatus`), active `AnomalyEvent`s, and pending `RecoveryRecommendation`s, or `"No AI insights available yet."` when none exist.
8. **Recovery Activity & Live Activity Feed (`LiveActivityFeed.tsx`):** Recent `RecoveryAction` executions alongside real-time WebSocket events from `useLiveEvents()` (`/topic/events`).
9. **Quick Actions Bar (`QuickActionsBar.tsx`):** Direct navigation to `/incidents`, `/servers`, `/monitoring/system`, `/diagnosis`, `/recovery`, and `/analytics`.

---

## 2. Real APIs & Data Sources Used
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/servers`
- `GET /api/v1/anomalies`
- `GET /api/v1/recovery`
- `GET /api/v1/recovery/recommendations`
- `GET /api/v1/monitoring/system/latest`
- `GET /api/v1/monitoring/system/history`
- `GET /api/v1/monitoring/collector/status`
- `GET /api/v1/monitoring/docker/containers`
- STOMP WebSocket `/ws-direct` (`/topic/events`) via `useLiveEvents()`

---

## 3. Components Created & Modified
- **Created:**
  - `frontend/src/components/dashboard/SystemHealthBanner.tsx`
  - `frontend/src/components/dashboard/AiIntelligencePanel.tsx`
  - `frontend/src/components/dashboard/LiveActivityFeed.tsx`
  - `frontend/src/components/dashboard/QuickActionsBar.tsx`
  - `frontend/src/test/DashboardPage.test.tsx`
- **Modified:**
  - `frontend/src/pages/DashboardPage.tsx`

---

## 4. Verification Results
- **Frontend Vitest (`npm.cmd test`):** PASS (`Test Files 4 passed (4)`, `Tests 10 passed (10)`, `3.93s`).
- **Frontend Build (`npm.cmd run build` — `tsc && vite build`):** PASS (`2112 modules transformed`, built in `7.02s`, `0` TypeScript errors).
- **Backend Regression (`mvn test`):** PASS (`Tests run: 29, Failures: 0, Errors: 0, Skipped: 0`, `BUILD SUCCESS`, `Total time: 16.592 s`).
- **Browser Verification (`http://localhost:5173`):**
  - Verified login, `Resilience Command Center`, `Platform Health State` banner, all 6 KPI cards (`MTTR: N/A` honestly displayed), Recharts CPU/Memory area chart (`1h` 120 samples -> `15m` 89 samples), Infrastructure Health donut & node list, Incident Overview severity breakdown, AI Intelligence panel, Recovery Activity, Live Activity Feed (`CONNECTED`), Quick Actions navigation, Refresh button, and mobile (`390x844`) responsive stacking with `0` horizontal overflow, `0` console errors, and `0` HTTP `>= 400` errors.

---

## 5. Known Limitations
- `LiveActivityFeed` displays events received during the active browser session from `/topic/events` (historical past events are viewed in `Audit Trail`, `Incidents`, and `Recovery History`).
- Secondary feature pages (`/incidents`, `/detection`, `/diagnosis`, `/recovery`, etc.) remain unchanged in this phase and will be polished in Phase 5C+.
