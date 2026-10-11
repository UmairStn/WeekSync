from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any

from fastapi import status
from pydantic_ai import Agent
from pydantic_ai.models import Model as PydanticAIModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.app.schemas import (
    BrainDumpRequest,
    BrainDumpResult,
    PlanReviewRequest,
    PlanReviewResult,
)
from app.config import settings
from app.exceptions import APIException
from app.logging import logger
from app.models import AICallLog

PLAN_REVIEW_SYSTEM_PROMPT = """You are an exacting, high-agency engineering lead reviewing a weekly commitment for a high-velocity startup.
Your standards:
1. Every task must describe a checkable outcome that can be verified on staging or in production (e.g., 'Checkout handles expired cards, confirmed on staging'), NEVER vague activity ('Implement checkout', 'Work on auth', 'Research database').
2. The main task must articulate why it matters to customers or company metrics. If 'why_it_matters' is empty, missing, or trivial, flag it as MISSING_IMPACT.
3. Every engineering initiative must include at least one go-to-market task (analytics events, changelog entry, user docs, feature flag). If no GTM task is present, flag it as MISSING_GTM.
4. Scope: A 5-day cycle cannot realistically deliver 10 unrelated epics. If scope is unrealistically broad, flag as UNREALISTIC_SCOPE.
5. Never wave through generic or vague tasks. For EVERY critique, provide an exact suggested rewrite describing the verifiable result.
6. If the plan has blocking vague tasks, lacks impact, or lacks release safety, set ready_to_submit=False. Only set ready_to_submit=True if every task has a checkable outcome and impact is clear.
"""

BRAIN_DUMP_SYSTEM_PROMPT = """You are an expert product and engineering planner. You transform unstructured notes, bullet points, or stream-of-consciousness text into a structured, high-agency weekly plan.
Your standards:
1. Extract the single primary shippable deliverable of the week as the 'main_task'. It MUST have an actionable title describing a checkable outcome, and a clear 'why_it_matters' explanation stating business or customer impact.
2. Produce 1 to 5 'sub_goals' representing tactical, verifiable milestones delivering the main initiative.
3. Produce 1 to 4 'gtm_goals' representing operational release enablement (e.g., analytics telemetry, documentation, feature flag rollout, customer changelog). If the input notes do not mention GTM, infer plausible operational release hygiene.
4. Refuse generic activity titles like 'Work on feature' or 'Code'. Use checkable outcomes like 'Stripe webhook verifies signature and updates plan in DB'.
"""


TEST_OVERRIDE_MODEL: PydanticAIModel | str | None = None


def get_agent(
    system_prompt: str,
    output_type: Any,
    override_model: PydanticAIModel | str | None = None,
) -> Agent[None, Any]:
    """Construct a typed Pydantic AI agent.

    If override_model is provided (e.g. TestModel or FunctionModel in tests), it is used directly.
    Otherwise, uses the configured Gemini model using settings.GOOGLE_API_KEY.
    """
    active_override = override_model if override_model is not None else TEST_OVERRIDE_MODEL
    if active_override is not None:
        return Agent(
            model=active_override,
            system_prompt=system_prompt,
            output_type=output_type,
        )

    if not settings.GOOGLE_API_KEY or not settings.GOOGLE_API_KEY.strip():
        raise APIException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="AI_NOT_CONFIGURED",
            message="AI assistant is not configured (missing GOOGLE_API_KEY). Planning works normally without it.",
        )

    # Use Google provider configured with settings
    try:
        from pydantic_ai.providers.google import GoogleProvider

        provider = GoogleProvider(api_key=settings.GOOGLE_API_KEY)
        model_name = settings.AI_MODEL
        if ":" in model_name:
            model_name = model_name.split(":", 1)[1]
        model = provider(model_name)
    except (ImportError, AttributeError, ValueError) as exc:
        logger.warning(
            f"Error configuring Google provider, falling back to model string: {exc}"
        )
        model = settings.AI_MODEL

    return Agent(
        model=model,
        system_prompt=system_prompt,
        output_type=output_type,
    )


async def log_ai_call(
    session: AsyncSession,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    feature: str,
    status: str,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
    latency_ms: int | None = None,
    error_message: str | None = None,
) -> AICallLog:
    """Record an audit entry in ai_call_logs for tenant telemetry."""
    log_entry = AICallLog(
        organization_id=organization_id,
        user_id=user_id,
        feature=feature,
        status=status,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        latency_ms=latency_ms,
        error_message=error_message,
    )
    session.add(log_entry)
    await session.commit()
    return log_entry


def _format_plan_for_review(request: PlanReviewRequest, user_name: str | None = None) -> str:
    """Transform the plan request into a readable markdown prompt for the agent."""
    lines = [
        f"Week Commencing: {request.week_start_date or 'Current Week'}",
        f"Member: {user_name or 'Team Member'}",
        "",
    ]

    main_tasks = [t for t in request.tasks if t.category == "main"]
    sub_goals = [t for t in request.tasks if t.category == "sub_goal"]
    gtm_goals = [t for t in request.tasks if t.category == "gtm"]

    lines.append("[MAIN TASK]")
    if main_tasks:
        for t in main_tasks:
            lines.append(f"Task ID: {t.id or 'none'}")
            lines.append(f"Title: {t.title}")
            lines.append(f"Why it matters: {t.why_it_matters or '(Not provided)'}")
    else:
        lines.append("(No main task specified)")
    lines.append("")

    lines.append("[SUB-GOALS]")
    if sub_goals:
        for t in sub_goals:
            lines.append(f"- Task ID: {t.id or 'none'} | {t.title}")
    else:
        lines.append("(No sub-goals specified)")
    lines.append("")

    lines.append("[GO-TO-MARKET GOALS]")
    if gtm_goals:
        for t in gtm_goals:
            lines.append(f"- Task ID: {t.id or 'none'} | {t.title}")
    else:
        lines.append("(No go-to-market goals specified)")

    return "\n".join(lines)


