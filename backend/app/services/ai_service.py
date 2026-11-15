import json
import logging
import re
import time
import concurrent.futures
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field
from fastapi import HTTPException, status
from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.presentation import AITeachMeExplanation, RefinedSlideResponse
from app.schemas.practice import PracticeEvaluation
from app.services.ai_circuit_breaker import ai_circuit_breaker
from app.services.groq_service import (
    is_groq_available,
    generate_presentation_deck_groq,
    generate_slide_teach_me_groq,
    refine_slide_content_groq,
    evaluate_practice_session_groq,
    translate_slide_groq
)

logger = logging.getLogger("presentai.ai_service")

# ==============================================================================
# Pydantic Schemas for Structured AI Presentation & Visual Elements
# ==============================================================================

from app.schemas.ai_schemas import (
    StepItem,
    TimelineItem,
    ComparisonColumn,
    StatMetricItem,
    CardItem,
    TableData,
    HierarchyItem,
    AISlideItem,
    AIPresentationResult
)


# ==============================================================================
# Internal Provider Resolution & Client Helpers (Backend Only)
# ==============================================================================

def get_gemini_client() -> genai.Client:
    """Initializes and returns Google Gemini Client if API key is configured."""
    api_key = (settings.GEMINI_API_KEY or "").strip()
    if not api_key:
        logger.warning("Gemini API key is not configured in backend settings.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error_code": "AI_SERVICE_UNAVAILABLE",
                "message": "AI presentation service is currently not configured on the server. Please contact system administrator."
            }
        )
    try:
        return genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=10000))
    except Exception as e:
        logger.error(f"Failed to initialize Gemini Client: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error_code": "AI_SERVICE_ERROR",
                "message": "AI service initialization failed. Please try again shortly."
            }
        )

def build_system_instruction(source_type: str, language: str, audience: str, tone: str) -> str:
    """Constructs system instruction prompting AI for professional visual presentation deck generation."""
    base_instruction = (
        "You are PresentAI, an elite executive presentation designer, information architect, and speech coach.\n"
        "Your task is to generate a structured, highly professional, visually engaging presentation deck with comprehensive speaker notes.\n\n"
        "CRITICAL PROFESSIONAL VISUAL DESIGN REQUIREMENTS:\n"
        "1. INTELLIGENT VISUAL LAYOUT SELECTION: Do NOT output only plain bullet points or basic text boxes. Intelligently select the best visual layout for each slide based on its specific content:\n"
        "   - Slide 1: MUST use 'title' layout.\n"
        "   - Final slide: MUST use 'conclusion' layout (with clear summary and takeaways).\n"
        "   - Mid-deck chapter/topic transition: use 'section_header'.\n"
        "   - Sequential steps, workflow, lifecycle, process, methodology -> use 'process_flow' or 'flowchart' (populate 'steps').\n"
        "   - Chronology, roadmap, history, milestones, phases -> use 'timeline' (populate 'timeline_items').\n"
        "   - Contrasts, pros vs cons, option analysis, before/after -> use 'comparison' (populate 'comparison_columns').\n"
        "   - Numerical data, metrics, KPIs, market size, growth percentages -> use 'stats_grid' (populate 'stats').\n"
        "   - Grouped core pillars, feature highlights, key principles -> use 'cards_grid' (populate 'cards').\n"
        "   - Tabular / matrix data comparison -> use 'table' (populate 'table_data').\n"
        "   - Multi-tier system architecture or organizational hierarchy -> use 'hierarchy' or 'architecture' (populate 'hierarchy_levels').\n"
        "   - Balanced 2-part content or dual perspective -> use 'two_column'.\n"
        "   - Narrative / concept explanations -> use 'standard' with rich structured bullet points.\n"
        "2. VISUAL BALANCE & VARIETY: Do NOT force a diagram onto every slide if not appropriate. Choose the visual representation that best fits each slide's content and avoid repeating the exact same layout consecutively.\n"
        "3. REAL GENERATED CONTENT: Use real, high-quality, relevant data and content derived from the user input. Never use placeholder or dummy text.\n"
        f"4. PRESENTATION LANGUAGE: You MUST generate the ENTIRE presentation (title, slide titles, subtitles, bullet points, visual items, speaker notes) in {language}.\n"
        f"5. TARGET AUDIENCE: Tailor tone, depth, and terminology for a {audience} audience.\n"
        f"6. TONE & STYLE: Maintain a consistent, polished {tone} tone.\n"
        f"7. SPEAKER NOTES: Provide comprehensive, natural spoken speaker notes for EVERY slide answering 'What should the presenter say to the audience?'\n\n"
        "CRITICAL PROFESSIONAL TITLE & SLIDE HEADING REQUIREMENTS:\n"
        "8. PRESENTATION TITLE: Generate a professional, academic or corporate title in Title Case (e.g., 'Semantic Web: Architecture, Applications and Future Potential'). NEVER use user prompt instructions in the title (do NOT output 'Create a presentation on...', 'Make 8 slides about...', 'with relevant images').\n"
        "9. SLIDE HEADINGS: Every single slide MUST have a distinct, unique heading relevant to that slide's specific content:\n"
        "   - Slide 1: Topic Introduction / Overview (e.g., 'Introduction to Semantic Web' or 'Semantic Web: Foundations & Strategic Scope'). NEVER repeat the main presentation title verbatim as the slide 1 heading.\n"
        "   - Middle Slides: Specific sub-topics, components, architectures, applications, comparisons, or analysis. NEVER repeat prompt instructions.\n"
        "   - Final Slide: Conclusion, Future Outlook or Summary (e.g., 'The Future of Semantic Web: Strategic Roadmap & Key Takeaways').\n"
        "   - Each slide heading must be 100% unique across the deck.\n"
        "10. SECTIONS & SLIDE COUNT: Strictly adhere to the requested slide count and dedicate slides to any specific subtopics/sections requested by the user."
    )

    if source_type == "document":
        base_instruction += (
            "\n\nDOCUMENT GROUNDING CONSTRAINT:\n"
            "You are generating this presentation based on an extracted source document.\n"
            "- Rely strictly on the provided document content as your primary source.\n"
            "- Preserve key facts, metrics, and logical section breakdowns.\n"
            "- Include source references (e.g. 'Page 1', 'Section 2') where applicable."
        )

    return base_instruction


