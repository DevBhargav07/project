from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from typing_extensions import Annotated
from datetime import timedelta
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_session
from app.models import User, Group
from app.schemas import UserOut, ProfileResponse, GroupOut, UpdateUserGroups

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

session_dependency = Annotated[AsyncSession, Depends(get_async_session)]


############################# Permissions Required Classes #######################################
from app.auth.permissions import IsActive, IsAuthenticated, IsSuperuser, require_permissions, require_permission_

@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    session: session_dependency,
    current_user: User = Depends(IsAuthenticated()),
):
    stmt = (
        select(User)
        .options(selectinload(User.groups).selectinload(Group.permissions))
        .where(User.id == current_user.id)
    )
    user = await session.scalar(stmt)
    groups = [g.name for g in user.groups]
    permissions = sorted({p.codename for g in user.groups for p in g.permissions})

    return {
        "username": user.username,
        "email": user.email,
        "created_at": user.created_at,
        "is_superuser": user.is_superuser,
        "groups": groups,
        "permissions": permissions,
    }

@router.get("/", response_model=List[UserOut])
async def get_users(session: session_dependency, _: User = Depends(IsAuthenticated())):
    result = await session.scalars(select(User).offset(0).limit(100))
    return result.all()

# @router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
# async def delete_user(
#     user_id: int,
#     session: session_dependency,
#     current_user: User = Depends(require_permission_("delete_users"))
# ):
#     user_to_delete = await session.get(User, user_id)
#     if not user_to_delete:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

#     if user_to_delete.id == current_user.id:
#         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account")

#     await session.delete(user_to_delete)
#     await session.commit()
#     return None

@router.get("/groups", response_model=List[GroupOut])
async def list_groups(
    session: session_dependency,
    _=Depends(require_permission_("change_users")),
):
    result = await session.scalars(select(Group))
    return result.all()

@router.put("/{user_id}/groups", response_model=UserOut)
async def update_user_groups(
    user_id: int,
    payload: UpdateUserGroups,
    session: session_dependency,
    _=Depends(require_permission_("change_users")),
):
    stmt = (
        select(User)
        .options(selectinload(User.groups))
        .where(User.id == user_id)
    )

    user = await session.scalar(stmt)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    new_groups_stmt = select(Group).where(Group.id.in_(payload.group_ids))
    new_groups = (await session.scalars(new_groups_stmt)).all()

    user.groups = list(new_groups)
    await session.commit()
    await session.refresh(user)

    return user