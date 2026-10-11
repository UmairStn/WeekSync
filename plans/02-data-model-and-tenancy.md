# Data Model & Multi-Tenancy Architecture

> Ground truth for database schema, tenancy isolation, authorization matrix, and security attack vectors.
> Compatible with Launchbase conventions: async SQLAlchemy 2.0, PostgreSQL 16, UUID keys, no database enums.

---

## 1. Entity-Relationship & Schema Definition

### Overview
All customer data models inherit from Launchbase's `IdMixin` (UUID v4 primary keys) and `TimestampMixin` (`created_at`, `updated_at` with timezone).
Per **RULES.md § 4**, database enums are strictly forbidden; status and role fields use `String(N)` backed by Pydantic validation schemas.

### Table Schemas

#### 1. `organizations`
Primary tenancy boundary.
```python
class Organization(IdMixin, TimestampMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    is_suspended: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
```
- `is_suspended`: Platform staff killswitch. When `True`, all customer requests for this tenant immediately fail with `403 FORBIDDEN` (`ORGANIZATION_SUSPENDED`).

#### 2. `memberships`
Join table between `users` and `organizations`. Enforces organization-level RBAC.
```python
class Membership(IdMixin, TimestampMixin, Base):
    __tablename__ = "memberships"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Roles: "owner", "admin", "member" (validated via Pydantic OrgRole enum)
    org_role: Mapped[str] = mapped_column(String(20), nullable=False, default="member")

    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_memberships_org_user"),
    )
```

#### 3. `teams`
Functional unit inside an organization.
```python
class Team(IdMixin, TimestampMixin, Base):
    __tablename__ = "teams"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    lead_user_id: Mapped[uuid.UUID | None] = mapped_column(
        types.Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_teams_org_name"),
    )
```

#### 4. `team_members`
Association table connecting users to teams. Users can belong to multiple teams.
```python
class TeamMember(IdMixin, TimestampMixin, Base):
    __tablename__ = "team_members"

    team_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_members_team_user"),
    )
```

#### 5. `invites`
Secure invitation tokens for joining an organization without requiring outbound email delivery.
```python
class Invite(IdMixin, TimestampMixin, Base):
    __tablename__ = "invites"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="member")
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    is_revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

#### 6. `plans`
Weekly plan authored by a member. Keyed strictly by Monday date.
```python
class Plan(IdMixin, TimestampMixin, Base):
    __tablename__ = "plans"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Always Monday date (YYYY-MM-DD)
    week_start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    # Flow: "draft" -> "submitted" -> "approved" -> "done"
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    review_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        types.Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    main_task_shipped: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "week_start_date", name="uq_plans_user_week"),
    )
```

#### 7. `tasks`
Individual tickable items belonging to a weekly plan.
```python
class Task(IdMixin, TimestampMixin, Base):
    __tablename__ = "tasks"

    plan_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid, ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Categories: "main", "sub_goal", "gtm"
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    why_it_matters: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
```

#### 8. `ai_call_logs`
Audit and telemetry logging for every LLM interaction, powering admin analytics.
```python
class AICallLog(IdMixin, TimestampMixin, Base):
    __tablename__ = "ai_call_logs"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    feature: Mapped[str] = mapped_column(String(50), nullable=False) # "plan_review" | "brain_dump"
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # "success" | "failure" | "rate_limited"
    prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
