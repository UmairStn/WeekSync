from datetime import date

import pytest
from faker import Faker

from app.models import Membership, Plan, Task, Team, User
from app.security import (
    JWT_AUDIENCE_APP,
    JWT_AUDIENCE_INTERNAL,
    generate_jwt_token,
    hash_password,
)
from app.services.orgs import OrganizationService

fake = Faker()


@pytest.fixture
async def admin_user(session_factory):
    async with session_factory() as db:
        user = User(
            first_name="Platform",
            last_name="Staff",
            email=fake.email().lower(),
            password=hash_password("adminpassword123"),
            is_admin=True,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user


@pytest.fixture
def admin_token(admin_user):
    return generate_jwt_token({"sub": str(admin_user.id)}, audience=JWT_AUDIENCE_INTERNAL)


@pytest.fixture
def admin_headers(admin_token):
    return {"Access-Token": f"Bearer {admin_token}"}


@pytest.mark.asyncio
async def test_internal_list_organizations_with_aggregates(
    async_client, session_factory, admin_headers
):
    """Platform staff can list organizations with accurate member, team, and plan counts."""
    async with session_factory() as db:
        owner = User(
            first_name="Customer",
            last_name="Owner",
            email=fake.email().lower(),
            password=hash_password("password123"),
            is_admin=False,
            is_active=True,
        )
        member = User(
            first_name="Customer",
            last_name="Member",
            email=fake.email().lower(),
            password=hash_password("password123"),
            is_admin=False,
            is_active=True,
        )
        db.add_all([owner, member])
        await db.flush()

        org_service = OrganizationService(db)
        org = await org_service.create_organization(user_id=owner.id, name="Test Aggregates Org")

        # Add second member
        mem2 = Membership(organization_id=org.id, user_id=member.id, org_role="member")
        db.add(mem2)

        # Add team
        team = Team(organization_id=org.id, name="Core Engineering", lead_user_id=owner.id)
        db.add(team)
        await db.flush()

        # Add plan with secret roadmap text
        plan = Plan(
            organization_id=org.id,
            team_id=team.id,
            user_id=owner.id,
            week_start_date=date(2026, 10, 12),
            status="approved",
        )
        db.add(plan)
        await db.flush()

        task = Task(
            plan_id=plan.id,
            category="main",
            title="CONFIDENTIAL_ROADMAP_ITEM: Project Falcon",
            why_it_matters="Critical strategic initiative",
        )
        db.add(task)
        await db.commit()
        org_id = org.id

    response = await async_client.get("/internal/orgs", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1

    matched_org = next((item for item in data["items"] if item["id"] == str(org_id)), None)
    assert matched_org is not None
    assert matched_org["name"] == "Test Aggregates Org"
    assert matched_org["member_count"] == 2
    assert matched_org["team_count"] == 1
    assert matched_org["plan_count"] == 1
    assert matched_org["last_active"] is not None
    assert matched_org["is_suspended"] is False


@pytest.mark.asyncio
async def test_internal_suspend_and_reinstate_organization(
    async_client, session_factory, admin_headers
):
    """Suspending an organization locks out customer access; reinstating restores it."""
    async with session_factory() as db:
        owner = User(
            first_name="Customer",
            last_name="Owner",
            email=fake.email().lower(),
            password=hash_password("password123"),
            is_admin=False,
            is_active=True,
        )
        db.add(owner)
        await db.flush()

        org_service = OrganizationService(db)
        org = await org_service.create_organization(user_id=owner.id, name="Suspendable Org")
        await db.commit()
        org_id = org.id
        owner_id = owner.id

    # Customer token
    app_token = generate_jwt_token({"sub": str(owner_id)}, audience=JWT_AUDIENCE_APP)
    app_headers = {"Access-Token": f"Bearer {app_token}"}

    # Customer can access org members before suspension
    resp_before = await async_client.get(f"/app/orgs/{org_id}/members", headers=app_headers)
    assert resp_before.status_code == 200

    # Staff suspends org
    suspend_resp = await async_client.post(
        f"/internal/orgs/{org_id}/suspend", headers=admin_headers
    )
    assert suspend_resp.status_code == 200
    assert suspend_resp.json()["is_suspended"] is True

    # Customer is now locked out with 403 ORGANIZATION_SUSPENDED
    resp_locked = await async_client.get(f"/app/orgs/{org_id}/members", headers=app_headers)
    assert resp_locked.status_code == 403
    assert resp_locked.json()["detail"][0]["type"] == "organization_suspended"

    # Staff reinstates org
    reinstate_resp = await async_client.post(
        f"/internal/orgs/{org_id}/reinstate", headers=admin_headers
    )
    assert reinstate_resp.status_code == 200
    assert reinstate_resp.json()["is_suspended"] is False

    # Customer can access again
    resp_after = await async_client.get(f"/app/orgs/{org_id}/members", headers=app_headers)
    assert resp_after.status_code == 200


@pytest.mark.asyncio
async def test_decision_1_staff_cannot_view_plan_text(
    async_client, session_factory, admin_headers
):
    """Decision 1: Platform staff cannot see customer plan text or task details."""
    secret_text = "TOP_SECRET_ACQUISITION_PLAN_2026"
    async with session_factory() as db:
        owner = User(
            first_name="Customer",
            last_name="Founder",
            email=fake.email().lower(),
            password=hash_password("password123"),
            is_admin=False,
            is_active=True,
        )
        db.add(owner)
        await db.flush()

        org_service = OrganizationService(db)
        org = await org_service.create_organization(user_id=owner.id, name="Secret Org")
        team = Team(organization_id=org.id, name="Stealth", lead_user_id=owner.id)
        db.add(team)
        await db.flush()

        plan = Plan(
            organization_id=org.id,
            team_id=team.id,
            user_id=owner.id,
            week_start_date=date(2026, 10, 12),
            status="approved",
            review_comment="Lead approved confidentially",
        )
        db.add(plan)
        await db.flush()

        task = Task(
            plan_id=plan.id,
            category="main",
            title=secret_text,
            why_it_matters="Confidential strategy",
        )
        db.add(task)
        await db.commit()
        org_id = org.id

    # List endpoint
    list_resp = await async_client.get("/internal/orgs", headers=admin_headers)
    assert list_resp.status_code == 200
    assert secret_text not in list_resp.text
    assert "review_comment" not in list_resp.text

    # Detail endpoint
    detail_resp = await async_client.get(f"/internal/orgs/{org_id}", headers=admin_headers)
    assert detail_resp.status_code == 200
    assert secret_text not in detail_resp.text
    assert "review_comment" not in detail_resp.text


@pytest.mark.asyncio
async def test_customer_cannot_access_internal_orgs(async_client, session_factory):
    """Customer owner/admin cannot access internal endpoints (rejected with 401)."""
    async with session_factory() as db:
        user = User(
            first_name="Customer",
            last_name="Owner",
            email=fake.email().lower(),
            password=hash_password("password123"),
            is_admin=False,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        user_id = user.id

    app_token = generate_jwt_token({"sub": str(user_id)}, audience=JWT_AUDIENCE_APP)
    response = await async_client.get(
        "/internal/orgs", headers={"Access-Token": f"Bearer {app_token}"}
    )
    # Audience mismatch produces 401 INVALID_TOKEN
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_non_admin_with_internal_token_rejected_with_403(
    async_client, session_factory
):
    """Even if a non-admin gets an internal audience token, is_admin gate returns 403 ADMIN_REQUIRED."""
    async with session_factory() as db:
        user = User(
            first_name="Customer",
            last_name="Hacker",
            email=fake.email().lower(),
            password=hash_password("password123"),
            is_admin=False,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        user_id = user.id

    internal_token = generate_jwt_token({"sub": str(user_id)}, audience=JWT_AUDIENCE_INTERNAL)
    response = await async_client.get(
        "/internal/orgs", headers={"Access-Token": f"Bearer {internal_token}"}
    )
    assert response.status_code == 403
    assert response.json()["detail"][0]["type"] == "admin_required"
