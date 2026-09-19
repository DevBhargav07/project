from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from typing_extensions import Annotated
from datetime import timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_session
from app.models import User
from app.schemas import UserOut

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

session_dependency = Annotated[AsyncSession, Depends(get_async_session)]


############################# Permissions Required Classes #######################################
from app.auth.permissions import IsActive, IsAuthenticated, IsSuperuser, require_permissions

@router.get("/me", response_model=UserOut)
async def get_my_profile(current_user: User = Depends(IsAuthenticated())):
    return current_user

@router.get("/", response_model=List[UserOut])
async def get_users(session: session_dependency, _: User = Depends(IsAuthenticated())):
    result = await session.scalars(select(User).offset(0).limit(100))
    return result.all()

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    session: session_dependency,
    current_user: User = Depends(require_permissions(IsAuthenticated, IsSuperuser))
):
    user_to_delete = await session.scalar(select(User).where(User.id==user_id))
    if not user_to_delete:
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # checking if they are deleting their own account -- stop
    if user_to_delete.id == current_user.id:
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")

    await session.delete(user_to_delete)
    await session.commit()
    return None