# Architecture & Engineering Decision Log

> Living record of architectural choices, trade-offs, and core modifications.
> Every non-obvious decision and core file edit must be logged here per AGENTS.md.

---

## Decision 1: Platform Staff Visibility of Customer Plan Text
- **Date:** 2026-10-11
- **Status:** Approved
- **Decision:** Platform staff (`is_admin`) in the `/internal` panel CANNOT view customer plan text or task details. They see tenant aggregates only (member count, team count, plan count, last active date, AI usage counts).
- **Options Considered:**
  1. *Full Access:* Staff can browse and read all customer plans and tasks.
  2. *Support Access:* Impersonation mode where staff can view plans if granted permission.
  3. *Aggregates Only (Selected):* Staff see only tenant health metrics, team counts, plan counts, and AI call volumes.
- **Why:** Weekly plans contain sensitive corporate roadmap items, go-to-market strategies, and internal feedback. Exposing plan text to platform staff creates compliance and privacy risks with zero operational benefit. Platform maintenance (suspending bad tenants, troubleshooting quota issues) only requires aggregate counts and usage telemetry.

---

## Decision 2: Tenancy Scoping Mechanism & Database Model
- **Date:** 2026-10-11
- **Status:** Approved
- **Decision:** Implement multi-tenancy using row-level organization scoping with explicit `organization_id` foreign keys on every tenant-owned table, enforced via FastAPI dependency injection and SQLAlchemy filters.
- **Options Considered:**
  1. *Separate Database per Tenant:* High operational complexity, incompatible with Launchbase single-db Docker workflow.
  2. *Postgres Row-Level Security (RLS):* Adds hidden DB state and friction with SQLAlchemy connection pooling.
  3. *Application-Layer Scoping with Dependency Injection (Selected):* Reusable FastAPI dependencies (`get_tenant_context`) that validate user membership before any query runs, combined with returning 404 on cross-tenant probes.
- **Why:** Fits Launchbase's async SQLAlchemy patterns cleanly, maintains zero-overhead local development, and is thoroughly verifiable through automated cross-tenant attack tests.

---

## Decision 3: Auth Extension Strategy (Preserving Launchbase Core)
- **Date:** 2026-10-11
- **Status:** Approved
- **Decision:** Extend Launchbase's existing auth system additively by adding a `POST /app/auth/signup` endpoint that calls the existing `get_password_hash` utility and creates session cookies using `create_access_token`.
- **Options Considered:**
  1. *Introduce external auth provider (Supabase / Auth0 / Clerk):* Explicitly banned by RULES.md § 1.
  2. *Rewrite auth to use Bearer headers in frontend:* Violates Launchbase's HttpOnly cookie architecture.
  3. *Additive Sign-up Endpoint (Selected):* Reuses existing security primitives, cookie-setting logic, and JWT audience constraints.
- **Why:** Conforms strictly to RULES.md § 1 ("Launchbase core: extend, never replace").

---

## Decision 4: Elimination of Database Enums
- **Date:** 2026-10-11
- **Status:** Approved
- **Decision:** Use `String(20)` columns in SQLAlchemy models with Python/Pydantic validation schemas instead of PostgreSQL native ENUM types.
- **Options Considered:**
  1. *Postgres Native ENUMs:* Causes schema migration locking, painful Alembic diffs, and complex ALTER TYPE statements.
  2. *Integer codes:* Obscures readability in raw DB inspections.
  3. *String columns + Pydantic validation (Selected):* Painless migrations, readable in database, strictly validated at the API boundary.
- **Why:** Complies directly with RULES.md § 4 ("No enums in models (use strings + validation)").

---

