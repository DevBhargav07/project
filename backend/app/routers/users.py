from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from typing_extensions import Annotated
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_session
from app.models import User, Group, Permission
from app.schemas import (UserOut, ProfileResponse, GroupOut, UpdateUserGroups, UserDetailOut, PermissionOut, CreatePermission, GroupDetailOut, CreateGroup)
from app.auth.permissions import IsActive, IsAuthenticated, IsSuperuser, require_permissions, require_permission_

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

session_dependency = Annotated[AsyncSession, Depends(get_async_session)]


############################# Permissions Required Classes #######################################

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

#-------------------------- Groups ------------------------------------------------
@router.get("/groups", response_model=List[GroupOut])
async def list_groups(
    session: session_dependency,
    _=Depends(require_permission_("change_users")),
):
    result = await session.scalars(select(Group))
    return result.all()

@router.get("/admin/groups", response_model=List[GroupDetailOut])
async def list_groups_detailed(
    session: session_dependency,
    _=Depends(require_permission_("change_groups"))
):
    stmt = select(Group).options(selectinload(Group.permissions))
    result = await session.scalars(stmt)
    groups = result.all()
    return [
        {"id": g.id, "name": g.name, "permissions": [p.codename for p in g.permissions]}
        for g in groups
    ]
@router.post("/admin/groups", response_model=GroupDetailOut, status_code=status.HTTP_201_CREATED)
async def create_group(
    payload: CreateGroup,
    session: session_dependency,
    _=Depends(require_permission_("add_groups")),
):
    existing = await session.scalar(select(Group).where(Group.name == payload.name))
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Group already exists")

    group = Group(name=payload.name)
    if payload.permission_ids:
        perms_stmt = select(Permission).where(Permission.id.in_(payload.permission_ids))
        perms = (await session.scalars(perms_stmt)).all()
        group.permissions = list(perms)

    session.add(group)
    await session.commit()
    await session.refresh(group, attribute_names=["permissions"])

    return {"id": group.id, "name": group.name, "permissions": [p.codename for p in group.permissions]}

@router.delete("/admin/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: int,
    session: session_dependency,
    _=Depends(require_permission_("delete_groups")),
):
    group = await session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    await session.delete(group)
    await session.commit()

#------------------------ Permissions ----------------------------------------------------------

@router.get("/admin/permissions", response_model=List[PermissionOut])
async def list_permissions(
    session: session_dependency,
    _=Depends(require_permission_("view_permissions")),
):
    result = await session.scalars(select(Permission))
    return result.all()

@router.post("/admin/permissions", response_model=PermissionOut, status_code=status.HTTP_201_CREATED)
async def create_permission(
    payload: CreatePermission,
    session: session_dependency,
    _=Depends(require_permission_("add_permissions")),
):
    existing = await session.scalar(select(Permission).where(Permission.codename == payload.codename))
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Permission codename already exists")

    permission = Permission(**payload.model_dump())
    session.add(permission)
    await session.commit()
    await session.refresh(permission)
    return permission

@router.get("/{user_id}", response_model=UserDetailOut)
async def get_user_detail(
    user_id: int,
    session: session_dependency,
    _=Depends(require_permission_("change_users"))
):
    stmt = (
        select(User)
        .options(selectinload(User.groups))
        .where(User.id == user_id)
    )
    user = await session.scalar(stmt)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "created_at": user.created_at,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "groups": [g.name for g in user.groups]
    }

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

# @router.get("/groups", response_model=List[GroupOut])
# async def list_groups(
#     session: session_dependency,
#     _=Depends(require_permission_("change_users")),
# ):
#     result = await session.scalars(select(Group))
#     return result.all()

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
