import uuid

from fastapi import APIRouter, Query

from app.api.internal.access import CurrentInternalUser
from app.api.internal.schemas import (
    InternalOrganizationResponse,
    InternalOrganizationsListResponse,
)
from app.database import DBSession
from app.services.orgs import OrganizationService

router = APIRouter(tags=["orgs"])


@router.get("/orgs", response_model=InternalOrganizationsListResponse)
async def list_internal_organizations(
    current_user: CurrentInternalUser,
    session: DBSession,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str | None = Query(None, description="Search by org name or slug"),
) -> InternalOrganizationsListResponse:
    """List organizations with aggregate counts and activity timestamps for platform staff."""
    service = OrganizationService(session)
    items, total = await service.list_organizations_internal(
        limit=limit, offset=offset, search=search
    )
    return InternalOrganizationsListResponse(
        items=[InternalOrganizationResponse(**item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/orgs/{org_id}", response_model=InternalOrganizationResponse)
async def get_internal_organization(
    current_user: CurrentInternalUser,
    session: DBSession,
    org_id: uuid.UUID,
) -> InternalOrganizationResponse:
    """Get single organization health metrics and aggregates for platform staff."""
    service = OrganizationService(session)
    data = await service.get_organization_internal(org_id)
    return InternalOrganizationResponse(**data)


@router.post("/orgs/{org_id}/suspend", response_model=InternalOrganizationResponse)
async def suspend_organization(
    current_user: CurrentInternalUser,
    session: DBSession,
    org_id: uuid.UUID,
) -> InternalOrganizationResponse:
    """Suspend an organization, instantly locking out customer members."""
    service = OrganizationService(session)
    await service.suspend_organization(org_id)
    await session.commit()
    data = await service.get_organization_internal(org_id)
    return InternalOrganizationResponse(**data)


@router.post("/orgs/{org_id}/reinstate", response_model=InternalOrganizationResponse)
async def reinstate_organization(
    current_user: CurrentInternalUser,
    session: DBSession,
    org_id: uuid.UUID,
) -> InternalOrganizationResponse:
    """Reinstate a suspended organization, restoring customer member access."""
    service = OrganizationService(session)
    await service.reinstate_organization(org_id)
    await session.commit()
    data = await service.get_organization_internal(org_id)
    return InternalOrganizationResponse(**data)
