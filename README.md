# SHARP — Self-Healing Autonomous Resilience Platform

**SHARP** is an enterprise-grade, AI-powered resilience engineering and self-healing platform engineered to monitor applications and infrastructure in real time, detect failures and resource anomalies, perform root-cause diagnostics, execute allowlisted recovery actions under strict risk policies, and independently verify system recovery.

---

## 1. System Architecture

```
                                  +-------------------------------------------------------+
                                  |                     SHARP FRONTEND                    |
                                  |   (React 19, TypeScript, Vite, Tailwind, Recharts)    |
                                  +---------------------------+---------------------------+
                                                              | REST / WebSocket
                                                              v
+------------------------+        +-------------------------------------------------------+        +------------------------+
|      PostgreSQL 16     | <----> |                  SHARP BACKEND (CORE)                 | <----> |        Redis 7         |
| Relational Persistence |        | (Java 21, Spring Boot 3, Spring Security, Data JPA)   |        | Telemetry Cache & State|
+------------------------+        +---------------------------+---------------------------+        +------------------------+
                                                              | HTTP / JSON Contracts
                                                              v
                                  +-------------------------------------------------------+
                                  |                  SHARP AI SERVICE                     |
                                  |          (Python 3.12, FastAPI, ML Models)            |
                                  +---------------------------+---------------------------+
                                                              |
                 +--------------------------------------------+--------------------------------------------+
                 |                             SEVEN SPECIALIZED AGENTS                                    |
                 |  1. Sentinel Agent: Continuously evaluates heartbeats and telemetry streams             |
                 |  2. Detection Agent: Identifies threshold anomalies and error cascades                 |
                 |  3. Diagnosis Agent: Infers root causes from exception logs and system evidence        |
                 |  4. Planning Agent: Maps diagnosis to allowlisted recovery action and risk tier         |
                 |  5. Recovery Agent: Executes controlled remediation adapter (with approval gating)      |
                 |  6. Verification Agent: Independently confirms target recovery without executor bias    |
                 |  7. Learning Agent: Mines incident history to optimize MTTR and confidence weights     |
                 +-----------------------------------------------------------------------------------------+
```

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript 5.7, Vite 6, Tailwind CSS 3.4, Recharts 2.14, Lucide Icons, Axios.
- **Backend**: Java 21 LTS (Eclipse Temurin), Spring Boot 3.2.11, Spring Security, Spring Data JPA, Hibernate, JJWT 0.12.6, STOMP/WebSocket.
- **AI Intelligence**: Python 3.12, FastAPI, NumPy, Pandas, Scikit-learn, Uvicorn, Pydantic v2.
- **Infrastructure & Monitoring**: PostgreSQL 16, Redis 7, Prometheus, Grafana, Docker & Docker Compose.

---

## 3. Directory Structure

