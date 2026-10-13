import asyncio
import inspect
import secrets
from datetime import UTC
from functools import partial, wraps

from pydantic import ValidationError
from sqlalchemy import select
from typer import BadParameter, Option, Typer

from app.cli.schemas import UserCreate
from app.database import AsyncSessionLocal, async_engine
from app.models import User
from app.security import hash_password


class AsyncTyper(Typer):
    @staticmethod
    def maybe_run_async(decorator, f):
        if inspect.iscoroutinefunction(f):

            @wraps(f)
            def runner(*args, **kwargs):
                # Close the shared session and dispose the engine's pool inside
                # the same event loop asyncio.run creates, so pooled asyncpg
                # connections are returned before the loop's greenlet is
                # finalized (otherwise the GC terminates them post-loop and
                # SQLAlchemy warns about non-checked-in connections).
                async def main():
                    try:
                        return await f(*args, **kwargs)
                    finally:
                        await session.close()
                        await async_engine.dispose()

                return asyncio.run(main())

            decorator(runner)
        else:
            decorator(f)
        return f

    def callback(self, *args, **kwargs):
        decorator = super().callback(*args, **kwargs)
        return partial(self.maybe_run_async, decorator)

    def command(self, *args, **kwargs):
        decorator = super().command(*args, **kwargs)
        return partial(self.maybe_run_async, decorator)


session = AsyncSessionLocal()
cli = AsyncTyper()


@cli.callback()
def main():
    """Launchbase management CLI."""
    # Present so Typer always runs in subcommand mode (`manage.py user-create`),
    # even while there is only a single command registered.


@cli.command()
async def create_user(
    first_name: str = Option(...),
    last_name: str = Option(...),
    email: str = Option(...),
    password: str = Option(None, help="Login password. Generated if not given."),
    admin: bool = Option(False, "--admin", help="Grant admin privileges."),
):
    """Create a user.

    The login password is generated unless provided with --password.
    Pass --admin to grant admin privileges.
    """
    try:
        data = UserCreate(first_name=first_name, last_name=last_name, email=email)
    except ValidationError as e:
        raise BadParameter("; ".join(err["msg"] for err in e.errors()))

    existing = (
        (await session.execute(select(User).where(User.email == data.email)))
        .scalars()
        .first()
    )
    if existing:
        raise BadParameter(f"User with email '{data.email}' already exists.")

    generated = password is None
    if generated:
        password = secrets.token_urlsafe(12)

    user = User(
        **data.model_dump(),
        password=hash_password(password),
        is_active=True,
        is_admin=admin,
    )
    session.add(user)
    await session.commit()
    print(f"{'Admin' if admin else 'User'} created: ", user.id)
    if generated:
        print("Generated password: ", password)


