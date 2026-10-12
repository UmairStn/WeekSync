# WeekSync Comprehensive UI/UX Redesign Plan

> Grounded in `.agents/skills/design-taste-frontend-v1/SKILL.md` (High-Agency Frontend) and `.agents/skills/redesign-existing-projects/SKILL.md` (Redesign Existing Projects).
> Strictly adheres to `RULES.md` and `AGENTS.md`: preserves Launchbase auth, tenancy, Orval generated clients, and tech stack (TanStack Start, React 19, Tailwind CSS v4, shadcn/ui).
> **Rule: Plan first. No code changes will be made until human lead reviews and approves this plan.**

---

## 1. Problem Diagnosis: Why the Current UI Is "Simple & Hard to Use"

### Visual Audit (The "Simple / Raw Wireframe" Problem)
1. **Generic Flatness & Lack of Depth:**
   - Elements are flat white rectangles with uniform 1px gray borders (`border-border`) and zero elevation, layering, or diffusion shadows.
   - It resembles a raw, unstyled prototype rather than a premium, high-agency engineering tool.
2. **Inconsistent & Clashing Palette:**
   - Status badges use unrefined, washed-out pastel backgrounds (`#EDF3EC`, `#E1F3FE`, `#FBF3DB`, `#FDEBEC`) that look like raw sticky notes slapped onto cards.
   - Lack of a singular, intentional accent color: defaults to harsh black/white or arbitrary colors without cohesive hierarchy.
3. **Typography Misalignment:**
   - The main dashboard uses `font-serif` for the week title H1 in a software dashboard, violating `design-taste-frontend-v1`'s rule (*"Serif fonts are strictly BANNED for Dashboard/Software UIs"*).
   - Numbers and dates lack tabular figures (`tabular-nums font-mono`), making metrics and dates look sloppy.
4. **Zero Tactile Micro-Interactions:**
   - Buttons, checkboxes, and cards have no tactile feedback (`:active` press scale, subtle hover illumination, or smooth transition curves).

### Usability Audit (The "Hard to Use" Problem)
1. **Buried Workspace & Team Context:**
   - In `app/`, switching between organizations and teams is crammed into a tiny nested dropdown in a rigid 64px-equivalent sidebar. Users easily lose track of which team they are actively planning for or what their active permissions are.
2. **Clunky Weekly Plan Studio (`_main/dashboard.tsx`):**
   - **Lack of Visual Hierarchy:** The single "Main Task" (the most important commitment of the week) looks like just another standard text input, visually identical to sub-goals.
   - **Clunky Goal Creation:** Adding sub-goals and GTM goals requires typing into a single input and clicking a small plus icon or pressing enter without inline editing, re-ordering, or clear category separation.
   - **Jarring AI Review Shifts:** The AI review panel mounts as a massive block that violently pushes the form down. Inline critiques are difficult to read and clutter the editing flow.
   - **Confusing Submission Lifecycle:** Users are confused between "Save Draft" and "Submit Plan", with status banners scattered arbitrarily across the page.
   - **Buried Outcome Tracking:** At the end of the week, the "Goal Shipped" vs "Goal Missed" toggle is tucked away at the bottom of the card with minimal celebration or visibility.
3. **Scattered Team Rollup (`_main/team.tsx`):**
   - Displays a flat list of repetitive member cards. Team leads have to scroll endlessly and click "Send Back" or "Approve" without a clean, focused plan inspection drawer or clear indication of which team members are blocking the team's submission.
4. **Overwhelming Login / Demo Flow (`login.tsx`):**
   - A 560-line monolithic form with an uninspired layout and a wall of instant demo login buttons dumped at the bottom without role-based grouping.
5. **Marketing Landing Page (`site/`):**
   - Currently failing oxfmt checks; layout is generic with static text sections and lacks the dynamic, conversion-focused energy of a modern engineering tool.

---

## 2. Design Foundations & Aesthetic System

Following `design-taste-frontend-v1` parameters:
- **`DESIGN_VARIANCE: 8`** (Asymmetric layouts, bento grids, deliberate whitespace, distinct visual rhythm)
- **`MOTION_INTENSITY: 6`** (Fluid CSS transitions `cubic-bezier(0.16, 1, 0.3, 1)`, spring physics on buttons `active:scale-[0.98]`, staggered reveals)
- **`VISUAL_DENSITY: 5`** (High-efficiency SaaS layout: compact yet breathing, no unnecessary card nesting)

### A. Color & Surface Architecture
- **Base Canvas:** Deep Zinc / Slate neutral tones with natural contrast:
  - Light mode: Pure `#FFFFFF` and Warm Slate `#F8FAFC` with subtle border tint `#E2E8F0`.
  - Dark mode: Off-black `#09090B` and Charcoal `#121216` with border tint `rgba(255, 255, 255, 0.08)`.
