from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from app.database import get_async_session
from app.models import User
from app.auth.auth import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")

async def get_current_user(
        token: str = Depends(oauth2_scheme),
        session=Depends(get_async_session)
) -> User:
    try:
        payload = decode_access_token(token)
        user_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")

    user = await session.scalar(select(User).where(User.id==user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive")

    return user

