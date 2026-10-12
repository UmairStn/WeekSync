from typing import Any

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AICallLog, Organization, User


class AIUsageService:
    """Telemetry and aggregate analytics for platform staff."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_overview(
        self, *, recent_limit: int = 50
    ) -> dict[str, Any]:
        """Aggregate AI metrics across the platform."""
        total_calls = await self.session.scalar(select(func.count(AICallLog.id))) or 0
        success_calls = (
            await self.session.scalar(
                select(func.count(AICallLog.id)).where(AICallLog.status == "success")
            )
            or 0
        )
        failure_calls = (
            await self.session.scalar(
                select(func.count(AICallLog.id)).where(
                    AICallLog.status.in_(["failure", "timeout"])
                )
            )
            or 0
        )
        rate_limited_calls = (
            await self.session.scalar(
                select(func.count(AICallLog.id)).where(
                    AICallLog.status == "rate_limited"
                )
            )
            or 0
        )
        total_prompt_tokens = (
            await self.session.scalar(
                select(func.coalesce(func.sum(AICallLog.prompt_tokens), 0))
            )
            or 0
        )
        total_completion_tokens = (
            await self.session.scalar(
                select(func.coalesce(func.sum(AICallLog.completion_tokens), 0))
            )
            or 0
        )

        # Per-organization breakdown
        org_stmt = (
            select(
                Organization.id,
                Organization.name,
                Organization.slug,
                func.count(AICallLog.id).label("total_calls"),
                func.coalesce(
                    func.sum(case((AICallLog.status == "success", 1), else_=0)), 0
                ).label("success_calls"),
                func.coalesce(
                    func.sum(
                        case((AICallLog.status.in_(["failure", "timeout"]), 1), else_=0)
                    ),
                    0,
                ).label("failure_calls"),
                func.coalesce(
                    func.sum(case((AICallLog.status == "rate_limited", 1), else_=0)), 0
                ).label("rate_limited_calls"),
                func.max(AICallLog.created_at).label("last_call_at"),
            )
            .join(Organization, AICallLog.organization_id == Organization.id)
            .group_by(Organization.id, Organization.name, Organization.slug)
            .order_by(func.count(AICallLog.id).desc())
        )
        org_rows = (await self.session.execute(org_stmt)).all()

        org_summaries = []
        for row in org_rows:
            org_summaries.append(
                {
                    "organization_id": row[0],
                    "organization_name": row[1],
                    "organization_slug": row[2],
                    "total_calls": int(row[3]),
                    "success_calls": int(row[4]),
                    "failure_calls": int(row[5]),
                    "rate_limited_calls": int(row[6]),
                    "last_call_at": row[7],
                }
            )

        # Recent logs
        logs_stmt = (
            select(AICallLog, Organization.name, User.email)
            .outerjoin(Organization, AICallLog.organization_id == Organization.id)
            .outerjoin(User, AICallLog.user_id == User.id)
            .order_by(AICallLog.created_at.desc())
            .limit(recent_limit)
        )
        log_rows = (await self.session.execute(logs_stmt)).all()

        recent_logs = []
        for log_entry, org_name, user_email in log_rows:
            recent_logs.append(
                {
                    "id": log_entry.id,
                    "organization_id": log_entry.organization_id,
                    "organization_name": org_name,
                    "user_id": log_entry.user_id,
                    "user_email": user_email,
                    "feature": log_entry.feature,
                    "status": log_entry.status,
                    "prompt_tokens": log_entry.prompt_tokens,
                    "completion_tokens": log_entry.completion_tokens,
                    "latency_ms": log_entry.latency_ms,
                    "error_message": log_entry.error_message,
                    "created_at": log_entry.created_at,
                }
            )

        return {
            "total_calls": int(total_calls),
            "success_calls": int(success_calls),
            "failure_calls": int(failure_calls),
            "rate_limited_calls": int(rate_limited_calls),
            "total_prompt_tokens": int(total_prompt_tokens),
            "total_completion_tokens": int(total_completion_tokens),
            "org_summaries": org_summaries,
            "recent_logs": recent_logs,
        }
