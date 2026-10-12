from __future__ import annotations

from pydantic import UUID4, EmailStr, Field

from app.schemas import DateTime, Model


class AuthRequest(Model):
    email: EmailStr
    password: str


class AuthResponse(Model):
    access_token: str


class UserOrgMembershipResponse(Model):
    id: UUID4
    name: str
    slug: str
    org_role: str
    is_suspended: bool


class InternalUserResponse(Model):
    id: UUID4
    created_at: DateTime
    updated_at: DateTime | None
    first_name: str
    last_name: str
    email: str
    is_admin: bool
    is_active: bool
    organizations: list[UserOrgMembershipResponse] = Field(default_factory=list)


class UsersListResponse(Model):
    items: list[InternalUserResponse]
    total: int
    limit: int
    offset: int


class UserCreateRequest(Model):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)
    is_admin: bool = False
    is_active: bool = True


class UserUpdateRequest(Model):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    is_admin: bool | None = None
    is_active: bool | None = None


class UserChangePasswordRequest(Model):
    password: str = Field(min_length=8)


class InternalOrganizationResponse(Model):
    id: UUID4
    name: str
    slug: str
    is_suspended: bool
    created_at: DateTime
    member_count: int
    team_count: int
    plan_count: int
    last_active: DateTime | None = None


class InternalOrganizationsListResponse(Model):
    items: list[InternalOrganizationResponse]
    total: int
    limit: int
    offset: int


class AICallLogResponse(Model):
    id: UUID4
    organization_id: UUID4
    organization_name: str | None = None
    user_id: UUID4
    user_email: str | None = None
    feature: str
    status: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    latency_ms: int | None = None
    error_message: str | None = None
    created_at: DateTime


class OrgAIUsageSummary(Model):
    organization_id: UUID4
    organization_name: str
    organization_slug: str
    total_calls: int
    success_calls: int
    failure_calls: int
    rate_limited_calls: int
    last_call_at: DateTime | None = None


class AIUsageOverviewResponse(Model):
    total_calls: int
    success_calls: int
    failure_calls: int
    rate_limited_calls: int
    total_prompt_tokens: int
    total_completion_tokens: int
    org_summaries: list[OrgAIUsageSummary] = Field(default_factory=list)
    recent_logs: list[AICallLogResponse] = Field(default_factory=list)

