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
    # System tables to skip
    system_tables = {
        "users", "permissions", "groups",
        "user_groups", "group_permissions", "user_permissions",
    }
    
    # Get all mapped models
    models = [
        cls for cls in Base.registry._class_registry.values()
        if hasattr(cls, "__tablename__") and cls.__tablename__ not in system_tables
    ]
    
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
            
            # Skip if already exists
            exists_stmt = select(Permission).where(Permission.codename == codename)
            existing = await session.scalar(exists_stmt)
            
            if not existing:
                perm = Permission(
                    model_name=table_name,
                    codename=codename,
                    name=name,
                )
                session.add(perm)
    
    await session.commit()
    print("CRUD permissions ensured for all models.")