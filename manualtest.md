# WeekSync — Manual Test Guide

> **Purpose:** A structured, human-run manual QA walkthrough of the entire WeekSync product, covering **every feature** across the three surfaces (Customer App, Admin Console, Marketing Site), multi-tenant security, the AI integration, and end-to-end plan workflows.
>
> **How to use this guide:** Work through each section in order. Each test has a clear **Objective**, **Steps**, and **Expected Result**. Mark each row with ✅ (pass) / ❌ (fail) / ⏭️ (not applicable/skipped). Record any bugs/observations in the **Notes** column.
>
> **IMPORTANT:** This is a **manual test guide only**. It does not run any commands itself. Where a command is needed, it is listed explicitly under "Commands you must run" — you run them yourself.

---

## 0. Prerequisites & Pre-flight Checks (Run BEFORE any testing)

Before starting, confirm the environment is up. **You run these commands yourself; I do not run anything.**

### Commands you must run (once, before testing)

| # | Command | What it does |
| :-- | :-- | :-- |
| 1 | `docker ps --filter "name=launchbase-postgres"` | Confirm Postgres container is running |
| 2 | `cd ~/WeekSync/api && uv run alembic upgrade head` | Ensure DB schema is at latest migration |
| 3 | `cd ~/WeekSync/api && uv run manage.py seed` | Seed demo data (idempotent, safe to re-run) |
| 4 | `cd ~/WeekSync && tmuxp load .tmuxp.yaml` | Start all servers (or `tmux kill-session -t launchbase` to stop) |
| 5 | `ss -ltnp` (or `netstat -ltnp`) | Confirm ports below are listening |

### Verified Ports & Surfaces

| Surface | Port | URL | Client base path |
| :-- | :-- | :-- | :-- |
| Marketing Landing Page (`site/`) | **3000** | http://localhost:3000 | — |
| Customer SaaS App (`app/`) | **3001** | http://localhost:3001 | `http://localhost:8000/app` |
| Platform Staff Console (`internal/`) | **3002** | http://localhost:3002 | `http://localhost:8000/internal` |
| FastAPI Backend (`api/`) | **8000** | http://localhost:8000/app/docs & http://localhost:8000/internal/docs | — |

> Note: The API backend runs on port **8000**. Swagger docs are available at `http://localhost:8000/app/docs` (customer) and `http://localhost:8000/internal/docs` (staff). CORS origins include 3000/3001/3002.
>
> ⚠️ **Docs discrepancy:** `COMMANDS.md` and the `manage.py seed` printout claim Customer app = 3000 and Internal = 3001. That is **stale/wrong**. The authoritative ports (from the actual `Makefile`s and the running servers) are: **site = 3000, customer app = 3001, internal = 3002**.

### AI Key Status (determines whether live AI or fallback is tested)

- If `GOOGLE_API_KEY=` in `api/.env` is **non-empty** → real AI calls run (test the *live* AI flow).
- If `GOOGLE_API_KEY=` is **empty** → AI endpoints return `503 AI_NOT_CONFIGURED`. In this state, confirm the app **degrades gracefully** (banner appears, manual planning continues). Both states are covered below.

---

## 1. Demo Accounts Reference

All passwords are `Password123!`.

| Role | Email | Surface / URL |
| :-- | :-- | :-- |
| **Platform Staff** | `staff@weeks.sync` | http://localhost:3002 (Internal) |
| **Acme – Owner** | `owner@acme.com` | http://localhost:3001 (App) |
| **Acme – Team Lead** | `lead@acme.com` | http://localhost:3001 (App) |
| **Acme – Member 1 (has active & past plans)** | `member@acme.com` | http://localhost:3001 (App) |
| **Acme – Member 2 (submitted plan awaiting review)** | `designer@acme.com` | http://localhost:3001 (App) |
| **Globex – Owner** | `owner@globex.com` | http://localhost:3001 (App) |
| **Globex – Team Lead** | `lead@globex.com` | http://localhost:3001 (App) |
| **Globex – Member** | `member@globex.com` | http://localhost:3001 (App) |

