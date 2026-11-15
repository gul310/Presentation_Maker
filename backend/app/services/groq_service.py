import json
import logging
import re
import time
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.presentation import AITeachMeExplanation, RefinedSlideResponse
from app.schemas.practice import PracticeEvaluation
from app.schemas.ai_schemas import AIPresentationResult
from app.services.ai_circuit_breaker import ai_circuit_breaker

logger = logging.getLogger("presentai.groq_service")

# ==============================================================================
# Client Initialization & Environment Validation
# ==============================================================================

def is_groq_available() -> bool:
    """Returns True if Groq API key is non-empty and configured."""
    key = (getattr(settings, "GROQ_API_KEY", "") or "").strip()
    return bool(key)

def get_groq_client():
    """
    Initializes and returns a Groq API client with a bounded timeout.
    Supports either the native 'groq' SDK or OpenAI-compatible client.
    """
    api_key = (getattr(settings, "GROQ_API_KEY", "") or "").strip()
    if not api_key:
        logger.warning("[Groq Service] Groq API key is not configured in backend settings.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error_code": "GROQ_NOT_CONFIGURED",
                "message": "Groq secondary AI provider is not configured. Please supply GROQ_API_KEY."
            }
        )

    # 1. Try official groq SDK if installed
    try:
        from groq import Groq
        return Groq(api_key=api_key, timeout=25.0)
    except ImportError:
        pass

    # 2. Fall back to standard OpenAI client pointing to Groq endpoint
    try:
        from openai import OpenAI
        return OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
            timeout=25.0
        )
    except Exception as e:
        logger.error(f"[Groq Service] Failed to initialize Groq client: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error_code": "GROQ_INIT_FAILED",
                "message": "Failed to initialize Groq secondary provider client."
            }
        )