- **Singular Calibrated Accent:** **Electric Cobalt / Precision Blue** (`#2563EB` / `#3B82F6`):
  - Used strictly for high-priority actions, active state indicators, and focus rings (Saturation < 80%, strictly adhering to the LILA BAN).
- **Refined Status System (Glowing Micro-Pills):**
  - **Approved / Shipped:** Emerald neutral tint (`bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20`) with a 6px breathing green indicator.
  - **Submitted (Awaiting Lead):** Cobalt neutral tint (`bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20`) with an amber/blue clock indicator.
  - **Draft:** Muted Slate tint (`bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20`).
  - **Sent Back (Revisions Needed):** Rose neutral tint (`bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20`).
- **Liquid Glass & Diffusion Shadows:**
  - 1px inner refraction highlight: `shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]`.
  - Ambient elevation: `shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]` for elevated commitment cards.

### B. Deterministic Typography
- **Headings & Display:** `font-sans font-semibold tracking-tight` (Geist Sans).
- **Prohibited:** Serif fonts on dashboards (`font-serif` completely removed from software UI).
- **Metadata, Timestamps & Numbers:** `font-mono tabular-nums text-xs tracking-wider uppercase` (Geist Mono).
- **Copy:** `leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[65ch] text-wrap: pretty`.

---

## 3. Surface-by-Surface Transformation Plan

### Surface 1: Customer SaaS App (`app/`)

#### 1. Navigation & Workspace Header Overhaul
- **Collapsible Fluid Sidebar + Workspace Command Header:**
  - Modernized sidebar with smooth icon + label items, active indicator pill with subtle glowing border.
  - Organization & Team Switcher: Elevated to a dedicated workspace widget showing the active Org name, active Team, and user's role badge (`OWNER`, `LEAD`, `MEMBER`) in high-contrast styling.
  - Quick Team Switcher: 1-click switcher popover with team search and member counts.
  - User Profile Widget: Crisp squircle avatar with role indicator, instant theme toggle, and keyboard shortcut hints.

#### 2. Weekly Plan Studio (`_main/dashboard.tsx`) — Usability Redesign
- **Top Bar — Week Navigation & Lifecycle Ribbon:**
  - Monday week switcher with date range (e.g., `Oct 12 — Oct 18, 2026`), "Today" jump button, and an interactive lifecycle progression bar:
    `[ 1. Draft ] ────> [ 2. Submitted ] ────> [ 3. Approved ] ────> [ 4. Shipped ]`
  - Real-time plan status badge with animated pulse when awaiting lead approval.
- **Section 1: The Commitment Hero Card (Main Task):**
  - Given primary visual prominence as the anchor of the week.
  - Distinct badge: `"THE PRIMARY SHIPPABLE GOAL"`.
  - Large, bold title input with clear placeholder ("What will you verifiably ship by Friday?").
  - "Why it matters" impact textarea with character counter and prompt guiding the user to write customer/business value.
  - When approved: An end-of-week outcome celebration toggle (`Shipped 🎉` vs `Missed / Carried Over`) with clear visual feedback.
- **Section 2: Dual-Pillar Execution Bento (Sub-Goals & GTM Goals):**
  - **Left Pillar: Tactical Sub-Goals (Deliverables):**
    - Visual task stack with drag/up-down reordering, instant inline title editing, and satisfying checkable states (`active:scale-[0.98]`).
    - Seamless "Add Sub-Goal" row that commits on `Enter` without requiring manual button clicks.
  - **Right Pillar: Release & GTM Hygiene (Enablement):**
    - Distinct visual treatment highlighting that high-agency engineers don't just write code; they ship safely (telemetry, docs, changelogs, flags).
    - Quick-add suggestion chips: `+ Add PostHog Telemetry`, `+ Changelog Entry`, `+ Feature Flag Check`, `+ Migration Safety`.
- **Section 3: AI Co-Pilot Floating Drawer & 1-Click Drop-in Rewrites:**
  - Instead of dumping a giant block above the form, AI actions ("Review Plan" and "Draft from Notes") open an elegant slide-over drawer or modal.
  - **Plan Review Panel:**
    - Executive score card (`Ready to Submit` vs `Revisions Recommended`).
    - Interactive findings categorized by issue type (`Vague Activity`, `Missing Impact`, `Missing GTM`, `Unrealistic Scope`).
    - 1-Click "Apply Rewrite" action that animates the target field and flashes a brief highlight so the user sees exactly what changed.
  - **Brain Dump Dialog:**
    - Clean scratchpad with example prompt chips, real-time extraction preview, and "Prefill Form" action.
- **Section 4: Sticky Action Command Dock:**
  - Unified bottom dock with dirty-state indicator ("Unsaved changes"), "Save Draft" button, and prominent primary "Submit for Lead Review" button.

