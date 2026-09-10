# Implementation Plan: Google Cloud Pub/Sub Telemetry & Structured Logging

## Phase 1: Telemetry Core SDK & Publisher Service
- [x] Task: Document architecture update in tech stack [11e023b]
  - [x] Add `@google-cloud/pubsub` and BigQuery subscription details to `conductor/tech-stack.md`
- [x] Task: Install required dependencies [d43e6ee]
  - [x] Install `@google-cloud/pubsub`, `uuid`, and `@types/uuid`
- [x] Task: TDD - Unit tests for telemetry schemas and envelope validation [937234e]
  - [x] Write unit tests verifying schema definitions, Zod validation, and envelope structure
  - [x] Confirm tests fail (Red phase)
- [ ] Task: Implement telemetry schema, Zod validators, and config
  - [ ] Implement `src/lib/telemetry/schema.ts` with CloudEvents-style envelope and event types
  - [ ] Implement `src/lib/telemetry/config.ts` reading environment variables with safe defaults
  - [ ] Confirm tests pass (Green phase)
- [ ] Task: TDD - Unit tests for Pub/Sub publisher and fallback logging
  - [ ] Write unit tests for `src/lib/telemetry/publisher.ts` mocking `@google-cloud/pubsub`
  - [ ] Test batching, error recovery, and stdout fallback when credentials are absent
  - [ ] Confirm tests fail (Red phase)
- [ ] Task: Implement Pub/Sub publisher client and local fallback
  - [ ] Implement singleton publisher in `src/lib/telemetry/publisher.ts` with batching configuration
  - [ ] Implement convenience facade `src/lib/telemetry/index.ts` (`logHttp`, `logError`, `trackAudit`)
  - [ ] Confirm tests pass (Green phase)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: HTTP Tracing & Error Telemetry Integration (Morgan & Winston Replacement)
- [ ] Task: TDD - Tests for Next.js 16 Proxy HTTP telemetry
  - [ ] Write unit tests for `proxy.ts` verifying trace ID generation and `http.request` event emission
  - [ ] Confirm tests fail (Red phase)
- [ ] Task: Implement Next.js 16 Proxy telemetry interceptor
  - [ ] Implement `src/proxy.ts` attaching `x-trace-id` header and measuring latency
  - [ ] Asynchronously dispatch `http.request` telemetry on responses
  - [ ] Confirm tests pass (Green phase)
- [ ] Task: TDD - Tests for Next.js 16 Instrumentation server error capture
  - [ ] Write unit tests for `src/instrumentation.ts` verifying `onRequestError` captures server exceptions
  - [ ] Confirm tests fail (Red phase)
- [ ] Task: Implement Next.js 16 Instrumentation error reporting
  - [ ] Implement `src/instrumentation.ts` with `register()` and `onRequestError()` hooks
  - [ ] Forward uncaught server errors and digests to `logError`
  - [ ] Confirm tests pass (Green phase)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Domain Audit Event Instrumentation
- [ ] Task: TDD - Tests for domain audit logging across API routes
  - [ ] Write tests verifying audit event emission on user registration, article lifecycle, and comments
  - [ ] Confirm tests fail (Red phase)
- [ ] Task: Instrument User API endpoints with audit events
  - [ ] Emit `audit.auth` on registration (`/api/users`) and session validation (`/api/users/session`)
  - [ ] Confirm tests pass (Green phase)
- [ ] Task: Instrument Article API endpoints with audit events
  - [ ] Emit `audit.article` on create (`POST /api/articles`), update (`PUT /api/articles/[id]`), and delete (`DELETE /api/articles/[id]`)
  - [ ] Confirm tests pass (Green phase)
- [ ] Task: Instrument Comment API endpoints with audit events
  - [ ] Emit `audit.comment` on create (`POST /api/articles/[id]/comments`) and delete (`DELETE /api/articles/[id]/comments/[commentId]`)
  - [ ] Confirm tests pass (Green phase)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: BigQuery Schema, Documentation & End-to-End Verification
- [ ] Task: Create BigQuery DDL schema & Pub/Sub subscription deployment guide
  - [ ] Create `docs/telemetry/bigquery-pubsub-setup.md` with table DDL, schema definition, and `gcloud` subscription commands
- [ ] Task: Execute full automated test suite and regression harness
  - [ ] Run `npm run test` (including parity-adversarial tests) to ensure zero regressions
  - [ ] Verify test coverage >80% on all new telemetry modules
- [ ] Task: Update project documentation and index
  - [ ] Update `conductor/tech-stack.md` and project guides with telemetry setup
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
