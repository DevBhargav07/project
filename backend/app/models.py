import hashlib

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, DateTime, func, Text
from datetime import datetime
from typing import List, Optional
from app.database import Base
from passlib.context import CryptContext


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

    # many-to-many User <-> Group, through the UserGroup association table
    groups: Mapped[List["Group"]] = relationship(
        secondary="user_groups", back_populates="users"
    )
    # many-to-many User <-> Permission, through the UserPermission association table
    permissions: Mapped[List["Permission"]] = relationship(
        secondary="user_permissions", back_populates="users"
    )

    def verify_password(self, plain: str) -> bool:
        prehash = hashlib.sha256(plain.encode()).hexdigest()
        return pwd_context.verify(prehash, self.password)

    @staticmethod
    def hash_password(password: str) -> str:
        prehash = hashlib.sha256(password.encode()).hexdigest()
        return pwd_context.hash(prehash)


#---------------------------------- Permission Table ---------------------------------
class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    model_name: Mapped[str] = mapped_column(String(100))
    codename: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    groups: Mapped[List["Group"]] = relationship(
        secondary="group_permissions", back_populates="permissions"
    )
    users: Mapped[List["User"]] = relationship(
        secondary="user_permissions", back_populates="permissions"
    )


#---------------------------------- Groups Table ---------------------------------
class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True)

    users: Mapped[List["User"]] = relationship(
        secondary="user_groups", back_populates="groups"
    )
    permissions: Mapped[List["Permission"]] = relationship(
        secondary="group_permissions", back_populates="groups"
    )


#---------------------------------- User Group Table ---------------------------------
class UserGroup(Base):
    __tablename__ = "user_groups"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), primary_key=True)


#---------------------------------- Group Permissions Table -------------------------------
class GroupPermission(Base):
    __tablename__ = "group_permissions"

    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), primary_key=True)
    permission_id: Mapped[int] = mapped_column(ForeignKey("permissions.id"), primary_key=True)


#---------------------------------- User Permissions Table ---------------------------------
class UserPermission(Base):
    __tablename__ = "user_permissions"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    permission_id: Mapped[int] = mapped_column(ForeignKey("permissions.id"), primary_key=True)