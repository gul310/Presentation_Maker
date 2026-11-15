from sqlalchemy.orm import Session
from app.models.guest import GuestSession
from app.core.config import settings

def get_or_create_guest_session(db: Session, session_id: str) -> GuestSession:
    """Finds or creates a guest session record by session_id."""
    session = db.query(GuestSession).filter(GuestSession.session_id == session_id).first()
    if not session:
        session = GuestSession(session_id=session_id, generation_count=0)
        db.add(session)
        db.commit()
        db.refresh(session)
    return session

def process_guest_generation_attempt(db: Session, session_id: str) -> dict:
    """Processes a guest presentation generation attempt.
    
    Generations 1 & 2: ALLOWED
    Generation 3+: BLOCKED with status GUEST_GENERATION_LIMIT_REACHED
    """
    session = get_or_create_guest_session(db, session_id)
    
    if session.generation_count >= settings.MAX_GUEST_GENERATIONS:
        return {
            "session_id": session_id,
            "generation_count": session.generation_count,
            "max_generations": settings.MAX_GUEST_GENERATIONS,
            "allowed": False,
            "status_code": "GUEST_GENERATION_LIMIT_REACHED",
            "message": f"You've used your {settings.MAX_GUEST_GENERATIONS} free presentation generations."
        }
    
    # Increment generation count
    session.generation_count += 1
    db.commit()
    db.refresh(session)
    
    return {
        "session_id": session_id,
        "generation_count": session.generation_count,
        "max_generations": settings.MAX_GUEST_GENERATIONS,
        "allowed": True,
        "status_code": "ALLOWED",
        "message": f"Generation {session.generation_count} of {settings.MAX_GUEST_GENERATIONS} allowed."
    }

def get_guest_status(db: Session, session_id: str) -> dict:
    """Retrieves current usage status without incrementing count."""
    session = db.query(GuestSession).filter(GuestSession.session_id == session_id).first()
    count = session.generation_count if session else 0
    allowed = count < settings.MAX_GUEST_GENERATIONS
    return {
        "session_id": session_id,
        "generation_count": count,
        "max_generations": settings.MAX_GUEST_GENERATIONS,
        "allowed": allowed,
        "status_code": "ALLOWED" if allowed else "GUEST_GENERATION_LIMIT_REACHED",
        "message": f"Generation {count} of {settings.MAX_GUEST_GENERATIONS} used."
    }
