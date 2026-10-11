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
