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
