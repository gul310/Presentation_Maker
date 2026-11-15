import json
import logging
import time
from typing import List, Optional
from fastapi import HTTPException, status
from openai import OpenAI

from app.core.config import settings
from app.schemas.presentation import AITeachMeExplanation, RefinedSlideResponse
from app.schemas.practice import PracticeEvaluation
from app.services.ai_service import AIPresentationResult

logger = logging.getLogger("presentai.deepseek_service")

def get_deepseek_client() -> OpenAI:
    """Initializes and returns OpenAI-compatible DeepSeek Client if API key is configured."""
    api_key = (settings.DEEPSEEK_API_KEY or "").strip()
    if not api_key:
        logger.warning("DeepSeek API key is not configured in backend settings.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error_code": "AI_SERVICE_UNAVAILABLE",
                "message": "AI presentation service is currently not configured. Please contact system administrator."
            }
        )
    try:
        return OpenAI(api_key=api_key, base_url="https://api.deepseek.com", timeout=15.0)
    except Exception as e:
        logger.error(f"Failed to initialize DeepSeek Client: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error_code": "AI_SERVICE_ERROR",
                "message": "AI service initialization failed."
            }
        )

def build_deepseek_system_instruction(source_type: str, language: str, audience: str, tone: str) -> str:
    """Constructs system instruction prompting DeepSeek for structured presentation deck generation with intelligent visual layouts."""
    base_instruction = (
        "You are PresentAI, an expert presentation designer, visual information architect, and speech coach.\n"
        "Your task is to generate a structured, highly professional, visually engaging presentation deck with speaker notes.\n\n"
        "CRITICAL PROFESSIONAL VISUAL DESIGN REQUIREMENTS:\n"
        "1. INTELLIGENT VISUAL LAYOUT SELECTION: Do NOT output only plain bullet points or basic text boxes. Intelligently select the best visual layout for each slide based on its content:\n"
        "   - Slide 1: 'title'\n"
        "   - Final slide: 'conclusion'\n"
        "   - Topic transition: 'section_header'\n"
        "   - Steps/workflow: 'process_flow' or 'flowchart' (with 'steps')\n"
        "   - Milestones/roadmap: 'timeline' (with 'timeline_items')\n"
        "   - Comparisons: 'comparison' (with 'comparison_columns')\n"
        "   - KPIs/metrics: 'stats_grid' (with 'stats')\n"
        "   - Key pillars/features: 'cards_grid' (with 'cards')\n"
        "   - Data matrix: 'table' (with 'table_data')\n"
        "   - Architecture/hierarchy: 'hierarchy' or 'architecture' (with 'hierarchy_levels')\n"
        "   - Two column: 'two_column'\n"
        "   - Standard structured text: 'standard'\n"
        "2. VISUAL VARIETY & BALANCE: Do not repeat the same diagram layout on every slide. Provide varied visual structures matching the slide narrative.\n"
        "3. REAL GENERATED DATA: Generate real, relevant content based on user input. No placeholders.\n"
        f"4. PRESENTATION LANGUAGE: You MUST generate the ENTIRE presentation (title, slide titles, subtitles, bullet points, visual fields, speaker notes) in {language}.\n"
        f"5. TARGET AUDIENCE: Tailor language complexity for a {audience} audience.\n"
        f"6. TONE & STYLE: Use a {tone} tone throughout.\n"
        f"7. SPEAKER NOTES: Provide comprehensive spoken speaker notes for EVERY slide.\n"
        "8. PRESENTATION TITLE & HEADING RULES:\n"
        "   - Main Title: Generate a professional title in Title Case (e.g. 'Semantic Web: Architecture, Applications and Future Potential'). Never use prompt instructions (no 'Create a presentation', 'Make 8 slides', 'with images').\n"
        "   - Slide Headings: Every slide must have a distinct, unique heading relevant to that slide's specific content. Slide 1 must be an Introduction (e.g. 'Introduction to Semantic Web') and NOT repeat the main presentation title. Middle slides must have specific subtopic headings. Final slide must be Conclusion/Roadmap.\n"
        "   - All slide headings must be 100% unique.\n"
        f"9. OUTPUT FORMAT: Respond ONLY with a single valid JSON object strictly matching this schema:\n"
        "{\n"
        '  "title": "Main Title",\n'
        '  "language": "' + language + '",\n'
        '  "slides": [\n'
        '    {\n'
        '      "slide_number": 1,\n'
        '      "title": "Slide Headline",\n'
        '      "subtitle": "Optional Subtitle",\n'
        '      "bullet_points": ["Point 1", "Point 2"],\n'
        '      "layout_type": "standard",\n'
        '      "visual_type": "standard",\n'
        '      "steps": [{"step": 1, "label": "Step Name", "description": "Step detail"}],\n'
        '      "timeline_items": [{"period": "Phase 1", "title": "Milestone", "description": "Detail"}],\n'
        '      "comparison_columns": [{"heading": "Option A", "badge": "Pros", "points": ["Point 1"]}],\n'
        '      "stats": [{"metric": "95%", "label": "Accuracy", "description": "High precision", "trend": "+12%"}],\n'
        '      "cards": [{"title": "Pillar 1", "description": "Description", "icon_name": "target"}],\n'
        '      "table_data": {"headers": ["Col 1", "Col 2"], "rows": [["A", "B"]]}, \n'
        '      "hierarchy_levels": [{"level": 1, "title": "Top Tier", "subtitle": "Role"}],\n'
        '      "speaker_notes": "Spoken presenter notes...",\n'
        '      "source_reference": "Optional Section Reference"\n'
        '    }\n'
        '  ]\n'
        "}"
    )

    if source_type == "document":
        base_instruction += (
            "\n\nDOCUMENT GROUNDING CONSTRAINT:\n"
            "You are generating this presentation based on an extracted source document.\n"
            "- Rely strictly on the provided document content as your primary source.\n"
            "- Preserve key facts, metrics, and logical section breakdowns.\n"
            "- Include source references where applicable."
        )

    return base_instruction