## Decision 5: AI Architecture & Graceful Degradation
- **Date:** 2026-10-11
- **Status:** Approved
- **Decision:** Use Pydantic AI (`pydantic-ai-slim[google]`) with `output_type` bound to Pydantic models. Output targets the client-side state/form only.
- **Options Considered:**
  1. *Direct write to database from AI:* Dangerous; can corrupt plans or bypass user consent.
  2. *Unstructured string prompt asking for JSON:* Fragile and error-prone.
  3. *Pydantic AI typed output targeting frontend form (Selected):* The member reviews and edits the generated plan before committing to the database. If Gemini is down or returns 429, the app falls back with a friendly plain-language banner while manual planning continues uninterrupted.
- **Why:** Required by RULES.md § 5 and ensures 100% resilience against upstream AI downtime.

---

## Decision 6: Testing Strategy & Offline Hermeticity
- **Date:** 2026-10-11
- **Status:** Approved
- **Decision:** Use Pydantic AI's `TestModel` / `FunctionModel` fixtures for all unit and integration tests.
- **Options Considered:**
  1. *Mocking external HTTP requests manually with respx:* Brittle when SDK internals change.
  2. *Live Gemini API calls in CI/tests:* Requires API key, incurs cost, fails on network drops.
  3. *Pydantic AI TestModel (Selected):* Deterministic, zero network requirement, allows `uv run pytest` to execute 100% offline.
- **Why:** Mandated by RULES.md § 5 ("uv run pytest must pass with no key and no network").

---

## Decision 7: Additive Core Extensions (Models, Access, and Meta Router)
- **Date:** 2026-10-11
- **Status:** Approved
- **Decision:** Preserve all existing Launchbase core files and extend them strictly through additive models and dependencies:
  1. `api/app/models.py`: Preserved `User` model, appended relational tables (`Organization`, `Membership`, `Team`, `TeamMember`, `Invite`, `Plan`, `Task`, `AICallLog`).
  2. `api/app/api/app/access.py`: Preserved `get_current_http_user` and cookie/header auth, appended `TenantContext`, `get_tenant_context` dependency with Anti-Oracle 404 security.
  3. `api/app/api/app/routers/meta.py`: Appended `POST /app/signup` endpoint that reuses existing password hashing and token generation.
- **Options Considered:**
  1. *Forking or rewriting access/auth flow:* Violates Launchbase core preservation rule.
  2. *Separate tenancy middleware:* Complicated in async ASGI context, harder to inject database session.
  3. *Additive Dependency Injection (Selected):* Preserves 100% backward compatibility with Launchbase user tests while securing organization boundaries.
- **Why:** Complies with RULES.md § 1 ("Launchbase core: extend, never replace") and AGENTS.md decision logging requirement.

---

## Decision 8: Minimalist Document-Style Frontend Architecture (`minimalist-ui`)
- **Date:** 2026-10-11
- **Status:** Approved
- **Decision:** Built the customer SaaS frontend (`app/`) adhering strictly to the `minimalist-ui` engineering protocol:
  1. *Palette & Surfaces:* Warm bone canvas (`#FBFBFA` / `#FFFFFF`), cards with `1px solid #EAEAEA` borders, no heavy drop shadows, no neon gradients, and washed-out semantic spot pastels for status pills (Approved/Shipped: `#EDF3EC` text `#346538`; Submitted: `#E1F3FE` text `#1F6C9F`; Draft: `#FBF3DB` text `#956400`; Sent Back: `#FDEBEC` text `#9F2F2D`).
  2. *Typography:* Geist Sans for body/UI, Geist Mono for metadata and Monday dates, tight letter tracking (`-0.02em` to `-0.03em`), and generous macro-whitespace (`max-w-5xl`, `py-8` to `py-10`).
  3. *Multi-Tenant State Management:* Centralized `TenantProvider` in `app/src/contexts/tenant-context.tsx` controlling active organization, active team, role calculation (`isOwner`, `isAdmin`, `isTeamLead`), and Monday-keyed week navigation (`goToPreviousWeek`, `goToNextWeek`, `goToCurrentWeek`).
  4. *Auth & Instant Demo Switcher:* `app/src/routes/login.tsx` providing both Sign-In and Sign-Up (with organization creation or invite token joining), plus an Instant Demo bar for 1-click testing of seeded demo accounts.
  5. *Domain Workspaces:*
     - `_main/dashboard.tsx`: My Weekly Plan (Single Main Task with "why it matters", checkable sub-goals, checkable GTM goals, review status pills, lead review banners, and end-of-week outcome toggle).
     - `_main/team.tsx`: Team's Week Rollup (KPI metrics bento grid, member status cards, and lead review actions: approve or send-back with comments).
     - `_main/history.tsx`: Plan history archive.
     - `_main/settings.tsx`: Organization and team management, team creation, lead assignment, and copyable invite token generation.
