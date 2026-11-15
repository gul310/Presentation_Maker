import { useEffect, useState, useCallback, useRef } from 'react';
import { getPresentation } from '../services/presentationApi';
import { createPracticeSession, saveSlideTranscript, finishPracticeSession } from '../services/practiceApi';
import { speechRecognitionService } from '../services/speechRecognitionService';
import type { PresentationDetail, Slide } from '../types/presentation';
import type { PracticeSession } from '../types/practice';
import {
  Mic,
  MicOff,
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  MessageSquare,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react';
import { isRtlLanguage } from '../constants/languages';


interface PracticeModePageProps {
  presentationId: string | number;
  onNavigate: (path: string) => void;
}

export function PracticeModePage({ presentationId, onNavigate }: PracticeModePageProps) {
  const [presentation, setPresentation] = useState<PresentationDetail | null>(null);
  const [practiceSession, setPracticeSession] = useState<PracticeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  // Practice State Flow: 'setup' -> 'practicing' -> 'evaluating'
  const [modeState, setModeState] = useState<'setup' | 'practicing' | 'evaluating'>('setup');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Timers
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [slideSeconds, setSlideSeconds] = useState(0);


  // Speech Recognition & Transcripts
  const [isMicActive, setIsMicActive] = useState(false);
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const totalTimerRef = useRef<any>(null);
  const slideTimerRef = useRef<any>(null);
  const currentTranscriptRef = useRef<string>('');
  const slideSecondsRef = useRef<number>(0);

  // Load Presentation
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await getPresentation(presentationId);
        setPresentation(data);
        if (!data.slides || data.slides.length === 0) {
          setError('This presentation has no slides.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load presentation.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [presentationId]);

  const slides = presentation?.slides || [];
  const currentSlide: Slide | undefined = slides[currentSlideIndex];

  // Speech Recognition Handler
  const startMic = useCallback(() => {
    setMicError(null);
    if (!speechRecognitionService.isSupported()) {
      setMicError("Speech recognition is not supported in this browser.");
      return;
    }

    const lang = presentation?.preferred_language || presentation?.language || 'English';
    speechRecognitionService.start(
      lang,
      (finalText, interimText) => {
        setAccumulatedTranscript(finalText);
        setInterimTranscript(interimText);
        currentTranscriptRef.current = (finalText + (interimText ? ' ' + interimText : '')).trim();
      },
      (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsMicActive(false);
        if (err && err.error === 'language-not-supported') {
          setMicError(`${lang} speech recognition is not supported in this browser. Please use Chrome.`);
        } else if (err && err.error === 'not-allowed') {
          setMicError("Microphone permission was denied.");
        } else {
          setMicError("Speech recognition error occurred.");
        }
      }
    );
    setIsMicActive(true);
  }, [presentation]);

  const stopMic = useCallback(() => {
    speechRecognitionService.stop();
    setIsMicActive(false);
    setInterimTranscript('');
  }, []);

  // Start Practice Session
  const handleStartPractice = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await createPracticeSession(presentationId);
      setPracticeSession(session);
      setModeState('practicing');
      setTotalSeconds(0);
      setSlideSeconds(0);
      slideSecondsRef.current = 0;
      setAccumulatedTranscript('');
      setInterimTranscript('');
      currentTranscriptRef.current = '';
      startMic();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize practice session.');
    } finally {
      setLoading(false);
    }
  };

  // Timer Tick
  useEffect(() => {
    if (modeState === 'practicing') {
      totalTimerRef.current = setInterval(() => setTotalSeconds((s) => s + 1), 1000);
      slideTimerRef.current = setInterval(() => {
        setSlideSeconds((s) => {
          const next = s + 1;
          slideSecondsRef.current = next;
          return next;
        });
      }, 1000);
    } else {
      clearInterval(totalTimerRef.current);
      clearInterval(slideTimerRef.current);
    }

    return () => {
      clearInterval(totalTimerRef.current);
      clearInterval(slideTimerRef.current);
    };
  }, [modeState]);

  // Save current slide state
  const saveCurrentSlideProgress = useCallback(
    async (status: 'completed' | 'skipped') => {
      if (!practiceSession || !currentSlide) return;

      const fullTranscript = (currentTranscriptRef.current || (accumulatedTranscript + ' ' + interimTranscript)).trim();
      try {
        await saveSlideTranscript(
          practiceSession.id,
          currentSlide.id,
          fullTranscript,
          slideSecondsRef.current || slideSeconds,
          status
        );
      } catch (err) {
        console.error('Failed to save slide transcript:', err);
      }
    },
    [practiceSession, currentSlide, accumulatedTranscript, interimTranscript, slideSeconds]
  );

  // Next / Previous Slide Handlers
  const handleNextSlide = async () => {
    stopMic();
    await saveCurrentSlideProgress('completed');

    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
      setSlideSeconds(0);
      slideSecondsRef.current = 0;
      setAccumulatedTranscript('');
      setInterimTranscript('');
      currentTranscriptRef.current = '';
      setTimeout(() => startMic(), 200);
    }
  };

  const handlePrevSlide = async () => {
    stopMic();
    await saveCurrentSlideProgress('completed');

    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
      setSlideSeconds(0);
      slideSecondsRef.current = 0;
      setAccumulatedTranscript('');
      setInterimTranscript('');
      currentTranscriptRef.current = '';
      setTimeout(() => startMic(), 200);
    }
  };

  // Finish Practice Session
  const handleFinishPractice = async () => {
    stopMic();
    setModeState('evaluating');
    await saveCurrentSlideProgress('completed');

    if (!practiceSession) return;

    try {
      const practiceLang = presentation?.preferred_language || presentation?.language || 'English';
      await finishPracticeSession(practiceSession.id, practiceLang);
      onNavigate(`/practice/${practiceSession.id}/report`);
    } catch (err: any) {
      setError(err.message || 'Failed to complete practice evaluation.');
      setModeState('practicing');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#332D28] text-white flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-[var(--color-primary)] animate-spin mb-4" />
        <p className="text-sm font-medium text-[#FFFFFF]">Preparing Practice Studio...</p>
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className="min-h-screen bg-[#332D28] text-white flex flex-col items-center justify-center p-6">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-lg font-bold mb-2">Practice Session Error</h2>
        <p className="text-sm text-[#FFFFFF] mb-6">{error || 'Presentation not found'}</p>
        <button
          onClick={() => onNavigate(`/presentation/${presentationId}`)}
          className="px-6 py-2.5 rounded-xl bg-[var(--color-primary)] font-semibold text-sm hover:bg-[var(--color-primary-hover)] transition-all"
        >
          Return to Presentation Studio
        </button>
      </div>
    );
  }

  // EVALUATING SCREEN
  if (modeState === 'evaluating') {
    return (
      <div className="min-h-screen bg-[#332D28] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-full bg-indigo-600/20 border border-indigo-500/30 mb-6 animate-pulse">
          <Sparkles className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-extrabold mb-3">Evaluating Practice Performance...</h2>
        <p className="text-sm text-[#FFFFFF] max-w-md mb-8">
          AI Speech Coach is analyzing your spoken transcripts, slide coverage, pacing, and delivery structure in {presentation.language}.
        </p>
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  // SETUP SCREEN
  if (modeState === 'setup') {
    return (
      <div className="min-h-screen bg-[#332D28] text-white flex flex-col items-center justify-center p-6 select-none">
        <div className="w-full max-w-lg bg-[#3E3731] border border-[#8C7D70]/40 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <span className="px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold rounded-full border border-[var(--color-primary)]/20">
              Interactive Practice Studio
            </span>
            <h1 className="text-2xl font-extrabold text-white pt-2">{presentation.title}</h1>
            <p className="text-xs text-[#FFFFFF]">
              Practice delivering your presentation live with real-time speech capture and AI performance scoring.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 bg-[#3E3731] border border-[#8C7D70]/40 rounded-2xl text-center">
            <div>
              <span className="text-xs text-[#FFFFFF] block">Slides</span>
              <span className="text-base font-bold text-white">{slides.length}</span>
            </div>
            <div>
              <span className="text-xs text-[#FFFFFF] block">Language</span>
              <span className="text-base font-bold text-white">{presentation.language}</span>
            </div>
            <div>
              <span className="text-xs text-[#FFFFFF] block">Est. Duration</span>
              <span className="text-base font-bold text-white">~{slides.length * 2}m</span>
            </div>
          </div>

          {!speechRecognitionService.isSupported() && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Speech recognition is not supported in this browser. Please use Chrome or Edge for live transcript capture.
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate(`/presentation/${presentationId}`)}
              className="flex-1 py-3 px-4 bg-[#4D443D] hover:bg-[#5A4F47] text-[#FFFFFF] font-semibold rounded-xl text-sm transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleStartPractice}
              className="flex-1 py-3 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Play className="w-4 h-4 fill-white" /> Start Practice
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PRACTICING SCREEN
  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#332D28] text-white flex flex-col justify-between overflow-hidden select-none relative"
    >
      {/* TOP HEADER */}
      <header className="h-16 border-b border-[#8C7D70]/40 px-6 flex items-center justify-between bg-[#332D28]/95 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              stopMic();
              onNavigate(`/presentation/${presentationId}`);
            }}
            className="p-2 text-[#FFFFFF] hover:text-white rounded-lg hover:bg-[#4D443D] transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <X className="w-4 h-4" />
            <span>End Practice</span>
          </button>

          <span className="h-4 w-px bg-[#4D443D]" />

          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-4 h-4 text-[#FFFFFF]" />
            <span className="font-mono text-[#FFFFFF]">Total: {formatTime(totalSeconds)}</span>
            <span className="text-[#FFFFFF]/60">&bull;</span>
            <span className="font-mono text-[var(--color-primary)] font-semibold">Slide: {formatTime(slideSeconds)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* MIC CONTROLS */}
          {speechRecognitionService.isSupported() ? (
            <button
              onClick={isMicActive ? stopMic : startMic}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isMicActive
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                  : 'bg-[#4D443D] text-[#FFFFFF] hover:text-white'
              }`}
            >
              {isMicActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              <span>{isMicActive ? 'Mic Active' : 'Mic Paused'}</span>
            </button>
          ) : (
            <span className="text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
              No Mic Support
            </span>
          )}

          {/* SPEAKER NOTES BUTTON */}
          {currentSlide?.speaker_notes && (
            <button
              onClick={() => setShowNotes((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                showNotes
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[#4D443D] text-[#FFFFFF] border-[#8C7D70]/40 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>
          )}

          {/* FULLSCREEN */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-[#FFFFFF] hover:text-white rounded-lg hover:bg-[#4D443D] transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MAIN SLIDE CANVAS & LIVE TRANSCRIPT */}
      <main className="flex-1 flex flex-col md:flex-row items-stretch justify-between p-4 md:p-8 gap-6 relative overflow-hidden">
        {micError && (
          <div className="absolute top-4 left-4 right-4 z-45 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center justify-between">
            <span>{micError}</span>
            <button onClick={() => setMicError(null)} className="text-rose-400 hover:underline font-semibold">
              Dismiss
            </button>
          </div>
        )}

        {/* SLIDE CANVAS */}
        <div 
          dir={isRtlLanguage(presentation?.preferred_language || presentation?.language || '') ? 'rtl' : 'ltr'}
          className={`flex-1 bg-[#3E3731] border border-[#8C7D70]/40 rounded-2xl p-6 md:p-10 flex flex-col justify-between relative shadow-2xl ${isRtlLanguage(presentation?.preferred_language || presentation?.language || '') ? 'font-urdu' : ''}`}
        >
          {currentSlide?.layout_type === 'title' ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6">
              <span className="text-xs uppercase tracking-widest text-[var(--color-primary)] font-semibold px-3 py-1 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-full">
                {presentation.title}
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
                {currentSlide.title}
              </h2>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-start space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                  {currentSlide?.title}
                </h2>
              </div>
              <ul className="space-y-4 max-w-3xl pt-2">
                {currentSlide?.content?.bullet_points?.map((bp: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] mt-2 shrink-0" />
                    <span className="text-base text-[#FFFFFF] leading-relaxed">{bp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-[#FFFFFF]/80 pt-4 border-t border-[#8C7D70]/40">
            <span>Practice Mode &bull; {presentation.language}</span>
            <span>Slide {currentSlideIndex + 1} of {slides.length}</span>
          </div>
        </div>

        {/* LIVE TRANSCRIPT PANEL */}
        <div className="w-full md:w-96 bg-[#3E3731] border border-[#8C7D70]/40 rounded-2xl p-6 flex flex-col justify-between shadow-2xl">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#8C7D70]/40 pb-3 mb-4">
              <h3 className="text-xs font-bold text-[#FFFFFF] uppercase tracking-wider flex items-center gap-2">
                <Mic className={`w-4 h-4 ${isMicActive ? 'text-emerald-400' : 'text-[#FFFFFF]/80'}`} />
                Live Speech Transcript
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#4D443D] text-[#FFFFFF] font-mono">
                {presentation.language}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-64 md:max-h-96 space-y-2 pr-1">
              {accumulatedTranscript || interimTranscript ? (
                <p 
                  dir={presentation?.language.toLowerCase() === 'urdu' ? 'rtl' : 'ltr'}
                  className="text-sm text-[#FFFFFF] leading-relaxed font-sans"
                >
                  {accumulatedTranscript}{' '}
                  <span className="text-indigo-400 italic">{interimTranscript}</span>
                </p>
              ) : (
                <div className="py-12 text-center text-[#FFFFFF]/80 text-xs">
                  {isMicActive
                    ? 'Start speaking into your microphone... Spoken words will appear here in real-time.'
                    : 'Microphone is paused. Click "Mic Active" to resume recording.'}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#8C7D70]/40 text-xs text-[#FFFFFF]/80 flex items-center justify-between">
            <span>Words: {(accumulatedTranscript + ' ' + interimTranscript).trim().split(/\s+/).filter(Boolean).length}</span>
            <span>WPM: {slideSeconds > 0 ? Math.round((((accumulatedTranscript + ' ' + interimTranscript).trim().split(/\s+/).filter(Boolean).length) / (slideSeconds / 60.0))) : 0}</span>
          </div>
        </div>

        {/* SPEAKER NOTES DRAWER */}
        {showNotes && currentSlide?.speaker_notes && (
          <aside 
            dir={presentation?.language.toLowerCase() === 'urdu' ? 'rtl' : 'ltr'}
            className="absolute right-6 top-6 bottom-6 w-96 bg-[#3E3731]/95 border border-[#8C7D70]/40 rounded-2xl shadow-2xl p-6 backdrop-blur-xl z-20 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-[#8C7D70]/40 pb-3 mb-4">
                <h3 className="text-sm font-bold text-[#FFFFFF] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[var(--color-primary)]" />
                  Recommended Notes
                </h3>
                <button onClick={() => setShowNotes(false)} className="p-1 text-[#FFFFFF] hover:text-white rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[#FFFFFF] leading-relaxed whitespace-pre-line">
                {currentSlide.speaker_notes}
              </p>
            </div>
          </aside>
        )}
      </main>

      {/* BOTTOM FOOTER */}
      <footer className="h-20 border-t border-[#8C7D70]/40 px-6 flex items-center justify-between bg-[#332D28]/95 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={handleFinishPractice}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg transition-all"
          >
            <CheckCircle2 className="w-4 h-4" /> Finish & Evaluate Practice
          </button>
        </div>

        {/* SLIDE NAV CONTROLS */}
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevSlide}
            disabled={currentSlideIndex === 0}
            className="p-3 bg-[#4D443D] hover:bg-[#5A4F47] disabled:opacity-30 text-white rounded-xl transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-sm font-bold text-white">
            {currentSlideIndex + 1} / {slides.length}
          </span>

          <button
            onClick={handleNextSlide}
            disabled={currentSlideIndex === slides.length - 1}
            className="p-3 bg-[#4D443D] hover:bg-[#5A4F47] disabled:opacity-30 text-white rounded-xl transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
