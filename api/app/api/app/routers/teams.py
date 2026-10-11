import uuid

from fastapi import APIRouter, status

from app.api.app.access import (
    RequireOrgAdmin,
    RequireOrgMember,
)
from app.api.app.schemas import (
    TeamAddMemberRequest,
    TeamCreateRequest,
    TeamDetailResponse,
    TeamResponse,
    TeamUpdateRequest,
)
from app.database import DBSession
from app.schemas import MessageResponse
from app.services.teams import TeamService

router = APIRouter(tags=["teams"])


@router.post(
    "/orgs/{org_id}/teams",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_team(
    org_id: uuid.UUID,
    data: TeamCreateRequest,
    tenant: RequireOrgAdmin,
    session: DBSession,
) -> TeamResponse:
    """Create a new team inside the organization (Owner/Admin only)."""
    service = TeamService(session)
    team = await service.create_team(
        org_id=tenant.org.id,
        name=data.name,
        lead_user_id=data.lead_user_id,
    )
    await session.commit()
    return TeamResponse(
        id=team.id,
        organization_id=team.organization_id,
        name=team.name,
        lead_user_id=team.lead_user_id,
        member_count=1 if data.lead_user_id else 0,
        created_at=team.created_at,
    )


@router.get(
    "/orgs/{org_id}/teams",
    response_model=list[TeamResponse],
)
async def list_teams(
    org_id: uuid.UUID,
    tenant: RequireOrgMember,
    session: DBSession,
) -> list[TeamResponse]:
    """List all teams for the organization."""
    service = TeamService(session)
    teams_data = await service.list_teams(org_id=tenant.org.id)
    return [
        TeamResponse(
            id=t["id"],
            organization_id=t["organization_id"],
            name=t["name"],
            lead_user_id=t["lead_user_id"],
            member_count=t["member_count"],
            created_at=t["created_at"],
        )
        for t in teams_data
    ]


@router.get(
    "/orgs/{org_id}/teams/{team_id}",
    response_model=TeamDetailResponse,
)
async def get_team(
    org_id: uuid.UUID,
    team_id: uuid.UUID,
    tenant: RequireOrgMember,
    session: DBSession,
) -> TeamDetailResponse:
    """Get team details and members."""
    service = TeamService(session)
    team_data = await service.get_team_detail(org_id=tenant.org.id, team_id=team_id)
    return TeamDetailResponse(**team_data)


@router.patch(
    "/orgs/{org_id}/teams/{team_id}",
    response_model=TeamResponse,
)
async def update_team(
    org_id: uuid.UUID,
    team_id: uuid.UUID,
    data: TeamUpdateRequest,
    tenant: RequireOrgAdmin,
    session: DBSession,
) -> TeamResponse:
    """Update team name or assigned lead (Owner/Admin only)."""
    service = TeamService(session)
    team = await service.update_team(
        org_id=tenant.org.id,
        team_id=team_id,
        name=data.name,
        lead_user_id=data.lead_user_id,
    )
    await session.commit()

    # Get updated member count
    teams = await service.list_teams(org_id=tenant.org.id)
    count = next((t["member_count"] for t in teams if t["id"] == team.id), 0)

    return TeamResponse(
        id=team.id,
        organization_id=team.organization_id,
        name=team.name,
        lead_user_id=team.lead_user_id,
        member_count=count,
        created_at=team.created_at,
    )


@router.delete(
    "/orgs/{org_id}/teams/{team_id}",
    response_model=MessageResponse,
)
async def delete_team(
    org_id: uuid.UUID,
    team_id: uuid.UUID,
    tenant: RequireOrgAdmin,
    session: DBSession,
) -> MessageResponse:
    """Delete a team (Owner/Admin only)."""
    service = TeamService(session)
    await service.delete_team(org_id=tenant.org.id, team_id=team_id)
    await session.commit()
    return MessageResponse(message="Team deleted successfully")


@router.post(
    "/orgs/{org_id}/teams/{team_id}/members",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_team_member(
    org_id: uuid.UUID,
    team_id: uuid.UUID,
    data: TeamAddMemberRequest,
    tenant: RequireOrgAdmin,
    session: DBSession,
) -> MessageResponse:
    """Add a member to a team (Owner/Admin only)."""
    service = TeamService(session)
    await service.add_member(
        org_id=tenant.org.id,
        team_id=team_id,
        user_id=data.user_id,
    )
    await session.commit()
    return MessageResponse(message="Member added to team successfully")


@router.delete(
    "/orgs/{org_id}/teams/{team_id}/members/{user_id}",
    response_model=MessageResponse,
)
async def remove_team_member(
    org_id: uuid.UUID,
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    tenant: RequireOrgAdmin,
    session: DBSession,
) -> MessageResponse:
    """Remove a member from a team (Owner/Admin only)."""
    service = TeamService(session)
    await service.remove_member(
        org_id=tenant.org.id,
        team_id=team_id,
        user_id=user_id,
    )
    await session.commit()
    return MessageResponse(message="Member removed from team successfully")
