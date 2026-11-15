import io
import os
import uuid
import logging
from typing import Tuple, List
from fastapi import HTTPException, UploadFile, status
from pypdf import PdfReader
import docx
from pptx import Presentation as PptxPresentation

from app.core.config import settings
from app.schemas.presentation import DocumentContentResponse, DocumentSection

logger = logging.getLogger("presentai.document_service")

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx"}

def validate_and_get_extension(filename: str) -> str:
    """Validates supported file extension."""
    if not filename or "." not in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File has no extension. Only PDF, DOCX, and PPTX are supported."
        )
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed extensions: PDF, DOCX, PPTX."
        )
    return ext

def extract_pdf_text(file_bytes: bytes) -> Tuple[str, List[DocumentSection], int]:
    """Extracts text from PDF bytes preserving page numbers."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        sections: List[DocumentSection] = []
        full_text_chunks: List[str] = []
        
        page_count = len(reader.pages)
        for idx, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text() or ""
            cleaned_text = page_text.strip()
            if cleaned_text:
                sections.append(DocumentSection(
                    section_number=idx,
                    title=f"Page {idx}",
                    content=cleaned_text
                ))
                full_text_chunks.append(cleaned_text)
                
        full_text = "\n\n".join(full_text_chunks)
        return full_text, sections, page_count
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to read PDF document. The file may be corrupt or encrypted. Error: {str(e)}"
        )

def extract_docx_text(file_bytes: bytes) -> Tuple[str, List[DocumentSection], int]:
    """Extracts text from DOCX bytes preserving paragraphs and sections."""
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
        sections: List[DocumentSection] = []
        full_text_chunks: List[str] = []
        
        current_section_num = 1
        current_section_title = f"Section {current_section_num}"
        current_section_paras: List[str] = []

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            # If heading style or short uppercase line, start a new section
            if para.style.name.startswith("Heading") or (len(text) < 60 and text.isupper()):
                if current_section_paras:
                    sec_content = "\n".join(current_section_paras)
                    sections.append(DocumentSection(
                        section_number=current_section_num,
                        title=current_section_title,
                        content=sec_content
                    ))
                    full_text_chunks.append(sec_content)
                    current_section_num += 1
                    current_section_paras = []
                current_section_title = text
            else:
                current_section_paras.append(text)

        if current_section_paras:
            sec_content = "\n".join(current_section_paras)
            sections.append(DocumentSection(
                section_number=current_section_num,
                title=current_section_title,
                content=sec_content
            ))
            full_text_chunks.append(sec_content)

        full_text = "\n\n".join(full_text_chunks)
        section_count = len(sections) or 1
        return full_text, sections, section_count
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to read DOCX document. The file may be corrupt or invalid. Error: {str(e)}"
        )

def extract_pptx_text(file_bytes: bytes) -> Tuple[str, List[DocumentSection], int]:
    """Extracts text from PPTX bytes preserving slide numbers."""
    try:
        prs = PptxPresentation(io.BytesIO(file_bytes))
        sections: List[DocumentSection] = []
        full_text_chunks: List[str] = []
        slide_count = len(prs.slides)

        for idx, slide in enumerate(prs.slides, start=1):
            slide_text_lines: List[str] = []
            slide_title = f"Slide {idx}"

            for shape in slide.shapes:
                if shape.has_text_frame:
                    for paragraph in shape.text_frame.paragraphs:
                        text = paragraph.text.strip()
                        if text:
                            # Use title shape as title if present
                            if shape == slide.shapes.title and not slide_title.startswith("Slide"):
                                slide_title = text
                            slide_text_lines.append(text)

            slide_text = "\n".join(slide_text_lines).strip()
            if slide_text:
                sections.append(DocumentSection(
                    section_number=idx,
                    title=slide_title,
                    content=slide_text
                ))
                full_text_chunks.append(f"[{slide_title}]\n{slide_text}")

        full_text = "\n\n".join(full_text_chunks)
        return full_text, sections, slide_count
    except Exception as e:
        logger.error(f"PPTX extraction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to read PPTX presentation. The file may be corrupt or invalid. Error: {str(e)}"
        )

async def process_document_upload(file: UploadFile) -> DocumentContentResponse:
    """Validates file upload, extracts readable text, and returns structured content metadata."""
    filename = file.filename or "uploaded_document"
    ext = validate_and_get_extension(filename)

    file_bytes = await file.read()
    file_size = len(file_bytes)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
        max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed limit of {max_mb}MB."
        )

    if ext == ".pdf":
        full_text, sections, page_count = extract_pdf_text(file_bytes)
        file_type = "application/pdf"
    elif ext == ".docx":
        full_text, sections, page_count = extract_docx_text(file_bytes)
        file_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif ext == ".pptx":
        full_text, sections, page_count = extract_pptx_text(file_bytes)
        file_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported document format."
        )

    full_text = full_text.strip()
    if not full_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract any readable text from the document."
        )

    word_count = len(full_text.split())
    char_count = len(full_text)
    preview = full_text[:500] + ("..." if char_count > 500 else "")

    return DocumentContentResponse(
        filename=filename,
        file_type=file_type,
        file_size_bytes=file_size,
        character_count=char_count,
        word_count=word_count,
        page_or_slide_count=page_count,
        extracted_text_preview=preview,
        sections=sections
    )