def generate_presentation_deck_deepseek(
    source_type: str,
    source_content: str,
    title_hint: Optional[str] = None,
    slide_count: int = 6,
    language: str = "English",
    audience: str = "General",
    presentation_type: str = "Informative",
    tone: str = "Professional"
) -> AIPresentationResult:
    """Generates structured presentation deck using DeepSeek API."""
    client = get_deepseek_client()
    slide_count = max(3, min(30, slide_count))
    model_name = (settings.DEEPSEEK_MODEL or "deepseek-chat").strip()

    system_instruction = build_deepseek_system_instruction(
        source_type=source_type,
        language=language,
        audience=audience,
        tone=tone
    )

    prompt = (
        f"Generate a {slide_count}-slide presentation deck with intelligent visual layout selection for the following input in {language}:\n"
        f"Source Type: {source_type}\n"
        f"Title/Topic Hint: {title_hint or 'Auto-generate from content'}\n"
        f"Presentation Type: {presentation_type}\n\n"
        f"SOURCE CONTENT:\n{source_content}\n\n"
        f"Ensure varied visual layouts (process_flow, timeline, comparison, stats_grid, cards_grid, table, hierarchy, standard, two_column, conclusion) matching slide content."
    )

    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"AI presentation generation request (attempt {attempt}/{max_retries}) for {slide_count} slides in {language}...")
            response = client.chat.completions.create(
                model=model_name,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
            )

            raw_text = response.choices[0].message.content
            if not raw_text or not raw_text.strip():
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail={"error_code": "AI_EMPTY_RESPONSE", "message": "AI service returned an empty response."}
                )

            try:
                raw_json = json.loads(raw_text)
                parsed_result = AIPresentationResult.model_validate(raw_json)

                if not parsed_result.slides:
                    raise ValueError("Returned presentation has no slides.")

                from app.services.synthesizer import parse_prompt_instructions
                parsed_info = parse_prompt_instructions(source_content or title_hint or "")
                clean_sub = parsed_info["clean_subject"]
                prof_title = parsed_info["professional_title"]

                if not parsed_result.title or re.match(r'^(?:please\s+)?(?:create|make|prepare|generate|design|build|write)\s+', parsed_result.title, re.IGNORECASE):
                    parsed_result.title = prof_title

                seen_headings = set()
                for idx, slide in enumerate(parsed_result.slides):
                    if idx == 0 and (slide.title.strip().lower() == parsed_result.title.strip().lower() or re.match(r'^(?:please\s+)?(?:create|make|prepare|generate)\s+', slide.title, re.IGNORECASE)):
                        slide.title = f"Introduction to {clean_sub}"
                    elif re.match(r'^(?:please\s+)?(?:create|make|prepare|generate)\s+', slide.title, re.IGNORECASE):
                        slide.title = f"{clean_sub} - Key Focus Area {idx + 1}"

                    if slide.title in seen_headings:
                        slide.title = f"{slide.title} ({idx + 1})"
                    seen_headings.add(slide.title)

                return parsed_result
            except Exception as parse_err:
                logger.error(f"Failed to parse AI JSON response: {parse_err}. Response text: {raw_text[:300]}")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={"error_code": "AI_INVALID_STRUCTURE", "message": "Failed to parse presentation structure."}
                )

        except HTTPException:
            raise
        except Exception as e:
            err_msg = str(e)
            logger.warning(f"AI attempt {attempt} failed: {err_msg}")
            if "402" in err_msg or "insufficient balance" in err_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail={"error_code": "AI_REQUEST_FAILED", "message": "DeepSeek account has insufficient balance."}
                )
            if ("429" in err_msg or "rate limit" in err_msg.lower() or "quota" in err_msg.lower()):
                if attempt < max_retries:
                    time.sleep(2 * attempt)
                    continue
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={"error_code": "AI_QUOTA_EXCEEDED", "message": "AI service capacity reached. Please try again shortly."}
                )
            if attempt < max_retries:
                time.sleep(1 * attempt)
                continue
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={"error_code": "AI_REQUEST_FAILED", "message": "AI generation request could not be completed."}
            )

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail={"error_code": "AI_REQUEST_FAILED", "message": "AI generation request could not be completed."}
    )


