from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import List
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=5, max_length=150)
    password: str = Field(min_length=6)


class UserOut(BaseModel):
    id: int
    email: EmailStr
    username: str
    created_at: datetime
    is_superuser: bool
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    groups: List[str]
    permissions: List[str]
    is_superuser: bool

class ProfileResponse(BaseModel):
    email: EmailStr
    username: str
    created_at: datetime
    is_superuser: bool
    groups: List[str]
    permissions: List[str]
    model_config = ConfigDict(from_attributes=True)


class GroupOut(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)

class UpdateUserGroups(BaseModel):
    group_ids: List[int]
    