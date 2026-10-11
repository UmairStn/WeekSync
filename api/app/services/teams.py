from collections.abc import Sequence
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.exceptions import ConflictException, ResourceNotFoundException, ValidationException
from app.models import Membership, Team, TeamMember, User


class TeamService:
    """Business logic for teams and team members within an organization."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_team(
        self,
        *,
        org_id: uuid.UUID,
        name: str,
        lead_user_id: uuid.UUID | None = None,
    ) -> Team:
        """Create a new team in an organization, verifying uniqueness and lead membership."""
        cleaned_name = name.strip()

        # Check unique name per org
        existing = await self.session.scalar(
            select(Team).where(Team.organization_id == org_id, Team.name == cleaned_name)
        )
        if existing:
            raise ConflictException("A team with this name already exists in this organization")

        # If lead specified, verify they belong to the organization
        if lead_user_id:
            lead_member = await self.session.scalar(
                select(Membership).where(
                    Membership.organization_id == org_id,
                    Membership.user_id == lead_user_id,
                )
            )
            if not lead_member:
                raise ValidationException("The selected team lead is not a member of this organization")

        team = Team(
            organization_id=org_id,
            name=cleaned_name,
            lead_user_id=lead_user_id,
        )
        self.session.add(team)
        await self.session.flush()

        # If lead user is set, automatically add them to team_members if not present
        if lead_user_id:
            self.session.add(TeamMember(team_id=team.id, user_id=lead_user_id))
            await self.session.flush()

        return team

    async def list_teams(self, *, org_id: uuid.UUID) -> Sequence[dict]:
        """List all teams for an organization with their member counts."""
        # Query teams with count of members
        stmt = (
            select(
                Team,
                func.count(TeamMember.id).label("member_count"),
            )
            .outerjoin(TeamMember, Team.id == TeamMember.team_id)
            .where(Team.organization_id == org_id)
            .group_by(Team.id)
            .order_by(Team.name.asc())
        )
        results = await self.session.execute(stmt)
        rows = results.all()

        output = []
        for team, count in rows:
            output.append({
                "id": team.id,
                "organization_id": team.organization_id,
                "name": team.name,
                "lead_user_id": team.lead_user_id,
                "member_count": count,
                "created_at": team.created_at,
            })
        return output

    async def get_team(self, *, org_id: uuid.UUID, team_id: uuid.UUID) -> Team:
        """Get a team by ID scoped to the organization (Anti-Oracle 404)."""
        team = await self.session.scalar(
            select(Team).where(Team.id == team_id, Team.organization_id == org_id)
        )
        if not team:
            raise ResourceNotFoundException("Team not found")
        return team

    async def get_team_detail(self, *, org_id: uuid.UUID, team_id: uuid.UUID) -> dict:
        """Get team with full list of members and lead flags."""
        team = await self.session.scalar(
            select(Team)
            .options(
                selectinload(Team.members).selectinload(TeamMember.user),
            )
            .where(Team.id == team_id, Team.organization_id == org_id)
        )
        if not team:
            raise ResourceNotFoundException("Team not found")

        members_info = []
        for tm in team.members:
            members_info.append({
                "user_id": tm.user_id,
                "first_name": tm.user.first_name,
                "last_name": tm.user.last_name,
                "email": tm.user.email,
                "is_lead": tm.user_id == team.lead_user_id,
            })

        return {
            "id": team.id,
            "organization_id": team.organization_id,
            "name": team.name,
            "lead_user_id": team.lead_user_id,
            "members": members_info,
            "created_at": team.created_at,
        }

    async def update_team(
        self,
        *,
        org_id: uuid.UUID,
        team_id: uuid.UUID,
        name: str | None = None,
        lead_user_id: uuid.UUID | None = None,
    ) -> Team:
        """Update team attributes."""
        team = await self.get_team(org_id=org_id, team_id=team_id)

        if name is not None:
            cleaned_name = name.strip()
            existing = await self.session.scalar(
                select(Team).where(
                    Team.organization_id == org_id,
                    Team.name == cleaned_name,
                    Team.id != team_id,
                )
            )
            if existing:
                raise ConflictException("A team with this name already exists in this organization")
            team.name = cleaned_name

        if lead_user_id is not None:
            lead_member = await self.session.scalar(
                select(Membership).where(
                    Membership.organization_id == org_id,
                    Membership.user_id == lead_user_id,
                )
            )
            if not lead_member:
                raise ValidationException("The selected team lead is not a member of this organization")
            team.lead_user_id = lead_user_id

            # Add lead to team_members if not already there
            existing_tm = await self.session.scalar(
                select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == lead_user_id)
            )
            if not existing_tm:
                self.session.add(TeamMember(team_id=team_id, user_id=lead_user_id))

        await self.session.flush()
        return team

    async def delete_team(self, *, org_id: uuid.UUID, team_id: uuid.UUID) -> None:
        """Delete a team."""
        team = await self.get_team(org_id=org_id, team_id=team_id)
        await self.session.delete(team)
        await self.session.flush()

    async def add_member(
        self,
        *,
        org_id: uuid.UUID,
        team_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> TeamMember:
        """Add an org member to a team."""
        # Ensure team exists in org
        await self.get_team(org_id=org_id, team_id=team_id)

        # Ensure user belongs to the org
        org_member = await self.session.scalar(
            select(Membership).where(
                Membership.organization_id == org_id,
                Membership.user_id == user_id,
            )
        )
        if not org_member:
            raise ValidationException("User must be an active member of this organization")

        # Check not already in team
        existing_tm = await self.session.scalar(
            select(TeamMember).where(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user_id,
            )
        )
        if existing_tm:
            raise ConflictException("User is already a member of this team")

        tm = TeamMember(team_id=team_id, user_id=user_id)
        self.session.add(tm)
        await self.session.flush()
        return tm

    async def remove_member(
        self,
        *,
        org_id: uuid.UUID,
        team_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        """Remove a member from a team."""
        team = await self.get_team(org_id=org_id, team_id=team_id)

        tm = await self.session.scalar(
            select(TeamMember).where(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user_id,
            )
        )
        if not tm:
            raise ResourceNotFoundException("Team member not found")

        # If user was the lead, clear lead_user_id
        if team.lead_user_id == user_id:
            team.lead_user_id = None

        await self.session.delete(tm)
        await self.session.flush()