def generate_slide_teach_me_deepseek(
    slide_title: str,
    slide_content_text: str,
    language: str = "English",
    audience: Optional[str] = None
) -> AITeachMeExplanation:
    """Uses AI to generate an educational explanation for a slide."""
    client = get_deepseek_client()
    model_name = (settings.DEEPSEEK_MODEL or "deepseek-chat").strip()

    system_instruction = (
        f"You are an expert educational tutor. Explain the slide content in simple terms in {language}. "
        f"ALL text in the response MUST be written in {language}. "
        f"Respond strictly with a single valid JSON object matching this schema:\n"
        "{\n"
        '  "explanation": "Comprehensive explanation of the slide in ' + language + '",\n'
        '  "summary": "Short takeaway summary in ' + language + '",\n'
        '  "key_terms": [{"term": "Term Name", "definition": "Definition in ' + language + '"}],\n'
        '  "simple_example": "Real-world analogy in ' + language + '"\n'
        "}"
    )

    prompt = (
        f"Target Language: {language}\n"
        f"Target Audience: {audience or 'Student'}\n"
        f"Slide Title: {slide_title}\n"
        f"Slide Content:\n{slide_content_text}\n\n"
        f"Explain this slide clearly in {language}."
    )

    try:
        response = client.chat.completions.create(
            model=model_name,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
        )
        raw_text = response.choices[0].message.content
        raw_json = json.loads(raw_text)
        return AITeachMeExplanation.model_validate(raw_json)
    except Exception as e:
        logger.error(f"Teach Me failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error_code": "AI_TEACH_FAILED", "message": "Failed to generate educational explanation."}
        )


