from types import SimpleNamespace
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.services.ai_service import (
    generate_presentation_deck_ai,
    generate_slide_teach_me,
    refine_slide_content,
    evaluate_practice_session,
    translate_slide_ai,
    AIPresentationResult
)
from app.services.document_service import process_document_upload
from app.services.export_service import (
    export_presentation_to_pptx,
    export_presentation_to_pdf,
    export_presentation_to_png,
    export_presentation_to_html,
    export_presentation_to_json,
    export_presentation_to_notes,
    export_presentation_to_package_zip,
    sanitize_filename
)
from app.schemas.presentation import (
    DocumentContentResponse,
    RefinedSlideResponse,
    AITeachMeExplanation,
    TranslateSlideRequest,
    TranslatedSlideResponse
)
from app.schemas.practice import PracticeEvaluation

router = APIRouter(prefix="/ai", tags=["AI Microservice"])

import re
from urllib.parse import quote

# Helper to safely create RFC 5987 / RFC 6266 attachment headers for multilingual filenames
def make_attachment_header(filename: str) -> Dict[str, str]:
    safe_ascii = re.sub(r'[^\x20-\x7E]', '_', filename)
    encoded = quote(filename)
    return {"Content-Disposition": f"attachment; filename=\"{safe_ascii}\"; filename*=UTF-8''{encoded}"}

# Helper to recursively convert dicts to SimpleNamespace for object attribute access
def dict_to_obj(d: Any) -> Any:
    if isinstance(d, list):
        return [dict_to_obj(x) for x in d]
    elif isinstance(d, dict):
        ns = SimpleNamespace()
        for k, v in d.items():
            setattr(ns, k, dict_to_obj(v))
        return ns
    return d

# --- Request Schemas ---

class GenerateDeckRequest(BaseModel):
    source_type: str = "prompt"
    source_content: Optional[str] = None
    prompt: Optional[str] = None
    custom_prompt: Optional[str] = None
    title_hint: Optional[str] = None
    source_name: Optional[str] = None
    slide_count: int = 6
    language: str = "English"
    audience: str = "General"
    presentation_type: str = "Informative"
    tone: str = "Professional"
    ai_provider: Optional[str] = None

class TeachSlideRequest(BaseModel):
    slide_title: str
    slide_content_text: str
    language: str = "English"
    audience: Optional[str] = "General"
    ai_provider: Optional[str] = None

class RefineSlideRequest(BaseModel):
    slide_title: str
    current_content: str
    action: str = "improve_clarity"
    custom_instruction: Optional[str] = None
    language: str = "English"
    audience: Optional[str] = "General"
    ai_provider: Optional[str] = None

class EvaluatePracticeRequest(BaseModel):
    presentation_title: str
    language: str = "English"
    slide_eval_inputs: List[Dict[str, Any]]
    ai_provider: Optional[str] = None

from app.services.tts_service import tts_service

class SynthesizeTTSRequest(BaseModel):
    text: str
    language: str = "English"
    use_cache: bool = True

class ExportRequest(BaseModel):
    presentation: Dict[str, Any]
    user_theme: Optional[Dict[str, Any]] = None
    slide_number: Optional[int] = None
    export_language: Optional[str] = None

# --- Endpoints ---

@router.post("/generate", response_model=AIPresentationResult)
def generate_presentation(req: GenerateDeckRequest):
    """Generates structured presentation deck using configured backend AI service."""
    content = (req.source_content or req.prompt or "").strip()
    if not content:
        raise HTTPException(
            status_code=400,
            detail="Please enter a presentation topic or upload a document."
        )
    return generate_presentation_deck_ai(
        source_type=req.source_type,
        source_content=content,
        custom_prompt=req.custom_prompt,
        title_hint=req.title_hint or req.source_name,
        slide_count=req.slide_count,
        language=req.language,
        audience=req.audience,
        presentation_type=req.presentation_type,
        tone=req.tone,
        ai_provider=req.ai_provider
    )

@router.post("/upload-source", response_model=DocumentContentResponse)
async def upload_document(file: UploadFile = File(...)):
    """Extracts text, metadata, and structured sections from PDF, DOCX, or PPTX."""
    return await process_document_upload(file)

@router.post("/teach-slide", response_model=AITeachMeExplanation)
def teach_slide(req: TeachSlideRequest):
    """Generates educational explanation for a slide."""
    return generate_slide_teach_me(
        slide_title=req.slide_title,
        slide_content_text=req.slide_content_text,
        language=req.language,
        audience=req.audience,
        ai_provider=req.ai_provider
    )