```

---

## 2. Multi-Tenancy Architecture & Scoping

### Strict Tenancy Invariant
Every database query in the `/app` surface MUST be scoped by an `organization_id` derived directly from the authenticated caller's valid `Membership` record.
**NEVER** trust an `organization_id` supplied in request query parameters or request bodies without verifying membership.

### Tenant Resolution Pattern
```python
async def get_tenant_context(
    organization_id: uuid.UUID,
    current_user: CurrentUser,
    session: DBSession,
) -> TenantContext:
    # 1. Fetch organization and verify existence
    org = await session.get(Organization, organization_id)
    if not org:
        raise ResourceNotFoundException("Organization not found")

    # 2. Check suspension lockout
    if org.is_suspended:
        raise APIException(
            status_code=status.HTTP_403_FORBIDDEN,
            code="ORGANIZATION_SUSPENDED",
            message="This organization is suspended. Contact platform support.",
        )

    # 3. Verify user membership in this organization
    stmt = select(Membership).where(
        Membership.organization_id == organization_id,
        Membership.user_id == current_user.id
    )
    membership = (await session.execute(stmt)).scalar_one_or_none()
    if not membership:
        # Return 404 to avoid leaking that the organization exists
        raise ResourceNotFoundException("Organization not found")

    return TenantContext(org=org, user=current_user, role=membership.org_role)
```

### Anti-Oracle Leakage Rule
When a user attempts to access an object belonging to another organization (e.g. `GET /plans/{plan_id}` where `plan.organization_id != caller_org_id`):
The API must return `404 Not Found` (`PLAN_NOT_FOUND`).
It must **never** return `403 Forbidden` if doing so reveals the object ID actually exists in another tenant.

---

## 3. Authorization Matrix (RBAC)

| Resource / Action | Member | Team Lead | Org Admin | Org Owner | Staff (`is_admin`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Org Settings & Rename** | ❌ (403) | ❌ (403) | ✅ | ✅ | ❌ (/app), ✅ (/internal) |
| **Manage Members & Roles** | ❌ (403) | ❌ (403) | ✅ | ✅ | ❌ (/app), ✅ (/internal) |
| **Generate Invite Links** | ❌ (403) | ❌ (403) | ✅ | ✅ | ❌ |
| **Create / Manage Teams** | ❌ (403) | ❌ (403) | ✅ | ✅ | ❌ |
| **View Team Plans** | 👁️ Own team | ✅ Full team | ✅ Full team | ✅ Full team | ❌ (Staff cannot see text) |
| **Create / Edit Own Plan** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Submit Plan** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Approve / Send Back Plan** | ❌ (403) | ✅ (Assigned Lead) | ✅ | ✅ | ❌ |
| **Tick Task Done / Shipped** | ✅ (Own) | ✅ (Own) | ✅ (Own) | ✅ (Own) | ❌ |
| **Trigger AI Review / Dump** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Suspend / Reinstate Org** | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ✅ (/internal only) |
| **View AI Telemetry & Usage**| ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ✅ (/internal only) |

---

## 4. Cross-Tenant Attack Test Suite

The following comprehensive tests will be implemented in `tests/api/app/test_tenancy.py`:

1. **`test_cross_org_plan_read_returns_404`**: User in Org A attempts to fetch Plan from Org B using known UUID. Expect `404`.
2. **`test_cross_org_plan_update_returns_404`**: User in Org A attempts to update Task/Plan in Org B. Expect `404`.
3. **`test_member_cannot_create_team`**: Regular member tries `POST /orgs/{id}/teams`. Expect `403 FORBIDDEN`.
4. **`test_non_lead_cannot_approve_plan`**: Member of team tries `POST /plans/{id}/approve`. Expect `403 FORBIDDEN`.
5. **`test_lead_of_different_team_cannot_approve`**: Lead of Team 1 tries to approve plan belonging to Team 2. Expect `403 FORBIDDEN`.
6. **`test_suspended_org_locks_out_member`**: Organization is suspended by staff (`is_suspended=True`). Member attempts any read/write. Expect `403 FORBIDDEN` (`ORGANIZATION_SUSPENDED`).
7. **`test_customer_owner_cannot_access_internal_surface`**: Org Owner attempts `GET /internal/organizations`. Expect `403 FORBIDDEN` / `401 UNAUTHORIZED`.
8. **`test_invite_tampering`**: Member attempts to use invite link created for Org B while authenticated in Org A. Ensures membership joins correct target org only.
