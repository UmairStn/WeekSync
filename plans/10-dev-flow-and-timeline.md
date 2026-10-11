# Development Flow & 2-Day Implementation Schedule

> Operational handbook: per-phase working loops, local run orchestration, git branching, and time-boxed execution schedule.
> Targets completion in 2 working days (~12 hours total effort) with Day 3 as safety buffer.

---

## 1. Per-Phase Working Loop (Standard Operating Procedure)

Every phase from Phase 2 through Phase 13 executes the identical 8-step cycle:

```
[1. Re-read Docs] ──> [2. Phase Plan & OK] ──> [3. Backend & Tests] ──> [4. Client Gen]
                                                                               │
[8. Commit & Hand-off] <── [7. Update Logs] <── [6. Tenancy Check] <── [5. UI & Seed Check]
```

1. **Re-read Context:** Review phase scope in `plans/00-master-plan.md`, `plans/08-codebase-map.md`, and (for UI work) `plans/09-ui-skills.md`.
2. **Draft Phase Plan:** Specify exact files, endpoints, components, and tests to create or edit. Stop and obtain human lead sign-off if touching protected core or modifying scope.
3. **Backend Implementation:**
   - Define model additions.
   - Autogenerate and review migration (`uv run alembic revision --autogenerate -m "..."`).
   - Implement business logic in `api/app/services/` (service flushes).
   - Expose endpoints in `api/app/api/.../routers/` (router commits).
   - Write unit and tenancy tests (`tests/api/...`).
   - Run `uv run pytest` until completely green.
4. **Regenerate Typed API Client:**
   - Execute `npm run generate` in `app/` and/or `internal/`.
   - Verify generated hooks and models in `src/api/`.
5. **Frontend Implementation & Seed Check:**
   - Build UI components using pre-installed shadcn/ui and Tailwind.
   - Test screen workflows with seeded test accounts in the browser.
6. **Rules & Tenancy Self-Review:**
   - Confirm no protected files were replaced or bypassed.
   - Confirm all customer queries are scoped by validated `organization_id`.
   - Confirm cross-tenant queries return 404.
7. **Synchronize Tracking & Documentation:**
   - Append entry to `plans/07-change-log.md`.
   - Update `plans/08-codebase-map.md` if directories/files changed.
   - Tick verified items in `plans/01-requirements-checklist.md`.
   - Update `logs/SESSION_LOG.md` and log time in `logs/HOURS.md`.
8. **Commit & Verification Hand-off:**
   - Commit with atomic message (`feat(phase-N): ...`).
   - Provide human lead with exact command or browser click path to verify.

---

## 2. Local Environment & Run Flow

Assumes Docker, Python 3.12 (via uv), and Node 24+ are configured.

### Local Ports & Services
| Service | Surface | Port | Command |
| :--- | :--- | :---: | :--- |
| **PostgreSQL 16** | Database | `5432` | Started via Docker (`docker compose up -d postgres`) |
| **FastAPI Backend** | API (`/app` & `/internal`) | `8000` | `cd api && uv run fastapi dev app/main.py --port 8000` |
| **Customer App** | Customer UI | `3000` | `cd app && npm run dev` |
| **Admin Console** | Platform Staff UI | `3001` | `cd internal && npm run dev` |
| **Marketing Site**| Landing Page | `3002` | `cd site && npm run dev` |

*(Note: `.tmuxp.yaml` automates launching these 4 services concurrently).*

### Key CLI Commands
- **Run Migrations:** `cd api && uv run alembic upgrade head`
- **Seed Test Data:** `cd api && uv run manage.py seed`
- **Create Admin Staff:** `cd api && uv run manage.py create-user --admin`
- **Run Test Suite:** `cd api && uv run pytest` *(starts its own ephemeral Docker Postgres)*
- **Regenerate Client:** `cd app && npm run generate` (and `cd internal && npm run generate`)

---

