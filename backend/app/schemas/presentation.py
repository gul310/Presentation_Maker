from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

SourceType = Literal["prompt", "document"]

class SourceNormalization(BaseModel):
    source_type: SourceType
    normalized_content: str = Field(..., min_length=1, max_length=50000)
    source_name: Optional[str] = None
    language: str = Field("English", min_length=2, max_length=50)
    slide_count: int = Field(5, ge=1, le=30)
    audience: Optional[str] = Field("General", max_length=100)
    presentation_type: Optional[str] = Field("Informative", max_length=100)
    tone: Optional[str] = Field("Professional", max_length=50)

class DocumentSection(BaseModel):
    section_number: int
    title: str
    content: str

class DocumentContentResponse(BaseModel):
    filename: str
    file_type: str
    file_size_bytes: int
    character_count: int
    word_count: int
    page_or_slide_count: int
    extracted_text_preview: str
    sections: List[DocumentSection]

class SlideCreate(BaseModel):
    slide_number: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=255)
    content: Dict[str, Any] = Field(default_factory=dict)
    layout_type: str = Field("standard", max_length=50)
    speaker_notes: Optional[str] = None
    source_reference: Optional[str] = None

class SlideUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[Dict[str, Any]] = None
    layout_type: Optional[str] = Field(None, max_length=50)
    speaker_notes: Optional[str] = None
    source_reference: Optional[str] = None

class SlideReorderItem(BaseModel):
    slide_id: int
    new_slide_number: int

class SlideReorderRequest(BaseModel):
    reordered_slides: List[SlideReorderItem]

class SlideResponse(BaseModel):
    id: int
    presentation_id: int
    slide_number: int
    title: str
    content: Dict[str, Any]
    layout_type: str
    speaker_notes: Optional[str] = None
    source_reference: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PresentationCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    source_type: SourceType
    source_name: Optional[str] = None
    source_content: str = Field(..., min_length=1)
    language: str = Field("English", min_length=2, max_length=50)
    audience: Optional[str] = Field("General", max_length=100)
    presentation_type: Optional[str] = Field("Informative", max_length=100)
    tone: Optional[str] = Field("Professional", max_length=50)
    slide_count: int = Field(5, ge=1, le=30)

class PresentationGenerateRequest(BaseModel):
    source_type: SourceType
    prompt: str = Field(..., min_length=1, description="Prompt topic or document extracted text")
    source_name: Optional[str] = Field(None, max_length=255)
    slide_count: int = Field(6, ge=1, le=30)
    language: str = Field("English", min_length=2, max_length=50)
    audience: Optional[str] = Field("General", max_length=100)
    presentation_type: Optional[str] = Field("Informative", max_length=100)
    tone: Optional[str] = Field("Professional", max_length=50)
    ai_provider: Optional[str] = Field(None, description="Optional override for AI provider ('gemini' or 'deepseek')")




class PresentationUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    language: Optional[str] = None
    audience: Optional[str] = None
    presentation_type: Optional[str] = None
    tone: Optional[str] = None
    status: Optional[str] = None

class PresentationResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    guest_session_id: Optional[str] = None
    title: str
    source_type: str
    source_name: Optional[str] = None
    language: str
    audience: Optional[str] = None
    presentation_type: Optional[str] = None
    tone: Optional[str] = None
    slide_count: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PresentationDetailResponse(PresentationResponse):
    slides: List[SlideResponse] = []

    class Config:
        from_attributes = True

class KeyTermItem(BaseModel):
    term: str = Field(..., description="Technical or difficult term from the slide")
    definition: str = Field(..., description="Clear student-friendly explanation of the term")

class AITeachMeExplanation(BaseModel):
    explanation: str = Field(..., description="Comprehensive student-friendly explanation of what the slide teaches")
    key_terms: List[KeyTermItem] = Field(default_factory=list, description="Key terms and definitions from the slide")
    simple_example: Optional[str] = Field(None, description="Real-world example or intuitive analogy")
    summary: str = Field(..., description="Quick takeaway or main lesson of this slide")

class SlideTeachMeResponse(BaseModel):
    presentation_id: int
    slide_id: int
    slide_title: str
    explanation: str
    key_terms: List[KeyTermItem]
    simple_example: Optional[str] = None
    summary: str
    language: str

class SlideRefineRequest(BaseModel):
    action: str = Field(..., description="Refinement action e.g. improve, shorten, expand, simplify, make_more_professional, rewrite")
    custom_instruction: Optional[str] = Field(None, max_length=500)

class RefinedSlideResponse(BaseModel):
    title: str = Field(..., description="Refined concise slide title")
    subtitle: Optional[str] = Field(None, description="Refined slide subtitle if applicable")
    bullet_points: List[str] = Field(..., description="Refined, clear bullet points")
    speaker_notes: Optional[str] = Field(None, description="Refined spoken speaker notes")

class PresentationRenameRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)

class TranslateSlideRequest(BaseModel):
    slide_title: str
    slide_content: Any = Field(default_factory=dict)
    speaker_notes: Optional[str] = None
    source_language: str = "English"
    target_language: str = "Urdu"
    ai_provider: Optional[str] = None

class TranslatedSlideResponse(BaseModel):
    title: str
    content: Any = Field(default_factory=dict)
    speaker_notes: Optional[str] = None
    target_language: str