# ==============================================================================
# Presentation Generation with Provider Orchestration & Fallback
# ==============================================================================

def generate_presentation_deck_ai(
    source_type: str,
    source_content: str,
    title_hint: Optional[str] = None,
    slide_count: int = 6,
    language: str = "English",
    audience: str = "General",
    presentation_type: str = "Informative",
    tone: str = "Professional",
    ai_provider: Optional[str] = None
) -> AIPresentationResult:
    """
    Generates structured presentation deck using configured backend AI provider hierarchy:
    1. Primary: Gemini
    2. Secondary Fallback: Groq
    3. Tertiary Fallback: DeepSeek (if configured)
    4. Resilient local synthesis fallback
    """
    slide_count = max(3, min(30, slide_count))
    configured_provider = (ai_provider or getattr(settings, "AI_PRIMARY_PROVIDER", "gemini") or getattr(settings, "AI_PROVIDER", "gemini") or "gemini").lower().strip()

    # Priority 1: Primary Gemini execution
    if configured_provider == "gemini" or not configured_provider:
        if ai_circuit_breaker.can_use_provider("gemini") and settings.GEMINI_API_KEY:
            try:
                res = _generate_with_gemini(
                    source_type=source_type,
                    source_content=source_content,
                    title_hint=title_hint,
                    slide_count=slide_count,
                    language=language,
                    audience=audience,
                    presentation_type=presentation_type,
                    tone=tone
                )
                ai_circuit_breaker.record_success("gemini")
                return res
            except Exception as gemini_err:
                ai_circuit_breaker.record_failure("gemini", gemini_err)
                logger.warning(f"Primary Gemini provider failed: {gemini_err}. Evaluating Groq secondary fallback...")

    # Explicit override: DeepSeek requested as primary
    elif configured_provider == "deepseek":
        if settings.DEEPSEEK_API_KEY:
            try:
                from app.services.deepseek_service import generate_presentation_deck_deepseek
                return generate_presentation_deck_deepseek(
                    source_type=source_type,
                    source_content=source_content,
                    title_hint=title_hint,
                    slide_count=slide_count,
                    language=language,
                    audience=audience,
                    presentation_type=presentation_type,
                    tone=tone
                )
            except Exception as deepseek_err:
                logger.warning(f"DeepSeek provider execution failed: {deepseek_err}. Trying Gemini...")
                if ai_circuit_breaker.can_use_provider("gemini") and settings.GEMINI_API_KEY:
                    try:
                        res = _generate_with_gemini(
                            source_type=source_type,
                            source_content=source_content,
                            title_hint=title_hint,
                            slide_count=slide_count,
                            language=language,
                            audience=audience,
                            presentation_type=presentation_type,
                            tone=tone
                        )
                        ai_circuit_breaker.record_success("gemini")
                        return res
                    except Exception as g_err:
                        ai_circuit_breaker.record_failure("gemini", g_err)

    # Priority 2: Secondary Fallback to Groq
    if getattr(settings, "AI_FALLBACK_ENABLED", True) and is_groq_available():
        if ai_circuit_breaker.can_use_provider("groq"):
            try:
                logger.info("Executing secondary AI provider (Groq) fallback for presentation generation...")
                res = generate_presentation_deck_groq(
                    source_type=source_type,
                    source_content=source_content,
                    title_hint=title_hint,
                    slide_count=slide_count,
                    language=language,
                    audience=audience,
                    presentation_type=presentation_type,
                    tone=tone
                )
                ai_circuit_breaker.record_success("groq")
                return res
            except Exception as groq_err:
                ai_circuit_breaker.record_failure("groq", groq_err)
                logger.error(f"Secondary Groq fallback execution failed: {groq_err}")

    # Priority 3: Tertiary Fallback to DeepSeek
    if settings.DEEPSEEK_API_KEY:
        try:
            from app.services.deepseek_service import generate_presentation_deck_deepseek
            logger.info("Executing tertiary DeepSeek fallback for presentation generation...")
            return generate_presentation_deck_deepseek(
                source_type=source_type,
                source_content=source_content,
                title_hint=title_hint,
                slide_count=slide_count,
                language=language,
                audience=audience,
                presentation_type=presentation_type,
                tone=tone
            )
        except Exception as fb_err:
            logger.error(f"Tertiary DeepSeek fallback also failed: {fb_err}")

    # Priority 4: Local synthesis engine as final resilience safety net
    from app.services.synthesizer import generate_synthesized_presentation
    logger.info("External AI providers unavailable or unconfigured. Generating presentation with local synthesis engine...")
    return generate_synthesized_presentation(
        source_type=source_type,
        source_content=source_content,
        title_hint=title_hint,
        slide_count=slide_count,
        language=language,
        audience=audience,
        presentation_type=presentation_type,
        tone=tone
    )


