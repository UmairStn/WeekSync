from datetime import date, datetime, timezone
import uuid
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.app.schemas import TaskCreateRequest
from app.exceptions import (
    APIException,
    ConflictException,
    ResourceNotFoundException,
    ValidationException,
)
from app.models import Membership, Plan, Task, Team, TeamMember, User


class PlanService:
    """Business logic for Monday-keyed plans, tasks, approvals, and team weekly rollups."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_plan(self, *, org_id: uuid.UUID, plan_id: uuid.UUID) -> Plan:
        """Fetch plan ensuring organization tenancy (Anti-Oracle 404)."""
        stmt = (
            select(Plan)
            .options(
                selectinload(Plan.tasks),
                selectinload(Plan.user),
            )
            .execution_options(populate_existing=True)
            .where(Plan.id == plan_id, Plan.organization_id == org_id)
        )
        plan = await self.session.scalar(stmt)
        if not plan:
            raise ResourceNotFoundException("Plan not found")
        return plan

    async def create_or_update_plan(
        self,
        *,
        org_id: uuid.UUID,
        team_id: uuid.UUID,
        user_id: uuid.UUID,
        week_start_date: date,
        tasks_data: list[TaskCreateRequest],
    ) -> Plan:
        """Create or update a weekly plan.
        
        Enforces:
        1. week_start_date must be a Monday (weekday == 0).
        2. Exactly 1 main task with a title and 'why_it_matters'.
        3. User must be an org member.
        4. Team must belong to the org.
        """
        # Validate Monday
        if week_start_date.weekday() != 0:
            raise ValidationException("week_start_date must be a Monday")

        # Validate team in org
        team = await self.session.scalar(
            select(Team).where(Team.id == team_id, Team.organization_id == org_id)
        )
        if not team:
            raise ResourceNotFoundException("Team not found")

        # Validate tasks composition: exactly 1 main task
        main_tasks = [t for t in tasks_data if t.category == "main"]
        if len(main_tasks) != 1:
            raise ValidationException("A plan must contain exactly one main task")

        main_task = main_tasks[0]
        if not main_task.why_it_matters or not main_task.why_it_matters.strip():
            raise ValidationException("The main task must explain why it matters")

        # Look up existing plan for (user, week)
        existing = await self.session.scalar(
            select(Plan)
            .options(selectinload(Plan.tasks))
            .where(Plan.user_id == user_id, Plan.week_start_date == week_start_date)
        )

        if existing:
            if existing.organization_id != org_id:
                raise ConflictException("A plan already exists for this week in another organization")
            if existing.status not in ("draft", "submitted"):
                raise ConflictException("Cannot edit an already approved or completed plan")

            plan = existing
            plan.team_id = team_id
            await self.session.execute(delete(Task).where(Task.plan_id == plan.id))
        else:
            plan = Plan(
                organization_id=org_id,
                team_id=team_id,
                user_id=user_id,
                week_start_date=week_start_date,
                status="draft",
            )
            self.session.add(plan)
            await self.session.flush()

        # Insert new tasks
        for idx, t_data in enumerate(tasks_data):
            task = Task(
                plan_id=plan.id,
                category=t_data.category,
                title=t_data.title.strip(),
                why_it_matters=t_data.why_it_matters.strip() if t_data.why_it_matters else None,
                is_completed=False,
                sort_order=t_data.sort_order or idx,
            )
            self.session.add(task)

        await self.session.flush()
        return await self.get_plan(org_id=org_id, plan_id=plan.id)

    async def get_user_plan_for_week(
        self,
        *,
        org_id: uuid.UUID,
        user_id: uuid.UUID,
        week_start_date: date,
    ) -> Plan | None:
        """Fetch user's plan for a specific Monday week in an organization."""
        stmt = (
            select(Plan)
            .options(
                selectinload(Plan.tasks),
                selectinload(Plan.user),
            )
            .execution_options(populate_existing=True)
            .where(
                Plan.organization_id == org_id,
                Plan.user_id == user_id,
                Plan.week_start_date == week_start_date,
            )
        )
        return await self.session.scalar(stmt)

    async def submit_plan(
        self,
        *,
        org_id: uuid.UUID,
        plan_id: uuid.UUID,
        user_id: uuid.UUID,
        caller_role: str,
    ) -> Plan:
        """Transition plan from draft to submitted."""
        plan = await self.get_plan(org_id=org_id, plan_id=plan_id)

        # Only plan owner or org admin/owner can submit
        if plan.user_id != user_id and caller_role not in ("owner", "admin"):
            raise APIException(
                status_code=403,
                code="INSUFFICIENT_PERMISSIONS",
                message="You can only submit your own plan",
            )

        if plan.status != "draft":
            raise ConflictException(f"Only draft plans can be submitted (current status: {plan.status})")

        plan.status = "submitted"
        await self.session.flush()
        return plan

    async def check_is_lead_or_admin(
        self,
        *,
        org_id: uuid.UUID,
        team_id: uuid.UUID,
        user_id: uuid.UUID,
        caller_role: str,
    ) -> bool:
        """Verify whether the user is team lead of the specified team or org admin/owner."""
        if caller_role in ("owner", "admin"):
            return True

        team = await self.session.scalar(
            select(Team).where(Team.id == team_id, Team.organization_id == org_id)
        )
        if team and team.lead_user_id == user_id:
            return True

        return False

    async def approve_plan(
        self,
        *,
        org_id: uuid.UUID,
        plan_id: uuid.UUID,
        reviewer_user_id: uuid.UUID,
        caller_role: str,
    ) -> Plan:
        """Approve a submitted plan. Only team lead or org admin allowed."""
        plan = await self.get_plan(org_id=org_id, plan_id=plan_id)

        # Enforce lead/admin requirement
        is_lead = await self.check_is_lead_or_admin(
            org_id=org_id,
            team_id=plan.team_id,
            user_id=reviewer_user_id,
            caller_role=caller_role,
        )
        if not is_lead:
            raise APIException(
                status_code=403,
                code="INSUFFICIENT_PERMISSIONS",
                message="Only the team lead or org admin can approve plans",
            )

        if plan.status != "submitted":
            raise ConflictException(f"Cannot approve plan with status '{plan.status}' (must be 'submitted')")

        plan.status = "approved"
        plan.reviewed_by_user_id = reviewer_user_id
        plan.reviewed_at = datetime.now(timezone.utc)
        plan.review_comment = None  # Clear previous rejection comment if any
        await self.session.flush()
        return plan

    async def send_back_plan(
        self,
        *,
        org_id: uuid.UUID,
        plan_id: uuid.UUID,
        reviewer_user_id: uuid.UUID,
        caller_role: str,
        comment: str,
    ) -> Plan:
        """Send back a plan with feedback comments. Only team lead or org admin allowed."""
        plan = await self.get_plan(org_id=org_id, plan_id=plan_id)

        # Enforce lead/admin requirement
        is_lead = await self.check_is_lead_or_admin(
            org_id=org_id,
            team_id=plan.team_id,
            user_id=reviewer_user_id,
            caller_role=caller_role,
        )
        if not is_lead:
            raise APIException(
                status_code=403,
                code="INSUFFICIENT_PERMISSIONS",
                message="Only the team lead or org admin can send back plans",
            )

        if plan.status not in ("submitted", "approved"):
            raise ConflictException(f"Cannot send back plan with status '{plan.status}'")

        plan.status = "draft"
        plan.review_comment = comment.strip()
        plan.reviewed_by_user_id = reviewer_user_id
        plan.reviewed_at = datetime.now(timezone.utc)
        await self.session.flush()
        return plan

    async def update_task_completion(
        self,
        *,
        org_id: uuid.UUID,
        plan_id: uuid.UUID,
        task_id: uuid.UUID,
        user_id: uuid.UUID,
        caller_role: str,
        is_completed: bool,
    ) -> Task:
        """Toggle task completion status during the week."""
        plan = await self.get_plan(org_id=org_id, plan_id=plan_id)

        # Allow plan owner, team lead, or org admin
        is_lead = await self.check_is_lead_or_admin(
            org_id=org_id,
            team_id=plan.team_id,
            user_id=user_id,
            caller_role=caller_role,
        )
        if plan.user_id != user_id and not is_lead:
            raise APIException(
                status_code=403,
                code="INSUFFICIENT_PERMISSIONS",
                message="You do not have permission to update tasks on this plan",
            )

        task = await self.session.scalar(
            select(Task).where(Task.id == task_id, Task.plan_id == plan_id)
        )
        if not task:
            raise ResourceNotFoundException("Task not found")

        task.is_completed = is_completed
        await self.session.flush()
        return task

    async def update_plan_outcome(
        self,
        *,
        org_id: uuid.UUID,
        plan_id: uuid.UUID,
        user_id: uuid.UUID,
        caller_role: str,
        main_task_shipped: bool,
    ) -> Plan:
        """Mark whether the main goal shipped at week's end."""
        plan = await self.get_plan(org_id=org_id, plan_id=plan_id)

        is_lead = await self.check_is_lead_or_admin(
            org_id=org_id,
            team_id=plan.team_id,
            user_id=user_id,
            caller_role=caller_role,
        )
        if plan.user_id != user_id and not is_lead:
            raise APIException(
                status_code=403,
                code="INSUFFICIENT_PERMISSIONS",
                message="You do not have permission to update outcome for this plan",
            )

        plan.main_task_shipped = main_task_shipped
        if plan.status == "approved":
            plan.status = "done"

        await self.session.flush()
        return plan

    async def get_team_week_overview(
        self,
        *,
        org_id: uuid.UUID,
        team_id: uuid.UUID,
        week_start_date: date,
    ) -> dict[str, Any]:
        """Fetch all members of a team and their plan status for a given Monday week."""
        # 1. Fetch team
        team = await self.session.scalar(
            select(Team).where(Team.id == team_id, Team.organization_id == org_id)
        )
        if not team:
            raise ResourceNotFoundException("Team not found")

        # 2. Fetch team members with users
        tm_stmt = (
            select(TeamMember)
            .options(selectinload(TeamMember.user))
            .where(TeamMember.team_id == team_id)
        )
        tm_results = await self.session.execute(tm_stmt)
        team_members = tm_results.scalars().all()

        # 3. Fetch plans for this team and week
        plans_stmt = (
            select(Plan)
            .options(selectinload(Plan.tasks))
            .where(
                Plan.organization_id == org_id,
                Plan.team_id == team_id,
                Plan.week_start_date == week_start_date,
            )
        )
        plans_results = await self.session.execute(plans_stmt)
        plans_by_user = {p.user_id: p for p in plans_results.scalars().all()}

        members_status = []
        for tm in team_members:
            user = tm.user
            plan = plans_by_user.get(user.id)
            is_lead = user.id == team.lead_user_id

            if plan:
                main_task = next((t for t in plan.tasks if t.category == "main"), None)
                total_tasks = len(plan.tasks)
                completed_tasks = sum(1 for t in plan.tasks if t.is_completed)

                members_status.append({
                    "user_id": user.id,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "is_lead": is_lead,
                    "plan_id": plan.id,
                    "status": plan.status,
                    "main_task_title": main_task.title if main_task else None,
                    "main_task_why": main_task.why_it_matters if main_task else None,
                    "main_task_shipped": plan.main_task_shipped,
                    "total_tasks": total_tasks,
                    "completed_tasks": completed_tasks,
                })
            else:
                members_status.append({
                    "user_id": user.id,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "is_lead": is_lead,
                    "plan_id": None,
                    "status": None,
                    "main_task_title": None,
                    "main_task_why": None,
                    "main_task_shipped": None,
                    "total_tasks": 0,
                    "completed_tasks": 0,
                })

        return {
            "team_id": team.id,
            "team_name": team.name,
            "week_start_date": week_start_date,
            "members": members_status,
        }

    async def list_history(
        self,
        *,
        org_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
        team_id: uuid.UUID | None = None,
    ) -> list[Plan]:
        """Fetch past plans ordered chronologically descending."""
        stmt = (
            select(Plan)
            .options(
                selectinload(Plan.tasks),
                selectinload(Plan.user),
            )
            .where(Plan.organization_id == org_id)
        )
        if user_id:
            stmt = stmt.where(Plan.user_id == user_id)
        if team_id:
            stmt = stmt.where(Plan.team_id == team_id)

        stmt = stmt.order_by(Plan.week_start_date.desc(), Plan.created_at.desc())
        results = await self.session.execute(stmt)
        return list(results.scalars().all())
