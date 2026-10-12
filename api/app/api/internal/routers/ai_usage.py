from fastapi import APIRouter, Query

from app.api.internal.access import CurrentInternalUser
from app.api.internal.schemas import AIUsageOverviewResponse
from app.database import DBSession
from app.services.ai_usage import AIUsageService

router = APIRouter(tags=["ai_usage"])


@router.get("/ai-usage", response_model=AIUsageOverviewResponse)
async def get_ai_usage_overview(
    current_user: CurrentInternalUser,
    session: DBSession,
    recent_limit: int = Query(50, ge=1, le=100),
) -> AIUsageOverviewResponse:
    """Get AI telemetry overview, per-organization breakdowns, and recent call logs."""
    service = AIUsageService(session)
    data = await service.get_overview(recent_limit=recent_limit)
    return AIUsageOverviewResponse.model_validate(data)
