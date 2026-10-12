import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import ConflictException, ResourceNotFoundException
from app.models import Membership, Organization, User
from app.security import hash_password


class UserService:
    """Business logic for user records.

    Holds the DB session so callers pass it once and then issue user operations
    without threading the session through every call.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_users(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        search: str | None = None,
    ) -> tuple[Sequence[User], int]:
        """Return a page of users, newest first, with optional search filtering."""
        base_query = select(User)
        count_query = select(func.count()).select_from(User)

        if search:
            pattern = f"%{search.strip().lower()}%"
            cond = or_(
                func.lower(User.email).like(pattern),
                func.lower(User.first_name).like(pattern),
                func.lower(User.last_name).like(pattern),
            )
            base_query = base_query.where(cond)
            count_query = count_query.where(cond)

        total = await self.session.scalar(count_query)

        result = await self.session.execute(
            base_query.order_by(User.created_at.desc()).limit(limit).offset(offset)
        )
        return result.scalars().all(), total or 0


    async def get_user(self, user_id: uuid.UUID) -> User:
        """Return a single user or raise 404."""
        result = await self.session.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if user is None:
            raise ResourceNotFoundException("User not found")
        return user

    async def create_user(
        self,
        *,
        first_name: str,
        last_name: str,
        email: str,
        password: str | None = None,
        is_admin: bool = False,
        is_active: bool = True,
    ) -> User:
        """Create a user, rejecting a duplicate email with 409."""
        email = email.lower()
        await self._ensure_email_available(email)

        user = User(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password=hash_password(password) if password else None,
            is_admin=is_admin,
            is_active=is_active,
        )
        self.session.add(user)
        await self.session.flush()
        return user

    async def update_user(self, user_id: uuid.UUID, changes: dict[str, Any]) -> User:
        """Apply a partial (PATCH) update to a user.

        Only keys present in `changes` are touched. A null for any column is
        treated as "leave unchanged" so a non-nullable field is never blanked.
        Password is intentionally not updatable here — use `change_password`.
        """
        changes.pop("password", None)
        user = await self.get_user(user_id)

        if changes.get("email") is not None:
            email = changes["email"].lower()
            changes["email"] = email
            if email != user.email:
                await self._ensure_email_available(email, exclude_id=user.id)

        for field, value in changes.items():
            if value is not None:
                setattr(user, field, value)

        await self.session.flush()
        return user

    async def change_password(self, user_id: uuid.UUID, password: str) -> User:
        """Set a user's password (admin action, no current-password check)."""
        user = await self.get_user(user_id)
        user.password = hash_password(password)
        await self.session.flush()
        return user

    async def delete_user(self, user_id: uuid.UUID) -> None:
        """Hard-delete a user (row removed)."""
        user = await self.get_user(user_id)
        await self.session.delete(user)
        await self.session.flush()

    async def _ensure_email_available(
        self, email: str, *, exclude_id: uuid.UUID | None = None
    ) -> None:
        stmt = select(User.id).where(User.email == email)
        if exclude_id is not None:
            stmt = stmt.where(User.id != exclude_id)
        if await self.session.scalar(stmt) is not None:
            raise ConflictException(
                f"User with email '{email}' already exists.", field="email"
            )

    async def get_user_organizations_map(
        self, user_ids: Sequence[uuid.UUID]
    ) -> dict[uuid.UUID, list[tuple[Organization, str]]]:
        """Fetch organizations for a list of user IDs in a single batch query."""
        if not user_ids:
            return {}
        stmt = (
            select(Membership.user_id, Organization, Membership.org_role)
            .join(Organization, Membership.organization_id == Organization.id)
            .where(Membership.user_id.in_(user_ids))
            .order_by(Organization.name)
        )
        result = await self.session.execute(stmt)
        mapping: dict[uuid.UUID, list[tuple[Organization, str]]] = {
            uid: [] for uid in user_ids
        }
        for uid, org, role in result.all():
            if uid in mapping:
                mapping[uid].append((org, role))
        return mapping

    async def deactivate_user(self, user_id: uuid.UUID) -> User:
        """Deactivate a user account."""
        user = await self.get_user(user_id)
        user.is_active = False
        await self.session.flush()
        return user

    async def reactivate_user(self, user_id: uuid.UUID) -> User:
        """Reactivate a user account."""
        user = await self.get_user(user_id)
        user.is_active = True
        await self.session.flush()
        return user