**Seed data recap (for expectations):**
- Acme Corp: Charlie (`member@acme.com`) has a plan from 2 weeks ago (Done & Shipped), last week (Done but goal MISSED), and this week (Approved, in progress).
- Acme Corp: Dana (`designer@acme.com`) has a **Submitted** plan this week awaiting review.
- Acme Corp: Bob (`lead@acme.com`) has a **Draft** plan this week (his own).
- Globex Media: Carl (`member@globex.com`) has an Approved plan this week.

---

## 2. Marketing Landing Page (`site/` — port 3000)

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| LP-1 | Page loads & title | Open http://localhost:3000 | Page renders; browser tab title is WeekSync specific (no "Launchbase") | | |
| LP-2 | Meta & Open Graph | Right-click → View Source; search for `<meta property="og:` and `<meta name="description"` | OG + description meta tags present, descriptive, no lorem ipsum | | |
| LP-3 | Hero & CTA | View hero. Click "Get Started"/main CTA | Hero shows name, logo, one sharp line. CTA links to `http://localhost:3001/signup` (or login signup mode) | | |
| LP-4 | Interactive AI Demo | Find the AI plan-review "before/after" toggle. Toggle between fuzzy draft and AI-critiqued rewrite | The toggle flips to show the critique + concrete rewrite (e.g. "work on billing fixes" → Stripe webhook idempotency). No broken images | | |
| LP-5 | "How it works" & "For teams" sections | Scroll through | Present, human-sounding copy, no generic AI filler, no lorem ipsum | | |
| LP-6 | Responsive (phone) | Open DevTools mobile viewport (375px). Scroll full page | No horizontal scroll, layout collapses cleanly, CTAs visible | | |
| LP-7 | Branding coherence | Check logo appears in header & footer | WeekSync logo, consistent brand, no leftover "Launchbase" | | |
| LP-8 | No dead links | Click every footer/section anchor link | Every link scrolls somewhere or goes to a real page; none are `#` dummies with no action | | |

---

## 3. Customer App — Authentication & Sign-up (`app/` — port 3001)

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| C-1 | Sign In (valid demo creds) | Open http://localhost:3001, select **Sign In**, enter `owner@acme.com` / `Password123!`, submit | Redirects to dashboard, logged in as Acme Owner |✅| |
| C-2 | Sign In (bad password) | Enter correct email + wrong password | Clean error "Incorrect username or password" (or generic), no crash |✅|need fix the error message|
| C-3 | Form validation (sign in) | Submit empty / malformed email | Inline field errors, submit blocked |✅| |
| C-4 | Password reveal toggle | Click the eye icon on password field | Password toggles between masked and visible |✅| |
| C-5 | Switch to Create Account tab | Click "Create Account" tab | Sign-up form appears with First/Last name, email, password (min 8), org mode toggle |✅| |
| C-6 | Sign-up — Create Org mode | Select "Create Org", pick org name, submit a new unique email + `Password123!` | Account created, auto-owner, redirected to dashboard | ✅| |
| C-7 | Sign-up validation | Submit sign-up with <8 char password / missing org name / missing name fields | Inline validation errors shown | ✅| |
| C-8 | Sign-up — Join via Invite mode | (Create an invite token first — see Settings section) Then in "Join via Invite" tab, paste the token | User joins the target organization with the invite's role | ✅| |
| C-9 | Duplicate email on sign-up | Attempt sign-up with an already-existing email | Clean error, not a crash | ✅| |
| C-10 | Sign-out | After signing in, find logout control | Clears session, returns to login; navigating to /dashboard redirects back to login | | |
| C-11 | No team selected empty state | Sign in as a fresh user with no team (or a member with no team) | Dashboard shows a "No team selected" empty state with clear guidance (not a crash) | | |

---

## 4. Customer App — Organization Settings, Teams & Invites (`settings.tsx`)

