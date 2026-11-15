from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="student") # student, teacher, researcher, professional
    country = Column(String(100), nullable=False, default="Global")
    interface_language = Column(String(50), nullable=False, default="English")
    presentation_language = Column(String(50), nullable=False, default="English")
    
    # Appearance Settings
    app_theme_mode = Column(String(20), nullable=False, default="dark") # light, dark, system
    app_color_theme = Column(String(50), nullable=False, default="indigo") # indigo, blue, purple, cyan, green, rose, orange, custom
    custom_primary_color = Column(String(20), nullable=True) # e.g. '#6366f1'
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
