import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from typing_extensions import Annotated
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import APIRouter
from app.schemas import UserOut, UserCreate, LoginResponse

from app.database import get_async_session, AsyncSessionLocal
from app.models import User, Group, Permission

# load settings
from app.config import settings

SECRET_KEY = settings.secret_key  # Replace with your actual secret key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 2 # 2 HOURS

session_dependency = Annotated[AsyncSession, Depends(get_async_session)]


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES) # it says give only 15

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise ValueError("Invalid or expired token")

async def get_current_user(
        token: Annotated[str, Depends(oauth2_scheme)]
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithm=ALGORITHM)
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.id==int(user_id))
        result = await session.scalar(stmt)
        if result is None:
            raise credentials_exception
        return result


router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


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

# @router.get("/users", response_model=List[UserOut])
# async def get_users(session: session_dependency, skip: int = 0, limit: int = 30):
#     result = await session.scalars(select(User).offset(skip).limit(limit))
#     users = result.all()
#     return [UserOut.model_validate(user) for user in users]

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
    Login with email and password
    Retures a JWT token to use in the Authorization header.
    """
    # user_details = select(User).where(User.email == form_data.username) # here username is email
    user_details = (
        select(User)
        .options(selectinload(User.groups).selectinload(Group.permissions))
        .where(User.email == form_data.username)  # here username is email
    )
    user = await session.scalar(user_details)
    if not user or not user.verify_password(form_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    groups = [g.name for g in user.groups]
    permissions = sorted({perm.codename for g in user.groups for perm in g.permissions})
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "groups": groups,
            "permissions": permissions
            }, 
        expires_delta=access_token_expires,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "groups": groups,
        "permissions": permissions,
        "is_superuser": user.is_superuser
    }
