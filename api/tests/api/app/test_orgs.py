import pytest
from faker import Faker

from app.models import Membership, User
from app.security import JWT_AUDIENCE_APP, generate_jwt_token, hash_password
from app.services.orgs import OrganizationService

fake = Faker()


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
async def test_create_and_get_organization(async_client, session_factory):
    """Test creating an organization and fetching its details."""
    _user, token = await create_user_and_token(session_factory)
    async_client.cookies.set("access_token", f"Bearer {token}")

    # Create org
    resp = await async_client.post("/app/orgs", json={"name": "Stark Industries"})
    assert resp.status_code == 201
    org_data = resp.json()
    org_id = org_data["id"]
    assert org_data["name"] == "Stark Industries"
    assert org_data["my_role"] == "owner"

    # Get org
    get_resp = await async_client.get(f"/app/orgs/{org_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == org_id


@pytest.mark.asyncio
async def test_cross_org_access_returns_404(async_client, session_factory):
    """Anti-Oracle Test: Querying another org's ID returns 404, never 403."""
    _user_a, token_a = await create_user_and_token(session_factory, first_name="Alice")
    _user_b, token_b = await create_user_and_token(session_factory, first_name="Bob")

    # Alice creates Org A
    async_client.cookies.set("access_token", f"Bearer {token_a}")
    resp_a = await async_client.post("/app/orgs", json={"name": "Org A"})
    org_a_id = resp_a.json()["id"]

    # Bob logs in and tries to access Org A
    async_client.cookies.set("access_token", f"Bearer {token_b}")
    cross_resp = await async_client.get(f"/app/orgs/{org_a_id}")

    # MUST be 404 to avoid leaking existence of Org A to Bob
    assert cross_resp.status_code == 404


@pytest.mark.asyncio
async def test_member_cannot_manage_roles_or_invites(async_client, session_factory):
    """Test non-admin members cannot manage roles or create invites (returns 403)."""
    owner, _owner_token = await create_user_and_token(session_factory, first_name="Owner")
    member, member_token = await create_user_and_token(session_factory, first_name="Member")

    # Owner creates org
    async with session_factory() as db:
        service = OrganizationService(db)
        org = await service.create_organization(user_id=owner.id, name="Test Co")
        # Add member as regular member
        db.add(Membership(organization_id=org.id, user_id=member.id, org_role="member"))
        await db.commit()
        org_id = str(org.id)

    # Member tries to create an invite -> 403 Forbidden
    async_client.cookies.set("access_token", f"Bearer {member_token}")
    invite_resp = await async_client.post(
        f"/app/orgs/{org_id}/invites", json={"role": "member"}
    )
    assert invite_resp.status_code == 403

    # Member tries to update roles -> 403 Forbidden
    role_resp = await async_client.patch(
        f"/app/orgs/{org_id}/members/{owner.id}", json={"org_role": "admin"}
    )
    assert role_resp.status_code == 403


@pytest.mark.asyncio
async def test_owner_can_manage_roles_and_invites(async_client, session_factory):
    """Test owner can update member roles and create invites."""
    _owner, owner_token = await create_user_and_token(session_factory, first_name="Owner")
    member, _ = await create_user_and_token(session_factory, first_name="Member")

    # Create org
    async_client.cookies.set("access_token", f"Bearer {owner_token}")
    resp = await async_client.post("/app/orgs", json={"name": "Owner Co"})
    org_id = resp.json()["id"]

    # Add member to org
    async with session_factory() as db:
        db.add(Membership(organization_id=org_id, user_id=member.id, org_role="member"))
        await db.commit()

    # Owner updates member to admin -> 200
    update_resp = await async_client.patch(
        f"/app/orgs/{org_id}/members/{member.id}", json={"org_role": "admin"}
    )
    assert update_resp.status_code == 200

    # Owner creates invite -> 201
    invite_resp = await async_client.post(
        f"/app/orgs/{org_id}/invites", json={"role": "member"}
    )
    assert invite_resp.status_code == 201
    assert "token" in invite_resp.json()


@pytest.mark.asyncio
async def test_suspended_org_locks_out_member(async_client, session_factory):
    """Test suspended organizations lock members out with 403 ORGANIZATION_SUSPENDED."""
    user, token = await create_user_and_token(session_factory)

    async with session_factory() as db:
        service = OrganizationService(db)
        org = await service.create_organization(user_id=user.id, name="Suspended Co")
        org.is_suspended = True  # Suspended by platform staff
        await db.commit()
        org_id = str(org.id)

    async_client.cookies.set("access_token", f"Bearer {token}")
    resp = await async_client.get(f"/app/orgs/{org_id}")
    assert resp.status_code == 403
    assert resp.json()["detail"][0]["type"] == "organization_suspended"


@pytest.mark.asyncio
async def test_create_and_accept_invite(async_client, session_factory):
    """Test end-to-end invite link creation and acceptance."""
    _owner, owner_token = await create_user_and_token(session_factory, first_name="Owner")
    _user, user_token = await create_user_and_token(session_factory, first_name="NewUser")

    # Owner creates org and invite
    async_client.cookies.set("access_token", f"Bearer {owner_token}")
    org_resp = await async_client.post("/app/orgs", json={"name": "Hiring Org"})
    org_id = org_resp.json()["id"]

    inv_resp = await async_client.post(
        f"/app/orgs/{org_id}/invites", json={"role": "member"}
    )
    token = inv_resp.json()["token"]

    # New user accepts invite
    async_client.cookies.set("access_token", f"Bearer {user_token}")
    accept_resp = await async_client.post(f"/app/invites/{token}/accept")
    assert accept_resp.status_code == 200
    assert accept_resp.json()["id"] == org_id
    assert accept_resp.json()["my_role"] == "member"
