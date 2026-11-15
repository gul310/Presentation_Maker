from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.presentation import Presentation, Slide
from app.models.user import User
from app.schemas.presentation import (
    PresentationCreate,
    PresentationUpdate,
    SlideCreate,
    SlideUpdate,
    SlideReorderItem,
    SourceNormalization
)

def normalize_source_input(source_type: str, content: str, title: str, slide_count: int, language: str, audience: str, presentation_type: str, tone: str) -> SourceNormalization:
    """Validates and normalizes presentation prompt or document input."""
    cleaned_content = content.strip()
    if not cleaned_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source content cannot be empty."
        )
        
    return SourceNormalization(
        source_type="document" if source_type == "document" else "prompt",
        normalized_content=cleaned_content,
        source_name=title,
        language=language or "English",
        slide_count=max(1, min(30, slide_count or 5)),
        audience=audience or "General",
        presentation_type=presentation_type or "Informative",
        tone=tone or "Professional"
    )

def verify_presentation_ownership(
    presentation: Presentation,
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> None:
    """Enforces strict ownership access control for presentations."""
    if user_id is not None:
        if presentation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You do not own this presentation."
            )
    elif guest_session_id is not None:
        if presentation.guest_session_id != guest_session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. This presentation belongs to another guest session."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication or valid guest session required."
        )

def get_presentation_or_404(
    db: Session,
    presentation_id: int,
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> Presentation:
    """Fetches presentation by ID and validates ownership."""
    presentation = db.query(Presentation).filter(Presentation.id == presentation_id).first()
    if not presentation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found."
        )
    verify_presentation_ownership(presentation, user_id=user_id, guest_session_id=guest_session_id)
    return presentation

