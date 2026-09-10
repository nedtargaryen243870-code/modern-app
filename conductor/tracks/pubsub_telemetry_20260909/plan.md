# Implementation Plan: Google Cloud Pub/Sub Telemetry & Structured Logging

## Phase 1: Telemetry Core SDK & Publisher Service [checkpoint: 237fcf6]
- [x] Task: Document architecture update in tech stack [11e023b]
  - [x] Add `@google-cloud/pubsub` and BigQuery subscription details to `conductor/tech-stack.md`
- [x] Task: Install required dependencies [d43e6ee]
  - [x] Install `@google-cloud/pubsub`, `uuid`, and `@types/uuid`
- [x] Task: TDD - Unit tests for telemetry schemas and envelope validation [937234e]
  - [x] Write unit tests verifying schema definitions, Zod validation, and envelope structure
  - [x] Confirm tests fail (Red phase)
- [x] Task: Implement telemetry schema, Zod validators, and config [5eac284]
  - [x] Implement `src/lib/telemetry/schema.ts` with CloudEvents-style envelope and event types
  - [x] Implement `src/lib/telemetry/config.ts` reading environment variables with safe defaults
  - [x] Confirm tests pass (Green phase)
- [x] Task: TDD - Unit tests for Pub/Sub publisher and fallback logging [b4689d6]
  - [x] Write unit tests for `src/lib/telemetry/publisher.ts` mocking `@google-cloud/pubsub`
  - [x] Test batching, error recovery, and stdout fallback when credentials are absent
  - [x] Confirm tests fail (Red phase)
- [x] Task: Implement Pub/Sub publisher client and local fallback [237fcf6]
  - [x] Implement singleton publisher in `src/lib/telemetry/publisher.ts` with batching configuration
  - [x] Implement convenience facade `src/lib/telemetry/index.ts` (`logHttp`, `logError`, `trackAudit`)
  - [x] Confirm tests pass (Green phase)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [237fcf6]

## Phase 2: HTTP Tracing & Error Telemetry Integration (Morgan & Winston Replacement) [checkpoint: 92ac0f8]
- [x] Task: TDD - Tests for Next.js 16 Proxy HTTP telemetry [a72c305]
  - [x] Write unit tests for `proxy.ts` verifying trace ID generation and `http.request` event emission
  - [x] Confirm tests fail (Red phase)
- [x] Task: Implement Next.js 16 Proxy telemetry interceptor [181c8e6]
  - [x] Implement `src/proxy.ts` attaching `x-trace-id` header and measuring latency
  - [x] Asynchronously dispatch `http.request` telemetry on responses
  - [x] Confirm tests pass (Green phase)
- [x] Task: TDD - Tests for Next.js 16 Instrumentation server error capture [12268cf]
  - [x] Write unit tests for `src/instrumentation.ts` verifying `onRequestError` captures server exceptions
  - [x] Confirm tests fail (Red phase)
- [x] Task: Implement Next.js 16 Instrumentation error reporting [92ac0f8]
  - [x] Implement `src/instrumentation.ts` with `register()` and `onRequestError()` hooks
  - [x] Forward uncaught server errors and digests to `logError`
  - [x] Confirm tests pass (Green phase)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [92ac0f8]

## Phase 3: Domain Audit Event Instrumentation
- [x] Task: TDD - Tests for domain audit logging across API routes [45509b0]
  - [x] Write tests verifying audit event emission on user registration, article lifecycle, and comments
  - [x] Confirm tests fail (Red phase)
- [x] Task: Instrument User API endpoints with audit events [639c0fa]
  - [x] Emit `audit.auth` on registration (`/api/users`) and session validation (`/api/users/session`)
  - [x] Confirm tests pass (Green phase)
- [x] Task: Instrument Article API endpoints with audit events [53956ed]
  - [x] Emit `audit.article` on create (`POST /api/articles`), update (`PUT /api/articles/[id]`), and delete (`DELETE /api/articles/[id]`)
  - [x] Confirm tests pass (Green phase)
- [x] Task: Instrument Comment API endpoints with audit events [cbd2b83]
  - [x] Emit `audit.comment` on create (`POST /api/articles/[id]/comments`) and delete (`DELETE /api/articles/[id]/comments/[commentId]`)
  - [x] Confirm tests pass (Green phase)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [cbd2b83]

## Phase 4: BigQuery Schema, Documentation & End-to-End Verification
- [x] Task: Create BigQuery DDL schema & Pub/Sub subscription deployment guide [54e8eef]
  - [x] Create `docs/telemetry/bigquery-pubsub-setup.md` with table DDL, schema definition, and `gcloud` subscription commands
- [x] Task: Execute full automated test suite and regression harness [70f4928]
  - [x] Run `npm run test` (including parity-adversarial tests) to ensure zero regressions
  - [x] Verify test coverage >80% on all new telemetry modules
- [x] Task: Update project documentation and index [fe5ef86]
  - [x] Update `conductor/tech-stack.md` and project guides with telemetry setup
- [~] Task: Phase Verification & Checkpoint (Refer to workflow.md)
