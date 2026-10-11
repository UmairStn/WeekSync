from datetime import date, timedelta
import pytest
from faker import Faker

from app.models import Membership, Organization, Team, TeamMember, User
from app.security import JWT_AUDIENCE_APP, generate_jwt_token, hash_password
from app.services.orgs import OrganizationService
from app.services.teams import TeamService

fake = Faker()


def get_upcoming_monday() -> date:
    today = date.today()
    days_ahead = (0 - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return today + timedelta(days=days_ahead)


async def create_user_and_token(session_factory, first_name="Test", last_name="User"):
    """Helper to create a user and return (user, token)."""
    async with session_factory() as db:
        user = User(
            first_name=first_name,
            last_name=last_name,
            email=fake.email().lower(),
            password=hash_password("password123"),
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        token = generate_jwt_token({"sub": str(user.id)}, audience=JWT_AUDIENCE_APP)
        return user, token


@pytest.mark.asyncio
async def test_plan_validation_rules(async_client, session_factory):
    """Test plan requires a Monday date and exactly one main task with why_it_matters."""
    owner, token = await create_user_and_token(session_factory, first_name="Owner")
    async_client.cookies.set("access_token", f"Bearer {token}")

    # Create Org and Team
    org_resp = await async_client.post("/app/orgs", json={"name": "Validation Org"})
    org_id = org_resp.json()["id"]
    team_resp = await async_client.post(
        f"/app/orgs/{org_id}/teams", json={"name": "Dev Team"}
    )
    team_id = team_resp.json()["id"]

    # 1. Non-Monday date fails with 400
    sunday = get_upcoming_monday() - timedelta(days=1)
    bad_date_payload = {
        "team_id": team_id,
        "week_start_date": sunday.isoformat(),
        "tasks": [
            {
                "category": "main",
                "title": "Ship MVP",
                "why_it_matters": "Crucial for launch",
            }
        ],
    }
    resp1 = await async_client.post(f"/app/orgs/{org_id}/plans", json=bad_date_payload)
    assert resp1.status_code == 400

    # 2. Missing main task fails with 400
    monday = get_upcoming_monday()
    no_main_payload = {
        "team_id": team_id,
        "week_start_date": monday.isoformat(),
        "tasks": [
            {
                "category": "sub_goal",
                "title": "Build UI component",
            }
        ],
    }
    resp2 = await async_client.post(f"/app/orgs/{org_id}/plans", json=no_main_payload)
    assert resp2.status_code == 400

    # 3. Main task without why_it_matters fails with 400
    no_why_payload = {
        "team_id": team_id,
        "week_start_date": monday.isoformat(),
        "tasks": [
            {
                "category": "main",
                "title": "Ship MVP",
                "why_it_matters": "   ",
            }
        ],
    }
    resp3 = await async_client.post(f"/app/orgs/{org_id}/plans", json=no_why_payload)
    assert resp3.status_code == 400


@pytest.mark.asyncio
async def test_full_plan_lifecycle_and_approval(async_client, session_factory):
    """Test plan lifecycle: draft -> submit -> lead approve -> task ticking -> outcome shipped."""
    lead, lead_token = await create_user_and_token(session_factory, first_name="Team", last_name="Lead")
    member, member_token = await create_user_and_token(session_factory, first_name="Dev", last_name="Member")

    # Set up Org and Team with Lead and Member
    async with session_factory() as db:
        org_svc = OrganizationService(db)
        org = await org_svc.create_organization(user_id=lead.id, name="Lifecycle Org")
        org_id = str(org.id)

        # Add member to org
        db.add(Membership(organization_id=org.id, user_id=member.id, org_role="member"))
        await db.flush()

        # Create team with lead
        team_svc = TeamService(db)
        team = await team_svc.create_team(org_id=org.id, name="Core Team", lead_user_id=lead.id)
        team_id = str(team.id)

        # Add member to team
        await team_svc.add_member(org_id=org.id, team_id=team.id, user_id=member.id)
        await db.commit()

    monday = get_upcoming_monday()

    # 1. Member creates a draft plan with main, sub-goal, and GTM goals
    async_client.cookies.set("access_token", f"Bearer {member_token}")
    plan_payload = {
        "team_id": team_id,
        "week_start_date": monday.isoformat(),
        "tasks": [
            {
                "category": "main",
                "title": "Launch Billing Integration",
                "why_it_matters": "Enables revenue collection before month end",
                "sort_order": 0,
            },
            {
                "category": "sub_goal",
                "title": "Connect Stripe Webhooks",
                "sort_order": 1,
            },
            {
                "category": "gtm",
                "title": "Send announcement email to beta cohort",
                "sort_order": 2,
            },
        ],
    }
    create_resp = await async_client.post(f"/app/orgs/{org_id}/plans", json=plan_payload)
    assert create_resp.status_code == 201
    plan_data = create_resp.json()
    plan_id = plan_data["id"]
    assert plan_data["status"] == "draft"
    assert len(plan_data["tasks"]) == 3

    # 2. Member submits the plan for review
    submit_resp = await async_client.post(f"/app/orgs/{org_id}/plans/{plan_id}/submit")
    assert submit_resp.status_code == 200
    assert submit_resp.json()["status"] == "submitted"

    # 3. Team Lead approves the plan
    async_client.cookies.set("access_token", f"Bearer {lead_token}")
    approve_resp = await async_client.post(f"/app/orgs/{org_id}/plans/{plan_id}/approve")
    assert approve_resp.status_code == 200
    approved_plan = approve_resp.json()
    assert approved_plan["status"] == "approved"
    assert approved_plan["reviewed_by_user_id"] == str(lead.id)

    # 4. Member ticks tasks done during the week
    async_client.cookies.set("access_token", f"Bearer {member_token}")
    first_task_id = approved_plan["tasks"][0]["id"]
    tick_resp = await async_client.patch(
        f"/app/orgs/{org_id}/plans/{plan_id}/tasks/{first_task_id}",
        json={"is_completed": True},
    )
    assert tick_resp.status_code == 200
    assert tick_resp.json()["is_completed"] is True

    # 5. Member marks main goal shipped at week end -> status transitions to 'done'
    outcome_resp = await async_client.patch(
        f"/app/orgs/{org_id}/plans/{plan_id}/outcome",
        json={"main_task_shipped": True},
    )
    assert outcome_resp.status_code == 200
    done_plan = outcome_resp.json()
    assert done_plan["status"] == "done"
    assert done_plan["main_task_shipped"] is True


@pytest.mark.asyncio
async def test_non_lead_cannot_approve_plan(async_client, session_factory):
    """Security Requirement: Non-lead regular member CANNOT approve or send back a plan (403 Forbidden)."""
    lead, _ = await create_user_and_token(session_factory, first_name="Real", last_name="Lead")
    member_a, token_a = await create_user_and_token(session_factory, first_name="Member", last_name="A")
    member_b, token_b = await create_user_and_token(session_factory, first_name="Member", last_name="B")

    async with session_factory() as db:
        org_svc = OrganizationService(db)
        org = await org_svc.create_organization(user_id=lead.id, name="Security Org")
        org_id = str(org.id)

        # Add member A and B
        db.add(Membership(organization_id=org.id, user_id=member_a.id, org_role="member"))
        db.add(Membership(organization_id=org.id, user_id=member_b.id, org_role="member"))
        await db.flush()

        # Create team where only lead is the team lead
        team_svc = TeamService(db)
        team = await team_svc.create_team(org_id=org.id, name="Security Team", lead_user_id=lead.id)
        team_id = str(team.id)
        await team_svc.add_member(org_id=org.id, team_id=team.id, user_id=member_a.id)
        await team_svc.add_member(org_id=org.id, team_id=team.id, user_id=member_b.id)
        await db.commit()

    monday = get_upcoming_monday()

    # Member A creates and submits a plan
    async_client.cookies.set("access_token", f"Bearer {token_a}")
    plan_payload = {
        "team_id": team_id,
        "week_start_date": monday.isoformat(),
        "tasks": [
            {
                "category": "main",
                "title": "Critical Feature",
                "why_it_matters": "High priority",
            }
        ],
    }
    p_resp = await async_client.post(f"/app/orgs/{org_id}/plans", json=plan_payload)
    plan_id = p_resp.json()["id"]
    await async_client.post(f"/app/orgs/{org_id}/plans/{plan_id}/submit")

    # Member B (regular member, not lead) tries to approve Member A's plan -> 403 Forbidden
    async_client.cookies.set("access_token", f"Bearer {token_b}")
    approve_attack = await async_client.post(f"/app/orgs/{org_id}/plans/{plan_id}/approve")
    assert approve_attack.status_code == 403

    # Member B tries to send back Member A's plan -> 403 Forbidden
    send_back_attack = await async_client.post(
        f"/app/orgs/{org_id}/plans/{plan_id}/send-back",
        json={"comment": "Unauthorized rejection"},
    )
    assert send_back_attack.status_code == 403


@pytest.mark.asyncio
async def test_team_week_overview_and_send_back(async_client, session_factory):
    """Test team lead reviews Team's Week overview and can send back a plan with comments."""
    lead, lead_token = await create_user_and_token(session_factory, first_name="Boss", last_name="Lead")
    member, member_token = await create_user_and_token(session_factory, first_name="Staff", last_name="Engineer")

    async with session_factory() as db:
        org_svc = OrganizationService(db)
        org = await org_svc.create_organization(user_id=lead.id, name="Overview Org")
        org_id = str(org.id)

        db.add(Membership(organization_id=org.id, user_id=member.id, org_role="member"))
        await db.flush()

        team_svc = TeamService(db)
        team = await team_svc.create_team(org_id=org.id, name="Alpha Team", lead_user_id=lead.id)
        team_id = str(team.id)
        await team_svc.add_member(org_id=org.id, team_id=team.id, user_id=member.id)
        await db.commit()

    monday = get_upcoming_monday()

    # Member submits plan
    async_client.cookies.set("access_token", f"Bearer {member_token}")
    p_resp = await async_client.post(
        f"/app/orgs/{org_id}/plans",
        json={
            "team_id": team_id,
            "week_start_date": monday.isoformat(),
            "tasks": [
                {
                    "category": "main",
                    "title": "Draft Design System",
                    "why_it_matters": "Consistency across app",
                }
            ],
        },
    )
    plan_id = p_resp.json()["id"]
    await async_client.post(f"/app/orgs/{org_id}/plans/{plan_id}/submit")

    # Lead visits Team's Week overview
    async_client.cookies.set("access_token", f"Bearer {lead_token}")
    week_resp = await async_client.get(
        f"/app/orgs/{org_id}/teams/{team_id}/week?week_start_date={monday.isoformat()}"
    )
    assert week_resp.status_code == 200
    overview = week_resp.json()
    assert overview["team_name"] == "Alpha Team"
    assert len(overview["members"]) == 2  # Lead and Member

    member_status = next(m for m in overview["members"] if m["user_id"] == str(member.id))
    assert member_status["status"] == "submitted"
    assert member_status["main_task_title"] == "Draft Design System"

    # Lead sends back plan with comment
    send_back_resp = await async_client.post(
        f"/app/orgs/{org_id}/plans/{plan_id}/send-back",
        json={"comment": "Please break this down into smaller checkable deliverables."},
    )
    assert send_back_resp.status_code == 200
    sent_back_plan = send_back_resp.json()
    assert sent_back_plan["status"] == "draft"
    assert "Please break this down" in sent_back_plan["review_comment"]


@pytest.mark.asyncio
async def test_cross_org_plan_access_returns_404(async_client, session_factory):
    """Anti-Oracle Test: Accessing a plan belonging to another organization returns 404."""
    user_a, token_a = await create_user_and_token(session_factory, first_name="Alice")
    user_b, token_b = await create_user_and_token(session_factory, first_name="Bob")

    monday = get_upcoming_monday()

    # Alice creates Org A, Team A, Plan A
    async_client.cookies.set("access_token", f"Bearer {token_a}")
    org_a = (await async_client.post("/app/orgs", json={"name": "Org A"})).json()
    team_a = (
        await async_client.post(f"/app/orgs/{org_a['id']}/teams", json={"name": "Team A"})
    ).json()
    plan_a = (
        await async_client.post(
            f"/app/orgs/{org_a['id']}/plans",
            json={
                "team_id": team_a["id"],
                "week_start_date": monday.isoformat(),
                "tasks": [{"category": "main", "title": "Top Secret Plan", "why_it_matters": "Confidential"}],
            },
        )
    ).json()

    # Bob logs into Org B
    async_client.cookies.set("access_token", f"Bearer {token_b}")
    org_b = (await async_client.post("/app/orgs", json={"name": "Org B"})).json()

    # Bob probes Alice's plan via Org B's URL -> 404
    probe_resp = await async_client.get(f"/app/orgs/{org_b['id']}/plans/{plan_a['id']}")
    assert probe_resp.status_code == 404
