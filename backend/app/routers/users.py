from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from typing_extensions import Annotated
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.database import get_async_session
from app.models import User
from app.schemas import UserCreate, UserOut, UserLogin, LoginResponse

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

session_dependency = Annotated[AsyncSession, Depends(get_async_session)]


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
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

@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: int, session: session_dependency):
    user = await session.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.post("/login", response_model=LoginResponse)
async def login_user(user_login: UserLogin, session: session_dependency):
    user_details = select(User).where(User.username == user_login.username)
    user = await session.scalar(user_details)
    if not user or not user.verify_password(user_login.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
    return {"message": "Login successful", "user_id": user.id, "is_superuser": user.is_superuser}