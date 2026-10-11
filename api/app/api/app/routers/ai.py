import uuid

from fastapi import APIRouter, status

from app.api.app.access import RequireOrgMember
from app.api.app.schemas import (
    BrainDumpRequest,
    BrainDumpResult,
    PlanReviewRequest,
    PlanReviewResult,
)
from app.database import DBSession
from app.services.ai import draft_plan_from_brain_dump, review_plan

router = APIRouter(tags=["ai"])


@router.post(
    "/orgs/{org_id}/ai/review",
    response_model=PlanReviewResult,
    status_code=status.HTTP_200_OK,
)
async def ai_plan_review(
    org_id: uuid.UUID,
    data: PlanReviewRequest,
    tenant: RequireOrgMember,
    session: DBSession,
) -> PlanReviewResult:
    """Run Plan Review Agent ("Approval Meeting in a Box") on a draft plan.

    Flags:
    - Activity-oriented tasks rather than checkable outcomes.
    - Main task lacking 'why it matters' / business impact.
    - Missing go-to-market goals (telemetry, docs, changelog, flags).
    - Unrealistic scope for a 5-day cycle.

    Does not modify the database; returns structured findings for form annotations.
    """
    user_name = f"{tenant.user.first_name} {tenant.user.last_name}".strip()
    return await review_plan(
        session=session,
        organization_id=tenant.org.id,
        user_id=tenant.user.id,
        request=data,
        user_name=user_name,
    )


@router.post(
    "/orgs/{org_id}/ai/brain-dump",
    response_model=BrainDumpResult,
    status_code=status.HTTP_200_OK,
)
async def ai_brain_dump(
    org_id: uuid.UUID,
    data: BrainDumpRequest,
    tenant: RequireOrgMember,
    session: DBSession,
) -> BrainDumpResult:
    """Run Brain Dump Agent ("Draft from Notes") to structure unstructured scratchpad notes.

    Synthesizes messy bullets or raw text into:
    - 1 Main Task (with checkable outcome and 'why it matters')
    - 1-5 Sub-Goals
    - 1-4 Go-To-Market Goals

    Does not write to the database; returns typed plan for pre-filling the UI form.
    """
    return await draft_plan_from_brain_dump(
        session=session,
        organization_id=tenant.org.id,
        user_id=tenant.user.id,
        request=data,
    )