> Sign in as **Acme Owner** (`owner@acme.com`) or **Acme Lead** (`lead@acme.com`, who is an org admin).

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| S-1 | Settings header & org name | Navigate to **Settings** | Shows current org name (e.g. Acme Corp) in header | ✅| |
| S-2 | Teams list renders | View "Functional Teams" | Lists teams with member counts + lead assignment badge |✅| |
| S-3 | Create team (owner/admin) | Click "New Team" → name "QA Squad", assign no lead → Create | Toast success; team appears in list |✅ | |
| S-4 | Create team with a lead | Create another team, select a member as lead | Team shows "Lead Assigned" | ✅| |
| S-5 | Create team validation | Attempt create with empty name | Error toast, no team created | ✅| |
| S-6 | Member roster renders | View "Organization Members" | All members of org with initial avatars and role pills | ✅| |
| S-7 | Update member role (owner only) | As owner, use the dropdown next to a non-self member (e.g. change designer to admin) | Role updates, pill/selection reflects new role |✅ | |
| S-8 | Cannot edit own role as self | Check that your own row does not allow role change from the dropdown (self-protection) | Your own member row shows a static role badge, no changing dropdown | ✅| |
| S-9 | Invite token generation (admin/owner) | Click "Generate Token", choose role (member/admin) → Generate | Toast success; a copyable token appears in the list | ✅| |
| S-10 | Copy token | Click "Copy" on a token | Clipboard contains token; button shows "Copied"; toast confirms | ✅| |
| S-11 | Non-admin cannot see invite section | (Optional) sign in as a plain member — check | Invite/team-management sections are hidden or gated for non-admins | ✅| |
| S-12 | Member role pill colors | Inspect owner/admin/member pills | Distinct status colors (owner green, admin secondary, member muted) | ✅| |

---

## 5. Customer App — Weekly Plan Studio (`dashboard.tsx`)

> Sign in as a **team member** (e.g. `member@acme.com`) who has an active approved plan, OR start fresh.

### 5.1 Week Navigation & Lifecycle

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| D-1 | Week header displays | Open dashboard | Shows team name, Monday date, week range label, CURRENT WEEK badge | | |
| D-2 | Week navigation prev/next | Click ◀ / ▶ arrows | Week range + Monday date shift; "Current" jump button appears when off current week | | |
| D-3 | Return to current week | Navigate away then click "Current" | Returns to current week | | |
| D-4 | Lifecycle stepper renders | View the 4-stage strip | Shows 1. Draft → 2. In Review → 3. Approved → 4. Shipped, with active stage highlighted | | |

### 5.2 Main Task (Commitment Hero)

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| D-5 | Main task field populated | Open an existing plan | Main Task title + "Why it matters" pre-filled | | |
| D-6 | Add main task (new plan) | Type a title + why-it-matters | Fields accept input | | |
| D-7 | Save Draft validation | Leave main task empty / why empty, click Save Draft | Toast error "Please enter what you plan to ship" / "please provide why this matters" | | |
| D-8 | Save a draft | Fill in all, click "Save Draft" | "Draft saved successfully" toast; plan saved (status stays draft) | | |

### 5.3 Sub-Goals & GTM Goals

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| D-9 | Add sub-goal via Enter | Type in "Add sub-goal" input, press Enter | Item added to list, input cleared | | |
| D-10 | Add sub-goal via + button | Type in input, click + button | Item added | | |
| D-11 | Remove sub-goal | Hover an existing sub-goal, click trash icon | Item removed | | |
| D-12 | Add GTM goal (Enter & button) | Same as D-9/10 with the GTM input | GTM item added | | |
| D-13 | Quick GTM suggestion chips | Click a suggestion chip (e.g. "+ PostHog Telemetry") | Adds that GTM task; toast confirms | | |
| D-14 | Duplicate GTM chip guard | Click the same chip twice | Second click does not create a duplicate | | |
| D-15 | Remove GTM goal | Hover a GTM item → trash | Item removed | | |
| D-16 | Task done ticking (approved plan) | On an **approved** plan, click the checkbox circle next to a sub-goal/GTM | Task toggles to completed (green check + strikethrough); progress counter updates | | |
| D-17 | Editing locked when approved | On approved plan, attempt to edit main task / add tasks | Inputs are disabled; add/remove controls hidden | | |

### 5.4 Submit → Approve → Send Back → Outcome flow

