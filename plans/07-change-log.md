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

