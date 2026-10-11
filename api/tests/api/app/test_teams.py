import pytest
from faker import Faker

from app.models import Membership, Organization, User
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
async def test_admin_can_create_and_manage_teams(async_client, session_factory):
    """Test org owner/admin can create team, add members, and assign lead."""
    owner, owner_token = await create_user_and_token(session_factory, first_name="Owner")
    member, _ = await create_user_and_token(session_factory, first_name="Member")

    async_client.cookies.set("access_token", f"Bearer {owner_token}")

    # 1. Create Org
    org_resp = await async_client.post("/app/orgs", json={"name": "Engineering Co"})
    org_id = org_resp.json()["id"]

    # Add member to org
    async with session_factory() as db:
        db.add(Membership(organization_id=org_id, user_id=member.id, org_role="member"))
        await db.commit()

    # 2. Owner creates a team
    team_resp = await async_client.post(
        f"/app/orgs/{org_id}/teams",
        json={"name": "Frontend Team", "lead_user_id": str(member.id)},
    )
    assert team_resp.status_code == 201
    team_data = team_resp.json()
    team_id = team_data["id"]
    assert team_data["name"] == "Frontend Team"
    assert team_data["lead_user_id"] == str(member.id)

    # 3. List teams
    list_resp = await async_client.get(f"/app/orgs/{org_id}/teams")
    assert list_resp.status_code == 200
    teams = list_resp.json()
    assert len(teams) == 1
    assert teams[0]["id"] == team_id

    # 4. Get team detail
    detail_resp = await async_client.get(f"/app/orgs/{org_id}/teams/{team_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert len(detail["members"]) == 1
    assert detail["members"][0]["user_id"] == str(member.id)
    assert detail["members"][0]["is_lead"] is True


@pytest.mark.asyncio
async def test_member_cannot_create_or_modify_teams(async_client, session_factory):
    """Test regular org member cannot create or delete teams (403 Forbidden)."""
    owner, _ = await create_user_and_token(session_factory, first_name="Owner")
    member, member_token = await create_user_and_token(session_factory, first_name="Member")

    async with session_factory() as db:
        service = OrganizationService(db)
        org = await service.create_organization(user_id=owner.id, name="Test Org")
        db.add(Membership(organization_id=org.id, user_id=member.id, org_role="member"))
        await db.commit()
        org_id = str(org.id)

    # Member tries to create team -> 403 Forbidden
    async_client.cookies.set("access_token", f"Bearer {member_token}")
    resp = await async_client.post(f"/app/orgs/{org_id}/teams", json={"name": "Rogue Team"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_cross_org_team_access_returns_404(async_client, session_factory):
    """Anti-Oracle Test: Accessing a team from another organization returns 404."""
    user_a, token_a = await create_user_and_token(session_factory, first_name="Alice")
    user_b, token_b = await create_user_and_token(session_factory, first_name="Bob")

    # Alice creates Org A and Team A
    async_client.cookies.set("access_token", f"Bearer {token_a}")
    org_a = (await async_client.post("/app/orgs", json={"name": "Org A"})).json()
    team_a = (
        await async_client.post(f"/app/orgs/{org_a['id']}/teams", json={"name": "Team A"})
    ).json()

    # Bob creates Org B
    async_client.cookies.set("access_token", f"Bearer {token_b}")
    org_b = (await async_client.post("/app/orgs", json={"name": "Org B"})).json()

    # Bob tries to access Team A via Org B's URL -> 404
    cross_resp = await async_client.get(f"/app/orgs/{org_b['id']}/teams/{team_a['id']}")
    assert cross_resp.status_code == 404

    # Bob tries to access Team A via Org A's URL -> 404 (Anti-Oracle: Bob is not member of Org A)
    cross_org_resp = await async_client.get(f"/app/orgs/{org_a['id']}/teams/{team_a['id']}")
    assert cross_org_resp.status_code == 404


@pytest.mark.asyncio
async def test_user_can_belong_to_multiple_teams(async_client, session_factory):
    """Test a user can belong to more than one team in the same organization."""
    owner, token = await create_user_and_token(session_factory, first_name="Owner")
    dev, _ = await create_user_and_token(session_factory, first_name="Developer")

    async_client.cookies.set("access_token", f"Bearer {token}")
    org_resp = await async_client.post("/app/orgs", json={"name": "Multi Team Co"})
    org_id = org_resp.json()["id"]

    async with session_factory() as db:
        db.add(Membership(organization_id=org_id, user_id=dev.id, org_role="member"))
        await db.commit()

    # Create Team 1 and Team 2
    t1 = (await async_client.post(f"/app/orgs/{org_id}/teams", json={"name": "Backend"})).json()
    t2 = (await async_client.post(f"/app/orgs/{org_id}/teams", json={"name": "Platform"})).json()

    # Add dev to both teams
    add_t1 = await async_client.post(
        f"/app/orgs/{org_id}/teams/{t1['id']}/members", json={"user_id": str(dev.id)}
    )
    assert add_t1.status_code == 201

    add_t2 = await async_client.post(
        f"/app/orgs/{org_id}/teams/{t2['id']}/members", json={"user_id": str(dev.id)}
    )
    assert add_t2.status_code == 201
