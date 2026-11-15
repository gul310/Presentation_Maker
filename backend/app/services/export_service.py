import io
import re
import json
import math
import zipfile
from datetime import datetime, timezone
from typing import Optional, List, Tuple, Dict, Any

# python-pptx imports
from pptx import Presentation as PPTXPresentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor

# reportlab imports
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

# Pillow (PIL) for image export
from PIL import Image, ImageDraw, ImageFont


# ==============================================================================
# Helper Utilities
# ==============================================================================

def is_urdu_or_arabic(text: str) -> bool:
    """Checks if text contains Arabic/Urdu unicode characters."""
    if not text:
        return False
    return bool(re.search(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]', text))


def reshape_urdu_text(text: str) -> str:
    """Helper to reshape and reorder Urdu/Arabic characters for PDF and canvas rendering."""
    if not text or not is_urdu_or_arabic(text):
        return text

    try:
        import arabic_reshaper
        from bidi.algorithm import get_display

        # Split by HTML tags if any to preserve tags
        parts = re.split(r'(<[^>]+>)', text)
        processed_parts = []
        for part in parts:
            if part.startswith('<') and part.endswith('>'):
                processed_parts.append(part)
            else:
                reshaped = arabic_reshaper.reshape(part)
                bidi_text = get_display(reshaped)
                processed_parts.append(bidi_text)
        return "".join(processed_parts)
    except Exception:
        return text


def sanitize_filename(title: str, extension: str) -> str:
    """Sanitizes presentation title into a safe downloadable filename."""
    cleaned = re.sub(r'[^\w\s-]', '', title or 'Presentation')
    cleaned = re.sub(r'[\s_]+', '_', cleaned).strip('_')
    if not cleaned:
        cleaned = "Presentation"
    return f"PresentAI_{cleaned}.{extension.lstrip('.')}"


def hex_to_rgb(hex_str: str) -> RGBColor:
    """Converts hex color string like '#4f46e5' to PPTX RGBColor."""
    clean_hex = hex_str.lstrip('#')
    if len(clean_hex) != 6:
        return RGBColor(79, 70, 229)
    r = int(clean_hex[0:2], 16)
    g = int(clean_hex[2:4], 16)
    b = int(clean_hex[4:6], 16)
    return RGBColor(r, g, b)


def hex_to_reportlab_color(hex_str: str) -> colors.HexColor:
    """Converts hex color string to ReportLab HexColor."""
    clean_hex = hex_str.lstrip('#')
    if len(clean_hex) != 6:
        return colors.HexColor('#4f46e5')
    return colors.HexColor(f"#{clean_hex}")


def hex_to_pil_rgb(hex_str: str) -> Tuple[int, int, int]:
    """Converts hex color string to PIL (R, G, B) tuple."""
    clean_hex = hex_str.lstrip('#')
    if len(clean_hex) != 6:
        return (79, 70, 229)
    return (
        int(clean_hex[0:2], 16),
        int(clean_hex[2:4], 16),
        int(clean_hex[4:6], 16)
    )


def get_theme_hex(color_theme: Optional[str], custom_hex: Optional[str] = None) -> str:
    """Returns primary hex code for theme."""
    THEME_MAP = {
        "indigo": "#4f46e5",
        "blue": "#2563eb",
        "purple": "#9333ea",
        "cyan": "#06b6d4",
        "green": "#10b981",
        "rose": "#f43f5e",
        "orange": "#f97316",
    }
    if custom_hex and len(custom_hex.strip()) >= 6:
        return custom_hex.strip()
    if color_theme and color_theme.lower() in THEME_MAP:
        return THEME_MAP[color_theme.lower()]
    return "#4f46e5"


def get_theme_color_rgb(color_theme: Optional[str], custom_hex: Optional[str] = None) -> Tuple[RGBColor, colors.HexColor]:
    """Returns PPTX RGBColor and ReportLab color for user's theme."""
    selected_hex = get_theme_hex(color_theme, custom_hex)
    return hex_to_rgb(selected_hex), hex_to_reportlab_color(selected_hex)


from app.services.tts_service import tts_service


def configure_automatic_audio_timing(pptx_bytes: bytes) -> bytes:
    """
    Configures slide audio media shapes to start automatically (delay=0) upon slide transition in Slide Show mode.
    Maintains 100% valid OpenXML package integrity.
    """
    in_buf = io.BytesIO(pptx_bytes)
    out_buf = io.BytesIO()

    with zipfile.ZipFile(in_buf, 'r') as zin, zipfile.ZipFile(out_buf, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            # Check if this is a slide XML file containing timing
            if item.filename.startswith('ppt/slides/slide') and item.filename.endswith('.xml') and not item.filename.startswith('ppt/slides/_rels'):
                slide_xml = data.decode('utf-8')
                if 'delay="indefinite"' in slide_xml:
                    slide_xml = slide_xml.replace('delay="indefinite"', 'delay="0"')
                    data = slide_xml.encode('utf-8')
            zout.writestr(item.filename, data)

    out_buf.seek(0)
    return out_buf.getvalue()


def to_dict(obj: Any) -> Any:
    """Recursively converts any object, SimpleNamespace, Pydantic model, or dict into a standard Python dict/list structure."""
    if isinstance(obj, dict):
        return {k: to_dict(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple, set)):
        return [to_dict(x) for x in obj]
    elif hasattr(obj, "model_dump"):
        return to_dict(obj.model_dump())
    elif hasattr(obj, "dict") and callable(obj.dict):
        return to_dict(obj.dict())
    elif hasattr(obj, "__dict__"):
        return to_dict(obj.__dict__)
    return obj


def fetch_image_bytes(url: str, timeout: float = 8.0) -> Optional[io.BytesIO]:
    """Downloads remote image bytes safely for PowerPoint embedding."""
    if not url or not url.startswith("http"):
        return None
    try:
        import urllib.request
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "PresentationMaker/1.0",
                "Accept": "image/*"
            }
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            if response.status == 200:
                data = response.read()
                if len(data) > 100:
                    return io.BytesIO(data)
    except Exception as e:
        print(f"[PPTX Image Fetch Notice] Could not download image {url}: {e}")
    return None


def export_presentation_to_pptx(
    presentation: Any,
    color_theme: Optional[str] = None,
    custom_color: Optional[str] = None,
    export_language: Optional[str] = None
) -> bytes:
    """
    Generates a 100% valid, PowerPoint-compatible (.pptx) file.
    - Embedded slide-by-slide Speaker Notes in native PowerPoint notes section.
    - Embedded real multilingual audio narration matching the presentation language.
    - Automatic audio playback configured on Slide Show (delay=0).
    - 16:9 widescreen layout with professional card styling and theme accents.
    - Multi-language & Urdu/Arabic unicode support with RTL alignment and typography.
    """
    presentation = to_dict(presentation)
    prs = PPTXPresentation()

    # 16:9 widescreen dimensions (13.333 x 7.5 inches)
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Extract presentation theme if available
    theme = presentation.get('theme') if isinstance(presentation, dict) else getattr(presentation, 'theme', None)
    if not isinstance(theme, dict) and hasattr(theme, '__dict__'):
        theme = to_dict(theme)

    # Defaults
    primary_hex = get_theme_hex(color_theme, custom_color)
    secondary_hex = "#06b6d4"
    accent_hex = "#f59e0b"
    background_hex = "#ffffff"
    surface_hex = "#f8fafc"
    surface_border_hex = "#e2e8f0"
    text_hex = "#0f172a"
    text_muted_hex = "#64748b"
    heading_font_name = "Calibri"
    body_font_name = "Calibri"

    if theme and isinstance(theme, dict):
        palette = theme.get('palette', {}) or {}
        fonts = theme.get('fonts', {}) or {}

        primary_hex = palette.get('primary', primary_hex)
        secondary_hex = palette.get('secondary', secondary_hex)
        accent_hex = palette.get('accent', accent_hex)
        background_hex = palette.get('background', background_hex)
        surface_hex = palette.get('surface', surface_hex)
        surface_border_hex = palette.get('surface_border', surface_border_hex)
        text_hex = palette.get('text', text_hex)
        text_muted_hex = palette.get('text_muted', text_muted_hex)

        raw_heading_font = fonts.get('headingFont', 'Calibri')
        raw_body_font = fonts.get('bodyFont', 'Calibri')

        FONT_MAPPING = {
            "Inter": "Arial",
            "Roboto": "Arial",
            "Open Sans": "Arial",
            "Outfit": "Segoe UI",
            "Plus Jakarta Sans": "Segoe UI",
            "Poppins": "Segoe UI",
            "Montserrat": "Arial",
            "Playfair Display": "Georgia",
            "Merriweather": "Georgia",
            "Lora": "Georgia",
            "Cinzel": "Times New Roman",
            "Space Grotesk": "Century Gothic",
            "Work Sans": "Segoe UI",
            "Cabinet Grotesk": "Arial",
            "Fira Code": "Consolas",
        }
        heading_font_name = FONT_MAPPING.get(raw_heading_font, raw_heading_font)
        body_font_name = FONT_MAPPING.get(raw_body_font, raw_body_font)

    primary_rgb = hex_to_rgb(primary_hex)
    secondary_rgb = hex_to_rgb(secondary_hex)
    accent_rgb = hex_to_rgb(accent_hex)
    bg_rgb = hex_to_rgb(background_hex)
    surface_rgb = hex_to_rgb(surface_hex)
    surface_border_rgb = hex_to_rgb(surface_border_hex)
    text_rgb = hex_to_rgb(text_hex)
    text_muted_rgb = hex_to_rgb(text_muted_hex)

    raw_slides = presentation.get('slides', [])
    slides = sorted(raw_slides, key=lambda s: s.get('slide_number', 1) if isinstance(s, dict) else 1)
    blank_layout = prs.slide_layouts[6]  # Blank slide layout

    pres_lang = presentation.get('preferred_language') if isinstance(presentation, dict) else getattr(presentation, 'preferred_language', None)
    if not pres_lang:
        pres_lang = presentation.get('language') if isinstance(presentation, dict) else getattr(presentation, 'language', None)
    active_lang = (export_language or pres_lang or "English").strip()
    is_urdu_pres = active_lang.lower() in ("urdu", "ur", "urdu (اردو)")
    is_rtl_pres = is_urdu_pres or active_lang.lower() in ("arabic", "ar", "arabic (العربية)", "hebrew", "fa", "persian")

    for idx, slide_data in enumerate(slides):
        slide = prs.slides.add_slide(blank_layout)

        # Extract content, notes, and title based on active export language
        slide_title = slide_data.get('title', f'Slide {idx + 1}') if isinstance(slide_data, dict) else getattr(slide_data, 'title', f'Slide {idx + 1}')
        slide_notes = (slide_data.get('speaker_notes', '') if isinstance(slide_data, dict) else getattr(slide_data, 'speaker_notes', '')) or ''
        raw_content = slide_data.get('content', {}) if isinstance(slide_data, dict) else getattr(slide_data, 'content', {})
        if isinstance(raw_content, list):
            content = {'bullet_points': raw_content}
        elif isinstance(raw_content, dict):
            content = raw_content
        else:
            content = raw_content.__dict__ if hasattr(raw_content, "__dict__") else {}
        
        translations = (slide_data.get('translations', {}) if isinstance(slide_data, dict) else getattr(slide_data, 'translations', {})) or {}
        if isinstance(translations, dict) and active_lang in translations:
            t_obj = translations[active_lang]
            if isinstance(t_obj, dict):
                slide_title = t_obj.get('title', slide_title)
                slide_notes = t_obj.get('speaker_notes', slide_notes)
                if 'content' in t_obj and isinstance(t_obj['content'], dict):
                    content = t_obj['content']

        subtitle = content.get("subtitle") if isinstance(content, dict) else None
        bullet_points = content.get("bullet_points", []) if isinstance(content, dict) else (content if isinstance(content, list) else [])
        visual_type = (content.get("visual_type") if isinstance(content, dict) else None) or (slide_data.get("layout_type") if isinstance(slide_data, dict) else getattr(slide_data, "layout_type", "standard")) or "standard"

        is_rtl_slide = is_rtl_pres or is_urdu_or_arabic(slide_title)
        is_chinese_slide = active_lang.lower() in ("chinese", "zh", "zh-cn", "zh-tw", "chinese (simplified)", "chinese (traditional)")
        font_name = "Segoe UI" if is_rtl_slide else ("Microsoft YaHei" if is_chinese_slide else body_font_name)
        heading_font = "Segoe UI" if is_rtl_slide else ("Microsoft YaHei" if is_chinese_slide else heading_font_name)

        # -------------------------------------------------------------
        # 1. EMBED REAL SPEAKER NOTES IN NATIVE POWERPOINT NOTES SECTION
        # -------------------------------------------------------------
        if slide_notes:
            notes_slide = slide.notes_slide
            text_frame = notes_slide.notes_text_frame
            text_frame.text = slide_notes

        # -------------------------------------------------------------
        # 2. GENERATE REAL MULTILINGUAL AUDIO MATCHING PRESENTATION LANGUAGE
        # -------------------------------------------------------------
        audio_data = None
        speech_text = slide_notes.strip() if slide_notes else f"{slide_title}. {subtitle or ''} {' '.join(bullet_points)}".strip()
        if speech_text:
            try:
                audio_data = tts_service.synthesize_speech(
                    text=speech_text,
                    language=active_lang,
                    use_cache=True
                )
            except Exception as e:
                print(f"[PPTX Audio Export] TTS synthesis error for language '{active_lang}': {e}")

        # Outer slide background
        try:
            background = slide.background
            fill = background.fill
            fill.solid()
            fill.fore_color.rgb = bg_rgb
        except Exception:
            pass

        # Slide background shape (Subtle premium background card)
        bg_card = slide.shapes.add_shape(
            1, Inches(0.4), Inches(0.4), Inches(12.533), Inches(6.7)  # MSO_SHAPE.RECTANGLE
        )
        bg_card.fill.solid()
        bg_card.fill.fore_color.rgb = surface_rgb
        bg_card.line.color.rgb = surface_border_rgb
        bg_card.line.width = Pt(1)

        # Header accent line/bar
        bar_left = Inches(12.2) if is_rtl_slide else Inches(0.8)
        accent_shape = slide.shapes.add_shape(
            1, bar_left, Inches(0.7), Inches(0.18), Inches(0.85)
        )
        accent_shape.fill.solid()
        accent_shape.fill.fore_color.rgb = primary_rgb
        accent_shape.line.fill.background()

        # Title Box
        title_left = Inches(0.8) if is_rtl_slide else Inches(1.15)
        title_box = slide.shapes.add_textbox(title_left, Inches(0.6), Inches(11.0), Inches(1.0))
        tf = title_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = slide_title
        p.font.size = Pt(28)
        p.font.bold = True
        p.font.name = heading_font
        p.font.color.rgb = text_rgb
        if is_rtl_slide:
            p.alignment = PP_ALIGN.RIGHT

        # Extract Slide Image metadata for PowerPoint embedding
        slide_img = slide_data.get('image') or content.get('image') or {}
        img_url = (slide_img.get('regular_url') or slide_img.get('url') or slide_data.get('image_url') or content.get('image_url') or '').strip()
        photographer_name = slide_img.get('photographer_name') or 'Unsplash'
        img_stream = fetch_image_bytes(img_url) if img_url else None

        # Layout-specific content rendering (using active language translated content)

        def embed_pptx_image(slide_obj, stream, photog_name, f_name):
            try:
                slide_obj.shapes.add_picture(stream, Inches(7.1), Inches(1.6), Inches(5.4), Inches(4.2))
                attr_box = slide_obj.shapes.add_textbox(Inches(7.1), Inches(5.85), Inches(5.4), Inches(0.35))
                attr_p = attr_box.text_frame.paragraphs[0]
                attr_p.text = f"Photo by {photog_name} on Unsplash"
                attr_p.font.size = Pt(8)
                attr_p.font.name = f_name
                attr_p.font.color.rgb = RGBColor(148, 163, 184)
            except Exception as pic_err:
                print(f"[PPTX Image Render Error] {pic_err}")

        if visual_type == "title":
            if img_stream:
                p.font.size = Pt(32)
                p.alignment = PP_ALIGN.LEFT
                title_box.left = Inches(1.15)
                title_box.top = Inches(1.8)
                title_box.width = Inches(5.6)

                if subtitle:
                    sub_box = slide.shapes.add_textbox(Inches(1.15), Inches(3.2), Inches(5.6), Inches(1.2))
                    sub_tf = sub_box.text_frame
                    sub_tf.word_wrap = True
                    sub_p = sub_tf.paragraphs[0]
                    sub_p.text = subtitle
                    sub_p.font.size = Pt(18)
                    sub_p.font.color.rgb = primary_rgb
                    sub_p.font.name = font_name
                    sub_p.alignment = PP_ALIGN.LEFT

                tag_box = slide.shapes.add_textbox(Inches(1.15), Inches(4.8), Inches(5.6), Inches(0.8))
                tag_tf = tag_box.text_frame
                tag_p = tag_tf.paragraphs[0]
                pres_lang_display = getattr(presentation, 'language', None) or (presentation.get('language') if isinstance(presentation, dict) else 'English')
                pres_aud_display = getattr(presentation, 'audience', None) or (presentation.get('audience') if isinstance(presentation, dict) else 'General Audience') or 'General Audience'
                tag_p.text = f"Language: {pres_lang_display}  •  {pres_aud_display}"
                tag_p.font.size = Pt(12)
                tag_p.font.name = font_name
                tag_p.font.color.rgb = RGBColor(100, 116, 139)
                tag_p.alignment = PP_ALIGN.LEFT

                embed_pptx_image(slide, img_stream, photographer_name, font_name)
            else:
                p.font.size = Pt(36)
                p.alignment = PP_ALIGN.CENTER
                title_box.left = Inches(1.0)
                title_box.top = Inches(2.2)
                title_box.width = Inches(11.333)

                if subtitle:
                    sub_box = slide.shapes.add_textbox(Inches(1.0), Inches(3.6), Inches(11.333), Inches(1.2))
                    sub_tf = sub_box.text_frame
                    sub_tf.word_wrap = True
                    sub_p = sub_tf.paragraphs[0]
                    sub_p.text = subtitle
                    sub_p.font.size = Pt(20)
                    sub_p.font.color.rgb = primary_rgb
                    sub_p.font.name = font_name
                    sub_p.alignment = PP_ALIGN.CENTER

                tag_box = slide.shapes.add_textbox(Inches(1.0), Inches(5.0), Inches(11.333), Inches(0.8))
                tag_tf = tag_box.text_frame
                tag_p = tag_tf.paragraphs[0]
                pres_lang_display = getattr(presentation, 'language', None) or (presentation.get('language') if isinstance(presentation, dict) else 'English')
                pres_aud_display = getattr(presentation, 'audience', None) or (presentation.get('audience') if isinstance(presentation, dict) else 'General Audience') or 'General Audience'
                tag_p.text = f"Language: {pres_lang_display}  •  {pres_aud_display}"
                tag_p.font.size = Pt(13)
                tag_p.font.name = font_name
                tag_p.font.color.rgb = RGBColor(100, 116, 139)
                tag_p.alignment = PP_ALIGN.CENTER

        elif visual_type == "section_header":
            if img_stream:
                p.font.size = Pt(28)
                p.alignment = PP_ALIGN.LEFT
                title_box.left = Inches(1.15)
                title_box.top = Inches(2.2)
                title_box.width = Inches(5.6)
                if subtitle:
                    sub_box = slide.shapes.add_textbox(Inches(1.15), Inches(3.6), Inches(5.6), Inches(1.2))
                    sub_tf = sub_box.text_frame
                    sub_tf.word_wrap = True
                    sub_p = sub_tf.paragraphs[0]
                    sub_p.text = subtitle
                    sub_p.font.size = Pt(16)
                    sub_p.font.color.rgb = primary_rgb
                    sub_p.font.name = font_name
                    sub_p.alignment = PP_ALIGN.LEFT
                embed_pptx_image(slide, img_stream, photographer_name, font_name)
            else:
                p.font.size = Pt(34)
                p.alignment = PP_ALIGN.CENTER
                title_box.left = Inches(1.0)
                title_box.top = Inches(2.5)
                title_box.width = Inches(11.333)

                if subtitle:
                    sub_box = slide.shapes.add_textbox(Inches(1.0), Inches(3.8), Inches(11.333), Inches(1.0))
                    sub_tf = sub_box.text_frame
                    sub_tf.word_wrap = True
                    sub_p = sub_tf.paragraphs[0]
                    sub_p.text = subtitle
                    sub_p.font.size = Pt(18)
                    sub_p.font.color.rgb = primary_rgb
                    sub_p.font.name = font_name
                    sub_p.alignment = PP_ALIGN.CENTER

        elif visual_type in ("process_flow", "flowchart"):
            steps = content.get("steps") or []
            if not steps and bullet_points:
                steps = [{"step": i + 1, "label": bp.split(":")[0] if ":" in bp else f"Step {i+1}", "description": bp.split(":")[1].strip() if ":" in bp else bp} for i, bp in enumerate(bullet_points)]
            
            if img_stream:
                title_box.width = Inches(5.6)
                step_count = max(1, min(2, len(steps)))
                card_width = 5.6 / step_count
                for i, st in enumerate(steps[:2]):
                    left_pos = 1.15 + (i * card_width)
                    card_shape = slide.shapes.add_shape(1, Inches(left_pos), Inches(2.2), Inches(card_width - 0.2), Inches(3.8))
                    card_shape.fill.solid()
                    card_shape.fill.fore_color.rgb = RGBColor(241, 245, 249)
                    card_shape.line.color.rgb = primary_rgb if i == 0 else RGBColor(203, 213, 225)
                    card_shape.line.width = Pt(1.5 if i == 0 else 1)

                    tf_step = card_shape.text_frame
                    tf_step.word_wrap = True
                    p_num = tf_step.paragraphs[0]
                    p_num.text = f"Step {st.get('step', i+1)}"
                    p_num.font.bold = True
                    p_num.font.size = Pt(13)
                    p_num.font.color.rgb = primary_rgb

                    p_lbl = tf_step.add_paragraph()
                    p_lbl.text = str(st.get("label", ""))
                    p_lbl.font.bold = True
                    p_lbl.font.size = Pt(12)
                    p_lbl.font.color.rgb = RGBColor(15, 23, 42)
                    p_lbl.space_before = Pt(4)

                    p_desc = tf_step.add_paragraph()
                    p_desc.text = str(st.get("description", ""))
                    p_desc.font.size = Pt(10)
                    p_desc.font.color.rgb = RGBColor(71, 85, 105)
                    p_desc.space_before = Pt(4)
                embed_pptx_image(slide, img_stream, photographer_name, font_name)
            else:
                step_count = max(1, min(4, len(steps)))
                card_width = 10.8 / step_count
                for i, st in enumerate(steps[:4]):
                    left_pos = 1.15 + (i * card_width)
                    card_shape = slide.shapes.add_shape(1, Inches(left_pos), Inches(2.2), Inches(card_width - 0.25), Inches(3.8))
                    card_shape.fill.solid()
                    card_shape.fill.fore_color.rgb = RGBColor(241, 245, 249)
                    card_shape.line.color.rgb = primary_rgb if i == 0 else RGBColor(203, 213, 225)
                    card_shape.line.width = Pt(1.5 if i == 0 else 1)

                    tf_step = card_shape.text_frame
                    tf_step.word_wrap = True
                    p_num = tf_step.paragraphs[0]
                    p_num.text = f"Step {st.get('step', i+1)}"
                    p_num.font.bold = True
                    p_num.font.size = Pt(14)
                    p_num.font.color.rgb = primary_rgb

                    p_lbl = tf_step.add_paragraph()
                    p_lbl.text = str(st.get("label", ""))
                    p_lbl.font.bold = True
                    p_lbl.font.size = Pt(13)
                    p_lbl.font.color.rgb = RGBColor(15, 23, 42)
                    p_lbl.space_before = Pt(6)

                    p_desc = tf_step.add_paragraph()
                    p_desc.text = str(st.get("description", ""))
                    p_desc.font.size = Pt(11)
                    p_desc.font.color.rgb = RGBColor(71, 85, 105)
                    p_desc.space_before = Pt(6)

        elif visual_type == "timeline":
            items = content.get("timeline_items") or []
            if not items and bullet_points:
                items = [{"period": f"Phase {i+1}", "title": bp.split(":")[0] if ":" in bp else f"Milestone {i+1}", "description": bp.split(":")[1].strip() if ":" in bp else bp} for i, bp in enumerate(bullet_points)]
            
            if img_stream:
                title_box.width = Inches(5.6)
                count = max(1, min(2, len(items)))
                card_width = 5.6 / count
                for i, item in enumerate(items[:2]):
                    left_pos = 1.15 + (i * card_width)
                    card_shape = slide.shapes.add_shape(1, Inches(left_pos), Inches(2.2), Inches(card_width - 0.2), Inches(3.8))
                    card_shape.fill.solid()
                    card_shape.fill.fore_color.rgb = RGBColor(241, 245, 249)
                    card_shape.line.color.rgb = RGBColor(99, 102, 241)
                    card_shape.line.width = Pt(1)

                    tf_item = card_shape.text_frame
                    tf_item.word_wrap = True
                    p_per = tf_item.paragraphs[0]
                    p_per.text = str(item.get("period", f"Phase {i+1}"))
                    p_per.font.bold = True
                    p_per.font.size = Pt(12)
                    p_per.font.color.rgb = RGBColor(99, 102, 241)

                    p_title = tf_item.add_paragraph()
                    p_title.text = str(item.get("title", ""))
                    p_title.font.bold = True
                    p_title.font.size = Pt(12)
                    p_title.font.color.rgb = RGBColor(15, 23, 42)
                    p_title.space_before = Pt(4)

                    p_desc = tf_item.add_paragraph()
                    p_desc.text = str(item.get("description", ""))
                    p_desc.font.size = Pt(10)
                    p_desc.font.color.rgb = RGBColor(71, 85, 105)
                    p_desc.space_before = Pt(4)
                embed_pptx_image(slide, img_stream, photographer_name, font_name)
            else:
                count = max(1, min(4, len(items)))
                card_width = 10.8 / count
                for i, item in enumerate(items[:4]):
                    left_pos = 1.15 + (i * card_width)
                    card_shape = slide.shapes.add_shape(1, Inches(left_pos), Inches(2.2), Inches(card_width - 0.25), Inches(3.8))
                    card_shape.fill.solid()
                    card_shape.fill.fore_color.rgb = RGBColor(241, 245, 249)
                    card_shape.line.color.rgb = RGBColor(99, 102, 241)
                    card_shape.line.width = Pt(1)

                    tf_item = card_shape.text_frame
                    tf_item.word_wrap = True
                    p_per = tf_item.paragraphs[0]
                    p_per.text = str(item.get("period", f"Phase {i+1}"))
                    p_per.font.bold = True
                    p_per.font.size = Pt(13)
                    p_per.font.color.rgb = RGBColor(99, 102, 241)

                    p_title = tf_item.add_paragraph()
                    p_title.text = str(item.get("title", ""))
                    p_title.font.bold = True
                    p_title.font.size = Pt(13)
                    p_title.font.color.rgb = RGBColor(15, 23, 42)
                    p_title.space_before = Pt(6)

                    p_desc = tf_item.add_paragraph()
                    p_desc.text = str(item.get("description", ""))
                    p_desc.font.size = Pt(11)
                    p_desc.font.color.rgb = RGBColor(71, 85, 105)
                    p_desc.space_before = Pt(6)

        elif visual_type == "comparison":
            cols = content.get("comparison_columns") or []
            if not cols and bullet_points:
                half = math.ceil(len(bullet_points) / 2)
                cols = [
                    {"heading": "Option A / Strengths", "badge": "Pros", "points": bullet_points[:half]},
                    {"heading": "Option B / Considerations", "badge": "Cons", "points": bullet_points[half:]}
                ]
            if img_stream:
                title_box.width = Inches(5.6)
                for i, col in enumerate(cols[:2]):
                    left_pos = 1.15 + (i * 2.8)
                    card_shape = slide.shapes.add_shape(1, Inches(left_pos), Inches(2.0), Inches(2.6), Inches(4.3))
                    card_shape.fill.solid()
                    card_shape.fill.fore_color.rgb = RGBColor(248, 250, 252)
                    card_shape.line.color.rgb = primary_rgb if i == 0 else RGBColor(168, 85, 247)
                    card_shape.line.width = Pt(1.5)

                    tf_col = card_shape.text_frame
                    tf_col.word_wrap = True
                    p_h = tf_col.paragraphs[0]
                    badge = col.get("badge")
                    p_h.text = f"{col.get('heading', '')} [{badge}]" if badge else str(col.get('heading', ''))
                    p_h.font.bold = True
                    p_h.font.size = Pt(12)
                    p_h.font.color.rgb = primary_rgb if i == 0 else RGBColor(147, 51, 234)

                    for pt in col.get("points", [])[:3]:
                        p_pt = tf_col.add_paragraph()
                        p_pt.text = f"• {pt}"
                        p_pt.font.size = Pt(10)
                        p_pt.font.color.rgb = RGBColor(51, 65, 85)
                        p_pt.space_before = Pt(4)
                embed_pptx_image(slide, img_stream, photographer_name, font_name)
            else:
                for i, col in enumerate(cols[:2]):
                    left_pos = 1.15 if i == 0 else 6.8
                    card_shape = slide.shapes.add_shape(1, Inches(left_pos), Inches(2.0), Inches(5.3), Inches(4.3))
                    card_shape.fill.solid()
                    card_shape.fill.fore_color.rgb = RGBColor(248, 250, 252)
                    card_shape.line.color.rgb = primary_rgb if i == 0 else RGBColor(168, 85, 247)
                    card_shape.line.width = Pt(1.5)

                    tf_col = card_shape.text_frame
                    tf_col.word_wrap = True
                    p_h = tf_col.paragraphs[0]
                    badge = col.get("badge")
                    p_h.text = f"{col.get('heading', '')} [{badge}]" if badge else str(col.get('heading', ''))
                    p_h.font.bold = True
                    p_h.font.size = Pt(15)
                    p_h.font.color.rgb = primary_rgb if i == 0 else RGBColor(147, 51, 234)

                    for pt in col.get("points", []):
                        p_pt = tf_col.add_paragraph()
                        p_pt.text = f"• {pt}"
                        p_pt.font.size = Pt(13)
                        p_pt.font.color.rgb = RGBColor(51, 65, 85)
                        p_pt.space_before = Pt(8)

        elif visual_type == "stats_grid":
            stats = content.get("stats") or []
            if not stats and bullet_points:
                stats = [{"metric": f"{i*25+25}%", "label": bp, "description": "", "trend": None} for i, bp in enumerate(bullet_points[:4])]
            
            if img_stream:
                title_box.width = Inches(5.6)
                s_count = max(1, min(2, len(stats)))
                card_width = 5.6 / s_count
                for i, st in enumerate(stats[:2]):
                    left_pos = 1.15 + (i * card_width)
                    card_shape = slide.shapes.add_shape(1, Inches(left_pos), Inches(2.2), Inches(card_width - 0.2), Inches(3.8))
                    card_shape.fill.solid()
                    card_shape.fill.fore_color.rgb = RGBColor(240, 253, 250)
                    card_shape.line.color.rgb = RGBColor(20, 184, 166)
                    card_shape.line.width = Pt(1.5)

                    tf_stat = card_shape.text_frame
                    tf_stat.word_wrap = True
                    p_met = tf_stat.paragraphs[0]
                    p_met.text = str(st.get("metric", ""))
                    p_met.font.bold = True
                    p_met.font.size = Pt(24)
                    p_met.font.color.rgb = RGBColor(13, 148, 136)

                    p_lbl = tf_stat.add_paragraph()
                    p_lbl.text = str(st.get("label", ""))
                    p_lbl.font.bold = True
                    p_lbl.font.size = Pt(12)
                    p_lbl.font.color.rgb = RGBColor(15, 23, 42)
                    p_lbl.space_before = Pt(6)

                    if st.get("description"):
                        p_desc = tf_stat.add_paragraph()
                        p_desc.text = str(st.get("description", ""))
                        p_desc.font.size = Pt(10)
                        p_desc.font.color.rgb = RGBColor(71, 85, 105)
                        p_desc.space_before = Pt(4)
                embed_pptx_image(slide, img_stream, photographer_name, font_name)
            else:
                s_count = max(1, min(4, len(stats)))
                card_width = 10.8 / s_count
                for i, st in enumerate(stats[:4]):
                    left_pos = 1.15 + (i * card_width)
                    card_shape = slide.shapes.add_shape(1, Inches(left_pos), Inches(2.2), Inches(card_width - 0.25), Inches(3.8))
                    card_shape.fill.solid()
                    card_shape.fill.fore_color.rgb = RGBColor(240, 253, 250)
                    card_shape.line.color.rgb = RGBColor(20, 184, 166)
                    card_shape.line.width = Pt(1.5)

                    tf_stat = card_shape.text_frame
                    tf_stat.word_wrap = True
                    p_met = tf_stat.paragraphs[0]
                    p_met.text = str(st.get("metric", ""))
                    p_met.font.bold = True
                    p_met.font.size = Pt(28)
                    p_met.font.color.rgb = RGBColor(13, 148, 136)

                    p_lbl = tf_stat.add_paragraph()
                    p_lbl.text = str(st.get("label", ""))
                    p_lbl.font.bold = True
                    p_lbl.font.size = Pt(13)
                    p_lbl.font.color.rgb = RGBColor(15, 23, 42)
                    p_lbl.space_before = Pt(8)

                    if st.get("description"):
                        p_desc = tf_stat.add_paragraph()
                        p_desc.text = str(st.get("description", ""))
                        p_desc.font.size = Pt(11)
                        p_desc.font.color.rgb = RGBColor(71, 85, 105)
                        p_desc.space_before = Pt(6)

        elif visual_type == "cards_grid":
            cards = content.get("cards") or []
            if not cards and bullet_points:
                cards = [{"title": bp.split(":")[0] if ":" in bp else f"Pillar {i+1}", "description": bp.split(":")[1].strip() if ":" in bp else bp} for i, bp in enumerate(bullet_points[:4])]
            
            if img_stream:
                title_box.width = Inches(5.6)
                c_count = max(1, min(2, len(cards)))
                card_width = 5.6 / c_count
                for i, cd in enumerate(cards[:2]):
                    left_pos = 1.15 + (i * card_width)
                    card_shape = slide.shapes.add_shape(1, Inches(left_pos), Inches(2.2), Inches(card_width - 0.2), Inches(3.8))
                    card_shape.fill.solid()
                    card_shape.fill.fore_color.rgb = RGBColor(254, 243, 199)
                    card_shape.line.color.rgb = RGBColor(245, 158, 11)
                    card_shape.line.width = Pt(1)

                    tf_card = card_shape.text_frame
                    tf_card.word_wrap = True
                    p_t = tf_card.paragraphs[0]
                    p_t.text = str(cd.get("title", ""))
                    p_t.font.bold = True
                    p_t.font.size = Pt(13)
                    p_t.font.color.rgb = RGBColor(180, 83, 9)

                    p_d = tf_card.add_paragraph()
                    p_d.text = str(cd.get("description", ""))
                    p_d.font.size = Pt(10)
                    p_d.font.color.rgb = RGBColor(71, 85, 105)
                    p_d.space_before = Pt(6)
                embed_pptx_image(slide, img_stream, photographer_name, font_name)
            else:
                c_count = max(1, min(4, len(cards)))
                card_width = 10.8 / c_count
                for i, cd in enumerate(cards[:4]):
                    left_pos = 1.15 + (i * card_width)
                    card_shape = slide.shapes.add_shape(1, Inches(left_pos), Inches(2.2), Inches(card_width - 0.25), Inches(3.8))
                    card_shape.fill.solid()
                    card_shape.fill.fore_color.rgb = RGBColor(254, 243, 199)
                    card_shape.line.color.rgb = RGBColor(245, 158, 11)
                    card_shape.line.width = Pt(1)

                    tf_card = card_shape.text_frame
                    tf_card.word_wrap = True
                    p_t = tf_card.paragraphs[0]
                    p_t.text = str(cd.get("title", ""))
                    p_t.font.bold = True
                    p_t.font.size = Pt(14)
                    p_t.font.color.rgb = RGBColor(180, 83, 9)

                    p_d = tf_card.add_paragraph()
                    p_d.text = str(cd.get("description", ""))
                    p_d.font.size = Pt(11)
                    p_d.font.color.rgb = RGBColor(71, 85, 105)
                    p_d.space_before = Pt(8)

        elif visual_type == "two_column" and bullet_points:
            half = math.ceil(len(bullet_points) / 2)
            col1_bullets = bullet_points[:half]
            col2_bullets = bullet_points[half:]

            c1_left = Inches(6.8) if is_rtl_slide else Inches(1.15)
            c2_left = Inches(1.15) if is_rtl_slide else Inches(6.8)

            col1_box = slide.shapes.add_textbox(c1_left, Inches(1.8), Inches(5.3), Inches(4.7))
            tf1 = col1_box.text_frame
            tf1.word_wrap = True
            for i, bp in enumerate(col1_bullets):
                p_bp = tf1.add_paragraph() if i > 0 else tf1.paragraphs[0]
                p_bp.text = f"{bp}  •" if is_rtl_slide else f"• {bp}"
                p_bp.font.size = Pt(16)
                p_bp.font.color.rgb = RGBColor(51, 65, 85)
                p_bp.font.name = font_name
                p_bp.space_after = Pt(12)
                if is_rtl_slide:
                    p_bp.alignment = PP_ALIGN.RIGHT

            col2_box = slide.shapes.add_textbox(c2_left, Inches(1.8), Inches(5.3), Inches(4.7))
            tf2 = col2_box.text_frame
            tf2.word_wrap = True
            for i, bp in enumerate(col2_bullets):
                p_bp = tf2.add_paragraph() if i > 0 else tf2.paragraphs[0]
                p_bp.text = f"{bp}  •" if is_rtl_slide else f"• {bp}"
                p_bp.font.size = Pt(16)
                p_bp.font.color.rgb = RGBColor(51, 65, 85)
                p_bp.font.name = font_name
                p_bp.space_after = Pt(12)
                if is_rtl_slide:
                    p_bp.alignment = PP_ALIGN.RIGHT

        elif visual_type in ("hierarchy", "architecture"):
            levels = content.get("hierarchy_levels") or []
            if not levels and bullet_points:
                levels = [{"level": i+1, "title": bp.split(":")[0] if ":" in bp else f"Layer {i+1}", "subtitle": bp.split(":")[1].strip() if ":" in bp else bp} for i, bp in enumerate(bullet_points[:4])]
            
            for i, lvl in enumerate(levels[:4]):
                top_pos = 2.0 + (i * 1.0)
                h_shape = slide.shapes.add_shape(1, Inches(1.15 + (i * 0.4)), Inches(top_pos), Inches(10.0 - (i * 0.4)), Inches(0.8))
                h_shape.fill.solid()
                h_shape.fill.fore_color.rgb = RGBColor(243, 232, 255)
                h_shape.line.color.rgb = RGBColor(168, 85, 247)
                h_shape.line.width = Pt(1)

                tf_h = h_shape.text_frame
                tf_h.word_wrap = True
                p_h = tf_h.paragraphs[0]
                p_h.text = f"Tier {lvl.get('level', i+1)}: {lvl.get('title', '')} — {lvl.get('subtitle', '')}"
                p_h.font.bold = True
                p_h.font.size = Pt(13)
                p_h.font.color.rgb = RGBColor(88, 28, 135)

        else:
            # Check if this slide has an embedded image (image_text or standard with image)
            if img_stream:
                content_width = Inches(5.6)
                image_left = Inches(7.1)
                title_box.width = content_width

                top_offset = 1.7
                if subtitle:
                    sub_box = slide.shapes.add_textbox(title_left, Inches(1.6), content_width, Inches(0.6))
                    sub_tf = sub_box.text_frame
                    sub_tf.word_wrap = True
                    sub_p = sub_tf.paragraphs[0]
                    sub_p.text = subtitle
                    sub_p.font.size = Pt(16)
                    sub_p.font.bold = True
                    sub_p.font.color.rgb = primary_rgb
                    sub_p.font.name = font_name
                    if is_rtl_slide:
                        sub_p.alignment = PP_ALIGN.RIGHT
                    top_offset = 2.3

                if bullet_points:
                    body_box = slide.shapes.add_textbox(title_left, Inches(top_offset), content_width, Inches(4.0))
                    body_tf = body_box.text_frame
                    body_tf.word_wrap = True
                    for i, bp in enumerate(bullet_points[:4]):
                        p_bp = body_tf.add_paragraph() if i > 0 else body_tf.paragraphs[0]
                        p_bp.text = f"{bp}  •" if is_rtl_slide else f"•  {bp}"
                        p_bp.font.size = Pt(14)
                        p_bp.font.color.rgb = RGBColor(30, 41, 59)
                        p_bp.font.name = font_name
                        p_bp.space_after = Pt(10)
                        if is_rtl_slide:
                            p_bp.alignment = PP_ALIGN.RIGHT

                # Embedded Picture Shape
                try:
                    slide.shapes.add_picture(img_stream, image_left, Inches(1.6), Inches(5.4), Inches(4.2))
                    attr_box = slide.shapes.add_textbox(image_left, Inches(5.85), Inches(5.4), Inches(0.35))
                    attr_p = attr_box.text_frame.paragraphs[0]
                    attr_p.text = f"Photo by {photographer_name} on Unsplash"
                    attr_p.font.size = Pt(8)
                    attr_p.font.name = font_name
                    attr_p.font.color.rgb = RGBColor(148, 163, 184)
                except Exception as pic_err:
                    print(f"[PPTX Image Render Error] {pic_err}")
            else:
                # Standard / Conclusion / Key Points Layout without image
                top_offset = 1.7
                if subtitle:
                    sub_box = slide.shapes.add_textbox(title_left, Inches(1.6), Inches(11.0), Inches(0.6))
                    sub_tf = sub_box.text_frame
                    sub_tf.word_wrap = True
                    sub_p = sub_tf.paragraphs[0]
                    sub_p.text = subtitle
                    sub_p.font.size = Pt(17)
                    sub_p.font.bold = True
                    sub_p.font.color.rgb = primary_rgb
                    sub_p.font.name = font_name
                    if is_rtl_slide:
                        sub_p.alignment = PP_ALIGN.RIGHT
                    top_offset = 2.3

                if bullet_points:
                    body_box = slide.shapes.add_textbox(title_left, Inches(top_offset), Inches(11.0), Inches(4.2))
                    body_tf = body_box.text_frame
                    body_tf.word_wrap = True
                    for i, bp in enumerate(bullet_points):
                        p_bp = body_tf.add_paragraph() if i > 0 else body_tf.paragraphs[0]
                        p_bp.text = f"{bp}  •" if is_rtl_slide else f"•  {bp}"
                        p_bp.font.size = Pt(16)
                        p_bp.font.color.rgb = RGBColor(30, 41, 59)
                        p_bp.font.name = font_name
                        p_bp.space_after = Pt(14)
                        if is_rtl_slide:
                            p_bp.alignment = PP_ALIGN.RIGHT

        # Footer Bar
        footer_box = slide.shapes.add_textbox(Inches(0.8), Inches(6.5), Inches(11.0), Inches(0.4))
        ft_tf = footer_box.text_frame
        ft_p = ft_tf.paragraphs[0]
        pres_title = presentation.get('title', 'Presentation') if isinstance(presentation, dict) else getattr(presentation, 'title', 'Presentation')
        slide_num = slide_data.get('slide_number', idx + 1) if isinstance(slide_data, dict) else getattr(slide_data, 'slide_number', idx + 1)
        if is_rtl_slide:
            ft_p.text = f"PresentAI  |  {pres_title}  |  سلائیڈ {slide_num} از {len(slides)}"
            ft_p.alignment = PP_ALIGN.RIGHT
        else:
            ft_p.text = f"PresentAI  |  {pres_title}  |  Slide {slide_num} of {len(slides)}"
        ft_p.font.size = Pt(10)
        ft_p.font.name = font_name
        ft_p.font.color.rgb = RGBColor(148, 163, 184)

        # -------------------------------------------------------------
        # 2. EMBED REAL AUDIO NARRATION MEDIA SHAPE
        # -------------------------------------------------------------
        if audio_data:
            # Place audio shape cleanly in bottom-right corner of slide
            audio_left = Inches(0.8) if is_rtl_slide else Inches(12.2)
            slide.shapes.add_movie(
                io.BytesIO(audio_data),
                audio_left, Inches(6.45), Inches(0.4), Inches(0.4),
                mime_type="audio/mp3"
            )

    buffer = io.BytesIO()
    prs.save(buffer)
    base_bytes = buffer.getvalue()

    # -------------------------------------------------------------
    # 3. CONFIGURE AUTOMATIC SLIDE SHOW PLAYBACK TIMING
    # -------------------------------------------------------------
    final_pptx_bytes = configure_automatic_audio_timing(base_bytes)
    return final_pptx_bytes



# ==============================================================================
# 2. REAL PDF EXPORT ENGINE (16:9 Landscape With Urdu/English Fonts)
# ==============================================================================

def export_presentation_to_pdf(
    presentation: Any,
    color_theme: Optional[str] = None,
    custom_color: Optional[str] = None
) -> bytes:
    """Generates a valid 16:9 Landscape PDF presentation using ReportLab matching selected theme."""
    buffer = io.BytesIO()

    # 16:9 Landscape PDF size (11 x 6.1875 inches in points)
    page_width = 11 * 72
    page_height = 6.1875 * 72

    doc = SimpleDocTemplate(
        buffer,
        pagesize=(page_width, page_height),
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    pres_dict = to_dict(presentation)
    pres_title = pres_dict.get('title', 'Presentation')
    pres_lang = pres_dict.get('preferred_language') or pres_dict.get('language') or 'English'
    is_urdu = pres_lang.lower() == "urdu" or "urdu" in pres_lang.lower()

    # Extract theme
    theme = pres_dict.get('theme')
    primary_hex = get_theme_hex(color_theme, custom_color)
    secondary_hex = "#06b6d4"
    accent_hex = "#f59e0b"
    background_hex = "#ffffff"
    surface_hex = "#f8fafc"
    surface_border_hex = "#e2e8f0"
    text_hex = "#0f172a"
    text_muted_hex = "#64748b"

    if theme and isinstance(theme, dict):
        palette = theme.get('palette', {}) or {}
        primary_hex = palette.get('primary', primary_hex)
        secondary_hex = palette.get('secondary', secondary_hex)
        accent_hex = palette.get('accent', accent_hex)
        background_hex = palette.get('background', background_hex)
        surface_hex = palette.get('surface', surface_hex)
        surface_border_hex = palette.get('surface_border', surface_border_hex)
        text_hex = palette.get('text', text_hex)
        text_muted_hex = palette.get('text_muted', text_muted_hex)

    primary_rl_color = hex_to_reportlab_color(primary_hex)
    text_rl_color = hex_to_reportlab_color(text_hex)
    text_muted_rl_color = hex_to_reportlab_color(text_muted_hex)
    bg_rl_color = hex_to_reportlab_color(background_hex)
    surface_rl_color = hex_to_reportlab_color(surface_hex)
    border_rl_color = hex_to_reportlab_color(surface_border_hex)

    # Register Urdu/Unicode Font with cross-platform fallback
    font_registered = False

    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        import os

        font_paths = [
            'C:\\Windows\\Fonts\\arial.ttf',
            'C:\\Windows\\Fonts\\tahoma.ttf',
            'C:\\Windows\\Fonts\\segoeui.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf'
        ]
        for fp in font_paths:
            if os.path.exists(fp):
                pdfmetrics.registerFont(TTFont('PresentAIFont', fp))
                font_registered = True
                break
    except Exception:
        font_registered = False

    styles = getSampleStyleSheet()

    font_body = 'PresentAIFont' if (is_urdu and font_registered) else 'Helvetica'
    font_bold = 'PresentAIFont' if (is_urdu and font_registered) else 'Helvetica-Bold'
    font_italic = 'PresentAIFont' if (is_urdu and font_registered) else 'Helvetica-Oblique'

    from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER
    align_text = TA_RIGHT if is_urdu else TA_LEFT
    align_title = TA_RIGHT if is_urdu else TA_LEFT

    title_style = ParagraphStyle(
        'SlideTitle',
        parent=styles['Heading1'],
        fontSize=24,
        leading=28,
        textColor=text_rl_color,
        fontName=font_bold,
        spaceAfter=8,
        alignment=align_title
    )

    subtitle_style = ParagraphStyle(
        'SlideSubtitle',
        parent=styles['Normal'],
        fontSize=14,
        leading=18,
        textColor=primary_rl_color,
        fontName=font_bold,
        spaceAfter=14,
        alignment=align_text
    )

    bullet_style = ParagraphStyle(
        'SlideBullet',
        parent=styles['Normal'],
        fontSize=12,
        leading=17,
        textColor=text_rl_color,
        fontName=font_body,
        spaceAfter=10,
        leftIndent=15 if not is_urdu else 0,
        rightIndent=15 if is_urdu else 0,
        alignment=align_text
    )

    notes_style = ParagraphStyle(
        'SlideNotes',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=text_muted_rl_color,
        fontName=font_italic,
        spaceBefore=10,
        alignment=align_text
    )

    story = []
    raw_slides = pres_dict.get('slides', [])
    slides = sorted(raw_slides, key=lambda s: s.get('slide_number', 1) if isinstance(s, dict) else 1)

    for idx, slide in enumerate(slides):
        if idx > 0:
            story.append(PageBreak())

        slide_title = slide.get('title', f'Slide {idx+1}') if isinstance(slide, dict) else getattr(slide, 'title', f'Slide {idx+1}')
        slide_notes = slide.get('speaker_notes', '') if isinstance(slide, dict) else getattr(slide, 'speaker_notes', '')
        content = slide.get('content', {}) if isinstance(slide, dict) else getattr(slide, 'content', {})
        subtitle = content.get("subtitle") if isinstance(content, dict) else None
        bullet_points = content.get("bullet_points", []) if isinstance(content, dict) else []

        # Header Accent Line
        story.append(HRFlowable(width="100%", thickness=4, color=primary_rl_color, spaceBefore=0, spaceAfter=12))

        # Title
        story.append(Paragraph(reshape_urdu_text(slide_title), title_style))

        # Content
        if subtitle:
            story.append(Paragraph(reshape_urdu_text(subtitle), subtitle_style))

        if bullet_points:
            for bp in bullet_points:
                bp_reshaped = reshape_urdu_text(bp)
                if is_urdu:
                    story.append(Paragraph(f"{bp_reshaped} &nbsp; &bull;", bullet_style))
                else:
                    story.append(Paragraph(f"• &nbsp; {bp_reshaped}", bullet_style))

        # Speaker notes summary at bottom of slide page
        if slide_notes:
            story.append(Spacer(1, 14))
            story.append(HRFlowable(width="100%", thickness=0.5, color=border_rl_color, spaceBefore=5, spaceAfter=5))
            if is_urdu:
                notes_label = reshape_urdu_text("وضاحتی نوٹس")
                notes_content = reshape_urdu_text(slide_notes[:250])
                story.append(Paragraph(f"<b>{notes_label}:</b> {notes_content}...", notes_style))
            else:
                story.append(Paragraph(f"<b>Speaker Notes:</b> {slide_notes[:250]}...", notes_style))

    def add_page_decorations(canvas_obj: canvas.Canvas, doc_obj):
        canvas_obj.saveState()
        # Outer slide background
        canvas_obj.setFillColor(bg_rl_color)
        canvas_obj.rect(0, 0, page_width, page_height, fill=1, stroke=0)
        
        # Inner slide card surface
        canvas_obj.setFillColor(surface_rl_color)
        canvas_obj.setStrokeColor(border_rl_color)
        canvas_obj.setLineWidth(1)
        canvas_obj.roundRect(14, 14, page_width - 28, page_height - 28, 8, fill=1, stroke=1)
        
        # Slide top accent bar
        canvas_obj.setFillColor(primary_rl_color)
        canvas_obj.rect(14, page_height - 20, page_width - 28, 4, fill=1, stroke=0)

        # Footer
        canvas_obj.setFont(font_body, 8)
        canvas_obj.setFillColor(text_muted_rl_color)

        title_reshaped = reshape_urdu_text(pres_title)
        if is_urdu:
            footer_text = f"سلائیڈ {doc_obj.page} از {len(slides)}  |  {title_reshaped}  |  PresentAI"
            canvas_obj.drawRightString(page_width - 32, 22, footer_text)
        else:
            footer_text = f"PresentAI  |  {title_reshaped}  |  Slide {doc_obj.page} of {len(slides)}"
            canvas_obj.drawString(32, 22, footer_text)
        canvas_obj.restoreState()

    doc.build(story, onFirstPage=add_page_decorations, onLaterPages=add_page_decorations)
    buffer.seek(0)
    return buffer.getvalue()


# ==============================================================================
# 3. REAL JSON BACKUP EXPORT ENGINE
# ==============================================================================

def export_presentation_to_json(presentation: Any) -> bytes:
    """Exports structured JSON representation of presentation and slides."""
    slides = sorted(getattr(presentation, "slides", []), key=lambda s: getattr(s, "slide_number", 1))
    data = {
        "presentai_export_version": "2.0",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "presentation": {
            "id": str(getattr(presentation, "id", getattr(presentation, "_id", "1"))),
            "title": getattr(presentation, "title", "Presentation"),
            "source_type": getattr(presentation, "source_type", "prompt"),
            "source_name": getattr(presentation, "source_name", None),
            "language": getattr(presentation, "language", "English"),
            "audience": getattr(presentation, "audience", "General"),
            "presentation_type": getattr(presentation, "presentation_type", "Standard"),
            "tone": getattr(presentation, "tone", "Professional"),
            "slide_count": len(slides),
            "status": getattr(presentation, "status", "ready"),
            "slides": [
                {
                    "id": str(getattr(s, "id", getattr(s, "_id", str(getattr(s, "slide_number", 1))))),
                    "slide_number": getattr(s, "slide_number", 1),
                    "title": getattr(s, "title", ""),
                    "content": getattr(s, "content", {}),
                    "layout_type": getattr(s, "layout_type", "standard"),
                    "speaker_notes": getattr(s, "speaker_notes", ""),
                    "source_reference": getattr(s, "source_reference", None)
                }
                for s in slides
            ]
        }
    }
    return json.dumps(data, indent=2, ensure_ascii=False).encode('utf-8')


# ==============================================================================
# 4. REAL SPEAKER NOTES TEXT EXPORT
# ==============================================================================

def export_presentation_to_notes(presentation: Presentation) -> bytes:
    """Exports plain text speaker notes for all slides."""
    slides = sorted(presentation.slides, key=lambda s: s.slide_number)
    lines = [
        "==================================================",
        f"PresentAI Speaker Notes: {presentation.title}",
        f"Language: {presentation.language} | Total Slides: {len(slides)}",
        "==================================================\n"
    ]

    for s in slides:
        lines.append(f"--- Slide {s.slide_number}: {s.title} ---")
        if s.speaker_notes:
            lines.append(f"Speaker Notes:\n{s.speaker_notes}\n")
        else:
            lines.append("Speaker Notes:\n(No speaker notes recorded for this slide)\n")

    return "\n".join(lines).encode('utf-8')


# ==============================================================================
# 5. HIGH-RESOLUTION PNG / IMAGE EXPORT ENGINE (Pillow)
# ==============================================================================

def render_slide_to_image(
    slide: Slide,
    presentation_title: str,
    slide_number: int,
    total_slides: int,
    primary_hex: str = "#4f46e5"
) -> Image.Image:
    """Renders a single presentation slide to a high-resolution 1920x1080 16:9 PNG Image."""
    width, height = 1920, 1080
    img = Image.new("RGB", (width, height), color=(15, 23, 42))  # Dark sleek canvas #0f172a
    draw = ImageDraw.Draw(img)

    primary_rgb = hex_to_pil_rgb(primary_hex)

    # Draw inner slide card
    margin_x, margin_y = 60, 60
    card_w, card_h = width - (2 * margin_x), height - (2 * margin_y)
    draw.rounded_rectangle(
        [(margin_x, margin_y), (margin_x + card_w, margin_y + card_h)],
        radius=24,
        fill=(24, 34, 53),  # Deep slate card
        outline=(51, 65, 85),  # Slate-700
        width=2
    )

    # Accent top bar
    draw.rounded_rectangle(
        [(margin_x + 30, margin_y + 30), (margin_x + 40, margin_y + 110)],
        radius=5,
        fill=primary_rgb
    )

    # Fonts loading with robust fallbacks
    def get_font(size: int, bold: bool = False):
        try:
            import os
            font_names = [
                "arialbd.ttf" if bold else "arial.ttf",
                "segoeuib.ttf" if bold else "segoeui.ttf",
                "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
            ]
            for fn in font_names:
                for font_dir in ["C:\\Windows\\Fonts", "/usr/share/fonts/truetype", "/Library/Fonts"]:
                    path = os.path.join(font_dir, fn)
                    if os.path.exists(path):
                        return ImageFont.truetype(path, size)
            return ImageFont.load_default()
        except Exception:
            return ImageFont.load_default()

    title_font = get_font(52, bold=True)
    sub_font = get_font(34, bold=True)
    body_font = get_font(30, bold=False)
    footer_font = get_font(22, bold=False)

    # Draw Title
    title_text = slide.title or f"Slide {slide_number}"
    draw.text((margin_x + 60, margin_y + 35), title_text, fill=(255, 255, 255), font=title_font)

    # Draw Content
    content = slide.content if isinstance(slide.content, dict) else {}
    subtitle = content.get("subtitle")
    bullet_points = content.get("bullet_points", [])

    current_y = margin_y + 150

    if subtitle:
        draw.text((margin_x + 60, current_y), subtitle, fill=primary_rgb, font=sub_font)
        current_y += 70

    if bullet_points:
        for bp in bullet_points[:6]:  # Fit up to 6 bullets nicely
            draw.ellipse(
                [(margin_x + 60, current_y + 12), (margin_x + 72, current_y + 24)],
                fill=primary_rgb
            )
            # Simple text wrap approximation
            words = bp.split(' ')
            line = ""
            for word in words:
                test_line = f"{line} {word}".strip()
                if len(test_line) > 70:
                    draw.text((margin_x + 90, current_y), line, fill=(226, 232, 240), font=body_font)
                    current_y += 45
                    line = word
                else:
                    line = test_line
            if line:
                draw.text((margin_x + 90, current_y), line, fill=(226, 232, 240), font=body_font)
                current_y += 55

    # Footer
    footer_text = f"PresentAI  •  {presentation_title}  •  Slide {slide_number} of {total_slides}"
    draw.text((margin_x + 60, margin_y + card_h - 60), footer_text, fill=(148, 163, 184), font=footer_font)

    return img


def export_presentation_to_png(
    presentation: Presentation,
    slide_number: Optional[int] = None,
    color_theme: Optional[str] = None,
    custom_color: Optional[str] = None
) -> Tuple[bytes, str, str]:
    """
    Exports single slide PNG or multi-slide ZIP archive of PNGs.
    Returns: (file_bytes, filename, media_type)
    """
    slides = sorted(presentation.slides, key=lambda s: s.slide_number)
    primary_hex = get_theme_hex(color_theme, custom_color)

    if not slides:
        # Generate placeholder blank slide
        img = Image.new("RGB", (1920, 1080), color=(15, 23, 42))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue(), sanitize_filename(presentation.title, "png"), "image/png"

    if slide_number is not None and 1 <= slide_number <= len(slides):
        # Single slide PNG export
        target_slide = slides[slide_number - 1]
        img = render_slide_to_image(target_slide, presentation.title, target_slide.slide_number, len(slides), primary_hex)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        filename = sanitize_filename(f"{presentation.title}_Slide_{slide_number}", "png")
        return buf.getvalue(), filename, "image/png"

    # Multi-slide ZIP package
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for s in slides:
            img = render_slide_to_image(s, presentation.title, s.slide_number, len(slides), primary_hex)
            img_buf = io.BytesIO()
            img.save(img_buf, format="PNG")
            slide_filename = f"Slide_{s.slide_number:02d}.png"
            zip_file.writestr(slide_filename, img_buf.getvalue())

        # Include README
        readme_text = f"PresentAI High-Resolution Slide Images\nPresentation: {presentation.title}\nTotal Slides: {len(slides)}\nExported At: {datetime.now(timezone.utc).isoformat()}\n"
        zip_file.writestr("README.txt", readme_text)

    zip_buffer.seek(0)
    filename = sanitize_filename(f"{presentation.title}_Slides_PNG", "zip")
    return zip_buffer.getvalue(), filename, "application/zip"


# ==============================================================================
# 6. INTERACTIVE WEB / MOBILE PRESENTATION PACKAGE (HTML & ZIP)
# ==============================================================================

def generate_interactive_html_content(
    presentation: Presentation,
    color_theme: Optional[str] = None,
    custom_color: Optional[str] = None
) -> str:
    """
    Generates a standalone, fully self-contained HTML5 interactive presentation application.
    Features:
    - Present Mode with Fullscreen, Keyboard Arrows, Touch Swipe Gestures (iOS/Android/Safari)
    - Speaker Notes Drawer
    - Client-side AI Audio Narration (Web SpeechSynthesis with Urdu/English voice support)
    - AI Teach Me / Study Hub Mode
    - Real Browser Practice Mode (Web SpeechRecognition / Microphone Practice)
    - Responsive mobile layout and sleek dark mode glassmorphism
    """
    raw_slides = presentation.get("slides", []) if isinstance(presentation, dict) else getattr(presentation, "slides", [])
    slides = sorted(raw_slides, key=lambda s: s.get("slide_number", 1) if isinstance(s, dict) else getattr(s, "slide_number", 1))
    primary_hex = get_theme_hex(color_theme, custom_color)

    pres_id = str(presentation.get("id") or presentation.get("_id") if isinstance(presentation, dict) else getattr(presentation, "id", getattr(presentation, "_id", "1")))
    pres_title = presentation.get("title") if isinstance(presentation, dict) else getattr(presentation, "title", "Presentation")
    pres_lang = presentation.get("language") if isinstance(presentation, dict) else getattr(presentation, "language", "English")
    pres_aud = (presentation.get("audience") if isinstance(presentation, dict) else getattr(presentation, "audience", "General")) or "General"
    pres_type = (presentation.get("presentation_type") if isinstance(presentation, dict) else getattr(presentation, "presentation_type", "Standard")) or "Standard"
    pres_tone = (presentation.get("tone") if isinstance(presentation, dict) else getattr(presentation, "tone", "Professional")) or "Professional"

    deck_dict = {
        "id": pres_id,
        "title": pres_title or "Presentation",
        "language": pres_lang or "English",
        "audience": pres_aud,
        "presentation_type": pres_type,
        "tone": pres_tone,
        "slide_count": len(slides),
        "primary_color": primary_hex,
        "slides": [
            {
                "id": str(s.get("id") or s.get("_id") if isinstance(s, dict) else getattr(s, "id", getattr(s, "_id", str(getattr(s, "slide_number", 1))))),
                "slide_number": s.get("slide_number", idx + 1) if isinstance(s, dict) else getattr(s, "slide_number", idx + 1),
                "title": s.get("title", "") if isinstance(s, dict) else getattr(s, "title", ""),
                "content": (s.get("content", {}) if isinstance(s, dict) else getattr(s, "content", {})) if isinstance((s.get("content", {}) if isinstance(s, dict) else getattr(s, "content", {})), dict) else {},
                "layout_type": s.get("layout_type", "standard") if isinstance(s, dict) else getattr(s, "layout_type", "standard"),
                "speaker_notes": (s.get("speaker_notes", "") if isinstance(s, dict) else getattr(s, "speaker_notes", "")) or "",
                "source_reference": (s.get("source_reference", "") if isinstance(s, dict) else getattr(s, "source_reference", "")) or ""
            }
            for idx, s in enumerate(slides)
        ]
    }

    deck_json = json.dumps(deck_dict, ensure_ascii=False)

    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>{pres_title} — PresentAI Interactive Presentation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {{
      --primary: {primary_hex};
      --primary-hover: {primary_hex}dd;
      --bg-dark: #090d16;
      --card-bg: #111827;
      --card-border: #1f2937;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; user-select: none; }}
    body {{
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg-dark);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }}
    .urdu-text {{
      font-family: 'Noto Nastaliq Urdu', 'Segoe UI', Arial, sans-serif;
      direction: rtl;
      text-align: right;
    }}
    /* Header */
    header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 24px;
      background: rgba(17, 24, 39, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--card-border);
      z-index: 40;
    }}
    .brand {{
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 1.1rem;
    }}
    .badge {{
      background: var(--primary);
      color: #fff;
      font-size: 0.7rem;
      padding: 3px 8px;
      border-radius: 20px;
      font-weight: 600;
      text-transform: uppercase;
    }}
    .header-actions {{
      display: flex;
      gap: 8px;
    }}
    .btn {{
      background: #1f2937;
      color: #e2e8f0;
      border: 1px solid #374151;
      padding: 7px 14px;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }}
    .btn:hover {{ background: #374151; color: #fff; }}
    .btn-primary {{ background: var(--primary); color: #fff; border-color: var(--primary); }}
    .btn-primary:hover {{ background: var(--primary-hover); }}
    .btn-active {{ border-color: var(--primary); color: var(--primary); background: rgba(79, 70, 229, 0.1); }}

    /* Main Container */
    main {{
      flex: 1;
      display: flex;
      position: relative;
      overflow: hidden;
    }}

    /* Slide Stage */
    .stage-container {{
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
    }}
    .slide-aspect-box {{
      width: 100%;
      max-width: 1060px;
      aspect-ratio: 16 / 9;
      background: linear-gradient(135deg, #131d31 0%, #0d1322 100%);
      border: 1px solid #2d3748;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      padding: 48px;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow-y: auto;
      transition: transform 0.3s ease, opacity 0.3s ease;
    }}
    .slide-accent-bar {{
      width: 6px;
      height: 48px;
      background: var(--primary);
      border-radius: 4px;
      position: absolute;
      top: 48px;
      left: 48px;
    }}
    .slide-aspect-box.urdu .slide-accent-bar {{
      left: auto;
      right: 48px;
    }}
    .slide-title {{
      font-size: 2.2rem;
      font-weight: 800;
      margin-left: 20px;
      margin-bottom: 24px;
      color: #fff;
    }}
    .slide-aspect-box.urdu .slide-title {{
      margin-left: 0;
      margin-right: 20px;
    }}
    .slide-subtitle {{
      font-size: 1.3rem;
      color: var(--primary);
      font-weight: 700;
      margin-bottom: 20px;
    }}
    .bullet-list {{
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 10px;
    }}
    .bullet-item {{
      font-size: 1.15rem;
      line-height: 1.6;
      color: #cbd5e1;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }}
    .bullet-dot {{
      width: 8px;
      height: 8px;
      background: var(--primary);
      border-radius: 50%;
      margin-top: 10px;
      flex-shrink: 0;
    }}
    .two-column-layout {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }}

    /* Drawer Panels (Notes, Teach Me, Practice) */
    .drawer {{
      width: 380px;
      background: #111827;
      border-left: 1px solid var(--card-border);
      display: flex;
      flex-direction: column;
      padding: 20px;
      overflow-y: auto;
      transition: width 0.3s ease;
      z-index: 30;
    }}
    .drawer.hidden {{ display: none; }}
    .drawer-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #1f2937;
    }}
    .drawer-title {{ font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }}

    /* Narration Bar */
    .audio-player-bar {{
      background: #1e293b;
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}

    /* Practice Mode Card */
    .mic-record-btn {{
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #dc2626;
      border: none;
      color: #fff;
      font-size: 1.8rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 20px auto;
      box-shadow: 0 0 20px rgba(220, 38, 38, 0.4);
      transition: all 0.2s;
    }}
    .mic-record-btn.recording {{
      animation: pulse 1.5s infinite;
      background: #16a34a;
      box-shadow: 0 0 25px rgba(22, 163, 74, 0.6);
    }}
    @keyframes pulse {{
      0% {{ transform: scale(1); }}
      50% {{ transform: scale(1.08); }}
      100% {{ transform: scale(1); }}
    }}
    .transcript-box {{
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 14px;
      min-height: 120px;
      font-size: 0.95rem;
      color: #e2e8f0;
      line-height: 1.5;
    }}

    /* Controls Bar */
    .controls-bar {{
      padding: 16px 24px;
      background: rgba(17, 24, 39, 0.95);
      border-top: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      z-index: 40;
    }}
    .progress-track {{
      flex: 1;
      height: 6px;
      background: #1f2937;
      border-radius: 4px;
      overflow: hidden;
      margin: 0 16px;
    }}
    .progress-fill {{
      height: 100%;
      background: var(--primary);
      width: 0%;
      transition: width 0.3s;
    }}

    /* Mobile Responsive */
    @media (max-width: 768px) {{
      header {{ padding: 10px 14px; }}
      .stage-container {{ padding: 10px; }}
      .slide-aspect-box {{ padding: 24px; border-radius: 12px; }}
      .slide-title {{ font-size: 1.4rem; }}
      .slide-subtitle {{ font-size: 1.05rem; }}
      .bullet-item {{ font-size: 0.95rem; }}
      .two-column-layout {{ grid-template-columns: 1fr; gap: 14px; }}
      .drawer {{
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        height: 60%;
        border-left: none;
        border-top: 1px solid var(--card-border);
        box-shadow: 0 -10px 30px rgba(0,0,0,0.8);
      }}
      .controls-bar {{ padding: 10px 14px; }}
      .header-actions .btn span {{ display: none; }}
    }}
  </style>
</head>
<body>

  <!-- Hidden Deck Data -->
  <script id="deck-data" type="application/json">
    {deck_json}
  </script>

  <!-- Navigation Header -->
  <header>
    <div class="brand">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary);"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 8 6 4-6 4Z"/></svg>
      <span>PresentAI</span>
      <span class="badge">Interactive</span>
    </div>
    <div class="header-actions">
      <button class="btn" id="btn-narration" title="Narration">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        <span>Audio Narrate</span>
      </button>
      <button class="btn" id="btn-notes" title="Speaker Notes">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span>Notes</span>
      </button>
      <button class="btn" id="btn-teach" title="AI Teach Me">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        <span>Teach Me</span>
      </button>
      <button class="btn" id="btn-practice" title="Practice Mode">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
        <span>Practice</span>
      </button>
      <button class="btn" id="btn-fullscreen" title="Fullscreen">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
      </button>
    </div>
  </header>

  <!-- Main View -->
  <main id="main-container">
    <div class="stage-container" id="stage">
      <div class="slide-aspect-box" id="slide-box">
        <div class="slide-accent-bar"></div>
        <h1 class="slide-title" id="slide-title">Loading slide...</h1>
        <div class="slide-subtitle" id="slide-subtitle"></div>
        <div id="slide-content-area"></div>
      </div>
    </div>

    <!-- Speaker Notes Drawer (Presenter Script & Narration) -->
    <aside class="drawer hidden" id="drawer-notes">
      <div class="drawer-header">
        <div class="drawer-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Speaker Notes (Presenter Script)
        </div>
        <button class="btn" onclick="toggleDrawer('drawer-notes')">✕</button>
      </div>
      <div class="audio-player-bar">
        <button class="btn btn-primary" id="btn-play-voice" style="padding:5px 10px; font-size:0.8rem;">
          ▶ Speak Script
        </button>
        <label style="font-size:0.75rem; color:#94a3b8; display:flex; align-items:center; gap:5px; cursor:pointer;">
          <input type="checkbox" id="chk-auto-advance"> Auto-Advance
        </label>
      </div>
      <div style="font-size:0.75rem; color:#94a3b8; font-weight:700; text-transform:uppercase; margin-bottom:8px;">What to say:</div>
      <p id="notes-text" style="font-size:0.95rem; line-height:1.6; color:#cbd5e1; white-space:pre-wrap;">No speaker notes.</p>
    </aside>

    <!-- Teach Me Drawer (Educational Explanation & Meaning) -->
    <aside class="drawer hidden" id="drawer-teach">
      <div class="drawer-header">
        <div class="drawer-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          AI Teach Me (Concept Meaning)
        </div>
        <button class="btn" onclick="toggleDrawer('drawer-teach')">✕</button>
      </div>
      <div id="teach-content" style="display:flex; flex-direction:column; gap:14px;">
        <div style="background:#1e293b; padding:14px; border-radius:12px;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--primary); text-transform:uppercase; margin-bottom:6px;" id="teach-title-label">What this slide means:</div>
          <p id="teach-explanation" style="font-size:0.9rem; line-height:1.6; color:#e2e8f0;"></p>
        </div>
        <div style="background:#1e293b; padding:14px; border-radius:12px;">
          <div style="font-size:0.75rem; font-weight:700; color:#06b6d4; text-transform:uppercase; margin-bottom:6px;" id="teach-terms-label">Key Concepts & Terms:</div>
          <div id="teach-terms" style="font-size:0.85rem; line-height:1.5; color:#cbd5e1;"></div>
        </div>
        <div style="background:#1e293b; padding:14px; border-radius:12px;">
          <div style="font-size:0.75rem; font-weight:700; color:#10b981; text-transform:uppercase; margin-bottom:6px;" id="teach-summary-label">Key Takeaway:</div>
          <p id="teach-summary" style="font-size:0.9rem; line-height:1.5; color:#e2e8f0;"></p>
        </div>
      </div>
    </aside>

    <!-- Practice Mode Drawer -->
    <aside class="drawer hidden" id="drawer-practice">
      <div class="drawer-header">
        <div class="drawer-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          Practice Mode
        </div>
        <button class="btn" onclick="toggleDrawer('drawer-practice')">✕</button>
      </div>
      <div style="text-align:center;">
        <p style="font-size:0.85rem; color:#94a3b8; margin-bottom:10px;">Speak into your microphone to practice presenting this slide:</p>
        <button class="mic-record-btn" id="btn-mic-record">🎤</button>
        <div id="practice-status" style="font-size:0.85rem; color:#94a3b8; margin-bottom:12px;">Ready to listen</div>
      </div>
      <div class="transcript-box" id="practice-transcript">Your speech transcript will appear here in real time...</div>
    </aside>
  </main>

  <!-- Controls Bar -->
  <div class="controls-bar">
    <div style="display:flex; gap:8px;">
      <button class="btn" id="btn-prev" title="Previous Slide (Left Arrow)">◀ Prev</button>
      <button class="btn btn-primary" id="btn-next" title="Next Slide (Right Arrow or Space)">Next ▶</button>
    </div>
    <div class="progress-track">
      <div class="progress-fill" id="progress-bar"></div>
    </div>
    <div style="font-size:0.85rem; color:#94a3b8; font-weight:600;" id="slide-counter">
      1 / 1
    </div>
  </div>

  <!-- Interactive Runtime Logic -->
  <script>
    const deck = JSON.parse(document.getElementById('deck-data').textContent.trim());
    let currentIndex = 0;
    const slides = deck.slides || [];
    const isUrduPres = (deck.language || '').toLowerCase().includes('urdu');

    // UI Elements
    const slideBox = document.getElementById('slide-box');
    const slideTitle = document.getElementById('slide-title');
    const slideSubtitle = document.getElementById('slide-subtitle');
    const slideContentArea = document.getElementById('slide-content-area');
    const slideCounter = document.getElementById('slide-counter');
    const progressBar = document.getElementById('progress-bar');
    const notesText = document.getElementById('notes-text');
    const teachTitleLabel = document.getElementById('teach-title-label');
    const teachTermsLabel = document.getElementById('teach-terms-label');
    const teachSummaryLabel = document.getElementById('teach-summary-label');
    const teachExplanation = document.getElementById('teach-explanation');
    const teachTerms = document.getElementById('teach-terms');
    const teachSummary = document.getElementById('teach-summary');
    const btnPlayVoice = document.getElementById('btn-play-voice');
    const chkAutoAdvance = document.getElementById('chk-auto-advance');

    function isUrduText(str) {{
      return /[\\u0600-\\u06FF\\u0750-\\u077F]/.test(str || '');
    }}

    function renderSlide(idx) {{
      if (idx < 0 || idx >= slides.length) return;
      currentIndex = idx;
      const s = slides[idx];
      const isUrdu = isUrduPres || isUrduText(s.title);

      if (isUrdu) {{
        slideBox.classList.add('urdu');
        slideTitle.classList.add('urdu-text');
      }} else {{
        slideBox.classList.remove('urdu');
        slideTitle.classList.remove('urdu-text');
      }}

      slideTitle.textContent = s.title || `Slide ${{s.slide_number}}`;
      const content = s.content || {{}};

      if (content.subtitle) {{
        slideSubtitle.style.display = 'block';
        slideSubtitle.textContent = content.subtitle;
        if (isUrdu) slideSubtitle.classList.add('urdu-text');
        else slideSubtitle.classList.remove('urdu-text');
      }} else {{
        slideSubtitle.style.display = 'none';
      }}

      // Bullet Points
      const bullets = content.bullet_points || [];
      if (s.layout_type === 'two_column' && bullets.length > 1) {{
        const half = Math.ceil(bullets.length / 2);
        const col1 = bullets.slice(0, half);
        const col2 = bullets.slice(half);
        slideContentArea.innerHTML = `
          <div class="two-column-layout">
            <ul class="bullet-list">${{col1.map(b => `<li class="bullet-item ${{isUrdu?'urdu-text':''}}"><span class="bullet-dot"></span><span>${{b}}</span></li>`).join('')}}</ul>
            <ul class="bullet-list">${{col2.map(b => `<li class="bullet-item ${{isUrdu?'urdu-text':''}}"><span class="bullet-dot"></span><span>${{b}}</span></li>`).join('')}}</ul>
          </div>
        `;
      }} else if (bullets.length > 0) {{
        slideContentArea.innerHTML = `
          <ul class="bullet-list">${{bullets.map(b => `<li class="bullet-item ${{isUrdu?'urdu-text':''}}"><span class="bullet-dot"></span><span>${{b}}</span></li>`).join('')}}</ul>
        `;
      }} else {{
        slideContentArea.innerHTML = '';
      }}

      // 1. SPEAKER NOTES DRAWER (Presenter Speaking Script)
      notesText.textContent = s.speaker_notes || '(No speaker notes recorded for this slide)';
      if (isUrduText(s.speaker_notes)) notesText.classList.add('urdu-text');
      else notesText.classList.remove('urdu-text');

      // 2. TEACH ME DRAWER (Educational Explanation & Concept Meaning)
      if (isUrdu) {{
        teachTitleLabel.textContent = "سلائیڈ کا تفصیلی مفہوم:";
        teachTermsLabel.textContent = "بنیادی تصورات اور اہم نکات:";
        teachSummaryLabel.textContent = "اہم خلاصہ اور نتیجہ:";
        teachExplanation.textContent = `یہ سلائیڈ "${{s.title}}" کے بنیادی تصور اور اس کی اہمیت کو واضح کرتی ہے۔ ${{content.subtitle ? content.subtitle + '۔ ' : ''}}اس کا مقصد موضوع کی گہرائی کو آسان انداز میں سمجھانا ہے۔`;
        teachExplanation.classList.add('urdu-text');
        teachSummary.textContent = bullets.length ? `بنیادی نکتہ: ${{bullets[0]}}` : `اس سلائیڈ کا مرکزی مقصد موضوع کی تفہیم کو آسان بنانا ہے۔`;
        teachSummary.classList.add('urdu-text');
        if (bullets.length > 0) {{
          teachTerms.innerHTML = `<ul style="list-style:disc; margin-right:20px; direction:rtl; text-align:right;">${{bullets.map(b => `<li style="margin-bottom:6px;">${{b}}</li>`).join('')}}</ul>`;
        }} else {{
          teachTerms.innerHTML = `<p class="urdu-text">${{s.title}} — بنیادی موضوعاتی تفہیم۔</p>`;
        }}
      }} else {{
        teachTitleLabel.textContent = "What this slide means:";
        teachTermsLabel.textContent = "Core Concepts & Terms:";
        teachSummaryLabel.textContent = "Key Takeaway:";
        teachExplanation.textContent = `This slide explains the fundamental principles of "${{s.title}}". ${{content.subtitle ? 'It focuses specifically on ' + content.subtitle + '. ' : ''}}The goal is to demystify complex concepts and provide an intuitive understanding for learners.`;
        teachExplanation.classList.remove('urdu-text');
        teachSummary.textContent = bullets.length ? `Primary takeaway: ${{bullets[0]}}` : `Focuses on delivering clarity and practical context for ${{s.title}}.`;
        teachSummary.classList.remove('urdu-text');
        if (bullets.length > 0) {{
          teachTerms.innerHTML = `<ul style="list-style:disc; margin-left:18px;">${{bullets.map(b => `<li style="margin-bottom:6px;"><strong>${{b.split(':')[0]}}:</strong> ${{b.includes(':') ? b.split(':').slice(1).join(':') : b}}</li>`).join('')}}</ul>`;
        }} else {{
          teachTerms.innerHTML = `<p>${{s.title}} — Essential foundation for this presentation topic.</p>`;
        }}
      }}

      // Progress
      slideCounter.textContent = `${{idx + 1}} / ${{slides.length}}`;
      progressBar.style.width = `${{((idx + 1) / slides.length) * 100}}%`;
    }}

    function nextSlide() {{
      stopNarration();
      if (currentIndex < slides.length - 1) renderSlide(currentIndex + 1);
    }}

    function prevSlide() {{
      stopNarration();
      if (currentIndex > 0) renderSlide(currentIndex - 1);
    }}

    document.getElementById('btn-next').addEventListener('click', nextSlide);
    document.getElementById('btn-prev').addEventListener('click', prevSlide);

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {{
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') nextSlide();
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') prevSlide();
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    }});

    // Touch Swipe Gestures for Mobile / iOS
    let touchStartX = 0;
    let touchEndX = 0;
    document.addEventListener('touchstart', (e) => {{
      touchStartX = e.changedTouches[0].screenX;
    }}, {{ passive: true }});
    document.addEventListener('touchend', (e) => {{
      touchEndX = e.changedTouches[0].screenX;
      if (touchEndX < touchStartX - 50) nextSlide();
      else if (touchEndX > touchStartX + 50) prevSlide();
    }}, {{ passive: true }});

    // Drawer toggling
    function toggleDrawer(id) {{
      const drawers = ['drawer-notes', 'drawer-teach', 'drawer-practice'];
      drawers.forEach(d => {{
        const el = document.getElementById(d);
        if (d === id) el.classList.toggle('hidden');
        else el.classList.add('hidden');
      }});
    }}

    document.getElementById('btn-notes').addEventListener('click', () => toggleDrawer('drawer-notes'));
    document.getElementById('btn-teach').addEventListener('click', () => toggleDrawer('drawer-teach'));
    document.getElementById('btn-practice').addEventListener('click', () => toggleDrawer('drawer-practice'));
    document.getElementById('btn-narration').addEventListener('click', () => {{
      toggleDrawer('drawer-notes');
      playNarration();
    }});

    // Fullscreen
    function toggleFullscreen() {{
      if (!document.fullscreenElement) {{
        document.documentElement.requestFullscreen().catch(() => {{}});
      }} else {{
        document.exitFullscreen().catch(() => {{}});
      }}
    }}
    document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);

    // Audio Narration Engine (Web SpeechSynthesis)
    let isSpeaking = false;
    function stopNarration() {{
      if ('speechSynthesis' in window) {{
        window.speechSynthesis.cancel();
      }}
      isSpeaking = false;
      btnPlayVoice.textContent = '▶ Speak Notes';
    }}

    function playNarration() {{
      if (!('speechSynthesis' in window)) {{
        alert('Web Speech Synthesis is not supported in this browser.');
        return;
      }}
      if (isSpeaking) {{
        stopNarration();
        return;
      }}
      const curSlide = slides[currentIndex];
      const textToSpeak = curSlide.speaker_notes || curSlide.title;
      if (!textToSpeak) return;

      const utter = new SpeechSynthesisUtterance(textToSpeak);
      const isUrdu = isUrduPres || isUrduText(textToSpeak);
      utter.lang = isUrdu ? 'ur-PK' : 'en-US';
      utter.rate = 0.95;

      utter.onend = () => {{
        isSpeaking = false;
        btnPlayVoice.textContent = '▶ Speak Notes';
        if (chkAutoAdvance.checked && currentIndex < slides.length - 1) {{
          nextSlide();
          setTimeout(playNarration, 400);
        }}
      }};
      utter.onerror = () => {{
        isSpeaking = false;
        btnPlayVoice.textContent = '▶ Speak Notes';
      }};

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
      isSpeaking = true;
      btnPlayVoice.textContent = '⏹ Stop Audio';
    }}
    btnPlayVoice.addEventListener('click', playNarration);

    // Practice Mode Speech Recognition (Web Speech API)
    const micBtn = document.getElementById('btn-mic-record');
    const practiceStatus = document.getElementById('practice-status');
    const practiceTranscript = document.getElementById('practice-transcript');
    let recognition = null;
    let isRecording = false;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {{
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (e) => {{
        let finalStr = '';
        let interimStr = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {{
          if (e.results[i].isFinal) finalStr += e.results[i][0].transcript;
          else interimStr += e.results[i][0].transcript;
        }}
        practiceTranscript.innerHTML = `<strong>${{finalStr}}</strong> <span style="color:#94a3b8;">${{interimStr}}</span>`;
      }};

      recognition.onerror = (err) => {{
        practiceStatus.textContent = `Mic Error: ${{err.error || 'Permission denied'}}`;
        micBtn.classList.remove('recording');
        isRecording = false;
      }};

      recognition.onend = () => {{
        if (isRecording) recognition.start();
      }};
    }}

    micBtn.addEventListener('click', () => {{
      if (!recognition) {{
        alert('Speech recognition is not supported in this browser. Please try Google Chrome or Safari.');
        return;
      }}
      if (isRecording) {{
        recognition.stop();
        isRecording = false;
        micBtn.classList.remove('recording');
        practiceStatus.textContent = 'Practice paused';
      }} else {{
        practiceTranscript.textContent = 'Listening... Start speaking now.';
        const isUrdu = isUrduPres || isUrduText(slides[currentIndex]?.title);
        recognition.lang = isUrdu ? 'ur-PK' : 'en-US';
        recognition.start();
        isRecording = true;
        micBtn.classList.add('recording');
        practiceStatus.textContent = 'Listening to your presentation...';
      }}
    }});

    // Initial Render
    renderSlide(0);
  </script>
</body>
</html>"""
    return html_template


def export_presentation_to_json(presentation: Any) -> bytes:
    """Exports structured JSON representation of presentation and slides."""
    slides_data = []
    for s in getattr(presentation, "slides", []):
        slides_data.append({
            "slide_number": getattr(s, "slide_number", 1),
            "title": getattr(s, "title", ""),
            "content": getattr(s, "content", {}),
            "layout_type": getattr(s, "layout_type", "standard"),
            "speaker_notes": getattr(s, "speaker_notes", "")
        })
    data = {
        "title": getattr(presentation, "title", "Presentation"),
        "language": getattr(presentation, "language", "English"),
        "audience": getattr(presentation, "audience", "General"),
        "slide_count": len(slides_data),
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "slides": slides_data
    }
    return json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8")


def export_presentation_to_notes(presentation: Any) -> bytes:
    """Exports speaker talking points and notes as plain text."""
    lines = [
        f"SPEAKER NOTES & TALKING POINTS: {getattr(presentation, 'title', 'Presentation')}",
        f"Language: {getattr(presentation, 'language', 'English')}",
        f"Exported At: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        "=" * 80,
        ""
    ]
    for idx, s in enumerate(getattr(presentation, "slides", []), 1):
        lines.append(f"--- SLIDE {idx}: {getattr(s, 'title', '')} ---")
        notes = getattr(s, "speaker_notes", "")
        if notes:
            lines.append(notes)
        else:
            lines.append("(No speaker notes recorded for this slide)")
        lines.append("")
    return "\n".join(lines).encode("utf-8")


def export_presentation_to_html(
    presentation: Any,
    color_theme: Optional[str] = None,
    custom_color: Optional[str] = None
) -> bytes:
    """Exports self-contained standalone Interactive HTML Presentation."""
    html_str = generate_interactive_html_content(presentation, color_theme, custom_color)
    return html_str.encode('utf-8')


def export_presentation_to_package_zip(
    presentation: Any,
    color_theme: Optional[str] = None,
    custom_color: Optional[str] = None
) -> bytes:
    """Exports complete Interactive Web/Mobile Presentation Package as a ZIP archive."""
    html_content = generate_interactive_html_content(presentation, color_theme, custom_color)
    json_bytes = export_presentation_to_json(presentation)
    notes_bytes = export_presentation_to_notes(presentation)

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("index.html", html_content)
        zf.writestr("presentation.json", json_bytes)
        zf.writestr("speaker_notes.txt", notes_bytes)

        pres_title = presentation.get('title') if isinstance(presentation, dict) else getattr(presentation, 'title', 'Presentation')
        pres_lang = presentation.get('language') if isinstance(presentation, dict) else getattr(presentation, 'language', 'English')
        raw_slides = presentation.get('slides', []) if isinstance(presentation, dict) else getattr(presentation, 'slides', [])
        readme = f"""================================================================================
PresentAI — Standalone Interactive Presentation Package
================================================================================

Presentation: {pres_title}
Language: {pres_lang}
Total Slides: {len(raw_slides)}
Exported At: {datetime.now(timezone.utc).isoformat()}

HOW TO USE THIS PACKAGE:
--------------------------------------------------------------------------------
1. DESKTOP / LAPTOP (Chrome, Firefox, Edge, Safari):
   Double-click 'index.html' to open the presentation in any web browser.
   - Use Arrow Left / Right or Space to navigate slides.
   - Press 'F' for Fullscreen presentation mode.
   - Click 'Audio Narrate' to hear slide speaker notes spoken aloud.
   - Click 'Teach Me' for educational concepts and study takeaways.
   - Click 'Practice' to practice with real microphone speech evaluation.

2. IPHONE / IPAD / SAFARI:
   - Transfer 'index.html' or open via AirDrop / Files app in Safari.
   - Swipe Left or Right on your touchscreen to advance slides.
   - Responsive portrait and landscape mobile interface.

3. ANDROID / CHROME:
   - Open 'index.html' in Google Chrome for Android.
   - Full microphone speech recognition and audio narration support.

4. BACKUP / RE-IMPORT:
   - 'presentation.json' contains the full structured backup for PresentAI.
================================================================================
"""
        zf.writestr("README.txt", readme)

    zip_buffer.seek(0)
    return zip_buffer.getvalue()
