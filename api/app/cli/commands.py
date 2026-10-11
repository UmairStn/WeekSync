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
    async def get_or_create_user(email: str, first_name: str, last_name: str, is_admin: bool = False) -> User:
        user = (
            await session.execute(select(User).where(User.email == email.lower()))
        ).scalars().first()
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
            await session.execute(select(Organization).where(Organization.slug == slug))
        ).scalars().first()
        if not org:
            org = Organization(name=name, slug=slug, is_suspended=False)
            session.add(org)
            await session.flush()
            session.add(Membership(organization_id=org.id, user_id=owner_id, org_role="owner"))
            await session.flush()
        return org

    # 3. Helper to ensure membership
    async def ensure_membership(org_id, user_id, role: str):
        mem = (
            await session.execute(
                select(Membership).where(Membership.organization_id == org_id, Membership.user_id == user_id)
            )
        ).scalars().first()
        if not mem:
            session.add(Membership(organization_id=org_id, user_id=user_id, org_role=role))
            await session.flush()
        else:
            mem.org_role = role
            await session.flush()

    # 4. Helper to get or create team
    async def get_or_create_team(org_id, name: str, lead_id) -> Team:
        team = (
            await session.execute(
                select(Team).where(Team.organization_id == org_id, Team.name == name)
            )
        ).scalars().first()
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
            await session.execute(
                select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
            )
        ).scalars().first()
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
            await session.execute(
                select(Plan).where(Plan.user_id == user_id, Plan.week_start_date == week_start)
            )
        ).scalars().first()

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
        session.add(Task(
            plan_id=plan.id,
            category="main",
            title=main_task[0],
            why_it_matters=main_task[1],
            is_completed=main_task[2],
            sort_order=sort_order,
        ))
        sort_order += 1

        for title, comp in sub_goals:
            session.add(Task(
                plan_id=plan.id,
                category="sub_goal",
                title=title,
                is_completed=comp,
                sort_order=sort_order,
            ))
            sort_order += 1

        for title, comp in gtm_goals:
            session.add(Task(
                plan_id=plan.id,
                category="gtm",
                title=title,
                is_completed=comp,
                sort_order=sort_order,
            ))
            sort_order += 1

        await session.flush()

    # --- Create Users ---
    _staff_user = await get_or_create_user("staff@weeks.sync", "Platform", "Staff", is_admin=True)

    # Acme Corp users
    acme_owner = await get_or_create_user("owner@acme.com", "Alice", "Vance", is_admin=False)
    acme_lead = await get_or_create_user("lead@acme.com", "Bob", "Stone", is_admin=False)
    acme_member = await get_or_create_user("member@acme.com", "Charlie", "Day", is_admin=False)
    acme_designer = await get_or_create_user("designer@acme.com", "Dana", "Scully", is_admin=False)

    # Globex users
    globex_owner = await get_or_create_user("owner@globex.com", "Hank", "Scorpio", is_admin=False)
    globex_lead = await get_or_create_user("lead@globex.com", "Homer", "Simpson", is_admin=False)
    globex_member = await get_or_create_user("member@globex.com", "Carl", "Carlson", is_admin=False)

    # --- Create Organizations ---
    acme_org = await get_or_create_org("Acme Corp", "acme-corp", acme_owner.id)
    await ensure_membership(acme_org.id, acme_lead.id, "admin")
    await ensure_membership(acme_org.id, acme_member.id, "member")
    await ensure_membership(acme_org.id, acme_designer.id, "member")

    globex_org = await get_or_create_org("Globex Media", "globex-media", globex_owner.id)
    await ensure_membership(globex_org.id, globex_lead.id, "admin")
    await ensure_membership(globex_org.id, globex_member.id, "member")

    # --- Create Teams ---
    acme_eng = await get_or_create_team(acme_org.id, "Engineering", acme_lead.id)
    await ensure_team_member(acme_eng.id, acme_lead.id)
    await ensure_team_member(acme_eng.id, acme_member.id)
    await ensure_team_member(acme_eng.id, acme_designer.id)

    globex_dev = await get_or_create_team(globex_org.id, "Core Product", globex_lead.id)
    await ensure_team_member(globex_dev.id, globex_lead.id)
    await ensure_team_member(globex_dev.id, globex_member.id)

    # --- Calculate Monday dates ---
    today = datetime.now(tz=UTC).date()
    this_monday = today - timedelta(days=today.weekday())
    last_monday = this_monday - timedelta(days=7)
    two_weeks_ago = this_monday - timedelta(days=14)

    # --- Seed Plans for Acme Corp ---

    # 1. Two weeks ago: Charlie (Done & Shipped)
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_member.id,
        week_start=two_weeks_ago,
        status="done",
        main_task=("Implement OAuth2 Google sign-in", "Eliminate signup friction for enterprise trials", True),
        sub_goals=[
            ("Configure Google Cloud OAuth consent screen", True),
            ("Build backend token validation endpoint", True),
            ("Add 'Continue with Google' button in auth UI", True),
        ],
        gtm_goals=[
            ("Announce OAuth login availability in changelog", True),
        ],
        main_task_shipped=True,
        reviewer_id=acme_lead.id,
    )

    # 2. Last week: Charlie (Done, but Missed shipping goal)
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_member.id,
        week_start=last_monday,
        status="done",
        main_task=("Stripe subscription checkout & portal integration", "Required to transition free pilot customers to paying tier", False),
        sub_goals=[
            ("Create Stripe webhook handler for invoice payments", True),
            ("Handle customer portal redirect sessions", True),
            ("Write end-to-end checkout webhook integration tests", False),
        ],
        gtm_goals=[
            ("Prepare billing FAQ guide for support team", True),
        ],
        main_task_shipped=False,
        reviewer_id=acme_lead.id,
    )

    # 3. This week: Charlie (Approved, in progress)
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_member.id,
        week_start=this_monday,
        status="approved",
        main_task=("Weekly Planning review dashboard for managers", "Enables engineering leads to approve team commitments in under 5 minutes", False),
        sub_goals=[
            ("Build team overview grid component", True),
            ("Add quick approve and comment dialog", False),
            ("Add filter for historical planning weeks", False),
        ],
        gtm_goals=[
            ("Record 2-minute product walkthrough video for beta leads", False),
        ],
        reviewer_id=acme_lead.id,
    )

    # 4. This week: Dana (Submitted, awaiting review)
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_designer.id,
        week_start=this_monday,
        status="submitted",
        main_task=("Redesign navigation sidebar and dark mode palette", "Modernize aesthetic and improve readability on compact screens", False),
        sub_goals=[
            ("Audit typography scale and contrast ratios", True),
            ("Implement collapsible sidebar state persistence", False),
        ],
        gtm_goals=[
            ("Publish design token documentation on Notion", False),
        ],
    )

    # 5. This week: Bob (Lead's own plan, draft)
    await seed_plan(
        org_id=acme_org.id,
        team_id=acme_eng.id,
        user_id=acme_lead.id,
        week_start=this_monday,
        status="draft",
        main_task=("Q4 Infrastructure Capacity Planning & Cost Audit", "Ensure database and worker pools handle 10x traffic spike comfortably", False),
        sub_goals=[
            ("Profile slow queries on weekly plans rollup", False),
            ("Set up connection pooling alerts in Grafana", False),
        ],
        gtm_goals=[
            ("Share infra budget summary with finance", False),
        ],
    )

    # --- Seed Plans for Globex Media ---
    await seed_plan(
        org_id=globex_org.id,
        team_id=globex_dev.id,
        user_id=globex_member.id,
        week_start=this_monday,
        status="approved",
        main_task=("Editorial scheduling calendar widget", "Allow editors to preview publishing queues across channels", False),
        sub_goals=[
            ("Integrate drag and drop calendar library", True),
            ("Connect queue API to real-time websocket", False),
        ],
        gtm_goals=[
            ("Write briefing note for editorial board", False),
        ],
        reviewer_id=globex_lead.id,
    )

    await session.commit()

    print("\n" + "=" * 62)
    print("           WeekSync Database Seed Complete!           ")
    print("=" * 62)
    print("\nDemo Accounts (Password for all: Password123!):")
    print("\n  [Platform Internal Staff] (/internal on port 3001)")
    print("    Email:     staff@weeks.sync")
    print("    Role:      Internal Admin")
    print("\n  [Acme Corp - Primary Customer Tenant] (/ on port 3000)")
    print("    Org Owner: owner@acme.com")
    print("    Team Lead: lead@acme.com")
    print("    Member 1:  member@acme.com (has active & past plans)")
    print("    Member 2:  designer@acme.com (submitted plan awaiting review)")
    print("\n  [Globex Media - Secondary Tenant for Tenancy Testing]")
    print("    Org Owner: owner@globex.com")
    print("    Team Lead: lead@globex.com")
    print("    Member:    member@globex.com")
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

