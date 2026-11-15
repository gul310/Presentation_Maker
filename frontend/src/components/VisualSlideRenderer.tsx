import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Clock,
  Layers,
  BarChart3,
  Grid,
  Table as TableIcon,
  Network,
  Zap,
  Target,
  Sparkles,
  Award,
  Activity,
  Shield,
  Lightbulb,
  Bookmark,
  GitBranch,
  Quote,
  Image as ImageIcon,
  Check,
  Columns,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { Slide } from '../types/presentation';
import { isRtlLanguage } from '../constants/languages';
import { type PresentationTheme, DEFAULT_THEME, loadGoogleFont } from '../constants/themes';

interface VisualSlideRendererProps {
  slide: Slide;
  presentationTitle?: string;
  language?: string;
  isUrdu?: boolean;
  theme?: PresentationTheme;
  onReplaceImage?: () => void;
  onRemoveImage?: () => void;
}

export const SlideImageCard: React.FC<{
  imageUrl?: string;
  slideImage?: any;
  title?: string;
  onReplace?: () => void;
  onRemove?: () => void;
  cardStyle?: React.CSSProperties;
  heightClass?: string;
  className?: string;
}> = ({
  imageUrl,
  slideImage,
  title,
  onReplace,
  onRemove,
  cardStyle,
  heightClass = 'h-full min-h-[160px] max-h-[320px]',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  if (!imageUrl || imageError) {
    return (
      <div
        className={`w-full ${heightClass} border relative flex flex-col items-center justify-center p-4 rounded-2xl shadow-sm text-center ${className}`}
        style={cardStyle}
      >
        <ImageIcon className="w-8 h-8 opacity-40 mb-2" />
        <span className="text-xs font-semibold">{title || 'Slide Photograph'}</span>
        {onReplace && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReplace();
            }}
            className="mt-2 px-3 py-1 bg-black/70 hover:bg-black/90 text-white rounded-lg text-[10px] font-bold transition-all"
          >
            Change Photo
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`w-full ${heightClass} border relative flex items-center justify-center overflow-hidden shadow-md group rounded-2xl ${className}`}
      style={cardStyle}
    >
      <img
        src={imageUrl}
        alt={title || 'Slide photograph'}
        onError={() => setImageError(true)}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* On-canvas direct actions */}
      {(onReplace || onRemove) && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
          {onReplace && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReplace();
              }}
              className="px-2.5 py-1 bg-black/75 hover:bg-black/90 text-white rounded-lg text-[10px] font-bold shadow-md flex items-center gap-1 backdrop-blur-sm transition-all hover:scale-105"
              title="Replace photo from Unsplash"
            >
              <RefreshCw className="w-3 h-3 text-emerald-400" />
              <span>Replace</span>
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="px-2.5 py-1 bg-rose-900/80 hover:bg-rose-900 text-white rounded-lg text-[10px] font-bold shadow-md flex items-center gap-1 backdrop-blur-sm transition-all hover:scale-105"
              title="Remove photo from slide"
            >
              <Trash2 className="w-3 h-3 text-rose-300" />
              <span>Remove</span>
            </button>
          )}
        </div>
      )}

      {/* Unsplash Attribution */}
      {slideImage && (
        <div className="absolute bottom-1.5 right-1.5 max-w-[90%] bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white/90 flex items-center gap-1 z-10 shadow-sm truncate">
          <span>Photo by</span>
          <a
            href={slideImage.photographer_profile_url || 'https://unsplash.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white font-medium truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {slideImage.photographer_name || 'Unsplash Photographer'}
          </a>
          <span>on</span>
          <a
            href={slideImage.photo_page_url || 'https://unsplash.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white font-medium shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            Unsplash
          </a>
        </div>
      )}
    </div>
  );
};

const getIconByName = (name?: string, accentColor?: string) => {
  const color = accentColor || 'var(--color-primary)';
  switch (name?.toLowerCase()) {
    case 'target': return <Target className="w-4 h-4" style={{ color }} />;
    case 'zap': return <Zap className="w-4 h-4 text-amber-500" />;
    case 'award': return <Award className="w-4 h-4 text-emerald-500" />;
    case 'trending': return <TrendingUp className="w-4 h-4 text-indigo-500" />;
    case 'activity': return <Activity className="w-4 h-4 text-cyan-500" />;
    case 'shield': return <Shield className="w-4 h-4 text-pink-500" />;
    case 'lightbulb': return <Lightbulb className="w-4 h-4 text-yellow-500" />;
    default: return <Sparkles className="w-4 h-4" style={{ color }} />;
  }
};

