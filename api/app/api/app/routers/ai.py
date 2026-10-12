import uuid

from fastapi import APIRouter, status

from app.api.app.access import RequireOrgMember
from app.api.app.schemas import (
    BrainDumpRequest,
    BrainDumpResult,
    PlanReviewRequest,
    PlanReviewResult,
    WeekSummaryRequest,
    WeekSummaryResult,
)
from app.database import DBSession
from app.exceptions import APIException
from app.services.ai import (
    draft_plan_from_brain_dump,
    generate_week_summary,
    review_plan,
)
from app.services.plans import PlanService

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


@router.post(
    "/orgs/{org_id}/ai/week-summary",
    response_model=WeekSummaryResult,
    status_code=status.HTTP_200_OK,
)
async def ai_week_summary(
    org_id: uuid.UUID,
    data: WeekSummaryRequest,
    tenant: RequireOrgMember,
    session: DBSession,
) -> WeekSummaryResult:
    """Generate an AI End-of-Week Summary for an approved or completed plan.

    Given the plan and which tasks were completed, drafts a short note on
    what shipped, what didn't, and why.
    """
    service = PlanService(session)
    plan = await service.get_plan(org_id=tenant.org.id, plan_id=data.plan_id)

    if plan.status not in ("approved", "done"):
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="PLAN_NOT_FINALIZED",
            message=f"Week summary can only be generated for approved or completed plans (current status: {plan.status}).",
        )

    is_owner = plan.user_id == tenant.user.id
    is_lead_or_admin = await service.check_is_lead_or_admin(
        org_id=tenant.org.id,
        team_id=plan.team_id,
        user_id=tenant.user.id,
        caller_role=tenant.role,
    )
    if not is_owner and not is_lead_or_admin:
        raise APIException(
            status_code=status.HTTP_403_FORBIDDEN,
            code="PERMISSION_DENIED",
            message="You can only generate a week summary for your own plan or a team you lead.",
        )

    return await generate_week_summary(
        session=session,
        organization_id=tenant.org.id,
        user_id=tenant.user.id,
        plan=plan,
    )