@router.post("/refine-slide", response_model=RefinedSlideResponse)
def refine_slide(req: RefineSlideRequest):
    """Refines slide title, bullet points, and notes using AI."""
    return refine_slide_content(
        slide_title=req.slide_title,
        current_content=req.current_content,
        action=req.action,
        custom_instruction=req.custom_instruction,
        language=req.language,
        audience=req.audience,
        ai_provider=req.ai_provider
    )

@router.post("/evaluate-practice", response_model=PracticeEvaluation)
def evaluate_practice(req: EvaluatePracticeRequest):
    """Evaluates rehearsal speech transcripts against slide bullet points and notes."""
    return evaluate_practice_session(
        presentation_title=req.presentation_title,
        language=req.language,
        slide_eval_inputs=req.slide_eval_inputs,
        ai_provider=req.ai_provider
    )

@router.post("/translate-slide", response_model=TranslatedSlideResponse)
def translate_slide(req: TranslateSlideRequest):
    """Translates slide title, structured visual elements, and speaker notes into target language."""
    return translate_slide_ai(
        slide_title=req.slide_title,
        slide_content=req.slide_content,
        speaker_notes=req.speaker_notes,
        source_language=req.source_language,
        target_language=req.target_language,
        ai_provider=req.ai_provider
    )

@router.post("/export/{format}")
def export_presentation(format: str, req: ExportRequest):
    """Exports presentation to requested format (pptx, pdf, png, html, json, notes, package)."""
    fmt = format.lower()
    pres_obj = dict_to_obj(req.presentation)
    
    color_theme = req.user_theme.get("app_color_theme") if req.user_theme else None
    custom_color = req.user_theme.get("custom_primary_color") if req.user_theme else None
    title = getattr(pres_obj, "title", "Presentation")

    if fmt == "pptx":
        file_bytes = export_presentation_to_pptx(
            pres_obj,
            color_theme=color_theme,
            custom_color=custom_color,
            export_language=req.export_language
        )
        filename = sanitize_filename(title, "pptx")
        return Response(
            content=file_bytes,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers=make_attachment_header(filename)
        )
    elif fmt == "pdf":
        file_bytes = export_presentation_to_pdf(pres_obj, color_theme=color_theme, custom_color=custom_color)
        filename = sanitize_filename(title, "pdf")
        return Response(
            content=file_bytes,
            media_type="application/pdf",
            headers=make_attachment_header(filename)
        )
    elif fmt == "png":
        file_bytes, filename, media_type = export_presentation_to_png(
            presentation=pres_obj,
            slide_number=req.slide_number,
            color_theme=color_theme,
            custom_color=custom_color
        )
        return Response(
            content=file_bytes,
            media_type=media_type,
            headers=make_attachment_header(filename)
        )
    elif fmt == "html":
        file_bytes = export_presentation_to_html(pres_obj, color_theme=color_theme, custom_color=custom_color)
        filename = sanitize_filename(f"{title}_Interactive", "html")
        return Response(
            content=file_bytes,
            media_type="text/html; charset=utf-8",
            headers=make_attachment_header(filename)
        )
    elif fmt == "json":
        file_bytes = export_presentation_to_json(pres_obj)
        filename = sanitize_filename(title, "json")
        return Response(
            content=file_bytes,
            media_type="application/json",
            headers=make_attachment_header(filename)
        )
    elif fmt == "notes":
        file_bytes = export_presentation_to_notes(pres_obj)
        filename = sanitize_filename(f"{title}_Speaker_Notes", "txt")
        return Response(
            content=file_bytes,
            media_type="text/plain; charset=utf-8",
            headers=make_attachment_header(filename)
        )
    elif fmt in ("package", "zip"):
        file_bytes = export_presentation_to_package_zip(pres_obj, color_theme=color_theme, custom_color=custom_color)
        filename = sanitize_filename(f"{title}_Interactive_Package", "zip")
        return Response(
            content=file_bytes,
            media_type="application/zip",
            headers=make_attachment_header(filename)
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported export format '{format}'.")

@router.post("/tts/synthesize")
def synthesize_tts_audio(req: SynthesizeTTSRequest):
    """Synthesizes text into high-quality MP3 voice narration with caching."""
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is required for narration synthesis.")
    
    try:
        audio_bytes = tts_service.synthesize_speech(
            text=req.text,
            language=req.language,
            use_cache=req.use_cache
        )
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Type": "audio/mpeg",
                "Cache-Control": "public, max-age=86400"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")

@router.get("/tts/languages")
def get_tts_languages():
    """Returns list of supported TTS language codes."""
    return {"languages": tts_service.get_supported_languages()}
