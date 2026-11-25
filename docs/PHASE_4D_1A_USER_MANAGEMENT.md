# SHARP — Phase 4D-1A: Secure Admin User Management Backend

**Status:** Implemented & Verified  
**Scope:** Backend-only (`ROLE_ADMIN` restricted User Management APIs & JWT disabled-account enforcement)

---

## 1. Architecture & Components

- **DTOs (`com.sharp.dto`):**
  - `UserSummaryDto`: Exposes only `id`, `username`, `email`, `role`, `enabled`, `createdAt`, `updatedAt`. Never exposes `passwordHash`, JWTs, or secrets.
  - `UpdateUserRoleRequest`: Validated role string (`@NotBlank`).
  - `UpdateUserStatusRequest`: Validated boolean status (`@NotNull`).
- **Repository (`UserRepository`):** Added `countByRoleAndEnabledTrue(Role role)` for last-active-admin protection.
- **Service (`UserManagementService`):** Search, role/enabled filtering, sorting, pagination, role validation against `Role` enum, self-lockout prevention, last-active-admin demotion/disable protection, and `AuditService` logging.
- **Controller (`UserController`):** Secured with `@PreAuthorize("hasAuthority('ROLE_ADMIN')")` and `SecurityConfig` `/api/v1/users/**` rule.

---

## 2. REST APIs Created

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/users` | `ROLE_ADMIN` | Paginated user listing (`search`, `role`, `enabled`, `sortBy`, `sortDir`, `page`, `size`) |
| `GET` | `/api/v1/users/{id}` | `ROLE_ADMIN` | Retrieve safe user summary by ID |
| `PUT` | `/api/v1/users/{id}/role` | `ROLE_ADMIN` | Change user role (`ROLE_ADMIN` or `ROLE_OPERATOR`) |
| `PUT` | `/api/v1/users/{id}/status` | `ROLE_ADMIN` | Enable or disable user account |

---

## 3. Security Protections

1. **Dual-Layer Admin Authorization:** Both `SecurityConfig` (`/api/v1/users/**`) and `UserController` (`@PreAuthorize("hasAuthority('ROLE_ADMIN')")`) enforce `ROLE_ADMIN`.
2. **Disabled Account Enforcement:**
   - Login via `AuthenticationManager` blocks disabled accounts (handled cleanly by `GlobalExceptionHandler` with `HTTP 403`).
   - `JwtAuthenticationFilter` checks `userDetails.isEnabled()` on every authenticated request so an already-issued JWT is rejected immediately once an account is disabled.
3. **Self-Lockout Prevention:** An administrator cannot disable their own account (`HTTP 400`).
4. **Last-Active-Admin Protection:** The sole active `ROLE_ADMIN` cannot be disabled or demoted (`HTTP 409 Conflict`).
5. **No Arbitrary Roles:** Only `Role.ROLE_ADMIN` and `Role.ROLE_OPERATOR` are accepted; invalid roles return `HTTP 400`.
6. **Audit Trail:** `USER_ROLE_UPDATED`, `USER_ENABLED`, and `USER_DISABLED` are recorded in `audit_logs`.

---

## 4. Known Limitations

- `User.java` does not currently track `lastLoginAt` in the database schema, so `UserSummaryDto` returns `createdAt` and `updatedAt` (no fabricated login timestamps).
- Frontend Admin User Management UI (`UsersPage`) is scheduled for Stage 4D-2 and was intentionally not modified in this stage.
