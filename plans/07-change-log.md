# Project Change Log

> Append-only chronicle of every meaningful file change, new endpoint, and migration.
> Provides an audit trail and junior-friendly explanations for interview defense.

---

## [2026-10-11 18:30] [Antigravity IDE] Project Governance & Core Rules Setup
- What changed:
  - Created `RULES.md`
  - Created `CLAUDE.md`
  - Updated `AGENTS.md`
- Why: Requirement Phase 0 (Codebase setup, rules of engagement, multi-agent protocol).
- How it works: Establishes non-negotiable architectural boundaries preventing agents from accidentally replacing Launchbase core auth, introducing unauthorized libraries, or leaking customer tenancy. Links agent configurations so IDE and CLI agents share identical guidelines.
- Core file touched? no
- How to verify: Read `RULES.md` and `AGENTS.md` to ensure they contain strict tenancy, naming safety, and workflow directives.
- Commit: chore: establish rules, claude config, and agent workflow guidelines

---

## [2026-10-11 18:40] [Antigravity IDE] Master Planning & Tracking Foundation
- What changed:
  - Created `plans/00-master-plan.md`
  - Created `plans/01-requirements-checklist.md`
  - Created `plans/02-data-model-and-tenancy.md`
  - Created `plans/03-decisions.md`
  - Created `plans/04-ai-design.md`
  - Created `plans/06-cut-list.md`
  - Created `plans/07-change-log.md`
- Why: Phase 1 planning deliverables and tracking infrastructure.
- How it works: Lays out the comprehensive 14-phase implementation plan, the granular verification checklist, the complete relational multi-tenant database schema, explicit decision rationale, AI prompt contracts, and scope boundaries.
- Core file touched? no
- How to verify: Check that all documents in `plans/` exist and align with assessment requirements.
- Commit: docs: complete initial architecture specifications and plans

---

## [2026-10-11 20:30] [Antigravity IDE] Phase 3: Multi-Tenant Data Models & Alembic Migration
- What changed:
  - Edited `api/app/models.py` (added Organization, Membership, Team, TeamMember, Invite, Plan, Task, AICallLog)
  - Created `api/migrations/versions/e8acb20d769e_create_multi_tenant_tables.py`
- Why: Phase 3 (Data Model & Schema Migration) per 00-master-plan.md.
- How it works: Extends SQLAlchemy models with organization-scoped entities, linking users via memberships and teams, storing Monday-keyed plans with task breakdowns, and logging AI calls. Applied cleanly via Alembic revision `e8acb20d769e`.
- Core file touched? yes (logged in Decision 7 in plans/03-decisions.md)
- How to verify: `uv run alembic upgrade head` and `uv run pytest -v` (12 passed).
- Commit: feat(db): create multi-tenant tables and alembic migration

---

## [2026-10-11 21:12] [Antigravity IDE] Phase 4: Auth & Organization Tenancy API
- What changed:
  - Edited `api/app/api/app/schemas.py` (added SignupRequest, Org schemas, Member schemas, Invite schemas)
  - Edited `api/app/api/app/access.py` (added TenantContext, get_tenant_context, role guard dependencies)
  - Created `api/app/services/orgs.py` (OrganizationService for org & member management)
  - Created `api/app/services/invites.py` (InviteService for secure token generation and joins)
  - Edited `api/app/api/app/routers/meta.py` (added POST /app/signup)
  - Created `api/app/api/app/routers/orgs.py` (orgs, members, and invites endpoints)
  - Edited `api/app/api/app/router.py` (registered orgs router under /app)
  - Created `api/tests/api/app/test_auth.py` (signup, duplicate email, invite join tests)
  - Created `api/tests/api/app/test_orgs.py` (org CRUD, anti-oracle 404, role authorization, suspended org lockout)
