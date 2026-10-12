import pytest
from faker import Faker

from app.models import AICallLog, User
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
async def test_internal_ai_usage_overview(
    async_client, session_factory, admin_headers
):
    """Staff can view platform-wide AI telemetry, per-org breakdowns, and call logs."""
    async with session_factory() as db:
        user = User(
            first_name="AI",
            last_name="Consumer",
            email=fake.email().lower(),
            password=hash_password("password123"),
            is_admin=False,
            is_active=True,
        )
        db.add(user)
        await db.flush()

        org_service = OrganizationService(db)
        org1 = await org_service.create_organization(user_id=user.id, name="AI Powered Inc")
        org2 = await org_service.create_organization(user_id=user.id, name="Robotics Corp")

        # Insert telemetry logs
        log1 = AICallLog(
            organization_id=org1.id,
            user_id=user.id,
            feature="plan_review",
            status="success",
            prompt_tokens=150,
            completion_tokens=80,
            latency_ms=1200,
        )
        log2 = AICallLog(
            organization_id=org1.id,
            user_id=user.id,
            feature="brain_dump",
            status="rate_limited",
            latency_ms=450,
            error_message="ResourceExhausted quota exceeded",
        )
        log3 = AICallLog(
            organization_id=org2.id,
            user_id=user.id,
            feature="plan_review",
            status="failure",
            latency_ms=15000,
            error_message="Gateway timeout",
        )
        db.add_all([log1, log2, log3])
        await db.commit()
        org1_id = org1.id
        org2_id = org2.id

    response = await async_client.get("/internal/ai-usage", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["total_calls"] >= 3
    assert data["success_calls"] >= 1
    assert data["rate_limited_calls"] >= 1
    assert data["failure_calls"] >= 1
    assert data["total_prompt_tokens"] >= 150
    assert data["total_completion_tokens"] >= 80

    org_ids = [s["organization_id"] for s in data["org_summaries"]]
    assert str(org1_id) in org_ids
    assert str(org2_id) in org_ids

    # Recent logs should contain features and error messages
    assert len(data["recent_logs"]) >= 3
    features = [l["feature"] for l in data["recent_logs"]]
    assert "plan_review" in features
    assert "brain_dump" in features


@pytest.mark.asyncio
async def test_customer_cannot_access_internal_ai_usage(
    async_client, session_factory
):
    """Customer user cannot access internal AI usage endpoint."""
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
        "/internal/ai-usage", headers={"Access-Token": f"Bearer {app_token}"}
    )
    assert response.status_code == 401
