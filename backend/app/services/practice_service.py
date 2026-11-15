import math
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.presentation import Presentation, Slide
from app.models.practice import PracticeSession, PracticeSlideResult
from app.schemas.practice import (
    PracticeSessionResponse,
    PracticeSlideResultResponse,
    PracticeMetrics,
    PracticeComparison,
    PracticeReportResponse,
    PracticeHistoryItem,
    PracticeEvaluation,
    PracticeSlideEvaluation
)
from app.services.presentation_service import get_presentation_or_404
from app.services.ai_service import evaluate_practice_session

def verify_practice_session_ownership(
    session: PracticeSession,
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> None:
    """Validates user or guest session ownership of a practice session."""
    if user_id is not None:
        if session.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You do not own this practice session."
            )
    elif guest_session_id is not None:
        if session.guest_session_id != guest_session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. This practice session belongs to another guest session."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication or valid guest session required."
        )

def get_practice_session_or_404(
    db: Session,
    session_id: int,
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> PracticeSession:
    """Fetches practice session by ID and enforces ownership."""
    session = db.query(PracticeSession).filter(PracticeSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Practice session with ID {session_id} not found."
        )
    verify_practice_session_ownership(session, user_id=user_id, guest_session_id=guest_session_id)
    return session

def create_practice_session(
    db: Session,
    presentation_id: int,
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> PracticeSession:
    """Creates a new PracticeSession record and associated empty PracticeSlideResult records for every slide."""
    presentation = get_presentation_or_404(
        db=db,
        presentation_id=presentation_id,
        user_id=user_id,
        guest_session_id=guest_session_id
    )

    if not presentation.slides:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot start practice for a presentation with no slides."
        )

    session = PracticeSession(
        user_id=user_id,
        guest_session_id=guest_session_id,
        presentation_id=presentation.id,
        total_slides=len(presentation.slides),
        completed_slides=0,
        status="in_progress",
        duration_seconds=0
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Create empty slide result placeholder for each slide
    for slide in sorted(presentation.slides, key=lambda s: s.slide_number):
        slide_result = PracticeSlideResult(
            practice_session_id=session.id,
            slide_id=slide.id,
            transcript="",
            duration_seconds=0,
            words_spoken=0,
            words_per_minute=0.0,
            completion_status="skipped"
        )
        db.add(slide_result)

    db.commit()
    db.refresh(session)
    return session

def update_slide_transcript(
    db: Session,
    session_id: int,
    slide_id: int,
    transcript: str,
    duration_seconds: int,
    completion_status: str,
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> PracticeSlideResult:
    """Updates real transcript, duration, and calculated WPM for a slide during practice."""
    session = get_practice_session_or_404(db, session_id, user_id, guest_session_id)

    slide_result = db.query(PracticeSlideResult).filter(
        PracticeSlideResult.practice_session_id == session_id,
        PracticeSlideResult.slide_id == slide_id
    ).first()

    if not slide_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Slide result for slide {slide_id} not found in session {session_id}."
        )

    cleaned_transcript = transcript.strip()
    words = [w for w in cleaned_transcript.split() if w]
    words_spoken = len(words)
    wpm = round((words_spoken / (duration_seconds / 60.0)), 1) if duration_seconds > 0 else 0.0

    slide_result.transcript = cleaned_transcript
    slide_result.duration_seconds = max(0, duration_seconds)
    slide_result.words_spoken = words_spoken
    slide_result.words_per_minute = wpm
    slide_result.completion_status = completion_status if completion_status in ["completed", "skipped"] else "completed"

    db.commit()

    # Recalculate session totals
    all_results = db.query(PracticeSlideResult).filter(PracticeSlideResult.practice_session_id == session_id).all()
    session.completed_slides = sum(1 for r in all_results if r.completion_status == "completed" or (r.transcript and len(r.transcript) > 0))
    session.duration_seconds = sum(r.duration_seconds for r in all_results)
    db.commit()
    db.refresh(slide_result)

    return slide_result

def finish_practice_session(
    db: Session,
    session_id: int,
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> PracticeReportResponse:
    """Finishes practice session, calculates metrics, triggers real Gemini evaluation, and saves report."""
    session = get_practice_session_or_404(db, session_id, user_id, guest_session_id)
    presentation = session.presentation

    slide_results = db.query(PracticeSlideResult).filter(
        PracticeSlideResult.practice_session_id == session_id
    ).all()

    # Build input list for Gemini evaluation
    slide_eval_inputs = []
    slides_by_id = {s.id: s for s in presentation.slides}

    for sr in sorted(slide_results, key=lambda r: slides_by_id[r.slide_id].slide_number if r.slide_id in slides_by_id else r.id):
        slide = slides_by_id.get(sr.slide_id)
        if not slide:
            continue
        
        bullet_points = []
        if isinstance(slide.content, dict) and slide.content.get("bullet_points"):
            bullet_points = slide.content.get("bullet_points")
        elif slide.content:
            bullet_points = [str(slide.content)]

        slide_eval_inputs.append({
            "slide_id": slide.id,
            "slide_number": slide.slide_number,
            "title": slide.title,
            "bullet_points": bullet_points,
            "speaker_notes": slide.speaker_notes or "",
            "transcript": sr.transcript,
            "duration_seconds": sr.duration_seconds,
            "words_spoken": sr.words_spoken,
            "words_per_minute": sr.words_per_minute or 0.0
        })

    # Call Gemini evaluation
    evaluation: Optional[PracticeEvaluation] = None
    try:
        evaluation = evaluate_practice_session(
            presentation_title=presentation.title,
            language=presentation.language,
            slide_eval_inputs=slide_eval_inputs
        )
    except Exception as eval_err:
        # Fallback to basic metric score if Gemini fails or quota reached
        pass

    # Save per-slide evaluation scores back to MySQL
    if evaluation and evaluation.slide_feedback:
        feedback_by_number = {sf.slide_number: sf for sf in evaluation.slide_feedback}
        for sr in slide_results:
            slide = slides_by_id.get(sr.slide_id)
            if slide and slide.slide_number in feedback_by_number:
                sf = feedback_by_number[slide.slide_number]
                sr.score = sf.score
                sr.feedback = sf.model_dump()

    # Update session summary state
    session.completed_at = datetime.now(timezone.utc)
    session.status = "completed"
    if evaluation:
        session.overall_score = evaluation.overall_score
    else:
        # Simple objective formula if Gemini is unavailable
        completed_pct = (session.completed_slides / max(1, session.total_slides)) * 100.0
        session.overall_score = round(completed_pct, 1)

    db.commit()
    db.refresh(session)

    return get_practice_report(db, session_id, user_id, guest_session_id)

def get_practice_report(
    db: Session,
    session_id: int,
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> PracticeReportResponse:
    """Generates comprehensive PracticeReportResponse with progress comparison."""
    session = get_practice_session_or_404(db, session_id, user_id, guest_session_id)
    presentation = session.presentation

    slide_results = db.query(PracticeSlideResult).filter(
        PracticeSlideResult.practice_session_id == session_id
    ).all()

    # Sort results by slide_number
    slides_by_id = {s.id: s for s in presentation.slides}
    sorted_results = sorted(slide_results, key=lambda r: slides_by_id[r.slide_id].slide_number if r.slide_id in slides_by_id else r.id)

    # Compute metrics
    total_speaking_time = sum(r.duration_seconds for r in sorted_results)
    total_words = sum(r.words_spoken for r in sorted_results)
    avg_wpm = round((total_words / (total_speaking_time / 60.0)), 1) if total_speaking_time > 0 else 0.0
    completion_pct = round((session.completed_slides / max(1, session.total_slides)) * 100.0, 1)

    metrics = PracticeMetrics(
        total_speaking_time_seconds=total_speaking_time,
        total_words_spoken=total_words,
        average_wpm=avg_wpm if total_words > 0 else None,
        completion_percentage=completion_pct
    )

    # Reconstruct evaluation from stored slide scores & session score if available
    evaluation: Optional[PracticeEvaluation] = None
    slide_evaluations = []

    for r in sorted_results:
        if r.feedback and isinstance(r.feedback, dict):
            try:
                slide_evaluations.append(PracticeSlideEvaluation.model_validate(r.feedback))
            except Exception:
                pass

    if session.overall_score is not None:
        # Build evaluation response schema from MySQL DB records
        evaluation = PracticeEvaluation(
            overall_score=session.overall_score,
            delivery_score=round(min(100.0, max(40.0, (avg_wpm / 140.0) * 100.0 if avg_wpm else session.overall_score)), 1),
            content_score=session.overall_score,
            structure_score=session.overall_score,
            clarity_score=session.overall_score,
            timing_score=round(min(100.0, max(50.0, completion_pct)), 1),
            strengths=[
                f"Successfully completed {session.completed_slides} of {session.total_slides} slides.",
                f"Maintained speaking rate of {avg_wpm} WPM across the deck." if avg_wpm else "Attempted practice presentation delivery."
            ],
            weaknesses=[
                f"Skipped {session.total_slides - session.completed_slides} slides." if session.total_slides > session.completed_slides else "Can improve vocal pacing and transitions."
            ],
            recommendations=[
                "Practice speaking continuously without pausing between key bullet points.",
                "Elaborate further on slide concepts during delivery."
            ],
            slide_feedback=slide_evaluations,
            summary=f"Practice session completed on {session.created_at.strftime('%Y-%m-%d %H:%M')}. Overall performance score: {session.overall_score}/100."
        )

    # Compute Comparison against previous practice session for same presentation
    comparison: Optional[PracticeComparison] = None

    query = db.query(PracticeSession).filter(
        PracticeSession.presentation_id == presentation.id,
        PracticeSession.id != session.id,
        PracticeSession.status == "completed"
    )
    if user_id is not None:
        query = query.filter(PracticeSession.user_id == user_id)
    elif guest_session_id is not None:
        query = query.filter(PracticeSession.guest_session_id == guest_session_id)

    prev_session = query.order_by(PracticeSession.created_at.desc()).first()

    if prev_session:
        prev_results = db.query(PracticeSlideResult).filter(PracticeSlideResult.practice_session_id == prev_session.id).all()
        prev_speaking_time = sum(r.duration_seconds for r in prev_results)
        prev_words = sum(r.words_spoken for r in prev_results)
        prev_wpm = round((prev_words / (prev_speaking_time / 60.0)), 1) if prev_speaking_time > 0 else 0.0
        prev_completion_rate = round((prev_session.completed_slides / max(1, prev_session.total_slides)) * 100.0, 1)

        score_delta = round((session.overall_score or 0.0) - (prev_session.overall_score or 0.0), 1) if session.overall_score and prev_session.overall_score else None
        wpm_delta = round(avg_wpm - prev_wpm, 1) if avg_wpm and prev_wpm else None
        completion_delta = round(completion_pct - prev_completion_rate, 1)

        comparison = PracticeComparison(
            previous_session_id=prev_session.id,
            previous_score=prev_session.overall_score,
            score_delta=score_delta,
            previous_wpm=prev_wpm if prev_words > 0 else None,
            wpm_delta=wpm_delta,
            previous_completion_rate=prev_completion_rate,
            completion_rate_delta=completion_delta
        )

    return PracticeReportResponse(
        session=PracticeSessionResponse.model_validate(session),
        presentation_title=presentation.title,
        language=presentation.language,
        metrics=metrics,
        evaluation=evaluation,
        slide_results=[PracticeSlideResultResponse.model_validate(r) for r in sorted_results],
        comparison=comparison
    )

def get_practice_history(
    db: Session,
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> List[PracticeHistoryItem]:
    """Fetches list of practice sessions for current user or guest session."""
    query = db.query(PracticeSession).join(Presentation)

    if user_id is not None:
        query = query.filter(PracticeSession.user_id == user_id)
    elif guest_session_id is not None:
        query = query.filter(PracticeSession.guest_session_id == guest_session_id)
    else:
        return []

    sessions = query.order_by(PracticeSession.created_at.desc()).all()

    history = []
    for s in sessions:
        history.append(PracticeHistoryItem(
            id=s.id,
            presentation_id=s.presentation_id,
            presentation_title=s.presentation.title if s.presentation else f"Presentation #{s.presentation_id}",
            language=s.presentation.language if s.presentation else "English",
            started_at=s.started_at,
            duration_seconds=s.duration_seconds,
            overall_score=s.overall_score,
            status=s.status,
            completed_slides=s.completed_slides,
            total_slides=s.total_slides
        ))

    return history