- **Why:** Satisfies assessment brief UX and domain requirements while delivering a high-end, uncluttered editorial aesthetic.

---

## Decision 9: AI Backend Architecture, Typed Contracts, and Hermetic Test Hook
- **Date:** 2026-10-12
- **Status:** Approved
- **Decision:** Built the AI Backend service (`api/app/services/ai.py`) and API router (`api/app/api/app/routers/ai.py`) using `pydantic-ai-slim[google]`:
  1. *Strict Typed Output Contracts:* Both agents use Pydantic AI's `output_type` bound directly to Pydantic models (`PlanReviewResult` and `BrainDumpResult`). No raw JSON strings or manual regex parsing.
  2. *Form-Targeted In-Memory Evaluation:* AI review accepts unsaved form state (`PlanReviewRequest`), and brain dump returns drafted items (`BrainDumpResult`) without writing directly to `Plan` or `Task` tables.
  3. *Tenant Telemetry Logging:* Every AI invocation records an audit log entry in `ai_call_logs` with `organization_id`, `user_id`, `feature`, `status` (`success`, `failure`, `rate_limited`, `timeout`), latency, and tokens.
  4. *Hermetic Offline Testing Hook:* Implemented `TEST_OVERRIDE_MODEL` in `app/services/ai.py` enabling unit and integration tests to pass `TestModel(custom_output_args=...)` seamlessly through the HTTP API. This guarantees `uv run pytest` runs 100% offline with zero network and zero secret key dependencies.
  5. *Graceful Degradation:* When `GOOGLE_API_KEY` is not configured, the service responds with a clean HTTP 503 `AI_NOT_CONFIGURED` without crashing the application.
- **Why:** Complies with RULES.md § 5, preserves database integrity, and ensures reliable offline testability.

---

## Decision 10: AI Frontend Integration, In-Flight Controls, and 1-Click Drop-in Rewrites
- **Date:** 2026-10-12
- **Status:** Approved
- **Decision:** Implemented Phase 9 AI UI in `app/` adhering to RULES.md § 5, RULES.md § 7, and `.agents/skills/minimalist-ui/SKILL.md`:
  1. *Form-Targeted State Flow:* AI Brain Dump (`BrainDumpDialog`) extracts 1 Main Task with impact, Sub-Goals, and GTM Goals, directly prefilling the user's local form state without making any writes to the database until the member reviews and clicks "Save Draft".
  2. *Interactive Findings Panel & 1-Click Apply:* `PlanReviewPanel` displays executive assessment, verdict badge (`Ready for Lead` / `Revisions Recommended`), and specific findings categorized by issue type (`vague_activity`, `missing_impact`, `missing_gtm`, `unrealistic_scope`). Each finding contains a 1-click "Apply to Plan" action that drops the suggested rewrite directly into the targeted form field (Main Task title/why, Sub-Goal, or GTM Goal) and removes the finding from the active list.
  3. *In-Flight Debouncing & Anti-Spam:* Neither AI feature triggers automatically on keystrokes. Both require explicit button clicks and disable triggers while mutations are in-flight, showing a clear spinning loader state.
  4. *Resilient Degradation & Dismissible Banners:* Upstream 503 (unconfigured key), 504 (timeout), or 429 (rate limit) exceptions surface polite, non-blocking dismissible error banners, allowing members to continue manual planning without disruption.