def _generate_with_gemini(
    source_type: str,
    source_content: str,
    title_hint: Optional[str],
    slide_count: int,
    language: str,
    audience: str,
    presentation_type: str,
    tone: str
) -> AIPresentationResult:
    """Internal Gemini generation worker."""
    client = get_gemini_client()
    system_instruction = build_system_instruction(
        source_type=source_type,
        language=language,
        audience=audience,
        tone=tone
    )

    prompt = (
        f"Generate a {slide_count}-slide professional presentation deck with intelligent visual layout selection for the following input:\n"
        f"Source Type: {source_type}\n"
        f"Title/Topic Hint: {title_hint or 'Auto-generate from content'}\n"
        f"Presentation Type: {presentation_type}\n\n"
        f"SOURCE CONTENT:\n{source_content}\n\n"
        f"Ensure varied and context-appropriate visual layouts (process_flow, flowchart, timeline, comparison, stats_grid, cards_grid, table, hierarchy, architecture, standard, two_column, conclusion) tailored to the content of each slide."
    )

    configured_model = getattr(settings, "GEMINI_MODEL_NAME", "gemini-2.5-flash") or "gemini-2.5-flash"
    candidate_models = [configured_model, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
    seen_models = set()
    models_to_try = [m for m in candidate_models if not (m in seen_models or seen_models.add(m))]

    last_exc = None
    timeout_seconds = max(20.0, min(60.0, 15.0 + slide_count * 1.5))
    for model_name in models_to_try:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        try:
            logger.info(f"AI presentation generation request using {model_name} for {slide_count} slides in {language}...")
            
            def _call_model():
                return client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=AIPresentationResult,
                        temperature=0.7,
                    )
                )

            future = executor.submit(_call_model)
            try:
                response = future.result(timeout=timeout_seconds)
            except concurrent.futures.TimeoutError:
                logger.warning(f"AI generation with model {model_name} exceeded {timeout_seconds}s timeout. Moving to next candidate or fallback...")
                executor.shutdown(wait=False, cancel_futures=True)
                last_exc = TimeoutError(f"Model {model_name} call timed out after {timeout_seconds} seconds.")
                continue

            executor.shutdown(wait=False, cancel_futures=True)

            if not response or not response.text:
                continue

            if hasattr(response, "parsed") and response.parsed is not None:
                parsed_result: AIPresentationResult = response.parsed
            else:
                raw_json = json.loads(response.text)
                parsed_result = AIPresentationResult.model_validate(raw_json)

            if not parsed_result.slides:
                continue

            from app.services.synthesizer import parse_prompt_instructions
            parsed_info = parse_prompt_instructions(source_content or title_hint or "")
            clean_sub = parsed_info["clean_subject"]
            prof_title = parsed_info["professional_title"]

            # Sanitize presentation title
            if not parsed_result.title or re.match(r'^(?:please\s+)?(?:create|make|prepare|generate|design|build|write)\s+', parsed_result.title, re.IGNORECASE):
                parsed_result.title = prof_title

            # Sanitize slide headings
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

        except Exception as e:
            executor.shutdown(wait=False, cancel_futures=True)
            err_msg = str(e)
            logger.warning(f"AI generation with model {model_name} failed: {err_msg}. Checking next candidate model...")
            last_exc = e
            continue

    if last_exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error_code": "AI_REQUEST_FAILED", "message": f"Failed to complete AI generation: {last_exc}"}
        )
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail={"error_code": "AI_EMPTY_RESPONSE", "message": "AI service returned empty response."}
    )


