import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.health import router as health_router
from app.api.ai_microservice import router as ai_router

# Configure Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("presentai.ai_microservice")

app = FastAPI(
    title="PresentAI - AI & Processing Microservice",
    version="2.0.0",
    openapi_url="/openapi.json",
    docs_url="/docs"
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Microservice Routers
app.include_router(health_router, prefix="/api", tags=["Health"])
app.include_router(ai_router)

@app.get("/")
def root():
    return {
        "service": "PresentAI Python AI & Document Processing Microservice",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }
