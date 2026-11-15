import os
import io
import hashlib
import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Optional
from gtts import gTTS
from gtts.lang import tts_langs

from app.core.config import settings

logger = logging.getLogger("presentai.tts")

# Cache directory for synthesized audio
CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "scratch", "audio_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Mapping from common language names and codes to gTTS language codes
LANGUAGE_MAP: Dict[str, str] = {
    "english": "en",
    "en": "en",
    "en-us": "en",
    "en-gb": "en-uk",
    "urdu": "ur",
    "ur": "ur",
    "ur-pk": "ur",
    "urdu (اردو)": "ur",
    "chinese": "zh-CN",
    "zh": "zh-CN",
    "zh-cn": "zh-CN",
    "zh-tw": "zh-TW",
    "chinese (simplified)": "zh-CN",
    "chinese (traditional)": "zh-TW",
    "arabic": "ar",
    "ar": "ar",
    "ar-sa": "ar",
    "arabic (العربية)": "ar",
    "filipino": "tl",
    "tagalog": "tl",
    "fil": "tl",
    "tl": "tl",
    "fil-ph": "tl",
    "spanish": "es",
    "es": "es",
    "es-es": "es",
    "french": "fr",
    "fr": "fr",
    "german": "de",
    "de": "de",
    "portuguese": "pt",
    "pt": "pt",
    "pt-br": "pt",
    "russian": "ru",
    "ru": "ru",
    "japanese": "ja",
    "ja": "ja",
    "korean": "ko",
    "ko": "ko",
    "hindi": "hi",
    "hi": "hi",
    "bengali": "bn",
    "bn": "bn",
    "turkish": "tr",
    "tr": "tr",
    "indonesian": "id",
    "id": "id",
    "italian": "it",
    "it": "it",
    "dutch": "nl",
    "nl": "nl",
    "vietnamese": "vi",
    "vi": "vi",
    "thai": "th",
    "th": "th",
    "gujarati": "gu",
    "marathi": "mr",
    "tamil": "ta",
    "telugu": "te",
    "punjabi": "pa",
}

def resolve_tts_lang_code(lang_str: str) -> str:
    """Resolves presentation language string or BCP-47 tag to a valid TTS code."""
    if not lang_str:
        return "en"
    clean = lang_str.strip().lower()
    if clean in LANGUAGE_MAP:
        return LANGUAGE_MAP[clean]
    # Check prefix before hyphen
    prefix = clean.split("-")[0]
    if prefix in LANGUAGE_MAP:
        return LANGUAGE_MAP[prefix]
    return "en"

class BaseTTSProvider(ABC):
    """Abstract interface for backend TTS providers."""
    
    @abstractmethod
    def synthesize(self, text: str, language: str) -> bytes:
        """Synthesize text into MP3 audio bytes."""
        pass

    @abstractmethod
    def get_supported_languages(self) -> List[str]:
        """Return list of supported language codes."""
        pass


class GTTSProvider(BaseTTSProvider):
    """Google Text-to-Speech provider with broad multilingual support."""

    def __init__(self):
        try:
            self._supported = tts_langs()
        except Exception:
            self._supported = {"en": "English", "ur": "Urdu", "zh-CN": "Chinese", "ar": "Arabic", "tl": "Filipino"}

    def synthesize(self, text: str, language: str) -> bytes:
        lang_code = resolve_tts_lang_code(language)
        
        # Verify language is available in gTTS
        if lang_code not in self._supported:
            base = lang_code.split("-")[0]
            if base in self._supported:
                lang_code = base
            else:
                lang_code = "en"

        tts = gTTS(text=text.strip(), lang=lang_code, slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        return fp.getvalue()

    def get_supported_languages(self) -> List[str]:
        return list(self._supported.keys())


class OpenAITTSProvider(BaseTTSProvider):
    """OpenAI TTS provider for high-fidelity speech synthesis."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")

    def synthesize(self, text: str, language: str) -> bytes:
        if not self.api_key:
            raise ValueError("OpenAI API key not configured for TTS.")
        
        from openai import OpenAI
        client = OpenAI(api_key=self.api_key)
        response = client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text.strip()
        )
        return response.content

    def get_supported_languages(self) -> List[str]:
        return ["en", "ur", "zh", "ar", "es", "fr", "de", "pt", "ru", "ja", "ko", "hi", "it", "nl", "id"]


class MockTTSProvider(BaseTTSProvider):
    """Mock TTS provider returning a silent or dummy MP3 frame for tests without network calls."""

    def synthesize(self, text: str, language: str) -> bytes:
        # Minimal valid MP3 header frame
        return b'\xff\xfb\x90d\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00' * 32

    def get_supported_languages(self) -> List[str]:
        return ["en", "ur", "zh", "ar", "tl", "es", "fr", "de", "hi", "ja", "ko"]


class TTSService:
    """Manages TTS provider selection, audio synthesis, and caching."""

    def __init__(self):
        self._provider: BaseTTSProvider = GTTSProvider()

    def set_provider(self, provider: BaseTTSProvider):
        self._provider = provider

    def get_cache_key(self, text: str, language: str) -> str:
        lang_code = resolve_tts_lang_code(language)
        raw = f"{lang_code}:{text.strip()}".encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    def synthesize_speech(self, text: str, language: str = "English", use_cache: bool = True) -> bytes:
        """Synthesizes text into MP3 audio with disk caching."""
        if not text or not text.strip():
            raise ValueError("No text provided for narration synthesis.")

        cache_key = self.get_cache_key(text, language)
        cache_file = os.path.join(CACHE_DIR, f"{cache_key}.mp3")

        # 1. Check disk cache
        if use_cache and os.path.exists(cache_file):
            try:
                with open(cache_file, "rb") as f:
                    cached_bytes = f.read()
                    if cached_bytes and len(cached_bytes) > 0:
                        logger.info(f"Serving TTS audio from cache for key: {cache_key}")
                        return cached_bytes
            except Exception as e:
                logger.warning(f"Failed to read audio cache: {e}")

        # 2. Synthesize via provider
        logger.info(f"Synthesizing TTS audio for language '{language}' (key: {cache_key})")
        audio_bytes = self._provider.synthesize(text, language)

        # 3. Write to disk cache
        if use_cache and audio_bytes:
            try:
                with open(cache_file, "wb") as f:
                    f.write(audio_bytes)
            except Exception as e:
                logger.warning(f"Failed to write audio cache: {e}")

        return audio_bytes

    def get_supported_languages(self) -> List[str]:
        return self._provider.get_supported_languages()


# Global singleton service instance
tts_service = TTSService()