def get_groq_candidate_models() -> List[str]:
    """Returns deduplicated candidate models supported on Groq."""
    configured_model = (getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile") or "llama-3.3-70b-versatile").strip()
    candidates = [
        configured_model,
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768"
    ]
    seen = set()
    return [m for m in candidates if not (m in seen or seen.add(m))]


# ==============================================================================
# 1. Presentation Deck Generation (Secondary Fallback)
# ==============================================================================

def generate_presentation_deck_groq(
    source_type: str,
    source_content: str,
    title_hint: Optional[str] = None,
    slide_count: int = 6,
    language: str = "English",
    audience: str = "General",
    presentation_type: str = "Informative",
    tone: str = "Professional"
) -> AIPresentationResult:
    """
    Generates structured presentation deck using Groq with intelligent visual layouts.
    Strictly normalizes output to the existing AIPresentationResult schema.
    """
    client = get_groq_client()
    candidate_models = get_groq_candidate_models()

    system_instruction = (
        "You are PresentAI, an elite executive presentation designer and information architect.\n"
        "Your task is to generate a structured, highly professional, visually engaging presentation deck with comprehensive speaker notes.\n\n"
        "CRITICAL PROFESSIONAL VISUAL DESIGN REQUIREMENTS:\n"
        "1. INTELLIGENT VISUAL LAYOUT SELECTION: Intelligently select the best visual layout for each slide based on its content:\n"
        "   - Slide 1: MUST use 'title' layout.\n"
        "   - Final slide: MUST use 'conclusion' layout.\n"
        "   - Topic transition: use 'section_header'.\n"
        "   - Sequential steps, workflow, lifecycle: use 'process_flow' or 'flowchart' (populate 'steps').\n"
        "   - Chronology, roadmap, milestones: use 'timeline' (populate 'timeline_items').\n"
        "   - Contrasts, pros vs cons, comparisons: use 'comparison' (populate 'comparison_columns').\n"
        "   - Numerical data, metrics, KPIs: use 'stats_grid' (populate 'stats').\n"
        "   - Core pillars, feature highlights: use 'cards_grid' (populate 'cards').\n"
        "   - Tabular / matrix comparison: use 'table' (populate 'table_data').\n"
        "   - Multi-tier system architecture: use 'hierarchy' or 'architecture' (populate 'hierarchy_levels').\n"
        "   - Balanced 2-part content: use 'two_column'.\n"
        "   - Narrative / concept explanation: use 'standard' with rich bullet points.\n"
        "2. VISUAL VARIETY: Do NOT repeat the exact same diagram layout consecutively.\n"
        "3. REAL CONTENT: Use real, high-quality, relevant data. Never use placeholders.\n"
        f"4. PRESENTATION LANGUAGE: You MUST generate ALL text in {language}.\n"
        f"5. TARGET AUDIENCE: Tailor depth for a {audience} audience.\n"
        f"6. TONE: Maintain a consistent {tone} tone.\n"
        f"7. SPEAKER NOTES: Provide comprehensive spoken speaker notes for EVERY slide.\n"
        "8. PRESENTATION TITLE: Professional Title Case. Never use prompt instructions (no 'Create a presentation...').\n"
        "9. SLIDE HEADINGS: Distinct, unique headings for every slide. Slide 1 must be Topic Introduction and NOT repeat the main presentation title.\n"
        f"10. EXACT SCHEMA: Respond strictly with a single JSON object matching this structure:\n"
        "{\n"
        '  "title": "Presentation Title",\n'
        '  "language": "' + language + '",\n'
        '  "slides": [\n'
        '    {\n'
        '      "slide_number": 1,\n'
        '      "title": "Introduction to Topic",\n'
        '      "subtitle": "Overview",\n'
        '      "bullet_points": ["Point 1", "Point 2", "Point 3"],\n'
        '      "layout_type": "title",\n'
        '      "visual_type": "title",\n'
        '      "steps": [{"step": 1, "label": "Phase 1", "description": "Action"}],\n'
        '      "timeline_items": [{"period": "2026", "title": "Milestone", "description": "Goal"}],\n'
        '      "comparison_columns": [{"heading": "Col A", "badge": "Pro", "points": ["Advantage"]}],\n'
        '      "stats": [{"metric": "98%", "label": "Metric", "description": "Impact", "trend": "+15%"}],\n'
        '      "cards": [{"title": "Pillar 1", "description": "Details", "icon_name": "target"}],\n'
        '      "table_data": {"headers": ["A", "B"], "rows": [["1", "2"]]}, \n'
        '      "hierarchy_levels": [{"level": 1, "title": "Layer", "subtitle": "Role"}],\n'
        '      "speaker_notes": "What the presenter says aloud to the audience...",\n'
        '      "source_reference": "Optional Ref"\n'
        '    }\n'
        '  ]\n'
        "}"
    )

    if source_type == "document":
        system_instruction += (
            "\n\nDOCUMENT GROUNDING CONSTRAINT:\n"
            "Rely strictly on the provided document content as your primary source. "
            "Preserve key facts, metrics, and logical section breakdowns."
        )

    user_prompt = (
        f"Generate a {slide_count}-slide presentation deck in {language} for:\n"
        f"Source Type: {source_type}\n"
        f"Topic Hint: {title_hint or 'Auto-generate from content'}\n"
        f"Audience: {audience}\n"
        f"Presentation Type: {presentation_type}\n"
        f"Tone: {tone}\n\n"
        f"CONTENT:\n{source_content}"
    )

    last_exc = None
    for model_name in candidate_models:
        try:
            logger.info(f"[Groq Service] Generating presentation with model '{model_name}' ({slide_count} slides, {language})...")
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7
            )
            raw_text = response.choices[0].message.content
            if not raw_text:
                continue

            raw_json = json.loads(raw_text)
            parsed_result = AIPresentationResult.model_validate(raw_json)

            if not parsed_result.slides:
                continue

            # Title and heading sanitization
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

            ai_circuit_breaker.record_success("groq")
            logger.info(f"[Groq Service] Presentation generation succeeded with model '{model_name}'.")
            return parsed_result

        except Exception as e:
            ai_circuit_breaker.record_failure("groq", e)
            logger.warning(f"[Groq Service] Generation with model '{model_name}' failed: {e}. Trying next candidate...")
            last_exc = e
            continue

    if last_exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error_code": "GROQ_REQUEST_FAILED", "message": f"Groq fallback generation failed: {last_exc}"}
        )
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail={"error_code": "GROQ_EMPTY_RESPONSE", "message": "Groq returned an empty response."}
    )


# ==============================================================================
# 2. Teach Me Slide Explanation (Secondary Fallback)
# ==============================================================================

