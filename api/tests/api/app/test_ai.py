import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from faker import Faker
from pydantic_ai.models.test import TestModel
from sqlalchemy import select

from app.api.app.schemas import (
    BrainDumpResult,
    DraftTask,
    FindingType,
    PlanFinding,
    PlanReviewResult,
    WeekSummaryResult,
)
from app.models import AICallLog, Organization, User
from app.security import JWT_AUDIENCE_APP, generate_jwt_token, hash_password
from app.services import ai

fake = Faker()


def get_upcoming_monday() -> date:
    today = datetime.now(tz=UTC).date()
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
async def test_ai_plan_review_offline_success(async_client, session_factory):
    """Test Plan Review Agent produces typed findings and logs telemetry completely offline."""
    user, token = await create_user_and_token(session_factory, first_name="Alice")
    async_client.cookies.set("access_token", f"Bearer {token}")

    # Create Org
    org_resp = await async_client.post("/app/orgs", json={"name": "AI Review Org"})
    assert org_resp.status_code == 201
    org_id = org_resp.json()["id"]

    sample_task_id = str(uuid.uuid4())
    mock_data = PlanReviewResult(
        overall_assessment="Strong focus on core checkout reliability.",
        findings=[
            PlanFinding(
                task_id=uuid.UUID(sample_task_id),
                issue_type=FindingType.VAGUE_ACTIVITY,
                critique="Describes internal activity rather than checkable outcome.",
                suggested_rewrite="Checkout webhook passes end-to-end stripe mock test on staging",
            )
        ],
        ready_to_submit=False,
    )

    ai.TEST_OVERRIDE_MODEL = TestModel(custom_output_args=mock_data.model_dump())
    try:
        req_payload = {
            "week_start_date": str(datetime.now(UTC).date()),
            "tasks": [
                {
                    "id": sample_task_id,
                    "category": "main",
                    "title": "Work on stripe checkout",
                    "why_it_matters": "Enables revenue collection",
                },
                {
                    "category": "gtm",
                    "title": "Add PostHog telemetry event on payment success",
                    "why_it_matters": None,
                },
            ],
        }

        resp = await async_client.post(
            f"/app/orgs/{org_id}/ai/review", json=req_payload
        )
        assert resp.status_code == 200
        body = resp.json()

        assert (
            body["overall_assessment"] == "Strong focus on core checkout reliability."
        )
        assert body["ready_to_submit"] is False
        assert body["verdict"] == "adjust"
        assert len(body["findings"]) == 1
        assert body["findings"][0]["task_id"] == sample_task_id
        assert body["findings"][0]["issue_type"] == "vague_activity"
        assert (
            body["findings"][0]["problem"]
            == "Describes internal activity rather than checkable outcome."
        )
        assert "Checkout webhook" in body["findings"][0]["suggested_rewrite"]

        # Verify tenant telemetry log
        async with session_factory() as db:
            stmt = select(AICallLog).where(
                AICallLog.organization_id == uuid.UUID(org_id),
                AICallLog.user_id == user.id,
            )
            result = await db.execute(stmt)
            log_entries = result.scalars().all()
            assert len(log_entries) == 1
            assert log_entries[0].feature == "plan_review"
            assert log_entries[0].status == "success"
    finally:
        ai.TEST_OVERRIDE_MODEL = None


