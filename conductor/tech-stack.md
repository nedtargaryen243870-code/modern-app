# Technology Stack: Modern App

## Core Framework & Runtime
- **Runtime:** Node.js (v20+ recommended)
- **Framework:** Next.js 16.3.4 (App Router, Server Components & Route Handlers)
- **Language:** TypeScript 5.x (Strict mode enabled)
- **Frontend UI Library:** React 19.2.8

## Styling & Design System
- **CSS Framework:** Tailwind CSS v4 (`@tailwindcss/postcss`)
- **UI Primitives:** `@base-ui/react` and `shadcn` component architecture
- **Iconography:** `lucide-react`
- **Animations / Styling Utilities:** `class-variance-authority`, `cn`, `tw-animate-css`

## Data Layer & Persistence
- **Database:** MongoDB
- **Driver:** Native MongoDB Node.js Driver (`mongodb` v7.6.0)
- **Schema Validation:** Zod 4.5.4 for data schemas, API request/response parsing, and model validation
- **Data Access Patterns:** Modular data access layer in `src/lib/models` and `src/lib/db`

## Authentication & Security
- **Authentication:** NextAuth.js v5 beta (`next-auth`)
- **Credential Hashing:** `bcrypt`
- **Session Strategy:** JWT / secure cookie sessions with protected API routes and server-side session retrieval

## Testing & Quality Assurance
- **Test Runner:** Vitest 5 (`vitest`)
- **Component Testing:** `@testing-library/react` and `jsdom`
- **API & Mocking Utilities:** `node-mocks-http`
- **Parity Verification Harness:** Dedicated integration and adversarial test suites in `tests/verification/`
- **Static Analysis & Linting:** ESLint 9 (`eslint-config-next`)

## Build & Development Tooling
- **Package Manager:** npm
- **Bundler / Compiler:** Next.js Turbopack / PostCSS
- **Development Server:** `next dev -H 0.0.0.0 -p 3001`

## Telemetry, Logging & Observability
- **Event Pipeline:** Google Cloud Pub/Sub (`@google-cloud/pubsub`) replacing legacy Winston & Morgan
- **Sink / Warehouse:** Google Cloud BigQuery (via Pub/Sub direct BigQuery subscription)
- **Tracing & Correlation:** Request-bound correlation trace IDs (`x-trace-id`) via Next.js 16 Proxy
- **Error Capture:** Next.js 16 Instrumentation hooks (`onRequestError`)
- **Fallback / Local Mode:** Structured JSON stdout logger for offline/local development without GCP credentials

