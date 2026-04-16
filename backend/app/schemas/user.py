

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    

    email: EmailStr
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None


class UserRegister(UserBase):
    

    password: str = Field(
        ..., min_length=8, description="Password must be at least 8 characters"
    )
    user_role: str = Field(
        default="member", description="User role: admin, member, or partner"
    )
    fingerprint_hash: Optional[str] = Field(
        None, description="Device fingerprint hash for device tracking"
    )

class UserUpdate(BaseModel):
    
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None


class UserLogin(BaseModel):
    

    email: EmailStr
    password: str


class UserOAuth2(BaseModel):
    

    google_id: str
    email: EmailStr
    first_name: str
    last_name: str
    picture_url: Optional[str] = None


class UserResponse(UserBase):
    

    id: int
    user_role: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    

    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    

    sub: int  # User ID
    email: str
    user_role: str
    exp: datetime


class AdminCreate(BaseModel):
    

    user_id: int
    bio: Optional[str] = None
    department: Optional[str] = None


class AdminResponse(BaseModel):
    

    id: int
    user_id: int
    bio: Optional[str]
    department: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MemberCreate(BaseModel):
    

    user_id: int
    bio: Optional[str] = None


class MemberResponse(BaseModel):
    

    id: int
    user_id: int
    bio: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PartnerCreate(BaseModel):
    

    user_id: int
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    bio: Optional[str] = None


class PartnerResponse(BaseModel):
    

    id: int
    user_id: int
    company_name: Optional[str]
    company_website: Optional[str]
    bio: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SessionCreate(BaseModel):
    

    user_id: int
    device_fingerprint: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class SessionResponse(BaseModel):
    

    id: int
    user_id: int
    device_fingerprint: Optional[str]

    class Config:
        from_attributes = True


class FingerprintCreate(BaseModel):
    

    fingerprint_hash: str
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    browser_name: Optional[str] = None
    browser_version: Optional[str] = None
    is_trusted: bool = False


class FingerprintResponse(BaseModel):
    

    id: int
    user_id: int
    fingerprint_hash: str
    device_name: Optional[str]
    device_type: Optional[str]
    os_name: Optional[str]
    os_version: Optional[str]
    browser_name: Optional[str]
    browser_version: Optional[str]
    last_seen: datetime
    created_at: datetime
    is_trusted: bool
    ip_address: Optional[str]
    created_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True

class VaultDocumentResponse(BaseModel):
    
    id: int
    filename: str
    file_type: Optional[str]
    file_size: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