@cli.command()
async def seed():
    """Seed the database with sample organizations, teams, users, and weekly plans."""
    from datetime import date, datetime, timedelta

    from app.models import Membership, Organization, Plan, Task, Team, TeamMember

    default_password = "Password123!"
    hashed_pwd = hash_password(default_password)

    print("Seeding WeekSync database...")

    # 1. Helper to get or create a user
    async def get_or_create_user(
        email: str, first_name: str, last_name: str, is_admin: bool = False
    ) -> User:
        user = (
            (await session.execute(select(User).where(User.email == email.lower())))
            .scalars()
            .first()
        )
        if not user:
            user = User(
                email=email.lower(),
                password=hashed_pwd,
                first_name=first_name,
                last_name=last_name,
                is_active=True,
                is_admin=is_admin,
            )
            session.add(user)
            await session.flush()
        else:
            user.password = hashed_pwd
            user.is_active = True
            user.is_admin = is_admin
            await session.flush()
        return user

    # 2. Helper to get or create an organization
    async def get_or_create_org(name: str, slug: str, owner_id) -> Organization:
        org = (
            (
                await session.execute(
                    select(Organization).where(Organization.slug == slug)
                )
            )
            .scalars()
            .first()
        )
        if not org:
            org = Organization(name=name, slug=slug, is_suspended=False)
            session.add(org)
            await session.flush()
            session.add(
                Membership(organization_id=org.id, user_id=owner_id, org_role="owner")
            )
            await session.flush()
        return org

    # 3. Helper to ensure membership
    async def ensure_membership(org_id, user_id, role: str):
        mem = (
            (
                await session.execute(
                    select(Membership).where(
                        Membership.organization_id == org_id,
                        Membership.user_id == user_id,
                    )
                )
            )
            .scalars()
            .first()
        )
        if not mem:
            session.add(
                Membership(organization_id=org_id, user_id=user_id, org_role=role)
            )
            await session.flush()
        else:
            mem.org_role = role
            await session.flush()

    # 4. Helper to get or create team
    async def get_or_create_team(org_id, name: str, lead_id) -> Team:
        team = (
            (
                await session.execute(
                    select(Team).where(
                        Team.organization_id == org_id, Team.name == name
                    )
                )
            )
            .scalars()
            .first()
        )
        if not team:
            team = Team(organization_id=org_id, name=name, lead_user_id=lead_id)
            session.add(team)
            await session.flush()
        else:
            team.lead_user_id = lead_id
            await session.flush()
        return team

    # 5. Helper to add team member
    async def ensure_team_member(team_id, user_id):
        tm = (
            (
                await session.execute(
                    select(TeamMember).where(
                        TeamMember.team_id == team_id, TeamMember.user_id == user_id
                    )
                )
            )
            .scalars()
            .first()
        )
        if not tm:
            session.add(TeamMember(team_id=team_id, user_id=user_id))
            await session.flush()

    # 6. Helper to seed a plan
    async def seed_plan(
        org_id,
        team_id,
        user_id,
        week_start: date,
        status: str,
        main_task: tuple[str, str, bool],  # (title, why, completed)
        sub_goals: list[tuple[str, bool]],  # list of (title, completed)
        gtm_goals: list[tuple[str, bool]],  # list of (title, completed)
        main_task_shipped: bool | None = None,
        review_comment: str | None = None,
        reviewer_id=None,
    ):
        plan = (
            (
                await session.execute(
                    select(Plan).where(
                        Plan.user_id == user_id, Plan.week_start_date == week_start
                    )
                )
            )
            .scalars()
            .first()
        )

        now = datetime.now(UTC)
        if not plan:
            plan = Plan(
                organization_id=org_id,
                team_id=team_id,
                user_id=user_id,
                week_start_date=week_start,
                status=status,
                main_task_shipped=main_task_shipped,
                review_comment=review_comment,
                reviewed_by_user_id=reviewer_id,
                reviewed_at=now if reviewer_id else None,
            )
            session.add(plan)
            await session.flush()
        else:
            plan.organization_id = org_id
            plan.team_id = team_id
            plan.status = status
            plan.main_task_shipped = main_task_shipped
            plan.review_comment = review_comment
            plan.reviewed_by_user_id = reviewer_id
            plan.reviewed_at = now if reviewer_id else None
            from sqlalchemy import delete

            await session.execute(delete(Task).where(Task.plan_id == plan.id))
            await session.flush()

        # Insert tasks
        sort_order = 0
        session.add(
            Task(
                plan_id=plan.id,
                category="main",
                title=main_task[0],
                why_it_matters=main_task[1],
                is_completed=main_task[2],
                sort_order=sort_order,
            )
        )
        sort_order += 1

        for title, comp in sub_goals:
            session.add(
                Task(
                    plan_id=plan.id,
                    category="sub_goal",
                    title=title,
                    is_completed=comp,
                    sort_order=sort_order,
                )
            )
            sort_order += 1

        for title, comp in gtm_goals:
            session.add(
                Task(
                    plan_id=plan.id,
                    category="gtm",
                    title=title,
                    is_completed=comp,
                    sort_order=sort_order,
                )
            )
            sort_order += 1

        await session.flush()

    # --- Create Users ---
    _staff_user = await get_or_create_user(
        "staff@weeks.sync", "Platform", "Staff", is_admin=True
    )

    # Acme Corp users
    acme_owner = await get_or_create_user(
        "owner@acme.com", "Alice", "Vance", is_admin=False
    )
    acme_lead = await get_or_create_user(
        "lead@acme.com", "Bob", "Stone", is_admin=False
    )
    acme_member = await get_or_create_user(
        "member@acme.com", "Charlie", "Day", is_admin=False
    )
    acme_designer = await get_or_create_user(
        "designer@acme.com", "Dana", "Scully", is_admin=False
    )

    # Globex users
    globex_owner = await get_or_create_user(
        "owner@globex.com", "Hank", "Scorpio", is_admin=False
    )
    globex_lead = await get_or_create_user(
        "lead@globex.com", "Homer", "Simpson", is_admin=False
    )
    globex_member = await get_or_create_user(
        "member@globex.com", "Carl", "Carlson", is_admin=False
    )

    # --- Create Organizations ---
    acme_org = await get_or_create_org("Acme Corp", "acme-corp", acme_owner.id)
    await ensure_membership(acme_org.id, acme_lead.id, "admin")
    await ensure_membership(acme_org.id, acme_member.id, "member")
    await ensure_membership(acme_org.id, acme_designer.id, "member")

    globex_org = await get_or_create_org(
        "Globex Media", "globex-media", globex_owner.id
    )
    await ensure_membership(globex_org.id, globex_lead.id, "admin")
    await ensure_membership(globex_org.id, globex_member.id, "member")

    # --- Create Teams ---
    acme_eng = await get_or_create_team(acme_org.id, "Engineering", acme_lead.id)
    await ensure_team_member(acme_eng.id, acme_owner.id)
    await ensure_team_member(acme_eng.id, acme_lead.id)
    await ensure_team_member(acme_eng.id, acme_member.id)
    await ensure_team_member(acme_eng.id, acme_designer.id)

    globex_dev = await get_or_create_team(globex_org.id, "Core Product", globex_lead.id)
    await ensure_team_member(globex_dev.id, globex_owner.id)
    await ensure_team_member(globex_dev.id, globex_lead.id)
    await ensure_team_member(globex_dev.id, globex_member.id)

    # --- Calculate Monday dates ---
    today = datetime.now(tz=UTC).date()
    this_monday = today - timedelta(days=today.weekday())
    last_monday = this_monday - timedelta(days=7)
    two_weeks_ago = this_monday - timedelta(days=14)
    three_weeks_ago = this_monday - timedelta(days=21)

    # =========================================================================
    # --- Seed Plans for Acme Corp (Past 3 Weeks + Current Week) ---
    # =========================================================================

    # -------------------------------------------------------------------------
    # WEEK -3 (3 WEEKS AGO) - Acme Corp
    # -------------------------------------------------------------------------

    # 1. Charlie Day (Backend / Full-Stack) - Week -3: Done & Shipped
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_member.id,
        week_start=three_weeks_ago,
        status="done",
        main_task=(
            "Implement OAuth2 Google & GitHub authentication flow",
            "Eliminate signup friction and drop-off during enterprise team onboarding",
            True,
        ),
        sub_goals=[
            ("Configure OAuth consent screens for Google & GitHub apps", True),
            ("Build token exchange callback and JWT minting service", True),
            (
                "Add 'Continue with Google' and 'Continue with GitHub' buttons in auth UI",
                True,
            ),
        ],
        gtm_goals=[
            ("Update authentication guide and changelog release notes", True),
        ],
        main_task_shipped=True,
        reviewer_id=acme_lead.id,
        review_comment="SSO flow works smoothly across desktop and mobile browsers.",
    )

    # 2. Dana Scully (Product / UX Designer) - Week -3: Done & Shipped
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_designer.id,
        week_start=three_weeks_ago,
        status="done",
        main_task=(
            "Design token architecture & Figma component library",
            "Establish unified typography scale, spacing units, and high-contrast tokens",
            True,
        ),
        sub_goals=[
            ("Define Inter & Geist typography scale and vertical rhythm", True),
            ("Create calibrated monochrome tokens for light and dark modes", True),
            (
                "Build reusable button, input, badge, and dialog components in Figma",
                True,
            ),
        ],
        gtm_goals=[
            (
                "Lead 30-minute design token review session with frontend engineers",
                True,
            ),
        ],
        main_task_shipped=True,
        reviewer_id=acme_lead.id,
        review_comment="Tokens mapped cleanly into CSS variables. Huge improvement to UI consistency.",
    )

    # 3. Bob Stone (Engineering Lead) - Week -3: Done & Shipped
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_lead.id,
        week_start=three_weeks_ago,
        status="done",
        main_task=(
            "Multi-tenant database schema isolation & anti-oracle audit",
            "Prevent cross-organization data leaks and establish strict foreign key cascades",
            True,
        ),
        sub_goals=[
            ("Audit all Alembic migrations for anti-oracle index coverage", True),
            (
                "Add organization tenancy validation dependencies to all API routes",
                True,
            ),
            ("Stress test connection pooler with 100 concurrent tenant sessions", True),
        ],
        gtm_goals=[
            ("Document tenancy isolation model in architecture handbook", True),
        ],
        main_task_shipped=True,
        review_comment="Tenancy isolation verified with automated anti-oracle tests.",
    )

    # 4. Alice Vance (Org Owner / Founder) - Week -3: Done & Shipped
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_owner.id,
        week_start=three_weeks_ago,
        status="done",
        main_task=(
            "Close 5 enterprise lighthouse pilot customer agreements",
            "Validate product-market fit and secure commitments for paid Q4 rollouts",
            True,
        ),
        sub_goals=[
            ("Conduct deep-dive onboarding interviews with 8 engineering leads", True),
            ("Finalize Master Services Agreement (MSA) legal contract template", True),
            ("Collect signed pilot agreements from all 5 enterprise targets", True),
        ],
        gtm_goals=[
            ("Publish customer logo announcements on company LinkedIn", True),
        ],
        main_task_shipped=True,
        reviewer_id=acme_lead.id,
        review_comment="Milestone achieved. All 5 enterprise pilots are officially signed.",
    )

    # -------------------------------------------------------------------------
    # WEEK -2 (2 WEEKS AGO) - Acme Corp
    # -------------------------------------------------------------------------

    # 5. Charlie Day - Week -2: Done, but Missed shipping goal (Expired card edge cases)
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_member.id,
        week_start=two_weeks_ago,
        status="done",
        main_task=(
            "Stripe subscription checkout & customer billing portal",
            "Enable self-serve trial upgrades to paid tier before end-of-month renewals",
            False,
        ),
        sub_goals=[
            (
                "Create Stripe webhook handler for invoice payments and card declines",
                True,
            ),
            ("Handle customer portal redirect sessions in organization settings", True),
            (
                "Write end-to-end checkout webhook integration tests for expired cards",
                False,
            ),
        ],
        gtm_goals=[
            ("Prepare billing FAQ and refund policy for support team", True),
        ],
        main_task_shipped=False,
        reviewer_id=acme_lead.id,
        review_comment="Checkout works on staging, but held back production rollout until expired card edge cases are tested.",
    )

    # 6. Dana Scully - Week -2: Done & Shipped
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_designer.id,
        week_start=two_weeks_ago,
        status="done",
        main_task=(
            "Mobile-responsive layout audit and compact screen adaptations",
            "Prevent sidebar and weekly planning cards from breaking on compact laptop screens",
            True,
        ),
        sub_goals=[
            ("Fix viewport overflow and spacing below 1024px breakpoints", True),
            ("Design responsive mobile slide-out navigation drawer", True),
            ("Optimize weekly plan studio layout for 13-inch displays", True),
        ],
        gtm_goals=[
            ("Share responsive prototype video walkthrough in #design-critique", True),
        ],
        main_task_shipped=True,
        reviewer_id=acme_lead.id,
        review_comment="Compact layout feels spacious and clean on smaller screens.",
    )

    # 7. Bob Stone - Week -2: Done & Shipped
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_lead.id,
        week_start=two_weeks_ago,
        status="done",
        main_task=(
            "Automated CI pipeline and test suite parallelization",
            "Cut PR verification time from 8 minutes down to under 45 seconds",
            True,
        ),
        sub_goals=[
            ("Configure uv dependency caching in GitHub Actions workflow", True),
            ("Set up pytest-xdist for multi-worker test execution", True),
            ("Add oxlint and TypeScript type-check automated gates", True),
        ],
        gtm_goals=[
            ("Share CI turnaround benchmarks with engineering team", True),
        ],
        main_task_shipped=True,
        review_comment="Pipeline execution time dropped to 38 seconds. Massive productivity boost.",
    )

    # 8. Alice Vance - Week -2: Done & Shipped
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_owner.id,
        week_start=two_weeks_ago,
        status="done",
        main_task=(
            "Weekly product cadence playbook and customer advisory council",
            "Establish bi-weekly customer feedback loop to guide roadmap prioritization",
            True,
        ),
        sub_goals=[
            ("Draft 'The 5-Minute Weekly Rhythm' guide for managers", True),
            ("Recruit 6 engineering design partners for advisory council", True),
            ("Host inaugural advisory session on AI coaching workflows", True),
        ],
        gtm_goals=[
            ("Distribute executive session takeaways to all pilot accounts", True),
        ],
        main_task_shipped=True,
        reviewer_id=acme_lead.id,
        review_comment="Customer feedback on the Friday shipping ritual was overwhelmingly positive.",
    )

    # -------------------------------------------------------------------------
    # WEEK -1 (LAST WEEK) - Acme Corp
    # -------------------------------------------------------------------------

    # 9. Charlie Day - Week -1: Done & Shipped
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_member.id,
        week_start=last_monday,
        status="done",
        main_task=(
            "Real-time team week aggregation and export service",
            "Let engineering leads review full team commitments in one glance and export to CSV",
            True,
        ),
        sub_goals=[
            ("Build multi-member rollup query with plan eager-loading", True),
            ("Add CSV export endpoint for executive weekly standup reports", True),
            ("Add optimistic UI updates when ticking task checkboxes", True),
        ],
        gtm_goals=[
            ("Demo the rollup view to pilot team leads in bi-weekly sync", True),
        ],
        main_task_shipped=True,
        reviewer_id=acme_lead.id,
        review_comment="Rollup queries are super snappy (<40ms). Great work on the eager loading.",
    )

    # 10. Dana Scully - Week -1: Done & Shipped
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_designer.id,
        week_start=last_monday,
        status="done",
        main_task=(
            "End-of-week outcome review modal and celebration animations",
            "Encourage Friday reflection and motivate team members when marking goals as shipped",
            True,
        ),
        sub_goals=[
            ("Design shipped/missed badge iconography and micro-animations", True),
            ("Design AI retrospective summary dialog layout", True),
            (
                "Design Friday celebration confetti effects for shipped deliverables",
                True,
            ),
        ],
        gtm_goals=[
            ("Share retrospective UI designs in #product-announcements", True),
        ],
        main_task_shipped=True,
        reviewer_id=acme_lead.id,
        review_comment="The Friday outcome modal looks fantastic and clean.",
    )

    # 11. Bob Stone - Week -1: Done, but Missed (Staging environment outage)
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_lead.id,
        week_start=last_monday,
        status="done",
        main_task=(
            "API rate limiting and security headers hardening",
            "Protect public endpoints from abuse and pass SOC2 Type I network inspection",
            False,
        ),
        sub_goals=[
            ("Implement token-bucket rate limiter for auth routes", True),
            ("Add Strict-Transport-Security, CSP, and X-Content-Type headers", True),
            ("Simulate distributed DDoS penetration test on staging gateway", False),
        ],
        gtm_goals=[
            ("Submit updated network architecture diagram to security auditor", True),
        ],
        main_task_shipped=False,
        review_comment="Security headers deployed; penetration testing moved to next sprint due to staging maintenance.",
    )

    # 12. Alice Vance - Week -1: Done & Shipped
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_owner.id,
        week_start=last_monday,
        status="done",
        main_task=(
            "Enterprise security review package and sales enablement kit",
            "Eliminate sales cycle bottlenecks by having security documentation pre-approved",
            True,
        ),
        sub_goals=[
            ("Assemble SOC2 compliance readiness packet with network diagrams", True),
            ("Create standard Data Processing Addendum (DPA) and privacy guide", True),
            ("Conduct security briefing call with enterprise procurement team", True),
        ],
        gtm_goals=[
            ("Publish Trust & Security page on public marketing website", True),
        ],
        main_task_shipped=True,
        reviewer_id=acme_lead.id,
        review_comment="Security packet cleared enterprise vendor assessment with zero redlines.",
    )

    # -------------------------------------------------------------------------
    # CURRENT WEEK (THIS WEEK) - Acme Corp
    # -------------------------------------------------------------------------

    # 13. Charlie Day - Current Week: Approved (In Progress)
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_member.id,
        week_start=this_monday,
        status="approved",
        main_task=(
            "AI-powered Weekly Plan critique and coaching integration",
            "Help team members write clear, measurable outcomes instead of vague activity logs",
            False,
        ),
        sub_goals=[
            ("Connect Pydantic AI agent with Gemini 2.5 Flash", True),
            ("Render findings panel with category badges & rewrite suggestions", False),
            ("Add inline 1-click apply suggestion button to input fields", False),
        ],
        gtm_goals=[
            ("Record a 90-second product clip highlighting AI coaching", False),
        ],
        reviewer_id=acme_lead.id,
        review_comment="Excited about this! Make sure timeouts gracefully fallback without blocking.",
    )

    # 14. Dana Scully - Current Week: Submitted (Awaiting Review)
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_designer.id,
        week_start=this_monday,
        status="submitted",
        main_task=(
            "Dark mode high-contrast refinement and accessibility audit",
            "Ensure all badges, borders, and muted text meet WCAG AAA 7:1 contrast ratios",
            False,
        ),
        sub_goals=[
            ("Run axe-core automated accessibility audit across all routes", True),
            ("Adjust secondary foreground text opacity for darker backgrounds", False),
            (
                "Refine focus rings on keyboard navigation for interactive elements",
                False,
            ),
        ],
        gtm_goals=[
            (
                "Draft accessibility compliance scorecard for sales security questionnaires",
                False,
            ),
        ],
    )

    # 15. Bob Stone - Current Week: Draft (Lead's own plan)
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_lead.id,
        week_start=this_monday,
        status="draft",
        main_task=(
            "Q4 Infrastructure Capacity Planning & Database Optimization",
            "Ensure database and worker pools handle 10x traffic spike comfortably",
            False,
        ),
        sub_goals=[
            ("Profile slow queries on weekly plans rollup endpoints", False),
            ("Configure connection pooling latency alerts in Grafana", False),
            ("Benchmark read-replica failover under simulated traffic surge", False),
        ],
        gtm_goals=[
            ("Share infrastructure budget forecast with executive committee", False),
        ],
    )

    # 16. Alice Vance - Current Week: Approved (In Progress)
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_owner.id,
        week_start=this_monday,
        status="approved",
        main_task=(
            "Q4 Enterprise Pricing Strategy & Self-Serve Conversion Funnel",
            "Transition pilot accounts to annual contracts and optimize self-serve signups",
            False,
        ),
        sub_goals=[
            ("Analyze willingness-to-pay survey data from pilot teams", True),
            ("Finalize team vs enterprise per-seat monthly tier structure", False),
            ("Set up quarterly sales pipeline dashboard in CRM", False),
        ],
        gtm_goals=[
            ("Send Q4 renewal terms to pilot accounts with early-bird discount", False),
        ],
        reviewer_id=acme_lead.id,
        review_comment="Tier structure looks sound. Pricing curve matches our buyer personas well.",
    )

    # =========================================================================
    # --- Seed Plans for Globex Media (Past 3 Weeks + Current Week) ---
    # =========================================================================

    # Week -3: Carl Carlson - Done & Shipped
    await seed_plan(
        org_id=globex_org.id,
        team_id=globex_dev.id,
        user_id=globex_member.id,
        week_start=three_weeks_ago,
        status="done",
        main_task=(
            "Media asset transcoder microservice and CDN caching",
            "Cut video upload processing time by 60% for high-resolution broadcast assets",
            True,
        ),
        sub_goals=[
            ("Deploy ffmpeg worker pool with async queue consumption", True),
            ("Configure Cloudflare edge caching for HLS video segments", True),
            ("Benchmark 4K video transcoding speed and memory footprint", True),
        ],
        gtm_goals=[
            ("Publish technical deep-dive on engineering blog", True),
        ],
        main_task_shipped=True,
        reviewer_id=globex_lead.id,
        review_comment="Transcode throughput is 3x faster than our previous pipeline.",
    )

    # Week -3: Homer Simpson - Done & Shipped
    await seed_plan(
        org_id=globex_org.id,
        team_id=globex_dev.id,
        user_id=globex_lead.id,
        week_start=three_weeks_ago,
        status="done",
        main_task=(
            "Live broadcast stream health monitoring & alert triggers",
            "Detect frame drops and audio desync within 2 seconds of occurrence",
            True,
        ),
        sub_goals=[
            ("Deploy Prometheus metrics exporter for media ingest nodes", True),
            ("Configure PagerDuty webhooks for bitrate degradation", True),
            ("Test automated stream rerouting during packet loss simulation", True),
        ],
        gtm_goals=[
            ("Present monitoring dashboard to operations shift supervisors", True),
        ],
        main_task_shipped=True,
        review_comment="Alerts triggered accurately during the weekend stress test.",
    )

    # Week -2: Carl Carlson - Done, Missed (Safari Audio Drift bug)
    await seed_plan(
        org_id=globex_org.id,
        team_id=globex_dev.id,
        user_id=globex_member.id,
        week_start=two_weeks_ago,
        status="done",
        main_task=(
            "Real-time audio waveform visualizer and chapter marker editor",
            "Enable podcast editors to slice audiograms and place chapter markers accurately",
            False,
        ),
        sub_goals=[
            ("Implement Web Audio API canvas waveform rendering", True),
            ("Add draggable chapter markers with timecode snapping", True),
            ("Fix audio synchronization drift on Safari mobile browser", False),
        ],
        gtm_goals=[
            (
                "Share chapter editing tutorial video with podcast production team",
                False,
            ),
        ],
        main_task_shipped=False,
        reviewer_id=globex_lead.id,
        review_comment="Safari drift bug blocked release. Pushing fix to next week.",
    )

    # Week -2: Homer Simpson - Done & Shipped
    await seed_plan(
        org_id=globex_org.id,
        team_id=globex_dev.id,
        user_id=globex_lead.id,
        week_start=two_weeks_ago,
        status="done",
        main_task=(
            "Automated media transcoding worker autoscaling",
            "Dynamically spin up transcode workers during prime-time broadcast hours",
            True,
        ),
        sub_goals=[
            ("Configure AWS KEDA autoscaling based on SQS queue depth", True),
            ("Optimize worker docker image cold-start latency to <5 seconds", True),
            ("Validate scale-down behavior during idle evening hours", True),
        ],
        gtm_goals=[
            ("Report monthly cloud compute savings to finance director", True),
        ],
        main_task_shipped=True,
        review_comment="Worker autoscaling dropped idle cloud compute costs by 28%.",
    )

    # Week -1: Carl Carlson - Done & Shipped
    await seed_plan(
        org_id=globex_org.id,
        team_id=globex_dev.id,
        user_id=globex_member.id,
        week_start=last_monday,
        status="done",
        main_task=(
            "Cross-browser Web Audio synchronization and chapter export",
            "Resolve Safari sync drift and allow direct MP3 chapter metadata exports",
            True,
        ),
        sub_goals=[
            (
                "Replace standard audio element clock with AudioContext hardware timer",
                True,
            ),
            ("Add ID3v2 chapter tag generator library", True),
            ("Verify zero timecode drift across Chrome, Firefox, and Safari", True),
        ],
        gtm_goals=[
            ("Release podcast chapter feature to all content creators", True),
        ],
        main_task_shipped=True,
        reviewer_id=globex_lead.id,
        review_comment="Sync is rock solid now. Safari tests passed cleanly.",
    )

    # Week -1: Homer Simpson - Done & Shipped
    await seed_plan(
        org_id=globex_org.id,
        team_id=globex_dev.id,
        user_id=globex_lead.id,
        week_start=last_monday,
        status="done",
        main_task=(
            "High-availability Redis cluster migration for session caching",
            "Eliminate single point of failure in content publishing queues",
            True,
        ),
        sub_goals=[
            ("Provision 3-node Redis sentinel cluster on AWS ElastiCache", True),
            ("Configure automated failover health checks and alerting", True),
            (
                "Migrate live session keys with zero downtime during off-peak window",
                True,
            ),
        ],
        gtm_goals=[
            ("Update disaster recovery runbook for DevOps rotation", True),
        ],
        main_task_shipped=True,
        review_comment="Zero dropped connections during cutover.",
    )

    # Current Week: Carl Carlson - Approved (In Progress)
    await seed_plan(
        org_id=globex_org.id,
        team_id=globex_dev.id,
        user_id=globex_member.id,
        week_start=this_monday,
        status="approved",
        main_task=(
            "Editorial scheduling calendar widget and automated social syndication",
            "Allow editors to preview publishing queues and auto-post to social channels",
            False,
        ),
        sub_goals=[
            ("Integrate interactive drag-and-drop calendar matrix", True),
            ("Connect queue API to real-time publishing scheduler", False),
            (
                "Implement OAuth connection for Twitter/X and LinkedIn syndication",
                False,
            ),
        ],
        gtm_goals=[
            ("Conduct 30-minute training session with editorial desk staff", False),
        ],
        reviewer_id=globex_lead.id,
        review_comment="Great progress on the calendar matrix. Keep social syndication scoped to v1.",
    )

    # Current Week: Homer Simpson - Draft
    await seed_plan(
        org_id=globex_org.id,
        team_id=globex_dev.id,
        user_id=globex_lead.id,
        week_start=this_monday,
        status="draft",
        main_task=(
            "Automated content backup and cross-region disaster recovery replication",
            "Ensure all published media archives survive catastrophic regional datacenter outages",
            False,
        ),
        sub_goals=[
            ("Set up S3 cross-region bucket replication with KMS encryption", False),
            ("Automate daily snapshot verification test via Lambda", False),
        ],
        gtm_goals=[
            ("Present quarterly business continuity report to risk committee", False),
        ],
    )

    await session.commit()

    print("\n" + "=" * 62)
    print("           WeekSync Database Seed Complete!           ")
    print("=" * 62)
    print("\nSeeded 4 weeks of plans across Acme Corp & Globex Media:")
    print(f"  • Week -3:  {three_weeks_ago.isoformat()} (Shipped milestones)")
    print(f"  • Week -2:  {two_weeks_ago.isoformat()} (Shipped & Missed retros)")
    print(f"  • Week -1:  {last_monday.isoformat()} (Recent completions)")
    print(f"  • Current:  {this_monday.isoformat()} (Approved, Submitted & Draft)")
    print("\nDemo Accounts (Password for all: Password123!):")
    print("\n  [Platform Internal Staff] (Port 3002: http://localhost:3002)")
    print("    Email:     staff@weeks.sync")
    print("    Role:      Internal Admin")
    print(
        "\n  [Acme Corp - Primary Customer Tenant] (Port 3001: http://localhost:3001)"
    )
    print("    Org Owner: owner@acme.com  (Alice Vance - 4 weeks of plans)")
    print("    Team Lead: lead@acme.com   (Bob Stone - 4 weeks of plans)")
    print("    Member 1:  member@acme.com (Charlie Day - 4 weeks of plans)")
    print("    Designer:  designer@acme.com (Dana Scully - 4 weeks of plans)")
    print("\n  [Globex Media - Secondary Tenant for Tenancy Testing]")
    print("    Org Owner: owner@globex.com (Hank Scorpio)")
    print("    Team Lead: lead@globex.com  (Homer Simpson - 4 weeks of plans)")
    print("    Member:    member@globex.com (Carl Carlson - 4 weeks of plans)")
    print("=" * 62 + "\n")


@cli.command()
def export_openapi():
    """Export OpenAPI specs to JSON files for app and internal frontends."""
    import json
    from pathlib import Path

    from app.main import app_api, internal_api

    root_dir = Path(__file__).resolve().parent.parent.parent.parent
    app_target = root_dir / "app" / "openapi.json"
    internal_target = root_dir / "internal" / "openapi.json"

    with open(app_target, "w", encoding="utf-8") as f:
        json.dump(app_api.openapi(), f, indent=2)
    with open(internal_target, "w", encoding="utf-8") as f:
        json.dump(internal_api.openapi(), f, indent=2)

    print(f"Exported app OpenAPI spec to: {app_target}")
    print(f"Exported internal OpenAPI spec to: {internal_target}")
