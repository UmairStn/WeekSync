import uuid

from fastapi import APIRouter, Query, status

from app.api.internal.access import CurrentInternalUser
from app.api.internal.schemas import (
    InternalUserResponse,
    UserChangePasswordRequest,
    UserCreateRequest,
    UsersListResponse,
    UserUpdateRequest,
)
from app.database import DBSession
from app.services.users import UserService

router = APIRouter()


@router.get("/users/self", tags=["users"])
async def get_current_internal_user(
    current_user: CurrentInternalUser,
    session: DBSession,
) -> InternalUserResponse:
    orgs_map = await UserService(session).get_user_organizations_map([current_user.id])
    user_dict = {
        "id": current_user.id,
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "is_admin": current_user.is_admin,
        "is_active": current_user.is_active,
        "organizations": [
            {
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "org_role": role,
                "is_suspended": org.is_suspended,
            }
            for org, role in orgs_map.get(current_user.id, [])
        ],
    }
    return InternalUserResponse.model_validate(user_dict)


@router.get("/users", tags=["users"])
async def user_list(
    current_user: CurrentInternalUser,
    session: DBSession,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str | None = Query(None, description="Search by name or email"),
) -> UsersListResponse:
    user_service = UserService(session)
    users, total = await user_service.list_users(
        limit=limit, offset=offset, search=search
    )
    user_ids = [u.id for u in users]
    orgs_map = await user_service.get_user_organizations_map(user_ids)

    items = []
    for u in users:
        u_dict = {
            "id": u.id,
            "created_at": u.created_at,
            "updated_at": u.updated_at,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "is_admin": u.is_admin,
            "is_active": u.is_active,
            "organizations": [
                {
                    "id": org.id,
                    "name": org.name,
                    "slug": org.slug,
                    "org_role": role,
                    "is_suspended": org.is_suspended,
                }
                for org, role in orgs_map.get(u.id, [])
            ],
        }
        items.append(InternalUserResponse.model_validate(u_dict))

    return UsersListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )



@router.post("/users", status_code=status.HTTP_201_CREATED, tags=["users"])
async def user_create(
    current_user: CurrentInternalUser,
    session: DBSession,
    data: UserCreateRequest,
) -> InternalUserResponse:
    user = await UserService(session).create_user(**data.model_dump())
    await session.commit()
    return InternalUserResponse.model_validate(user)


@router.patch("/users/{user_id}", tags=["users"])
async def user_update(
    current_user: CurrentInternalUser,
    session: DBSession,
    user_id: uuid.UUID,
    data: UserUpdateRequest,
) -> InternalUserResponse:
    user = await UserService(session).update_user(
        user_id, data.model_dump(exclude_unset=True)
    )
    await session.commit()
    orgs_map = await UserService(session).get_user_organizations_map([user.id])
    u_dict = {
        "id": user.id,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "is_admin": user.is_admin,
        "is_active": user.is_active,
        "organizations": [
            {
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "org_role": role,
                "is_suspended": org.is_suspended,
            }
            for org, role in orgs_map.get(user.id, [])
        ],
    }
    return InternalUserResponse.model_validate(u_dict)



@router.post(
    "/users/{user_id}/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["users"],
)
async def user_change_password(
    current_user: CurrentInternalUser,
    session: DBSession,
    user_id: uuid.UUID,
    data: UserChangePasswordRequest,
) -> None:
    await UserService(session).change_password(user_id, data.password)
    await session.commit()


@router.delete(
    "/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["users"]
)
async def user_delete(
    current_user: CurrentInternalUser,
    session: DBSession,
    user_id: uuid.UUID,
) -> None:
    await UserService(session).delete_user(user_id)
    await session.commit()


@router.post(
    "/users/{user_id}/deactivate",
    response_model=InternalUserResponse,
    tags=["users"],
)
async def user_deactivate(
    current_user: CurrentInternalUser,
    session: DBSession,
    user_id: uuid.UUID,
) -> InternalUserResponse:
    """Deactivate user account."""
    user = await UserService(session).deactivate_user(user_id)
    await session.commit()
    orgs_map = await UserService(session).get_user_organizations_map([user.id])
    u_dict = {
        "id": user.id,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "is_admin": user.is_admin,
        "is_active": user.is_active,
        "organizations": [
            {
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "org_role": role,
                "is_suspended": org.is_suspended,
            }
            for org, role in orgs_map.get(user.id, [])
        ],
    }
    return InternalUserResponse.model_validate(u_dict)


@router.post(
    "/users/{user_id}/reactivate",
    response_model=InternalUserResponse,
    tags=["users"],
)
async def user_reactivate(
    current_user: CurrentInternalUser,
    session: DBSession,
    user_id: uuid.UUID,
) -> InternalUserResponse:
    """Reactivate user account."""
    user = await UserService(session).reactivate_user(user_id)
    await session.commit()
    orgs_map = await UserService(session).get_user_organizations_map([user.id])
    u_dict = {
        "id": user.id,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "is_admin": user.is_admin,
        "is_active": user.is_active,
        "organizations": [
            {
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "org_role": role,
                "is_suspended": org.is_suspended,
            }
            for org, role in orgs_map.get(user.id, [])
        ],
    }
    return InternalUserResponse.model_validate(u_dict)

