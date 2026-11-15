import { useEffect, useState } from 'react';
import {
  getPresentation,
  updatePresentation,
  updateSlide,
  createSlide,
  deleteSlide,
  reorderSlides,
  downloadPresentationExport,
  refineSlide,
  translateSlide,
  translateDeck,
  teachSlide,
  updateSlideImage,
  removeSlideImage,
  type ExportFormat,
} from '../services/presentationApi';
import type { PresentationDetail, Slide, SlideContent, SlideImage, SlideTeachMeResponse } from '../types/presentation';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layout,
  Save,
  ArrowLeft,
  Loader2,
  FileText,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Play,
  Mic,
  FileSpreadsheet,
  Sparkles,
  Wand2,
  X,
  Image as ImageIcon,
  Globe,
  Package,
  Eye,
  Edit3,
  RotateCcw,
  Sun,
  Moon,
  MoreHorizontal,
  Volume2,
  Pause,
  BookOpen,
  Edit2,
  Check,
  Palette,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { UnsplashImageModal } from '../components/UnsplashImageModal';
import { VisualSlideRenderer } from '../components/VisualSlideRenderer';
import { ShareModal } from '../components/ShareModal';
import { Share2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { speechService } from '../services/speechService';
import {
  SUPPORTED_LANGUAGES,
  getLanguageByName,
  isRtlLanguage,
} from '../constants/languages';
import { DesignStudioModal } from '../components/DesignStudioModal';
import { DEFAULT_THEME, type PresentationTheme, loadGoogleFont } from '../constants/themes';
import { useZoomImmunity } from '../hooks/useZoomImmunity';

interface PresentationStudioPageProps {
  presentationId: string | number;
  onNavigate: (path: string) => void;
}

export function PresentationStudioPage({ presentationId, onNavigate }: PresentationStudioPageProps) {
  const { mode, setThemeMode } = useTheme();
  const { stageRef, anchorStyle, blockStyle } = useZoomImmunity({
    standardWidth: 896,
    standardHeight: 504,
  });
  const [deck, setDeck] = useState<PresentationDetail | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [canvasMode, setCanvasMode] = useState<'editor' | 'preview'>('preview');

  // Design & Themes Studio State
  const [showDesignStudio, setShowDesignStudio] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<PresentationTheme>(DEFAULT_THEME);

  // Inline Title Editing
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [deckTitle, setDeckTitle] = useState<string>('');

  // Toolbar & Panels State
  const [showNotes, setShowNotes] = useState<boolean>(true);
  const [showActionsMenu, setShowActionsMenu] = useState<boolean>(false);

  // Teach Me State
  const [showTeachMe, setShowTeachMe] = useState<boolean>(false);
  const [teachLoading, setTeachLoading] = useState<boolean>(false);
  const [teachData, setTeachData] = useState<SlideTeachMeResponse | null>(null);
  const [teachError, setTeachError] = useState<string | null>(null);

  // Audio Narration State
  const [speechState, setSpeechState] = useState<'idle' | 'speaking' | 'paused'>('idle');

  // Multilingual viewing state
  const [viewingLanguage, setViewingLanguage] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationsCache, setTranslationsCache] = useState<Record<string | number, Record<string, any>>>({});

  // Active slide editing state
  const [title, setTitle] = useState('');
  const [layoutType, setLayoutType] = useState('standard');
  const [speakerNotes, setSpeakerNotes] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [bulletPoints, setBulletPoints] = useState<string[]>([]);
  const [subtitle, setSubtitle] = useState('');
  const [slideContent, setSlideContent] = useState<SlideContent>({});

  const getActiveSlideImage = (slide?: Slide | null) => {
    const target = slide || activeSlide;
    const raw = target?.image || target?.content?.image;
    const url = raw?.regular_url || raw?.url || raw?.small_url;
    if (typeof url === 'string' && url.trim().startsWith('http')) {
      return raw;
    }
    return undefined;
  };

  // Export State
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  const handleExportDownload = async (format: ExportFormat) => {
    setShowActionsMenu(false);
    setExportingFormat(format);
    setErrorMsg(null);
    try {
      // First save current slide modifications to database so export reflects latest user edits!
      if (activeSlide) {
        await handleSaveSlide();
      }
      const exportLang = deck?.preferred_language || deck?.language || viewingLanguage;
      await downloadPresentationExport(
        presentationId,
        format,
        deck?.title || 'Presentation',
        undefined,
        exportLang
      );
      setSaveMessage(`Successfully exported ${format.toUpperCase()}!`);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      console.error(`Export ${format.toUpperCase()} failed:`, err);
      const friendlyName = format === 'pptx' ? 'PowerPoint' : format.toUpperCase();
      setErrorMsg(err.message || `${friendlyName} export failed. Please try again.`);
    } finally {
      setExportingFormat(null);
    }
  };

  // AI Refine State
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refining, setRefining] = useState(false);


  const handleAIRefine = async (action: string) => {
    if (!activeSlide || !deck) return;
    setRefining(true);
    setErrorMsg(null);
    try {
      const updatedSlide = await refineSlide(deck.id, activeSlide.id, action as any);
      loadSlideIntoState(updatedSlide);
      setDeck({
        ...deck,
        slides: deck.slides.map((s) => (s.id === updatedSlide.id ? updatedSlide : s)),
      });
      setSaveMessage(`AI Refined slide (${action.replace(/_/g, ' ')})!`);
      setShowRefineModal(false);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI Slide refinement failed.');
    } finally {
      setRefining(false);
    }
  };



  const fetchDeck = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getPresentation(presentationId);
      setDeck(data);
      setDeckTitle(data.title || '');
      const defaultLang = data.preferred_language || data.language || 'English';
      setViewingLanguage((prev) => prev || defaultLang);

      if (data.theme) {
        setCurrentTheme(data.theme);
        if (data.theme.font_pairing) {
          loadGoogleFont(data.theme.font_pairing);
        } else if (data.theme.fonts) {
          loadGoogleFont(data.theme.fonts.headingFont);
          loadGoogleFont(data.theme.fonts.bodyFont);
        }
      }

      if (data.slides && data.slides.length > 0) {
        const initialSlide = data.slides[activeSlideIndex] || data.slides[0];
        loadSlideIntoState(initialSlide);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load presentation deck.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Theme Change & Persistence
  const handleThemeChange = async (newTheme: PresentationTheme) => {
    setCurrentTheme(newTheme);
    if (newTheme.font_pairing) {
      loadGoogleFont(newTheme.font_pairing);
    } else if (newTheme.fonts) {
      loadGoogleFont(newTheme.fonts.headingFont);
      loadGoogleFont(newTheme.fonts.bodyFont);
    }

    if (deck) {
      setDeck((prev) => prev ? { ...prev, theme: newTheme } : null);
      try {
        await updatePresentation(deck.id, { theme: newTheme });
        setSaveMessage('Theme updated & saved!');
        setTimeout(() => setSaveMessage(null), 3000);
      } catch (err: any) {
        console.error('Failed to persist theme:', err);
      }
    }
  };

  // Handle Layout Switcher from Design Studio
  const handleDesignLayoutChange = async (newLayout: string) => {
    setLayoutType(newLayout);
    if (activeSlide && deck) {
      const updatedSlide: Slide = {
        ...activeSlide,
        layout_type: newLayout,
        content: {
          ...(activeSlide.content || {}),
          ...slideContent,
          visual_type: newLayout as any,
        },
      };
      const updatedSlides = deck.slides.map((s, idx) => (idx === activeSlideIndex ? updatedSlide : s));
      setDeck({
        ...deck,
        slides: updatedSlides,
      });
      try {
        await updateSlide(deck.id, activeSlide.id, {
          layout_type: newLayout,
          content: updatedSlide.content,
        });
        setSaveMessage(`Slide layout changed to ${newLayout.replace(/_/g, ' ')}!`);
        setTimeout(() => setSaveMessage(null), 3000);
      } catch (err: any) {
        console.error('Failed to update slide layout:', err);
      }
    }
  };

  // Inline Title Save
  const handleSaveTitle = async () => {
    if (!deck || !deckTitle.trim() || deckTitle === deck.title) {
      setIsEditingTitle(false);
      return;
    }
    setSaving(true);
    try {
      await updatePresentation(deck.id, { title: deckTitle.trim() });
      setDeck({ ...deck, title: deckTitle.trim() });
      setSaveMessage('Presentation title updated');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update title');
      setDeckTitle(deck.title);
    } finally {
      setSaving(false);
      setIsEditingTitle(false);
    }
  };

  // Teach Me Handler
  const handleTeachMe = async () => {
    if (!activeSlide || !deck) return;
    setShowTeachMe(true);
    setTeachLoading(true);
    setTeachError(null);
    handleStopSpeech();

    const activeLang = viewingLanguage || deck.preferred_language || deck.language || 'English';
    try {
      const res = await teachSlide(deck.id, activeSlide.id, activeLang);
      setTeachData(res);
    } catch (err: any) {
      setTeachError(err.message || 'Failed to generate Teach Me breakdown.');
    } finally {
      setTeachLoading(false);
    }
  };

  // Audio Narration Handlers
  const handleStopSpeech = () => {
    speechService.stop();
    setSpeechState('idle');
  };

  const handleSpeakNotes = () => {
    const noteText = displaySpeakerNotes || activeSlide?.speaker_notes;
    if (!noteText) return;

    if (speechState === 'speaking') {
      speechService.pause();
      setSpeechState('paused');
      return;
    }

    if (speechState === 'paused') {
      speechService.resume();
      setSpeechState('speaking');
      return;
    }

    setSpeechState('speaking');
    const speakLang = viewingLanguage || deck?.preferred_language || deck?.language || 'English';
    speechService.speak(
      noteText,
      speakLang,
      () => setSpeechState('idle'),
      () => setSpeechState('idle')
    );
  };

  const loadSlideIntoState = (slide: Slide) => {
    setTitle(slide.title || '');
    setLayoutType(slide.layout_type || slide.content?.visual_type || 'standard');
    setSpeakerNotes(slide.speaker_notes || '');
    setSourceReference(slide.source_reference || '');
    setSubtitle(slide.content?.subtitle || '');
    setSlideContent(slide.content || {});
    setBulletPoints(slide.content?.bullet_points || []);
  };

  useEffect(() => {
    fetchDeck();
  }, [presentationId]);

  useEffect(() => {
    if (deck?.slides && deck.slides[activeSlideIndex]) {
      loadSlideIntoState(deck.slides[activeSlideIndex]);
    }
  }, [activeSlideIndex, deck?.id]);

  const ensureTranslationForSlide = async (
    slide: Slide,
    targetLang: string,
    currentDeck: PresentationDetail
  ) => {
    const primeLang = currentDeck.preferred_language || currentDeck.language || 'English';
    if (targetLang.toLowerCase() === primeLang.toLowerCase()) {
      return;
    }
    const langObj = getLanguageByName(targetLang);
    const langCode = langObj?.code || targetLang.toLowerCase();
    const cached =
      slide.translations?.[langCode] ||
      slide.translations?.[targetLang] ||
      translationsCache[slide.id]?.[targetLang] ||
      translationsCache[slide.id]?.[langCode];
    if (cached) return;

    setIsTranslating(true);
    setErrorMsg(null);
    try {
      const res = await translateSlide(currentDeck.id, slide.id, targetLang);
      const translatedPayload = {
        title: res.title,
        content: res.content,
        speaker_notes: res.speaker_notes || '',
      };
      setTranslationsCache((prev) => ({
        ...prev,
        [slide.id]: {
          ...(prev[slide.id] || {}),
          [targetLang]: translatedPayload,
          [langCode]: translatedPayload,
        },
      }));

      // Update slide in deck state so it persists in memory
      const updatedSlides = currentDeck.slides.map((s) => {
        if (s.id === slide.id) {
          return {
            ...s,
            translations: {
              ...(s.translations || {}),
              [langCode]: translatedPayload,
              [targetLang]: translatedPayload,
            },
          };
        }
        return s;
      });
      setDeck({ ...currentDeck, slides: updatedSlides });
    } catch (err: any) {
      console.error('Slide translation error:', err);
      setErrorMsg('Unable to translate the presentation into the selected language. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSwitchViewingLanguage = async (newLang: string) => {
    setViewingLanguage(newLang);
    if (!deck) return;
    const primeLang = deck.preferred_language || deck.language || 'English';
    if (newLang.toLowerCase() === primeLang.toLowerCase()) {
      return;
    }

    setIsTranslating(true);
    setErrorMsg(null);
    try {
      const res = await translateDeck(deck.id, newLang);
      const langObj = getLanguageByName(newLang);
      const langCode = langObj?.code || newLang.toLowerCase();

      const newCache = { ...translationsCache };
      const updatedSlides = deck.slides.map((s) => {
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
      setDeck({ ...deck, slides: updatedSlides });
    } catch (err: any) {
      console.warn('Batch translateDeck fallback to single slide:', err);
      if (activeSlide) {
        await ensureTranslationForSlide(activeSlide, newLang, deck);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSelectSlide = (index: number) => {
    if (!deck || !deck.slides[index]) return;
    setActiveSlideIndex(index);
    const nextSlide = deck.slides[index];
    loadSlideIntoState(nextSlide);

    const primeLang = deck.preferred_language || deck.language || 'English';
    if (viewingLanguage && viewingLanguage.toLowerCase() !== primeLang.toLowerCase()) {
      ensureTranslationForSlide(nextSlide, viewingLanguage, deck);
    }
  };

  const activeSlide = deck?.slides[activeSlideIndex];

  // Save changes to current slide
  const handleSaveSlide = async () => {
    if (!deck || !activeSlide) return;
    setSaving(true);
    setSaveMessage(null);
    setErrorMsg(null);

    const cleanBullets = bulletPoints.filter((bp) => bp && bp.trim() !== '');

    const currentImage = activeSlide.image || activeSlide.content?.image;

    const updatedContent: SlideContent = {
      ...(activeSlide.content || {}),
      ...slideContent,
      subtitle,
      bullet_points: cleanBullets,
      visual_type: layoutType as any,
      ...(currentImage ? { image: currentImage } : {})
    };

    try {
      const savedSlide = await updateSlide(deck.id, activeSlide.id, {
        title,
        layout_type: layoutType,
        speaker_notes: speakerNotes,
        source_reference: sourceReference,
        content: updatedContent,
        image: currentImage
      });

      // Update local deck state
      const newSlides = [...deck.slides];
      newSlides[activeSlideIndex] = savedSlide;
      setDeck({ ...deck, slides: newSlides });

      setSaveMessage('Changes saved to database');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save slide changes.');
    } finally {
      setSaving(false);
    }
  };

  // Slide Photograph Handlers (Unsplash Integration)
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);

  const handleSelectSlideImage = async (image: SlideImage) => {
    if (!deck || !activeSlide) return;
    try {
      const res = await updateSlideImage(deck.id, activeSlide.id, image);
      const updatedSlides = deck.slides.map(s => {
        if (s.id === activeSlide.id) {
          return {
            ...s,
            image: res.image,
            layout_type: s.layout_type === 'standard' ? 'image_text' : s.layout_type,
            content: {
              ...s.content,
              image: res.image,
              visual_type: (s.layout_type === 'standard' ? 'image_text' : s.content.visual_type) as any
            }
          };
        }
        return s;
      });
      setDeck({ ...deck, slides: updatedSlides });
      if (activeSlide.layout_type === 'standard') {
        setLayoutType('image_text');
      }
      setSaveMessage('Photograph updated successfully.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update photograph.');
    }
  };

  const handleRemoveImageFromCurrentSlide = async () => {
    if (!deck || !activeSlide) return;
    try {
      await removeSlideImage(deck.id, activeSlide.id);
      const updatedSlides = deck.slides.map(s => {
        if (s.id === activeSlide.id) {
          const nextContent = { ...s.content };
          delete nextContent.image;
          delete nextContent.image_url;
          return {
            ...s,
            image: undefined,
            layout_type: s.layout_type === 'image_text' ? 'standard' : s.layout_type,
            content: {
              ...nextContent,
              visual_type: (s.layout_type === 'image_text' ? 'standard' : s.content.visual_type) as any
            }
          };
        }
        return s;
      });
      setDeck({ ...deck, slides: updatedSlides });
      if (activeSlide.layout_type === 'image_text') {
        setLayoutType('standard');
      }
      setSaveMessage('Photograph removed.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove photograph.');
    }
  };

  // Add new slide
  const handleAddSlide = async () => {
    if (!deck) return;
    setSaving(true);
    try {
      const newSlide = await createSlide(deck.id, {
        title: 'New Slide',
        layout_type: 'standard',
        content: { subtitle: '', bullet_points: ['Key point 1'] },
        speaker_notes: '',
        slide_number: deck.slides.length + 1,
      });

      const updatedDeck = {
        ...deck,
        slide_count: deck.slides.length + 1,
        slides: [...deck.slides, newSlide],
      };
      setDeck(updatedDeck);
      setActiveSlideIndex(updatedDeck.slides.length - 1);
      loadSlideIntoState(newSlide);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add slide.');
    } finally {
      setSaving(false);
    }
  };

  // Delete current slide
  const handleDeleteSlide = async (slideId: string | number, index: number) => {
    if (!deck || deck.slides.length <= 1) {
      setErrorMsg('Presentation must have at least one slide.');
      return;
    }
    setSaving(true);
    try {
      await deleteSlide(deck.id, slideId);
      const remainingSlides = deck.slides.filter((s) => s.id !== slideId);
      const updatedDeck = {
        ...deck,
        slide_count: remainingSlides.length,
        slides: remainingSlides,
      };
      setDeck(updatedDeck);
      const newIdx = Math.max(0, index - 1);
      setActiveSlideIndex(newIdx);
      if (remainingSlides[newIdx]) {
        loadSlideIntoState(remainingSlides[newIdx]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete slide.');
    } finally {
      setSaving(false);
    }
  };

  // Move slide up / down
  const handleMoveSlide = async (index: number, direction: 'up' | 'down') => {
    if (!deck) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= deck.slides.length) return;

    const newSlides = [...deck.slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIdx];
    newSlides[targetIdx] = temp;

    // Recalculate slide numbers
    const reorderedItems = newSlides.map((s, idx) => ({
      id: s.id,
      slide_number: idx + 1,
    }));

    setSaving(true);
    try {
      const updatedSlides = await reorderSlides(deck.id, reorderedItems);
      setDeck({ ...deck, slides: updatedSlides });
      setActiveSlideIndex(targetIdx);
      loadSlideIntoState(updatedSlides[targetIdx]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reorder slides.');
    } finally {
      setSaving(false);
    }
  };

  // Bullet point handlers
  const handleBulletChange = (idx: number, val: string) => {
    const updated = [...bulletPoints];
    updated[idx] = val;
    setBulletPoints(updated);
  };

  const handleAddBullet = () => {
    setBulletPoints([...bulletPoints, '']);
  };

  const handleRemoveBullet = (idx: number) => {
    setBulletPoints(bulletPoints.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[var(--color-primary)] animate-spin mb-4" />
        <p className="text-gray-300 font-medium">Loading Presentation Deck...</p>
      </div>
    );
  }

  if (!deck || !activeSlide) {
    return (
      <div className="max-w-xl mx-auto my-12 text-center glass-panel p-8 rounded-2xl">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-100">Presentation Not Found</h2>
        <p className="text-gray-400 text-sm mt-2 mb-6">
          The requested presentation deck does not exist or you do not have permission to view it.
        </p>
        <button
          onClick={() => onNavigate('/dashboard')}
          className="px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-white font-medium text-sm hover:bg-[var(--color-primary-hover)] transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const primaryLanguage = deck.preferred_language || deck.language || 'English';
  const isViewingTranslated = viewingLanguage ? viewingLanguage.toLowerCase() !== primaryLanguage.toLowerCase() : false;
  const targetLangCode = getLanguageByName(viewingLanguage)?.code || viewingLanguage.toLowerCase();
  const translatedData = isViewingTranslated && activeSlide
    ? (translationsCache[activeSlide.id]?.[viewingLanguage] ||
      translationsCache[activeSlide.id]?.[targetLangCode] ||
      activeSlide.translations?.[targetLangCode] ||
      activeSlide.translations?.[viewingLanguage])
    : null;

  const displayTitle = (isViewingTranslated && translatedData?.title) ? translatedData.title : title;
  const displaySubtitle = (isViewingTranslated && translatedData?.content?.subtitle !== undefined) ? translatedData.content?.subtitle : subtitle;
  const displaySpeakerNotes = (isViewingTranslated && translatedData?.speaker_notes) ? translatedData.speaker_notes : speakerNotes;
  const displayLayoutType = (isViewingTranslated && translatedData?.content?.visual_type) || layoutType;
  const isCurrentRtl = isRtlLanguage(viewingLanguage || primaryLanguage);

  const renderEditorContent = () => {
    const currentContent: SlideContent = {
      ...(activeSlide?.content || {}),
      ...slideContent,
      ...(translatedData?.content || {}),
    };

    const visualType = displayLayoutType;

    // 1. CARDS GRID EDITOR
    if (visualType === 'cards_grid') {
      const rawCards = currentContent.cards && currentContent.cards.length > 0
        ? currentContent.cards
        : (bulletPoints.length > 0
          ? bulletPoints.map((bp, i) => {
            const parts = bp.split(/[:\u2013\u2014-]/);
            return {
              title: parts.length > 1 ? parts[0].trim() : `Pillar ${i + 1}`,
              description: parts.length > 1 ? parts.slice(1).join(':').trim() : bp,
              icon_name: ['target', 'zap', 'award', 'shield', 'activity', 'lightbulb'][i % 6],
            };
          })
          : [
            { title: 'Pillar 1', description: '', icon_name: 'target' },
            { title: 'Pillar 2', description: '', icon_name: 'zap' },
          ]);

      const handleCardChange = (idx: number, field: 'title' | 'description', val: string) => {
        const updated = rawCards.map((c, i) => i === idx ? { ...c, [field]: val } : c);
        setSlideContent((prev) => ({ ...prev, cards: updated }));
      };

      const handleAddCard = () => {
        const updated = [...rawCards, { title: `Pillar ${rawCards.length + 1}`, description: '', icon_name: 'target' }];
        setSlideContent((prev) => ({ ...prev, cards: updated }));
      };

      const handleRemoveCard = (idx: number) => {
        const updated = rawCards.filter((_, i) => i !== idx);
        setSlideContent((prev) => ({ ...prev, cards: updated }));
      };

      return (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[#D0AE92]/30">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Core Pillars & Cards ({rawCards.length})
            </span>
            {!isViewingTranslated && rawCards.length < 6 && (
              <button
                type="button"
                onClick={handleAddCard}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Card
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
            {rawCards.map((card, idx) => (
              <div key={idx} className="p-3 bg-[#F9F2E4]/60 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 rounded-2xl space-y-2 relative group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                    Card #{idx + 1}
                  </span>
                  {!isViewingTranslated && rawCards.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCard(idx)}
                      className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 p-0.5 transition-all"
                      title="Remove Card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#77574A] dark:text-[#FFFFFF] block mb-0.5">Card Title</label>
                  <input
                    type="text"
                    value={card.title}
                    readOnly={isViewingTranslated}
                    onChange={(e) => handleCardChange(idx, 'title', e.target.value)}
                    placeholder="Card title..."
                    className="w-full text-xs font-bold bg-[#FFFFFF] dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-lg px-2.5 py-1.5 text-[#2D2320] dark:text-[#FFFFFF] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#77574A] dark:text-[#FFFFFF] block mb-0.5">Card Description</label>
                  <textarea
                    rows={2}
                    value={card.description}
                    readOnly={isViewingTranslated}
                    onChange={(e) => handleCardChange(idx, 'description', e.target.value)}
                    placeholder="Card description..."
                    className="w-full text-xs bg-[#FFFFFF] dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-lg p-2 text-[#2D2320] dark:text-[#FFFFFF] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 2. PROCESS FLOW & FLOWCHART EDITOR
    if (visualType === 'process_flow' || visualType === 'flowchart') {
      const rawSteps = currentContent.steps && currentContent.steps.length > 0
        ? currentContent.steps
        : (bulletPoints.length > 0
          ? bulletPoints.map((bp, i) => {
            const parts = bp.split(/[:\u2013\u2014-]/);
            return {
              step: i + 1,
              label: parts.length > 1 ? parts[0].trim() : `Step ${i + 1}`,
              description: parts.length > 1 ? parts.slice(1).join(':').trim() : bp,
            };
          })
          : [
            { step: 1, label: 'Step 1', description: '' },
            { step: 2, label: 'Step 2', description: '' },
          ]);

      const handleStepChange = (idx: number, field: 'label' | 'description', val: string) => {
        const updated = rawSteps.map((s, i) => i === idx ? { ...s, [field]: val } : s);
        setSlideContent((prev) => ({ ...prev, steps: updated }));
      };

      const handleAddStep = () => {
        const updated = [...rawSteps, { step: rawSteps.length + 1, label: `Step ${rawSteps.length + 1}`, description: '' }];
        setSlideContent((prev) => ({ ...prev, steps: updated }));
      };

      const handleRemoveStep = (idx: number) => {
        const updated = rawSteps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 }));
        setSlideContent((prev) => ({ ...prev, steps: updated }));
      };

      return (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[#D0AE92]/30">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Process Steps ({rawSteps.length})
            </span>
            {!isViewingTranslated && rawSteps.length < 6 && (
              <button
                type="button"
                onClick={handleAddStep}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Step
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
            {rawSteps.map((step, idx) => (
              <div key={idx} className="p-3 bg-[#F9F2E4]/60 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 rounded-2xl space-y-2 relative group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-primary)] text-white">
                    Step {step.step || idx + 1}
                  </span>
                  {!isViewingTranslated && rawSteps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx)}
                      className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 p-0.5 transition-all"
                      title="Remove Step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#77574A] dark:text-[#FFFFFF] block mb-0.5">Step Name</label>
                  <input
                    type="text"
                    value={step.label}
                    readOnly={isViewingTranslated}
                    onChange={(e) => handleStepChange(idx, 'label', e.target.value)}
                    placeholder="Step name..."
                    className="w-full text-xs font-bold bg-[#FFFFFF] dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-lg px-2.5 py-1.5 text-[#2D2320] dark:text-[#FFFFFF] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#77574A] dark:text-[#FFFFFF] block mb-0.5">Description</label>
                  <textarea
                    rows={2}
                    value={step.description}
                    readOnly={isViewingTranslated}
                    onChange={(e) => handleStepChange(idx, 'description', e.target.value)}
                    placeholder="Step description..."
                    className="w-full text-xs bg-[#FFFFFF] dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-lg p-2 text-[#2D2320] dark:text-[#FFFFFF] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 3. TIMELINE EDITOR
    if (visualType === 'timeline') {
      const rawItems = currentContent.timeline_items && currentContent.timeline_items.length > 0
        ? currentContent.timeline_items
        : (bulletPoints.length > 0
          ? bulletPoints.map((bp, i) => {
            const parts = bp.split(/[:\u2013\u2014-]/);
            return {
              period: parts.length > 1 ? parts[0].trim() : `Phase ${i + 1}`,
              title: parts.length > 1 ? parts[0].trim() : `Milestone ${i + 1}`,
              description: parts.length > 1 ? parts.slice(1).join(':').trim() : bp,
            };
          })
          : [
            { period: 'Phase 1', title: 'Milestone 1', description: '' },
            { period: 'Phase 2', title: 'Milestone 2', description: '' },
          ]);

      const handleItemChange = (idx: number, field: 'period' | 'title' | 'description', val: string) => {
        const updated = rawItems.map((item, i) => i === idx ? { ...item, [field]: val } : item);
        setSlideContent((prev) => ({ ...prev, timeline_items: updated }));
      };

      const handleAddItem = () => {
        const updated = [...rawItems, { period: `Phase ${rawItems.length + 1}`, title: `Milestone ${rawItems.length + 1}`, description: '' }];
        setSlideContent((prev) => ({ ...prev, timeline_items: updated }));
      };

      const handleRemoveItem = (idx: number) => {
        const updated = rawItems.filter((_, i) => i !== idx);
        setSlideContent((prev) => ({ ...prev, timeline_items: updated }));
      };

      return (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[#D0AE92]/30">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Timeline Milestones ({rawItems.length})
            </span>
            {!isViewingTranslated && rawItems.length < 6 && (
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Milestone
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
            {rawItems.map((item, idx) => (
              <div key={idx} className="p-3 bg-[#F9F2E4]/60 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 rounded-2xl space-y-2 relative group">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={item.period}
                    readOnly={isViewingTranslated}
                    onChange={(e) => handleItemChange(idx, 'period', e.target.value)}
                    placeholder="Phase / Date..."
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 w-28 focus:outline-none"
                  />
                  {!isViewingTranslated && rawItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 p-0.5 transition-all"
                      title="Remove Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#77574A] dark:text-[#FFFFFF] block mb-0.5">Title</label>
                  <input
                    type="text"
                    value={item.title}
                    readOnly={isViewingTranslated}
                    onChange={(e) => handleItemChange(idx, 'title', e.target.value)}
                    placeholder="Milestone title..."
                    className="w-full text-xs font-bold bg-[#FFFFFF] dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-lg px-2.5 py-1.5 text-[#2D2320] dark:text-[#FFFFFF] focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#77574A] dark:text-[#FFFFFF] block mb-0.5">Description</label>
                  <textarea
                    rows={2}
                    value={item.description}
                    readOnly={isViewingTranslated}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    placeholder="Description..."
                    className="w-full text-xs bg-[#FFFFFF] dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-lg p-2 text-[#2D2320] dark:text-[#FFFFFF] focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 4. STATS GRID EDITOR
    if (visualType === 'stats_grid') {
      const rawStats = currentContent.stats && currentContent.stats.length > 0
        ? currentContent.stats
        : (bulletPoints.length > 0
          ? bulletPoints.map((bp, i) => {
            const match = bp.match(/(\d+[%kMBNx+]?)/);
            const metric = match ? match[1] : `${(i + 1) * 25}%`;
            return {
              metric,
              label: bp.replace(metric, '').replace(/^[\s\-\u2013\u2014:]+/, '').trim() || `Metric ${i + 1}`,
              description: bp,
            };
          })
          : [
            { metric: '95%', label: 'Metric 1', description: '' },
            { metric: '3.5x', label: 'Metric 2', description: '' },
          ]);

      const handleStatChange = (idx: number, field: 'metric' | 'label' | 'description', val: string) => {
        const updated = rawStats.map((s, i) => i === idx ? { ...s, [field]: val } : s);
        setSlideContent((prev) => ({ ...prev, stats: updated }));
      };

      const handleAddStat = () => {
        const updated = [...rawStats, { metric: '100%', label: `Metric ${rawStats.length + 1}`, description: '' }];
        setSlideContent((prev) => ({ ...prev, stats: updated }));
      };

      const handleRemoveStat = (idx: number) => {
        const updated = rawStats.filter((_, i) => i !== idx);
        setSlideContent((prev) => ({ ...prev, stats: updated }));
      };

      return (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[#D0AE92]/30">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Metrics & Key Statistics ({rawStats.length})
            </span>
            {!isViewingTranslated && rawStats.length < 6 && (
              <button
                type="button"
                onClick={handleAddStat}
                className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Metric
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
            {rawStats.map((stat, idx) => (
              <div key={idx} className="p-3 bg-[#F9F2E4]/60 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 rounded-2xl space-y-2 relative group">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={stat.metric}
                    readOnly={isViewingTranslated}
                    onChange={(e) => handleStatChange(idx, 'metric', e.target.value)}
                    placeholder="e.g. 98%"
                    className="text-sm font-black px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 w-24 focus:outline-none"
                  />
                  {!isViewingTranslated && rawStats.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStat(idx)}
                      className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 p-0.5 transition-all"
                      title="Remove Metric"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#77574A] dark:text-[#FFFFFF] block mb-0.5">Label</label>
                  <input
                    type="text"
                    value={stat.label}
                    readOnly={isViewingTranslated}
                    onChange={(e) => handleStatChange(idx, 'label', e.target.value)}
                    placeholder="Metric label..."
                    className="w-full text-xs font-bold bg-[#FFFFFF] dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-lg px-2.5 py-1.5 text-[#2D2320] dark:text-[#FFFFFF] focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#77574A] dark:text-[#FFFFFF] block mb-0.5">Description</label>
                  <textarea
                    rows={2}
                    value={stat.description || ''}
                    readOnly={isViewingTranslated}
                    onChange={(e) => handleStatChange(idx, 'description', e.target.value)}
                    placeholder="Context..."
                    className="w-full text-xs bg-[#FFFFFF] dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-lg p-2 text-[#2D2320] dark:text-[#FFFFFF] focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 5. DEFAULT BULLETS EDITOR (for standard, conclusion, two_column, section_header, title)
    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-[#D0AE92]/30">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
            Bullet Points ({bulletPoints.length})
          </span>
          {!isViewingTranslated && (
            <button
              type="button"
              onClick={handleAddBullet}
              className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add bullet point
            </button>
          )}
        </div>

        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          {(Array.isArray(bulletPoints) ? bulletPoints : []).map((bp: string, i: number) => (
            <div key={i} className="flex items-start gap-2.5 group">
              <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] mt-2 flex-shrink-0" />
              <input
                type="text"
                value={bp}
                readOnly={isViewingTranslated}
                onChange={(e) => handleBulletChange(i, e.target.value)}
                placeholder="Bullet point content..."
                className={`flex-1 text-xs font-medium bg-[#FFFFFF]/60 dark:bg-[#2A2521] border border-[#D0AE92]/30 dark:border-[#8C7D70]/40 rounded-xl px-3 py-2 text-[#2D2320] dark:text-[#FFFFFF] hover:border-[#D0AE92]/60 focus:border-[var(--color-primary)] focus:outline-none ${isCurrentRtl ? 'text-right' : ''}`}
              />
              {!isViewingTranslated && (
                <button
                  type="button"
                  onClick={() => handleRemoveBullet(i)}
                  className="opacity-0 group-hover:opacity-100 text-[#77574A] hover:text-rose-600 dark:hover:text-rose-400 p-1.5 transition-all"
                  title="Remove bullet point"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] -mt-2 overflow-hidden select-none">
      {/* 1. TOP APPLICATION HEADER */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[#FFFFFF]/95 dark:bg-[#332D28]/95 border-b border-[#D0AE92]/40 dark:border-[#8C7D70]/40 rounded-t-2xl backdrop-blur-md z-30 shrink-0">
        {/* Left: Back button, Logo, Inline Editable Title, Save Status */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => onNavigate('/dashboard')}
            className="p-1.5 rounded-xl text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] dark:hover:text-[#FFFFFF] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#4D443D] transition-all shrink-0"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <img
            src="/images/logo.png"
            alt="Presentation Maker"
            className="w-7 h-7 rounded-lg object-cover shadow-sm bg-white border border-[#D0AE92]/40 shrink-0 hidden sm:block"
          />

          {/* Inline Editable Presentation Title */}
          <div className="flex items-center gap-2 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={deckTitle}
                  onChange={(e) => setDeckTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setDeckTitle(deck.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  autoFocus
                  className="text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF] bg-[#F9F2E4] dark:bg-[#3E3731] border border-[var(--color-primary)] rounded-lg px-2.5 py-0.5 focus:outline-none"
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1 rounded-md text-emerald-600 hover:bg-emerald-500/10"
                  title="Save Title"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingTitle(true)}
                className="group flex items-center gap-1.5 cursor-pointer py-0.5 px-2 rounded-lg hover:bg-[#EBD7BE]/30 dark:hover:bg-[#4D443D]/50 transition-colors min-w-0"
                title="Click to rename presentation"
              >
                <h1 className="text-sm sm:text-base font-bold text-[#4A3A34] dark:text-[#FFFFFF] truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                  {deck.title}
                </h1>
                <Edit2 className="w-3 h-3 text-[#77574A] dark:text-[#FFFFFF] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            )}

            <span className="hidden md:inline-flex text-[10px] uppercase px-2 py-0.5 rounded-full bg-[#77574A]/10 dark:bg-[#8C7D70]/20 text-[#77574A] dark:text-[#FFFFFF] border border-[#77574A]/25 dark:border-[#8C7D70]/40 font-semibold shrink-0">
              {deck.source_type}
            </span>
          </div>

          {/* Save Status Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${saving ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
            <span>{saving ? 'Saving changes...' : saveMessage || 'All changes saved'}</span>
          </div>
        </div>

        {/* Right: Primary Present Button & Actions Overflow Menu */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate(`/presentation/${deck.id}/present`)}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all flex items-center gap-2 shadow-md hover:shadow-indigo-500/25 cursor-pointer"
            title="Start Fullscreen Presentation Slideshow"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Present</span>
          </button>

          {/* Compact Actions Overflow Menu */}
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu((prev) => !prev)}
              disabled={exportingFormat !== null}
              className="p-1.5 rounded-xl text-[#4A3A34] dark:text-[#FFFFFF] bg-[#EBD7BE]/40 dark:bg-[#4D443D] hover:bg-[#EBD7BE]/70 dark:hover:bg-[#5A4F47] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 transition-all shadow-sm disabled:opacity-60"
              title="More Actions & Exports"
            >
              {exportingFormat ? (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
              ) : (
                <MoreHorizontal className="w-4 h-4" />
              )}
            </button>

            {showActionsMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-[#FFFFFF] dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-2xl shadow-2xl p-2 z-50 flex flex-col space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF]">
                  Presentation Actions
                </div>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    setShowShareModal(true);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#4D443D] rounded-xl flex items-center gap-2.5 transition-all"
                >
                  <Share2 className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                  <span>Share Presentation</span>
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    handleSaveSlide();
                  }}
                  disabled={saving}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#4D443D] rounded-xl flex items-center gap-2.5 transition-all"
                >
                  <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Save Current Slide</span>
                </button>

                <div className="h-px bg-[#D0AE92]/30 dark:bg-[#8C7D70]/20 my-1" />
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF]">
                  Export Deck
                </div>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    handleExportDownload('pptx');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#4D443D] rounded-xl flex items-center gap-2.5 transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="flex flex-col">
                    <span>PowerPoint (.pptx)</span>
                    <span className="text-[10px] text-[#77574A] dark:text-[#FFFFFF] font-normal">With embedded audio notes</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    handleExportDownload('pdf');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#4D443D] rounded-xl flex items-center gap-2.5 transition-all"
                >
                  <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                  <div className="flex flex-col">
                    <span>PDF Document (.pdf)</span>
                    <span className="text-[10px] text-[#77574A] dark:text-[#FFFFFF] font-normal">16:9 Landscape format</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    handleExportDownload('html');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#4D443D] rounded-xl flex items-center gap-2.5 transition-all"
                >
                  <Globe className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Interactive App (.html)</span>
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    handleExportDownload('package');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#4D443D] rounded-xl flex items-center gap-2.5 transition-all"
                >
                  <Package className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Offline Bundle (.zip)</span>
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    handleExportDownload('png');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#4D443D] rounded-xl flex items-center gap-2.5 transition-all"
                >
                  <ImageIcon className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>Slide Images (.zip)</span>
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    handleExportDownload('notes');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#4D443D] rounded-xl flex items-center gap-2.5 transition-all"
                >
                  <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Speaker Notes (.txt)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. SECONDARY PRESENTATION TOOLBAR (Logically Grouped) */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-[#FDFBF7] dark:bg-[#332D28] border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40 text-xs z-20 shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* GROUP 1: PRESENTATION & VIEW */}
          <div className="flex items-center bg-[#EBD7BE]/35 dark:bg-[#3E3731] p-0.5 rounded-xl border border-[#D0AE92]/35 dark:border-[#8C7D70]/40 shadow-sm">
            <button
              type="button"
              onClick={() => setCanvasMode('preview')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${canvasMode === 'preview'
                  ? 'bg-[var(--color-primary)] dark:bg-[#8C7D70] text-white shadow-sm'
                  : 'text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] dark:hover:text-[#FFFFFF]'
                }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Slide Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setCanvasMode('editor')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${canvasMode === 'editor'
                  ? 'bg-[var(--color-primary)] dark:bg-[#8C7D70] text-white shadow-sm'
                  : 'text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] dark:hover:text-[#FFFFFF]'
                }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Content</span>
            </button>
          </div>

          <div className="h-4 w-px bg-[#D0AE92]/30 dark:bg-[#8C7D70]/25 hidden sm:block" />

          {/* DESIGN STUDIO BUTTON */}
          <button
            type="button"
            onClick={() => setShowDesignStudio(true)}
            className="px-3 py-1 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-md hover:shadow-indigo-500/25 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shrink-0"
            title="Open Theme & Design Studio (Themes, Colors, Typography, Layouts)"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Design / Themes</span>
            {currentTheme && (
              <span className="hidden xl:inline-block text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-semibold ml-1">
                {currentTheme.name}
              </span>
            )}
          </button>

          <div className="h-4 w-px bg-[#D0AE92]/30 dark:bg-[#8C7D70]/25 hidden sm:block" />

          {/* GROUP 2: LEARNING SUITE */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleTeachMe}
              className="px-3 py-1 rounded-xl font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 transition-all flex items-center gap-1.5 shadow-sm"
              title="Interactive Educational Breakdown"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Teach Mode</span>
            </button>
            <button
              onClick={() => onNavigate(`/presentation/${deck.id}/practice`)}
              className="px-3 py-1 rounded-xl font-bold text-xs text-pink-700 dark:text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/25 transition-all flex items-center gap-1.5 shadow-sm"
              title="Speech Practice & Feedback"
            >
              <Mic className="w-3.5 h-3.5 text-pink-500" />
              <span>Practice</span>
            </button>
          </div>

          <div className="h-4 w-px bg-[#D0AE92]/30 dark:bg-[#8C7D70]/25 hidden md:block" />

          {/* GROUP 3: CONTENT & AI TOOLS */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsImageModalOpen(true)}
              className={`px-3 py-1 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border shadow-sm ${
                getActiveSlideImage()
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-[#EBD7BE]/40 dark:bg-[#4D443D] text-[#77574A] dark:text-[#FFFFFF] border-[#D0AE92]/40 dark:border-[#8C7D70]/40 hover:text-[#4A3A34]'
              }`}
              title="Add or Change Slide Photograph from Unsplash"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>{getActiveSlideImage() ? 'Slide Photo' : '+ Add Photo'}</span>
            </button>
            <button
              onClick={() => setShowRefineModal(true)}
              disabled={refining || !activeSlide}
              className="px-3 py-1 rounded-xl font-bold text-xs text-[#4A3A34] dark:text-[#FFFFFF] bg-[#EBD7BE]/40 dark:bg-[#4D443D] hover:bg-[#EBD7BE]/70 dark:hover:bg-[#5A4F47] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Wand2 className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>AI Refine</span>
            </button>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`px-3 py-1 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border shadow-sm ${showNotes
                  ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/30'
                  : 'bg-[#EBD7BE]/40 dark:bg-[#4D443D] text-[#77574A] dark:text-[#FFFFFF] border-[#D0AE92]/40 dark:border-[#8C7D70]/40 hover:text-[#4A3A34]'
                }`}
              title="Toggle Speaker Notes Panel"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>
            {activeSlide?.speaker_notes && (
              <button
                onClick={handleSpeakNotes}
                className="px-3 py-1 rounded-xl font-bold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all flex items-center gap-1.5 shadow-sm"
                title="Listen to Slide Notes"
              >
                {speechState === 'speaking' ? (
                  <Pause className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                )}
                <span>{speechState === 'speaking' ? 'Pause' : 'Listen'}</span>
              </button>
            )}
          </div>
        </div>

        {/* GROUP 4: PREFERENCES (Language & Theme) */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Multilingual View Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#FFFFFF] dark:bg-[#3E3731] px-2.5 py-1 rounded-xl border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm">
            <Globe className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
            <span className="text-[11px] text-[#77574A] dark:text-[#FFFFFF] font-semibold whitespace-nowrap">View in:</span>
            <select
              value={viewingLanguage || (deck.preferred_language || deck.language)}
              onChange={(e) => handleSwitchViewingLanguage(e.target.value)}
              disabled={isTranslating}
              className="bg-transparent text-xs text-[#4A3A34] dark:text-[#FFFFFF] font-bold focus:outline-none cursor-pointer pr-1"
            >
              <option value={deck.preferred_language || deck.language} className="bg-[#FFFFFF] dark:bg-[#3E3731]">
                Original ({deck.preferred_language || deck.language})
              </option>
              <optgroup label="Other Supported Languages" className="bg-[#FFFFFF] dark:bg-[#3E3731]">
                {SUPPORTED_LANGUAGES.filter(
                  (l) => l.name.toLowerCase() !== (deck.preferred_language || deck.language).toLowerCase()
                ).map((lang) => (
                  <option key={lang.code} value={lang.name} className="bg-[#FFFFFF] dark:bg-[#3E3731]">
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </optgroup>
            </select>
            {isTranslating && <Loader2 className="w-3 h-3 animate-spin text-[var(--color-primary)]" />}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setThemeMode(mode === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-xl text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] dark:hover:text-[#FFFFFF] bg-[#FFFFFF] dark:bg-[#3E3731] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#4D443D] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 transition-all shadow-sm"
            title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {mode === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between shrink-0">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 dark:text-rose-400 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* 3. MAIN STUDIO WORKSPACE (Grid: Left Thumbnails, Center Canvas, Right Properties) */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden bg-[#F4ECE3] dark:bg-[#332D28]">
        {/* LEFT COLUMN: Slide Thumbnails */}
        <div className="col-span-3 lg:col-span-2 border-r border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-[#FFFFFF]/90 dark:bg-[#3E3731]/95 flex flex-col h-full overflow-hidden">
          <div className="p-3 border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold uppercase text-[#77574A] dark:text-[#FFFFFF] tracking-wider">
              Slides ({deck.slides.length})
            </span>
            <button
              onClick={handleAddSlide}
              className="p-1 rounded-lg text-white dark:bg-[#8C7D70] dark:hover:bg-[#A39487] transition-all shadow-sm cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary)' }}
              title="Add New Slide"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {deck.slides.map((slide, idx) => {
              const slideTrans = isViewingTranslated
                ? (translationsCache[slide.id]?.[viewingLanguage] ||
                  translationsCache[slide.id]?.[targetLangCode] ||
                  slide.translations?.[targetLangCode] ||
                  slide.translations?.[viewingLanguage])
                : null;
              const thumbTitle = (isViewingTranslated && slideTrans?.title) ? slideTrans.title : (slide.title || 'Untitled Slide');
              return (
                <div
                  key={slide.id}
                  onClick={() => handleSelectSlide(idx)}
                  className={`group relative p-2.5 rounded-2xl border transition-all cursor-pointer ${idx === activeSlideIndex
                      ? 'border-[var(--color-primary)] bg-[#EBD7BE]/60 dark:bg-[#4D443D] shadow-md'
                      : 'border-[#D0AE92]/30 dark:border-[#8C7D70]/40 hover:border-[var(--color-primary)]/50 bg-[#FDFBF7] dark:bg-[#332D28]'
                    }`}
                >
                  <div className="flex items-center justify-between text-xs text-[#77574A] dark:text-[#FFFFFF] mb-1">
                    <span className="font-bold text-[#4A3A34] dark:text-[#FFFFFF]">#{slide.slide_number}</span>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSlide(idx, 'up');
                        }}
                        disabled={idx === 0}
                        className="p-0.5 hover:text-[#4A3A34] dark:hover:text-white disabled:opacity-30"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSlide(idx, 'down');
                        }}
                        disabled={idx === deck.slides.length - 1}
                        className="p-0.5 hover:text-[#4A3A34] dark:hover:text-white disabled:opacity-30"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSlide(slide.id, idx);
                        }}
                        className="p-0.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300"
                        title="Delete Slide"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p
                    dir={isCurrentRtl ? 'rtl' : 'ltr'}
                    className={`text-xs font-bold text-[#4A3A34] dark:text-[#FFFFFF] truncate ${isCurrentRtl ? 'font-urdu text-right' : ''}`}
                  >
                    {thumbTitle}
                  </p>
                  <span className="text-[10px] text-[#77574A] dark:text-[#FFFFFF] capitalize">
                    {slide.layout_type.replace(/_/g, ' ')} layout
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER COLUMN: Slide Canvas Area */}
        <div className="col-span-6 lg:col-span-7 flex flex-col h-full overflow-hidden bg-[#F4ECE3] dark:bg-[#332D28]">
          {/* Canvas Sub-Header */}
          <div className="px-5 py-2 border-b border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-[#FFFFFF]/80 dark:bg-[#3E3731]/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#4A3A34] dark:text-[#FFFFFF]">
                Slide #{activeSlide.slide_number} &bull; <span className="capitalize text-[#77574A] dark:text-[#FFFFFF]">{displayLayoutType.replace(/_/g, ' ')}</span>
              </span>
              {isViewingTranslated && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#77574A]/10 dark:bg-[#8C7D70]/20 text-[#4A3A34] dark:text-[#FFFFFF] border border-[#77574A]/25 dark:border-[#8C7D70]/40 flex items-center gap-1 font-semibold">
                  <Globe className="w-3 h-3" />
                  Translated ({viewingLanguage})
                </span>
              )}
            </div>

            {isViewingTranslated && (
              <button
                type="button"
                onClick={() => setViewingLanguage(primaryLanguage)}
                className="px-2.5 py-0.5 rounded-lg text-xs font-bold text-[#4A3A34] dark:text-[#FFFFFF] bg-[#EBD7BE]/50 dark:bg-[#4D443D] hover:bg-[#EBD7BE]/80 dark:hover:bg-[#5A4F47] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 flex items-center gap-1 transition-all"
                title="Reset to Original Language"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to {primaryLanguage}</span>
              </button>
            )}
          </div>

          {/* Canvas Stage */}
          <div 
            ref={stageRef}
            className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto flex items-center justify-center relative select-none"
          >
            {/* Zoom-Immune Anchor: occupies scaled footprint in the layout */}
            <div
              className="presentation-block-anchor flex items-center justify-center shrink-0"
              style={anchorStyle}
            >
              {/* 16:9 Slide Canvas (Main Presentation Block): invariant to browser zoom */}
              <div
                dir={isCurrentRtl ? 'rtl' : 'ltr'}
                className={`bg-[#FFFFFF] dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-3xl p-6 sm:p-7 md:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-colors select-text ${isCurrentRtl ? 'font-urdu' : ''
                  }`}
                style={{
                  ...blockStyle,
                  backgroundColor: currentTheme?.palette.background || undefined,
                  color: currentTheme?.palette.text || undefined,
                  fontFamily: currentTheme?.fonts?.bodyFont || currentTheme?.font_pairing?.body || undefined,
                }}
              >
                {/* Gradient Accent Bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{
                    background: currentTheme
                      ? `linear-gradient(to right, ${currentTheme.palette.primary}, ${currentTheme.palette.secondary}, ${currentTheme.palette.accent})`
                      : 'linear-gradient(to right, var(--color-primary), #A8836C, #D0AE92)'
                  }}
                />

                {/* Slide Content: Visual Preview OR Editor */}
                {canvasMode === 'preview' ? (
                  <VisualSlideRenderer
                    slide={{
                      ...activeSlide,
                      title: displayTitle,
                      layout_type: displayLayoutType,
                      speaker_notes: displaySpeakerNotes,
                      image: activeSlide.image || activeSlide.content?.image,
                      content: {
                        ...(activeSlide.content || {}),
                        ...slideContent,
                        ...(translatedData?.content || {}),
                        subtitle: displaySubtitle,
                        bullet_points: (Array.isArray(bulletPoints) ? bulletPoints : []).filter((bp: string) => bp && bp.trim() !== ''),
                        visual_type: displayLayoutType as any,
                        image: activeSlide.image || activeSlide.content?.image,
                      },
                    }}
                    presentationTitle={deck.title}
                    language={viewingLanguage || primaryLanguage}
                    isUrdu={isCurrentRtl}
                    theme={currentTheme}
                    onReplaceImage={() => setIsImageModalOpen(true)}
                    onRemoveImage={handleRemoveImageFromCurrentSlide}
                  />
                ) : (
                  <div className="flex-1 flex flex-col justify-start overflow-hidden">
                    <input
                      type="text"
                      value={displayTitle}
                      readOnly={isViewingTranslated}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter slide title..."
                      className={`w-full text-xl sm:text-2xl font-extrabold bg-transparent text-[#2D2320] dark:text-[#FFFFFF] border-b border-transparent hover:border-[#D0AE92]/50 focus:border-[var(--color-primary)] focus:outline-none pb-1 transition-all shrink-0 ${isCurrentRtl ? 'text-right' : ''
                        }`}
                    />

                    <input
                      type="text"
                      value={displaySubtitle}
                      readOnly={isViewingTranslated}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="Subtitle or section description..."
                      className={`w-full text-xs font-semibold text-[var(--color-primary)] bg-transparent mt-1 border-b border-transparent hover:border-[#D0AE92]/50 focus:outline-none shrink-0 ${isCurrentRtl ? 'text-right' : ''
                        }`}
                    />

                    {/* On-Canvas Image Banner in Editor Mode */}
                    {getActiveSlideImage() ? (
                      <div className="flex items-center justify-between p-2 mt-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shrink-0">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <img
                            src={getActiveSlideImage()?.thumb_url || getActiveSlideImage()?.small_url || getActiveSlideImage()?.url}
                            alt="Slide photograph"
                            className="w-10 h-8 rounded-lg object-cover shrink-0"
                          />
                          <div className="text-[11px] truncate">
                            <span className="font-bold text-[#2D2320] dark:text-[#FFFFFF] block truncate">
                              Photo by {getActiveSlideImage()?.photographer_name}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Embedded in slide canvas
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setIsImageModalOpen(true)}
                            className="px-2 py-1 rounded-lg bg-[var(--color-primary)] text-white text-[10px] font-bold flex items-center gap-1 hover:opacity-90 transition-all shadow-sm"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>Replace</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveImageFromCurrentSlide}
                            className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold flex items-center gap-1 hover:bg-rose-500/20 transition-all border border-rose-500/20"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center justify-between px-3 py-1.5 rounded-xl border border-dashed border-[#D0AE92]/60 dark:border-[#8C7D70]/50 bg-black/2 dark:bg-white/2 shrink-0">
                        <div className="flex items-center gap-1.5 text-xs text-[#77574A] dark:text-[#F5EEE8]">
                          <ImageIcon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                          <span>No photograph on this slide</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsImageModalOpen(true)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--color-primary)] text-white text-[10px] font-bold flex items-center gap-1 hover:opacity-90 transition-all shadow-sm"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Insert Photo</span>
                        </button>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto mt-2">
                      {renderEditorContent()}
                    </div>
                  </div>
                )}

                {/* Slide Footer Info */}
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#77574A] dark:text-[#FFFFFF] border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/40 pt-2.5 shrink-0">
                  <span>{deck.title}</span>
                  <span>Slide {activeSlide.slide_number} of {deck.slides.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLLAPSIBLE SPEAKER NOTES PANEL */}
          {showNotes && (
            <div className="border-t border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-[#FFFFFF]/95 dark:bg-[#332D28]/95 p-3.5 shrink-0 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase text-[#77574A] dark:text-[#FFFFFF] flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  Speaker Notes {isViewingTranslated && `(${viewingLanguage})`}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveSlide}
                    disabled={saving}
                    className="px-2.5 py-0.5 rounded-lg text-xs font-bold text-white bg-[var(--color-primary)] dark:bg-[#8C7D70] dark:hover:bg-[#A39487] hover:opacity-90 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save Slide</span>
                  </button>
                  <button
                    onClick={() => setShowNotes(false)}
                    className="p-1 text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] dark:hover:text-[#FFFFFF] rounded"
                    title="Collapse Notes"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                rows={2}
                dir={isCurrentRtl ? 'rtl' : 'ltr'}
                value={displaySpeakerNotes}
                readOnly={isViewingTranslated}
                onChange={(e) => setSpeakerNotes(e.target.value)}
                placeholder="Enter talking points and speaker notes for this slide..."
                className={`w-full bg-[#F9F2E4]/80 dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl p-2.5 text-xs text-[#2D2320] dark:text-[#FFFFFF] placeholder-[#77574A]/60 dark:placeholder-[#B8ABA0] focus:outline-none focus:border-[var(--color-primary)] ${isCurrentRtl ? 'font-urdu text-right' : ''
                  }`}
              />
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Slide Properties & Metadata */}
        <div className="col-span-3 border-l border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-[#FFFFFF]/90 dark:bg-[#3E3731]/95 p-4 flex flex-col h-full overflow-y-auto space-y-5">
          <div>
            <h3 className="text-xs font-bold uppercase text-[#77574A] dark:text-[#FFFFFF] tracking-wider mb-2.5 flex items-center gap-2">
              <Layout className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              Slide Properties
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#77574A] dark:text-[#FFFFFF] mb-1">
                  Layout & Visual Design
                </label>
                <select
                  value={displayLayoutType}
                  disabled={isViewingTranslated}
                  onChange={(e) => setLayoutType(e.target.value)}
                  className="w-full bg-[#F9F2E4]/80 dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-3 py-2 text-xs text-[#2D2320] dark:text-[#FFFFFF] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                >
                  <option value="standard" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Standard Content Cards</option>
                  <option value="title" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Title Slide</option>
                  <option value="section_header" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Section Divider</option>
                  <option value="conclusion" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Summary & Key Takeaways</option>
                  <option value="process_flow" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Process Flow / Steps</option>
                  <option value="timeline" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Timeline / Milestones</option>
                  <option value="comparison" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Comparison Matrix</option>
                  <option value="stats_grid" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Metrics & Key Statistics</option>
                  <option value="cards_grid" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Pillars & Cards Grid</option>
                  <option value="table" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Structured Data Table</option>
                  <option value="hierarchy" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Hierarchy / Architecture</option>
                  <option value="two_column" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Two Column Layout</option>
                  <option value="quote" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Quote & Takeaway</option>
                  <option value="image_text" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Image & Content</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#77574A] dark:text-[#FFFFFF] mb-1">
                  Source Reference
                </label>
                <input
                  type="text"
                  value={sourceReference}
                  readOnly={isViewingTranslated}
                  onChange={(e) => setSourceReference(e.target.value)}
                  placeholder="e.g. Page 4, Section 2"
                  className="w-full bg-[#F9F2E4]/80 dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-3 py-2 text-xs text-[#2D2320] dark:text-[#FFFFFF] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {/* SLIDE PHOTOGRAPH (UNSPLASH INTEGRATION) */}
              <div className="pt-2 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#77574A] dark:text-[#FFFFFF] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    Slide Photograph
                  </label>
                  {getActiveSlideImage() && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Unsplash
                    </span>
                  )}
                </div>

                {getActiveSlideImage() ? (
                  <div className="space-y-2">
                    {/* Thumbnail Preview */}
                    <div className="relative rounded-xl overflow-hidden border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 bg-[#F9F2E4] dark:bg-[#3E3731]">
                      <img
                        src={getActiveSlideImage()?.small_url || getActiveSlideImage()?.url}
                        alt={getActiveSlideImage()?.alt_text || 'Slide photo'}
                        className="w-full h-28 object-cover"
                      />
                      <div className="p-2 text-[11px] bg-[#FFFFFF]/95 dark:bg-[#2D2320]/95 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/30">
                        <div className="flex items-center justify-between text-[#77574A] dark:text-[#A89A8E]">
                          <span className="truncate mr-1">
                            Photo by{' '}
                            <a
                              href={getActiveSlideImage()?.photographer_profile_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-[#2D2320] dark:text-[#FFFFFF] hover:underline"
                            >
                              {getActiveSlideImage()?.photographer_name}
                            </a>
                          </span>
                          <a
                            href={getActiveSlideImage()?.photo_page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View on Unsplash"
                            className="hover:text-[var(--color-primary)] shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls: Replace and Remove */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsImageModalOpen(true)}
                        className="px-2.5 py-1.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-[var(--color-primary)]/20"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImageFromCurrentSlide}
                        className="px-2.5 py-1.5 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsImageModalOpen(true)}
                      className="w-full py-2.5 px-3 bg-[#F9F2E4] dark:bg-[#3E3731] hover:bg-[#D0AE92]/20 border border-dashed border-[#D0AE92] dark:border-[#8C7D70] rounded-xl text-xs font-semibold text-[#77574A] dark:text-[#FFFFFF] flex items-center justify-center gap-2 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4 text-[var(--color-primary)]" />
                      Add Unsplash Photo
                    </button>
                    <p className="text-[10px] text-[#77574A]/70 dark:text-[#A89A8E]/70 mt-1 text-center">
                      Auto-embedded into PPTX downloads
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/40 pt-3.5">
            <h3 className="text-xs font-bold uppercase text-[#77574A] dark:text-[#FFFFFF] tracking-wider mb-2.5 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              Deck Metadata
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40 text-[#77574A] dark:text-[#FFFFFF]">
                <span>Source Type</span>
                <span className="font-bold text-[#4A3A34] dark:text-[#FFFFFF] capitalize">{deck.source_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40 text-[#77574A] dark:text-[#FFFFFF]">
                <span>Total Slides</span>
                <span className="font-bold text-[#4A3A34] dark:text-[#FFFFFF]">{deck.slides.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40 text-[#77574A] dark:text-[#FFFFFF]">
                <span>Primary Language</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{deck.preferred_language || deck.language}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40 text-[#77574A] dark:text-[#FFFFFF]">
                <span>Viewing In</span>
                <span className="font-bold text-[var(--color-primary)]">{viewingLanguage || (deck.preferred_language || deck.language)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40 text-[#77574A] dark:text-[#FFFFFF]">
                <span>Tone</span>
                <span className="font-bold text-[#4A3A34] dark:text-[#FFFFFF]">{deck.tone}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. AI REFINE MODAL */}
      {showRefineModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="text-base font-bold text-[#4A3A34] dark:text-[#FFFFFF]">AI Slide Refinements</h3>
              </div>
              <button
                onClick={() => setShowRefineModal(false)}
                className="p-1 text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] dark:hover:text-[#FFFFFF] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#6B4E3D] dark:text-[#FFFFFF]">
              Select an AI refinement action to polish, lengthen, or restructure the active slide in {deck?.language || 'the presentation language'}.
            </p>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                onClick={() => handleAIRefine('improve')}
                disabled={refining}
                className="w-full text-left p-3 rounded-2xl bg-[#F9F2E4]/80 dark:bg-[#2A2521] hover:bg-[#EBD7BE] dark:hover:bg-[#4D443D] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] transition-all flex items-center gap-3"
              >
                <Wand2 className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                <div>
                  <span className="block font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Improve & Polish</span>
                  <span className="text-[10px] text-[#77574A] dark:text-[#FFFFFF] font-normal">Enhance wording, clarity, and slide flow</span>
                </div>
              </button>

              <button
                onClick={() => handleAIRefine('shorten')}
                disabled={refining}
                className="w-full text-left p-3 rounded-2xl bg-[#F9F2E4]/80 dark:bg-[#2A2521] hover:bg-[#EBD7BE] dark:hover:bg-[#4D443D] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] transition-all flex items-center gap-3"
              >
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="block font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Shorten Bullet Points</span>
                  <span className="text-[10px] text-[#77574A] dark:text-[#FFFFFF] font-normal">Make text punchy and concise</span>
                </div>
              </button>

              <button
                onClick={() => handleAIRefine('expand')}
                disabled={refining}
                className="w-full text-left p-3 rounded-2xl bg-[#F9F2E4]/80 dark:bg-[#2A2521] hover:bg-[#EBD7BE] dark:hover:bg-[#4D443D] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] transition-all flex items-center gap-3"
              >
                <Plus className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <div>
                  <span className="block font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Expand & Elaborate</span>
                  <span className="text-[10px] text-[#77574A] dark:text-[#FFFFFF] font-normal">Add depth and explanatory detail</span>
                </div>
              </button>

              <button
                onClick={() => handleAIRefine('make_more_professional')}
                disabled={refining}
                className="w-full text-left p-3 rounded-2xl bg-[#F9F2E4]/80 dark:bg-[#2A2521] hover:bg-[#EBD7BE] dark:hover:bg-[#4D443D] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] transition-all flex items-center gap-3"
              >
                <CheckCircle2 className="w-4 h-4 text-pink-600 dark:text-pink-400 shrink-0" />
                <div>
                  <span className="block font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Make More Professional</span>
                  <span className="text-[10px] text-[#77574A] dark:text-[#FFFFFF] font-normal">Apply executive tone</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. TEACH ME MODAL IN STUDIO */}
      {showTeachMe && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#FFFFFF] dark:bg-[#3E3731] border border-indigo-500/30 rounded-3xl p-6 md:p-8 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col justify-between animate-in fade-in zoom-in-95 duration-150">
            <div>
              <div className="flex items-center justify-between border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40 pb-4 mb-4">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-base">
                  <Sparkles className="w-5 h-5" />
                  <span>Teach Me: {activeSlide.title}</span>
                </div>
                <button
                  onClick={() => {
                    setShowTeachMe(false);
                    handleStopSpeech();
                  }}
                  className="p-1 text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] dark:hover:text-[#FFFFFF] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {teachLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-sm font-medium text-[#4A3A34] dark:text-[#FFFFFF]">
                    Generating interactive educational breakdown in {viewingLanguage || deck.language}...
                  </p>
                </div>
              ) : teachError ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-2xl text-xs">
                  {teachError}
                </div>
              ) : teachData ? (
                <div dir={isCurrentRtl ? 'rtl' : 'ltr'} className={`space-y-5 ${isCurrentRtl ? 'font-urdu text-right' : ''}`}>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold mb-1">
                      Concept Explanation
                    </h4>
                    <p className="text-xs sm:text-sm text-[#4A3A34] dark:text-[#FFFFFF] leading-relaxed">
                      {teachData.explanation}
                    </p>
                  </div>

                  {teachData.key_terms && teachData.key_terms.length > 0 && (
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold mb-2">
                        Key Terms & Jargon
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {teachData.key_terms.map((kt, i) => (
                          <div key={i} className="p-3 bg-[#F9F2E4]/80 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 rounded-xl text-xs">
                            <span className="font-bold text-indigo-700 dark:text-indigo-300 block">{kt.term}</span>
                            <span className="text-[#6B4E3D] dark:text-[#FFFFFF] mt-0.5 block">{kt.definition}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {teachData.simple_example && (
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl text-xs">
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-1">Real-World Analogy</span>
                      <p className="text-indigo-950 dark:text-indigo-100">{teachData.simple_example}</p>
                    </div>
                  )}

                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs flex items-start gap-2.5">
                    <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 block">Takeaway Summary</span>
                      <span className="text-emerald-950 dark:text-emerald-100">{teachData.summary}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {teachData && !teachLoading && (
              <div className="pt-4 mt-4 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/40 flex items-center justify-between">
                <span className="text-xs text-[#77574A] dark:text-[#FFFFFF]">
                  Interactive speech in {viewingLanguage || deck.language}
                </span>
                <button
                  onClick={() => {
                    const text = `${teachData.slide_title}. ${teachData.explanation} ${teachData.simple_example ? 'Example: ' + teachData.simple_example : ''} Summary: ${teachData.summary}`;
                    const lang = viewingLanguage || deck.preferred_language || deck.language || 'English';
                    speechService.speak(text, lang);
                  }}
                  className="py-1.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Listen Aloud</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. SHARE MODAL */}
      {showShareModal && deck && (
        <ShareModal
          presentationId={deck.id}
          initialVisibility={deck.visibility || 'private'}
          isTemplate={deck.is_template || false}
          onClose={() => setShowShareModal(false)}
          onVisibilityChange={(newVis) => {
            setDeck({ ...deck, visibility: newVis });
          }}
        />
      )}

      {/* 7. DESIGN / THEMES STUDIO MODAL */}
      {showDesignStudio && (
        <DesignStudioModal
          isOpen={showDesignStudio}
          onClose={() => setShowDesignStudio(false)}
          currentTheme={currentTheme}
          onSelectTheme={handleThemeChange}
          currentLayout={activeSlide?.layout_type || 'standard'}
          onSelectLayout={handleDesignLayoutChange}
        />
      )}

      {/* 8. UNSPLASH IMAGE SEARCH & ATTACHMENT MODAL */}
      <UnsplashImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSelectImage={handleSelectSlideImage}
        onRemoveImage={handleRemoveImageFromCurrentSlide}
        initialQuery={activeSlide?.title || deck?.title || ''}
        currentImage={getActiveSlideImage() || null}
        slideTitle={activeSlide?.title || ''}
      />
    </div>
  );
}