# ==============================================================================
# Teach Me Slide Explanation with Provider Fallback
# ==============================================================================

def generate_slide_teach_me(
    slide_title: str,
    slide_content_text: str,
    language: str = "English",
    audience: Optional[str] = None,
    ai_provider: Optional[str] = None
) -> AITeachMeExplanation:
    """Uses backend AI to generate an educational explanation for a slide with provider fallback hierarchy."""
    configured_provider = (ai_provider or getattr(settings, "AI_PRIMARY_PROVIDER", "gemini") or getattr(settings, "AI_PROVIDER", "gemini") or "gemini").lower().strip()

    # Priority 1: Primary Gemini execution
    if configured_provider == "gemini" or not configured_provider:
        if ai_circuit_breaker.can_use_provider("gemini") and settings.GEMINI_API_KEY:
            try:
                res = _teach_slide_gemini(slide_title, slide_content_text, language, audience)
                ai_circuit_breaker.record_success("gemini")
                return res
            except Exception as e:
                ai_circuit_breaker.record_failure("gemini", e)
                logger.warning(f"Primary Gemini Teach Me failed: {e}. Evaluating Groq secondary fallback...")

    # Explicit DeepSeek primary override
    elif configured_provider == "deepseek":
        if settings.DEEPSEEK_API_KEY:
            try:
                from app.services.deepseek_service import generate_slide_teach_me_deepseek
                return generate_slide_teach_me_deepseek(slide_title, slide_content_text, language, audience)
            except Exception as e:
                logger.warning(f"DeepSeek Teach Me failed: {e}. Trying Gemini...")
                if ai_circuit_breaker.can_use_provider("gemini") and settings.GEMINI_API_KEY:
                    try:
                        res = _teach_slide_gemini(slide_title, slide_content_text, language, audience)
                        ai_circuit_breaker.record_success("gemini")
                        return res
                    except Exception as g_err:
                        ai_circuit_breaker.record_failure("gemini", g_err)

    # Priority 2: Secondary Fallback to Groq
    if getattr(settings, "AI_FALLBACK_ENABLED", True) and is_groq_available():
        if ai_circuit_breaker.can_use_provider("groq"):
            try:
                logger.info("Executing secondary AI provider (Groq) fallback for Teach Me explanation...")
                res = generate_slide_teach_me_groq(slide_title, slide_content_text, language, audience)
                ai_circuit_breaker.record_success("groq")
                return res
            except Exception as groq_err:
                ai_circuit_breaker.record_failure("groq", groq_err)
                logger.error(f"Secondary Groq fallback Teach Me failed: {groq_err}")

    # Priority 3: Tertiary DeepSeek Fallback
    if settings.DEEPSEEK_API_KEY:
        try:
            from app.services.deepseek_service import generate_slide_teach_me_deepseek
            return generate_slide_teach_me_deepseek(slide_title, slide_content_text, language, audience)
        except Exception as fb_err:
            logger.error(f"Tertiary DeepSeek Teach Me failed: {fb_err}")

    # Priority 4: Local synthesis engine fallback
    from app.services.synthesizer import synthesize_slide_teach_me
    return synthesize_slide_teach_me(slide_title, slide_content_text, language, audience)

