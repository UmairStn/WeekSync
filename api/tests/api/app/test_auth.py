import pytest
from faker import Faker

from app.models import Membership, Organization, User
from app.security import JWT_AUDIENCE_APP, generate_jwt_token, hash_password
from app.services.invites import InviteService
from app.services.orgs import OrganizationService

fake = Faker()


@pytest.mark.asyncio
async def test_signup_creates_user_and_org(async_client):
    """Test signup with org_name creates user and assigns them as owner."""
    email = fake.email().lower()
    password = "StrongPassword123!"
    first_name = fake.first_name()
    last_name = fake.last_name()
    org_name = "Acme Corp"

    payload = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name,
        "org_name": org_name,
    }

    response = await async_client.post("/app/signup", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data

    # Verify cookie was set
    assert "access_token" in async_client.cookies

    # Verify user can access /app/orgs
    orgs_resp = await async_client.get("/app/orgs")
    assert orgs_resp.status_code == 200
    orgs = orgs_resp.json()
    assert len(orgs) == 1
    assert orgs[0]["name"] == org_name
    assert orgs[0]["my_role"] == "owner"


@pytest.mark.asyncio
async def test_signup_duplicate_email_fails(async_client, session_factory):
    """Test signup rejects duplicate emails with 409 Conflict."""
    email = fake.email().lower()

    async with session_factory() as db:
        user = User(
            first_name="Existing",
            last_name="User",
            email=email,
            password=hash_password("password123"),
            is_active=True,
        )
        db.add(user)
        await db.commit()

    payload = {
        "email": email,
        "password": "newpassword123",
        "first_name": "New",
        "last_name": "Person",
        "org_name": "New Org",
    }

    response = await async_client.post("/app/signup", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_signup_with_invite_token(async_client, session_factory):
    """Test signup with an invite token joins the organization."""
    # Create org and invite
    async with session_factory() as db:
        owner = User(
            first_name="Org",
            last_name="Owner",
            email=fake.email().lower(),
            password=hash_password("password123"),
            is_active=True,
        )
        db.add(owner)
        await db.flush()

        org_service = OrganizationService(db)
        org = await org_service.create_organization(user_id=owner.id, name="Invite Org")

        invite_service = InviteService(db)
        invite = await invite_service.create_invite(
            org_id=org.id, user_id=owner.id, role="member"
        )
        token = invite.token
        await db.commit()

    # Sign up new user with invite token
    new_email = fake.email().lower()
    payload = {
        "email": new_email,
        "password": "invitepassword123",
        "first_name": "Invited",
        "last_name": "Member",
        "invite_token": token,
    }

    response = await async_client.post("/app/signup", json=payload)
    assert response.status_code == 200
    assert "access_token" in response.json()

    # User belongs to the invited org as member
    orgs_resp = await async_client.get("/app/orgs")
    assert orgs_resp.status_code == 200
    orgs = orgs_resp.json()
    assert len(orgs) == 1
    assert orgs[0]["name"] == "Invite Org"
    assert orgs[0]["my_role"] == "member"
