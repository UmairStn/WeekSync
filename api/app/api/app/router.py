from fastapi.routing import APIRouter

from .routers import ai, meta, orgs, plans, teams, users

router = APIRouter()

router.include_router(meta.router)
router.include_router(users.router)
router.include_router(orgs.router)
router.include_router(teams.router)
router.include_router(plans.router)
router.include_router(ai.router)