def _teach_slide_gemini(slide_title: str, slide_content_text: str, language: str, audience: Optional[str]) -> AITeachMeExplanation:
    client = get_gemini_client()
    system_instruction = (
        f"You are an expert educational tutor. Your task is to explain the slide content to a learner in simple, clear terms. "
        f"Respond in JSON matching the schema. "
        f"CRITICAL: ALL text in the response MUST be written in the specified presentation language: {language}. "
        f"Break down difficult technical jargon in 'key_terms', provide a clear real-world analogy in 'simple_example', and a concise 'summary'."
    )
    prompt = (
        f"Target Language: {language}\n"
        f"Target Audience: {audience or 'Student'}\n"
        f"Slide Title: {slide_title}\n"
        f"Slide Content:\n{slide_content_text}\n\n"
        f"Explain this slide clearly in {language}."
    )
    configured_model = getattr(settings, "GEMINI_MODEL_NAME", "gemini-2.5-flash") or "gemini-2.5-flash"
    candidate_models = [configured_model, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
    seen_models = set()
    models_to_try = [m for m in candidate_models if not (m in seen_models or seen_models.add(m))]

    last_exc = None
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=AITeachMeExplanation,
                    temperature=0.7,
                )
            )
            if not response or not response.text:
                continue
            if hasattr(response, "parsed") and response.parsed is not None:
                return response.parsed
            return AITeachMeExplanation.model_validate(json.loads(response.text))
        except Exception as e:
            logger.warning(f"Teach Me model {model_name} failed: {e}")
            last_exc = e
            continue

    if isinstance(last_exc, HTTPException):
        raise last_exc
    raise HTTPException(status_code=502, detail={"error_code": "AI_TEACH_FAILED", "message": "Failed to generate explanation."})


# ==============================================================================
# Practice Evaluation with Provider Fallback
# ==============================================================================

def evaluate_practice_session(
    presentation_title: str,
    language: str,
    slide_eval_inputs: List[dict],
    ai_provider: Optional[str] = None
) -> PracticeEvaluation:
    """Uses backend AI to evaluate practice rehearsal speech transcripts with provider fallback hierarchy."""
    configured_provider = (ai_provider or getattr(settings, "AI_PRIMARY_PROVIDER", "gemini") or getattr(settings, "AI_PROVIDER", "gemini") or "gemini").lower().strip()

    # Priority 1: Primary Gemini execution
    if configured_provider == "gemini" or not configured_provider:
        if ai_circuit_breaker.can_use_provider("gemini") and settings.GEMINI_API_KEY:
            try:
                res = _evaluate_practice_gemini(presentation_title, language, slide_eval_inputs)
                ai_circuit_breaker.record_success("gemini")
                return res
            except Exception as e:
                ai_circuit_breaker.record_failure("gemini", e)
                logger.warning(f"Primary Gemini Practice Eval failed: {e}. Evaluating Groq secondary fallback...")

    # Explicit DeepSeek primary override
    elif configured_provider == "deepseek":
        if settings.DEEPSEEK_API_KEY:
            try:
                from app.services.deepseek_service import evaluate_practice_session_deepseek
                return evaluate_practice_session_deepseek(presentation_title, language, slide_eval_inputs)
            except Exception as e:
                logger.warning(f"DeepSeek Practice Eval failed: {e}. Trying Gemini...")
                if ai_circuit_breaker.can_use_provider("gemini") and settings.GEMINI_API_KEY:
                    try:
                        res = _evaluate_practice_gemini(presentation_title, language, slide_eval_inputs)
                        ai_circuit_breaker.record_success("gemini")
                        return res
                    except Exception as g_err:
                        ai_circuit_breaker.record_failure("gemini", g_err)

    # Priority 2: Secondary Fallback to Groq
    if getattr(settings, "AI_FALLBACK_ENABLED", True) and is_groq_available():
        if ai_circuit_breaker.can_use_provider("groq"):
            try:
                logger.info("Executing secondary AI provider (Groq) fallback for practice evaluation...")
                res = evaluate_practice_session_groq(presentation_title, language, slide_eval_inputs)
                ai_circuit_breaker.record_success("groq")
                return res
            except Exception as groq_err:
                ai_circuit_breaker.record_failure("groq", groq_err)
                logger.error(f"Secondary Groq fallback Practice Eval failed: {groq_err}")

    # Priority 3: Tertiary DeepSeek Fallback
    if settings.DEEPSEEK_API_KEY:
        try:
            from app.services.deepseek_service import evaluate_practice_session_deepseek
            return evaluate_practice_session_deepseek(presentation_title, language, slide_eval_inputs)
        except Exception as fb_err:
            logger.error(f"Tertiary DeepSeek Practice Eval failed: {fb_err}")

    # Priority 4: Local synthesis engine fallback
    from app.services.synthesizer import synthesize_practice_evaluation
    return synthesize_practice_evaluation(presentation_title, language, slide_eval_inputs)

