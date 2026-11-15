from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.services.auth_service import decode_access_token, get_user_by_id
from app.models.user import User

security = HTTPBearer(auto_error=False)

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency that extracts and validates JWT token, returning authenticated User."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not auth or not auth.credentials:
        raise credentials_exception
        
    payload = decode_access_token(auth.credentials)
    if not payload:
        raise credentials_exception
        
    user_id_str: str = payload.get("sub")
    if not user_id_str:
        raise credentials_exception
        
    try:
        user_id = int(user_id_str)
    except ValueError:
        raise credentials_exception
        
    user = get_user_by_id(db, user_id=user_id)
    if not user or not user.is_active:
        raise credentials_exception
        
    return user

def get_current_user_optional(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Optional user dependency. Returns User if valid token present, otherwise None."""
    if not auth or not auth.credentials:
        return None
    payload = decode_access_token(auth.credentials)
    if not payload:
        return None
    user_id_str: str = payload.get("sub")
    if not user_id_str:
        return None
    try:
        user_id = int(user_id_str)
        user = get_user_by_id(db, user_id=user_id)
        if user and user.is_active:
            return user
    except ValueError:
        pass
    return None

def get_guest_session_id(
    x_guest_session_id: Optional[str] = Header(None, alias="X-Guest-Session-ID")
) -> str:
    """Extracts guest session ID from custom header or defaults to fallback."""
    if x_guest_session_id and len(x_guest_session_id.strip()) > 0:
        return x_guest_session_id.strip()
    return "guest_default_session"

class AuthOrGuestContext:
    def __init__(self, user: Optional[User], guest_session_id: str):
        self.user = user
        self.user_id = user.id if user else None
        self.guest_session_id = guest_session_id if user is None else None

def get_auth_or_guest_context(
    user: Optional[User] = Depends(get_current_user_optional),
    guest_session_id: str = Depends(get_guest_session_id)
) -> AuthOrGuestContext:
    """Provides unified context for either authenticated user or guest session."""
    return AuthOrGuestContext(user=user, guest_session_id=guest_session_id)