def evaluate_practice_session_deepseek(
    presentation_title: str,
    language: str,
    slide_eval_inputs: List[dict]
) -> PracticeEvaluation:
    """Uses AI to evaluate practice rehearsal transcripts."""
    client = get_deepseek_client()
    model_name = (settings.DEEPSEEK_MODEL or "deepseek-chat").strip()

    system_instruction = (
        f"You are an expert presentation coach evaluating a rehearsal. "
        f"ALL feedback, strengths, weaknesses, and summaries MUST be in {language}. "
        f"Evaluate ONLY the user's actual spoken transcripts. Output valid JSON."
    )

    formatted_slides_text = ""
    for item in slide_eval_inputs:
        formatted_slides_text += f"\n--- SLIDE {item.get('slide_number', 1)}: {item.get('title', 'Slide')} ---\n"
        formatted_slides_text += f"Key Bullet Points: {item.get('bullet_points', [])}\n"
        formatted_slides_text += f"User Spoken Transcript: '{item.get('transcript', '')}'\n"
        formatted_slides_text += f"Duration: {item.get('duration_seconds', 0)}s, Words: {item.get('words_spoken', 0)}, WPM: {item.get('words_per_minute', 0)}\n"

    prompt = (
        f"Presentation Title: {presentation_title}\n"
        f"Language: {language}\n\n"
        f"Practice Transcripts:\n{formatted_slides_text}\n\n"
        f"Evaluate the rehearsal in {language}."
    )

    try:
        response = client.chat.completions.create(
            model=model_name,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            temperature=0.6,
        )
        raw_text = response.choices[0].message.content
        raw_json = json.loads(raw_text)
        return PracticeEvaluation.model_validate(raw_json)
    except Exception as e:
        logger.error(f"Practice evaluation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error_code": "AI_EVAL_FAILED", "message": "Failed to evaluate rehearsal."}
        )


def refine_slide_content_deepseek(
    slide_title: str,
    current_content: str,
    action: str,
    custom_instruction: Optional[str] = None,
    language: str = "English",
    audience: Optional[str] = None
) -> RefinedSlideResponse:
    """Uses AI to refine slide content."""
    client = get_deepseek_client()
    model_name = (settings.DEEPSEEK_MODEL or "deepseek-chat").strip()

    system_instruction = (
        f"You are an expert presentation editor. Refine the given slide content according to action: '{action}'. "
        f"ALL text MUST be written in {language}. Respond in valid JSON."
    )

    prompt = (
        f"Language: {language}\n"
        f"Action: {action}\n"
        f"Custom Instruction: {custom_instruction or 'N/A'}\n"
        f"Current Title: {slide_title}\n"
        f"Current Content:\n{current_content}\n\n"
        f"Refine this slide in {language}."
    )

    try:
        response = client.chat.completions.create(
            model=model_name,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
        )
        raw_text = response.choices[0].message.content
        raw_json = json.loads(raw_text)
        return RefinedSlideResponse.model_validate(raw_json)
    except Exception as e:
        logger.error(f"Slide Refinement failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error_code": "AI_REFINE_FAILED", "message": "Failed to refine slide."}
        )


def translate_slide_deepseek(
    slide_title: str,
    slide_content: dict,
    speaker_notes: Optional[str] = None,
    source_language: str = "English",
    target_language: str = "Urdu"
) -> dict:
    """Translates slide content and notes using DeepSeek AI."""
    client = get_deepseek_client()
    model_name = (settings.DEEPSEEK_MODEL or "deepseek-chat").strip()

    system_instruction = (
        f"You are an expert multilingual presentation localization architect. "
        f"Translate the slide from {source_language} into {target_language}. "
        f"1. Preserve the exact JSON structure, layout_type, keys, and count of items. "
        f"2. Translate all human-readable text into natural, fluent {target_language}. "
        f"3. Respond strictly with a valid JSON object matching: {{'title': str, 'content': dict, 'speaker_notes': str, 'target_language': str}}."
    )

    payload = {
        "title": slide_title,
        "content": slide_content,
        "speaker_notes": speaker_notes or ""
    }

    prompt = (
        f"Translate from {source_language} to {target_language}:\n"
        f"{json.dumps(payload, ensure_ascii=False, indent=2)}\n\n"
        f"Respond ONLY with valid JSON with translated fields and 'target_language': '{target_language}'."
    )

    try:
        response = client.chat.completions.create(
            model=model_name,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
        )
        raw_text = response.choices[0].message.content
        parsed = json.loads(raw_text)
        return {
            "title": parsed.get("title", slide_title),
            "content": parsed.get("content", slide_content),
            "speaker_notes": parsed.get("speaker_notes", speaker_notes),
            "target_language": target_language
        }
    except Exception as e:
        logger.error(f"DeepSeek translation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error_code": "AI_TRANSLATE_FAILED", "message": f"Failed to translate slide into {target_language}."}
        )