> These steps require a **team lead** and a **member**. Use two browser windows (one logged in as member, one as lead) or use the member then the lead.

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| D-18 | Submit for review (member) | As member with a draft, click "Submit for Review" | Status moves Draft → Submitted (In Review); toast success | | |
| D-19 | Re-submit already submitted | Try Submit again | Blocked / error (only draft can be submitted) | | |
| D-20 | Lead sees "awaiting review" banner | As lead, open the member's submitted plan (dashboard or team view) | Lead Action Banner appears with Approve / Send Back | | |
| D-21 | Lead approves | As lead, click "Approve Plan" | Status → Approved; toast "Plan approved" | | |
| D-22 | Approved stepper state | Check status pill + stepper | Stepper highlights Approved (green); "Friday Shipped" becomes available | | |
| D-23 | Lead sends back with comment | Click "Send Back", enter comment, confirm | Status → Draft/Sent Back; comment shown to member as revision feedback banner | | |
| D-24 | Member sees send-back feedback | As member, open the sent-back plan | Shows "Sent back by Team Lead for revisions" banner with the lead's comment | | |
| D-25 | Non-lead cannot approve | (Security test) Confirm a plain member's dashboard does not show Approve/Send Back controls | No approval controls for non-lead; API must reject (verify via Swagger if wanted) | | |
| D-26 | Record Friday outcome (approved plan) | As member on approved plan, click "Shipped 🎉" or "Missed" | Sets `main_task_shipped` true/false; stepper → Shipped (green) or Missed (rose); toast confirms | | |
| D-27 | Outcome toggle reflects in history | Go to History | The plan shows Shipped 🎉 / Missed pill | | |

---

## 6. Customer App — Team's Week Rollup (`team.tsx`)

> Sign in as a **team lead** (e.g. `lead@acme.com`).

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| T-1 | Team's Week header | Navigate to Team | Shows team name, Monday date, week navigator | | |
| T-2 | KPI ribbon renders | View the 4 metric cards | Roster / Submitted / Approved / Goals Shipped cards with counts | | |
| T-3 | Member cards render | View member commitment cards | Each team member listed with avatar, role, status pill, main task preview, progress bar | | |
| T-4 | Status pills present | Check member cards | Displays per-member status (approved / submitted / draft / sent_back / NO PLAN DRAFTED) | | |
| T-5 | Lead-only actions | As lead, check a member whose plan is **submitted** | "Send Back" + "Approve" buttons appear for that member | | |
| T-6 | Approve from team view | Click "Approve" on a submitted member | Status → Approved; toast; KPI updates | | |
| T-7 | Send back from team view | Click "Send Back" on a submitted member, enter comment, confirm | Status → Sent Back; member sees feedback | | |
| T-8 | Non-lead sees no actions | Sign in as a plain member | Member does not see Approve/Send Back controls | | |
| T-9 | "No plan drafted" state | Check a member without a plan | Shows "NO PLAN DRAFTED" pill / "has not created a plan" message | | |
| T-10 | Week nav in team view | Use prev/next arrows | Rollup reflects the selected week | | |

---

## 7. Customer App — Plan History (`history.tsx`)

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| H-1 | History list renders | Navigate to History | Lists past weeks for the current team | | |
| H-2 | Week range & status | Check each row | Shows Monday–Sunday range, status pill, Shipped/Missed pill where applicable | | |
| H-3 | Task summary per plan | Inspect a row | Shows main task title + why-it-matters, deliverable completion count | | |
| H-4 | Open week from history | Click "Open Week" on a row | Redirects to dashboard with that week selected | | |
| H-5 | Empty history state | (If applicable) sign in as a member with no history | Shows a friendly empty state ("No historical plans found") | | |
| H-6 | History is team-scoped | Confirm the list is filtered to the current team/org | No cross-org plans appear | | |

---

## 8. Multi-Tenant Security & Role Isolation (CRITICAL)

