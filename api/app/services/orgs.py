import re
import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import APIException, ResourceNotFoundException
from app.models import Membership, Organization, Plan, Team, User


def slugify(text: str) -> str:
    """Generate a clean URL slug from a name."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-") or "org"


class OrganizationService:
    """Business logic for organizations and memberships."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_organization(
        self,
        *,
        user_id: uuid.UUID,
        name: str,
    ) -> Organization:
        """Create a new organization and assign the creator as the Owner."""
        base_slug = slugify(name)
        slug = base_slug

        # Ensure slug uniqueness
        counter = 1
        while True:
            existing = await self.session.scalar(
                select(Organization).where(Organization.slug == slug)
            )
            if not existing:
                break
            slug = f"{base_slug}-{counter}"
            counter += 1

        org = Organization(
            name=name.strip(),
            slug=slug,
            is_suspended=False,
        )
        self.session.add(org)
        await self.session.flush()

        membership = Membership(
            organization_id=org.id,
            user_id=user_id,
            org_role="owner",
        )
        self.session.add(membership)
        await self.session.flush()

        return org

    async def list_user_organizations(
        self, user_id: uuid.UUID
    ) -> Sequence[tuple[Organization, str]]:
        """Return all active organizations the user belongs to, with their role."""
        stmt = (
            select(Organization, Membership.org_role)
            .join(Membership, Membership.organization_id == Organization.id)
            .where(
                Membership.user_id == user_id,
                Organization.is_suspended.is_(False),
            )
            .order_by(Organization.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

    async def get_organization(self, org_id: uuid.UUID) -> Organization:
        """Fetch an organization by ID or raise 404."""
        org = await self.session.get(Organization, org_id)
        if not org:
            raise ResourceNotFoundException("Organization not found")
        return org

    async def list_members(
        self, org_id: uuid.UUID
    ) -> Sequence[tuple[User, str]]:
        """List all members and their roles for an organization."""
        stmt = (
            select(User, Membership.org_role)
            .join(Membership, Membership.user_id == User.id)
            .where(Membership.organization_id == org_id)
            .order_by(User.first_name, User.last_name)
        )
        result = await self.session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

    async def update_member_role(
        self,
        *,
        org_id: uuid.UUID,
        target_user_id: uuid.UUID,
        new_role: str,
        caller_role: str,
    ) -> Membership:
        """Update a member's role (owner or admin only)."""
        if new_role not in ("owner", "admin", "member"):
            raise APIException(
                status_code=400,
                code="INVALID_ROLE",
                message="Role must be 'owner', 'admin', or 'member'",
            )

        # Only owners can promote someone to owner
        if new_role == "owner" and caller_role != "owner":
            raise APIException(
                status_code=403,
                code="INSUFFICIENT_PERMISSIONS",
                message="Only organization owners can grant owner role",
            )

        stmt = select(Membership).where(
            Membership.organization_id == org_id,
            Membership.user_id == target_user_id,
        )
        membership = (await self.session.execute(stmt)).scalars().first()
        if not membership:
            raise ResourceNotFoundException("Member not found in organization")

        membership.org_role = new_role
        await self.session.flush()
        return membership

    async def remove_member(
        self,
        *,
        org_id: uuid.UUID,
        target_user_id: uuid.UUID,
    ) -> None:
        """Remove a member from an organization."""
        stmt = select(Membership).where(
            Membership.organization_id == org_id,
            Membership.user_id == target_user_id,
        )
        membership = (await self.session.execute(stmt)).scalars().first()
        if not membership:
            raise ResourceNotFoundException("Member not found in organization")

        # Do not allow removing the last owner
        if membership.org_role == "owner":
            owners = (
                await self.session.execute(
                    select(Membership).where(
                        Membership.organization_id == org_id,
                        Membership.org_role == "owner",
                    )
                )
            ).scalars().all()
            if len(owners) <= 1:
                raise APIException(
                    status_code=400,
                    code="CANNOT_REMOVE_LAST_OWNER",
                    message="Cannot remove the last owner of an organization",
                )

        await self.session.delete(membership)
        await self.session.flush()

    async def list_organizations_internal(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        search: str | None = None,
    ) -> tuple[Sequence[dict[str, Any]], int]:
        """List all organizations with member count, team count, plan count, and last active."""
        member_subq = (
            select(
                Membership.organization_id,
                func.count(Membership.id).label("member_count"),
            )
            .group_by(Membership.organization_id)
            .subquery()
        )

        team_subq = (
            select(
                Team.organization_id,
                func.count(Team.id).label("team_count"),
            )
            .group_by(Team.organization_id)
            .subquery()
        )

        plan_subq = (
            select(
                Plan.organization_id,
                func.count(Plan.id).label("plan_count"),
                func.max(func.coalesce(Plan.updated_at, Plan.created_at)).label(
                    "last_plan_active"
                ),
            )
            .group_by(Plan.organization_id)
            .subquery()
        )

        query = (
            select(
                Organization,
                func.coalesce(member_subq.c.member_count, 0).label("member_count"),
                func.coalesce(team_subq.c.team_count, 0).label("team_count"),
                func.coalesce(plan_subq.c.plan_count, 0).label("plan_count"),
                func.coalesce(
                    plan_subq.c.last_plan_active, Organization.created_at
                ).label("last_active"),
            )
            .outerjoin(member_subq, member_subq.c.organization_id == Organization.id)
            .outerjoin(team_subq, team_subq.c.organization_id == Organization.id)
            .outerjoin(plan_subq, plan_subq.c.organization_id == Organization.id)
        )

        count_query = select(func.count()).select_from(Organization)

        if search:
            pattern = f"%{search.strip().lower()}%"
            cond = or_(
                func.lower(Organization.name).like(pattern),
                func.lower(Organization.slug).like(pattern),
            )
            query = query.where(cond)
            count_query = count_query.where(cond)

        total = await self.session.scalar(count_query) or 0
        rows = (
            await self.session.execute(
                query.order_by(Organization.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).all()

        results = []
        for org, member_cnt, team_cnt, plan_cnt, last_act in rows:
            results.append(
                {
                    "id": org.id,
                    "name": org.name,
                    "slug": org.slug,
                    "is_suspended": org.is_suspended,
                    "created_at": org.created_at,
                    "member_count": int(member_cnt),
                    "team_count": int(team_cnt),
                    "plan_count": int(plan_cnt),
                    "last_active": last_act,
                }
            )
        return results, total

    async def get_organization_internal(
        self, org_id: uuid.UUID
    ) -> dict[str, Any]:
        """Fetch single organization with aggregate metrics for platform staff."""
        org = await self.get_organization(org_id)
        member_cnt = (
            await self.session.scalar(
                select(func.count(Membership.id)).where(
                    Membership.organization_id == org_id
                )
            )
            or 0
        )
        team_cnt = (
            await self.session.scalar(
                select(func.count(Team.id)).where(Team.organization_id == org_id)
            )
            or 0
        )
        plan_cnt = (
            await self.session.scalar(
                select(func.count(Plan.id)).where(Plan.organization_id == org_id)
            )
            or 0
        )
        last_plan_act = await self.session.scalar(
            select(func.max(func.coalesce(Plan.updated_at, Plan.created_at))).where(
                Plan.organization_id == org_id
            )
        )

        return {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "is_suspended": org.is_suspended,
            "created_at": org.created_at,
            "member_count": int(member_cnt),
            "team_count": int(team_cnt),
            "plan_count": int(plan_cnt),
            "last_active": last_plan_act or org.created_at,
        }

    async def suspend_organization(self, org_id: uuid.UUID) -> Organization:
        """Suspend organization. Locks out customer access."""
        org = await self.get_organization(org_id)
        org.is_suspended = True
        await self.session.flush()
        return org

    async def reinstate_organization(self, org_id: uuid.UUID) -> Organization:
        """Reinstate organization. Restores customer access."""
        org = await self.get_organization(org_id)
        org.is_suspended = False
        await self.session.flush()
        return org