- **Why:** Complies with assessment brief requirements and architectural rules while delivering high-agency planning support.

---

## Decision 11: Internal API Architecture, Multi-Tenant Aggregates, and Staff Protection
- **Date:** 2026-10-12
- **Status:** Approved
- **Decision:** Built the `/internal` administrative surface with dedicated routers (`orgs.py`, `users.py`, `ai_usage.py`) strictly gated by `CurrentInternalUser` (`user.is_admin=True` + `aud="internal"`):
  1. *Multi-Tenant Metrics Aggregation:* Computed `member_count`, `team_count`, `plan_count`, and `last_active` via efficient single-query subqueries joining `memberships`, `teams`, `plans`, avoiding N+1 queries.
  2. *Strict Privacy Boundary (Decision 1 Enforcement):* Neither `/internal/orgs` nor any internal endpoint returns plan text, task descriptions, or review comments. Only health metrics and aggregates are exposed to platform staff.
  3. *Staff Killswitch Operations:* Implemented `POST /internal/orgs/{org_id}/suspend` and `POST /internal/orgs/{org_id}/reinstate`, immediately toggling `is_suspended` which gates all `/app` customer requests with HTTP 403 `ORGANIZATION_SUSPENDED`.
  4. *Platform Telemetry:* `GET /internal/ai-usage` provides platform totals, per-organization usage breakdowns, and recent call logs from `ai_call_logs`.
  5. *User Visibility & Account Lockout:* Internal user list attaches organization memberships (`organizations` list) and supports query-based search as well as account deactivation (`POST /internal/users/{id}/deactivate` and `POST /internal/users/{id}/reactivate`).
- **Why:** Delivers complete administrative observability and operational control without compromising tenant confidentiality.

---

## Decision 12: Admin Panel UI Architecture (`internal/`) — Tactical Telemetry & Brutalist Operations Console
- **Date:** 2026-10-12
- **Status:** Approved
- **Decision:** Implemented Phase 11 in `internal/` using the `industrial-brutalist-ui` design language:
  1. *Persistent Internal Marking:* Branded top-level headers and the persistent red `INTERNAL` pill in `Logo.tsx` make staff privileges unmistakable across all routes (`/_main/*`, `/login`).
  2. *Tenant Fleet Management (`/organizations`):* Real-time search by name/slug, live aggregate counts (members, teams, plans, last active date), and 1-click **Suspend** / **Reinstate** killswitch controls with destructive confirmation modals.
  3. *Staff & User Directory (`/users`):* Search by name/email, tenant membership badges with roles (`Acme Corp (owner)`), and 1-click **Deactivate** / **Reactivate** controls with self-deactivation protection.
  4. *AI Telemetry Surveillance (`/ai-usage`):* Monospaced KPI cards (total calls, success rate %, failure counts, HTTP 429 rate limits, and token usage), per-tenant consumption breakdown, and live 50-invocation audit log with latency and error traces.
  5. *Zero Customer Text Exposed:* Stated and enforced across UI: platform operators see only structure, timestamps, and aggregates. Zero customer plan text or task titles are ever loaded.
- **Why:** Satisfies assessment brief administrative requirements and provides full platform operations control while strictly protecting tenant privacy.

---

## Decision 13: Marketing Landing Page Architecture (`site/`) — Anti-Slop Narrative & Interactive AI Showcase
- **Date:** 2026-10-12
- **Status:** Approved
- **Decision:** Implemented Phase 12 in `site/` following `design-taste-frontend` and `brandkit`:
  1. *Anti-Slop Brand Narrative:* Replaced generic boilerplate with human, direct value proposition: "Monday commitments. AI-coached outcomes. Friday results." Addresses standup fatigue and highlights 1 checkable main goal per week.
  2. *Interactive AI Plan Coach Preview:* Built a live side-by-side interactive demo where visitors can toggle between a typical fuzzy engineer draft ("Work on billing webhook fixes") and the AI coach's critique and concrete suggested rewrite ("Stripe webhook idempotency key handling with expired card retries verified on sandbox").
  3. *Cadence Architecture & Rollup Showcase:* Outlines the 3-step weekly rhythm (Monday commitment → mid-week delivery → Friday outcomes) and previews the engineering lead rollup dashboard.
  4. *Technical Rigor & Mobile Responsiveness:* Responsive grid layouts down to mobile phones, full Open Graph / Twitter Card meta tags, and direct CTA links to `http://localhost:3001/signup`.
