from fastapi import APIRouter, Depends, File, UploadFile, status, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.config import settings
from app.api.deps import get_auth_or_guest_context, AuthOrGuestContext
from app.schemas.presentation import (
    DocumentContentResponse,
    PresentationCreate,
    PresentationGenerateRequest,
    PresentationUpdate,
    PresentationResponse,
    PresentationDetailResponse,
    SlideCreate,
    SlideUpdate,
    SlideReorderRequest,
    SlideResponse,
    SlideTeachMeResponse,
    SlideRefineRequest,
    PresentationRenameRequest
)

from app.services.presentation_service import (
    create_presentation_record,
    generate_presentation_ai_flow,
    get_presentations,
    get_presentation_or_404,
    update_presentation_metadata,
    verify_presentation_ownership,
    delete_presentation_record,
    add_slide_to_presentation,
    update_slide_record,
    delete_slide_record,
    reorder_presentation_slides
)
from app.services.document_service import process_document_upload
from app.services.ai_service import generate_slide_teach_me



router = APIRouter()

@router.post("/upload-source", response_model=DocumentContentResponse)
async def upload_document_source(
    file: UploadFile = File(...)
):
    """Processes document upload (PDF, DOCX, PPTX) and returns extracted structured metadata."""
    return await process_document_upload(file)

