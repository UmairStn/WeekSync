import uuid

from fastapi import APIRouter, Depends, status

from app.api.app.access import (
    CurrentUser,
    RequireOrgAdmin,
    RequireOrgMember,
    TenantContext,
)
from app.api.app.schemas import (
    InviteCreateRequest,
    InviteResponse,
    MemberResponse,
    OrganizationCreateRequest,
    OrganizationResponse,
    UpdateMemberRoleRequest,
)
from app.database import DBSession
from app.schemas import MessageResponse
from app.services.invites import InviteService
from app.services.orgs import OrganizationService

router = APIRouter(tags=["organizations"])


@router.post("/orgs", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    data: OrganizationCreateRequest,
    user: CurrentUser,
    session: DBSession,
) -> OrganizationResponse:
    """Create a new organization where the caller becomes the Owner."""
    service = OrganizationService(session)
    org = await service.create_organization(
        user_id=user.id,
        name=data.name,
    )
    await session.commit()
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        is_suspended=org.is_suspended,
        created_at=org.created_at,
        my_role="owner",
    )


@router.get("/orgs", response_model=list[OrganizationResponse])
async def list_my_organizations(
    user: CurrentUser,
    session: DBSession,
) -> list[OrganizationResponse]:
    """List all organizations that the current user belongs to."""
    service = OrganizationService(session)
    results = await service.list_user_organizations(user.id)
    return [
        OrganizationResponse(
            id=org.id,
            name=org.name,
            slug=org.slug,
            is_suspended=org.is_suspended,
            created_at=org.created_at,
            my_role=role,
        )
        for org, role in results
    ]


@router.get("/orgs/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    tenant: RequireOrgMember,
) -> OrganizationResponse:
    """Get organization details for a member. Tenancy-guarded (returns 404 for non-members)."""
    return OrganizationResponse(
        id=tenant.org.id,
        name=tenant.org.name,
        slug=tenant.org.slug,
        is_suspended=tenant.org.is_suspended,
        created_at=tenant.org.created_at,
        my_role=tenant.role,
    )


@router.get("/orgs/{org_id}/members", response_model=list[MemberResponse])
async def list_members(
    tenant: RequireOrgMember,
    session: DBSession,
) -> list[MemberResponse]:
    """List all members of an organization."""
    service = OrganizationService(session)
    members = await service.list_members(tenant.org.id)
    return [
        MemberResponse(
            user_id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            org_role=role,
            created_at=user.created_at,
        )
        for user, role in members
    ]


@router.patch("/orgs/{org_id}/members/{target_user_id}", response_model=MessageResponse)
async def update_member_role(
    target_user_id: uuid.UUID,
    data: UpdateMemberRoleRequest,
    tenant: RequireOrgAdmin,
    session: DBSession,
) -> MessageResponse:
    """Update a member's role (owner or admin required)."""
    service = OrganizationService(session)
    await service.update_member_role(
        org_id=tenant.org.id,
        target_user_id=target_user_id,
        new_role=data.org_role,
        caller_role=tenant.role,
    )
    await session.commit()
    return MessageResponse(message="Member role updated successfully")


@router.delete("/orgs/{org_id}/members/{target_user_id}", response_model=MessageResponse)
async def remove_member(
    target_user_id: uuid.UUID,
    tenant: RequireOrgAdmin,
    session: DBSession,
) -> MessageResponse:
    """Remove a member from the organization (owner or admin required)."""
    service = OrganizationService(session)
    await service.remove_member(
        org_id=tenant.org.id,
        target_user_id=target_user_id,
    )
    await session.commit()
    return MessageResponse(message="Member removed successfully")


@router.post("/orgs/{org_id}/invites", response_model=InviteResponse, status_code=status.HTTP_201_CREATED)
async def create_invite(
    data: InviteCreateRequest,
    tenant: RequireOrgAdmin,
    session: DBSession,
) -> InviteResponse:
    """Generate a copyable invite token for an organization (admin or owner required)."""
    service = InviteService(session)
    invite = await service.create_invite(
        org_id=tenant.org.id,
        user_id=tenant.user.id,
        role=data.role,
    )
    await session.commit()
    return InviteResponse(
        id=invite.id,
        organization_id=invite.organization_id,
        token=invite.token,
        role=invite.role,
        is_revoked=invite.is_revoked,
        expires_at=invite.expires_at,
        created_at=invite.created_at,
    )


@router.get("/invites/{token}", response_model=InviteResponse)
async def get_invite_info(
    token: str,
    session: DBSession,
) -> InviteResponse:
    """Inspect an invite link's validity before accepting."""
    service = InviteService(session)
    invite = await service.get_invite(token)
    return InviteResponse(
        id=invite.id,
        organization_id=invite.organization_id,
        token=invite.token,
        role=invite.role,
        is_revoked=invite.is_revoked,
        expires_at=invite.expires_at,
        created_at=invite.created_at,
    )


@router.post("/invites/{token}/accept", response_model=OrganizationResponse)
async def accept_invite(
    token: str,
    user: CurrentUser,
    session: DBSession,
) -> OrganizationResponse:
    """Accept an invite token and join the organization."""
    service = InviteService(session)
    org, membership = await service.accept_invite(
        token=token,
        user_id=user.id,
    )
    await session.commit()
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        is_suspended=org.is_suspended,
        created_at=org.created_at,
        my_role=membership.org_role,
    )