def generate_slide_teach_me_groq(
    slide_title: str,
    slide_content_text: str,
    language: str = "English",
    audience: Optional[str] = None
) -> AITeachMeExplanation:
    """Generates educational slide explanation using Groq normalized to AITeachMeExplanation."""
    client = get_groq_client()
    candidate_models = get_groq_candidate_models()

    system_instruction = (
        "You are an expert educational tutor. Your task is to explain the slide content in simple, clear terms.\n"
        f"CRITICAL: ALL text in the response MUST be written in the specified language: {language}.\n"
        "Break down difficult technical jargon in 'key_terms', provide a clear real-world analogy in 'simple_example', and a concise 'summary'.\n"
        "Output strictly valid JSON matching this schema:\n"
        "{\n"
        '  "summary": "Clear, accessible explanation of the slide...",\n'
        '  "simple_example": "A real-world analogy or concrete scenario...",\n'
        '  "key_terms": [{"term": "Jargon Term", "definition": "Simple explanation"}],\n'
        '  "quiz_question": "A multiple-choice question testing comprehension...",\n'
        '  "quiz_options": ["Option A", "Option B", "Option C", "Option D"],\n'
        '  "correct_option_index": 0,\n'
        '  "explanation": "Why this answer is correct..."\n'
        "}"
    )

    user_prompt = (
        f"Language: {language}\n"
        f"Audience: {audience or 'Student'}\n"
        f"Slide Title: {slide_title}\n"
        f"Slide Content:\n{slide_content_text}\n\n"
        f"Explain this slide clearly in {language}."
    )

    last_exc = None
    for model_name in candidate_models:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7
            )
            raw = response.choices[0].message.content
            if not raw:
                continue
            data = json.loads(raw)
            ai_circuit_breaker.record_success("groq")
            return AITeachMeExplanation.model_validate(data)
        except Exception as e:
            ai_circuit_breaker.record_failure("groq", e)
            last_exc = e
            continue

    raise HTTPException(status_code=502, detail={"error_code": "GROQ_TEACH_FAILED", "message": f"Groq Teach Me failed: {last_exc}"})


# ==============================================================================
# 3. Slide Content Refinement (Secondary Fallback)
# ==============================================================================

def refine_slide_content_groq(
    slide_title: str,
    current_content: str,
    action: str,
    custom_instruction: Optional[str] = None,
    language: str = "English",
    audience: Optional[str] = None
) -> RefinedSlideResponse:
    """Refines slide title, bullet points, and speaker notes using Groq."""
    client = get_groq_client()
    candidate_models = get_groq_candidate_models()

    system_instruction = (
        f"You are an expert presentation editor. Refine the slide content according to action: '{action}'.\n"
        f"CRITICAL: ALL text MUST be written in {language}.\n"
        "Output strictly valid JSON matching this schema:\n"
        "{\n"
        '  "title": "Refined Slide Title",\n'
        '  "bullet_points": ["Point 1", "Point 2", "Point 3"],\n'
        '  "speaker_notes": "Polished spoken presenter notes...",\n'
        '  "change_summary": "Brief summary of improvements made."\n'
        "}"
    )

    user_prompt = (
        f"Language: {language}\n"
        f"Action: {action}\n"
        f"Custom Instruction: {custom_instruction or 'N/A'}\n"
        f"Current Title: {slide_title}\n"
        f"Current Content:\n{current_content}\n\n"
        f"Refine this slide in {language}."
    )

    last_exc = None
    for model_name in candidate_models:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7
            )
            raw = response.choices[0].message.content
            if not raw:
                continue
            data = json.loads(raw)
            ai_circuit_breaker.record_success("groq")
            return RefinedSlideResponse.model_validate(data)
        except Exception as e:
            ai_circuit_breaker.record_failure("groq", e)
            last_exc = e
            continue

    raise HTTPException(status_code=502, detail={"error_code": "GROQ_REFINE_FAILED", "message": f"Groq slide refinement failed: {last_exc}"})


# ==============================================================================
# 4. Practice Rehearsal Evaluation (Secondary Fallback)
# ==============================================================================

