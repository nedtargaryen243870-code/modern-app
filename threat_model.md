# Living Threat Model (`modern-app` - Telemetry Search Feature)

This document establishes the STRIDE threat model and Security Acceptance Criteria for Monday's admin telemetry search feature (`GET /api/telemetry/search`).

---

## 1. Feature Architecture & Trust Zones

- **Route**: `GET /api/telemetry/search`
- **Data Sink**: BigQuery `telemetry_events` partition table
- **Trust Boundaries**:
  - **Client -> API Route**: Public HTTP inputs (`traceId`, `userId`, `limit`, `startTimestamp`, `endTimestamp`).
  - **API Route -> Authentication**: NextAuth session validation (`req.auth`).
  - **API Route -> BigQuery Sink**: Parameterized SQL queries using `@traceId` and `@userId` parameters.

---

## 2. STRIDE Threat Analysis & Security Boundaries

| STRIDE Category | Threat Scenario | Trust Boundary | Security Constraint / Requirement |
| :--- | :--- | :--- | :--- |
| **Elevation of Privilege** | Unauthenticated or non-admin callers querying sensitive audit trails. | Public -> Admin API | Must verify `session.user.role === 'admin'`; return `401` if unauthenticated, `403` if non-admin. |
| **Tampering** | SQL injection via string concatenation in `traceId` or `userId` query parameters. | Untrusted Input -> BigQuery | Parameterize all BigQuery bindings (`@traceId`, `@userId`). Reject malformed trace IDs. |
| **Information Disclosure** | Internal stack traces, raw BigQuery exceptions, or database credentials exposed in HTTP 500 error fallbacks. | Exception Handler -> Client Output | Catch exceptions internally, log redacted summary to telemetry error logger, return clean `{ error: "Internal server error" }`. |
| **Denial of Service** | Unbounded audit log queries scanning entire historical dataset. | Query Engine -> Storage Partition | Enforce max limit (e.g. 100 records) and mandate bounded timestamp partition filter. |

---

## 3. Security Acceptance Criteria (Phase B Test Drivers)

1. `GET /api/telemetry/search` returns HTTP `401` when unauthenticated.
2. `GET /api/telemetry/search` returns HTTP `403` when caller role is not `admin`.
3. SQL injection payloads in `traceId` or `userId` (e.g., `' OR '1'='1`) are safely handled via parameterized `@traceId`/`@userId` query parameters and return only matching records.
4. Database connection errors or query syntax failures return HTTP `500` with clean `{ "error": "Internal server error" }` without leaking stack traces or credentials.
