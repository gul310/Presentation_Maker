from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import get_auth_or_guest_context, AuthOrGuestContext
from app.schemas.practice import (
    PracticeSessionCreate,
    PracticeSessionResponse,
    PracticeSlideResultUpdate,
    PracticeSlideResultResponse,
    PracticeReportResponse,
    PracticeHistoryItem
)
from app.services.practice_service import (
    create_practice_session,
    get_practice_session_or_404,
    update_slide_transcript,
    finish_practice_session,
    get_practice_report,
    get_practice_history
)

router = APIRouter()

@router.post("/sessions", response_model=PracticeSessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    session_in: PracticeSessionCreate,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Creates a new PracticeSession for a presentation."""
    return create_practice_session(
        db=db,
        presentation_id=session_in.presentation_id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

@router.get("/sessions/{id}", response_model=PracticeSessionResponse)
def get_session(
    id: int,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Fetches details of a practice session."""
    return get_practice_session_or_404(
        db=db,
        session_id=id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

@router.put("/sessions/{id}/slides/{slide_id}", response_model=PracticeSlideResultResponse)
def save_slide_transcript(
    id: int,
    slide_id: int,
    update_in: PracticeSlideResultUpdate,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Saves real speech transcript and timing for a slide in an active practice session."""
    return update_slide_transcript(
        db=db,
        session_id=id,
        slide_id=slide_id,
        transcript=update_in.transcript,
        duration_seconds=update_in.duration_seconds,
        completion_status=update_in.completion_status,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

@router.post("/sessions/{id}/finish", response_model=PracticeReportResponse)
def finish_session(
    id: int,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Finishes practice session, calculates metrics, runs Gemini evaluation, and saves report."""
    return finish_practice_session(
        db=db,
        session_id=id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

@router.get("/sessions/{id}/report", response_model=PracticeReportResponse)
def get_report(
    id: int,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Returns full practice performance report including metrics, Gemini feedback, and attempt comparison."""
    return get_practice_report(
        db=db,
        session_id=id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

@router.get("/history", response_model=List[PracticeHistoryItem])
def get_history(
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Returns list of real practice history records for current user or guest session."""
    return get_practice_history(
        db=db,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )
