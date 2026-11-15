import io
import os
import re
import uuid
import logging
from typing import Tuple, List, Optional
from fastapi import HTTPException, UploadFile, status
from pypdf import PdfReader
import docx
from pptx import Presentation as PptxPresentation

from app.core.config import settings
from app.schemas.presentation import DocumentContentResponse, DocumentSection

logger = logging.getLogger("presentai.document_service")

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx"}

COMMON_SECTION_TITLES = {
    "executive summary", "abstract", "introduction", "background", "literature review",
    "problem statement", "problem definition", "proposed solution", "project objectives",
    "objectives", "aim and objectives", "scope", "project scope", "methodology", "method",
    "system design", "system architecture", "architecture", "technical stack", "technology stack",
    "implementation", "system implementation", "features", "key features", "core modules",
    "results", "results and discussion", "evaluation", "performance evaluation",
    "discussion", "market analysis", "target audience", "competitive analysis",
    "timeline", "project timeline", "budget", "future work", "future scope",
    "conclusion", "conclusions", "recommendations", "summary"
}

def clean_extracted_text(text: str) -> str:
    """
    Cleans raw document text:
    - Strips page numbers (e.g. 'Page 1 of 12', 'Page 1', '- 1 -', '1 | Page', 'Page iv')
    - Strips table-of-contents dot leaders (e.g. 'Executive Summary ............. 4')
    - Strips repetitive header/footer artifacts and boilerplate
    - Normalizes excessive whitespace and multiple blank lines
    """
    if not text:
        return ""

    lines = text.splitlines()
    cleaned_lines: List[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append("")
            continue

        # Filter out standalone page number patterns (including roman numerals)
        if re.match(r'^(?:page\s+(?:\d+|[ivxlcdm]+)(?:\s+of\s+\d+)?|(?:\d+|[ivxlcdm]+)\s*\|\s*page|[-–—]\s*(?:\d+|[ivxlcdm]+)\s*[-–—]|\d+\s*/\s*\d+)$', stripped, re.IGNORECASE):
            continue

        # Filter out repetitive running headers / confidential disclaimers
        if re.match(r'^(?:confidential|all\s+rights\s+reserved|internal\s+use\s+only|draft\s*[-–—]?\s*v?\d*)$', stripped, re.IGNORECASE):
            continue

        # Strip table of contents dot leaders with trailing page numbers (e.g. 'Introduction ......... 3')
        stripped = re.sub(r'[\.\s]{4,}\s*\d+\s*$', '', stripped).strip()
        if not stripped:
            continue

        # Remove control characters except standard whitespace
        sanitized = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', stripped)
        if sanitized:
            cleaned_lines.append(sanitized)

    result = "\n".join(cleaned_lines)
    # Collapse 3 or more newlines into 2
    result = re.sub(r'\n{3,}', '\n\n', result)
    return result.strip()

def detect_heading_text(text: str) -> bool:
    """Detects whether a plain text line functions as a section heading."""
    clean_t = text.strip()
    if not clean_t or len(clean_t) > 90:
        return False
    # Avoid treating URLs or email lines as headings
    if any(k in clean_t.lower() for k in ["http://", "https://", "@", ".com"]):
        return False
    # Numbered heading: e.g. '1. Introduction', '1.1 Problem Statement', 'Chapter 2: Design', 'II. Architecture'
    if re.match(r'^(?:(?:chapter|section|part)\s+\d+|[0-9]+(?:\.[0-9]+)*|[A-Z]\.|[IVXLCDM]+\.)\s+[A-Za-z0-9]', clean_t, re.IGNORECASE):
        return True
    # Standard academic/business section title
    norm = re.sub(r'^[0-9.\s]+', '', clean_t).strip().lower()
    if norm in COMMON_SECTION_TITLES:
        return True
    # Short uppercase or title-case phrase without terminal punctuation
    if len(clean_t) < 65 and not clean_t.endswith(('.', ';', ':')) and (clean_t.isupper() or clean_t.istitle()):
        words = clean_t.split()
        if 1 <= len(words) <= 8:
            return True
    return False

def intelligent_document_chunk_and_summarize(sections: List[DocumentSection], max_chars: int = 15000) -> str:
    """
    Intelligently chunks and structures extracted document sections for AI presentation generation.
    - Preserves headings and structured layout
    - For long documents, compresses sections prioritizing key findings, data points, and topic summaries
    - Strictly avoids copying chaotic text dumps
    """
    if not sections:
        return ""

    formatted_sections: List[str] = []
    total_chars = sum(len(s.content) for s in sections)

    if total_chars <= max_chars:
        for s in sections:
            content = clean_extracted_text(s.content)
            if content:
                formatted_sections.append(f"[{s.title}]\n{content}")
        return "\n\n".join(formatted_sections)

    # Long document: Perform section-aware key insight extraction
    budget_per_section = max(300, max_chars // max(1, len(sections)))
    for s in sections:
        content = clean_extracted_text(s.content)
        if not content:
            continue

        if len(content) <= budget_per_section:
            formatted_sections.append(f"[{s.title}]\n{content}")
        else:
            # Extract high-value sentences (sentences with numbers, bullet markers, or key indicators)
            sentences = re.split(r'(?<=[.!?])\s+', content)
            key_sentences: List[str] = []
            char_count = 0

            for sent in sentences:
                sent_clean = sent.strip()
                if not sent_clean:
                    continue
                # Give high priority to sentences with data, metrics, or defined concepts
                has_metric = bool(re.search(r'\d+(?:\.\d+)?%?|\$|increase|decrease|growth|found|result|key|objective|conclusion', sent_clean, re.IGNORECASE))
                is_bullet = bool(re.match(r'^(?:[-*•]|\d+\.)\s+', sent_clean))
                
                if has_metric or is_bullet or len(key_sentences) < 3:
                    if char_count + len(sent_clean) < budget_per_section:
                        key_sentences.append(sent_clean)
                        char_count += len(sent_clean)

            if not key_sentences and sentences:
                key_sentences = [sentences[0]]

            formatted_sections.append(f"[{s.title} (Synthesized)]\n" + " ".join(key_sentences))

    return "\n\n".join(formatted_sections)

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

def format_docx_table(table) -> str:
    """Formats a DOCX table into a markdown table representation."""
    try:
        rows = []
        for r in table.rows:
            cell_texts = [clean_extracted_text(c.text).replace('\n', ' ') for c in r.cells]
            if any(cell_texts):
                rows.append(" | ".join(cell_texts))
        if len(rows) > 1:
            header = rows[0]
            col_count = len(rows[0].split(" | "))
            separator = " | ".join(["---"] * col_count)
            body = rows[1:]
            return f"\n| {header} |\n| {separator} |\n" + "\n".join([f"| {row} |" for row in body]) + "\n"
        elif rows:
            return f"\n| {rows[0]} |\n"
    except Exception:
        pass
    return ""

def extract_pdf_text(file_bytes: bytes) -> Tuple[str, List[DocumentSection], int]:
    """Extracts text from PDF bytes preserving semantic sections and page awareness."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        sections: List[DocumentSection] = []
        full_text_chunks: List[str] = []
        page_count = len(reader.pages)
        
        current_section_num = 1
        current_section_title = "Document Overview"
        current_section_paras: List[str] = []

        for idx, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text() or ""
            cleaned_page = clean_extracted_text(page_text)
            if not cleaned_page:
                continue

            lines = cleaned_page.splitlines()
            for line in lines:
                stripped = line.strip()
                if not stripped:
                    continue

                if detect_heading_text(stripped):
                    if current_section_paras:
                        sec_content = "\n".join(current_section_paras).strip()
                        if sec_content:
                            sections.append(DocumentSection(
                                section_number=current_section_num,
                                title=current_section_title,
                                content=sec_content
                            ))
                            full_text_chunks.append(f"[{current_section_title}]\n{sec_content}")
                            current_section_num += 1
                            current_section_paras = []
                    current_section_title = stripped
                else:
                    current_section_paras.append(stripped)

        if current_section_paras:
            sec_content = "\n".join(current_section_paras).strip()
            if sec_content:
                sections.append(DocumentSection(
                    section_number=current_section_num,
                    title=current_section_title,
                    content=sec_content
                ))
                full_text_chunks.append(f"[{current_section_title}]\n{sec_content}")

        # If no internal headings were detected, fallback to 1 section per page
        if not sections:
            for idx, page in enumerate(reader.pages, start=1):
                p_text = clean_extracted_text(page.extract_text() or "")
                if p_text:
                    sections.append(DocumentSection(
                        section_number=idx,
                        title=f"Page {idx}",
                        content=p_text
                    ))
                    full_text_chunks.append(f"[Page {idx}]\n{p_text}")

        full_text = "\n\n".join(full_text_chunks)
        return full_text, sections, page_count
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to read PDF document. The file may be corrupt or encrypted. Error: {str(e)}"
        )

def extract_docx_text(file_bytes: bytes) -> Tuple[str, List[DocumentSection], int]:
    """Extracts text from DOCX bytes preserving paragraphs, headings, tables, and section structure."""
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
        sections: List[DocumentSection] = []
        full_text_chunks: List[str] = []
        
        current_section_num = 1
        current_section_title = "Document Overview"
        current_section_paras: List[str] = []

        def is_docx_heading(para, text: str) -> bool:
            if not text or len(text) > 90:
                return False
            # Check style
            style_name = getattr(para.style, 'name', '') or ''
            if any(style_name.lower().startswith(h) for h in ["heading", "title", "subtitle"]):
                return True
            # Check runs boldness
            if para.runs and all(r.bold for r in para.runs if r.text.strip()) and len(text) < 80:
                return True
            # Check detect_heading_text
            return detect_heading_text(text)

        # Iterate block items in document order if possible
        blocks = []
        try:
            from docx.oxml.text.paragraph import CT_P
            from docx.oxml.table import CT_Tbl
            from docx.text.paragraph import Paragraph
            from docx.table import Table
            for child in doc.element.body.iterchildren():
                if isinstance(child, CT_P):
                    blocks.append(("p", Paragraph(child, doc)))
                elif isinstance(child, CT_Tbl):
                    blocks.append(("t", Table(child, doc)))
        except Exception:
            for p in doc.paragraphs:
                blocks.append(("p", p))
            for t in doc.tables:
                blocks.append(("t", t))

        for block_type, item in blocks:
            if block_type == "p":
                para = item
                text = clean_extracted_text(para.text)
                if not text:
                    continue

                if is_docx_heading(para, text):
                    if current_section_paras:
                        sec_content = "\n\n".join(current_section_paras).strip()
                        if sec_content:
                            sections.append(DocumentSection(
                                section_number=current_section_num,
                                title=current_section_title,
                                content=sec_content
                            ))
                            full_text_chunks.append(f"[{current_section_title}]\n{sec_content}")
                            current_section_num += 1
                            current_section_paras = []
                    current_section_title = text
                else:
                    current_section_paras.append(text)

            elif block_type == "t":
                table_str = format_docx_table(item)
                if table_str:
                    current_section_paras.append(table_str)

        if current_section_paras:
            sec_content = "\n\n".join(current_section_paras).strip()
            if sec_content:
                sections.append(DocumentSection(
                    section_number=current_section_num,
                    title=current_section_title,
                    content=sec_content
                ))
                full_text_chunks.append(f"[{current_section_title}]\n{sec_content}")

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
                        text = clean_extracted_text(paragraph.text)
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

def clean_filename_to_title(filename: str) -> str:
    """
    Cleans a file name into a human-readable title, stripping technical artifacts,
    underscores, version tags, and file extensions.
    """
    name = re.sub(r'\.[^/.]+$', '', filename).strip()
    # Strip common file suffixes and tags
    name = re.sub(r'[-_](?:source|presentation|slides?|draft|final|v\d+|mvp|doc|report|version\d*)\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\b(?:source|presentation|slides?|draft|final|v\d+|mvp|doc|report|version\d*)[-_]', '', name, flags=re.IGNORECASE)
    # Replace underscores and hyphens with spaces
    name = re.sub(r'[-_]+', ' ', name).strip()
    # Split camelCase / PascalCase words if no spaces exist (e.g. PresentMaker -> Present Maker)
    if ' ' not in name and len(name) > 6:
        name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
    words = name.split()
    minor_words = {"in", "on", "of", "and", "the", "for", "with", "at", "to", "by", "a", "an"}
    titled_words = [w.capitalize() if idx == 0 or w.lower() not in minor_words else w.lower() for idx, w in enumerate(words)]
    clean_res = " ".join(titled_words)
    return clean_res or "Document Presentation"


def extract_intelligent_title(
    filename: str,
    ext: str,
    file_bytes: bytes,
    sections: List[DocumentSection],
    full_text: str
) -> str:
    """
    Intelligently extracts the true presentation/document title from:
    1. DOCX document title properties and first prominent headings.
    2. PDF document title metadata and page 1 header text.
    3. PPTX slide 1 title shape.
    4. Text scan for title/project declarations or first non-generic section title.
    5. Fallback to clean humanized title (NEVER raw filename with underscores).
    """
    cleaned_file_title = clean_filename_to_title(filename)

    # 1. DOCX Inspection
    if ext == ".docx":
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            # Check core properties title
            if doc.core_properties and doc.core_properties.title:
                prop_title = doc.core_properties.title.strip()
                if prop_title and len(prop_title) >= 4 and not re.search(r'[\._]', prop_title) and prop_title.lower() != filename.lower():
                    return prop_title[:80].title()

            # Inspect first 8 paragraphs for a Title style or prominent header
            for p in doc.paragraphs[:8]:
                p_text = clean_extracted_text(p.text)
                if not p_text or len(p_text) > 90 or len(p_text) < 4:
                    continue
                style_name = getattr(p.style, 'name', '') or ''
                # Explicit Title style
                if "title" in style_name.lower():
                    return p_text[:80].title()
                # Heading 1 style on first page
                if "heading 1" in style_name.lower() and p_text.lower() not in COMMON_SECTION_TITLES:
                    return p_text[:80].title()
                # Standalone bold line without period
                if p.runs and all(r.bold for r in p.runs if r.text.strip()) and not p_text.endswith('.'):
                    if p_text.lower() not in COMMON_SECTION_TITLES:
                        return p_text[:80].title()
        except Exception as e:
            logger.warning(f"DOCX title extraction warning: {e}")

    # 2. PDF Inspection
    elif ext == ".pdf":
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            if reader.metadata and reader.metadata.title:
                meta_title = clean_extracted_text(reader.metadata.title)
                if meta_title and len(meta_title) >= 4 and not re.search(r'[\._]', meta_title) and meta_title.lower() != filename.lower():
                    return meta_title[:80].title()

            # Scan Page 1 for title
            if len(reader.pages) > 0:
                p1_text = clean_extracted_text(reader.pages[0].extract_text() or "")
                lines = [l.strip() for l in p1_text.splitlines() if l.strip()]
                for l in lines[:5]:
                    if 4 <= len(l) <= 80 and not l.endswith('.') and not l.lower().startswith(('page', 'chapter', 'table of contents')):
                        if l.lower() not in COMMON_SECTION_TITLES:
                            return l[:80].title()
        except Exception as e:
            logger.warning(f"PDF title extraction warning: {e}")

    # 3. PPTX Inspection
    elif ext == ".pptx":
        try:
            prs = PptxPresentation(io.BytesIO(file_bytes))
            if len(prs.slides) > 0:
                s1 = prs.slides[0]
                if s1.shapes.title and s1.shapes.title.text:
                    t_text = clean_extracted_text(s1.shapes.title.text)
                    if t_text and 4 <= len(t_text) <= 80:
                        return t_text[:80].title()
        except Exception as e:
            logger.warning(f"PPTX title extraction warning: {e}")

    # 4. Check Extracted Sections
    if sections:
        first_sec = sections[0]
        f_title = first_sec.title.strip()
        norm_f = re.sub(r'^[0-9.\s]+', '', f_title).strip().lower()
        if f_title and len(f_title) >= 4 and len(f_title) <= 80 and norm_f not in COMMON_SECTION_TITLES and not f_title.lower().startswith(('section', 'page', 'document')):
            return f_title.title()

    # 5. Check Full Text for Cover Page / Title markers
    title_match = re.search(r'(?:project\s+title|title|presentation\s+title)\s*[:–—]\s*([^\n\r]+)', full_text[:1500], re.IGNORECASE)
    if title_match:
        matched = title_match.group(1).strip()
        if 4 <= len(matched) <= 80:
            return matched.title()

    # 6. Fallback to Cleaned Filename
    return cleaned_file_title


async def process_document_upload(file: UploadFile) -> DocumentContentResponse:
    """Validates file upload, extracts readable text, and returns structured content metadata with intelligent title detection."""
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

    detected_title = extract_intelligent_title(
        filename=filename,
        ext=ext,
        file_bytes=file_bytes,
        sections=sections,
        full_text=full_text
    )

    return DocumentContentResponse(
        filename=filename,
        file_type=file_type,
        file_size_bytes=file_size,
        character_count=char_count,
        word_count=word_count,
        page_or_slide_count=page_count,
        detected_title=detected_title,
        extracted_text_preview=preview,
        sections=sections
    )