@pytest.mark.asyncio
async def test_ai_brain_dump_offline_success(async_client, session_factory):
    """Test Brain Dump Agent synthesizes unstructured notes into structured tasks."""
    user, token = await create_user_and_token(session_factory, first_name="Bob")
    async_client.cookies.set("access_token", f"Bearer {token}")

    org_resp = await async_client.post("/app/orgs", json={"name": "BrainDump Org"})
    org_id = org_resp.json()["id"]

    mock_result = BrainDumpResult(
        main_task=DraftTask(
            category="main",
            title="Ship Stripe customer portal integration",
            why_it_matters="Reduces churn by allowing self-serve card updates",
        ),
        sub_goals=[
            DraftTask(
                category="sub_goal",
                title="Handle customer.subscription.updated webhook in backend",
                why_it_matters=None,
            ),
            DraftTask(
                category="sub_goal",
                title="Render billing portal redirect button in settings UI",
                why_it_matters=None,
            ),
        ],
        gtm_goals=[
            DraftTask(
                category="gtm",
                title="Add post-release changelog announcement and documentation",
                why_it_matters=None,
            )
        ],
    )

    ai.TEST_OVERRIDE_MODEL = TestModel(custom_output_args=mock_result.model_dump())
    try:
        notes_input = (
            "Hey, need to finish billing stuff this week. Want users to be able to "
            "update credit cards. Webhook handling is needed. Also make sure docs are updated."
        )
        resp = await async_client.post(
            f"/app/orgs/{org_id}/ai/brain-dump", json={"notes": notes_input}
        )
        assert resp.status_code == 200
        body = resp.json()

        assert body["main_task"]["title"] == "Ship Stripe customer portal integration"
        assert body["main_task"]["why_it_matters"] is not None
        assert len(body["sub_goals"]) == 2
        assert len(body["gtm_goals"]) == 1

        # Verify telemetry log
        async with session_factory() as db:
            stmt = select(AICallLog).where(
                AICallLog.organization_id == uuid.UUID(org_id),
                AICallLog.user_id == user.id,
            )
            result = await db.execute(stmt)
            log_entries = result.scalars().all()
            assert len(log_entries) == 1
            assert log_entries[0].feature == "brain_dump"
            assert log_entries[0].status == "success"
    finally:
        ai.TEST_OVERRIDE_MODEL = None


@pytest.mark.asyncio
async def test_ai_unconfigured_fallback(async_client, session_factory, monkeypatch):
    """When GOOGLE_API_KEY is unset and no test override is present, returns clean 503."""
    _, token = await create_user_and_token(session_factory, first_name="Charlie")
    async_client.cookies.set("access_token", f"Bearer {token}")

    org_resp = await async_client.post("/app/orgs", json={"name": "Fallback Org"})
    org_id = org_resp.json()["id"]

    # Ensure no override and empty key
    ai.TEST_OVERRIDE_MODEL = None
    from app.config import settings

    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "")

    resp = await async_client.post(
        f"/app/orgs/{org_id}/ai/brain-dump",
        json={"notes": "Some rough scratch notes"},
    )
    assert resp.status_code == 503
    body = resp.json()
    assert body["detail"][0]["type"] == "ai_not_configured"
    assert "Planning works normally without it" in body["detail"][0]["msg"]


@pytest.mark.asyncio
async def test_ai_tenant_isolation_anti_oracle(async_client, session_factory):
    """Anti-Oracle: User belonging to Org A cannot call AI endpoints of Org B (returns 404)."""
    _, token_a = await create_user_and_token(session_factory, first_name="UserA")
    _, token_b = await create_user_and_token(session_factory, first_name="UserB")

    # User B creates Org B
    async_client.cookies.set("access_token", f"Bearer {token_b}")
    org_b_resp = await async_client.post("/app/orgs", json={"name": "Org B"})
    org_b_id = org_b_resp.json()["id"]

    # User A tries to invoke AI in Org B
    async_client.cookies.set("access_token", f"Bearer {token_a}")
    resp = await async_client.post(
        f"/app/orgs/{org_b_id}/ai/brain-dump",
        json={"notes": "Attempt cross-tenant AI call"},
    )
    assert resp.status_code == 404
    assert resp.json()["detail"][0]["type"] == "resource_not_found"


@pytest.mark.asyncio
async def test_ai_suspended_org_forbidden(async_client, session_factory):
    """Suspended organization rejects AI calls with 403 ORGANIZATION_SUSPENDED."""
    _, token = await create_user_and_token(session_factory, first_name="Owner")
    async_client.cookies.set("access_token", f"Bearer {token}")

    org_resp = await async_client.post("/app/orgs", json={"name": "Suspended Org"})
    org_id = org_resp.json()["id"]

    # Suspend org directly in DB
    async with session_factory() as db:
        org = await db.get(Organization, uuid.UUID(org_id))
        org.is_suspended = True
        await db.commit()

    resp = await async_client.post(
        f"/app/orgs/{org_id}/ai/brain-dump",
        json={"notes": "Trying to run AI in suspended org"},
    )
    assert resp.status_code == 403
    assert resp.json()["detail"][0]["type"] == "organization_suspended"