def create_presentation_record(
    db: Session,
    presentation_in: PresentationCreate,
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> Presentation:
    """Creates a new Presentation record and populates initial slides from source."""
    norm = normalize_source_input(
        source_type=presentation_in.source_type,
        content=presentation_in.source_content,
        title=presentation_in.title,
        slide_count=presentation_in.slide_count,
        language=presentation_in.language,
        audience=presentation_in.audience or "General",
        presentation_type=presentation_in.presentation_type or "Informative",
        tone=presentation_in.tone or "Professional"
    )

    if user_id is None and guest_session_id is not None:
        from app.services.guest_service import get_or_create_guest_session
        get_or_create_guest_session(db, guest_session_id)

    db_presentation = Presentation(
        user_id=user_id,
        guest_session_id=guest_session_id if user_id is None else None,

        title=presentation_in.title,
        source_type=norm.source_type,
        source_name=presentation_in.source_name or presentation_in.title,
        language=norm.language,
        audience=norm.audience,
        presentation_type=norm.presentation_type,
        tone=norm.tone,
        slide_count=norm.slide_count,
        status="ready"
    )
    db.add(db_presentation)
    db.commit()
    db.refresh(db_presentation)

    # Generate real initial slide structure based on normalized content & requested slide count
    slides_to_create: List[Slide] = []
    
    # 1. Title Slide
    slides_to_create.append(Slide(
        presentation_id=db_presentation.id,
        slide_number=1,
        title=db_presentation.title,
        layout_type="title",
        content={
            "subtitle": f"A {norm.tone.lower()} {norm.presentation_type.lower()} presentation for {norm.audience.lower()} audience",
            "bullet_points": []
        },
        speaker_notes=f"Welcome everyone. Today we are presenting '{db_presentation.title}'.",
        source_reference="Overview"
    ))

    # Parse content paragraphs for content slides
    raw_lines = [line.strip() for line in norm.normalized_content.split("\n") if line.strip()]
    content_slides_count = max(1, norm.slide_count - 2)  # Leave room for Title & Conclusion
    
    lines_per_slide = max(1, len(raw_lines) // content_slides_count) if raw_lines else 1

    for i in range(content_slides_count):
        slide_num = i + 2
        chunk = raw_lines[i * lines_per_slide : (i + 1) * lines_per_slide]
        
        slide_title = chunk[0][:60] if chunk else f"Key Topic {i + 1}"
        bullets = chunk[1:] if len(chunk) > 1 else chunk if chunk else [f"Point 1 regarding {db_presentation.title}", f"Point 2 regarding {db_presentation.title}"]
        
        slides_to_create.append(Slide(
            presentation_id=db_presentation.id,
            slide_number=slide_num,
            title=slide_title,
            layout_type="standard",
            content={
                "subtitle": f"Section {i + 1}",
                "bullet_points": bullets[:5]
            },
            speaker_notes=f"In this slide we cover: {slide_title}.",
            source_reference=f"Section {i + 1}"
        ))

    # Conclusion Slide
    slides_to_create.append(Slide(
        presentation_id=db_presentation.id,
        slide_number=len(slides_to_create) + 1,
        title="Summary & Next Steps",
        layout_type="conclusion",
        content={
            "subtitle": "Key Takeaways & Discussion",
            "bullet_points": [
                f"Summary of key insights on {db_presentation.title}",
                "Open floor for Q&A and feedback"
            ]
        },
        speaker_notes="Thank you for your time. Are there any questions?",
        source_reference="Conclusion"
    ))

    for s in slides_to_create:
        db.add(s)

    db_presentation.slide_count = len(slides_to_create)
    db.commit()
    db.refresh(db_presentation)
    return db_presentation

def get_presentations(
    db: Session,
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> List[Presentation]:
    """Retrieves all presentations belonging to current user or guest session."""
    query = db.query(Presentation)
    if user_id is not None:
        query = query.filter(Presentation.user_id == user_id)
    elif guest_session_id is not None:
        query = query.filter(Presentation.guest_session_id == guest_session_id)
    else:
        return []
    return query.order_by(Presentation.created_at.desc()).all()

def update_presentation_metadata(
    db: Session,
    presentation_id: int,
    presentation_in: PresentationUpdate,
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> Presentation:
    """Updates presentation metadata."""
    presentation = get_presentation_or_404(db, presentation_id, user_id, guest_session_id)
    
    if presentation_in.title is not None:
        presentation.title = presentation_in.title
    if presentation_in.language is not None:
        presentation.language = presentation_in.language
    if presentation_in.audience is not None:
        presentation.audience = presentation_in.audience
    if presentation_in.presentation_type is not None:
        presentation.presentation_type = presentation_in.presentation_type
    if presentation_in.tone is not None:
        presentation.tone = presentation_in.tone
    if presentation_in.status is not None:
        presentation.status = presentation_in.status

    db.commit()
    db.refresh(presentation)
    return presentation

def delete_presentation_record(
    db: Session,
    presentation_id: int,
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> None:
    """Deletes presentation and all associated slides."""
    presentation = get_presentation_or_404(db, presentation_id, user_id, guest_session_id)
    db.delete(presentation)
    db.commit()

# --- Slide CRUD ---

def add_slide_to_presentation(
    db: Session,
    presentation_id: int,
    slide_in: SlideCreate,
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> Slide:
    """Adds a new slide to a presentation."""
    presentation = get_presentation_or_404(db, presentation_id, user_id, guest_session_id)
    
    existing_count = db.query(Slide).filter(Slide.presentation_id == presentation_id).count()
    slide_num = slide_in.slide_number if slide_in.slide_number else existing_count + 1

    new_slide = Slide(
        presentation_id=presentation.id,
        slide_number=slide_num,
        title=slide_in.title,
        content=slide_in.content or {"subtitle": "", "bullet_points": ["New slide point"]},
        layout_type=slide_in.layout_type or "standard",
        speaker_notes=slide_in.speaker_notes,
        source_reference=slide_in.source_reference
    )
    db.add(new_slide)
    
    # Update presentation slide_count
    presentation.slide_count = existing_count + 1
    db.commit()
    db.refresh(new_slide)
    db.refresh(presentation)
    return new_slide

def update_slide_record(
    db: Session,
    presentation_id: int,
    slide_id: int,
    slide_in: SlideUpdate,
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> Slide:
    """Updates slide title, content, layout type, speaker notes, or source reference."""
    get_presentation_or_404(db, presentation_id, user_id, guest_session_id)
    
    slide = db.query(Slide).filter(Slide.id == slide_id, Slide.presentation_id == presentation_id).first()
    if not slide:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Slide not found in this presentation."
        )

    if slide_in.title is not None:
        slide.title = slide_in.title
    if slide_in.content is not None:
        slide.content = slide_in.content
    if slide_in.layout_type is not None:
        slide.layout_type = slide_in.layout_type
    if slide_in.speaker_notes is not None:
        slide.speaker_notes = slide_in.speaker_notes
    if slide_in.source_reference is not None:
        slide.source_reference = slide_in.source_reference

    db.commit()
    db.refresh(slide)
    return slide

def delete_slide_record(
    db: Session,
    presentation_id: int,
    slide_id: int,
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> None:
    """Deletes slide from presentation and re-sequences slide numbers."""
    presentation = get_presentation_or_404(db, presentation_id, user_id, guest_session_id)
    
    slide = db.query(Slide).filter(Slide.id == slide_id, Slide.presentation_id == presentation_id).first()
    if not slide:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Slide not found."
        )

    db.delete(slide)
    db.commit()

    # Re-sequence slide_numbers
    remaining_slides = db.query(Slide).filter(Slide.presentation_id == presentation_id).order_by(Slide.slide_number).all()
    for idx, s in enumerate(remaining_slides, start=1):
        s.slide_number = idx
    
    presentation.slide_count = len(remaining_slides)
    db.commit()

def reorder_presentation_slides(
    db: Session,
    presentation_id: int,
    reordered_items: List[SlideReorderItem],
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> List[Slide]:
    """Reorders slide sequence in presentation."""
    presentation = get_presentation_or_404(db, presentation_id, user_id, guest_session_id)
    
    slide_map = {item.slide_id: item.new_slide_number for item.reorder in [reordered_items] for item in item.reorder} if hasattr(reordered_items, 'reorder') else {item.slide_id: item.new_slide_number for item in reordered_items}

    slides = db.query(Slide).filter(Slide.presentation_id == presentation_id).all()
    for s in slides:
        if s.id in slide_map:
            s.slide_number = slide_map[s.id]

    db.commit()
    
    updated_slides = db.query(Slide).filter(Slide.presentation_id == presentation_id).order_by(Slide.slide_number).all()
    return updated_slides

def generate_presentation_ai_flow(
    db: Session,
    gen_in: "PresentationGenerateRequest",
    user_id: Optional[int],
    guest_session_id: Optional[str]
) -> Presentation:
    """Executes AI presentation generation flow using Google Gemini Free Tier."""
    from app.services.ai_service import generate_presentation_deck_ai
    from app.services.guest_service import process_guest_generation_attempt

    # Enforce Phase 2 Guest Limit if user is unauthenticated
    if user_id is None:
        if not guest_session_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Guest session ID required for anonymous presentation generation."
            )
        attempt_res = process_guest_generation_attempt(db, guest_session_id)
        if not attempt_res["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=attempt_res
            )

    # Detect language: explicit selection has priority, fallback to auto-detection if not specified
    detected_lang = gen_in.language
    if not detected_lang:
        detected_lang = "English"
        import re
        arabic_script_pattern = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]')
        if arabic_script_pattern.search(gen_in.prompt) or re.search(r'\burdu\b', gen_in.prompt, re.IGNORECASE):
            detected_lang = "Urdu"

    # Call AI service (raises 503 if provider API key is unconfigured, or 502/422/429 if API call fails)
    ai_result = generate_presentation_deck_ai(
        source_type=gen_in.source_type,
        source_content=gen_in.prompt,
        title_hint=gen_in.source_name,
        slide_count=gen_in.slide_count,
        language=detected_lang,
        audience=gen_in.audience or "General",
        presentation_type=gen_in.presentation_type or "Informative",
        tone=gen_in.tone or "Professional",
        ai_provider=getattr(gen_in, "ai_provider", None)
    )


    # Persist Presentation record to MySQL
    db_presentation = Presentation(
        user_id=user_id,
        guest_session_id=guest_session_id if user_id is None else None,
        title=ai_result.title or gen_in.source_name or gen_in.prompt[:60],
        source_type=gen_in.source_type,
        source_name=gen_in.source_name or "AI Generated Deck",
        language=detected_lang,
        audience=gen_in.audience or "General",
        presentation_type=gen_in.presentation_type or "Informative",
        tone=gen_in.tone or "Professional",
        slide_count=len(ai_result.slides),
        status="ready"
    )
    db.add(db_presentation)
    db.commit()
    db.refresh(db_presentation)

    # Persist generated slides to MySQL
    slides_to_create: List[Slide] = []
    for idx, slide_item in enumerate(ai_result.slides, start=1):
        slides_to_create.append(Slide(
            presentation_id=db_presentation.id,
            slide_number=idx,
            title=slide_item.title,
            layout_type=slide_item.layout_type or ("title" if idx == 1 else "standard"),
            content={
                "subtitle": slide_item.subtitle or "",
                "bullet_points": slide_item.bullet_points or []
            },
            speaker_notes=slide_item.speaker_notes or "",
            source_reference=slide_item.source_reference or f"Slide {idx}"
        ))

    for s in slides_to_create:
        db.add(s)

    db.commit()
    db.refresh(db_presentation)
    return db_presentation