## 3. Git Branching Strategy
- Main branch (`main`) must **never be broken**.
- Work executes on dedicated branches per phase:
  - `phase-2-brand`
  - `phase-3-datamodel`
  - `phase-4-auth-orgs`
  - `phase-5-teams-plans`
  - `phase-6-seed`
  - `phase-7-customer-ui`
  - `phase-8-ai-backend`
  - `phase-9-ai-ui`
  - `phase-10-internal-api`
  - `phase-11-admin-ui`
  - `phase-12-landing-page`
  - `phase-13-cleanup`
- Fast-forward merge into `main` only after tests pass and lead approves phase verification.

---

## 4. The 2-Day Schedule (~12 Hours Target Effort)

### Day 1: Backend Foundation, Tenancy, Core UI, & AI Engine (~6.5 Hours)
*Focus: Data integrity, bulletproof multi-tenancy, plan lifecycle, and customer app core.*

| Phase | Description | Time Box | Cumulative |
| :--- | :--- | :---: | :---: |
| **Phase 0 & 1** | Codebase audit, rules setup, architecture plans *(Complete)* | 1.0 h | 1.0 h |
| **Phase 2** | Brand identity, logo SVGs, name replacement in configs | 0.5 h | 1.5 h |
| **Phase 3** | Data models (Orgs, Teams, Plans, Tasks, AI Logs) + migrations | 0.75 h | 2.25 h |
| **Phase 4** | Sign-up, Org creation, Invites API + Tenancy tests | 1.0 h | 3.25 h |
| **Phase 5** | Teams & Weekly Plans CRUD, Approval flow + Attack tests | 1.25 h | 4.5 h |
| **Phase 6** | Believable Seed command v1 (multiple orgs, roles, history) | 0.5 h | 5.0 h |
| **Phase 7** | Customer App UI (Auth, Onboarding, My Plan, Team Week) | 1.0 h | 6.0 h |
| **Phase 8** | AI Backend (Plan Review & Brain Dump agents + offline tests) | 0.75 h | 6.75 h |

> **DAY 1 CHECKPOINT CRITERIA:**
> - [x] Multi-tenant database migrations applied cleanly.
> - [x] Full plan lifecycle working via API (Draft -> Submit -> Approve -> Done).
> - [x] Automated tenancy attack suite green (`uv run pytest` passing).
> - [x] Customer app allows login, plan viewing, and team status visibility.
> - [x] AI agents return typed Pydantic structures with offline tests passing.

---

### Day 2: AI Interactions, Admin Ops, Landing Page, & Packaging (~5.5 Hours)
*Focus: Polished member experience, platform operations, marketing story, and submission archive.*

| Phase | Description | Time Box | Cumulative |
| :--- | :--- | :---: | :---: |
| **Phase 9** | AI UI (Review button, inline task findings, 1-click apply, brain dump) | 1.0 h | 7.75 h |
| **Phase 10** | Internal API (/internal endpoints for org telemetry & suspension) | 0.75 h | 8.5 h |
| **Phase 11** | Admin Console UI (Orgs list, suspension toggles, AI telemetry) | 1.0 h | 9.5 h |
| **Phase 12** | Marketing Landing Page (`site/` hero, how-it-works, real AI demo) | 1.25 h | 10.75 h |
| **Phase 13** | Polish, remove all "Launchbase", SUBMISSION.md, zip archive verify | 1.0 h | 11.75 h |

> **DAY 2 FINAL CHECKPOINT CRITERIA:**
> - [x] All three front ends (`site/`, `app/`, `internal/`) operational on assigned ports.
> - [x] No remaining user-facing mentions of "Launchbase".
> - [x] Full offline test suite passing.
> - [x] `SUBMISSION.md` complete with honest hour logs and verified demo logins.
> - [x] Clean zip bundle generated via `git archive` and confirmed executable from scratch.

---

## 5. Contingency Plan & Behind-Schedule Cut Line

If Day 1 exceeds time boxes due to unforeseen debugging:
1. **Fallback Cut Line:**
   - Simplify AI brain-dump UI into plain textarea prefill (keeps Review agent intact).
   - Use tabular layouts in admin console without heavy metric charts.
   - Defer fancy scroll animations on marketing site; focus on crystal-clear copywriting.
2. **Day 3 Safety Buffer Utilization:**
   - Day 3 remains 100% available as a safety buffer for visual polish, documentation refinement, and comprehensive edge-case verification.