@pytest.mark.asyncio
async def test_ai_week_summary_offline_success(async_client, session_factory):
    """Test Week Summary Agent generates typed output and logs telemetry offline."""
    user, token = await create_user_and_token(session_factory, first_name="Bob")
    async_client.cookies.set("access_token", f"Bearer {token}")

    # Create Org, Team, Plan
    org_resp = await async_client.post("/app/orgs", json={"name": "Week Summary Org"})
    assert org_resp.status_code == 201
    org_id = org_resp.json()["id"]

    team_resp = await async_client.post(
        f"/app/orgs/{org_id}/teams", json={"name": "Core Team"}
    )
    assert team_resp.status_code == 201
    team_id = team_resp.json()["id"]

    monday = get_upcoming_monday()
    plan_resp = await async_client.post(
        f"/app/orgs/{org_id}/plans",
        json={
            "team_id": team_id,
            "week_start_date": monday.isoformat(),
            "tasks": [
                {
                    "category": "main",
                    "title": "Complete stripe webhook integration",
                    "why_it_matters": "Enables automatic renewal handling",
                },
                {
                    "category": "sub_goal",
                    "title": "Add retry handler with exponential backoff",
                    "why_it_matters": None,
                },
                {
                    "category": "gtm",
                    "title": "Publish release notes in customer changelog",
                    "why_it_matters": None,
                },
            ],
        },
    )
    assert plan_resp.status_code == 201
    plan_id = plan_resp.json()["id"]

    # Submit and Approve
    sub_resp = await async_client.post(f"/app/orgs/{org_id}/plans/{plan_id}/submit")
    assert sub_resp.status_code == 200
    app_resp = await async_client.post(f"/app/orgs/{org_id}/plans/{plan_id}/approve")
    assert app_resp.status_code == 200

    # Mark first task completed
    task_id = plan_resp.json()["tasks"][0]["id"]
    await async_client.patch(
        f"/app/orgs/{org_id}/plans/{plan_id}/tasks/{task_id}",
        json={"is_completed": True},
    )

    mock_summary = WeekSummaryResult(
        headline="Delivered core billing webhooks; changelog deferred.",
        shipped=["Complete stripe webhook integration"],
        not_shipped=[
            "Add retry handler with exponential backoff",
            "Publish release notes in customer changelog",
        ],
        why_not="Webhook edge-case testing took longer than planned.",
        next_week_suggestion="Prioritize retry handler and release documentation first.",
    )

    ai.TEST_OVERRIDE_MODEL = TestModel(custom_output_args=mock_summary.model_dump())
    try:
        resp = await async_client.post(
            f"/app/orgs/{org_id}/ai/week-summary",
            json={"plan_id": plan_id},
        )
        assert resp.status_code == 200
        body = resp.json()

        assert body["headline"] == "Delivered core billing webhooks; changelog deferred."
        assert len(body["shipped"]) == 1
        assert body["shipped"][0] == "Complete stripe webhook integration"
        assert len(body["not_shipped"]) == 2
        assert body["why_not"] == "Webhook edge-case testing took longer than planned."
        assert body["next_week_suggestion"] is not None

        # Verify telemetry in AICallLog
        async with session_factory() as db:
            result = await db.scalars(
                select(AICallLog).where(
                    AICallLog.organization_id == uuid.UUID(org_id),
                    AICallLog.feature == "week_summary",
                )
            )
            logs = list(result.all())
            assert len(logs) == 1
            assert logs[0].status == "success"
            assert logs[0].user_id == user.id
    finally:
        ai.TEST_OVERRIDE_MODEL = None


@pytest.mark.asyncio
async def test_ai_week_summary_draft_plan_rejected(async_client, session_factory):
    """Cannot generate week summary for a draft or unapproved plan."""
    user, token = await create_user_and_token(session_factory, first_name="Charlie")
    async_client.cookies.set("access_token", f"Bearer {token}")

    org_resp = await async_client.post("/app/orgs", json={"name": "Draft Summary Org"})
    org_id = org_resp.json()["id"]

    team_resp = await async_client.post(
        f"/app/orgs/{org_id}/teams", json={"name": "Draft Team"}
    )
    team_id = team_resp.json()["id"]

    monday = get_upcoming_monday()
    plan_resp = await async_client.post(
        f"/app/orgs/{org_id}/plans",
        json={
            "team_id": team_id,
            "week_start_date": monday.isoformat(),
            "tasks": [
                {
                    "category": "main",
                    "title": "Draft task title",
                    "why_it_matters": "Draft impact",
                }
            ],
        },
    )
    plan_id = plan_resp.json()["id"]

    # Attempt to generate summary while in draft status
    resp = await async_client.post(
        f"/app/orgs/{org_id}/ai/week-summary",
        json={"plan_id": plan_id},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"][0]["type"] == "plan_not_finalized"

