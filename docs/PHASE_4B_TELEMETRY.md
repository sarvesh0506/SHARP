# SHARP — Phase 4B: Real Telemetry & Monitoring Infrastructure

**Status:** Implemented & Verified  
**Target Environment:** Windows 11 Host (Java 21 / Spring Boot 3.2.11 / OSHI 6.6.5)

---

## 1. Architecture & Collection Flow

```
OSHI SystemInfo (Windows 11 Host)
  ├── HostTelemetryCollector   ──▶ CPU ticks delta, RAM, Disk volumes, Network RX/TX rates, Uptime
  ├── WindowsProcessCollector  ──▶ Top N OS processes (PID, Name, CPU% delta, RSS, State, Start, Path, User)
  └── DockerMonitorService     ──▶ `docker info / ps / stats` (honestly reports unavailable if Docker absent)
          │
          ▼
TelemetryCollectionService (@Scheduled, overlap-guarded, configurable interval & retention)
          │
          ├──▶ H2 / PostgreSQL (`system_metrics`, `process_metrics`, `container_metrics`)
          └──▶ MonitoringController (`/api/v1/monitoring/*`) ──▶ React Frontend
```

---

## 2. Metric Sources

- **Host CPU, Memory, Disk, Network, Uptime:** Collected via `com.github.oshi:oshi-core:6.6.5` (`CentralProcessor`, `GlobalMemory`, `FileSystem` / `OSFileStore`, `NetworkIF`, `OperatingSystem`).
  - CPU % uses tick-to-tick delta (`getSystemCpuLoadBetweenTicks`).
  - Network RX/TX rates (`bytes/sec`) use time-based byte deltas across collection cycles.
- **Windows Processes:** Collected via `OperatingSystem.getProcesses(...)` sorted by RSS descending (configurable `sharp.monitoring.process-limit`, default `100`), with per-process CPU % computed between snapshots and safe exception handling for permission-restricted system processes.
- **Docker Containers:** Collected via `docker info`, `docker ps -a`, and `docker stats --no-stream` with timeouts. If Docker CLI or daemon is unavailable, `available: false` and `containers: []` are returned honestly.

---

## 3. Data Models & Retention

| Entity / Table | Indexes | Purpose |
|---|---|---|
| `system_metrics` | `collected_at`, `(host_name, collected_at)` | Timestamped host CPU, RAM, Disk, Network snapshots |
| `process_metrics` | `collected_at`, `pid` | Timestamped per-process snapshots |
| `container_metrics` | `collected_at`, `container_id` | Timestamped Docker container snapshots |
| `system_configurations` | `config_key` (unique) | Persistent thresholds, interval, retention, enable toggle |

Retention cleanup runs at the end of each collection cycle, deleting rows older than `monitoring.retention_hours` (default `24` hours, configurable `1–720`).

---

## 4. REST APIs Implemented

### Monitoring (`/api/v1/monitoring`)
- `GET /system/latest` — Latest `SystemMetric` snapshot
- `GET /system/history?from=&to=&limit=` — Time-range filtered historical host metrics (up to 500 points)
- `GET /processes?search=&status=&sortBy=&sortDir=&page=&size=` — Paginated, filtered, sortable live OS process list
- `GET /docker/containers` — Real Docker daemon availability and container snapshot
- `GET /collector/status` — Collector health (`HEALTHY` / `DEGRADED` / `DISABLED` / `INITIALIZING`), last success/failure, interval, data flags
- `POST /collector/collect` — Trigger an immediate collection cycle

### Configuration (`/api/v1/config`)
- `GET /api/v1/config` — Read all persisted configuration entries
- `PUT /api/v1/config` (`ROLE_ADMIN` only) — Validate and persist thresholds (`warning < critical`), polling interval (`2–300s`), retention (`1–720h`), and `monitoring.enabled`

### AI Agent Status (`/api/v1/agents/status`)
- `GET /api/v1/agents/status` — Probes `sharp.ai-service.url` (`/api/v1/agents/status`). Reports `reachable: false, serviceStatus: "OFFLINE"` when Python AI service is not running instead of fabricating active agents.

---

## 5. Known Limitations

1. **Docker on Current Host:** Docker CLI/Desktop is not installed on the current Windows 11 development machine, so `GET /monitoring/docker/containers` reports `available: false` (`Docker CLI not installed or daemon unreachable`).
2. **Containerized Backend Deployment:** If the Spring Boot backend is later run inside a Linux Docker container without host PID/socket mounts, `HostTelemetryCollector` and `WindowsProcessCollector` would observe the container rather than the Windows host; a dedicated host agent would be needed in that deployment mode.
3. **First Sample Delta:** On the very first sample after startup, CPU % and Network RX/TX rate require a baseline tick/byte reading and become populated from the second sample onward (~10s).