async def review_plan(
    session: AsyncSession,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    request: PlanReviewRequest,
    user_name: str | None = None,
    override_model: PydanticAIModel | str | None = None,
) -> PlanReviewResult:
    """Run Plan Review Agent ("Approval Meeting in a Box")."""
    feature = "plan_review"
    start_time = time.monotonic()
    prompt = _format_plan_for_review(request, user_name=user_name)

    agent = get_agent(
        system_prompt=PLAN_REVIEW_SYSTEM_PROMPT,
        output_type=PlanReviewResult,
        override_model=override_model,
    )

    try:
        async with asyncio.timeout(15.0):
            result = await agent.run(prompt)
            latency_ms = int((time.monotonic() - start_time) * 1000)

            # Extract token usage if available
            prompt_tokens = None
            completion_tokens = None
            usage = getattr(result, "usage", None)
            if callable(usage):
                try:
                    usage = usage()
                except TypeError:
                    usage = None
            if usage is not None:
                prompt_tokens = getattr(usage, "request_tokens", None) or getattr(
                    usage, "prompt_tokens", None
                )
                completion_tokens = getattr(
                    usage, "response_tokens", None
                ) or getattr(usage, "completion_tokens", None)

            await log_ai_call(
                session=session,
                organization_id=organization_id,
                user_id=user_id,
                feature=feature,
                status="success",
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                latency_ms=latency_ms,
            )
            # Ensure verdict and problem are consistently populated for brief compatibility
            if result.output.ready_to_submit:
                result.output.verdict = "approve"
            else:
                result.output.verdict = "adjust"

            for finding in result.output.findings:
                if not finding.problem:
                    finding.problem = finding.critique

            return result.output

    except TimeoutError:
        latency_ms = int((time.monotonic() - start_time) * 1000)
        await log_ai_call(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            feature=feature,
            status="timeout",
            latency_ms=latency_ms,
            error_message="Plan review timed out after 15 seconds",
        )
        raise APIException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            code="AI_TIMEOUT",
            message="AI review timed out. You can still edit and submit your plan manually.",
        )
    except APIException:
        raise
    except Exception as exc:
        latency_ms = int((time.monotonic() - start_time) * 1000)
        err_str = str(exc)
        is_429 = "429" in err_str or "ResourceExhausted" in err_str or "quota" in err_str.lower()
        log_status = "rate_limited" if is_429 else "failure"

        await log_ai_call(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            feature=feature,
            status=log_status,
            latency_ms=latency_ms,
            error_message=err_str[:500],
        )

        if is_429:
            raise APIException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                code="AI_RATE_LIMITED",
                message="AI request limit reached. Please wait a moment or proceed manually.",
            )

        logger.exception("AI plan review failure")
        raise APIException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="AI_SERVICE_ERROR",
            message="AI assistant is currently unavailable. Planning works normally without it.",
        )


async def draft_plan_from_brain_dump(
    session: AsyncSession,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    request: BrainDumpRequest,
    override_model: PydanticAIModel | str | None = None,
) -> BrainDumpResult:
    """Run Brain Dump Agent ("Draft from Notes")."""
    feature = "brain_dump"
    start_time = time.monotonic()
    prompt = f"Please synthesize the following scratch notes into a high-agency weekly plan:\n\n{request.notes}"

    agent = get_agent(
        system_prompt=BRAIN_DUMP_SYSTEM_PROMPT,
        output_type=BrainDumpResult,
        override_model=override_model,
    )

    try:
        async with asyncio.timeout(15.0):
            result = await agent.run(prompt)
            latency_ms = int((time.monotonic() - start_time) * 1000)

            prompt_tokens = None
            completion_tokens = None
            usage = getattr(result, "usage", None)
            if callable(usage):
                try:
                    usage = usage()
                except TypeError:
                    usage = None
            if usage is not None:
                prompt_tokens = getattr(usage, "request_tokens", None) or getattr(
                    usage, "prompt_tokens", None
                )
                completion_tokens = getattr(
                    usage, "response_tokens", None
                ) or getattr(usage, "completion_tokens", None)

            await log_ai_call(
                session=session,
                organization_id=organization_id,
                user_id=user_id,
                feature=feature,
                status="success",
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                latency_ms=latency_ms,
            )
            return result.output

    except TimeoutError:
        latency_ms = int((time.monotonic() - start_time) * 1000)
        await log_ai_call(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            feature=feature,
            status="timeout",
            latency_ms=latency_ms,
            error_message="Brain dump drafting timed out after 15 seconds",
        )
        raise APIException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            code="AI_TIMEOUT",
            message="AI assistant timed out. You can still create your plan manually.",
        )
    except APIException:
        raise
    except Exception as exc:
        latency_ms = int((time.monotonic() - start_time) * 1000)
        err_str = str(exc)
        is_429 = "429" in err_str or "ResourceExhausted" in err_str or "quota" in err_str.lower()
        log_status = "rate_limited" if is_429 else "failure"

        await log_ai_call(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            feature=feature,
            status=log_status,
            latency_ms=latency_ms,
            error_message=err_str[:500],
        )

        if is_429:
            raise APIException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                code="AI_RATE_LIMITED",
                message="AI request limit reached. Please wait a moment or proceed manually.",
            )

        logger.exception("AI brain dump failure")
        raise APIException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="AI_SERVICE_ERROR",
            message="AI assistant is currently unavailable. Planning works normally without it.",
        )
