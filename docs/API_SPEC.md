# SHARP REST & WebSocket API Specification

## Base URLs
- **Backend API**: `http://localhost:8080/api/v1`
- **AI Service API**: `http://localhost:8000/api/v1`
- **WebSocket Broker**: `ws://localhost:8080/ws`

---

## 1. Authentication Endpoints

### `POST /api/v1/auth/login`
- **Description**: Authenticate user and receive a JWT Bearer token.
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "Admin@123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "type": "Bearer",
      "id": 1,
      "username": "admin",
      "email": "admin@sharp.local",
      "role": "ROLE_ADMIN",
      "expiresIn": 86400000
    }
  }
  ```

### `POST /api/v1/auth/register`
- **Description**: Register a new user account.
- **Request Body**:
  ```json
  {
    "username": "operator_john",
    "email": "john@sharp.local",
    "password": "SecurePassword123!",
    "role": "ROLE_OPERATOR"
  }
  ```

### `GET /api/v1/auth/me`
- **Description**: Return profile of currently authenticated user.
- **Headers**: `Authorization: Bearer <token>`

---

## 2. Dashboard & Telemetry

### `GET /api/v1/dashboard/summary`
- **Description**: Returns consolidated statistics for applications, active incidents, recovery success rate, and MTTR.

### `GET /api/v1/health`
- **Description**: System health check endpoint.

---

## 3. Application Registry

### `GET /api/v1/applications`
- **Description**: List all registered applications and their real-time status.

### `POST /api/v1/applications`
- **Description**: Register a new application container target.
- **Request Body**:
  ```json
  {
    "name": "payment-gateway",
    "description": "Payment microservice",
    "dockerContainerId": "d7e411b98f",
    "dockerImage": "sharp/payment-gw:v2.0.4",
    "healthEndpoint": "/health",
    "port": 8082,
    "isAutoRecoveryEnabled": true
  }
  ```

### `DELETE /api/v1/applications/{id}`
- **Description**: De-register an application target (Requires `ROLE_ADMIN`).

---

## 4. Incident Management & Recovery Engine

### `GET /api/v1/incidents`
- **Description**: List all incident records with severity and root cause diagnostics.

### `POST /api/v1/incidents`
- **Description**: Log a new incident (Typically triggered by Sentinel / Detection agents).

### `POST /api/v1/recovery/trigger`
- **Description**: Initiate a controlled recovery action.
- **Request Body**:
  ```json
  {
    "incidentId": 1,
    "actionType": "RESTART_CONTAINER",
    "riskLevel": "LOW"
  }
  ```

### `POST /api/v1/recovery/{id}/approve`
- **Description**: Approve a high-risk recovery action (Requires `ROLE_ADMIN`).

### `POST /api/v1/recovery/{id}/reject`
- **Description**: Reject a recovery action (Requires `ROLE_ADMIN`).

---

## 5. AI Service Agent Contracts

### `POST http://localhost:8000/api/v1/agents/detection/detect`
- **Request**: Metric snapshot (CPU %, Memory %, response time, HTTP status code).
- **Response**: Anomaly classification, confidence score, and severity.

### `POST http://localhost:8000/api/v1/agents/diagnosis/analyze`
- **Request**: Application telemetry and error log traces.
- **Response**: Probable root cause, evidence dictionary, and recommended remediation strategy.

### `POST http://localhost:8000/api/v1/agents/planning/plan`
- **Request**: Diagnosis result.
- **Response**: Allowlisted recovery plan, risk level classification, and approval requirement flag.