> These are the highest-weight checks per the spec (3-star). Test them **manually via the UI and/or Swagger** to confirm the API rejects cross-tenant and wrong-role access.

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| X-1 | Cross-org plan read = 404 | Login as Acme member, use Swagger (`http://localhost:8000/app/docs`) or history to obtain a **Globex** plan ID, then GET that plan via Acme's org | Returns **404** (not 403, not the plan). No data leak | | |
| X-2 | Cross-org plan update = 404 | Attempt to update a Globex plan while authenticated as Acme | 404 (object not found), no write occurs | | |
| X-3 | Member cannot create team | As a plain member, attempt `POST /orgs/{org_id}/teams` via Swagger | **403** INSUFFICIENT_PERMISSIONS | | |
| X-4 | Non-lead cannot approve | As a plain member, attempt `POST /plans/{id}/approve` on any submitted plan | **403** | | |
| X-5 | Lead of different team cannot approve | As a lead of Team A, attempt to approve a plan belonging to Team B | **403** (role/team mismatch) | | |
| X-6 | Suspended org locks out member | (Use staff console — see §9.) Staff suspends an org, then the member attempts any read/write | **403 ORGANIZATION_SUSPENDED** across the org | | |
| X-7 | Customer owner cannot access internal surface | As an org owner, try to open `http://localhost:3002` or hit `/internal/*` | **401/403** — refused. Internal console won't authenticate non-admins | | |
| X-8 | Invite tampering | An Acme user tries to reuse an invite token created for Globex | Membership joins the correct target org only; no cross-org access granted | | |
| X-9 | Anti-Oracle concealment | Confirm /app cross-org reads return 404 (never 403) that could reveal an object exists | 404 for all cross-org probes | | |

> Tip: Easiest cross-tenant probe is via Swagger. Obtain one plan from each org (note the `id`). While logged in as Org A, call `GET /app/orgs/{orgA}/plans/{planB_id}` → expect 404.

---

## 9. AI Integration (Plan Review + Brain Dump)

### 9.1 Pre-check for AI state

- If `GOOGLE_API_KEY` is **non-empty**: proceed with **live** AI tests below.
- If `GOOGLE_API_KEY=` is **empty**: AI calls return `503 AI_NOT_CONFIGURED`. Confirm the graceful-fallback tests (A-7 / A-8 / B-7) render a polite, dismissible banner and manual planning still works.

### 9.2 AI Plan Review

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| A-1 | Trigger AI review | On the dashboard with a Main Task filled in, click "AI Review" | Loading spinner shows on the button ("Reviewing..."), button disabled while in flight | | |
| A-2 | Review panel appears | Wait for result | AI Coach Assessment panel appears with verdict badge (Ready for Lead / Revisions Recommended), executive assessment, findings list | | |
| A-3 | Findings categorized | Inspect findings | Findings have category badges (Vague Activity / Missing Impact / Missing GTM / Scope Too Broad) and a concrete suggested rewrite | | |
| A-4 | One-click Apply Rewrite | Click "Apply Rewrite" on a finding | The suggested text is dropped into the relevant form field (main task title/why, sub-goal, or GTM); the finding is removed from the active list; toast confirms | | |
| A-5 | Inline findings near tasks | Inspect the Main Task / Sub-Goal / GTM sections | Inline critique cards appear next to the flagged task with their own Apply button | | |
| A-6 | AI does not write to DB | After applying a rewrite, click "Save Draft" manually | Nothing is saved until you manually save — AI never auto-commits | | |
| A-7 | Unconfigured key fallback | With empty GOOGLE_API_KEY, trigger AI Review | A polite, dismissible error banner appears ("AI assistant unavailable... planning continues"), no crash | | |
| A-8 | Dismiss error banner | Click the ✕ on the AI notice banner | Banner dismisses; page stays functional | | |
| A-9 | Timeout/429 handling | (If live) trigger many rapid reviews or simulate 429 | Friendly plain-language message, no crash (uses 503/504/429 mapping) | | |
| A-10 | No auto-trigger on typing | Type in fields then observe | No AI request fires on keystroke; only explicit button triggers it | | |

### 9.3 AI Brain Dump

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| B-1 | Open Brain Dump dialog | Click "AI Brain Dump" | Modal opens with scratchpad textarea, char counter, Generate button | | |
| B-2 | Generate from notes | Paste messy notes (meeting bullets), click "Generate Plan Draft" | Loading spinner "Synthesizing Plan..."; button disabled while in flight | | |
| B-3 | Draft prefills form | On success | Main Task (title + why), Sub-Goals, GTM Goals populate the form; dialog closes; toast confirms | | |
| B-4 | Add to form only (no DB) | After prefill, don't click Save | No DB write happens — only the form is prefilled | | |
| B-5 | Minimum length validation | Submit fewer than 5 chars | Toast error "Please enter a few notes..." and button stays disabled | | |
| B-6 | Cancel button | Open dialog, click Cancel | Closes without generating | | |
| B-7 | Error state | With empty key / failure | In-dialog error message shows; dialog stays open; no crash | | |

