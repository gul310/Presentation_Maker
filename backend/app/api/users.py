from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.auth import UserResponse, ThemeUpdate, SettingsUpdate

router = APIRouter()

@router.put("/me/theme", response_model=UserResponse)
def update_user_theme(
    theme_in: ThemeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates authenticated user's application theme preferences in MySQL."""
    current_user.app_theme_mode = theme_in.app_theme_mode
    current_user.app_color_theme = theme_in.app_color_theme
    current_user.custom_primary_color = theme_in.custom_primary_color
    
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)

@router.put("/me/settings", response_model=UserResponse)
def update_user_settings(
    settings_in: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates authenticated user's profile metadata and settings in MySQL."""
    if settings_in.name is not None:
        current_user.name = settings_in.name
    if settings_in.country is not None:
        current_user.country = settings_in.country
    if settings_in.interface_language is not None:
        current_user.interface_language = settings_in.interface_language
    if settings_in.presentation_language is not None:
        current_user.presentation_language = settings_in.presentation_language
    if settings_in.app_theme_mode is not None:
        current_user.app_theme_mode = settings_in.app_theme_mode
    if settings_in.app_color_theme is not None:
        current_user.app_color_theme = settings_in.app_color_theme
    if settings_in.custom_primary_color is not None:
        current_user.custom_primary_color = settings_in.custom_primary_color
        
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)
