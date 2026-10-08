from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import List, Optional
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

    password: str = Field(exclude=True)
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

class UserDetailOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime
    is_active: bool
    is_superuser: bool
    groups: List[str]

class UpdateUserBasic(BaseModel):
    username: str
    email: str

class UpdateActiveStatus(BaseModel):
    is_active: bool
    
class UpdateSuperuserStatus(BaseModel):
    is_superuser: bool
#------------------ GROUPS ----------------------------
class GroupDetailOut(BaseModel):
    id: int
    name: str
    permissions: List[str]

class CreateGroup(BaseModel):
    name: str
    permission_ids: List[int] = []

#-------------------- Permissions ------------------------
class PermissionOut(BaseModel):
    id: int
    codename: str
    name: str
    model_name: str
    description: Optional[str] = None

class CreatePermission(BaseModel):
    codename: str
    name: str
    model_name: str
    description: Optional[str] = None

#------------------- Regions -------------------------------
class RegionOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class VisibilityUpdate(BaseModel):
    visibility: str
    region_ids: List[int] = []

class MyVisibilityOut(BaseModel):
    visibility: str
    regions: List[RegionOut]

#------------------ Chat ------------------------------------
class ChatUserOut(BaseModel):
    id: int
    username: str

    class Config:
        from_attributes = True

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    sent_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True

class ConversationOut(BaseModel):
    id: int
    type: str
    other_user: ChatUserOut
    last_messasge: Optional[MessageOut] = None
    unread_count: int = 0

class OpenDirectRequest(BaseModel):
    user_id: int