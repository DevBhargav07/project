from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=5, max_length=150)
    password: str = Field(min_length=6)


class UserOut(BaseModel):
    id: int
    email: EmailStr
    username: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    is_superuser: bool