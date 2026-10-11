# Scope & Cut List

> Deliberate scope decisions, deferred features, and rationale.
> This document directly feeds the "What was cut and why" section in SUBMISSION.md.
> In accordance with RULES.md § 6, unapproved scope additions are strictly prohibited.

---

## 1. Explicitly Banned Out-of-Scope Items

| Feature | Status | Reason & Rationale |
| :--- | :---: | :--- |
| **Billing & Stripe Subscriptions** | CUT | High integration overhead with zero evaluation signal for core multi-tenancy and AI workflows. |
| **Real Email Delivery (SMTP/SES)** | CUT | Real email requires external domain DNS, reputation warming, and third-party API keys. Token-based copyable invite links solve the invitation loop cleanly and deterministically. |
| **Email Verification & Password Reset Flows** | CUT | Avoids reliance on outbound email transport; unnecessary complexity for a local evaluation assessment. |
| **Social Login / OAuth / SSO (Google, GitHub)** | CUT | Launchbase already includes a robust, battle-tested JWT password auth system. Third-party OAuth introduces external callback configuration without adding tenancy value. |
| **GitHub / Git Provider Integrations** | CUT | Scope distraction. WeekSync tracks commitments at the outcome level, not by parsing git commit webhooks. |
| **In-App & Push Notifications** | CUT | High websocket or polling overhead; replaced by clear visual badges and status indicators on the lead's week dashboard. |
| **Production Cloud Deployment** | CUT | The evaluation is designed for hermetic local execution via Docker and tmuxp. Cloud deployment adds external infrastructure variance. |

---

## 2. Optional AI Features (Deferred / Cut)

| Candidate Feature | Status | Reason & Rationale |
| :--- | :---: | :--- |
| **Look-back Carryover Agent (Tool Calling)** | CUT | While technically interesting, the assessment explicitly rates core tenancy and prompt shaping far higher than AI extras. Preserves time budget for rock-solid tenancy tests. |
| **End-of-Week Retrospective Summary** | CUT | Low evaluation weight. Member-driven `main_task_shipped` boolean provides clear telemetry without additional token burn. |
| **AI Team Digest Generator** | CUT | Redundant with the lead's team dashboard view. |

---

## 3. UI Scope Boundaries

| Capability | Status | Reason & Rationale |
| :--- | :---: | :--- |
| **Drag-and-Drop Kanban Boards** | CUT | Weekly planning is about commitment and verification, not moving cards across arbitrary columns. A clean, structured list view is faster, more accessible, and less buggy. |
| **Live Multi-User Collaborative Cursors** | CUT | High complexity (WebSockets/CRDTs) with no bearing on weekly planning async workflows. |
| **Rich Text / WYSIWYG Plan Editor** | CUT | Markdown and clean text fields force crisp, structured outcomes rather than decorative formatting. |
