# SHARP — Phase 4D-4A: Runtime Connectivity & Recovery API Debugging

**Status:** Fixed & Browser-Verified  
**Phase:** 4D-4A (Runtime Connectivity & Functional Debugging)

---

## 1. Root Causes Identified

1. **Authentication Failures (`GET /api/v1/auth/me` → 401, `POST /api/v1/auth/login` → 401):**
   - `GET /api/v1/auth/me` returns `401` when `localStorage` holds a stale/invalid JWT (for example after a `dev` profile H2 in-memory restart); `AuthContext` + `apiClient` interceptor then clear `localStorage` and redirect to `/login`.
   - `POST /api/v1/auth/login` returns `401` only when invalid credentials are submitted (`DataInitializer` seeds `admin` / `Admin@123` and `operator` / `Operator@123` using `BCryptPasswordEncoder`). Verified `POST /api/v1/auth/login` succeeds with `200 OK` using valid seeded credentials.
2. **AI Service Offline (`AI Service: OFFLINE`):**
   - `AiServiceClient` probes `http://localhost:8000/api/v1/agents/status` (`application.yml`), and the Python FastAPI `uvicorn` server on port `8000` was not running. Starting `uvicorn app.main:app --host 0.0.0.0 --port 8000` resolved the status to `ONLINE`.
3. **WebSocket Handshake `403` (`ws://localhost:5173/ws-direct`):**
   - `WebSocketConfig` registers `/ws` and `/ws-direct`, and `vite.config.ts` proxies `/ws-direct`, but `SecurityConfig.java` only permitted `/ws/**` and omitted `/ws-direct/**`, causing Spring Security to reject `/ws-direct` handshakes with `403 Forbidden`.
4. **`Generate Recovery Recommendation` Button Appeared to Blink Without Result (`RootCauseAnalysisPage.tsx`):**
   - `handleCreateRecommendation` succeeded (`POST /api/v1/recovery/recommendations/incident/{id}`), but only set a top-of-page `feedback` banner (above the fold) without refreshing `fetchIncidents()` or rendering the newly created `RecoveryRecommendation` inline inside the `Recommended Recovery Action` card.

---

## 2. Fixes Implemented
- `backend/src/main/java/com/sharp/config/SecurityConfig.java`: Added `"/ws-direct/**"` to `.permitAll()` alongside `"/ws/**"`, preserving `WebSocketConfig` origin restrictions.
- `frontend/src/pages/RootCauseAnalysisPage.tsx`: Captured the returned `RecoveryRecommendation` in state (`generatedRec`), added inline `recError` and green `Recommendation #<id> Created` confirmation card directly below the button, and refreshed `fetchIncidents()`.

---

## 3. Verification Results
- **Frontend Build (`npm.cmd run build` — `tsc && vite build`):** PASS (`2104 modules transformed`, built in `7.18s`).
- **Backend Full Test Suite (`mvn test`):** PASS (`Tests run: 26, Failures: 0, Errors: 0, Skipped: 0`, `BUILD SUCCESS`, `Total time: 21.399 s`).
- **Real Browser Verification (`http://localhost:5173`):**
  - `POST /api/v1/auth/login` with `admin` / `Admin@123` returned `200 OK` and redirected to `/`.
  - Navbar status pills settled at `Engine: ONLINE`, `AI Service: ONLINE`, `Stream: CONNECTED`.
  - Zero console errors and zero HTTP `>= 400` responses (no `401` on `/auth/me`, no `403` on `/ws-direct`).
  - `/diagnosis`: `Analyze Incident` completed (`AI_ANALYSIS`, Confidence `78% (AI)`), and `Generate Recovery Recommendation` displayed the inline `Recommendation #1 Created` (`RESTART_MONITORED_SERVICE · PENDING`) card.
  - `/events`: `WebSocket Stream: CONNECTED` with live `RCA_COMPLETED` and `RECOVERY_RECOMMENDED` events displayed.