---

## 10. Platform Staff / Admin Console (`internal/` — port 3002)

> Sign in as `staff@weeks.sync` / `Password123!`.

### 10.1 Access & Branding

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| I-1 | Internal login page | Open http://localhost:3002 | "Internal · Restricted" login design, monochrome console aesthetic | | |
| I-2 | Non-admin is rejected | (Optional) Try logging in as a customer org owner | Refused (401 generic); the internal console never accepts non-admin | | |
| I-3 | INTERNAL branding | After login, view header/sidebar | Persistent "INTERNAL PLATFORM OPERATIONS" / INTERNAL pill branding is unmistakable | | |
| I-4 | No customer plan text exposed | Browse all internal pages | **Zero** customer plan text / task titles / review comments are ever shown — only aggregates, counts, timestamps | | |

### 10.2 Organizations (Tenant Fleet)

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| O-1 | Org list with counts | Go to **Organizations** | Table lists orgs with Members / Teams / Plans count columns and Last Active | | |
| O-2 | Search by name/slug | Type in the Search box (e.g. "acme" or "globex") | List filters live; pagination resets | | |
| O-3 | Status filter | Toggle Active / Suspended / All filter chips | List filters by org status | | |
| O-4 | Suspend an org | Click "Suspend" on Acme Corp → confirm in dialog | Dialog warns; org status → SUSPENDED; toast confirms | | |
| O-5 | Suspension locks out members | After suspending, open the customer app as an Acme member | Member sees **Organization suspended / 403** — cannot access app data | | |
| O-6 | Reinstate an org | Back in console, click "Reinstate" on Acme → confirm | Status → ACTIVE; toast; customer member access is restored | | |
| O-7 | Pagination | If >25 orgs (or set limit small), click Prev/Next | Pagination shifts the table; "Showing X–Y of Z" updates | | |
| O-8 | Empty search state | Search for a non-existent term | Friendly empty state "No organizations match current query" | | |

### 10.3 Users (Staff & User Directory)

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| U-1 | User list with memberships | Go to **Users** | Table lists users with created date, name, email, org memberships (with roles), privilege, status | | |
| U-2 | Search by name/email | Type in search box | Live filter by name/email; pagination resets | | |
| U-3 | Org badges w/ roles | Inspect a user row | Shows organization badges e.g. "Acme Corp (owner)", `[SUSPENDED]` tag if org suspended | | |
| U-4 | Add user | Click "Add User" → fill user form | User created; appears in list | | |
| U-5 | Reset password | Open a user's ⋮ menu → "Reset Password" | Password change dialog works | | |
| U-6 | Deactivate a user | ⋮ menu → "Deactivate Account" (on a non-self user) | Confirm; user status → INACTIVE; toast | | |
| U-7 | Deactivated user cannot log in | Try logging into customer app as the deactivated user | Login rejected / account inactive | | |
| U-8 | Reactivate a user | On an inactive user, ⋮ → "Reactivate Account" | Status → ACTIVE; login restored | | |
| U-9 | Self-protection on deactivate/delete | Open your own staff user row | "Deactivate"/"Delete" options are disabled for self | | |
| U-10 | Edit user details | ⋮ → "Edit Details" | Edit dialog works; changes saved | | |
| U-11 | Delete user | ⋮ → "Delete Account" (non-self) | Confirm; user removed | | |

### 10.4 AI Telemetry

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| AI-1 | KPI cards render | Go to **AI Telemetry** | Cards for Total Invocations, Success Rate %, Failures, Rate Limits (429), Total Tokens | | |
| AI-2 | Per-org breakdown | View "Per-Organization Consumption" table | Lists orgs with invocations, success %, failures, rate limits, last invocation | | |
| AI-3 | Recent audit log | View "Live Telemetry Audit (Last 50)" | Shows timestamp, org, user email, feature, status, latency, diagnostic notes | | |
| AI-4 | Refresh telemetry | Click "Refresh Telemetry" | Spinner animates; data refetches | | |
| AI-5 | Logs track AI activity | (After doing live AI tests in §9) return here | The triggered AI calls appear in the audit log with status success / failure / rate_limited | | |
| AI-6 | No plan text in telemetry | Inspect AI telemetry rows | Logs contain only status/latency/tokens/errors — **no plan or task text** | | |