def _evaluate_practice_gemini(presentation_title: str, language: str, slide_eval_inputs: List[dict]) -> PracticeEvaluation:
    client = get_gemini_client()
    system_instruction = (
        f"You are an expert presentation coach evaluating a live rehearsal session. "
        f"Respond in JSON matching the schema. "
        f"1. Evaluate ONLY the user's actual spoken transcripts. "
        f"2. All feedback and recommendations MUST be written in the specified presentation language: {language}. "
        f"3. Provide constructive, objective feedback."
    )

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

    prompt = (
        f"Presentation Title: {presentation_title}\n"
        f"Language: {language}\n\n"
        f"Practice Transcripts:\n{formatted_slides_text}\n\n"
        f"Evaluate the rehearsal in {language}."
    )
    configured_model = getattr(settings, "GEMINI_MODEL_NAME", "gemini-2.5-flash") or "gemini-2.5-flash"
    candidate_models = [configured_model, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
    seen_models = set()
    models_to_try = [m for m in candidate_models if not (m in seen_models or seen_models.add(m))]

    last_exc = None
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=PracticeEvaluation,
                    temperature=0.6,
                )
            )
            if not response or not response.text:
                continue
            if hasattr(response, "parsed") and response.parsed is not None:
                return response.parsed
            return PracticeEvaluation.model_validate(json.loads(response.text))
        except Exception as e:
            logger.warning(f"Practice evaluation model {model_name} failed: {e}")
            last_exc = e
            continue

    if isinstance(last_exc, HTTPException):
        raise last_exc
    raise HTTPException(status_code=502, detail={"error_code": "AI_EVAL_FAILED", "message": "Failed to evaluate practice rehearsal."})


# ==============================================================================
# Slide Content Refinement with Provider Fallback
# ==============================================================================

def refine_slide_content(
    slide_title: str,
    current_content: str,
    action: str,
    custom_instruction: Optional[str] = None,
    language: str = "English",
    audience: Optional[str] = None,
    ai_provider: Optional[str] = None
) -> RefinedSlideResponse:
    """Uses backend AI to refine slide content with provider fallback hierarchy."""
    configured_provider = (ai_provider or getattr(settings, "AI_PRIMARY_PROVIDER", "gemini") or getattr(settings, "AI_PROVIDER", "gemini") or "gemini").lower().strip()

    # Priority 1: Primary Gemini execution
    if configured_provider == "gemini" or not configured_provider:
        if ai_circuit_breaker.can_use_provider("gemini") and settings.GEMINI_API_KEY:
            try:
                res = _refine_slide_gemini(slide_title, current_content, action, custom_instruction, language, audience)
                ai_circuit_breaker.record_success("gemini")
                return res
            except Exception as e:
                ai_circuit_breaker.record_failure("gemini", e)
                logger.warning(f"Primary Gemini Slide Refine failed: {e}. Evaluating Groq secondary fallback...")

    # Explicit DeepSeek primary override
    elif configured_provider == "deepseek":
        if settings.DEEPSEEK_API_KEY:
            try:
                from app.services.deepseek_service import refine_slide_content_deepseek
                return refine_slide_content_deepseek(slide_title, current_content, action, custom_instruction, language, audience)
            except Exception as e:
                logger.warning(f"DeepSeek Slide Refine failed: {e}. Trying Gemini...")
                if ai_circuit_breaker.can_use_provider("gemini") and settings.GEMINI_API_KEY:
                    try:
                        res = _refine_slide_gemini(slide_title, current_content, action, custom_instruction, language, audience)
                        ai_circuit_breaker.record_success("gemini")
                        return res
                    except Exception as g_err:
                        ai_circuit_breaker.record_failure("gemini", g_err)

    # Priority 2: Secondary Fallback to Groq
    if getattr(settings, "AI_FALLBACK_ENABLED", True) and is_groq_available():
        if ai_circuit_breaker.can_use_provider("groq"):
            try:
                logger.info("Executing secondary AI provider (Groq) fallback for slide refinement...")
                res = refine_slide_content_groq(slide_title, current_content, action, custom_instruction, language, audience)
                ai_circuit_breaker.record_success("groq")
                return res
            except Exception as groq_err:
                ai_circuit_breaker.record_failure("groq", groq_err)
                logger.error(f"Secondary Groq fallback Slide Refine failed: {groq_err}")

    # Priority 3: Tertiary DeepSeek Fallback
    if settings.DEEPSEEK_API_KEY:
        try:
            from app.services.deepseek_service import refine_slide_content_deepseek
            return refine_slide_content_deepseek(slide_title, current_content, action, custom_instruction, language, audience)
        except Exception as fb_err:
            logger.error(f"Tertiary DeepSeek Slide Refine failed: {fb_err}")

    # Priority 4: Local synthesis engine fallback
    from app.services.synthesizer import synthesize_slide_refinement
    return synthesize_slide_refinement(slide_title, current_content, action, custom_instruction, language, audience)

