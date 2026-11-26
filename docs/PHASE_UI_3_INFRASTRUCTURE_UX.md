# PHASE UI-3 — Infrastructure & Server Detail Experience

## Objective
Upgrade SHARP's Infrastructure Registry (`ServersPage`) into a comprehensive server investigation experience with sorting, health degradation diagnostics, telemetry metrics, and direct navigation to connected infrastructure resources.

## Existing Implementation Reviewed
- `frontend/src/pages/ServersPage.tsx` and `frontend/src/api/servers.ts`
- Real backend endpoints: `/servers`, `/monitoring/collector/status`, `/monitoring/system/latest`, `/monitoring/processes`, `/monitoring/docker/containers`, `/applications`, `/incidents`, `/anomalies`, `/recovery/executions`.

## Changes Implemented
- Upgraded `frontend/src/pages/ServersPage.tsx`:
  - Added summary strip (Total Nodes, Online, Degraded, Collector State).
  - Added sorting (`Hostname`, `Highest CPU`, `Highest Memory`, `Highest Disk`, `Status`, `Last Heartbeat`), status filtering, search, and `MetricBar` resource visualization.
  - Added health degradation diagnostics (`getHealthReasons`) on cards and in the detail modal.
  - Upgraded the Server Details modal (`Escape`-dismissible) with Overview & Collector state, Resource Metrics, clickable Infrastructure/Operational cards (Processes, Containers, Apps, Active Incidents), Anomaly/Recovery counts, and direct links to System Monitoring and Recovery Console.
  - Updated `ServersAndAudit.test.tsx` to wrap `<ServersPage />` in `<MemoryRouter>` and added `frontend/src/test/ServerDetails.test.tsx`.

## Tests, Build & Browser Verification
- **Vitest (`npm.cmd test`)**: **20/20 passed** across 8 test files.
- **Build (`npm.cmd run build`)**: `tsc && vite build` passed (`✓ built in 9.50s`).
- **Live Browser (`http://localhost:5173/servers`)**:
  - Verified summary strip, status filtering, CPU sorting, Server Details modal, `Escape` dismissal, desktop (`1440x900`) and mobile (`390x844`) with 0 horizontal overflow, 0 console errors, and 0 HTTP 4xx/5xx errors.
