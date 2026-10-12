# Requirements Checklist

> Tick only when verified (tests pass or manually confirmed).

---

## 1. Brand
- [ ] Product name chosen (short, easy to say/spell, not "Weekly Planner")
- [ ] One-line pitch written
- [ ] SVG logo created, readable at 16px, works on light and dark backgrounds
- [ ] Logo used as favicon, app header, sign-in page, landing page
- [ ] Page `<title>` set across all three front ends
- [ ] Every user-facing "Launchbase" string replaced
- [ ] Admin panel clearly marked INTERNAL in branding
- [ ] All three front ends tell the same brand story

## 2. Auth & Organizations
- [x] Sign-up endpoint added (email + password, built on existing auth code)
- [x] New user can create an organization after sign-up
- [x] New user can join an organization via invite link
- [x] Copyable invite link generation (no email sending)
- [x] Org roles: owner, admin, member
- [x] Owners and admins can manage members and settings
- [x] Members can plan their own weeks
- [x] Sign-up page in app/

## 3. Teams
- [x] Admins can create teams inside an org
- [x] Admins can add members to teams
- [x] Admins can assign a team lead
- [x] A user can belong to more than one team

## 4. Plans
- [x] Plan keyed by week's Monday date
- [x] Plan has: one main task (what to ship + why it matters)
- [x] Plan has: sub-goals (smaller tasks)
- [x] Plan has: go-to-market goals
- [x] Every item is a separate task with own status (tickable)
- [x] Plan status flow: draft → submitted → approved → done
- [x] Team lead can approve a plan
- [x] Team lead can send back a plan with a comment
- [x] Tasks can be ticked done during the week
- [x] Member can mark whether the main task shipped at week end

## 5. Team's Week
- [x] Lead picks a week and sees every member at a glance
- [x] Shows: who submitted, what's approved, tasks done, goal shipped
- [x] History view shows past weeks

## 6. Tenancy (3-star weight)
- [x] User in one org cannot read another org's data
- [x] Member cannot act as admin
- [x] Non-lead cannot approve a plan
- [x] Every endpoint scopes by org and role
- [x] Cross-org access returns 404 (never leaks object existence)
- [x] Suspended orgs lock members out
- [x] Tests cover: other org's ID
- [x] Tests cover: member acting as admin
- [x] Tests cover: non-lead approving
- [x] Tests cover: suspended org

## 7. Seeding
- [x] `uv run manage.py seed` command exists
- [x] Creates at least 2 organizations
- [x] Creates teams with members in each role
- [x] Creates several weeks of plans (some shipped, some not)
- [x] Prints demo logins: member, team lead, org owner, staff

## 8. UX Bar
- [x] Loading states while model thinks
- [x] Clear empty states
- [x] Forbidden pages that say so
- [x] No dead buttons

## 9. Internal Admin Panel (2-star weight)
- [x] Staff-only access (is_admin + internal-scoped tokens)
- [x] Staff never created via sign-up
- [x] Customer org owners/admins cannot reach it
- [x] Organizations list: member count, team count, plan count, last active
- [x] Staff can suspend an org
- [x] Staff can reinstate an org
- [x] Users: search, see which orgs a user belongs to, deactivate account
- [x] AI usage: calls per org, failures, rate-limited calls
- [x] Decision documented: can staff see customer plan text?
- [x] Panel clearly marked INTERNAL


## 10. AI Integration (3-star weight)
- [x] Using pydantic-ai-slim[google], model gemini-3.5-flash-lite (configurable via settings.AI_MODEL)
- [x] GOOGLE_API_KEY via api/.env settings, never in browser, never committed
- [x] Empty GOOGLE_API_KEY= in api/.env.example

### Feature A: Plan Review
- [x] Agent returns structured review with Pydantic output_type
- [x] Flags: work-description tasks (not checkable results)
- [x] Flags: main task without why-it-matters
- [x] Flags: missing go-to-market goals
- [x] Flags: scope that doesn't fit a week
- [x] Each finding points at a specific task by ID
- [x] Each finding includes a concrete suggested rewrite
- [x] UI shows findings next to the tasks they're about
- [x] One-click apply suggestion
- [x] Instructions do NOT wave through "Implement checkout"-style tasks

### Feature B: Brain Dump Draft
- [x] Member pastes messy notes, gets pre-filled plan
- [x] Output goes into form only, NEVER to database

### Integration Requirements
- [x] Product works without AI (graceful degradation)
- [x] Timeout and 429 handling with plain-words UI message
- [x] No request on every keystroke (explicit button, disabled while in flight)
- [x] Every call recorded per org: success/failure/rate-limited
- [x] Tests use TestModel/FunctionModel (no real API calls)
- [x] `uv run pytest` passes with no key and no network
- [x] AI earns its place: typed data the app acts on

## 11. Landing Page (site/)
- [x] Hero: name, logo, one sharp line, "Get started" CTA → app/ sign-up
- [x] How it works section
- [x] Show the AI: real rendered example of plan review
- [x] For teams section
- [x] Responsive down to phone
- [x] Proper `<title>` and meta description
- [x] Open Graph image
- [x] No lorem ipsum
- [x] No generic AI marketing copy
- [x] Copy sounds human when read aloud

## 12. Code Quality
- [ ] Follows Launchbase patterns
- [ ] Migrations are autogenerated and reviewed
- [ ] Generated client regenerated after API changes
- [ ] No dead code left behind
- [ ] Small commits with clear messages

## 13. Submission
- [ ] SUBMISSION.md at repo root
- [ ] How to run instructions
- [ ] Seed command documented
- [ ] Demo logins documented
- [ ] Brand name and pitch
- [ ] Honest hours spent
- [ ] What's cut and why
- [ ] `git archive` zip verified from fresh unzip

## 14. Rules Compliance
- [ ] No protected core replaced (auth, token scopes, is_admin, API surfaces, DB stack, client generation)
- [ ] Every core-file edit logged in plans/03-decisions.md
- [ ] No Supabase or alternative auth introduced
- [ ] is_admin never used for customer org permissions
- [ ] Org roles use clearly different names from staff
- [ ] No enums in models
- [ ] Services flush, routers commit
- [ ] No hand-written fetch calls to own API