---

## 11. End-to-End Happy Path (Full Workflow)

> This is the definitive "does the product actually hang together" test. Do it with two browsers (or one incognito + one normal) — Browser A = team member, Browser B = team lead, both in **Acme**.

| # | Step | Actor | Action | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| E2E-1 | Sign in | Member | Sign in as `member@acme.com` | Lands on dashboard with their plan | | |
| E2E-2 | Draft plan | Member | Fill Main Task + why, add sub-goals & GTM | Form populated; Save Draft works | | |
| E2E-3 | AI review (optional) | Member | Click "AI Review" (live key) | Findings presented; apply a rewrite if offered | | |
| E2E-4 | Submit | Member | Click "Submit for Review" | Status → Submitted (In Review) | | |
| E2E-5 | Lead sees it | Lead | Sign in as `lead@acme.com`, open Team page | Member's plan shows Submitted + Approve/Send Back | | |
| E2E-6 | Approve | Lead | Click "Approve" | Status → Approved; toast | | |
| E2E-7 | Member ticks tasks | Member | On approved plan, tick sub-goals/GTM checkboxes | Tasks complete; progress bar advances | | |
| E2E-8 | Record outcome | Member | Click "Shipped 🎉" (or Missed) | `main_task_shipped` recorded; stepper reflects | | |
| E2E-9 | Verify in history | Member | Open History | Plan listed with Shipped pill | | |
| E2E-10 | Verify staff sees aggregates | Staff | Open console Organizations/Users | Aggregates update; **no plan text** visible | | |

---

## 12. UX / Responsiveness & Accessibility Checks

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| UX-1 | Loading states | On a slow connection (DevTools throttle), load dashboard | Skeleton/spinner shown; no blank flash | | |
| UX-2 | Empty states | New user with no team / no plans | Clear "empty" messages, not errors or white screens | | |
| UX-3 | Error states | Trigger a failure (e.g. suspend org then load app) | Friendly error/forbidden message, not a crash | | |
| UX-4 | Forbidden page | Non-lead tries an admin action | Clear forbidden indication, no dead controls | | |
| UX-5 | No dead buttons | Click every visible button across all screens | Every button does something (or is disabled with reason) | | |
| UX-6 | Responsive (customer app) | DevTools phone view on dashboard, team, settings | Layout collapses cleanly; no horizontal scroll | | |
| UX-7 | Responsive (internal) | Phone view on users/orgs/AI telemetry | Tables scroll or stack reasonably; usable | | |
| UX-8 | Tactile feedback | Click primary buttons | Subtle press/scale feedback present on buttons (no jarring) | | |
| UX-9 | Toast notifications | Perform successes/errors (save, approve, copy) | Sonner toasts appear top/edge with content | | |
| UX-10 | Form validation UX | Submit forms with bad data | Inline field errors, no page reload, focus stays | | |

---

## 13. Brand & Code-Health Sweep (No Launchbase Leftover)

| # | Test | Steps | Expected Result | ✅/❌ | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| BR-1 | No "Launchbase" in user-facing text | Search the rendered pages (View Source / browser search) for "Launchbase" (case-insensitive) | Zero occurrences in user-facing text across all 3 surfaces. (RULES: rebrand everything away from Launchbase) | | |
| BR-2 | Logo renders at sizes | Check site header, app sidebar, admin console | WeekSync logo renders; favicon set; readable at small size | | |
| BR-3 | Page titles distinct | Check tab titles on all 3 apps | Each surface has a proper title (customer, internal, marketing) | | |

> Note: You (the human) can also run code-level checks if desired:
> - `cd ~/WeekSync/app && npm run validate`
> - `cd ~/WeekSync/internal && npm run validate`
> - `cd ~/WeekSync/site && npm run validate`
> - `cd ~/WeekSync/api && uv run pytest -v`
> - `grep -ri "launchbase" app/src internal/src site/src` (should be none in user-facing copy)

