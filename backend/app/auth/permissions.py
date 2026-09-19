from fastapi import Depends, HTTPException, status
from app.models import User, Permission, UserGroup, UserPermission, Group, GroupPermission
from app.auth.dependencies import get_current_user
from app.database import get_async_session, Base
from typing import Type
from typing_extensions import Annotated

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class BasePermission:
    """BasePermission like DRF's. Baseclass and override has_permission"""
    def has_permission(self, user: User) -> bool:
        return NotImplementedError

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        if not self.has_permission(user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=self.message)
        return user

    message = "You do not have permission to perform this action."


class IsAuthenticated(BasePermission):
    message = "Authentication required."
    def has_permission(self, user: User) -> bool:
        return user is not None

class IsSuperuser(BasePermission):
    message = "Superuser Previliges required."
    def has_permission(self, user: User) -> bool:
        return user.is_superuser

class IsActive(BasePermission):
    message = "Account is inactive."
    def has_permission(self, user: User) -> bool:
        return user.is_active

def require_permissions(*permission_classes: Type[BasePermission]):
    def dependency(user: User = Depends(get_current_user)) -> User:
        for perm_cls in permission_classes:
            perm = perm_cls()
            if not perm.has_permission(user):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=perm.message)
        return user
    return dependency


SessionDep = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[User, Depends(get_current_user)]

async def check_permission(user: User, codename: str, session: AsyncSession) -> bool:
    """ check if user has a specific permission (directly or via groups). """
    if user.is_superuser:
        return True

    # checking permissions table
    stmt = (
        select(Permission.id)
        .join(GroupPermission, GroupPermission.permission_id==Permission.id)
        .where(UserPermission.user_id == user.id, Permission.codename==codename)
    )

    if await session.scalar(stmt):
        return True

    # checking in groups
    stmt = (
        select(Permission.id)
        .join(GroupPermission, GroupPermission.permission_id == Permission.id)
        .join(UserGroup, UserGroup.id == GroupPermission.group_id)
        .where(UserGroup.user_id == user.id, Permission.codename==codename)
    )

    if await session.scalar(stmt):
        return True

    return False


def require_permission_(codename: str):
    """
    Dependency Factor. Usage:
        Depends(require_permission) 
    """
    async def checker(
        current_user: User,
        session: SessionDep
    ):
        has_perm = await check_permission(current_user, codename, session)
        if not has_perm:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission Denied: {codename}")
        return current_user
    return checker


#---------------------- AutoGenerating CRUD Permissions ----------------------------------------
async def ensure_crud_permissions(session: AsyncSession):
    """
    Scan all models and create default CRUD permissions.
    Call this once on app startup.
    """
    system_tables = {
        "user_groups", "group_permissions", "user_permissions",
    }

    # Public, stable API — every mapper registered against Base
    models = [
        mapper.class_
        for mapper in Base.registry.mappers
        if mapper.class_.__tablename__ not in system_tables
    ]

    created_count = 0
    for model in models:
        table_name = model.__tablename__
        actions = [
            ("view", f"Can view {table_name}"),
            ("add", f"Can add {table_name}"),
            ("change", f"Can change {table_name}"),
            ("delete", f"Can delete {table_name}"),
        ]
        for action, name in actions:
            codename = f"{action}_{table_name}"
            exists_stmt = select(Permission).where(Permission.codename == codename)
            existing = await session.scalar(exists_stmt)
            if not existing:
                perm = Permission(
                    model_name=table_name,
                    codename=codename,
                    name=name,
                )
                session.add(perm)
                created_count += 1

    await session.commit()  # commit once, outside the loop
    print(f"CRUD permissions ensured for {len(models)} models — {created_count} new permissions created.")

#-------------------------- AutoGenerating Groups ---------------------------------------
async def ensure_default_groups(session: AsyncSession):
    """
    Create default groups and assign permissions automatically.
    Idempotent: safe to run on every startup 
    """
    admin_group = await session.scalar(
        select(Group).where(Group.name=="Admin")
    )

    if not admin_group:
        admin_group = Group(name="Admin")
        session.add(admin_group)
        await session.flush()
        print("[GRANT] Created 'Admin' group")

    operator_group = await session.scalar(
        select(Group).where(Group.name=="Operator")
    )

    if not operator_group:
        operator_group = Group(name="Operator")
        session.add(operator_group)
        session.flush()
        print("[GRANT] Created 'Operator' group")

    all_perms = await session.scalars(select(Permission))
    for perm in all_perms:
        exists = await session.scalar(
            select(GroupPermission).where(
                GroupPermission.group_id == admin_group.id,
                GroupPermission.permission_id == perm.id
            )
        )
        if not exists:
            session.add(GroupPermission(
                group_id=admin_group.id,
                permission_id= perm.id
            ))
    operator_perms = await session.scalars(
        select(Permission).where(
            Permission.codename.notlike("delete_%")
        )
    )
    for perm in operator_perms:
        exists = await session.scalar(
            select(GroupPermission).where(
                GroupPermission.group_id == operator_group.id,
                GroupPermission.permission_id == perm.id,
            )
        )
        if not exists:
            session.add(GroupPermission(
                group_id=operator_group.id,
                permission_id=perm.id,
            ))
    
    await session.commit()
    print("[Groups] Permissions assigned to default groups.")

    first_superuser = await session.scalar(
        select(User).where(User.is_superuser == True).order_by(User.id.asc())
    )
    if first_superuser:
        in_admin = await session.scalar(
            select(UserGroup).where(
                UserGroup.user_id == first_superuser.id,
                UserGroup.group_id == admin_group.id,
            )
        )
        if not in_admin:
            session.add(UserGroup(
                user_id=first_superuser.id,
                group_id=admin_group.id,
            ))
            await session.commit()
            print(f"[Groups] Assigned '{first_superuser.username}' to Admin group.")