#### 3. Team's Week Command Center (`_main/team.tsx`) — Usability Redesign
- **Team Health KPI Ribbon:**
  - 4 high-contrast metric cards: `Total Submitted`, `Plans Approved`, `Pending Review`, `Goals Shipped`.
- **Team Roster & Plan Inspection Bento:**
  - Interactive member cards organized by submission state (Urgent: Needs Review, Drafting, Approved).
  - Shows each member's Main Task prominently, completion progress bar (e.g. `4/5 tasks ticked`), and status pill.
- **Lead Quick-Review Drawer:**
  - Clicking any member opens a focused slide-over inspection view:
    - Complete view of the member's Main Task, Sub-Goals, and GTM Goals.
    - One-click **Approve Plan** button with confirmation toast.
    - **Send Back with Feedback** textarea with common quick-fill comments (e.g., "Please clarify why this matters", "Missing GTM/telemetry tasks").

#### 4. Auth & Onboarding Experience (`login.tsx`)
- **Editorial Split-Screen Layout:**
  - Left pane: Minimalist, focused authentication card with seamless Sign In / Create Account toggle and clean form validation.
  - Right pane: Product identity showcase with animated weekly cadence preview, customer review quotes, and role-based Instant Demo Account Switcher:
    - Grouped neatly into: `Org Owners`, `Team Leads`, `Engineers/Members`, and `Platform Staff`.
    - 1-click auto-fill and login for rapid assessment testing.

#### 5. Plan History & Settings (`history.tsx`, `settings.tsx`)
- **History View:** Timeline archive grouped by month with search, filtering by outcome (`Shipped` / `Missed`), and expandable details.
- **Settings View:** Modern tabbed interface with clean team roster management, 1-click lead designation, and copyable invite link card with countdown/expiry details.

---

### Surface 2: Marketing Landing Page (`site/`)

1. **Formatting & Quality Fixes:**
   - Run `oxfmt` and `oxlint` to eliminate formatting issues in `site/src/routes/__root.tsx` and `site/src/routes/index.tsx`.
2. **Visual & Interaction Overhaul:**
   - **Liquid Glass Navigation Bar:** Sticky frosted glass header with brand logo, smooth section scroll links, and high-converting CTA.
   - **Asymmetric Hero Section:**
     - Left-aligned bold typography with tight tracking: *"Monday commitments. AI-coached outcomes. Friday results."*
     - Right-aligned interactive live preview card showcasing a real WeekSync plan.
   - **Interactive AI Plan Coach Experience:**
     - Interactive before/after toggle allowing visitors to see how vague engineering notes ("Work on billing fixes") get transformed by the AI coach into a concrete, checkable commitment ("Stripe webhook idempotency key handling with expired card retries verified on sandbox").
   - **Cadence Walkthrough:**
     - 3-step asymmetric bento showing Monday Planning, Mid-week Execution, and Friday Outcomes.
   - **Mobile Optimization:**
     - Rigorous mobile layout collapse (`w-full`, `px-4`, `min-h-[100dvh]`) preventing horizontal scrolling.

---

### Surface 3: Admin Operations Console (`internal/`)

1. **Brutalist Telemetry Refinements:**
   - Retain the strict `industrial-brutalist-ui` design language while refining data alignment:
     - Tabular figures (`font-mono tabular-nums`) on all counts, timestamps, and token volumes.
     - Enhanced tenant table with clear active/suspended status chips.
     - Live killswitch confirmation modals with high-contrast destructive buttons.
     - Persistent `INTERNAL PLATFORM OPS` branding in header.

---

## 4. Implementation Phasing & Sequence

```
┌─────────────────────────────────────────────────────────────┐
│ Phase A: Design Tokens & Base Primitives (styles.css, UI)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase B: Auth & Onboarding Overhaul (app/src/routes/login)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase C: Workspace Navigation & Layout (sidebar, header)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase D: Weekly Plan Studio (dashboard, AI drawer/dialogs)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase E: Team's Week Command Center (team.tsx, Lead Drawer)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase F: Landing Page Polish & Formatting (site/routes)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase G: History, Settings & Full Validation Suite          │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Non-Negotiable Guardrails (RULES.md Compliance)

1. **Zero Backend / Model Modifications:** The FastAPI backend, database models, Alembic migrations, and JWT auth cookies remain untouched.
2. **Zero Hand-Written Fetch Calls:** All queries and mutations will continue using Orval-generated TanStack Query hooks.
3. **No Heavy External Animation Bundles:** No GSAP, Three.js, or Framer Motion installations. All motion will use native CSS transforms, Tailwind v4 transitions, and spring cubic-beziers for maximum performance and reliability.
4. **Resilience States Everywhere:** Every component will maintain explicit loading skeletons, empty states, error banners, and disabled button states during network requests.
5. **No Code Without Approval:** This plan must be approved before executing Phase A.
