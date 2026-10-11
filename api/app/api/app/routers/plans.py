from datetime import date
import uuid

from fastapi import APIRouter, Depends, Query, status

from app.api.app.access import (
    RequireOrgMember,
    TenantContext,
)
from app.api.app.schemas import (
    PlanCreateRequest,
    PlanOutcomeRequest,
    PlanResponse,
    PlanReviewActionRequest,
    TaskResponse,
    TaskUpdateRequest,
    TeamWeekResponse,
)
from app.database import DBSession
from app.exceptions import ResourceNotFoundException
from app.models import Plan
from app.services.plans import PlanService

router = APIRouter(tags=["plans"])


def map_plan_to_response(plan: Plan) -> PlanResponse:
    user_name = None
    if plan.user:
        user_name = f"{plan.user.first_name} {plan.user.last_name}".strip()

    tasks_out = [
        TaskResponse(
            id=t.id,
            plan_id=t.plan_id,
            category=t.category,
            title=t.title,
            why_it_matters=t.why_it_matters,
            is_completed=t.is_completed,
            sort_order=t.sort_order,
            created_at=t.created_at,
        )
        for t in plan.tasks
    ]

    return PlanResponse(
        id=plan.id,
        organization_id=plan.organization_id,
        team_id=plan.team_id,
        user_id=plan.user_id,
        user_name=user_name,
        week_start_date=plan.week_start_date,
        status=plan.status,
        review_comment=plan.review_comment,
        reviewed_by_user_id=plan.reviewed_by_user_id,
        reviewed_at=plan.reviewed_at,
        main_task_shipped=plan.main_task_shipped,
        tasks=tasks_out,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.post(
    "/orgs/{org_id}/plans",
    response_model=PlanResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_or_update_plan(
    org_id: uuid.UUID,
    data: PlanCreateRequest,
    tenant: RequireOrgMember,
    session: DBSession,
) -> PlanResponse:
    """Create or update a draft plan for a Monday week."""
    service = PlanService(session)
    plan = await service.create_or_update_plan(
        org_id=tenant.org.id,
        team_id=data.team_id,
        user_id=tenant.user.id,
        week_start_date=data.week_start_date,
        tasks_data=data.tasks,
    )
    await session.commit()
    return map_plan_to_response(plan)


@router.get(
    "/orgs/{org_id}/plans/my-plan",
    response_model=PlanResponse,
)
async def get_my_plan(
    org_id: uuid.UUID,
    week_start_date: date,
    tenant: RequireOrgMember,
    session: DBSession,
) -> PlanResponse:
    """Fetch the caller's plan for a specified Monday week."""
    service = PlanService(session)
    plan = await service.get_user_plan_for_week(
        org_id=tenant.org.id,
        user_id=tenant.user.id,
        week_start_date=week_start_date,
    )
    if not plan:
        raise ResourceNotFoundException("No plan found for the specified week")
    return map_plan_to_response(plan)


@router.get(
    "/orgs/{org_id}/plans/history",
    response_model=list[PlanResponse],
)
async def list_plan_history(
    org_id: uuid.UUID,
    tenant: RequireOrgMember,
    session: DBSession,
    user_id: uuid.UUID | None = Query(None),
    team_id: uuid.UUID | None = Query(None),
) -> list[PlanResponse]:
    """List historical plans for an organization, optionally filtered by user or team."""
    service = PlanService(session)
    plans = await service.list_history(
        org_id=tenant.org.id,
        user_id=user_id,
        team_id=team_id,
    )
    return [map_plan_to_response(p) for p in plans]


@router.get(
    "/orgs/{org_id}/plans/{plan_id}",
    response_model=PlanResponse,
)
async def get_plan(
    org_id: uuid.UUID,
    plan_id: uuid.UUID,
    tenant: RequireOrgMember,
    session: DBSession,
) -> PlanResponse:
    """Get a plan by ID (Anti-Oracle 404)."""
    service = PlanService(session)
    plan = await service.get_plan(org_id=tenant.org.id, plan_id=plan_id)
    return map_plan_to_response(plan)


@router.post(
    "/orgs/{org_id}/plans/{plan_id}/submit",
    response_model=PlanResponse,
)
async def submit_plan(
    org_id: uuid.UUID,
    plan_id: uuid.UUID,
    tenant: RequireOrgMember,
    session: DBSession,
) -> PlanResponse:
    """Submit a draft plan for lead review."""
    service = PlanService(session)
    plan = await service.submit_plan(
        org_id=tenant.org.id,
        plan_id=plan_id,
        user_id=tenant.user.id,
        caller_role=tenant.role,
    )
    await session.commit()
    return map_plan_to_response(plan)


@router.post(
    "/orgs/{org_id}/plans/{plan_id}/approve",
    response_model=PlanResponse,
)
async def approve_plan(
    org_id: uuid.UUID,
    plan_id: uuid.UUID,
    tenant: RequireOrgMember,
    session: DBSession,
) -> PlanResponse:
    """Approve a submitted plan (Team Lead or Org Admin only)."""
    service = PlanService(session)
    plan = await service.approve_plan(
        org_id=tenant.org.id,
        plan_id=plan_id,
        reviewer_user_id=tenant.user.id,
        caller_role=tenant.role,
    )
    await session.commit()
    return map_plan_to_response(plan)


@router.post(
    "/orgs/{org_id}/plans/{plan_id}/send-back",
    response_model=PlanResponse,
)
async def send_back_plan(
    org_id: uuid.UUID,
    plan_id: uuid.UUID,
    data: PlanReviewActionRequest,
    tenant: RequireOrgMember,
    session: DBSession,
) -> PlanResponse:
    """Send back a plan with comments for revisions (Team Lead or Org Admin only)."""
    service = PlanService(session)
    plan = await service.send_back_plan(
        org_id=tenant.org.id,
        plan_id=plan_id,
        reviewer_user_id=tenant.user.id,
        caller_role=tenant.role,
        comment=data.comment or "Revisions requested by lead",
    )
    await session.commit()
    return map_plan_to_response(plan)


@router.patch(
    "/orgs/{org_id}/plans/{plan_id}/tasks/{task_id}",
    response_model=TaskResponse,
)
async def update_task_completion(
    org_id: uuid.UUID,
    plan_id: uuid.UUID,
    task_id: uuid.UUID,
    data: TaskUpdateRequest,
    tenant: RequireOrgMember,
    session: DBSession,
) -> TaskResponse:
    """Toggle or update task completion during the week."""
    service = PlanService(session)
    task = await service.update_task_completion(
        org_id=tenant.org.id,
        plan_id=plan_id,
        task_id=task_id,
        user_id=tenant.user.id,
        caller_role=tenant.role,
        is_completed=bool(data.is_completed),
    )
    await session.commit()
    return TaskResponse(
        id=task.id,
        plan_id=task.plan_id,
        category=task.category,
        title=task.title,
        why_it_matters=task.why_it_matters,
        is_completed=task.is_completed,
        sort_order=task.sort_order,
        created_at=task.created_at,
    )


@router.patch(
    "/orgs/{org_id}/plans/{plan_id}/outcome",
    response_model=PlanResponse,
)
async def update_plan_outcome(
    org_id: uuid.UUID,
    plan_id: uuid.UUID,
    data: PlanOutcomeRequest,
    tenant: RequireOrgMember,
    session: DBSession,
) -> PlanResponse:
    """Mark whether the main goal shipped at week's end."""
    service = PlanService(session)
    plan = await service.update_plan_outcome(
        org_id=tenant.org.id,
        plan_id=plan_id,
        user_id=tenant.user.id,
        caller_role=tenant.role,
        main_task_shipped=data.main_task_shipped,
    )
    await session.commit()
    return map_plan_to_response(plan)


@router.get(
    "/orgs/{org_id}/teams/{team_id}/week",
    response_model=TeamWeekResponse,
)
async def get_team_week(
    org_id: uuid.UUID,
    team_id: uuid.UUID,
    week_start_date: date,
    tenant: RequireOrgMember,
    session: DBSession,
) -> TeamWeekResponse:
    """Get the Team's Week overview for a Monday week."""
    service = PlanService(session)
    overview = await service.get_team_week_overview(
        org_id=tenant.org.id,
        team_id=team_id,
        week_start_date=week_start_date,
    )
    return TeamWeekResponse(**overview)
