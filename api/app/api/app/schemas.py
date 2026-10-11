from __future__ import annotations

from datetime import date
from pydantic import UUID4, EmailStr, Field

from app.schemas import DateTime, Model


class AuthRequest(Model):
    email: EmailStr
    password: str


class AuthResponse(Model):
    access_token: str


class SignupRequest(Model):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    org_name: str | None = None
    invite_token: str | None = None


class UserResponse(Model):
    id: UUID4
    created_at: DateTime
    updated_at: DateTime | None
    first_name: str
    last_name: str
    email: str


class OrganizationCreateRequest(Model):
    name: str


class OrganizationResponse(Model):
    id: UUID4
    name: str
    slug: str
    is_suspended: bool
    created_at: DateTime
    my_role: str | None = None


class MemberResponse(Model):
    user_id: UUID4
    first_name: str
    last_name: str
    email: str
    org_role: str
    created_at: DateTime


class UpdateMemberRoleRequest(Model):
    org_role: str


class InviteCreateRequest(Model):
    role: str = "member"


class InviteResponse(Model):
    id: UUID4
    organization_id: UUID4
    token: str
    role: str
    is_revoked: bool
    expires_at: DateTime | None
    created_at: DateTime


# --- Teams ---


class TeamCreateRequest(Model):
    name: str = Field(min_length=1, max_length=100)
    lead_user_id: UUID4 | None = None


class TeamUpdateRequest(Model):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    lead_user_id: UUID4 | None = None


class TeamMemberInfo(Model):
    user_id: UUID4
    first_name: str
    last_name: str
    email: str
    is_lead: bool


class TeamResponse(Model):
    id: UUID4
    organization_id: UUID4
    name: str
    lead_user_id: UUID4 | None
    member_count: int = 0
    created_at: DateTime


class TeamDetailResponse(Model):
    id: UUID4
    organization_id: UUID4
    name: str
    lead_user_id: UUID4 | None
    members: list[TeamMemberInfo]
    created_at: DateTime


class TeamAddMemberRequest(Model):
    user_id: UUID4


# --- Plans & Tasks ---


class TaskCreateRequest(Model):
    category: str = Field(description="'main', 'sub_goal', or 'gtm'")
    title: str = Field(min_length=1, max_length=255)
    why_it_matters: str | None = None
    sort_order: int = 0


class TaskUpdateRequest(Model):
    title: str | None = None
    why_it_matters: str | None = None
    is_completed: bool | None = None
    sort_order: int | None = None


class TaskResponse(Model):
    id: UUID4
    plan_id: UUID4
    category: str
    title: str
    why_it_matters: str | None
    is_completed: bool
    sort_order: int
    created_at: DateTime


class PlanCreateRequest(Model):
    team_id: UUID4
    week_start_date: date
    tasks: list[TaskCreateRequest]


class PlanUpdateRequest(Model):
    tasks: list[TaskCreateRequest] | None = None


class PlanReviewActionRequest(Model):
    comment: str | None = None


class PlanOutcomeRequest(Model):
    main_task_shipped: bool


class PlanResponse(Model):
    id: UUID4
    organization_id: UUID4
    team_id: UUID4
    user_id: UUID4
    user_name: str | None = None
    week_start_date: date
    status: str
    review_comment: str | None
    reviewed_by_user_id: UUID4 | None
    reviewed_at: DateTime | None
    main_task_shipped: bool | None
    tasks: list[TaskResponse]
    created_at: DateTime
    updated_at: DateTime | None = None


class MemberWeeklyStatus(Model):
    user_id: UUID4
    first_name: str
    last_name: str
    is_lead: bool
    plan_id: UUID4 | None = None
    status: str | None = None
    main_task_title: str | None = None
    main_task_why: str | None = None
    main_task_shipped: bool | None = None
    total_tasks: int = 0
    completed_tasks: int = 0


class TeamWeekResponse(Model):
    team_id: UUID4
    team_name: str
    week_start_date: date
    members: list[MemberWeeklyStatus]


