from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Presentation(Base):
    __tablename__ = "presentations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    guest_session_id = Column(String(255), ForeignKey("guest_sessions.session_id", ondelete="CASCADE"), nullable=True, index=True)
    
    title = Column(String(255), nullable=False)
    source_type = Column(String(50), nullable=False)  # 'prompt' or 'document'
    source_name = Column(String(255), nullable=True)
    language = Column(String(50), nullable=False, default="English")
    audience = Column(String(100), nullable=True)
    presentation_type = Column(String(100), nullable=True)
    tone = Column(String(50), nullable=True)
    slide_count = Column(Integer, nullable=False, default=0)
    status = Column(String(50), nullable=False, default="draft")  # draft, ready, processing
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", backref="presentations")
    guest_session = relationship("GuestSession", backref="presentations")
    slides = relationship("Slide", back_populates="presentation", cascade="all, delete-orphan", order_by="Slide.slide_number")


class Slide(Base):
    __tablename__ = "slides"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    presentation_id = Column(Integer, ForeignKey("presentations.id", ondelete="CASCADE"), nullable=False, index=True)
    slide_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(JSON, nullable=False, default=dict)  # {"bullet_points": [...], "body": "..."}
    layout_type = Column(String(50), nullable=False, default="standard")
    speaker_notes = Column(Text, nullable=True)
    source_reference = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    presentation = relationship("Presentation", back_populates="slides")
