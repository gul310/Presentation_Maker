from sqlalchemy import Column, Integer, String, Float, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base

class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    guest_session_id = Column(String(255), nullable=True, index=True)
    presentation_id = Column(Integer, ForeignKey("presentations.id", ondelete="CASCADE"), nullable=False, index=True)

    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, default=0, nullable=False)

    total_slides = Column(Integer, default=0, nullable=False)
    completed_slides = Column(Integer, default=0, nullable=False)

    status = Column(String(50), default="in_progress", nullable=False)  # in_progress, completed, cancelled
    overall_score = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    presentation = relationship("Presentation", backref="practice_sessions")
    slide_results = relationship("PracticeSlideResult", back_populates="practice_session", cascade="all, delete-orphan", order_by="PracticeSlideResult.id")


class PracticeSlideResult(Base):
    __tablename__ = "practice_slide_results"

    id = Column(Integer, primary_key=True, index=True)
    practice_session_id = Column(Integer, ForeignKey("practice_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    slide_id = Column(Integer, ForeignKey("slides.id", ondelete="CASCADE"), nullable=False, index=True)

    transcript = Column(Text, default="", nullable=False)
    duration_seconds = Column(Integer, default=0, nullable=False)
    words_spoken = Column(Integer, default=0, nullable=False)
    words_per_minute = Column(Float, nullable=True)

    completion_status = Column(String(50), default="skipped", nullable=False)  # completed, skipped
    score = Column(Float, nullable=True)
    feedback = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    practice_session = relationship("PracticeSession", back_populates="slide_results")
    slide = relationship("Slide")
