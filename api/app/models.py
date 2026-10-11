from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    types,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class IdMixin:
    # Mixin columns sort after the model's own columns by default; keep the
    # primary key first in generated migrations.
    id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid, primary_key=True, default=uuid.uuid4, sort_order=-1
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=_utcnow, nullable=True
    )


class User(IdMixin, TimestampMixin, Base):
    __tablename__ = "users"

    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True)
    password: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class Organization(IdMixin, TimestampMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True
    )
    is_suspended: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True
    )

    memberships: Mapped[list[Membership]] = relationship(
        "Membership", back_populates="organization", cascade="all, delete-orphan"
    )
    teams: Mapped[list[Team]] = relationship(
        "Team", back_populates="organization", cascade="all, delete-orphan"
    )
    plans: Mapped[list[Plan]] = relationship(
        "Plan", back_populates="organization", cascade="all, delete-orphan"
    )
    invites: Mapped[list[Invite]] = relationship(
        "Invite", back_populates="organization", cascade="all, delete-orphan"
    )


class Membership(IdMixin, TimestampMixin, Base):
    __tablename__ = "memberships"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    org_role: Mapped[str] = mapped_column(String(20), nullable=False, default="member")

    organization: Mapped[Organization] = relationship(
        "Organization", back_populates="memberships"
    )
    user: Mapped[User] = relationship("User")

    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_memberships_org_user"),
    )


class Team(IdMixin, TimestampMixin, Base):
    __tablename__ = "teams"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    lead_user_id: Mapped[uuid.UUID | None] = mapped_column(
        types.Uuid,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    organization: Mapped[Organization] = relationship(
        "Organization", back_populates="teams"
    )
    lead_user: Mapped[User | None] = relationship("User", foreign_keys=[lead_user_id])
    members: Mapped[list[TeamMember]] = relationship(
        "TeamMember", back_populates="team", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_teams_org_name"),
    )


class TeamMember(IdMixin, TimestampMixin, Base):
    __tablename__ = "team_members"

    team_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid,
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    team: Mapped[Team] = relationship("Team", back_populates="members")
    user: Mapped[User] = relationship("User")

    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_members_team_user"),
    )


class Invite(IdMixin, TimestampMixin, Base):
    __tablename__ = "invites"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="member")
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    is_revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    organization: Mapped[Organization] = relationship(
        "Organization", back_populates="invites"
    )
    created_by: Mapped[User] = relationship("User")


class Plan(IdMixin, TimestampMixin, Base):
    __tablename__ = "plans"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid,
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    week_start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    review_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        types.Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    main_task_shipped: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    organization: Mapped[Organization] = relationship(
        "Organization", back_populates="plans"
    )
    team: Mapped[Team] = relationship("Team")
    user: Mapped[User] = relationship("User", foreign_keys=[user_id])
    reviewed_by: Mapped[User | None] = relationship(
        "User", foreign_keys=[reviewed_by_user_id]
    )
    tasks: Mapped[list[Task]] = relationship(
        "Task",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="Task.sort_order",
    )

    __table_args__ = (
        UniqueConstraint("user_id", "week_start_date", name="uq_plans_user_week"),
    )


class Task(IdMixin, TimestampMixin, Base):
    __tablename__ = "tasks"

    plan_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid,
        ForeignKey("plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    why_it_matters: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    plan: Mapped[Plan] = relationship("Plan", back_populates="tasks")


class AICallLog(IdMixin, TimestampMixin, Base):
    __tablename__ = "ai_call_logs"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        types.Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    feature: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    organization: Mapped[Organization] = relationship("Organization")
    user: Mapped[User] = relationship("User")
