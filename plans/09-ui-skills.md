# UI Skills Audit & Front-End Application Matrix

> Comprehensive evaluation of all `.agents/skills` against the Launchbase technology stack:
> TanStack Start, React 19, Tailwind CSS v4, shadcn/ui, and Orval-generated typed clients.
> Per RULES.md § 7, skills must NEVER introduce unapproved frameworks or hand-written API fetch calls.

---

## 1. Complete Inventory & Assessment

| Skill Name | Core Directive & Description | Stack Compatibility | Front-End Target | Verdict |
| :--- | :--- | :---: | :---: | :---: |
| **`brandkit`** | Premium brand identity art direction, logo systems, and visual decks. | Compatible (Design/SVG) | All / Brand | **CHOSEN** |
| **`design-taste-frontend`** | Anti-slop frontend engineering for landing pages; bans generic AI templates. | Fully Compatible (Tailwind/React) | `site/` | **CHOSEN** |
| **`minimalist-ui`** | Utilitarian editorial workspace UI: macro-whitespace, bento grids, subdued accents. | Fully Compatible (shadcn/Tailwind) | `app/` | **CHOSEN** |
| **`industrial-brutalist-ui`** | High data density, telemetry-grade UI, rigid grids, utilitarian precision. | Fully Compatible (shadcn/Tailwind) | `internal/` | **CHOSEN** |
| **`redesign-existing-projects`** | Upgrades existing templates while strictly preserving working code and stack. | Fully Compatible | All | **CHOSEN** |
| **`high-end-visual-design`** | Micro-interactions, double-bezel cards, refined typography hierarchy. | Compatible (Adapted) | `site/`, `app/` | **CHOSEN** |
| **`full-output-enforcement`** | Disables LLM code truncation and enforces complete, unabridged generation. | Universal | All | **CHOSEN** |
| **`design-taste-frontend-v1`** | Legacy version of design-taste-frontend. | Redundant | N/A | **REJECTED** (Superseded by v2) |
| **`gpt-taste`** | Heavy Python-driven GSAP ScrollTrigger and canvas animation engineering. | Incompatible (Heavy external runtime) | N/A | **REJECTED** (Adds unapproved animation dependencies) |
| **`imagegen-frontend-mobile`**| Generates native iOS/Android phone mockup concepts. | Incompatible | N/A | **REJECTED** (WeekSync is a responsive web application) |
| **`imagegen-frontend-web`** | Generates static horizontal layout concepts for web marketing. | Image only | N/A | **REJECTED** (Generates images, does not output React/Tailwind) |
| **`image-to-code`** | Reconstructs code from visual raster mockups. | Incompatible workflow | N/A | **REJECTED** (We build directly with Launchbase's shadcn/ui) |
| **`stitch-design-taste`** | Generates Google Stitch design markdown tokens. | Incompatible | N/A | **REJECTED** (Targeted to Google Stitch platform, not React) |

---

## 2. Surface-by-Surface Application Guide

### A. Marketing Site (`site/`) — Public Landing Page
- **Primary Skill:** `design-taste-frontend` + `high-end-visual-design`
- **Build Phase:** Phase 12 (Landing Page)
- **How to Apply:**
  - **Hero:** Punchy value proposition ("Weekly alignment for teams who ship"), clear "Get Started" CTA directly navigating to `/signup` in `app/`. No generic corporate fluff.
  - **Show the AI:** Render an authentic, interactive plan-review preview showing an engineer's vague task ("Fix billing issue") with the AI lead's critique and concrete suggested rewrite ("Billing webhook handles expired card idempotency, verified on sandbox").
  - **For Teams:** Visual preview of the lead's week dashboard with status indicators and shipping metrics.
  - **Copywriting:** Human tone when read aloud. Zero lorem ipsum.

### B. Customer Product (`app/`) — Weekly Planning SaaS
- **Primary Skill:** `minimalist-ui` + `redesign-existing-projects`
- **Build Phases:** Phase 7 (Customer App UI) & Phase 9 (AI UI)
- **How to Apply:**
  - **Design Language:** Clean, editorial document-style workspace. Generous whitespace, razor-thin borders (`border-border`), and subdued badge colors.
  - **My Weekly Plan:** Clear hierarchy separating the single **Main Task** (prominent card with "Why it matters") from supporting **Sub-goals** and **Go-to-market goals**.
  - **Interactions:** One-click task completion toggles; side-by-side AI review findings next to corresponding task inputs with a single-click "Apply Rewrite" action.
  - **Resilience:** Polite, informative banners for empty states, loading skeletons while Gemini processes, and explicit forbidden screens.

### C. Internal Operations Console (`internal/`) — Platform Staff Panel
- **Primary Skill:** `industrial-brutalist-ui`
- **Build Phase:** Phase 11 (Admin Panel UI)
- **How to Apply:**
  - **Design Language:** High data density, compact tables, monospaced metrics, clear visual separation from customer products.
  - **Distinct Branding:** Persistent **`INTERNAL PLATFORM OPS`** top-level badge to prevent confusion with customer views.
  - **Organization Telemetry:** High-efficiency data tables showing tenant slug, member/team counts, active plans, suspension status toggles, and AI quota consumption.

---

## 3. Strict Stack & Dependency Guardrails

1. **No External CSS Frameworks:** We strictly use the pre-installed Tailwind CSS v4 and shadcn/ui components already configured in Launchbase.
2. **No Hand-Written Fetch Calls:** All API requests in `app/` and `internal/` must use the Orval-generated TanStack Query hooks.
3. **No Heavy Motion Bundles:** Animations must use standard CSS transitions and Tailwind utility classes (`transition-all`, `duration-200`). Do not install GSAP, Framer Motion, or Three.js.
