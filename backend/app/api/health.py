from fastapi import APIRouter
from datetime import datetime, timezone
from app.core.config import settings

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ai_providers": {
            "primary": getattr(settings, "AI_PRIMARY_PROVIDER", "gemini"),
            "fallback": getattr(settings, "AI_FALLBACK_PROVIDER", "groq"),
            "fallback_enabled": getattr(settings, "AI_FALLBACK_ENABLED", True),
            "gemini_configured": bool(settings.GEMINI_API_KEY),
            "gemini_model": settings.GEMINI_MODEL_NAME,
            "groq_configured": bool(getattr(settings, "GROQ_API_KEY", "")),
            "groq_model": getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile"),
            "deepseek_configured": bool(settings.DEEPSEEK_API_KEY)
        }
    }
