# Specification: Google Cloud Pub/Sub Telemetry & Structured Logging

## Overview
This track modernizes application logging and telemetry by replacing the legacy Express Morgan (HTTP access logging) and Winston (application & error logging) setup with an asynchronous, structured Google Cloud Pub/Sub event pipeline. The modern Next.js 16 application will publish strongly typed events to Google Cloud Pub/Sub topics, enabling direct-to-BigQuery ingestion for real-time observability, audit tracking, and downstream analytics with zero ETL overhead.

## Architecture & Data Flow
1. **Next.js 16 Proxy (`src/proxy.ts`):** Intercepts incoming requests, assigns a unique `traceId` / correlation ID, measures latency, and asynchronously dispatches `http.request` telemetry.
2. **Next.js 16 Instrumentation (`src/instrumentation.ts`):** Implements `onRequestError` to capture server errors, unhandled exceptions, and component render crashes as `server.error` events.
3. **Domain Event Publisher (`src/lib/telemetry/`):** Exposes typed functions (`trackEvent`, `logError`, `logHttp`) to capture business audit actions (e.g., `user.registered`, `article.created`, `comment.created`).
4. **Dual-Mode Dispatcher:**
   - **Local / Test Environments:** Outputs structured JSON or formatted logs to `stdout` without requiring cloud credentials or failing builds.
   - **Production / Configured Environments:** Uses `@google-cloud/pubsub` with batching, retries, and non-blocking asynchronous publishing.
5. **Downstream BigQuery Subscription:**
   - Pub/Sub BigQuery subscription writes structured events directly to a BigQuery table with schema mapping and dead-letter queue (DLQ) support.

## Event Schema Definition

### 1. Base Envelope
```typescript
export type EventSeverity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type EventType = 'http.request' | 'server.error' | 'audit.auth' | 'audit.article' | 'audit.comment';

export interface TelemetryEnvelope<T = Record<string, unknown>> {
  eventId: string;             // UUID v4
  timestamp: string;           // ISO 8601 UTC
  eventType: EventType;
  severity: EventSeverity;
  service: string;             // 'modern-app'
  environment: string;         // 'production' | 'staging' | 'development' | 'test'
  traceId: string;             // Correlation trace ID
  userId?: string;             // Authenticated user ID (if present)
  data: T;                     // Typed payload
}
```

### 2. Payloads
- **`http.request`**:
  - `method: string` (e.g. GET, POST)
  - `path: string` (e.g. `/api/articles`)
  - `statusCode: number` (e.g. 200, 404, 500)
  - `durationMs: number` (response latency)
  - `userAgent?: string`
  - `ip?: string`
  - `referer?: string`
- **`server.error`**:
  - `message: string`
  - `name: string`
  - `stack?: string`
  - `digest?: string` (React/Next error digest)
  - `context?: { routerKind?: string; routePath?: string; routeType?: string }`
- **`audit.*`**:
  - `action: string` (e.g. `article.created`, `user.login`)
  - `targetId?: string` (e.g. article ID, comment ID)
  - `details?: Record<string, unknown>`

## BigQuery Table & Subscription Schema
- BigQuery Dataset: `telemetry`
- BigQuery Table: `app_events`
- Columns:
  - `event_id` (STRING, REQUIRED)
  - `timestamp` (TIMESTAMP, REQUIRED)
  - `event_type` (STRING, REQUIRED)
  - `severity` (STRING, REQUIRED)
  - `service` (STRING, REQUIRED)
  - `environment` (STRING, REQUIRED)
  - `trace_id` (STRING, NULLABLE)
  - `user_id` (STRING, NULLABLE)
  - `http` (RECORD, NULLABLE: `method`, `path`, `status_code`, `duration_ms`, `user_agent`, `ip`, `referer`)
  - `error` (RECORD, NULLABLE: `message`, `name`, `stack`, `digest`, `route_path`, `route_type`)
  - `audit` (RECORD, NULLABLE: `action`, `target_id`, `metadata_json`)
- Pub/Sub Subscription configuration: `write_metadata = true`, `use_table_schema = true`, dead-letter topic for invalid records.

## Functional Requirements
1. **Telemetry SDK Module (`src/lib/telemetry/`)**:
   - Provide client singleton with configuration via environment variables:
     - `PUBSUB_PROJECT_ID`
     - `PUBSUB_TOPIC_NAME`
     - `TELEMETRY_LOG_TO_CONSOLE` (boolean flag to toggle stdout logging)
   - Resilient asynchronous non-blocking flush so logging never blocks HTTP responses or slows user traffic.
   - Graceful shutdown hook in `src/instrumentation.ts` to flush pending messages on process termination.
2. **Next.js 16 Proxy Integration (`src/proxy.ts`)**:
   - Intercept requests matching `/api/:path*` and app routes.
   - Generate `x-trace-id` header if missing and attach to request/response.
   - Calculate latency and emit `http.request` event asynchronously.
3. **Instrumentation Integration (`src/instrumentation.ts`)**:
   - Export `onRequestError` to forward server-side exceptions and unhandled errors to the telemetry service as `server.error`.
4. **Domain Event Auditing**:
   - Instrument authentication endpoints (`/api/users`), article operations (`/api/articles`), and comment operations (`/api/articles/[id]/comments`) to emit audit events.
5. **BigQuery DDL & Deployment Artefacts**:
   - Provide SQL DDL schema migration script and GCP Cloud SDK setup instructions in `docs/telemetry/bigquery-pubsub-setup.md`.

## Non-Functional Requirements
- **Zero Impact on Request Latency:** Telemetry publishing must be non-blocking and fire-and-forget or handled asynchronously in the background.
- **Fail-Safe Operation:** If Google Cloud Pub/Sub is unavailable, errors must not break application requests; errors should be caught and logged locally.
- **Test Compatibility:** Vitest suites must run cleanly offline without requiring GCP credentials or network access.

## Acceptance Criteria
- [ ] `@google-cloud/pubsub` installed and wrapped in `src/lib/telemetry/` with TypeScript types and Zod validation.
- [ ] Next.js 16 `proxy.ts` logs HTTP access with latency and correlation `traceId`.
- [ ] Next.js 16 `instrumentation.ts` hooks into `onRequestError` to publish unhandled errors.
- [ ] Domain audit events logged on user registration, article creation/deletion, comment creation/deletion.
- [ ] Dual-mode fallback ensures 100% of unit & integration tests pass with mocked or stdout logging.
- [ ] BigQuery table DDL schema and Pub/Sub setup guide documented in `docs/telemetry/bigquery-pubsub-setup.md`.
- [ ] 100% Vitest test pass rate with coverage >80% on all new telemetry modules.

## Out of Scope
- Direct deployment or provisioning of GCP resources using live production billing in this repo.
- Modifying MongoDB database storage schemas.
