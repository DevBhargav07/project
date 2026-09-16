from fastapi import Depends, HTTPException, status
from app.models import User
from app.auth.dependencies import get_current_user
from typing import Type

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