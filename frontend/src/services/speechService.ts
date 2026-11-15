import { getLanguageBCP47Tag } from '../constants/languages';
import { getAuthToken, getGuestSessionId } from './api';

export { getLanguageBCP47Tag };

export interface NarrationOptions {
  presentationId?: string | number;
  slideId?: string | number;
  useCache?: boolean;
}

export class SpeechService {
  private static instance: SpeechService;
  private currentAudio: HTMLAudioElement | null = null;
  private synth: SpeechSynthesis | null = null;
  
  // In-memory audio Blob URL cache: key = `${language}:${hash(text)}`
  private audioCache = new Map<string, string>();
  private isSynthesizing = false;
  private currentAbortController: AbortController | null = null;

  private constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public static getInstance(): SpeechService {
    if (!SpeechService.instance) {
      SpeechService.instance = new SpeechService();
    }
    return SpeechService.instance;
  }

  private getCacheKey(text: string, languageStr: string): string {
    return `${languageStr.toLowerCase().trim()}:${text.trim()}`;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined';
  }

  public async speak(
    text: string,
    languageStr: string,
    onEnd?: () => void,
    onError?: (err: any) => void,
    _options?: NarrationOptions
  ): Promise<void> {
    this.stop();

    if (!text || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    const trimmedText = text.trim();
    const cacheKey = this.getCacheKey(trimmedText, languageStr);

    try {
      this.isSynthesizing = true;
      let blobUrl = this.audioCache.get(cacheKey);

      if (!blobUrl) {
        // Fetch synthesized audio from backend TTS service
        this.currentAbortController = new AbortController();
        const token = getAuthToken();
        const guestSessionId = getGuestSessionId();

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Guest-Session-ID': guestSessionId,
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/tts/synthesize', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text: trimmedText,
            language: languageStr,
            use_cache: true,
          }),
          signal: this.currentAbortController.signal,
        });

        if (!response.ok) {
          throw new Error(`TTS service response: ${response.status}`);
        }

        const audioBlob = await response.blob();
        blobUrl = URL.createObjectURL(audioBlob);
        this.audioCache.set(cacheKey, blobUrl);
      }

      this.isSynthesizing = false;

      // Play audio via HTML5 Audio element
      const audio = new Audio(blobUrl);
      this.currentAudio = audio;

      audio.onended = () => {
        this.currentAudio = null;
        if (onEnd) onEnd();
      };

      audio.onerror = (e) => {
        this.currentAudio = null;
        console.error('Audio playback error:', e);
        // Attempt browser fallback if local speech synthesis supports this language
        this.fallbackBrowserSpeech(trimmedText, languageStr, onEnd, onError);
      };

      await audio.play();
    } catch (err: any) {
      this.isSynthesizing = false;
      if (err.name === 'AbortError') {
        return;
      }
      console.warn('Backend TTS unavailable, attempting browser fallback:', err.message);
      this.fallbackBrowserSpeech(trimmedText, languageStr, onEnd, onError);
    }
  }

  private fallbackBrowserSpeech(
    text: string,
    languageStr: string,
    onEnd?: () => void,
    onError?: (err: any) => void
  ): void {
    if (!this.synth) {
      if (onError) onError(new Error("Narration is currently unavailable for this language."));
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      const bcp47 = getLanguageBCP47Tag(languageStr);
      utterance.lang = bcp47;

      const voices = this.synth.getVoices();
      const langPrefix = bcp47.split('-')[0].toLowerCase();
      const match = voices.find(
        (v) => v.lang.toLowerCase() === bcp47.toLowerCase() || v.lang.toLowerCase().startsWith(langPrefix)
      );

      if (match) {
        utterance.voice = match;
        utterance.lang = match.lang;
      }

      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        if (onError) onError(new Error("Narration is currently unavailable for this language."));
      };

      this.synth.speak(utterance);
    } catch (e: any) {
      if (onError) onError(new Error("Narration is currently unavailable for this language."));
    }
  }

  public pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
    } else if (this.synth && this.synth.speaking) {
      this.synth.pause();
    }
  }

  public resume(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch(console.error);
    } else if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  public stop(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.isSynthesizing = false;

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    if (this.synth) {
      this.synth.cancel();
    }
  }

  public isSpeaking(): boolean {
    if (this.isSynthesizing) return true;
    if (this.currentAudio) {
      return !this.currentAudio.paused && !this.currentAudio.ended;
    }
    return this.synth ? this.synth.speaking : false;
  }

  public isPaused(): boolean {
    if (this.currentAudio) {
      return this.currentAudio.paused && this.currentAudio.currentTime > 0 && !this.currentAudio.ended;
    }
    return this.synth ? this.synth.paused : false;
  }
}

export const speechService = SpeechService.getInstance();