def _refine_slide_gemini(
    slide_title: str,
    current_content: str,
    action: str,
    custom_instruction: Optional[str],
    language: str,
    audience: Optional[str]
) -> RefinedSlideResponse:
    client = get_gemini_client()
    system_instruction = (
        f"You are an expert presentation editor. Refine the given slide content according to action: '{action}'. "
        f"Respond in JSON matching schema. "
        f"CRITICAL: ALL text MUST be written in {language}."
    )
    prompt = (
        f"Language: {language}\n"
        f"Action: {action}\n"
        f"Custom Instruction: {custom_instruction or 'N/A'}\n"
        f"Current Title: {slide_title}\n"
        f"Current Content:\n{current_content}\n\n"
        f"Refine this slide in {language}."
    )
    configured_model = getattr(settings, "GEMINI_MODEL_NAME", "gemini-2.5-flash") or "gemini-2.5-flash"
    candidate_models = [configured_model, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
    seen_models = set()
    models_to_try = [m for m in candidate_models if not (m in seen_models or seen_models.add(m))]

    last_exc = None
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=RefinedSlideResponse,
                    temperature=0.7,
                )
            )
            if not response or not response.text:
                continue
            if hasattr(response, "parsed") and response.parsed is not None:
                return response.parsed
            return RefinedSlideResponse.model_validate(json.loads(response.text))
        except Exception as e:
            logger.warning(f"Slide Refinement model {model_name} failed: {e}")
            last_exc = e
            continue

    if isinstance(last_exc, HTTPException):
        raise last_exc
    raise HTTPException(status_code=502, detail={"error_code": "AI_REFINE_FAILED", "message": "Failed to refine slide content."})


# ==============================================================================
# Multilingual Slide Translation with Provider Fallback
# ==============================================================================

