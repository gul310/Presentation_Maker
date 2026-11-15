import { useEffect, useState, useCallback, useRef } from 'react';
import { getPresentation, teachSlide, translateSlide, translateDeck } from '../services/presentationApi';
import { speechService } from '../services/speechService';
import type { PresentationDetail, Slide, SlideTeachMeResponse } from '../types/presentation';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  MessageSquare,
  BookOpen,
  Loader2,
  Maximize2,
  Minimize2,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { VisualSlideRenderer } from '../components/VisualSlideRenderer';
import { loadGoogleFont } from '../constants/themes';
import { useZoomImmunity } from '../hooks/useZoomImmunity';
import {
  SUPPORTED_LANGUAGES,
  getLanguageByName,
  isRtlLanguage,
} from '../constants/languages';

interface PresentationModePageProps {
  presentationId: string | number;
  onNavigate: (path: string) => void;
}

export function PresentationModePage({ presentationId, onNavigate }: PresentationModePageProps) {
  const { stageRef, anchorStyle, blockStyle } = useZoomImmunity({
    standardWidth: 1024,
    standardHeight: 576,
  });
  const [presentation, setPresentation] = useState<PresentationDetail | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Multilingual viewing state
  const [viewingLanguage, setViewingLanguage] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationsCache, setTranslationsCache] = useState<Record<string | number, Record<string, any>>>({});

  // Panels & Views
  const [showNotes, setShowNotes] = useState(false);
  const [showTeachMe, setShowTeachMe] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Speech State
  const [speechState, setSpeechState] = useState<'idle' | 'speaking' | 'paused'>('idle');
  const [speechTarget, setSpeechTarget] = useState<'notes' | 'teach' | null>(null);

  // Teach Me State
  const [teachData, setTeachData] = useState<SlideTeachMeResponse | null>(null);
  const [teachLoading, setTeachLoading] = useState(false);
  const [teachError, setTeachError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const loadPresentation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPresentation(presentationId);
      setPresentation(data);
      if (data.theme) {
        if (data.theme.font_pairing) {
          loadGoogleFont(data.theme.font_pairing);
        } else if (data.theme.fonts) {
          loadGoogleFont(data.theme.fonts.headingFont);
          loadGoogleFont(data.theme.fonts.bodyFont);
        }
      }
      const defaultLang = data.preferred_language || data.language || 'English';
      setViewingLanguage((prev) => prev || defaultLang);
      if (!data.slides || data.slides.length === 0) {
        setError('This presentation has no slides.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load presentation.');
    } finally {
      setLoading(false);
    }
  }, [presentationId]);

  useEffect(() => {
    loadPresentation();
  }, [loadPresentation]);

  const slides = presentation?.slides || [];
  const currentSlide: Slide | undefined = slides[currentSlideIndex];

  const primaryLanguage = presentation?.preferred_language || presentation?.language || 'English';
  const isViewingTranslated = viewingLanguage ? viewingLanguage.toLowerCase() !== primaryLanguage.toLowerCase() : false;
  const targetLangCode = getLanguageByName(viewingLanguage)?.code || viewingLanguage.toLowerCase();
  const translatedData = isViewingTranslated && currentSlide
    ? (translationsCache[currentSlide.id]?.[viewingLanguage] ||
       translationsCache[currentSlide.id]?.[targetLangCode] ||
       currentSlide.translations?.[targetLangCode] ||
       currentSlide.translations?.[viewingLanguage])
    : null;

  const displaySlide: Slide | undefined = currentSlide ? {
    ...currentSlide,
    title: (isViewingTranslated && translatedData?.title) ? translatedData.title : currentSlide.title,
    speaker_notes: (isViewingTranslated && translatedData?.speaker_notes) ? translatedData.speaker_notes : currentSlide.speaker_notes,
    content: (isViewingTranslated && translatedData?.content) ? { ...(currentSlide.content || {}), ...(translatedData.content || {}) } : currentSlide.content,
  } : undefined;

  const isCurrentRtl = isRtlLanguage(viewingLanguage || primaryLanguage);

  const ensureTranslationForSlide = useCallback(async (
    slide: Slide,
    targetLang: string,
    currentPres: PresentationDetail
  ) => {
    const primeLang = currentPres.preferred_language || currentPres.language || 'English';
    if (targetLang.toLowerCase() === primeLang.toLowerCase()) return;

    const langObj = getLanguageByName(targetLang);
    const langCode = langObj?.code || targetLang.toLowerCase();
    const cached =
      slide.translations?.[langCode] ||
      slide.translations?.[targetLang] ||
      translationsCache[slide.id]?.[targetLang] ||
      translationsCache[slide.id]?.[langCode];
    if (cached) return;

    setIsTranslating(true);
    try {
      const res = await translateSlide(currentPres.id, slide.id, targetLang);
      const payload = {
        title: res.title,
        content: res.content,
        speaker_notes: res.speaker_notes || '',
      };
      setTranslationsCache((prev) => ({
        ...prev,
        [slide.id]: {
          ...(prev[slide.id] || {}),
          [targetLang]: payload,
          [langCode]: payload,
        },
      }));
    } catch (err: any) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  }, [translationsCache]);

  const handleSwitchViewingLanguage = async (newLang: string) => {
    setViewingLanguage(newLang);
    if (!presentation) return;
    const primeLang = presentation.preferred_language || presentation.language || 'English';
    if (newLang.toLowerCase() === primeLang.toLowerCase()) {
      return;
    }

    setIsTranslating(true);
    setSpeechError(null);
    try {
      const res = await translateDeck(presentation.id, newLang);
      const langObj = getLanguageByName(newLang);
      const langCode = langObj?.code || newLang.toLowerCase();

      const newCache = { ...translationsCache };
      const updatedSlides = presentation.slides.map((s) => {
        const slideId = s.id;
        const transSlide = (res.slides || []).find((ts) => String(ts.slide_id) === String(slideId) || ts.slide_number === s.slide_number);
        if (transSlide) {
          const payload = {
            title: transSlide.title,
            content: transSlide.content,
            speaker_notes: transSlide.speaker_notes || '',
          };
          newCache[slideId] = {
            ...(newCache[slideId] || {}),
            [newLang]: payload,
            [langCode]: payload,
          };
          return {
            ...s,
            translations: {
              ...(s.translations || {}),
              [langCode]: payload,
              [newLang]: payload,
            },
          };
        }
        return s;
      });

      setTranslationsCache(newCache);
      setPresentation({ ...presentation, slides: updatedSlides });
    } catch (err: any) {
      console.warn('Batch translateDeck fallback to single slide:', err);
      if (currentSlide) {
        await ensureTranslationForSlide(currentSlide, newLang, presentation);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  // Speech Handlers
  const handleStopSpeech = useCallback(() => {
    speechService.stop();
    setSpeechState('idle');
    setSpeechTarget(null);
  }, []);

  const handleNextSlide = useCallback(() => {
    handleStopSpeech();
    setShowTeachMe(false);
    setTeachData(null);
    if (currentSlideIndex < slides.length - 1) {
      const nextIdx = currentSlideIndex + 1;
      setCurrentSlideIndex(nextIdx);
      if (presentation && isViewingTranslated && slides[nextIdx]) {
        ensureTranslationForSlide(slides[nextIdx], viewingLanguage, presentation);
      }
    }
  }, [currentSlideIndex, slides, handleStopSpeech, presentation, isViewingTranslated, viewingLanguage, ensureTranslationForSlide]);

  const handlePrevSlide = useCallback(() => {
    handleStopSpeech();
    setShowTeachMe(false);
    setTeachData(null);
    if (currentSlideIndex > 0) {
      const prevIdx = currentSlideIndex - 1;
      setCurrentSlideIndex(prevIdx);
      if (presentation && isViewingTranslated && slides[prevIdx]) {
        ensureTranslationForSlide(slides[prevIdx], viewingLanguage, presentation);
      }
    }
  }, [currentSlideIndex, slides, handleStopSpeech, presentation, isViewingTranslated, viewingLanguage, ensureTranslationForSlide]);

  const handleSpeakNotes = useCallback(() => {
    const noteText = displaySlide?.speaker_notes || currentSlide?.speaker_notes;
    if (!noteText) return;
    setSpeechError(null);

    if (speechState === 'paused' && speechTarget === 'notes') {
      speechService.resume();
      setSpeechState('speaking');
      return;
    }

    setSpeechState('speaking');
    setSpeechTarget('notes');

    const speakLang = viewingLanguage || presentation?.preferred_language || presentation?.language || 'English';

    speechService.speak(
      noteText,
      speakLang,
      () => {
        setSpeechState('idle');
        setSpeechTarget(null);
        if (autoPlay && currentSlideIndex < slides.length - 1) {
          handleNextSlide();
        }
      },
      (err) => {
        console.error('Speech error:', err);
        setSpeechState('idle');
        setSpeechTarget(null);
        setSpeechError(err?.message || `Narration is currently unavailable for this language.`);
      }
    );
  }, [displaySlide, currentSlide, presentation, viewingLanguage, speechState, speechTarget, autoPlay, currentSlideIndex, slides.length, handleNextSlide]);

  const handlePauseSpeech = () => {
    speechService.pause();
    setSpeechState('paused');
  };

  const handleReplaySpeech = () => {
    handleStopSpeech();
    if (speechTarget === 'teach' && teachData) {
      handleSpeakTeachMe();
    } else {
      handleSpeakNotes();
    }
  };

  // Teach Me Handler
  const handleTeachMe = async () => {
    if (!currentSlide || !presentation) return;
    setShowTeachMe(true);
    setTeachLoading(true);
    setTeachError(null);
    handleStopSpeech();

    const activeLang = viewingLanguage || presentation.preferred_language || presentation.language || 'English';

    try {
      const res = await teachSlide(presentationId, currentSlide.id, activeLang);
      setTeachData(res);
    } catch (err: any) {
      setTeachError(err.message || 'Failed to generate Teach Me explanation.');
    } finally {
      setTeachLoading(false);
    }
  };

  const handleSpeakTeachMe = () => {
    if (!teachData) return;
    setSpeechError(null);

    if (speechState === 'paused' && speechTarget === 'teach') {
      speechService.resume();
      setSpeechState('speaking');
      return;
    }

    setSpeechState('speaking');
    setSpeechTarget('teach');

    const teachText = `${teachData.slide_title}. ${teachData.explanation} ${
      teachData.simple_example ? 'Example: ' + teachData.simple_example : ''
    } Summary: ${teachData.summary}`;

    const speakLang = viewingLanguage || presentation?.preferred_language || presentation?.language || 'English';

    speechService.speak(
      teachText,
      speakLang,
      () => {
        setSpeechState('idle');
        setSpeechTarget(null);
      },
      (err) => {
        console.error('Teach Me speech error:', err);
        setSpeechState('idle');
        setSpeechTarget(null);
        setSpeechError(err?.message || 'Narration is currently unavailable for this language.');
      }
    );
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          handleNextSlide();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          handlePrevSlide();
          break;
        case 'Escape':
          e.preventDefault();
          handleStopSpeech();
          onNavigate(`/presentation/${presentationId}`);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextSlide, handlePrevSlide, handleStopSpeech, presentationId, onNavigate]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      speechService.stop();
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#332D28] text-white flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-[var(--color-primary)] animate-spin mb-4" />
        <p className="text-sm font-medium text-[#FFFFFF]">Loading Presentation Deck...</p>
      </div>
    );
  }

  if (error || !presentation || !currentSlide) {
    return (
      <div className="min-h-screen bg-[#332D28] text-white flex flex-col items-center justify-center p-6">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-lg font-bold mb-2">Unable to Launch Presentation Mode</h2>
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

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#332D28] text-white flex flex-col justify-between overflow-hidden select-none relative"
    >
      {/* TOP BAR */}
      <header className="h-16 border-b border-[#8C7D70]/40 px-6 flex items-center justify-between bg-[#332D28]/95 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              handleStopSpeech();
              onNavigate(`/presentation/${presentationId}`);
            }}
            className="p-2 text-[#FFFFFF] hover:text-white rounded-lg hover:bg-[#4D443D] transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Exit Presentation Mode (Esc)"
          >
            <X className="w-4 h-4" />
            <span>Exit (Esc)</span>
          </button>

          <span className="h-4 w-px bg-[#4D443D]" />

          <h1 className="text-sm font-bold text-[#FFFFFF] truncate max-w-md">
            {presentation.title}
          </h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            Primary: {presentation.preferred_language || presentation.language}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* VIEW IN LANGUAGE SWITCHER */}
          <div className="flex items-center gap-2 bg-[#3E3731] px-3 py-1.5 rounded-xl border border-[#8C7D70]/40">
            <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-xs text-[#FFFFFF] font-medium whitespace-nowrap">View in:</span>
            <select
              value={viewingLanguage || (presentation.preferred_language || presentation.language)}
              onChange={(e) => handleSwitchViewingLanguage(e.target.value)}
              disabled={isTranslating}
              className="bg-transparent text-xs text-indigo-300 font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value={presentation.preferred_language || presentation.language} className="bg-[#3E3731] text-white">
                Original ({presentation.preferred_language || presentation.language})
              </option>
              <optgroup label="Other Supported Languages" className="bg-[#3E3731] text-[#FFFFFF]">
                {SUPPORTED_LANGUAGES.filter(
                  (l) =>
                    l.name.toLowerCase() !==
                    (presentation.preferred_language || presentation.language).toLowerCase()
                ).map((lang) => (
                  <option key={lang.code} value={lang.name} className="bg-[#3E3731] text-white">
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </optgroup>
            </select>
            {isTranslating && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
          </div>

          {/* TEACH ME BUTTON */}
          <button
            onClick={handleTeachMe}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Teach Me</span>
          </button>

          {/* SPEAKER NOTES BUTTON */}
          {displaySlide?.speaker_notes && (
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

          {/* FULLSCREEN BUTTON */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-[#FFFFFF] hover:text-white rounded-lg hover:bg-[#4D443D] transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {speechError && (
        <div className="px-6 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs flex items-center justify-between z-30">
          <span>{speechError}</span>
          <button onClick={() => setSpeechError(null)} className="text-rose-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* MAIN SLIDE CANVAS */}
      <main 
        ref={stageRef}
        className="flex-1 flex items-center justify-center p-4 md:p-8 relative overflow-hidden"
      >
        {/* Zoom-Immune Anchor */}
        <div
          className="presentation-block-anchor flex items-center justify-center shrink-0"
          style={anchorStyle}
        >
          <div 
            dir={isCurrentRtl ? 'rtl' : 'ltr'}
            className={`bg-[#FFFFFF] dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 flex flex-col justify-between relative overflow-hidden transition-colors ${isCurrentRtl ? 'font-urdu' : ''}`}
            style={{
              ...blockStyle,
              backgroundColor: presentation.theme?.palette.background || undefined,
              color: presentation.theme?.palette.text || undefined,
              fontFamily: presentation.theme?.fonts?.bodyFont || presentation.theme?.font_pairing?.body || undefined,
            }}
          >
            {/* Accent Gradient Stripe */}
            <div 
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{
                background: presentation.theme
                  ? `linear-gradient(to right, ${presentation.theme.palette.primary}, ${presentation.theme.palette.secondary}, ${presentation.theme.palette.accent})`
                  : 'linear-gradient(to right, var(--color-primary), #A8836C, #D0AE92)'
              }}
            />

            {/* Slide Layout Rendering */}
            {displaySlide && (
              <VisualSlideRenderer
                slide={displaySlide}
                presentationTitle={presentation.title}
                language={viewingLanguage || presentation.language}
                isUrdu={isCurrentRtl}
                theme={presentation.theme}
              />
            )}

            {/* Footer Slide info */}
            <div className="flex items-center justify-between text-xs font-semibold text-[#77574A] dark:text-[#FFFFFF] pt-3 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/40 shrink-0">
              <span>{presentation.title}</span>
              <span>Slide {currentSlideIndex + 1} of {slides.length}</span>
            </div>
          </div>
        </div>

        {/* DRAWER: SPEAKER NOTES */}
        {showNotes && displaySlide?.speaker_notes && (
          <aside 
            dir={isCurrentRtl ? 'rtl' : 'ltr'}
            className={`absolute right-6 top-6 bottom-6 w-96 bg-[#3E3731]/95 border border-[#8C7D70]/40 rounded-2xl shadow-2xl p-6 backdrop-blur-xl z-20 flex flex-col justify-between ${isCurrentRtl ? 'font-urdu text-right' : ''}`}
          >
            <div>
              <div className="flex items-center justify-between border-b border-[#8C7D70]/40 pb-3 mb-4">
                <h3 className="text-sm font-bold text-[#FFFFFF] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[var(--color-primary)]" />
                  Speaker Notes ({viewingLanguage || presentation.language})
                </h3>
                <button
                  onClick={() => setShowNotes(false)}
                  className="p-1 text-[#FFFFFF] hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[#FFFFFF] leading-relaxed whitespace-pre-line font-sans">
                {displaySlide.speaker_notes}
              </p>
            </div>

            {/* SPEAK NOTES CONTROLS */}
            <div className="pt-4 border-t border-[#8C7D70]/40 flex items-center gap-2">
              {speechState === 'idle' ? (
                <button
                  onClick={handleSpeakNotes}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[var(--color-primary-hover)] transition-all"
                >
                  <Play className="w-4 h-4" /> Speak Notes
                </button>
              ) : speechState === 'speaking' ? (
                <button
                  onClick={handlePauseSpeech}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600/80 text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-amber-600 transition-all"
                >
                  <Pause className="w-4 h-4" /> Pause
                </button>
              ) : (
                <button
                  onClick={handleSpeakNotes}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all"
                >
                  <Play className="w-4 h-4" /> Resume
                </button>
              )}

              <button
                onClick={handleReplaySpeech}
                className="p-2.5 bg-[#4D443D] text-[#FFFFFF] rounded-xl hover:text-white hover:bg-[#5A4F47]"
                title="Replay"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleStopSpeech}
                className="p-2.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl hover:bg-rose-500/30"
                title="Stop Speech"
              >
                <VolumeX className="w-4 h-4" />
              </button>
            </div>
          </aside>
        )}

        {/* MODAL: TEACH ME EXPLANATION */}
        {showTeachMe && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-40 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#3E3731] border border-indigo-500/30 rounded-2xl p-6 md:p-8 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#8C7D70]/40 pb-4 mb-4">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-base">
                    <Sparkles className="w-5 h-5" />
                    <span>Teach Me: {currentSlide.title}</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowTeachMe(false);
                      handleStopSpeech();
                    }}
                    className="p-1 text-[#FFFFFF] hover:text-white rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {teachLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    <p className="text-sm font-medium text-[#FFFFFF]">Generating interactive educational breakdown in {viewingLanguage || presentation.language}...</p>
                  </div>
                ) : teachError ? (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
                    {teachError}
                  </div>
                ) : teachData ? (
                  <div 
                    dir={isCurrentRtl ? 'rtl' : 'ltr'}
                    className={`space-y-6 ${isCurrentRtl ? 'font-urdu text-right' : ''}`}
                  >
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-indigo-400 font-bold mb-1">Concept Explanation</h4>
                      <p className="text-sm text-[#FFFFFF] leading-relaxed">{teachData.explanation}</p>
                    </div>

                    {teachData.key_terms && teachData.key_terms.length > 0 && (
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-indigo-400 font-bold mb-2">Key Terms & Jargon</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {teachData.key_terms.map((kt, i) => (
                            <div key={i} className="p-3 bg-[#332D28] border border-[#8C7D70]/40 rounded-xl text-xs">
                              <span className="font-bold text-indigo-300 block">{kt.term}</span>
                              <span className="text-[#FFFFFF] mt-0.5 block">{kt.definition}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {teachData.simple_example && (
                      <div className="p-4 bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-xs">
                        <span className="font-bold text-indigo-300 block mb-1">Simple Example / Analogy</span>
                        <p className="text-indigo-100">{teachData.simple_example}</p>
                      </div>
                    )}

                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs flex items-start gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-emerald-300 block">Takeaway Summary</span>
                        <span className="text-emerald-100">{teachData.summary}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* LISTEN CONTROLS FOR TEACH ME */}
              {teachData && !teachLoading && (
                <div className="pt-6 mt-6 border-t border-[#8C7D70]/40 flex items-center justify-between">
                  <span className="text-xs text-[#FFFFFF]">Read aloud in {viewingLanguage || presentation.language}</span>

                  <div className="flex items-center gap-2">
                    {speechState === 'speaking' && speechTarget === 'teach' ? (
                      <button
                        onClick={handlePauseSpeech}
                        className="py-2 px-4 rounded-xl bg-amber-600 text-white text-xs font-semibold flex items-center gap-2"
                      >
                        <Pause className="w-4 h-4" /> Pause
                      </button>
                    ) : (
                      <button
                        onClick={handleSpeakTeachMe}
                        className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2"
                      >
                        <Volume2 className="w-4 h-4" /> Listen
                      </button>
                    )}

                    <button
                      onClick={handleStopSpeech}
                      className="p-2 bg-[#4D443D] text-[#FFFFFF] rounded-xl hover:text-white"
                      title="Stop"
                    >
                      <VolumeX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM CONTROL BAR */}
      <footer className="h-20 border-t border-[#8C7D70]/40 px-6 flex items-center justify-between bg-[#332D28]/95 backdrop-blur-md z-30">
        {/* SPEECH CONTROLS QUICK BAR */}
        <div className="flex items-center gap-2">
          {currentSlide.speaker_notes ? (
            speechState === 'speaking' ? (
              <button
                onClick={handlePauseSpeech}
                className="px-4 py-2 bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl flex items-center gap-2"
              >
                <Pause className="w-4 h-4" /> Pause Speech
              </button>
            ) : speechState === 'paused' ? (
              <button
                onClick={handleSpeakNotes}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2"
              >
                <Play className="w-4 h-4" /> Resume Speech
              </button>
            ) : (
              <button
                onClick={handleSpeakNotes}
                className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold rounded-xl flex items-center gap-2"
              >
                <Volume2 className="w-4 h-4" /> Speak Notes
              </button>
            )
          ) : (
            <span className="text-xs text-[#FFFFFF]/70">No speaker notes for this slide</span>
          )}

          {speechState !== 'idle' && (
            <button
              onClick={handleStopSpeech}
              className="p-2 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl hover:bg-rose-500/30"
              title="Stop Speech"
            >
              <VolumeX className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* NAVIGATION CONTROLS */}
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevSlide}
            disabled={currentSlideIndex === 0}
            className="p-3 bg-[#4D443D] hover:bg-[#5A4F47] disabled:opacity-30 disabled:hover:bg-[#4D443D] text-white rounded-xl transition-all"
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center px-2">
            <span className="text-sm font-bold text-white">
              {currentSlideIndex + 1} / {slides.length}
            </span>
          </div>

          <button
            onClick={handleNextSlide}
            disabled={currentSlideIndex === slides.length - 1}
            className="p-3 bg-[#4D443D] hover:bg-[#5A4F47] disabled:opacity-30 disabled:hover:bg-[#4D443D] text-white rounded-xl transition-all"
            title="Next Slide (Right Arrow / Space)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* AUTO PLAY TOGGLE */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[#FFFFFF] cursor-pointer">
            <input
              type="checkbox"
              checked={autoPlay}
              onChange={(e) => setAutoPlay(e.target.checked)}
              className="rounded bg-[#332D28] border-[#8C7D70]/40 text-[var(--color-primary)] focus:ring-0"
            />
            <span>Auto Advance</span>
          </label>
        </div>
      </footer>
    </div>
  );
}
