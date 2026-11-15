from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class PracticeSessionCreate(BaseModel):
    presentation_id: int = Field(..., description="Target presentation ID")

class PracticeSlideResultUpdate(BaseModel):
    transcript: str = Field("", description="Real spoken transcript captured via Speech Recognition")
    duration_seconds: int = Field(0, ge=0, description="Time spent on this slide in seconds")
    completion_status: str = Field("completed", description="completion_status: 'completed' or 'skipped'")

class PracticeSlideResultResponse(BaseModel):
    id: int
    practice_session_id: int
    slide_id: int
    transcript: str
    duration_seconds: int
    words_spoken: int
    words_per_minute: Optional[float] = None
    completion_status: str
    score: Optional[float] = None
    feedback: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PracticeSessionResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    guest_session_id: Optional[str] = None
    presentation_id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: int
    total_slides: int
    completed_slides: int
    status: str
    overall_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PracticeSlideEvaluation(BaseModel):
    slide_number: int = Field(..., description="1-indexed slide number")
    score: float = Field(..., ge=0, le=100, description="Slide delivery score from 0 to 100")
    what_went_well: str = Field(..., description="Praise for good points delivered in speaker notes")
    what_to_improve: str = Field(..., description="Actionable advice to enhance delivery of this slide")
    missing_points: List[str] = Field(default_factory=list, description="Key bullet points or concepts from slide missed in user speech")
    pacing_feedback: str = Field(..., description="Feedback on speaking speed and timing for this slide")

class PracticeEvaluation(BaseModel):
    overall_score: float = Field(..., ge=0, le=100, description="Weighted average overall practice score from 0 to 100")
    delivery_score: float = Field(..., ge=0, le=100, description="Fluency, vocal confidence, and pacing score")
    content_score: float = Field(..., ge=0, le=100, description="Accuracy and alignment with presentation bullet points")
    structure_score: float = Field(..., ge=0, le=100, description="Logical flow and transition quality")
    clarity_score: float = Field(..., ge=0, le=100, description="Language clarity and vocabulary precision")
    timing_score: float = Field(..., ge=0, le=100, description="Pacing and time allocation effectiveness")
    strengths: List[str] = Field(default_factory=list, description="Top 3 key strengths observed during practice")
    weaknesses: List[str] = Field(default_factory=list, description="Top 3 key areas needing improvement")
    recommendations: List[str] = Field(default_factory=list, description="Specific actionable steps for next practice session")
    slide_feedback: List[PracticeSlideEvaluation] = Field(default_factory=list, description="Detailed per-slide evaluations")
    summary: str = Field(..., description="Comprehensive summary feedback in the presentation language")

class PracticeComparison(BaseModel):
    previous_session_id: Optional[int] = None
    previous_score: Optional[float] = None
    score_delta: Optional[float] = None
    previous_wpm: Optional[float] = None
    wpm_delta: Optional[float] = None
    previous_completion_rate: Optional[float] = None
    completion_rate_delta: Optional[float] = None

class PracticeMetrics(BaseModel):
    total_speaking_time_seconds: int
    total_words_spoken: int
    average_wpm: Optional[float] = None
    completion_percentage: float

class PracticeReportResponse(BaseModel):
    session: PracticeSessionResponse
    presentation_title: str
    language: str
    metrics: PracticeMetrics
    evaluation: Optional[PracticeEvaluation] = None
    slide_results: List[PracticeSlideResultResponse] = []
    comparison: Optional[PracticeComparison] = None

class PracticeHistoryItem(BaseModel):
    id: int
    presentation_id: int
    presentation_title: str
    language: str
    started_at: datetime
    duration_seconds: int
    overall_score: Optional[float] = None
    status: str
    completed_slides: int
    total_slides: int