def translate_slide_ai(
    slide_title: str,
    slide_content: Any,
    speaker_notes: Optional[str] = None,
    source_language: str = "English",
    target_language: str = "Urdu",
    ai_provider: Optional[str] = None
) -> Dict[str, Any]:
    """Translates slide title, structured visual content, and speaker notes with provider fallback hierarchy."""
    configured_provider = (ai_provider or getattr(settings, "AI_PRIMARY_PROVIDER", "gemini") or getattr(settings, "AI_PROVIDER", "gemini") or "gemini").lower().strip()

    # Priority 1: Primary Gemini execution
    if configured_provider == "gemini" or not configured_provider:
        if ai_circuit_breaker.can_use_provider("gemini") and settings.GEMINI_API_KEY:
            try:
                res = _translate_slide_gemini(slide_title, slide_content, speaker_notes, source_language, target_language)
                ai_circuit_breaker.record_success("gemini")
                return res
            except Exception as e:
                ai_circuit_breaker.record_failure("gemini", e)
                logger.warning(f"Primary Gemini Translation failed: {e}. Evaluating Groq secondary fallback...")

    # Explicit DeepSeek primary override
    elif configured_provider == "deepseek":
        if settings.DEEPSEEK_API_KEY:
            try:
                from app.services.deepseek_service import translate_slide_deepseek
                return translate_slide_deepseek(
                    slide_title=slide_title,
                    slide_content=slide_content,
                    speaker_notes=speaker_notes,
                    source_language=source_language,
                    target_language=target_language
                )
            except Exception as e:
                logger.warning(f"DeepSeek Translation failed: {e}. Trying Gemini...")
                if ai_circuit_breaker.can_use_provider("gemini") and settings.GEMINI_API_KEY:
                    try:
                        res = _translate_slide_gemini(slide_title, slide_content, speaker_notes, source_language, target_language)
                        ai_circuit_breaker.record_success("gemini")
                        return res
                    except Exception as g_err:
                        ai_circuit_breaker.record_failure("gemini", g_err)

    # Priority 2: Secondary Fallback to Groq
    if getattr(settings, "AI_FALLBACK_ENABLED", True) and is_groq_available():
        if ai_circuit_breaker.can_use_provider("groq"):
            try:
                logger.info(f"Executing secondary AI provider (Groq) fallback for translation to {target_language}...")
                res = translate_slide_groq(slide_title, slide_content, speaker_notes, source_language, target_language)
                ai_circuit_breaker.record_success("groq")
                return res
            except Exception as groq_err:
                ai_circuit_breaker.record_failure("groq", groq_err)
                logger.error(f"Secondary Groq fallback Translation failed: {groq_err}")

    # Priority 3: Tertiary DeepSeek Fallback
    if settings.DEEPSEEK_API_KEY:
        try:
            from app.services.deepseek_service import translate_slide_deepseek
            return translate_slide_deepseek(
                slide_title=slide_title,
                slide_content=slide_content,
                speaker_notes=speaker_notes,
                source_language=source_language,
                target_language=target_language
            )
        except Exception as fb_err:
            logger.error(f"Tertiary DeepSeek Translation failed: {fb_err}")

    # Priority 4: Local synthesis engine fallback
    from app.services.synthesizer import synthesize_slide_translation
    logger.info(f"Using local multilingual synthesis for {target_language} translation...")
    return synthesize_slide_translation(
        slide_title=slide_title,
        slide_content=slide_content,
        speaker_notes=speaker_notes,
        source_language=source_language,
        target_language=target_language
    )


def _translate_slide_gemini(
    slide_title: str,
    slide_content: Any,
    speaker_notes: Optional[str],
    source_language: str,
    target_language: str
) -> Dict[str, Any]:
    client = get_gemini_client()
    system_instruction = (
        f"You are an expert multilingual presentation localization architect. "
        f"Your task is to translate the given slide from {source_language} into {target_language}. "
        f"CRITICAL RULES:\n"
        f"1. Preserve the EXACT JSON structure, keys, number of items, visual layout type, and formatting.\n"
        f"2. Translate all text (title, subtitle, bullet_points, steps, timeline_items, comparison_columns, stats, cards, table_data, hierarchy_levels, speaker_notes) accurately and naturally into {target_language}.\n"
        f"3. For RTL languages like Urdu or Arabic, provide natural idiomatic translations.\n"
        f"4. Respond strictly with a valid JSON object containing: 'title', 'content', 'speaker_notes', 'target_language'."
    )

    payload = {
        "title": slide_title,
        "content": slide_content,
        "speaker_notes": speaker_notes or ""
    }

    prompt = (
        f"Translate from {source_language} to {target_language}:\n"
        f"{json.dumps(payload, ensure_ascii=False, indent=2)}\n\n"
        f"Return JSON strictly with translated 'title', 'content', 'speaker_notes', and 'target_language': '{target_language}'."
    )

    configured_model = getattr(settings, "GEMINI_MODEL_NAME", "gemini-2.5-flash") or "gemini-2.5-flash"
    candidate_models = [configured_model, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
    seen_models = set()
    models_to_try = [m for m in candidate_models if not (m in seen_models or seen_models.add(m))]

    last_err = None
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    temperature=0.3,
                )
            )
            if not response or not response.text:
                continue
            parsed = json.loads(response.text)
            return {
                "title": parsed.get("title", slide_title),
                "content": parsed.get("content", slide_content),
                "speaker_notes": parsed.get("speaker_notes", speaker_notes),
                "target_language": target_language
            }
        except Exception as e:
            last_err = e
            logger.warning(f"Translation with model {model_name} failed: {e}. Trying next candidate...")
            continue

    if last_err:
        logger.error(f"All Gemini translation candidate models failed: {last_err}")
    raise HTTPException(status_code=502, detail={"error_code": "AI_TRANSLATE_FAILED", "message": f"Failed to translate slide into {target_language}: {last_err}"})


