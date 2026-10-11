import re
import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import APIException, ResourceNotFoundException
from app.models import Membership, Organization, User


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
