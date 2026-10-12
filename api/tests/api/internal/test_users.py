import pytest
from faker import Faker

from app.models import User
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
async def test_internal_list_and_search_users(
    async_client, session_factory, admin_headers
):
    """Staff can list all users and search by name or email."""
    unique_suffix = fake.hexify(text="^^^^^^")
    async with session_factory() as db:
        user1 = User(
            first_name=f"Alice_{unique_suffix}",
            last_name="Wonderland",
            email=f"alice_{unique_suffix}@example.com",
            password=hash_password("password123"),
            is_admin=False,
            is_active=True,
        )
        user2 = User(
            first_name="Bob",
            last_name=f"Builder_{unique_suffix}",
            email=f"bob_{unique_suffix}@example.com",
            password=hash_password("password123"),
            is_admin=False,
            is_active=True,
        )
        db.add_all([user1, user2])
        await db.commit()

    # Search for user1 by unique first name
    resp1 = await async_client.get(
        f"/internal/users?search={unique_suffix}", headers=admin_headers
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["total"] >= 2
    emails = [u["email"] for u in data1["items"]]
    assert f"alice_{unique_suffix}@example.com" in emails
    assert f"bob_{unique_suffix}@example.com" in emails


@pytest.mark.asyncio
async def test_internal_users_include_organizations(
    async_client, session_factory, admin_headers
):
    """Internal user list displays which organizations each user belongs to."""
    async with session_factory() as db:
        user = User(
            first_name="MultiOrg",
            last_name="Member",
            email=fake.email().lower(),
            password=hash_password("password123"),
            is_admin=False,
            is_active=True,
        )
        db.add(user)
        await db.flush()

        org_service = OrganizationService(db)
        await org_service.create_organization(user_id=user.id, name="First Org")
        await org_service.create_organization(user_id=user.id, name="Second Org")
        await db.commit()
        user_id = user.id

    resp = await async_client.get(
        f"/internal/users?search={user.email}", headers=admin_headers
    )
    assert resp.status_code == 200
    items = resp.json()["items"]
    matched = next((u for u in items if u["id"] == str(user_id)), None)
    assert matched is not None
    assert len(matched["organizations"]) == 2
    org_names = [o["name"] for o in matched["organizations"]]
    assert "First Org" in org_names
    assert "Second Org" in org_names


@pytest.mark.asyncio
async def test_internal_deactivate_and_reactivate_user(
    async_client, session_factory, admin_headers
):
    """Staff can deactivate and reactivate a user account."""
    async with session_factory() as db:
        user = User(
            first_name="Active",
            last_name="Member",
            email=fake.email().lower(),
            password=hash_password("password123"),
            is_admin=False,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        user_id = user.id

    # Deactivate
    deact_resp = await async_client.post(
        f"/internal/users/{user_id}/deactivate", headers=admin_headers
    )
    assert deact_resp.status_code == 200
    assert deact_resp.json()["is_active"] is False

    # Reactivate
    react_resp = await async_client.post(
        f"/internal/users/{user_id}/reactivate", headers=admin_headers
    )
    assert react_resp.status_code == 200
    assert react_resp.json()["is_active"] is True


@pytest.mark.asyncio
async def test_customer_cannot_access_internal_users(async_client, session_factory):
    """Customer user cannot access internal users endpoint."""
    async with session_factory() as db:
        user = User(
            first_name="Regular",
            last_name="Customer",
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
        "/internal/users", headers={"Access-Token": f"Bearer {app_token}"}
    )
    assert response.status_code == 401
