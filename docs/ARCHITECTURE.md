# SHARP Architecture & Resilience Engineering Design

## 1. Resilience Philosophy & Core Principles

SHARP operates on three foundational cybersecurity and resilience tenets:

1. **Defense-in-Depth & Risk Tiering**:
   - Recovery actions are divided into **LOW RISK** (e.g. graceful container restart with SIGTERM, cache invalidation) and **HIGH RISK** (e.g. horizontal scaling, image rollback, container pruning).
   - High-risk actions strictly mandate dual-custody administrator approval via the web console.
   - Autonomous execution is only permitted for pre-approved, allowlisted low-risk operations.

2. **No Arbitrary Execution (Zero Shell Injection)**:
   - AI models and agents are strictly forbidden from generating or executing raw shell strings.
   - All actions pass through strongly typed parameters and allowlisted Docker/OS adapters with parameter validation.

3. **Independent Verification**:
   - The platform never trusts an agent's claim that an operation succeeded.
   - The Verification Agent acts independently from the Recovery Agent, conducting direct HTTP health checks, checking container process state, and polling CPU/memory stability before marking an incident as resolved.

---

## 2. Seven Specialized Agents Resilience Loop

```mermaid
flowchart TD
    A[Monitored Application / Docker Target] -->|Telemetry Stream & Heartbeat| B(1. Sentinel Agent)
    B -->|Abnormal telemetry signal| C(2. Detection Agent)
    C -->|Anomaly classified & Incident created| D(3. Diagnosis Agent)
    D -->|Root cause & evidence| E(4. Planning Agent)
    E -->|Is High Risk?| F{Approval Required?}
    F -->|Yes: High Risk| G[Admin Approval Required in Console]
    F -->|No: Low Risk| H(5. Recovery Agent)
    G -->|Admin Approved| H
    G -->|Admin Rejected| I[Incident Escalated to On-Call]
    H -->|Executes Controlled Adapter| J[Docker / Service Remediation]
    J -->|State Mutated| K(6. Verification Agent)
    K -->|Multi-point Verification Passed| L[Incident Resolved & MTTR Recorded]
    K -->|Verification Failed| M[Fallback Triggered & Critical Alert]
    L --> N(7. Learning Agent)
    M --> N
    N -->|Update Recovery Confidence| E
```