@router.post("/generate", response_model=PresentationDetailResponse, status_code=status.HTTP_201_CREATED)
def generate_presentation_ai(
    gen_in: PresentationGenerateRequest,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Generates structured presentation deck using Google Gemini Free Tier."""
    return generate_presentation_ai_flow(
        db=db,
        gen_in=gen_in,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

@router.post("", response_model=PresentationDetailResponse, status_code=status.HTTP_201_CREATED)
def create_presentation(

    presentation_in: PresentationCreate,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Creates a new Presentation record with populated initial slides."""
    return create_presentation_record(
        db=db,
        presentation_in=presentation_in,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

@router.get("", response_model=List[PresentationResponse])
def list_presentations(
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Retrieves all presentations belonging to current user or guest session."""
    return get_presentations(
        db=db,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

@router.get("/{id}", response_model=PresentationDetailResponse)
def get_presentation(
    id: int,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Retrieves presentation detail with full slide deck."""
    return get_presentation_or_404(
        db=db,
        presentation_id=id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

@router.put("/{id}", response_model=PresentationResponse)
def update_presentation(
    id: int,
    presentation_in: PresentationUpdate,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Updates presentation metadata."""
    return update_presentation_metadata(
        db=db,
        presentation_id=id,
        presentation_in=presentation_in,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_presentation(
    id: int,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Deletes presentation and all cascading slides."""
    delete_presentation_record(
        db=db,
        presentation_id=id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )
    return None

# --- Slide Endpoints ---

@router.post("/{id}/slides", response_model=SlideResponse, status_code=status.HTTP_201_CREATED)
def create_slide(
    id: int,
    slide_in: SlideCreate,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Adds a new slide to specified presentation."""
    return add_slide_to_presentation(
        db=db,
        presentation_id=id,
        slide_in=slide_in,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

@router.put("/{id}/slides/{slide_id}", response_model=SlideResponse)
def update_slide(
    id: int,
    slide_id: int,
    slide_in: SlideUpdate,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Updates slide title, content, layout type, speaker notes, or source reference."""
    return update_slide_record(
        db=db,
        presentation_id=id,
        slide_id=slide_id,
        slide_in=slide_in,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

@router.delete("/{id}/slides/{slide_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_slide(
    id: int,
    slide_id: int,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Deletes slide from presentation."""
    delete_slide_record(
        db=db,
        presentation_id=id,
        slide_id=slide_id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )
    return None

@router.post("/{id}/reorder", response_model=List[SlideResponse])
def reorder_slides(
    id: int,
    reorder_in: SlideReorderRequest,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Reorders slide sequence in specified presentation."""
    return reorder_presentation_slides(
        db=db,
        presentation_id=id,
        reordered_items=reorder_in.reordered_slides,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

@router.post("/{id}/slides/{slide_id}/teach", response_model=SlideTeachMeResponse)
def teach_slide(
    id: int,
    slide_id: int,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Generates a student-friendly educational explanation for a slide using Gemini AI."""
    presentation = get_presentation_or_404(
        db=db,
        presentation_id=id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )


    from app.models.presentation import Slide
    slide = db.query(Slide).filter(Slide.id == slide_id, Slide.presentation_id == id).first()
    if not slide:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Slide with id {slide_id} not found in presentation {id}."
        )

    # Format slide content text for AI prompt
    content_text = f"Title: {slide.title}\n"
    if isinstance(slide.content, dict):
        if slide.content.get("subtitle"):
            content_text += f"Subtitle: {slide.content.get('subtitle')}\n"
        if slide.content.get("bullet_points"):
            content_text += "Bullet Points:\n" + "\n".join([f"- {bp}" for bp in slide.content.get("bullet_points")])
    elif slide.content:
        content_text += str(slide.content)

    if slide.speaker_notes:
        content_text += f"\nSpeaker Notes Context: {slide.speaker_notes}"

    ai_result = generate_slide_teach_me(
        slide_title=slide.title,
        slide_content_text=content_text,
        language=presentation.language,
        audience=presentation.audience,
        ai_provider=settings.AI_PROVIDER
    )

    return SlideTeachMeResponse(
        presentation_id=id,
        slide_id=slide_id,
        slide_title=slide.title,
        explanation=ai_result.explanation,
        key_terms=ai_result.key_terms,
        simple_example=ai_result.simple_example,
        summary=ai_result.summary,
        language=presentation.language
    )

# --- Real Presentation Export Endpoints ---

@router.get("/{id}/export/pptx")
def export_pptx(
    id: int,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Exports presentation to a real PowerPoint (.pptx) file."""
    presentation = get_presentation_or_404(
        db=db,
        presentation_id=id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

    color_theme = ctx.user.app_color_theme if ctx.user else None
    custom_color = ctx.user.custom_primary_color if ctx.user else None

    from app.services.export_service import export_presentation_to_pptx, sanitize_filename
    file_bytes = export_presentation_to_pptx(presentation, color_theme=color_theme, custom_color=custom_color)
    filename = sanitize_filename(presentation.title, "pptx")

    from fastapi.responses import Response
    return Response(
        content=file_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/{id}/export/pdf")
def export_pdf(
    id: int,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Exports presentation to a real PDF document."""
    presentation = get_presentation_or_404(
        db=db,
        presentation_id=id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

    color_theme = ctx.user.app_color_theme if ctx.user else None
    custom_color = ctx.user.custom_primary_color if ctx.user else None

    from app.services.export_service import export_presentation_to_pdf, sanitize_filename
    file_bytes = export_presentation_to_pdf(presentation, color_theme=color_theme, custom_color=custom_color)
    filename = sanitize_filename(presentation.title, "pdf")

    from fastapi.responses import Response
    return Response(
        content=file_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/{id}/export/json")
def export_json(
    id: int,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Exports structured JSON backup of presentation."""
    presentation = get_presentation_or_404(
        db=db,
        presentation_id=id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

    from app.services.export_service import export_presentation_to_json, sanitize_filename
    file_bytes = export_presentation_to_json(presentation)
    filename = sanitize_filename(presentation.title, "json")

    from fastapi.responses import Response
    return Response(
        content=file_bytes,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/{id}/export/notes")
def export_notes(
    id: int,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Exports plain text speaker notes for all slides."""
    presentation = get_presentation_or_404(
        db=db,
        presentation_id=id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

    from app.services.export_service import export_presentation_to_notes, sanitize_filename
    file_bytes = export_presentation_to_notes(presentation)
    filename = sanitize_filename(f"{presentation.title}_Speaker_Notes", "txt")

    from fastapi.responses import Response
    return Response(
        content=file_bytes,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/{id}/export/png")
def export_png(
    id: int,
    slide: int = None,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Exports slide as high-resolution PNG or whole deck as ZIP of PNGs."""
    presentation = get_presentation_or_404(
        db=db,
        presentation_id=id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

    color_theme = ctx.user.app_color_theme if ctx.user else None
    custom_color = ctx.user.custom_primary_color if ctx.user else None

    from app.services.export_service import export_presentation_to_png
    file_bytes, filename, media_type = export_presentation_to_png(
        presentation=presentation,
        slide_number=slide,
        color_theme=color_theme,
        custom_color=custom_color
    )

    from fastapi.responses import Response
    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/{id}/export/html")
def export_html(
    id: int,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Exports standalone Interactive HTML Presentation."""
    presentation = get_presentation_or_404(
        db=db,
        presentation_id=id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

    color_theme = ctx.user.app_color_theme if ctx.user else None
    custom_color = ctx.user.custom_primary_color if ctx.user else None

    from app.services.export_service import export_presentation_to_html, sanitize_filename
    file_bytes = export_presentation_to_html(presentation, color_theme=color_theme, custom_color=custom_color)
    filename = sanitize_filename(f"{presentation.title}_Interactive", "html")

    from fastapi.responses import Response
    return Response(
        content=file_bytes,
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/{id}/export/package")
def export_package(
    id: int,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Exports full Interactive Web/Mobile Presentation Package ZIP archive."""
    presentation = get_presentation_or_404(
        db=db,
        presentation_id=id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

    color_theme = ctx.user.app_color_theme if ctx.user else None
    custom_color = ctx.user.custom_primary_color if ctx.user else None

    from app.services.export_service import export_presentation_to_package_zip, sanitize_filename
    file_bytes = export_presentation_to_package_zip(presentation, color_theme=color_theme, custom_color=custom_color)
    filename = sanitize_filename(f"{presentation.title}_Interactive_Package", "zip")

    from fastapi.responses import Response
    return Response(
        content=file_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# --- Real AI Slide Refinement Endpoint ---

@router.post("/{id}/slides/{slide_id}/refine", response_model=SlideResponse)
def refine_slide(
    id: int,
    slide_id: int,
    body: SlideRefineRequest,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Uses Gemini AI to refine a slide's content and persists the refined slide to MySQL."""
    presentation = get_presentation_or_404(
        db=db,
        presentation_id=id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

    from app.models.presentation import Slide
    slide = db.query(Slide).filter(
        Slide.id == slide_id,
        Slide.presentation_id == id
    ).first()

    if not slide:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "SLIDE_NOT_FOUND", "message": f"Slide {slide_id} not found."}
        )

    content_str = ""
    if isinstance(slide.content, dict):
        if slide.content.get("subtitle"):
            content_str += f"Subtitle: {slide.content.get('subtitle')}\n"
        if slide.content.get("bullet_points"):
            content_str += "Bullet Points:\n" + "\n".join([f"- {bp}" for bp in slide.content.get("bullet_points")])
    elif slide.content:
        content_str += str(slide.content)

    if slide.speaker_notes:
        content_str += f"\nCurrent Speaker Notes: {slide.speaker_notes}"

    from app.services.ai_service import refine_slide_content
    refined_result = refine_slide_content(
        slide_title=slide.title,
        current_content=content_str,
        action=body.action,
        custom_instruction=body.custom_instruction,
        language=presentation.language,
        audience=presentation.audience,
        ai_provider=settings.AI_PROVIDER
    )

    # Persist validated AI output to MySQL
    slide.title = refined_result.title
    updated_content = dict(slide.content) if isinstance(slide.content, dict) else {}
    if refined_result.subtitle is not None:
        updated_content["subtitle"] = refined_result.subtitle
    if refined_result.bullet_points:
        updated_content["bullet_points"] = refined_result.bullet_points
    slide.content = updated_content

    if refined_result.speaker_notes:
        slide.speaker_notes = refined_result.speaker_notes

    db.commit()
    db.refresh(slide)
    return slide

# --- Presentation Duplication Endpoint ---

@router.post("/{id}/duplicate", response_model=PresentationResponse, status_code=status.HTTP_201_CREATED)
def duplicate_presentation(
    id: int,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Duplicates a presentation and all associated slides in MySQL."""
    original = get_presentation_or_404(
        db=db,
        presentation_id=id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

    from app.models.presentation import Presentation, Slide
    new_pres = Presentation(
        user_id=original.user_id,
        guest_session_id=original.guest_session_id,
        title=f"Copy of {original.title}",
        source_type=original.source_type,
        source_name=original.source_name,
        language=original.language,
        audience=original.audience,
        presentation_type=original.presentation_type,
        tone=original.tone,
        slide_count=original.slide_count,
        status=original.status
    )
    db.add(new_pres)
    db.commit()
    db.refresh(new_pres)

    # Clone all slides
    original_slides = sorted(original.slides, key=lambda s: s.slide_number)
    for s in original_slides:
        new_slide = Slide(
            presentation_id=new_pres.id,
            slide_number=s.slide_number,
            title=s.title,
            content=s.content,
            layout_type=s.layout_type,
            speaker_notes=s.speaker_notes,
            source_reference=s.source_reference
        )
        db.add(new_slide)

    db.commit()
    db.refresh(new_pres)
    return new_pres

# --- Presentation Rename Endpoint ---

@router.put("/{id}/rename", response_model=PresentationResponse)
def rename_presentation(
    id: int,
    body: PresentationRenameRequest,
    ctx: AuthOrGuestContext = Depends(get_auth_or_guest_context),
    db: Session = Depends(get_db)
):
    """Renames a presentation in MySQL."""
    presentation = get_presentation_or_404(
        db=db,
        presentation_id=id,
        user_id=ctx.user_id,
        guest_session_id=ctx.guest_session_id
    )

    presentation.title = body.title.strip()
    db.commit()
    db.refresh(presentation)
    return presentation



