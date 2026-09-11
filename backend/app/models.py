import hashlib

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, DateTime, func
from datetime import datetime
from typing import List, Optional
from app.database import Base
from passlib.context import CryptContext


# password hasing context
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True)
    is_superuser: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    def verify_password(self, plain: str) -> bool:
        prehash = hashlib.sha256(plain.encode()).hexdigest()
        return pwd_context.verify(prehash, self.password)

    @staticmethod
    def hash_password(password: str) -> str:
        prehash = hashlib.sha256(password.encode()).hexdigest()
        return pwd_context.hash(prehash)

    