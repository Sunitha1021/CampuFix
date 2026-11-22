
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# Issue schemas

class IssueCreate(BaseModel):
    title: str
    description: str
    category: str


class IssueResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    priority: str
    status: str
    department: Optional[str] = None
    user_id: Optional[int] = None
    recommendation: Optional[str] = None
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
class AdminIssueResponse(IssueResponse):
    student_name: Optional[str] = None
    student_email: Optional[EmailStr] = None


class IssueStatusUpdate(BaseModel):
    status: str


# Authentication schemas

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
