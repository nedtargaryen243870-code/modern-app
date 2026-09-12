# Product Guidelines: Modern App

## 1. Brand Identity & Voice
- **Voice & Tone:** Professional, editorial, and clear. Content presentation should feel clean, modern, and trustworthy.
- **Microcopy & Feedback:** Informative, concise, and actionable. Errors should clearly explain what went wrong and how the user can correct it (e.g., "Password must be at least 6 characters" rather than "Invalid input").
- **Clarity over Cleverness:** Prioritize clarity, legibility, and usability in all user-facing copy, button labels, and system notifications.

## 2. Design System & Visual Language
- **Typography:** Built on the Geist sans-serif typeface, with structured typographic hierarchy (clear distinctions between headings H1-H4, body copy, and metadata).
- **Color Palette:** Neutral and modern monochromatic base (slate/zinc) paired with high-contrast foreground text and subtle accent colors for active states, links, and primary calls to action.
- **Component Foundations:** UI components built on accessible headless primitives (`@base-ui/react` and `shadcn`) complemented by `lucide-react` iconography.
- **Elevation & Layout:** Clean card surfaces, subtle borders, and intentional white space rather than heavy drop shadows.

## 3. User Experience (UX) Principles
- **Responsive & Mobile-First:** Fluid layouts that scale elegantly from mobile screens to widescreen desktop monitors.
- **Predictable Navigation:** Intuitive routing with breadcrumbs or back-navigation for deep views (articles, tags, author profiles).
- **Form Design & Validation:**
  - Client-side and server-side validation powered by Zod.
  - Inline error messaging displayed directly below offending input fields.
  - Clear loading states and disabled submit buttons during in-flight mutations.
- **State Feedback:**
  - Skeleton screens for async loading transitions.
  - Explicit empty states for lists with zero items (e.g., "No articles found under this tag").
  - Toast or inline banner notifications for successful operations (article saved, comment posted).

## 4. Accessibility (a11y) Standards
- Target WCAG 2.1 AA compliance across all views.
- Semantic HTML tags (`<article>`, `<nav>`, `<main>`, `<header>`, `<footer>`).
- Full keyboard navigability for interactive elements (modals, dropdowns, forms).
- Proper ARIA attributes and focus indicators on interactive elements.

## 5. Observability, Telemetry & Privacy Standards
- **Data Privacy & Redaction:** Never emit plaintext passwords, password hashes, session secrets, authorization bearer tokens, or raw cookies into telemetry streams or Pub/Sub topics.
- **Fail-Safe & Non-Blocking:** Telemetry publishing must operate asynchronously and fail-safe. Network outages or Google Cloud API failures must never degrade end-user response times or trigger 500 errors.
- **Distributed Trace Correlation:** Propagate `x-trace-id` across Next.js 16 Proxy, route handlers, error reporters, and external systems to maintain unified request traceability.
- **Environment Isolation:** Local and test runs default to structured stdout logging without requiring Google Cloud credentials or live Pub/Sub topics.