```
SHARP/
├── .env.example                  # Environment configuration template
├── .env                          # Local environment variables
├── .gitignore                    # Git ignore file
├── docker-compose.yml            # Multi-service container orchestration
├── README.md                     # Project documentation & execution guide
├── docs/                         # Architecture, Status tracker, and API specs
│   ├── STATUS.md                 # Live feature & milestone status tracker
│   ├── ARCHITECTURE.md           # System design & resilience workflow
│   └── API_SPEC.md               # REST & WebSocket API specification
├── infrastructure/               # Database and cache configurations
│   ├── postgres/                 # PostgreSQL initialization schema
│   ├── redis/                    # Redis configuration
│   └── prometheus/               # Prometheus telemetry scraping configuration
├── monitoring/                   # Observability dashboards
│   └── grafana/                  # Grafana datasources & dashboard provisioning
├── frontend/                     # React 19 single-page enterprise dashboard
│   ├── src/
│   │   ├── api/                  # Axios HTTP client with JWT interceptor
│   │   ├── components/           # UI cards, navigation, layout, status badges
│   │   ├── contexts/             # AuthContext (JWT management & RBAC)
│   │   ├── pages/                # Dashboard, Apps, Servers, Incidents, Agents, Audit, Auth
│   │   └── types/                # TypeScript data model interfaces
│   ├── package.json
│   └── vite.config.ts
├── backend/                      # Spring Boot 3 REST Core & Security Engine
│   ├── src/main/java/com/sharp/
│   │   ├── config/               # Security, CORS, WebSocket, Data initializer
│   │   ├── controller/           # Auth, Dashboard, Apps, Incidents, Recovery, Servers, Health
│   │   ├── dto/                  # Request / Response schemas & validation
│   │   ├── entity/               # JPA entities (Users, Applications, Incidents, RecoveryActions, Audit)
│   │   ├── exception/            # Global exception handler & error response
│   │   ├── repository/           # Spring Data JPA repositories
│   │   ├── security/             # JJWT token provider, filter, UserPrincipal
│   │   └── service/              # Core business logic & audit recording
│   └── pom.xml
└── ai-service/                   # Python 3.12 Multi-Agent AI Service
    ├── app/
    │   ├── agents/               # Sentinel, Detection, Diagnosis, Planning, Recovery, Verification, Learning
    │   ├── api/                  # FastAPI routers for health, telemetry, diagnosis, planning
    │   ├── models/               # Pydantic schemas and contracts
    │   └── main.py               # FastAPI application entrypoint
    └── requirements.txt
```

---

## 4. Default Credentials & Roles

| Username | Default Password | Role | Permissions |
| :--- | :--- | :--- | :--- |
| **`admin`** | `Admin@123` | `ROLE_ADMIN` | Full access: approve/reject high-risk recovery actions, de-register applications, configure infrastructure targets, view audit logs. |
| **`operator`** | `Operator@123` | `ROLE_OPERATOR` | Standard access: inspect real-time telemetry, register applications, trigger low-risk recoveries, view incidents and agent diagnostics. |

---

## 5. Execution Instructions

### Option A: Local Development (Native Binaries)

#### 1. Backend (Java 21 & Maven)
```powershell
cd backend
mvn clean package -DskipTests
java -jar target/sharp-backend-1.0.0-SNAPSHOT.jar
# Backend runs on http://localhost:8080 (in-memory H2 dev database active by default)
```

#### 2. AI Service (Python 3.12)
```powershell
cd ai-service
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# AI Service runs on http://localhost:8000 (Interactive Swagger at http://localhost:8000/docs)
```

#### 3. Frontend (React 19 & Vite)
```powershell
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

---

### Option B: Docker Compose (Full Stack)

Ensure Docker Desktop is running, then execute:

```bash
# Launch entire platform stack with one command
docker compose up -d --build
```

Access points:
- **Frontend Dashboard**: `http://localhost:5173`
- **Backend API & Health**: `http://localhost:8080/api/v1/health`
- **AI Service API & Docs**: `http://localhost:8000/docs`
- **Prometheus UI**: `http://localhost:9090`
- **Grafana Dashboard**: `http://localhost:3000` (User: `admin`, Password: `sharp_grafana_admin`)

---

## 6. Seven Specialized AI Agents

1. **Sentinel Agent**: Telemetry stream ingestion, ping & heartbeat evaluation.
2. **Detection Agent**: Statistical anomaly classification on CPU, memory, and HTTP 5xx error surges.
3. **Diagnosis Agent**: Root cause analysis engine matching exception stack traces and fault signatures.
4. **Planning Agent**: Risk-tier classification (LOW vs HIGH) and allowlisted recovery strategy selection.
5. **Recovery Agent**: Controlled execution adapter for Docker and infrastructure operations.
6. **Verification Agent**: Independent multi-step post-recovery probe ensuring genuine system recovery.
7. **Learning Agent**: Historical MTTR and policy optimization using continuous resilience learning.
