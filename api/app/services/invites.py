from datetime import UTC, datetime
import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import APIException, ResourceNotFoundException
from app.models import Invite, Membership, Organization


class InviteService:
    """Business logic for organization invitation links."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_invite(
        self,
        *,
        org_id: uuid.UUID,
        user_id: uuid.UUID,
        role: str = "member",
        expires_at: datetime | None = None,
    ) -> Invite:
        """Create a new copyable invite token for an organization."""
        token = secrets.token_urlsafe(32)
        invite = Invite(
            organization_id=org_id,
            token=token,
            role=role,
            created_by_user_id=user_id,
            expires_at=expires_at,
            is_revoked=False,
        )
        self.session.add(invite)
        await self.session.flush()
        return invite

    async def get_invite(self, token: str) -> Invite:
        """Retrieve and validate an invite by its token."""
        stmt = select(Invite).where(Invite.token == token)
        invite = (await self.session.execute(stmt)).scalars().first()
        if not invite:
            raise ResourceNotFoundException("Invite token not found")

        if invite.is_revoked:
            raise APIException(
                status_code=400,
                code="INVITE_REVOKED",
                message="This invitation link has been revoked",
            )

        if invite.expires_at and invite.expires_at < datetime.now(UTC):
            raise APIException(
                status_code=400,
                code="INVITE_EXPIRED",
                message="This invitation link has expired",
            )

        org = await self.session.get(Organization, invite.organization_id)
        if not org or org.is_suspended:
            raise APIException(
                status_code=403,
                code="ORGANIZATION_SUSPENDED",
                message="Cannot join a suspended or nonexistent organization",
            )

        return invite

    async def accept_invite(
        self,
        *,
        token: str,
        user_id: uuid.UUID,
    ) -> tuple[Organization, Membership]:
        """Accept an invite and join the organization."""
        invite = await self.get_invite(token)

        # Check if already a member
        stmt = select(Membership).where(
            Membership.organization_id == invite.organization_id,
            Membership.user_id == user_id,
        )
        existing = (await self.session.execute(stmt)).scalars().first()
        org = await self.session.get(Organization, invite.organization_id)
        if not org:
            raise ResourceNotFoundException("Organization not found")

        if existing:
            return org, existing

        membership = Membership(
            organization_id=invite.organization_id,
            user_id=user_id,
            org_role=invite.role,
        )
        self.session.add(membership)
        await self.session.flush()

        return org, membership