- **Why:** Establishes a distinct, high-converting product identity and showcases the core AI differentiator authentically without generic corporate jargon.

---

## Decision 14: Unified Monochrome Black & White Redesign Across All Frontends
- **Date:** 2026-10-12
- **Status:** Approved
- **Decision:** Transformed the user interface across all three frontends (`app/`, `internal/`, `site/`) to a cohesive, high-contrast monochrome black-and-white design system adhering to `.agents/skills/high-end-visual-design/SKILL.md`:
  1. *Complete Elimination of Orange:* Removed `#FD6402` and orange styling entirely from all buttons, indicators, steppers, and accents, reserving it exclusively for the brand logo mark itself (`Logo.tsx`).
  2. *Shared Token Architecture:* Replaced primary and accent variables in `styles.css` with clean high-contrast black (`oklch(0.145 0 0)`) and white (`oklch(0.99 0 0)`), locking the interface to light mode.
  3. *Simplified Navigation & Hierarchy:* Fixed sidebar to 220px expanded width with high-contrast active states. Redesigned plan commitment cards, action buttons, and status indicators with rounded-full pill buttons and tactile active states.
  4. *Zero Backend Impact:* All changes are purely presentation layer; no API routes, models, or backend logic were modified.
- **Why:** Resolves UI clutter and visual complexity, avoids brand color bleeding between logo and chrome, and delivers an intuitive, premium user experience.

---

## Decision 15: Optional AI Extra Selection — End-of-Week Retrospective Summary
- **Date:** 2026-10-12
- **Status:** Approved & Implemented
- **Decision:** Selected and implemented Option 1 from the brief: **End-of-Week Summary** (`POST /orgs/{org_id}/ai/week-summary`).
  1. *Purely Additive Architecture:* Zero changes to existing database models, migrations, or existing endpoints (`/ai/review`, `/ai/brain-dump`). Only new schemas (`WeekSummaryRequest`, `WeekSummaryResult`), service function `generate_week_summary`, and endpoint.
  2. *Status & Ownership Gating:* The endpoint requires the plan to be in `approved` or `done` status (rejecting draft plans with HTTP 400 `PLAN_NOT_FINALIZED`), and verifies the caller is the plan owner or team lead / org admin (HTTP 403 `PERMISSION_DENIED`).
  3. *Client-Facing Presentation Only:* Output never writes to the database; it is presented via `WeekSummaryDialog` with copy-to-clipboard support and carryover advice.
  4. *Offline Test Coverage:* Built hermetic tests using `TestModel` in `api/tests/api/app/test_ai.py` verifying response shape and `AICallLog` telemetry (`feature="week_summary"`).
- **Options Considered:**
  1. *Look-Back Carryover Agent (Tool Calling):* Higher complexity, changes Pydantic AI agent creation pattern to require session-bound tool calling, introduces brittle cross-session state.
  2. *Team Digest for Lead:* Redundant with the lead's existing team dashboard rollup.
  3. *End-of-Week Summary (Selected):* Lowest risk, highest signal for Friday retrospectives, directly consumes existing task completion booleans and outcome flags.
- **Why:** Complies with RULES.md § 6 (at most one optional AI extra), minimizes regression risk across the 47+ existing test suite, and completes the full weekly loop (Monday commitment → mid-week delivery → Friday retrospective).


