import React, { useState } from 'react';
import {
  X,
  Palette,
  Type,
  Layout,
  Sparkles,
  Check,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import {
  PRESENTATION_THEMES,
  COLOR_PALETTES,
  FONT_PAIRINGS,
  type PresentationTheme,
  DEFAULT_THEME,
} from '../constants/themes';

export interface DesignStudioModalProps {
  currentTheme?: PresentationTheme;
  onSelectTheme: (theme: PresentationTheme) => void;
  onUpdatePalette?: (paletteUpdates: Partial<PresentationTheme['palette']>) => void;
  onSelectFontPairing?: (fontPairingId: string) => void;
  currentLayoutType?: string;
  onSelectLayoutType?: (layoutType: string) => void;
  currentLayout?: string;
  onSelectLayout?: (layoutType: string) => void;
  isOpen?: boolean;
  onClose: () => void;
}

export const DesignStudioModal: React.FC<DesignStudioModalProps> = ({
  currentTheme = DEFAULT_THEME,
  onSelectTheme,
  onUpdatePalette,
  onSelectFontPairing,
  currentLayoutType,
  onSelectLayoutType,
  currentLayout,
  onSelectLayout,
  isOpen = true,
  onClose,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'themes' | 'colors' | 'fonts' | 'layouts'>('themes');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const handleUpdatePalette = (paletteUpdates: Partial<PresentationTheme['palette']>) => {
    if (onUpdatePalette) {
      onUpdatePalette(paletteUpdates);
    } else {
      const updatedTheme: PresentationTheme = {
        ...currentTheme,
        palette: {
          ...currentTheme.palette,
          ...paletteUpdates,
        },
      };
      onSelectTheme(updatedTheme);
    }
  };

  const handleSelectFontPairing = (fontPairingId: string) => {
    if (onSelectFontPairing) {
      onSelectFontPairing(fontPairingId);
    } else {
      const pairing = FONT_PAIRINGS.find((p) => p.id === fontPairingId) || FONT_PAIRINGS[0];
      const updatedTheme: PresentationTheme = {
        ...currentTheme,
        font_pairing: pairing,
        fonts: {
          headingFont: pairing.heading,
          bodyFont: pairing.body,
        },
      };
      onSelectTheme(updatedTheme);
    }
  };

  const effectiveLayout = currentLayout || currentLayoutType || 'standard';
  const handleSelectLayout = (layoutId: string) => {
    if (onSelectLayout) onSelectLayout(layoutId);
    if (onSelectLayoutType) onSelectLayoutType(layoutId);
  };

  const categories = ['All', 'Professional', 'Minimal', 'Corporate', 'Pitch Deck', 'Creative', 'Academic', 'Data & Analytics', 'Elegant', 'Colorful'];

  const filteredThemes = selectedCategory === 'All'
    ? PRESENTATION_THEMES
    : PRESENTATION_THEMES.filter(
        (t) => t.category.toLowerCase() === selectedCategory.toLowerCase()
      );

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-[#FFFFFF] dark:bg-[#332D28] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40 bg-[#FDFBF7] dark:bg-[#3E3731] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/25">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2D2320] dark:text-[#FFFFFF] flex items-center gap-2">
                Design & Theme Customization Studio
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold border border-[var(--color-primary)]/20 uppercase">
                  Live Preview
                </span>
              </h2>
              <p className="text-xs text-[#77574A] dark:text-[#FFFFFF]">
                Select a cohesive theme or customize colors, typography, and slide layouts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectTheme(DEFAULT_THEME)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#77574A] dark:text-[#FFFFFF] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#4D443D] border border-[#D0AE92]/30 dark:border-[#8C7D70]/40 transition-all flex items-center gap-1.5"
              title="Reset to default theme"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#77574A] dark:text-[#FFFFFF] hover:text-[#2D2320] dark:hover:text-[#FFFFFF] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#4D443D] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-[#D0AE92]/25 dark:border-[#8C7D70]/40 bg-[#FFFFFF] dark:bg-[#332D28] shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('themes')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'themes'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-transparent text-[#77574A] dark:text-[#FFFFFF] hover:text-[#2D2320] dark:hover:text-[#FFFFFF]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Themes Gallery ({PRESENTATION_THEMES.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('colors')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'colors'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-transparent text-[#77574A] dark:text-[#FFFFFF] hover:text-[#2D2320] dark:hover:text-[#FFFFFF]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Color Palettes</span>
          </button>
          <button
            onClick={() => setActiveTab('fonts')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'fonts'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-transparent text-[#77574A] dark:text-[#FFFFFF] hover:text-[#2D2320] dark:hover:text-[#FFFFFF]'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Typography</span>
          </button>
          <button
            onClick={() => setActiveTab('layouts')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'layouts'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-transparent text-[#77574A] dark:text-[#FFFFFF] hover:text-[#2D2320] dark:hover:text-[#FFFFFF]'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Slide Layouts</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {/* TAB 1: THEMES GALLERY */}
          {activeTab === 'themes' && (
            <div className="space-y-4">
              {/* Category Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                        : 'bg-[#F4ECE3] dark:bg-[#3E3731] text-[#77574A] dark:text-[#FFFFFF] hover:bg-[#EBD7BE]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Themes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredThemes.map((theme) => {
                  const isSelected = currentTheme.id === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => onSelectTheme(theme)}
                      className={`group relative rounded-2xl border-2 p-3.5 transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between ${
                        isSelected
                          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 bg-[var(--color-primary)]/5'
                          : 'border-[#D0AE92]/30 dark:border-[#8C7D70]/40 hover:border-[var(--color-primary)]/50 bg-[#FFFFFF] dark:bg-[#3E3731]'
                      }`}
                    >
                      {/* Theme Thumbnail Preview */}
                      <div
                        className="w-full aspect-[16/9] rounded-xl p-2.5 flex flex-col justify-between mb-3 shadow-inner relative overflow-hidden border border-black/10"
                        style={{ backgroundColor: theme.palette.background }}
                      >
                        {/* Top Accent Stripe */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1"
                          style={{
                            background: typeof theme.accent_stripe === 'string'
                              ? theme.accent_stripe
                              : theme.palette.primary,
                          }}
                        />

                        {/* Miniature Slide Elements */}
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[8px] font-bold px-1.5 py-0.2 rounded"
                            style={{
                              backgroundColor: `${theme.palette.primary}25`,
                              color: theme.palette.primary,
                            }}
                          >
                            {theme.category}
                          </span>
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: theme.palette.accent }}
                          />
                        </div>

                        {/* Mini Title */}
                        <div className="my-auto">
                          <div
                            className="text-[11px] font-extrabold truncate"
                            style={{
                              color: theme.palette.text,
                              fontFamily: theme.font_pairing.heading,
                            }}
                          >
                            {theme.name}
                          </div>
                          <div
                            className="text-[8px] truncate opacity-75"
                            style={{
                              color: theme.palette.text_muted,
                              fontFamily: theme.font_pairing.body,
                            }}
                          >
                            Executive Presentation Deck
                          </div>
                        </div>

                        {/* Mini Cards Grid */}
                        <div className="grid grid-cols-2 gap-1">
                          <div
                            className="p-1 rounded border text-[7px] truncate"
                            style={{
                              backgroundColor: theme.palette.surface,
                              borderColor: theme.palette.surface_border,
                              color: theme.palette.text,
                            }}
                          >
                            Point 01
                          </div>
                          <div
                            className="p-1 rounded border text-[7px] truncate"
                            style={{
                              backgroundColor: theme.palette.surface,
                              borderColor: theme.palette.surface_border,
                              color: theme.palette.text,
                            }}
                          >
                            Point 02
                          </div>
                        </div>
                      </div>

                      {/* Theme Details & Swatches */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-xs font-bold text-[#2D2320] dark:text-[#FFFFFF] truncate">
                            {theme.name}
                          </h3>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-[#77574A] dark:text-[#FFFFFF] line-clamp-2 mb-2 leading-tight">
                          {theme.description}
                        </p>

                        {/* Color Swatch Dots */}
                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-[#D0AE92]/20 dark:border-white/18">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                            style={{ backgroundColor: theme.palette.primary }}
                            title={`Primary: ${theme.palette.primary}`}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                            style={{ backgroundColor: theme.palette.secondary }}
                            title={`Secondary: ${theme.palette.secondary}`}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                            style={{ backgroundColor: theme.palette.accent }}
                            title={`Accent: ${theme.palette.accent}`}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                            style={{ backgroundColor: theme.palette.background }}
                            title={`Background: ${theme.palette.background}`}
                          />
                          <span className="text-[10px] font-medium text-[#77574A] dark:text-[#FFFFFF] ml-auto">
                            {theme.font_pairing.heading}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: COLOR PALETTES & CUSTOM PICKER */}
          {activeTab === 'colors' && (
            <div className="space-y-6">
              {/* Preset Palettes */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF] mb-3">
                  Curated Presentation Palettes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {COLOR_PALETTES.map((palette) => {
                    const isSelected = currentTheme.palette.primary === palette.primary && currentTheme.palette.background === palette.background;
                    return (
                      <div
                        key={palette.id}
                        onClick={() => handleUpdatePalette(palette)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 bg-[var(--color-primary)]/5'
                            : 'border-[#D0AE92]/30 dark:border-[#8C7D70]/40 hover:border-[var(--color-primary)]/40 bg-[#FFFFFF] dark:bg-[#3E3731]'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-[#2D2320] dark:text-[#FFFFFF] mb-1">
                            {palette.name}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: palette.primary }} />
                            <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: palette.secondary }} />
                            <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: palette.accent }} />
                            <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: palette.background }} />
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Pickers */}
              <div className="p-4 rounded-2xl border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-[#FDFBF7] dark:bg-[#3E3731]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF] mb-3">
                  Fine-Tune Custom Palette Colors
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#77574A] dark:text-[#FFFFFF] mb-1">
                      Primary Accent
                    </label>
                    <div className="flex items-center gap-2 bg-[#FFFFFF] dark:bg-[#3E3731] p-1.5 rounded-xl border border-[#D0AE92]/30">
                      <input
                        type="color"
                        value={currentTheme.palette.primary}
                        onChange={(e) => handleUpdatePalette({ primary: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                      />
                      <span className="text-xs font-mono font-bold text-[#2D2320] dark:text-[#FFFFFF]">
                        {currentTheme.palette.primary}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#77574A] dark:text-[#FFFFFF] mb-1">
                      Secondary Accent
                    </label>
                    <div className="flex items-center gap-2 bg-[#FFFFFF] dark:bg-[#3E3731] p-1.5 rounded-xl border border-[#D0AE92]/30">
                      <input
                        type="color"
                        value={currentTheme.palette.secondary}
                        onChange={(e) => handleUpdatePalette({ secondary: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                      />
                      <span className="text-xs font-mono font-bold text-[#2D2320] dark:text-[#FFFFFF]">
                        {currentTheme.palette.secondary}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#77574A] dark:text-[#FFFFFF] mb-1">
                      Canvas Background
                    </label>
                    <div className="flex items-center gap-2 bg-[#FFFFFF] dark:bg-[#3E3731] p-1.5 rounded-xl border border-[#D0AE92]/30">
                      <input
                        type="color"
                        value={currentTheme.palette.background}
                        onChange={(e) => handleUpdatePalette({ background: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                      />
                      <span className="text-xs font-mono font-bold text-[#2D2320] dark:text-[#FFFFFF]">
                        {currentTheme.palette.background}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#77574A] dark:text-[#FFFFFF] mb-1">
                      Card Surface
                    </label>
                    <div className="flex items-center gap-2 bg-[#FFFFFF] dark:bg-[#3E3731] p-1.5 rounded-xl border border-[#D0AE92]/30">
                      <input
                        type="color"
                        value={currentTheme.palette.surface}
                        onChange={(e) => handleUpdatePalette({ surface: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                      />
                      <span className="text-xs font-mono font-bold text-[#2D2320] dark:text-[#FFFFFF]">
                        {currentTheme.palette.surface}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TYPOGRAPHY & FONT PAIRINGS */}
          {activeTab === 'fonts' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF]">
                Curated Presentation Typography Pairings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FONT_PAIRINGS.map((pairing) => {
                  const isSelected = currentTheme.font_pairing.id === pairing.id;
                  return (
                    <div
                      key={pairing.id}
                      onClick={() => handleSelectFontPairing(pairing.id)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 bg-[var(--color-primary)]/5'
                          : 'border-[#D0AE92]/30 dark:border-[#8C7D70]/40 hover:border-[var(--color-primary)]/40 bg-[#FFFFFF] dark:bg-[#3E3731]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#2D2320] dark:text-[#FFFFFF]">
                            {pairing.name}
                          </span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        {/* Live Font Sample */}
                        <div className="p-3 rounded-xl bg-[#F4ECE3]/50 dark:bg-[#2A2521] border border-[#D0AE92]/20 mb-2">
                          <h4
                            className="text-base font-extrabold text-[#2D2320] dark:text-[#FFFFFF] mb-1 line-clamp-1"
                            style={{ fontFamily: pairing.heading }}
                          >
                            Executive Strategy & Vision
                          </h4>
                          <p
                            className="text-xs text-[#6B4E3D] dark:text-[#FFFFFF] leading-snug line-clamp-2"
                            style={{ fontFamily: pairing.body }}
                          >
                            Driving measurable organizational impact and transformative growth across enterprise operations.
                          </p>
                        </div>
                      </div>

                      <div className="text-[11px] text-[#77574A] dark:text-[#FFFFFF] flex items-center justify-between pt-1">
                        <span>Heading: <b>{pairing.heading}</b></span>
                        <span>Body: <b>{pairing.body}</b></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: SLIDE LAYOUT VARIATIONS */}
          {activeTab === 'layouts' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF]">
                Apply Layout Template to Current Slide
              </h3>
              <p className="text-xs text-[#6B4E3D] dark:text-[#FFFFFF]">
                Switch slide structure instantly without losing your title, subtitle, or underlying content:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[
                  { id: 'standard', name: 'Standard Cards' },
                  { id: 'title', name: 'Hero Title' },
                  { id: 'section_header', name: 'Section Break' },
                  { id: 'conclusion', name: 'Summary & Takeaways' },
                  { id: 'process_flow', name: 'Process Steps' },
                  { id: 'timeline', name: 'Milestone Timeline' },
                  { id: 'comparison', name: 'Comparison Matrix' },
                  { id: 'stats_grid', name: 'Metrics & KPIs' },
                  { id: 'cards_grid', name: 'Pillars & Cards' },
                  { id: 'table', name: 'Structured Matrix' },
                  { id: 'hierarchy', name: 'Hierarchy Tree' },
                  { id: 'two_column', name: 'Two Columns' },
                  { id: 'quote', name: 'Quote Callout' },
                  { id: 'image_text', name: 'Image & Content' },
                ].map((layout) => {
                  const isSelected = effectiveLayout === layout.id;
                  return (
                    <button
                      key={layout.id}
                      onClick={() => handleSelectLayout(layout.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold shadow-sm'
                          : 'border-[#D0AE92]/30 dark:border-[#8C7D70]/40 text-[#4A3A34] dark:text-[#FFFFFF] hover:border-[var(--color-primary)]/50 bg-[#FFFFFF] dark:bg-[#3E3731]'
                      }`}
                    >
                      <span className="text-xs">{layout.name}</span>
                      {isSelected && (
                        <span className="mt-2 text-[10px] uppercase font-bold text-[var(--color-primary)] flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/40 bg-[#FDFBF7] dark:bg-[#3E3731] flex items-center justify-between shrink-0">
          <div className="text-xs text-[#77574A] dark:text-[#FFFFFF] flex items-center gap-2">
            <span>Active Theme: <b>{currentTheme.name}</b></span>
            <span>&bull;</span>
            <span>Heading Font: <b>{currentTheme.font_pairing.heading}</b></span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl text-xs font-bold text-white bg-[var(--color-primary)] dark:bg-[#8C7D70] dark:hover:bg-[#A39487] hover:opacity-90 transition-all shadow-md cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