- Why: Phase 4 (Auth & Organization Tenancy) serving Checklist § 2 and § 6.
- How it works: Provides sign-up issuing HttpOnly session cookies, allows org creation with automatic owner assignment, handles join tokens without external email dependencies, and enforces strict tenant boundary isolation with Anti-Oracle 404 responses for cross-tenant probes.
- Core file touched? yes (logged in Decision 7 in plans/03-decisions.md)
- How to verify: `cd ~/WeekSync/api && uv run pytest -v` (21 passed).
- Commit: feat(api): implement auth signup, org management, and anti-oracle tenancy

---

## [2026-10-11 21:24] [Antigravity IDE] Phase 5: Teams & Weekly Plans API
- What changed:
  - Edited `api/app/api/app/schemas.py` (added Team schemas, Plan schemas, Task schemas, and TeamWeekResponse)
  - Created `api/app/services/teams.py` (TeamService for team CRUD, member assignment, and lead management)
  - Created `api/app/services/plans.py` (PlanService for Monday validation, task breakdowns, approvals, and team weekly rollups)
  - Created `api/app/api/app/routers/teams.py` (teams and team members endpoints)
  - Created `api/app/api/app/routers/plans.py` (plans, task ticking, approvals, send-back with comments, outcome shipping, and team week view)
  - Edited `api/app/api/app/router.py` (registered teams and plans routers)
  - Created `api/tests/api/app/test_teams.py` (team CRUD, membership, leads, and anti-oracle cross-tenant tests)
  - Created `api/tests/api/app/test_plans.py` (Monday-date validation, main task validation, review lifecycle, lead approvals, task ticking, goal shipped flag, and anti-oracle tests)
- Why: Phase 5 (Teams & Plans) serving Checklist § 3, § 4, § 5, and § 6.
- How it works: Enforces Monday-keyed weekly plans containing a main task with "why it matters", sub-goals, and GTM goals. Provides strict role gates where only assigned team leads (or org admins) can approve or send back plans with comments. Ticks task progress and records week-end outcome. Produces a Team's Week overview aggregating all members' plans and progress.
- Core file touched? no
- How to verify: `cd ~/WeekSync/api && uv run pytest -v` (30 passed).
- Commit: feat(api): implement teams, weekly plans, lead review lifecycle, and team-week rollup

---

## [2026-10-11 21:28] [Antigravity IDE] Phase 6: Seed CLI Command v1
- What changed:
  - Edited `api/app/cli/commands.py` (added idempotent `seed` CLI command)
- Why: Phase 6 (Seed Command v1) serving Checklist § 7.
- How it works: Provides `uv run manage.py seed` command that creates platform staff, two organizations (`Acme Corp`, `Globex Media`), teams with leads, members in all roles, and several weeks of sample plans (completed/shipped, completed/missed goal, approved in-flight, submitted, draft). Prints demo login credentials for manual UI and API verification.
- Core file touched? no
- How to verify: `cd ~/WeekSync/api && uv run manage.py seed`
- Commit: feat(cli): implement idempotent seed command with sample orgs, teams, and weekly plans

---

