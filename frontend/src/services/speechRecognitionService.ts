import { getLanguageBCP47Tag } from './speechService';

export class SpeechRecognitionService {
  private static instance: SpeechRecognitionService;
  private recognition: any = null;
  private isListening: boolean = false;
  private shouldBeListening: boolean = false;
  private onTranscriptCallback: ((finalText: string, interimText: string) => void) | null = null;
  private onErrorCallback: ((err: any) => void) | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
      }
    }
  }

  public static getInstance(): SpeechRecognitionService {
    if (!SpeechRecognitionService.instance) {
      SpeechRecognitionService.instance = new SpeechRecognitionService();
    }
    return SpeechRecognitionService.instance;
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public start(
    languageStr: string,
    onTranscriptUpdate: (finalText: string, interimText: string) => void,
    onError?: (err: any) => void
  ): void {
    if (!this.recognition) {
      if (onError) onError(new Error('Speech recognition is not supported in this browser.'));
      return;
    }

    this.onTranscriptCallback = onTranscriptUpdate;
    this.onErrorCallback = onError || null;
    this.shouldBeListening = true;

    if (this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }

    const bcp47 = getLanguageBCP47Tag(languageStr);
    this.recognition.lang = bcp47;

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result && result[0]) {
          const text = result[0].transcript || '';
          if (result.isFinal) {
            finalTranscript += (finalTranscript ? ' ' : '') + text.trim();
          } else {
            interimTranscript += text;
          }
        }
      }

      if (this.onTranscriptCallback) {
        this.onTranscriptCallback(finalTranscript, interimTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      // Ignore normal 'no-speech' or 'aborted' events during speech flow
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      console.warn('Speech recognition error event:', event);
      if (this.onErrorCallback) this.onErrorCallback(event);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Auto-restart if practice mode is still active
      if (this.shouldBeListening) {
        setTimeout(() => {
          if (this.shouldBeListening && !this.isListening) {
            try {
              this.recognition.start();
              this.isListening = true;
            } catch (err) {
              console.warn('SpeechRecognition auto-restart notice:', err);
            }
          }
        }, 150);
      }
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      if (onError) onError(err);
    }
  }

  public stop(): void {
    this.shouldBeListening = false;
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('Error stopping speech recognition:', err);
      }
      this.isListening = false;
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }
}

export const speechRecognitionService = SpeechRecognitionService.getInstance();