def evaluate_practice_session_groq(
    presentation_title: str,
    language: str,
    slide_eval_inputs: List[dict]
) -> PracticeEvaluation:
    """Evaluates rehearsal speech transcripts against slide bullet points using Groq."""
    client = get_groq_client()
    candidate_models = get_groq_candidate_models()

    formatted_slides_text = ""
    for item in slide_eval_inputs:
        slide_num = item.get('slide_number', 1)
        slide_title = item.get('title') or item.get('slide_title', f"Slide {slide_num}")
        slide_bullets = item.get('bullet_points') or item.get('slide_bullets', [])
        transcript = item.get('transcript') or item.get('spoken_transcript', '')
        duration = item.get('duration_seconds', 0)
        words = item.get('words_spoken', len(transcript.split()) if transcript else 0)
        wpm = item.get('words_per_minute', round((words / (duration / 60)), 1) if duration > 0 else 0)

        formatted_slides_text += f"\n--- SLIDE {slide_num}: {slide_title} ---\n"
        formatted_slides_text += f"Key Bullet Points: {slide_bullets}\n"
        formatted_slides_text += f"User Spoken Transcript: '{transcript}'\n"
        formatted_slides_text += f"Duration: {duration}s, Words: {words}, WPM: {wpm}\n"

    system_instruction = (
        "You are an expert presentation coach evaluating a live rehearsal session.\n"
        f"1. Evaluate ONLY the user's actual spoken transcripts.\n"
        f"2. All feedback and recommendations MUST be written in {language}.\n"
        "3. Provide constructive, objective feedback.\n"
        "Output strictly valid JSON matching this schema:\n"
        "{\n"
        '  "overall_score": 85,\n'
        '  "clarity_score": 88,\n'
        '  "pacing_score": 82,\n'
        '  "coverage_score": 85,\n'
        '  "feedback_summary": "Comprehensive constructive evaluation...",\n'
        '  "strengths": ["Clear delivery", "Strong alignment"],\n'
        '  "areas_for_improvement": ["Pacing on technical slides", "Add transitions"],\n'
        '  "slide_evaluations": [\n'
        '    {\n'
        '      "slide_number": 1,\n'
        '      "score": 85,\n'
        '      "covered_points": ["Point A"],\n'
        '      "missed_points": ["Point B"],\n'
        '      "delivery_feedback": "Good introduction."\n'
        '    }\n'
        '  ]\n'
        "}"
    )

    user_prompt = (
        f"Presentation Title: {presentation_title}\n"
        f"Language: {language}\n\n"
        f"Transcripts:\n{formatted_slides_text}\n\n"
        f"Evaluate the rehearsal in {language}."
    )

    last_exc = None
    for model_name in candidate_models:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.6
            )
            raw = response.choices[0].message.content
            if not raw:
                continue
            data = json.loads(raw)
            ai_circuit_breaker.record_success("groq")
            return PracticeEvaluation.model_validate(data)
        except Exception as e:
            ai_circuit_breaker.record_failure("groq", e)
            last_exc = e
            continue

    raise HTTPException(status_code=502, detail={"error_code": "GROQ_EVAL_FAILED", "message": f"Groq evaluation failed: {last_exc}"})


# ==============================================================================
# 5. Multilingual Slide Translation (Secondary Fallback)
# ==============================================================================

def translate_slide_groq(
    slide_title: str,
    slide_content: Any,
    speaker_notes: Optional[str] = None,
    source_language: str = "English",
    target_language: str = "Urdu"
) -> Dict[str, Any]:
    """Translates slide title, structured visual elements, and speaker notes using Groq."""
    client = get_groq_client()
    candidate_models = get_groq_candidate_models()

    system_instruction = (
        f"You are an expert multilingual presentation localization architect. "
        f"Translate the given slide from {source_language} into {target_language}.\n"
        "CRITICAL RULES:\n"
        "1. Preserve the EXACT JSON structure, keys, number of items, visual layout type, and formatting.\n"
        f"2. Translate all text accurately and naturally into {target_language}.\n"
        "3. Output strictly a JSON object with: 'title', 'content', 'speaker_notes', 'target_language'."
    )

    payload = {
        "title": slide_title,
        "content": slide_content,
        "speaker_notes": speaker_notes or ""
    }

    user_prompt = (
        f"Translate from {source_language} to {target_language}:\n"
        f"{json.dumps(payload, ensure_ascii=False, indent=2)}\n\n"
        f"Return JSON strictly with translated 'title', 'content', 'speaker_notes', and 'target_language': '{target_language}'."
    )

    last_exc = None
    for model_name in candidate_models:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3
            )
            raw = response.choices[0].message.content
            if not raw:
                continue
            parsed = json.loads(raw)
            ai_circuit_breaker.record_success("groq")
            return {
                "title": parsed.get("title", slide_title),
                "content": parsed.get("content", slide_content),
                "speaker_notes": parsed.get("speaker_notes", speaker_notes),
                "target_language": target_language
            }
        except Exception as e:
            ai_circuit_breaker.record_failure("groq", e)
            last_exc = e
            continue

    raise HTTPException(status_code=502, detail={"error_code": "GROQ_TRANSLATE_FAILED", "message": f"Groq translation failed: {last_exc}"})