export const VisualSlideRenderer: React.FC<VisualSlideRendererProps> = ({
  slide,
  presentationTitle,
  language,
  isUrdu = false,
  theme,
  onReplaceImage,
  onRemoveImage,
}) => {
  const rtl = isRtlLanguage(language) || isUrdu;
  const content = slide.content || {};
  const rawImage = slide.image || content.image;
  const rawUrl = rawImage?.regular_url || rawImage?.url || content.image_url || (slide as any).image_url;
  const imageUrl = typeof rawUrl === 'string' && rawUrl.trim().startsWith('http') ? rawUrl.trim() : undefined;
  const slideImage = imageUrl ? rawImage : undefined;
  const visualType = content.visual_type || slide.layout_type || 'standard';
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  // Active theme tokens
  const activeTheme = theme || DEFAULT_THEME;
  const { palette, font_pairing, border_radius } = activeTheme;

  // Dynamically load Google Font pairing
  useEffect(() => {
    loadGoogleFont(font_pairing);
  }, [font_pairing]);

  // Helper to safely extract leading title/label and body from bullet points
  const parseBullet = (bp: string) => {
    const match = bp.match(/^([^:–—]+)[:–—](.+)$/);
    if (match) {
      return { lead: match[1].trim(), body: match[2].trim() };
    }
    return { lead: '', body: bp.trim() };
  };

  const cardStyle = {
    backgroundColor: palette.surface,
    borderColor: palette.surface_border,
    borderRadius: border_radius,
  };

  // Helper to safely format badge/title text and remove file extensions or underscore clutter
  const formatBadgeTitle = (raw?: string) => {
    if (!raw) return '';
    return raw.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
  };

  const getTitleFontSize = (text: string, hasImage: boolean) => {
    const len = text ? text.length : 0;
    if (hasImage) {
      if (len > 50) return 'text-xl sm:text-2xl md:text-2xl lg:text-3xl';
      if (len > 30) return 'text-2xl sm:text-2xl md:text-3xl lg:text-3xl';
      return 'text-2xl sm:text-3xl md:text-3xl lg:text-4xl';
    }
    if (len > 50) return 'text-2xl sm:text-3xl md:text-3xl lg:text-4xl';
    if (len > 30) return 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl';
    return 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl';
  };

  const renderLayout = () => {
    // 1. TITLE / HERO OPENING SLIDE
    if (visualType === 'title') {
      const cleanPresTitle = formatBadgeTitle(presentationTitle);
      const cleanSlideTitle = formatBadgeTitle(slide.title);
      const isRedundantBadge = !cleanPresTitle ||
        cleanPresTitle.toLowerCase() === cleanSlideTitle.toLowerCase() ||
        cleanSlideTitle.toLowerCase().startsWith(cleanPresTitle.toLowerCase());

      if (imageUrl && !imageError) {
        return (
          <div className="flex-1 flex flex-col justify-center h-full animate-fadeIn overflow-hidden p-3 sm:p-5 my-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6 items-center my-auto w-full">
              <div className="md:col-span-7 min-w-0 space-y-3.5 pr-2">
                {!isRedundantBadge && (
                  <span
                    className="text-[11px] uppercase tracking-widest font-bold px-3.5 py-1 rounded-full shadow-sm inline-block max-w-full truncate"
                    style={{
                      backgroundColor: `${palette.primary}18`,
                      borderColor: `${palette.primary}40`,
                      borderWidth: '1px',
                      color: palette.primary,
                    }}
                  >
                    {cleanPresTitle}
                  </span>
                )}
                <h1
                  className={`${getTitleFontSize(slide.title, true)} font-extrabold leading-tight tracking-tight break-words [overflow-wrap:anywhere]`}
                  style={{ fontFamily: font_pairing.heading, color: palette.text }}
                >
                  {slide.title}
                </h1>
                {content.subtitle && (
                  <p
                    className="text-xs sm:text-sm font-medium leading-relaxed break-words [overflow-wrap:anywhere] line-clamp-3"
                    style={{ fontFamily: font_pairing.body, color: palette.text_muted }}
                  >
                    {content.subtitle}
                  </p>
                )}
                <div className="pt-2 flex items-center gap-3">
                  <span className="h-0.5 w-10 rounded-full shrink-0" style={{ backgroundColor: `${palette.primary}60` }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider truncate" style={{ color: palette.text_muted }}>
                    {slide.source_reference || 'Executive Presentation'}
                  </span>
                </div>
              </div>

              {/* Hero Image Card */}
              <div className="md:col-span-5 min-w-0 w-full flex items-center justify-center">
                <SlideImageCard
                  imageUrl={imageUrl}
                  slideImage={slideImage}
                  title={slide.title}
                  onReplace={onReplaceImage}
                  onRemove={onRemoveImage}
                  cardStyle={cardStyle}
                  heightClass="h-48 sm:h-56 md:h-64 lg:h-72 w-full max-h-[280px]"
                />
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="flex-1 flex flex-col justify-center items-center text-center px-6 py-4 space-y-4 animate-fadeIn my-auto relative max-w-4xl mx-auto w-full">
          {/* Subtle Background Radial Glow */}
          <div
            className="absolute inset-0 pointer-events-none rounded-3xl opacity-30"
            style={{
              background: `radial-gradient(circle at center, ${palette.primary}25 0%, transparent 70%)`
            }}
          />

          {!isRedundantBadge && (
            <span
              className="text-[11px] uppercase tracking-widest font-bold px-3.5 py-1 rounded-full shadow-sm max-w-md truncate"
              style={{
                backgroundColor: `${palette.primary}18`,
                borderColor: `${palette.primary}40`,
                borderWidth: '1px',
                color: palette.primary,
              }}
            >
              {cleanPresTitle}
            </span>
          )}

          <h1
            className={`${getTitleFontSize(slide.title, false)} font-extrabold leading-tight tracking-tight break-words [overflow-wrap:anywhere] max-w-3xl`}
            style={{
              fontFamily: font_pairing.heading,
              color: palette.text,
            }}
          >
            {slide.title}
          </h1>

          {content.subtitle && (
            <p
              className="text-xs sm:text-sm md:text-base font-medium max-w-2xl leading-relaxed break-words [overflow-wrap:anywhere]"
              style={{
                fontFamily: font_pairing.body,
                color: palette.text_muted,
              }}
            >
              {content.subtitle}
            </p>
          )}

          <div className="pt-2 flex items-center justify-center gap-3">
            <span className="h-0.5 w-12 rounded-full" style={{ backgroundColor: `${palette.primary}60` }} />
            <span
              className="text-[10px] font-semibold uppercase tracking-wider truncate max-w-xs"
              style={{ color: palette.text_muted }}
            >
              {slide.source_reference || 'Executive Presentation'}
            </span>
            <span className="h-0.5 w-12 rounded-full" style={{ backgroundColor: `${palette.primary}60` }} />
          </div>
        </div>
      );
    }

    // 2. SECTION HEADER / CHAPTER BREAK
    if (visualType === 'section_header') {
      if (imageUrl && !imageError) {
        return (
          <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6 items-center my-auto w-full">
              <div className="md:col-span-7 min-w-0 space-y-3 pr-2">
                <span
                  className="text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full shadow-sm inline-flex items-center gap-1.5"
                  style={{
                    backgroundColor: `${palette.primary}18`,
                    borderColor: `${palette.primary}40`,
                    borderWidth: '1px',
                    color: palette.primary,
                  }}
                >
                  <Bookmark className="w-3.5 h-3.5 shrink-0" /> Section Overview
                </span>
                <h2
                  className="text-2xl sm:text-3xl font-extrabold leading-tight break-words [overflow-wrap:anywhere]"
                  style={{ fontFamily: font_pairing.heading, color: palette.text }}
                >
                  {slide.title}
                </h2>
                {content.subtitle && (
                  <p className="text-xs sm:text-sm leading-relaxed break-words [overflow-wrap:anywhere] line-clamp-3" style={{ fontFamily: font_pairing.body, color: palette.text_muted }}>
                    {content.subtitle}
                  </p>
                )}
              </div>
              <div className="md:col-span-5 min-w-0 w-full flex items-center justify-center">
                <SlideImageCard
                  imageUrl={imageUrl}
                  slideImage={slideImage}
                  title={slide.title}
                  onReplace={onReplaceImage}
                  onRemove={onRemoveImage}
                  cardStyle={cardStyle}
                  heightClass="h-48 sm:h-56 md:h-64 w-full max-h-[260px]"
                />
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="flex-1 flex flex-col justify-center items-center text-center px-6 py-4 space-y-3.5 animate-fadeIn my-auto">
          <span
            className="text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5"
            style={{
              backgroundColor: `${palette.primary}18`,
              borderColor: `${palette.primary}40`,
              borderWidth: '1px',
              color: palette.primary,
            }}
          >
            <Bookmark className="w-3.5 h-3.5" /> Section Overview
          </span>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold max-w-2xl leading-tight"
            style={{
              fontFamily: font_pairing.heading,
              color: palette.text,
            }}
          >
            {slide.title}
          </h2>
          {content.subtitle && (
            <p
              className="text-xs sm:text-sm max-w-lg leading-relaxed"
              style={{
                fontFamily: font_pairing.body,
                color: palette.text_muted,
              }}
            >
              {content.subtitle}
            </p>
          )}
        </div>
      );
    }

    // 3. CONCLUSION / SUMMARY & KEY TAKEAWAYS
    if (visualType === 'conclusion') {
      const bullets = (content.bullet_points || []).filter(bp => bp && bp.trim() !== '');

      if (imageUrl && !imageError) {
        return (
          <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
            <div className="mb-2 shrink-0">
              <span
                className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1"
                style={{
                  backgroundColor: `${palette.secondary || palette.primary}18`,
                  borderColor: `${palette.secondary || palette.primary}40`,
                  borderWidth: '1px',
                  color: palette.secondary || palette.primary,
                }}
              >
                <CheckCircle2 className="w-3 h-3" /> Key Summary & Takeaways
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1" style={{ fontFamily: font_pairing.heading, color: palette.text }}>
                {slide.title}
              </h2>
              {content.subtitle && <p className="text-xs line-clamp-1 mt-0.5" style={{ color: palette.text_muted }}>{content.subtitle}</p>}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center my-auto overflow-hidden">
              <div className="space-y-2 overflow-hidden my-auto">
                {bullets.slice(0, 3).map((bp, idx) => {
                  const { lead, body } = parseBullet(bp);
                  return (
                    <div key={idx} className="p-2.5 border flex items-start gap-2 shadow-sm overflow-hidden" style={cardStyle}>
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${palette.primary}20`, color: palette.primary }}>
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <div className="overflow-hidden">
                        {lead && <h4 className="text-xs font-bold line-clamp-1 mb-0.5" style={{ fontFamily: font_pairing.heading, color: palette.text }}>{lead}</h4>}
                        <p className="text-xs font-medium leading-snug line-clamp-2" style={{ fontFamily: font_pairing.body, color: palette.text_muted }}>{body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <SlideImageCard
                imageUrl={imageUrl}
                slideImage={slideImage}
                title={slide.title}
                onReplace={onReplaceImage}
                onRemove={onRemoveImage}
                cardStyle={cardStyle}
                heightClass="h-44 sm:h-52 md:h-60"
              />
            </div>
          </div>
        );
      }
      return (
        <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
          <div className="mb-2 shrink-0">
            <span
              className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1"
              style={{
                backgroundColor: `${palette.secondary || palette.primary}18`,
                borderColor: `${palette.secondary || palette.primary}40`,
                borderWidth: '1px',
                color: palette.secondary || palette.primary,
              }}
            >
              <CheckCircle2 className="w-3 h-3" /> Key Summary & Takeaways
            </span>
            <h2
              className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1"
              style={{ fontFamily: font_pairing.heading, color: palette.text }}
            >
              {slide.title}
            </h2>
            {content.subtitle && (
              <p className="text-xs line-clamp-1 mt-0.5" style={{ color: palette.text_muted }}>
                {content.subtitle}
              </p>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-auto max-h-[78%] overflow-hidden">
            {bullets.slice(0, 4).map((bp, idx) => {
              const { lead, body } = parseBullet(bp);
              return (
                <div
                  key={idx}
                  className="p-3 border flex items-start gap-2.5 shadow-sm overflow-hidden"
                  style={cardStyle}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: `${palette.primary}20`,
                      color: palette.primary,
                    }}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div className="overflow-hidden">
                    {lead && (
                      <h4
                        className="text-xs font-bold line-clamp-1 mb-0.5"
                        style={{ fontFamily: font_pairing.heading, color: palette.text }}
                      >
                        {lead}
                      </h4>
                    )}
                    <p
                      className="text-xs font-medium leading-snug line-clamp-3"
                      style={{ fontFamily: font_pairing.body, color: palette.text_muted }}
                    >
                      {body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 4. PROCESS FLOW / METHODOLOGY / STEPS
    if (visualType === 'process_flow' || visualType === 'flowchart') {
      const steps = content.steps && content.steps.length > 0
        ? content.steps
        : (content.bullet_points || []).map((bp, i) => {
            const parts = bp.split(/[:–—]/);
            return {
              step: i + 1,
              label: parts.length > 1 ? parts[0].trim() : `Step ${i + 1}`,
              description: parts.length > 1 ? parts.slice(1).join(':').trim() : bp,
            };
          });

      const displaySteps = steps.slice(0, 4);
      const colCount = Math.max(1, Math.min(4, displaySteps.length));

      if (imageUrl && !imageError) {
        return (
          <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
            <div className="mb-2 shrink-0">
              <span
                className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1"
                style={{
                  backgroundColor: `${palette.primary}18`,
                  borderColor: `${palette.primary}40`,
                  borderWidth: '1px',
                  color: palette.primary,
                }}
              >
                <Layers className="w-3 h-3" /> Process Flow & Roadmap
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1" style={{ fontFamily: font_pairing.heading, color: palette.text }}>
                {slide.title}
              </h2>
              {content.subtitle && <p className="text-xs line-clamp-1 mt-0.5" style={{ color: palette.text_muted }}>{content.subtitle}</p>}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center my-auto overflow-hidden">
              <div className="space-y-2 overflow-hidden my-auto">
                {displaySteps.slice(0, 3).map((step, idx) => (
                  <div key={idx} className="p-2.5 border flex items-center gap-3 shadow-sm overflow-hidden" style={cardStyle}>
                    <span
                      className="w-6 h-6 rounded-lg font-bold text-[11px] flex items-center justify-center shadow-sm shrink-0"
                      style={{ backgroundColor: palette.primary, color: '#FFFFFF' }}
                    >
                      {step.step || idx + 1}
                    </span>
                    <div className="overflow-hidden">
                      <h3 className="text-xs font-bold line-clamp-1" style={{ fontFamily: font_pairing.heading, color: palette.text }}>
                        {step.label}
                      </h3>
                      <p className="text-[11px] leading-tight line-clamp-2" style={{ fontFamily: font_pairing.body, color: palette.text_muted }}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <SlideImageCard
                imageUrl={imageUrl}
                slideImage={slideImage}
                title={slide.title}
                onReplace={onReplaceImage}
                onRemove={onRemoveImage}
                cardStyle={cardStyle}
                heightClass="h-44 sm:h-52 md:h-60"
              />
            </div>
          </div>
        );
      }

      return (
        <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
          <div className="mb-2 shrink-0">
            <span
              className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1"
              style={{
                backgroundColor: `${palette.primary}18`,
                borderColor: `${palette.primary}40`,
                borderWidth: '1px',
                color: palette.primary,
              }}
            >
              <Layers className="w-3 h-3" /> Process Flow & Roadmap
            </span>
            <h2
              className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1"
              style={{ fontFamily: font_pairing.heading, color: palette.text }}
            >
              {slide.title}
            </h2>
            {content.subtitle && (
              <p className="text-xs line-clamp-1 mt-0.5" style={{ color: palette.text_muted }}>
                {content.subtitle}
              </p>
            )}
          </div>

          <div
            className="flex-1 my-auto w-full items-stretch"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
              gap: '0.625rem',
            }}
          >
            {displaySteps.map((step, idx) => (
              <div
                key={idx}
                className="p-3.5 border flex flex-col justify-between shadow-sm overflow-hidden h-full transition-colors"
                style={cardStyle}
              >
                <div className="overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="w-6 h-6 rounded-lg font-bold text-[11px] flex items-center justify-center shadow-sm shrink-0"
                      style={{ backgroundColor: palette.primary, color: '#FFFFFF' }}
                    >
                      {step.step || idx + 1}
                    </span>
                    {idx < displaySteps.length - 1 && (
                      <ArrowRight
                        className={`w-3.5 h-3.5 opacity-60 shrink-0 ${rtl ? 'rotate-180' : ''}`}
                        style={{ color: palette.text_muted }}
                      />
                    )}
                  </div>
                  <h3
                    className="text-xs font-bold mb-1 line-clamp-1"
                    style={{ fontFamily: font_pairing.heading, color: palette.text }}
                  >
                    {step.label}
                  </h3>
                  <p
                    className="text-[11px] leading-relaxed line-clamp-3"
                    style={{ fontFamily: font_pairing.body, color: palette.text_muted }}
                  >
                    {step.description}
                  </p>
                </div>
                <div
                  className="mt-2.5 h-1 w-full rounded-full overflow-hidden shrink-0"
                  style={{ backgroundColor: `${palette.surface_border}` }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, ((idx + 1) / displaySteps.length) * 100)}%`,
                      backgroundColor: palette.primary,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 5. TIMELINE / MILESTONES
    if (visualType === 'timeline') {
      const timelineItems = content.timeline_items && content.timeline_items.length > 0
        ? content.timeline_items
        : (content.bullet_points || []).map((bp, i) => {
            const parts = bp.split(/[:–—]/);
            return {
              period: parts.length > 1 ? parts[0].trim() : `Phase ${i + 1}`,
              title: parts.length > 1 ? parts[0].trim() : `Milestone ${i + 1}`,
              description: parts.length > 1 ? parts.slice(1).join(':').trim() : bp,
            };
          });

      const displayItems = timelineItems.slice(0, 4);
      const colCount = Math.max(1, Math.min(4, displayItems.length));

      if (imageUrl && !imageError) {
        return (
          <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
            <div className="mb-2 shrink-0">
              <span
                className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1"
                style={{
                  backgroundColor: `${palette.secondary}18`,
                  borderColor: `${palette.secondary}40`,
                  borderWidth: '1px',
                  color: palette.secondary,
                }}
              >
                <Clock className="w-3 h-3" /> Chronological Timeline & Milestones
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1" style={{ fontFamily: font_pairing.heading, color: palette.text }}>
                {slide.title}
              </h2>
              {content.subtitle && <p className="text-xs line-clamp-1 mt-0.5" style={{ color: palette.text_muted }}>{content.subtitle}</p>}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center my-auto overflow-hidden">
              <div className="space-y-2 overflow-hidden my-auto">
                {displayItems.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="p-2.5 border shadow-sm rounded-xl" style={cardStyle}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ backgroundColor: `${palette.primary}18`, color: palette.primary }}>
                        {item.period}
                      </span>
                      <h3 className="text-xs font-bold line-clamp-1" style={{ fontFamily: font_pairing.heading, color: palette.text }}>
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-[11px] leading-tight line-clamp-2" style={{ fontFamily: font_pairing.body, color: palette.text_muted }}>
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
              <SlideImageCard
                imageUrl={imageUrl}
                slideImage={slideImage}
                title={slide.title}
                onReplace={onReplaceImage}
                onRemove={onRemoveImage}
                cardStyle={cardStyle}
                heightClass="h-44 sm:h-52 md:h-60"
              />
            </div>
          </div>
        );
      }

      return (
        <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
          <div className="mb-2 shrink-0">
            <span
              className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1"
              style={{
                backgroundColor: `${palette.secondary}18`,
                borderColor: `${palette.secondary}40`,
                borderWidth: '1px',
                color: palette.secondary,
              }}
            >
              <Clock className="w-3 h-3" /> Chronological Timeline & Milestones
            </span>
            <h2
              className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1"
              style={{ fontFamily: font_pairing.heading, color: palette.text }}
            >
              {slide.title}
            </h2>
            {content.subtitle && (
              <p className="text-xs line-clamp-1 mt-0.5" style={{ color: palette.text_muted }}>
                {content.subtitle}
              </p>
            )}
          </div>

          <div
            className="flex-1 my-auto w-full items-stretch"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
              gap: '0.625rem',
            }}
          >
            {displayItems.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 border flex flex-col justify-between shadow-sm overflow-hidden h-full"
                style={cardStyle}
              >
                <div className="overflow-hidden">
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold mb-1.5 line-clamp-1"
                    style={{
                      backgroundColor: `${palette.primary}18`,
                      borderColor: `${palette.primary}35`,
                      borderWidth: '1px',
                      color: palette.primary,
                    }}
                  >
                    {item.period}
                  </span>
                  <h3
                    className="text-xs font-bold mb-1 line-clamp-1"
                    style={{ fontFamily: font_pairing.heading, color: palette.text }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-[11px] leading-relaxed line-clamp-3"
                    style={{ fontFamily: font_pairing.body, color: palette.text_muted }}
                  >
                    {item.description}
                  </p>
                </div>
                <div
                  className="mt-2 pt-2 flex items-center gap-1 text-[10px] font-semibold shrink-0"
                  style={{
                    borderTopColor: palette.surface_border,
                    borderTopWidth: '1px',
                    color: palette.primary,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: palette.primary }} />
                  <span>Stage {idx + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 6. COMPARISON MATRIX (A vs B)
    if (visualType === 'comparison') {
      const columns = content.comparison_columns && content.comparison_columns.length > 0
        ? content.comparison_columns
        : [
            {
              heading: 'Option A / Current State',
              badge: 'Current',
              points: (content.bullet_points || []).slice(0, Math.ceil((content.bullet_points || []).length / 2)),
            },
            {
              heading: 'Option B / Proposed Solution',
              badge: 'Proposed',
              points: (content.bullet_points || []).slice(Math.ceil((content.bullet_points || []).length / 2)),
            },
          ];

      if (imageUrl && !imageError) {
        return (
          <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
            <div className="mb-2 shrink-0">
              <span
                className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1"
                style={{
                  backgroundColor: `${palette.accent}20`,
                  borderColor: `${palette.accent}40`,
                  borderWidth: '1px',
                  color: palette.accent,
                }}
              >
                <Columns className="w-3 h-3" /> Comparative Analysis
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1" style={{ fontFamily: font_pairing.heading, color: palette.text }}>
                {slide.title}
              </h2>
              {content.subtitle && <p className="text-xs line-clamp-1 mt-0.5" style={{ color: palette.text_muted }}>{content.subtitle}</p>}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center my-auto overflow-hidden">
              <div className="space-y-2 overflow-hidden my-auto">
                {columns.slice(0, 2).map((col, idx) => (
                  <div key={idx} className="p-2.5 border shadow-sm rounded-xl" style={cardStyle}>
                    <div className="flex items-center justify-between mb-1 pb-1 border-b" style={{ borderBottomColor: palette.surface_border }}>
                      <h3 className="text-xs font-bold line-clamp-1" style={{ fontFamily: font_pairing.heading, color: palette.text }}>
                        {col.heading}
                      </h3>
                      {col.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${palette.primary}18`, color: palette.primary }}>
                          {col.badge}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1">
                      {(col.points || []).slice(0, 2).map((pt: string, pIdx: number) => (
                        <li key={pIdx} className="text-[11px] flex items-center gap-1.5" style={{ color: palette.text_muted }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: palette.primary }} />
                          <span className="line-clamp-1">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <SlideImageCard
                imageUrl={imageUrl}
                slideImage={slideImage}
                title={slide.title}
                onReplace={onReplaceImage}
                onRemove={onRemoveImage}
                cardStyle={cardStyle}
                heightClass="h-44 sm:h-52 md:h-60"
              />
            </div>
          </div>
        );
      }

      return (
        <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
          <div className="mb-2 shrink-0">
            <span
              className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1"
              style={{
                backgroundColor: `${palette.accent}20`,
                borderColor: `${palette.accent}40`,
                borderWidth: '1px',
                color: palette.accent,
              }}
            >
              <Columns className="w-3 h-3" /> Comparative Analysis
            </span>
            <h2
              className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1"
              style={{ fontFamily: font_pairing.heading, color: palette.text }}
            >
              {slide.title}
            </h2>
            {content.subtitle && (
              <p className="text-xs line-clamp-1 mt-0.5" style={{ color: palette.text_muted }}>
                {content.subtitle}
              </p>
            )}
          </div>

          <div
            className="flex-1 my-auto w-full items-stretch"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '0.75rem',
            }}
          >
            {columns.slice(0, 2).map((col, idx) => (
              <div
                key={idx}
                className="p-4 border flex flex-col justify-between shadow-sm overflow-hidden h-full"
                style={{
                  ...cardStyle,
                  borderColor: idx === 1 ? palette.primary : palette.surface_border,
                }}
              >
                <div className="overflow-hidden">
                  <div
                    className="flex items-center justify-between mb-2.5 pb-2 border-b"
                    style={{ borderBottomColor: palette.surface_border }}
                  >
                    <h3
                      className="text-xs font-bold line-clamp-1"
                      style={{ fontFamily: font_pairing.heading, color: palette.text }}
                    >
                      {col.heading}
                    </h3>
                    {col.badge && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${palette.primary}18`,
                          color: palette.primary,
                        }}
                      >
                        {col.badge}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {col.points.slice(0, 3).map((pt, pIdx) => (
                      <li
                        key={pIdx}
                        className="flex items-start gap-2 text-xs leading-snug"
                        style={{ fontFamily: font_pairing.body, color: palette.text_muted }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: idx === 0 ? palette.primary : palette.secondary }}
                        />
                        <span className="line-clamp-2">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 7. STATISTICS & METRICS GRID
    if (visualType === 'stats_grid') {
      const stats = (content.stats && content.stats.length > 0)
        ? content.stats
        : (content.bullet_points || []).map((bp, i) => {
            const match = bp.match(/(\d+[%kMBNx+]?)/);
            const metric = match ? match[1] : `${(i + 1) * 25}%`;
            return {
              metric,
              label: bp.replace(metric, '').trim() || `Metric ${i + 1}`,
              description: bp,
              trend: undefined,
            };
          });

      const displayStats = stats.slice(0, 4);
      const colCount = Math.max(1, Math.min(4, displayStats.length));

      if (imageUrl && !imageError) {
        return (
          <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
            <div className="mb-2 shrink-0">
              <span
                className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1"
                style={{
                  backgroundColor: `${palette.primary}18`,
                  borderColor: `${palette.primary}40`,
                  borderWidth: '1px',
                  color: palette.primary,
                }}
              >
                <BarChart3 className="w-3 h-3" /> Data & Key Metrics
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1" style={{ fontFamily: font_pairing.heading, color: palette.text }}>
                {slide.title}
              </h2>
              {content.subtitle && <p className="text-xs line-clamp-1 mt-0.5" style={{ color: palette.text_muted }}>{content.subtitle}</p>}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center my-auto overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 h-full overflow-hidden my-auto">
                {displayStats.slice(0, 4).map((stat, idx) => (
                  <div key={idx} className="p-2.5 border flex flex-col justify-between shadow-sm overflow-hidden" style={cardStyle}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg font-black tracking-tight truncate" style={{ fontFamily: font_pairing.heading, color: palette.primary }}>
                        {stat.metric}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold mb-0.5 line-clamp-1" style={{ fontFamily: font_pairing.heading, color: palette.text }}>
                      {stat.label}
                    </h3>
                    {stat.description && stat.description !== stat.label && (
                      <p className="text-[10px] leading-tight line-clamp-2" style={{ fontFamily: font_pairing.body, color: palette.text_muted }}>
                        {stat.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <SlideImageCard
                imageUrl={imageUrl}
                slideImage={slideImage}
                title={slide.title}
                onReplace={onReplaceImage}
                onRemove={onRemoveImage}
                cardStyle={cardStyle}
                heightClass="h-44 sm:h-52 md:h-60"
              />
            </div>
          </div>
        );
      }

      return (
        <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
          <div className="mb-2 shrink-0">
            <span
              className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1"
              style={{
                backgroundColor: `${palette.primary}18`,
                borderColor: `${palette.primary}40`,
                borderWidth: '1px',
                color: palette.primary,
              }}
            >
              <BarChart3 className="w-3 h-3" /> Data & Key Metrics
            </span>
            <h2
              className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1"
              style={{ fontFamily: font_pairing.heading, color: palette.text }}
            >
              {slide.title}
            </h2>
            {content.subtitle && (
              <p className="text-xs line-clamp-1 mt-0.5" style={{ color: palette.text_muted }}>
                {content.subtitle}
              </p>
            )}
          </div>

          <div
            className="flex-1 my-auto w-full items-stretch"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
              gap: '0.625rem',
            }}
          >
            {displayStats.map((stat, idx) => (
              <div
                key={idx}
                className="p-3.5 border flex flex-col justify-between shadow-sm overflow-hidden h-full"
                style={cardStyle}
              >
                <div className="overflow-hidden">
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-xl sm:text-2xl font-black tracking-tight truncate"
                      style={{ fontFamily: font_pairing.heading, color: palette.primary }}
                    >
                      {stat.metric}
                    </span>
                    {stat.trend && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0"
                        style={{
                          backgroundColor: `${palette.accent}20`,
                          color: palette.accent,
                        }}
                      >
                        <TrendingUp className="w-2.5 h-2.5" /> {stat.trend}
                      </span>
                    )}
                  </div>
                  <h3
                    className="text-xs font-bold mb-1 line-clamp-1"
                    style={{ fontFamily: font_pairing.heading, color: palette.text }}
                  >
                    {stat.label}
                  </h3>
                  {stat.description && stat.description !== stat.label && (
                    <p
                      className="text-[11px] leading-tight line-clamp-2"
                      style={{ fontFamily: font_pairing.body, color: palette.text_muted }}
                    >
                      {stat.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 8. CARDS GRID / CORE PILLARS
    if (visualType === 'cards_grid') {
      const cards = content.cards && content.cards.length > 0
        ? content.cards
        : (content.bullet_points || []).map((bp, i) => {
            const parts = bp.split(/[:–—]/);
            return {
              title: parts.length > 1 ? parts[0].trim() : `Pillar ${i + 1}`,
              description: parts.length > 1 ? parts.slice(1).join(':').trim() : bp,
              icon_name: ['target', 'zap', 'award', 'shield', 'activity', 'lightbulb'][i % 6],
            };
          });

      const displayCards = cards.slice(0, 4);
      const colCount = Math.max(1, Math.min(4, displayCards.length));

      if (imageUrl && !imageError) {
        return (
          <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
            <div className="mb-2 shrink-0">
              <span
                className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1"
                style={{
                  backgroundColor: `${palette.secondary}18`,
                  borderColor: `${palette.secondary}40`,
                  borderWidth: '1px',
                  color: palette.secondary,
                }}
              >
                <Grid className="w-3 h-3" /> Core Pillars & Architecture
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1" style={{ fontFamily: font_pairing.heading, color: palette.text }}>
                {slide.title}
              </h2>
              {content.subtitle && <p className="text-xs line-clamp-1 mt-0.5" style={{ color: palette.text_muted }}>{content.subtitle}</p>}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center my-auto overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 h-full overflow-hidden my-auto">
                {displayCards.slice(0, 4).map((card, idx) => (
                  <div key={idx} className="p-2.5 border flex flex-col justify-between shadow-sm overflow-hidden" style={cardStyle}>
                    <div>
                      <div className="p-1 rounded-md w-fit mb-1 shrink-0" style={{ backgroundColor: `${palette.primary}15`, borderWidth: '1px', borderColor: `${palette.primary}30` }}>
                        {getIconByName(card.icon_name, palette.primary)}
                      </div>
                      <h3 className="text-xs font-bold mb-0.5 line-clamp-1" style={{ fontFamily: font_pairing.heading, color: palette.text }}>
                        {card.title}
                      </h3>
                      <p className="text-[10px] leading-snug line-clamp-2" style={{ fontFamily: font_pairing.body, color: palette.text_muted }}>
                        {card.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <SlideImageCard
                imageUrl={imageUrl}
                slideImage={slideImage}
                title={slide.title}
                onReplace={onReplaceImage}
                onRemove={onRemoveImage}
                cardStyle={cardStyle}
                heightClass="h-44 sm:h-52 md:h-60"
              />
            </div>
          </div>
        );
      }

      return (
        <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
          <div className="mb-2 shrink-0">
            <span
              className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1"
              style={{
                backgroundColor: `${palette.secondary}18`,
                borderColor: `${palette.secondary}40`,
                borderWidth: '1px',
                color: palette.secondary,
              }}
            >
              <Grid className="w-3 h-3" /> Core Pillars & Architecture
            </span>
            <h2
              className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1"
              style={{ fontFamily: font_pairing.heading, color: palette.text }}
            >
              {slide.title}
            </h2>
            {content.subtitle && (
              <p className="text-xs line-clamp-1 mt-0.5" style={{ color: palette.text_muted }}>
                {content.subtitle}
              </p>
            )}
          </div>

          <div
            className="flex-1 my-auto w-full items-stretch"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
              gap: '0.625rem',
            }}
          >
            {displayCards.map((card, idx) => (
              <div
                key={idx}
                className="p-3.5 border flex flex-col justify-between shadow-sm overflow-hidden h-full transition-colors"
                style={cardStyle}
              >
                <div className="overflow-hidden">
                  <div
                    className="p-1.5 rounded-lg w-fit mb-2 shrink-0"
                    style={{
                      backgroundColor: `${palette.primary}15`,
                      borderWidth: '1px',
                      borderColor: `${palette.primary}30`,
                    }}
                  >
                    {getIconByName(card.icon_name, palette.primary)}
                  </div>
                  <h3
                    className="text-xs font-bold mb-1 line-clamp-1"
                    style={{ fontFamily: font_pairing.heading, color: palette.text }}
                  >
                    {card.title}
                  </h3>
                  <p
                    className="text-[11px] leading-relaxed line-clamp-3"
                    style={{ fontFamily: font_pairing.body, color: palette.text_muted }}
                  >
                    {card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 9. TABLE / STRUCTURED DATA MATRIX
    if (visualType === 'table') {
      const tableData = content.table_data || {
        headers: ['Category / Pillar', 'Key Detail', 'Expected Impact'],
        rows: (content.bullet_points || []).slice(0, 3).map((bp, i) => {
          const parts = bp.split(/[:–—]/);
          return [
            parts[0]?.trim() || `Item ${i + 1}`,
            parts[1]?.trim() || bp,
            `Phase ${i + 1}`,
          ];
        }),
      };

      return (
        <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
          <div className="mb-2 shrink-0">
            <span
              className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1"
              style={{
                backgroundColor: `${palette.primary}18`,
                borderColor: `${palette.primary}40`,
                borderWidth: '1px',
                color: palette.primary,
              }}
            >
              <TableIcon className="w-3 h-3" /> Structured Matrix
            </span>
            <h2
              className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1"
              style={{ fontFamily: font_pairing.heading, color: palette.text }}
            >
              {slide.title}
            </h2>
            {content.subtitle && (
              <p className="text-xs line-clamp-1 mt-0.5" style={{ color: palette.text_muted }}>
                {content.subtitle}
              </p>
            )}
          </div>

          <div
            className="flex-1 my-auto overflow-hidden border"
            style={{
              borderColor: palette.surface_border,
              borderRadius: border_radius,
            }}
          >
            <table className="w-full text-left border-collapse text-xs">
              <thead
                style={{
                  backgroundColor: `${palette.primary}15`,
                  borderBottomColor: palette.surface_border,
                  borderBottomWidth: '1px',
                }}
              >
                <tr>
                  {tableData.headers.map((h, i) => (
                    <th
                      key={i}
                      className="p-2.5 font-bold text-[11px] uppercase tracking-wider"
                      style={{ fontFamily: font_pairing.heading, color: palette.text }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{
                  backgroundColor: palette.surface,
                  borderColor: palette.surface_border,
                }}
              >
                {tableData.rows.slice(0, 3).map((row, rIdx) => (
                  <tr key={rIdx} className="hover:opacity-90 transition-opacity">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="p-2.5 text-[11px] line-clamp-2"
                        style={{ fontFamily: font_pairing.body, color: palette.text_muted }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // 10. HIERARCHY / ARCHITECTURE
    if (visualType === 'hierarchy' || visualType === 'architecture' || visualType === 'diagram') {
      const levels = content.hierarchy_levels && content.hierarchy_levels.length > 0
        ? content.hierarchy_levels
        : (content.bullet_points || []).map((bp, i) => {
            const parts = bp.split(/[:–—]/);
            return {
              level: i + 1,
              title: parts.length > 1 ? parts[0].trim() : `Tier ${i + 1}`,
              subtitle: parts.length > 1 ? parts.slice(1).join(':').trim() : bp,
            };
          });

      return (
        <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
          <div className="mb-2 shrink-0">
            <span
              className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1"
              style={{
                backgroundColor: `${palette.secondary}18`,
                borderColor: `${palette.secondary}40`,
                borderWidth: '1px',
                color: palette.secondary,
              }}
            >
              <Network className="w-3 h-3" /> System Architecture & Hierarchy
            </span>
            <h2
              className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1"
              style={{ fontFamily: font_pairing.heading, color: palette.text }}
            >
              {slide.title}
            </h2>
            {content.subtitle && (
              <p className="text-xs line-clamp-1 mt-0.5" style={{ color: palette.text_muted }}>
                {content.subtitle}
              </p>
            )}
          </div>

          <div className="space-y-2 my-auto w-full overflow-hidden">
            {levels.slice(0, 3).map((lvl, idx) => (
              <div
                key={idx}
                className="p-3 border flex items-center justify-between shadow-sm overflow-hidden"
                style={{
                  ...cardStyle,
                  marginLeft: rtl ? undefined : `${idx * 0.75}rem`,
                  marginRight: rtl ? `${idx * 0.75}rem` : undefined,
                }}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span
                    className="w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${palette.primary}20`,
                      color: palette.primary,
                    }}
                  >
                    {lvl.level || idx + 1}
                  </span>
                  <div className="overflow-hidden">
                    <h4
                      className="text-xs font-bold truncate"
                      style={{ fontFamily: font_pairing.heading, color: palette.text }}
                    >
                      {lvl.title}
                    </h4>
                    {lvl.subtitle && (
                      <p
                        className="text-[11px] truncate"
                        style={{ fontFamily: font_pairing.body, color: palette.text_muted }}
                      >
                        {lvl.subtitle}
                      </p>
                    )}
                  </div>
                </div>
                <GitBranch className="w-3.5 h-3.5 opacity-60 shrink-0 ml-2" style={{ color: palette.primary }} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 11. QUOTE / KEY TAKEAWAY LAYOUT
    if (visualType === 'quote') {
      const quoteText = content.body || (content.bullet_points && content.bullet_points[0]) || slide.title;
      const quoteAuthor = content.subtitle || slide.source_reference || 'Key Principle';
      return (
        <div className="flex-1 flex flex-col justify-center items-center text-center px-6 py-4 space-y-4 animate-fadeIn my-auto relative">
          <div
            className="p-3 rounded-full border shadow-sm"
            style={{
              backgroundColor: `${palette.primary}18`,
              borderColor: `${palette.primary}35`,
              color: palette.primary,
            }}
          >
            <Quote className="w-6 h-6 stroke-[2.5]" />
          </div>
          <blockquote
            className="text-lg sm:text-xl md:text-2xl font-semibold italic max-w-2xl leading-relaxed"
            style={{
              fontFamily: font_pairing.heading,
              color: palette.text,
            }}
          >
            &ldquo;{quoteText}&rdquo;
          </blockquote>
          {quoteAuthor && (
            <p
              className="text-xs font-bold uppercase tracking-wider"
              style={{
                fontFamily: font_pairing.body,
                color: palette.primary,
              }}
            >
              &mdash; {quoteAuthor}
            </p>
          )}
        </div>
      );
    }

    // 12. IMAGE AND TEXT LAYOUT
    if (visualType === 'image_text' || visualType === 'image' || imageUrl) {
      const bullets = (content.bullet_points || []).filter(bp => bp && bp.trim() !== '');

      return (
        <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
          <div className="mb-2 shrink-0">
            <h2
              className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1"
              style={{ fontFamily: font_pairing.heading, color: palette.text }}
            >
              {slide.title}
            </h2>
            {content.subtitle && (
              <p className="text-xs line-clamp-1 mt-0.5" style={{ color: palette.text_muted }}>
                {content.subtitle}
              </p>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center my-auto overflow-hidden">
            <SlideImageCard
              imageUrl={imageUrl}
              slideImage={slideImage}
              title={slide.title}
              onReplace={onReplaceImage}
              onRemove={onRemoveImage}
              cardStyle={cardStyle}
              heightClass="h-44 sm:h-48 md:h-56"
            />

            <div className="space-y-2 overflow-hidden">
              {bullets.length > 0 ? (
                bullets.slice(0, 3).map((bp, idx) => {
                  const { lead, body } = parseBullet(bp);
                  return (
                    <div
                      key={idx}
                      className="p-2.5 border shadow-sm"
                      style={cardStyle}
                    >
                      {lead && (
                        <h4
                          className="text-xs font-bold mb-0.5"
                          style={{ fontFamily: font_pairing.heading, color: palette.text }}
                        >
                          {lead}
                        </h4>
                      )}
                      <p
                        className="text-xs leading-snug line-clamp-2"
                        style={{ fontFamily: font_pairing.body, color: palette.text_muted }}
                      >
                        {body}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p
                  className="text-xs leading-relaxed"
                  style={{ fontFamily: font_pairing.body, color: palette.text_muted }}
                >
                  {content.body || 'Visual analysis and supporting commentary for this section.'}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 13. TWO COLUMN LAYOUT
    if (visualType === 'two_column') {
      const bullets = (content.bullet_points || []).filter(bp => bp && bp.trim() !== '');
      return (
        <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
          <div
            className="mb-2 shrink-0 border-b pb-1.5"
            style={{ borderBottomColor: palette.surface_border }}
          >
            <h2
              className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1"
              style={{ fontFamily: font_pairing.heading, color: palette.text }}
            >
              {slide.title}
            </h2>
            {content.subtitle && (
              <p className="text-xs line-clamp-1 mt-0.5" style={{ color: palette.text_muted }}>
                {content.subtitle}
              </p>
            )}
          </div>

          <div
            className="flex-1 my-auto w-full items-stretch"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '0.75rem',
            }}
          >
            {bullets.slice(0, 4).map((bp, idx) => {
              const { lead, body } = parseBullet(bp);
              return (
                <div
                  key={idx}
                  className="p-3.5 border flex items-start gap-2.5 shadow-sm overflow-hidden"
                  style={cardStyle}
                >
                  <span
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0 shadow-sm"
                    style={{ backgroundColor: palette.primary }}
                  />
                  <div className="overflow-hidden">
                    {lead && (
                      <h4
                        className="text-xs font-bold mb-0.5 line-clamp-1"
                        style={{ fontFamily: font_pairing.heading, color: palette.text }}
                      >
                        {lead}
                      </h4>
                    )}
                    <p
                      className="text-xs leading-snug line-clamp-3"
                      style={{ fontFamily: font_pairing.body, color: palette.text_muted }}
                    >
                      {body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 14. DEFAULT STANDARD CONTENT LAYOUT (Transforms plain text into polished presentation cards!)
    const bullets = (content.bullet_points || []).filter(bp => bp && bp.trim() !== '');
    return (
      <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
        <div className="mb-2 shrink-0">
          <h2
            className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight line-clamp-2"
            style={{ fontFamily: font_pairing.heading, color: palette.text }}
          >
            {slide.title}
          </h2>
          {content.subtitle && (
            <p
              className="text-xs sm:text-[13px] font-semibold mt-0.5 line-clamp-1"
              style={{ color: palette.primary }}
            >
              {content.subtitle}
            </p>
          )}
        </div>

        {bullets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-auto max-w-full overflow-hidden">
            {bullets.slice(0, 4).map((bp, idx) => {
              const { lead, body } = parseBullet(bp);
              return (
                <div
                  key={idx}
                  className="p-3.5 border shadow-sm flex items-start gap-2.5 transition-colors"
                  style={cardStyle}
                >
                  <div
                    className="w-5 h-5 rounded-lg font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: `${palette.primary}18`,
                      color: palette.primary,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div className="overflow-hidden">
                    {lead && (
                      <h4
                        className="text-xs font-bold mb-0.5 line-clamp-1"
                        style={{ fontFamily: font_pairing.heading, color: palette.text }}
                      >
                        {lead}
                      </h4>
                    )}
                    <p
                      className="text-xs leading-snug line-clamp-3"
                      style={{ fontFamily: font_pairing.body, color: palette.text_muted }}
                    >
                      {body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="p-4 border shadow-sm my-auto"
            style={cardStyle}
          >
            <p
              className="text-xs sm:text-sm leading-relaxed"
              style={{ fontFamily: font_pairing.body, color: palette.text_muted }}
            >
              {content.body || 'Structured executive content prepared for this slide.'}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      style={{
        fontFamily: font_pairing.body,
        color: palette.text,
      }}
      className={`w-full h-full flex flex-col flex-1 overflow-hidden ${rtl ? 'font-urdu text-right' : ''}`}
    >
      {renderLayout()}
    </div>
  );
};
