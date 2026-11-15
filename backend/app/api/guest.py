from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_guest_session_id
from app.schemas.auth import GuestAttemptResponse
from app.services.guest_service import process_guest_generation_attempt, get_guest_status

router = APIRouter()

@router.post("/attempt-generation", response_model=GuestAttemptResponse)
def attempt_guest_generation(
    session_id: str = Depends(get_guest_session_id),
    db: Session = Depends(get_db)
):
    """Processes a guest presentation generation attempt.
    
    Generations 1 & 2: ALLOWED
    Generation 3+: BLOCKED with status code GUEST_GENERATION_LIMIT_REACHED
    """
    result = process_guest_generation_attempt(db, session_id=session_id)
    if not result["allowed"]:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content=result
        )
    return result

@router.get("/status", response_model=GuestAttemptResponse)
def check_guest_status(
    session_id: str = Depends(get_guest_session_id),
    db: Session = Depends(get_db)
):
    """Returns guest generation count status without incrementing."""
    return get_guest_status(db, session_id=session_id)