## [2026-10-11 23:45] [Antigravity IDE] Phase 7: Customer App UI (`app/`)
- What changed:
  - Created `app/src/components/Logo.tsx` (minimalist WeekSync geometric logomark and wordmark)
  - Created `app/src/contexts/tenant-context.tsx` (TenantProvider managing active org, active team, role calculation, and Monday-keyed week navigation)
  - Created `app/src/components/dashboard/sidebar.tsx` (minimalist sidebar with org switcher wrapped in Base UI DropdownMenuGroup, team switcher, and navigation)
  - Created `app/src/routes/login.tsx` (tabbed Sign In / Sign Up with instant 1-click Demo credentials login)
  - Created `app/src/routes/_main/dashboard.tsx` (My Weekly Plan workspace with main task, why-it-matters, sub-goals, GTM goals, review status pill, review comment banners, and goal shipped toggle)
  - Created `app/src/routes/_main/team.tsx` (Team's Week rollup with KPI bento grid, member cards, and inline lead approval/send-back actions)
  - Created `app/src/routes/_main/history.tsx` (plan history archive)
  - Created `app/src/routes/_main/settings.tsx` (organization & team settings, member roles, team creation, and copyable invite tokens)
- Why: Phase 7 Customer App UI serving Checklist § 2, § 3, § 4, § 5, § 6, and § 9.
- How it works: Follows `minimalist-ui` warm bone monochrome styling, renders responsive customer dashboards, connects to TanStack Query and Orval-generated API hooks, and validates 100% clean with `npm run validate`.
- Core file touched? no
- How to verify: `cd ~/WeekSync/app && npm run validate` and test in browser at `http://localhost:3001`.
- Commit: feat(ui): customer app screens, minimalist design system, and multi-tenant navigation

---

## [2026-10-12 00:20] [Antigravity IDE] Phase 8: AI Backend (`api/`)
- What changed:
  - Installed `pydantic-ai-slim[google]>=2.55.0` in `api/pyproject.toml`
  - Edited `api/app/config.py` (added `GOOGLE_API_KEY` and `AI_MODEL` settings)
  - Edited `api/.env.example` (added empty `GOOGLE_API_KEY=` and `AI_MODEL=google:gemini-2.5-flash`)
  - Edited `api/app/api/app/schemas.py` (added `FindingType`, `PlanFinding`, `PlanReviewResult`, `PlanReviewRequest`, `DraftTask`, `BrainDumpResult`, `BrainDumpRequest`)
  - Created `api/app/services/ai.py` (Plan Review Agent "Approval Meeting in a Box", Brain Dump Agent "Draft from Notes", tenant telemetry logging to `AICallLog`, timeout/rate-limit/failure mapping, and `TEST_OVERRIDE_MODEL` hook)
  - Created `api/app/api/app/routers/ai.py` (`POST /orgs/{org_id}/ai/review` and `POST /orgs/{org_id}/ai/brain-dump` endpoints)
  - Edited `api/app/api/app/router.py` (registered `ai.router`)
  - Edited `api/app/main.py` (registered `"ai"` openapi tag)
  - Created `api/tests/api/app/test_ai.py` (offline hermetic tests for plan review, brain dump, tenant isolation, unconfigured fallback, and suspended org protection using `TestModel`)
  - Regenerated frontend API client hooks via `npm run generate` in `app/`
- Why: Phase 8 (AI Backend) serving Checklist § 10 and RULES.md § 5.
- How it works: Employs strict Pydantic AI `output_type` contracts returning typed evaluations directly to the caller without modifying `Plan` or `Task` tables. Logs all calls per organization in `ai_call_logs`. Supports hermetic offline testing via `TestModel` with zero network and zero secret key dependencies.
- Core file touched? no
- How to verify: `cd ~/WeekSync/api && uv run ruff check app/services/ai.py app/api/app/routers/ai.py tests/api/app/test_ai.py` and `cd ~/WeekSync/app && npm run validate`.
- Commit: feat(ai): plan review agent, brain dump agent, telemetry logging, and offline tests

---

## [2026-10-12 01:00] [Antigravity IDE] Phase 9: AI UI (`app/`)
- What changed:
  - Created `app/src/components/ai/PlanReviewPanel.tsx` (Plan review panel with verdict badge, strategic assessment, categorized findings list, and `InlineFindingCard` for inline form callouts)
  - Created `app/src/components/ai/BrainDumpDialog.tsx` (Scratchpad modal with notes textarea, character counter, in-flight loading state, and draft prefill callback)
  - Updated `app/src/routes/_main/dashboard.tsx` (Integrated 'Draft with AI' and 'AI Review' buttons in header and footer action bars, top executive `PlanReviewPanel`, inline task critique badges next to Main Task, Sub-Goals, and GTM goals with 1-click suggested rewrites, and dismissible fallback banners for 503/504/429)
  - Ran `npm run validate` (type-check, lint, formatting 100% clean)
- Why: Phase 9 (AI UI) serving Checklist § 10 (Plan Review UI, Brain Dump Draft, and Integration Requirements).
- How it works: Form-targeted AI interaction where neither feature writes directly to the database. Brain dump prefills the form state for user review, and AI review displays both top-level findings and inline cards next to flagged tasks with 1-click suggested rewrite application.
- Core file touched? no
- How to verify: `cd ~/WeekSync/app && npm run validate` (0 errors, 0 warnings).
- Commit: feat(ui): ai plan review findings panel, inline task critiques, and brain dump scratchpad modal

---

## [2026-10-12 11:55] [Antigravity IDE] Phase 10: Internal API (`api/`)
- What changed:
  - Updated `api/app/api/internal/schemas.py` (added `UserOrgMembershipResponse`, `InternalOrganizationResponse`, `InternalOrganizationsListResponse`, `AICallLogResponse`, `OrgAIUsageSummary`, `AIUsageOverviewResponse`, and updated `InternalUserResponse` to include `organizations` list)
  - Updated `api/app/services/orgs.py` (added `list_organizations_internal`, `get_organization_internal`, `suspend_organization`, `reinstate_organization` with single-query subquery counts for members, teams, plans, and last active)
  - Updated `api/app/services/users.py` (added `search` parameter to `list_users`, `get_user_organizations_map` batch loader, `deactivate_user`, and `reactivate_user`)
  - Created `api/app/services/ai_usage.py` (added `AIUsageService` computing global telemetry, per-organization aggregations, and recent call logs)
  - Created `api/app/api/internal/routers/orgs.py` (endpoints for `GET /internal/orgs`, `GET /internal/orgs/{id}`, `POST /internal/orgs/{id}/suspend`, and `POST /internal/orgs/{id}/reinstate`)
  - Created `api/app/api/internal/routers/ai_usage.py` (endpoint for `GET /internal/ai-usage`)
  - Updated `api/app/api/internal/routers/users.py` (added search filtering, attached organization memberships, and added `POST /users/{id}/deactivate` and `POST /users/{id}/reactivate`)
  - Updated `api/app/api/internal/router.py` (registered `orgs.router` and `ai_usage.router`)
  - Updated `api/app/main.py` (registered `"orgs"` and `"ai_usage"` openapi tags on `internal_api`)
  - Created internal test suite in `api/tests/api/internal/`:
    - `test_orgs.py`: tests for aggregate counts, search, suspension/reinstatement lockout, non-admin 401/403 rejection, and Decision 1 enforcement (no plan text leaks).
    - `test_users.py`: tests for search by name/email, organization memberships listing, account deactivation/reactivation, and non-admin 401 rejection.
    - `test_ai_usage.py`: tests for AI telemetry summary, per-org breakdowns, recent call logs, and customer access lockout.
- Why: Phase 10 (Internal API) serving Checklist § 9 (Internal Admin Panel backend) and Master Plan § 10.
- How it works: All internal endpoints are protected by `CurrentInternalUser` (`user.is_admin=True` + `aud="internal"`). Non-admins and app-scoped tokens are refused with 401/403. Plan text is never exposed to staff. Org suspension instantly revokes customer access with HTTP 403 `ORGANIZATION_SUSPENDED`.
- Core file touched? no (preserves Launchbase internal access mechanisms and models additively)
- How to verify: `cd ~/WeekSync/api && uv run pytest -v tests/api/internal/`
- Commit: feat(internal-api): staff org management, suspension lifecycle, user search, and ai usage telemetry

---

## [2026-10-12 13:30] [Antigravity IDE] Phase 11: Admin Panel UI (`internal/`)
- What changed:
  - Branded `internal/src/components/Logo.tsx` with WeekSync logomark and persistent red `INTERNAL` pill.
  - Updated `internal/src/routes/__root.tsx` title to `WeekSync Internal` and description.
  - Updated `internal/src/components/dashboard/sidebar.tsx` with navigation for Dashboard (`/dashboard`), Organizations (`/organizations`), Users (`/users`), and AI Telemetry (`/ai-usage`).
  - Created `internal/src/routes/_main/organizations.tsx` (Tactical tenant fleet management with name/slug search, member/team/plan aggregate counts, last active timestamps, status badges, and 1-click Suspend / Reinstate controls with confirmation dialogs; strictly adheres to Decision 1 with zero customer plan text rendered).
  - Updated `internal/src/routes/_main/users.tsx` (Added real-time name/email search input, multi-tenant organization membership badges with roles, and 1-click account Deactivate / Reactivate actions with self-protection).
  - Created `internal/src/routes/_main/ai-usage.tsx` (Gemini telemetry surveillance with KPI cards for total calls, success rate %, provider failures, HTTP 429 rate limits, and tokens; per-tenant consumption breakdown table; and live 50-invocation audit log with latency and error traces).
  - Fixed `eslint(curly)` single-line `if` statements in `src/routes/_main/organizations.tsx` and `src/routes/_main/ai-usage.tsx`.
- Why: Phase 11 (Admin Panel UI) serving Checklist § 9 (Internal Admin Panel) and Master Plan § 11.
- How it works: Employs `industrial-brutalist-ui` design language with high data density, monospaced metadata, tactical telemetry cards, and distinct `INTERNAL PLATFORM OPS` status headers. All operations hook directly into Orval-generated TanStack Query hooks.
- Core file touched? no
- How to verify: `cd ~/WeekSync/internal && npm run validate` and browse `http://localhost:3002`.
- Commit: feat(internal): brutalist operations console, tenant fleet controls, and ai telemetry dashboard

---

## [2026-10-12 13:40] [Antigravity IDE] Phase 12: Marketing Landing Page (`site/`)
- What changed:
  - Created `site/src/components/logo.tsx` with WeekSync SVG logomark and wordmark lockup.
  - Updated `site/src/routes/__root.tsx` with high-converting title, meta description, and complete Open Graph / Twitter Card tags.
  - Replaced boilerplate in `site/src/routes/index.tsx` with anti-slop marketing page (`design-taste-frontend` + `brandkit`):
    - Top announcement bar and sticky header with WeekSync branding and links.
    - Hero section: "Monday commitments. AI-coached outcomes. Friday results." with primary CTA to `http://localhost:3001/signup`.
    - Cadence stats strip highlighting 5-minute commitments, 1 main goal, and 0 standup meetings.
    - Interactive live AI Plan Review demo: interactive toggle demonstrating how AI flags vague tasks ("Work on billing fixes") and provides checkable rewrites ("Stripe webhook idempotency key handling with expired card retries verified on sandbox").
    - The 3-Step Rhythm breakdown: 01 Monday Plan Commitment, 02 Mid-week AI Review & Lead Sign-off, 03 Friday Outcomes & Shipped Goals.
    - Engineering leadership section with live team rollup card preview.
    - Old Way vs. WeekSync cadence comparison matrix.
    - Comprehensive FAQ addressing weekly planning cadence, AI coach mechanics, and enterprise data privacy.
    - High-impact closing call to action and branded footer.
  - Generated `site/src/routeTree.gen.ts` to ensure clean routing compilation.
- Why: Phase 12 (Landing Page) serving Checklist § 11 (Landing Page) and Master Plan § 12.
- How it works: Authentic, human-toned B2B SaaS landing page designed for technical founders and engineering managers. Direct links route users to the customer app on port 3001. No generic placeholder text or template slop.
- Core file touched? no
- How to verify: `cd ~/WeekSync/site && npm run validate` and browse `http://localhost:3000`.
- Commit: feat(site): anti-slop marketing landing page, interactive ai review showcase, and cadence comparison matrix

---

## [2026-10-12 15:45] [Antigravity IDE] Phase 13: Full 3-Surface UI Redesign & Brand Color Alignment
- What changed:
  - Redesigned Customer SaaS App (`app/` on port 3001):
    - `app/src/styles.css`: Implemented authentic WeekSync Orange palette (`#FD6402` / `oklch(0.64 0.215 42)` light, `oklch(0.67 0.215 42)` dark) with neutral deep Zincs, `.liquid-glass`, `.diffusion-shadow`, and `.active-press`.
    - `app/src/components/ui/button.tsx`: Added `active:scale-[0.98]` tactile micro-interaction.
    - `app/src/routes/login.tsx`: Split-screen high-agency layout with tabbed auth, organization create/join mode, and role-grouped Instant Demo Sandbox selector.
    - `app/src/components/dashboard/sidebar.tsx`: Fluid sidebar with elevated organization & team switcher dropdown, active checkmarks, and role badges.
    - `app/src/routes/_main/dashboard.tsx`: Weekly Plan Studio overhaul with bold sans typography, 4-stage commitment lifecycle stepper, Commitment Hero Card for Main Task with celebratory shipping toggle, dual-pillar Sub-Goals & GTM execution bento, and floating sticky bottom dock.
    - `app/src/components/ai/PlanReviewPanel.tsx`: Polished badges with calibrated tints and 1-click "Apply Rewrite" action.
    - `app/src/routes/_main/team.tsx`: Team health KPI ribbon, visual member cards, and quick lead review actions.
    - `app/src/routes/_main/history.tsx` and `settings.tsx`: Elevated layout, copyable invite tokens, and refined status pills.
  - Redesigned Marketing Landing Page (`site/` on port 3000):
    - `site/src/styles.css`: Harmonized tokens to WeekSync Orange.
    - `site/src/components/ui/button.tsx`: Tactile active scale feedback.
    - `site/src/routes/index.tsx`: High-agency asymmetric hero with brand orange ambient glow, live interactive AI Plan Coach demo with 1-click rewrite toggle, 3-step cadence walkthrough, and cadence comparison table.
  - Redesigned Platform Staff Console (`internal/` on port 3002):
    - `internal/src/styles.css`: Aligned tokens with brand orange while preserving tactical industrial telemetry identity.
    - `internal/src/components/dashboard/sidebar.tsx`: Elevated active navigation state.
    - `internal/src/routes/_main/dashboard.tsx`, `organizations.tsx`, `login.tsx`, `FullScreenLoader.tsx`: Harmonized with design system tokens.
  - Brand Palette Harmonization: Corrected theme palette to strictly match the authentic WeekSync Orange logo mark (`#FD6402`), eliminating mismatched blue secondary colors across all 3 frontends.
- Why: User requested a complete redesign of all 3 UIs without touching the backend, followed by color correction aligning with the orange logo.
- How it works: Completely updates styling and layout structures across all 3 frontends using Tailwind CSS v4 and shadcn/ui primitives. Backend (`api/`) remains 100% untouched. All data flows continue using Orval generated hooks and Launchbase session auth.
- Core file touched? no (zero edits to api/ or shared backends)
- How to verify:
  - `cd ~/WeekSync/app && npm run validate`
  - `cd ~/WeekSync/site && npm run validate`
  - `cd ~/WeekSync/internal && npm run validate`
- Commit: (uncommitted, awaiting user instruction)

---

## [2026-10-12 19:10] [Antigravity IDE] Phase 15: Optional AI Extra — End-of-Week Retrospective Summary
- What changed:
  - Appended schemas `WeekSummaryResult` and `WeekSummaryRequest` to `api/app/api/app/schemas.py`.
  - Added `WEEK_SUMMARY_SYSTEM_PROMPT`, formatting helper `_format_plan_for_summary`, and service function `generate_week_summary` to `api/app/services/ai.py` with 15s timeout, model-not-found fallback to `gemini-2.5-flash`, and telemetry logging in `ai_call_logs` (`feature="week_summary"`).
  - Added `POST /orgs/{org_id}/ai/week-summary` endpoint to `api/app/api/app/routers/ai.py`, with plan status verification (must be `approved` or `done`) and ownership/lead authorization checks.
  - Added hermetic offline test suite in `api/tests/api/app/test_ai.py` (`test_ai_week_summary_offline_success` and `test_ai_week_summary_draft_plan_rejected`) using `TestModel`.
  - Added typed TypeScript models `WeekSummaryRequest`, `WeekSummaryResult`, and mutation hook `useAiWeekSummary` in `app/src/api/`.
  - Created `app/src/components/ai/WeekSummaryDialog.tsx` with headline display, shipped vs incomplete item lists, root-cause analysis, carryover advice, and 1-click clipboard copy.
  - Integrated "AI Week Summary" action buttons into `app/src/routes/_main/dashboard.tsx` in top action bar, Friday outcome block, and bottom summary dock.
  - Updated `plans/06-cut-list.md`, `plans/03-decisions.md` (Decision 15), and `logs/SESSION_LOG.md`.
- Why: Implements the single approved optional AI feature from assessment brief § "If you have time left over" (Option 1) strictly governed by RULES.md § 6.
- How it works: Form/dialog targeted AI retrospective synthesis that evaluates the member's final delivered state (tasks marked completed and main goal shipped outcome) and produces a crisp narrative of what shipped, what didn't, and why, without ever writing directly to the database.
- Core file touched? no (purely additive models, routes, and UI components; zero existing code broken).
- How to verify:
  - `cd ~/WeekSync/api && uv run pytest -v tests/api/app/test_ai.py`
  - Verify in Customer App (`http://localhost:3001`): Open an approved plan, click "AI Week Summary", view retrospective modal.

---

## [2026-10-13 17:50] [Antigravity IDE] Phase 6: Seed CLI Expansion (Past 3 Weeks + Current Week)
- What changed:
  - Updated `api/app/cli/commands.py` inside `seed()` command:
    - Added team membership for organization owners (`acme_owner` to `acme_eng`, `globex_owner` to `globex_dev`).
    - Computed Monday dates for 4 weeks: `three_weeks_ago` (-21 days), `two_weeks_ago` (-14 days), `last_monday` (-7 days), and `this_monday` (0 days).
    - Seeded diverse, realistic weekly plans across all 4 weeks for Acme Corp (`acme_member` Charlie Day, `acme_designer` Dana Scully, `acme_lead` Bob Stone, `acme_owner` Alice Vance) and Globex Media (`globex_member` Carl Carlson, `globex_lead` Homer Simpson).
    - Diverse domain tasks covering authentication, billing, design tokens, CI/CD, mobile responsiveness, Friday celebration retros, security review packages, media transcoding, audio synchronization, and high-availability Redis clustering.
    - Varied realistic plan statuses: completed & shipped, completed & missed (with retrospective comments), lead-approved, submitted awaiting review, and draft.
    - Updated CLI success output with date breakdown and accurate ports (port 3001 for Customer App, port 3002 for Staff Admin Console).
- Why: User requested plans for the past 3 weeks in `commands.py` with different things to seed historical weekly data across the platform.
- How it works: `seed_plan` is idempotent; runs UPSERT query on `(user_id, week_start_date)` and replaces tasks so repeated `uv run manage.py seed` runs refresh or create plans cleanly without unique constraint collisions.
- Core file touched? no
- How to verify:
  - Run `uv run manage.py seed` in `api/`
  - In Customer App (`http://localhost:3001`), navigate between past weeks or open History (`/history`) to inspect past 3 weeks of commitments.

---

## [2026-10-13 18:12] [Antigravity IDE] Frontend Error Handling & Structured Message Extraction Fix
- What changed:
  - Updated `app/src/lib/api-client.ts` and `internal/src/lib/api-client.ts`: Added `extractApiMessage` helper in `ApiError` constructor so `error.message` automatically unpacks FastAPI's structured `{ detail: [{ msg, loc, type }] }` array, string `detail`, and `message` properties rather than hardcoding the generic fallback `"API request failed with status ${status}"`.
  - Updated `app/src/lib/utils.ts`: Upgraded `getErrorMessage` to cleanly parse FastAPI validation error arrays (`detail[0].msg`), string details, and network `TypeError`s with clean fallbacks.
  - Updated `app/src/routes/login.tsx`: Replaced hardcoded `err.message` references in `loginMutation` and `signupMutation` with `getErrorMessage`, allowing human-friendly server messages (e.g. "Incorrect username or password", "A user with this email already exists") to be surfaced in the UI error banner.
- Why: Fixes issue where all API errors displayed the identical cryptic message `"Error: API request failed with status 401"` instead of explaining the actual root cause.
- How it works: Server errors returned in FastAPI's `{ detail: [...] }` format are unwrapped directly by `ApiError` and `getErrorMessage` before reaching UI error state.
- Core file touched? no (frontend client utilities only)
- How to verify:
  - Navigate to `http://localhost:3001/login`
  - Enter wrong password or unregistered email -> verify banner says "Incorrect username or password" instead of "API request failed with status 401"
  - Switch to "Create Account" tab -> verify the password input has the eye toggle icon to show/hide password
  - Sign in with seeded credentials (`owner@acme.com` / `Password123!`) -> verify login succeeds smoothly.

---

## [2026-10-13 19:05] [Antigravity IDE] AI Service Gemini Model Resolution & Timeout Fix (504 Gateway Timeout)
- What changed:
  - Updated `api/app/services/ai.py`:
    1. In `get_agent`: Resolved the specification placeholder `gemini-3.5-flash-lite` directly to the active `gemini-2.5-flash` model so API requests execute immediately on the first attempt without burning 5-8 seconds on a guaranteed Google API 404 roundtrip.
    2. In `review_plan`, `draft_plan_from_brain_dump`, and `generate_week_summary`: Increased `asyncio.timeout` from 15.0 seconds to 30.0 seconds, providing sufficient headroom for full structured LLM response generation over public network connections.
- Why: Fixes `504 Gateway Timeout` (`AI_TIMEOUT`) when generating AI End-of-Week Summaries (`POST /orgs/{org_id}/ai/week-summary`).
- How it works: Eliminates the 404 delay from the non-existent 3.5 model catalog name and extends execution timeout to 30s.
- Core file touched? no (preserves model config and settings interfaces)
- How to verify:
  - Open an approved/completed plan on `http://localhost:3001` (e.g. Charlie Day or Dana Scully past weeks)
  - Click "AI Week Summary"
  - Verify the summary modal loads within 4-7 seconds with headline, shipped items, and carryover advice.

---

## [2026-10-13 19:15] [Antigravity IDE] Plan History Team Filter & Organization Archive Fallback
- What changed:
  - Updated `app/src/routes/_main/history.tsx`:
    1. Removed rigid requirement on `currentTeamId` in query enablement (`enabled: !!user && !!currentOrgId`), preventing history from silently breaking when `currentTeamId` is empty or transitioning.
    2. Added team filter pills (`All Teams`, plus each team in the organization like `Engineering`, `QA Squad`) defaulting to `"all"`, allowing users to view organization-wide history or drill down into specific squads.
    3. Added member attribution to each historical plan card: avatar initials, full name (`plan.user_name`), team badge, and status pill supporting `done` / `approved`.
    4. Enhanced empty states with contextual advice and a 1-click "View All Teams" button when an empty newly created squad is selected.
- Why: Fixes issue where `/history` showed "No historical plans found" if a newly created empty team (such as "QA Squad") was active in the workspace or if team selection was pending.
- How it works: Passes `undefined` for `team_id` when "All Teams" is selected, letting the backend return all 16 historical plans for Acme Corp.
- Core file touched? no (presentation layer only)
- How to verify:
  - Open `http://localhost:3001/history` as an Acme Corp user.
  - Verify all 16 chronological plans render across all 4 weeks.
  - Click team filter pills ("All Teams", "Engineering", "QA Squad") to filter by squad.
