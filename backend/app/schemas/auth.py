from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime

UserRole = Literal["student", "teacher", "researcher", "professional"]
AppThemeMode = Literal["light", "dark", "system"]
AppColorTheme = Literal["indigo", "blue", "purple", "cyan", "green", "rose", "orange", "custom"]

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: UserRole = "student"
    country: str = Field("Global", min_length=2, max_length=100)
    interface_language: str = "English"
    presentation_language: str = "English"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    country: str
    interface_language: str
    presentation_language: str
    app_theme_mode: str
    app_color_theme: str
    custom_primary_color: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ThemeUpdate(BaseModel):
    app_theme_mode: AppThemeMode
    app_color_theme: AppColorTheme
    custom_primary_color: Optional[str] = None

class SettingsUpdate(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    interface_language: Optional[str] = None
    presentation_language: Optional[str] = None
    app_theme_mode: Optional[AppThemeMode] = None
    app_color_theme: Optional[AppColorTheme] = None
    custom_primary_color: Optional[str] = None

class GuestAttemptResponse(BaseModel):
    session_id: str
    generation_count: int
    max_generations: int
    allowed: bool
    status_code: str # "ALLOWED" or "GUEST_GENERATION_LIMIT_REACHED"
    message: str