---

## 14. Optional Deep API Swagger Checks (if you want backend certainty)

> You can run these yourself. Use `http://localhost:8000/app/docs` (customer) and `http://localhost:8000/internal/docs` (staff).

| # | Test | Endpoint | Steps | Expected Result | ✅/❌ |
| :-- | :-- | :-- | :-- | :-- | :-- |
| SW-1 | Health | `GET /app/health` | Open, execute | `{ "status": "healthy" }` | | |
| SW-2 | Sign up | `POST /app/signup` | Provide unique email + org_name | Returns auth token + sets cookie; 201-ish | | |
| SW-3 | Create org | `POST /app/orgs` | Provide name | 201; caller becomes owner | | |
| SW-4 | List orgs | `GET /app/orgs` | Execute | Lists caller's orgs with `my_role` | | |
| SW-5 | List members | `GET /app/orgs/{id}/members` | Execute | Members with roles | | |
| SW-6 | Create team | `POST /app/orgs/{id}/teams` | Provide name | 201 | | |
| SW-7 | Create plan | `POST /app/orgs/{id}/plans` | Monday date, team_id, tasks | 201 plan with tasks | | |
| SW-8 | Submit plan | `POST /app/orgs/{id}/plans/{plan_id}/submit` | Execute as member | status → submitted | | |
| SW-9 | Approve plan | `POST /app/orgs/{id}/plans/{plan_id}/approve` | Execute as lead/admin | status → approved | | |
| SW-10 | Send back | `POST /app/orgs/{id}/plans/{plan_id}/send-back` | Provide comment | status → draft/sent_back + comment | | |
| SW-11 | Team week | `GET /app/orgs/{id}/teams/{team_id}/week?week_start_date=MONDAY` | Execute | TeamWeekResponse with members | | |
| SW-12 | AI review | `POST /app/orgs/{id}/ai/review` | Provide tasks | PlanReviewResult (or 503 if no key) | | |
| SW-13 | AI brain dump | `POST /app/orgs/{id}/ai/brain-dump` | Provide notes | BrainDumpResult (or 503 if no key) | | |
| SW-14 | Internal orgs | `GET /internal/orgs` | As staff | Aggregates, no plan text | | |
| SW-15 | Internal users | `GET /internal/users` | As staff | Users with org memberships | | |
| SW-16 | Internal AI usage | `GET /internal/ai-usage` | As staff | Telemetry overview | | |
| SW-17 | Cross-tenant probe | `GET /app/orgs/{orgA}/plans/{planB_id}` | Auth as Org A | **404** | | |
| SW-18 | Non-staff on internal | `GET /internal/orgs` with an app/owner token | Execute | **401/403** | | |

---

## 15. Bug / Observation Log

Use this section to record anything unexpected while testing.

| Test Ref | Surface | Severity (Low/Med/High) | Description | Repro steps | Environment note |
| :-- | :-- | :-- | :-- | :-- | :-- |
| | | | | | |
| | | | | | |

---

## 16. Summary Checklist — All Sections Covered

| Section | Title | Status |
| :-- | :-- | :-- |
| 2 | Marketing Landing Page | ☐ Done / ☐ N/A |
| 3 | Auth & Sign-up | ☐ Done / ☐ N/A |
| 4 | Orgs, Teams & Invites | ☐ Done / ☐ N/A |
| 5 | Weekly Plan Studio | ☐ Done / ☐ N/A |
| 6 | Team's Week Rollup | ☐ Done / ☐ N/A |
| 7 | Plan History | ☐ Done / ☐ N/A |
| 8 | Multi-Tenant Security (CRITICAL) | ☐ Done / ☐ N/A |
| 9 | AI Integration | ☐ Done / ☐ N/A |
| 10 | Staff Admin Console | ☐ Done / ☐ N/A |
| 11 | End-to-End Happy Path | ☐ Done / ☐ N/A |
| 12 | UX/Responsive | ☐ Done / ☐ N/A |
| 13 | Brand & Leftover Sweep | ☐ Done / ☐ N/A |
| 14 | Optional Swagger API Checks | ☐ Done / ☐ N/A |
