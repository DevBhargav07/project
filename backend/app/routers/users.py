from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import List
from typing_extensions import Annotated
from datetime import timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.database import get_async_session
from app.models import User
from app.schemas import UserCreate, UserOut, UserLogin, LoginResponse
from app.auth.auth import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

session_dependency = Annotated[AsyncSession, Depends(get_async_session)]


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(user_create: UserCreate, session: session_dependency):
    # checking email exists
    user_details = select(User).where(User.email == user_create.email)
    if await session.scalar(user_details):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # checking username exists
    user_details = select(User).where(User.username == user_create.username)
    if await session.scalar(user_details):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

    db_user = User(
        email = user_create.email,
        username = user_create.username,
        password = User.hash_password(user_create.password)
    )

    session.add(db_user)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email or Username already exists")
    await session.refresh(db_user)
    return db_user

@router.get("/all", response_model=List[UserOut])
async def get_users(session: session_dependency, skip: int = 0, limit: int = 30):
    result = await session.scalars(select(User).offset(skip).limit(limit))
    users = result.all()
    return [UserOut.model_validate(user) for user in users]

# @router.get("/{user_id}", response_model=UserOut)
# async def get_user(user_id: int, session: session_dependency):
#     user = await session.scalar(select(User).where(User.id == user_id))
#     if not user:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
#     return user

@router.post("/login", response_model=LoginResponse)
async def login_user(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: session_dependency
):
    """ 
    Login with username and password
    Retures a JWT token to use in the Authorization header.
    """

    user_details = select(User).where(User.username == form_data.username)
    user = await session.scalar(user_details)
    if not user or not user.verify_password(form_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "is_superuser": user.is_superuser
    }

############################# Permissions Required Classes #######################################
from app.auth.permissions import IsActive, IsAuthenticated, IsSuperuser, require_permissions

@router.get("/me", response_model=UserOut)
async def get_my_profile(current_user: User = Depends(IsAuthenticated())):
    return current_user

@router.get("/", response_model=List[UserOut])
async def get_users(session: session_dependency, _: User = Depends(IsSuperuser())):
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