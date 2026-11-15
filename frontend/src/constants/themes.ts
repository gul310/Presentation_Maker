export interface ThemePalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surface_border: string;
  text: string;
  text_muted: string;
  gradient?: string;
}

export interface FontPairing {
  id: string;
  name: string;
  heading: string;
  body: string;
  google_fonts_url?: string;
  pptx_heading?: string;
  pptx_body?: string;
}

export interface PresentationTheme {
  id: string;
  name: string;
  category: string;
  description: string;
  palette: ThemePalette;
  font_pairing: FontPairing;
  fonts?: {
    headingFont: string;
    bodyFont: string;
  };
  card_style: 'modern' | 'glass' | 'bordered' | 'flat' | 'elevated';
  border_radius: string;
  accent_stripe?: boolean | string;
}

// 1. CURATED FONT PAIRINGS
export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: 'modern_sans',
    name: 'Modern Sans (Inter)',
    heading: 'Inter',
    body: 'Inter',
    google_fonts_url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap',
    pptx_heading: 'Segoe UI',
    pptx_body: 'Segoe UI',
  },
  {
    id: 'executive_display',
    name: 'Executive Display (Jakarta / Inter)',
    heading: 'Plus Jakarta Sans',
    body: 'Inter',
    google_fonts_url: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600&display=swap',
    pptx_heading: 'Segoe UI',
    pptx_body: 'Segoe UI',
  },
  {
    id: 'editorial_serif',
    name: 'Editorial Serif (Playfair / Lora)',
    heading: 'Playfair Display',
    body: 'Lora',
    google_fonts_url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Lora:wght@400;500;600&display=swap',
    pptx_heading: 'Georgia',
    pptx_body: 'Georgia',
  },
  {
    id: 'tech_modern',
    name: 'Tech Modern (Space Grotesk / Outfit)',
    heading: 'Space Grotesk',
    body: 'Outfit',
    google_fonts_url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Outfit:wght@400;500;600&display=swap',
    pptx_heading: 'Century Gothic',
    pptx_body: 'Segoe UI',
  },
  {
    id: 'academic_classic',
    name: 'Academic Classic (Merriweather / Source)',
    heading: 'Merriweather',
    body: 'Source Sans 3',
    google_fonts_url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&family=Source+Sans+3:wght@400;600&display=swap',
    pptx_heading: 'Georgia',
    pptx_body: 'Calibri',
  },
  {
    id: 'vibrant_startup',
    name: 'Vibrant Startup (Outfit / Jakarta)',
    heading: 'Outfit',
    body: 'Plus Jakarta Sans',
    google_fonts_url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap',
    pptx_heading: 'Segoe UI',
    pptx_body: 'Segoe UI',
  },
];

// 2. CURATED COLOR PALETTES
export const COLOR_PALETTES = [
  {
    id: 'warm_editorial',
    name: 'Warm Mocha & Caramel',
    primary: '#77574A',
    secondary: '#A8836C',
    accent: '#D0AE92',
    background: '#FDFBF7',
    surface: '#F4ECE3',
    surface_border: '#D0AE92',
    text: '#2D2320',
    text_muted: '#6B4E3D',
  },
  {
    id: 'minimal_white',
    name: 'Clean Charcoal & Slate',
    primary: '#2563EB',
    secondary: '#64748B',
    accent: '#F59E0B',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surface_border: '#E2E8F0',
    text: '#0F172A',
    text_muted: '#475569',
  },
  {
    id: 'midnight_pro',
    name: 'Midnight Navy & Electric Sky',
    primary: '#38BDF8',
    secondary: '#818CF8',
    accent: '#F43F5E',
    background: '#0B0F19',
    surface: '#111827',
    surface_border: '#1F2937',
    text: '#F9FAFB',
    text_muted: '#9CA3AF',
  },
  {
    id: 'ocean_corporate',
    name: 'Ocean Corporate Azure',
    primary: '#0284C7',
    secondary: '#0EA5E9',
    accent: '#06B6D4',
    background: '#F0F9FF',
    surface: '#FFFFFF',
    surface_border: '#BAE6FD',
    text: '#0C4A6E',
    text_muted: '#0369A1',
  },
  {
    id: 'emerald_business',
    name: 'Emerald Venture & Forest',
    primary: '#059669',
    secondary: '#10B981',
    accent: '#F59E0B',
    background: '#F0FDF4',
    surface: '#FFFFFF',
    surface_border: '#A7F3D0',
    text: '#064E3B',
    text_muted: '#047857',
  },
  {
    id: 'creative_gradient',
    name: 'Creative Violet & Fuchsia',
    primary: '#8B5CF6',
    secondary: '#EC4899',
    accent: '#F43F5E',
    background: '#FAF5FF',
    surface: '#FFFFFF',
    surface_border: '#E9D5FF',
    text: '#3B0764',
    text_muted: '#6B21A8',
  },
  {
    id: 'academic_classic',
    name: 'Crimson Scholarly & Amber',
    primary: '#991B1B',
    secondary: '#B45309',
    accent: '#D97706',
    background: '#FFFBEB',
    surface: '#FEF3C7',
    surface_border: '#FDE68A',
    text: '#451A03',
    text_muted: '#78350F',
  },
  {
    id: 'cyber_neon',
    name: 'Cyber Dark & Electric Cyan',
    primary: '#06B6D4',
    secondary: '#10B981',
    accent: '#A855F7',
    background: '#050811',
    surface: '#0E1424',
    surface_border: '#1E293B',
    text: '#E0F2FE',
    text_muted: '#7DD3FC',
  },
  {
    id: 'data_insights',
    name: 'Data Cobalt & Steel',
    primary: '#3B82F6',
    secondary: '#6366F1',
    accent: '#10B981',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surface_border: '#CBD5E1',
    text: '#0F172A',
    text_muted: '#334155',
  },
  {
    id: 'sunset_horizon',
    name: 'Sunset Orange & Amber',
    primary: '#EA580C',
    secondary: '#F97316',
    accent: '#FBBF24',
    background: '#FFF7ED',
    surface: '#FFFFFF',
    surface_border: '#FED7AA',
    text: '#7C2D12',
    text_muted: '#9A3412',
  },
  {
    id: 'nordic_frost',
    name: 'Nordic Frost & Slate',
    primary: '#475569',
    secondary: '#64748B',
    accent: '#0EA5E9',
    background: '#F1F5F9',
    surface: '#FFFFFF',
    surface_border: '#E2E8F0',
    text: '#1E293B',
    text_muted: '#475569',
  },
  {
    id: 'velvet_night',
    name: 'Warm Taupe Cashmere',
    primary: '#8C7D70',
    secondary: '#A39487',
    accent: '#8C7D70',
    background: '#332D28',
    surface: '#3E3731',
    surface_border: 'rgba(140, 125, 112, 0.40)',
    text: '#FFFFFF',
    text_muted: '#F5EEE8',
  },
];

// 3. 12 DISTINCT PRODUCTION PRESENTATION THEMES
export const PRESENTATION_THEMES: PresentationTheme[] = [
  {
    id: 'warm_editorial',
    name: 'Warm Editorial',
    category: 'Elegant',
    description: 'Warm parchment surface with rich mocha typography and editorial serif accents',
    palette: COLOR_PALETTES[0],
    font_pairing: FONT_PAIRINGS[2], // Playfair / Lora
    card_style: 'modern',
    border_radius: '1.5rem',
    accent_stripe: 'linear-gradient(to right, #77574A, #A8836C, #D0AE92)',
  },
  {
    id: 'minimal_white',
    name: 'Minimal White',
    category: 'Minimal',
    description: 'Restrained minimalist white aesthetic with clean lines and sharp sans-serif type',
    palette: COLOR_PALETTES[1],
    font_pairing: FONT_PAIRINGS[0], // Inter
    card_style: 'bordered',
    border_radius: '1rem',
    accent_stripe: 'linear-gradient(to right, #2563EB, #60A5FA)',
  },
  {
    id: 'midnight_pro',
    name: 'Midnight Executive',
    category: 'Professional',
    description: 'Deep navy obsidian canvas with high-contrast electric sky blue highlights',
    palette: COLOR_PALETTES[2],
    font_pairing: FONT_PAIRINGS[1], // Jakarta / Inter
    card_style: 'modern',
    border_radius: '1.25rem',
    accent_stripe: 'linear-gradient(to right, #38BDF8, #818CF8, #F43F5E)',
  },
  {
    id: 'ocean_corporate',
    name: 'Ocean Corporate',
    category: 'Corporate',
    description: 'Authoritative deep azure tones with seafoam borders suited for executive meetings',
    palette: COLOR_PALETTES[3],
    font_pairing: FONT_PAIRINGS[5], // Outfit / Jakarta
    card_style: 'elevated',
    border_radius: '1rem',
    accent_stripe: 'linear-gradient(to right, #0284C7, #06B6D4)',
  },
  {
    id: 'emerald_venture',
    name: 'Emerald Venture',
    category: 'Pitch Deck',
    description: 'Fresh emerald greens and structured cards conveying investment growth and ESG',
    palette: COLOR_PALETTES[4],
    font_pairing: FONT_PAIRINGS[1], // Jakarta / Inter
    card_style: 'modern',
    border_radius: '1.25rem',
    accent_stripe: 'linear-gradient(to right, #059669, #10B981, #F59E0B)',
  },
  {
    id: 'creative_gradient',
    name: 'Creative Studio',
    category: 'Creative',
    description: 'Dynamic violet-to-fuchsia gradients with modern display typography for pitch decks',
    palette: COLOR_PALETTES[5],
    font_pairing: FONT_PAIRINGS[3], // Space Grotesk / Outfit
    card_style: 'modern',
    border_radius: '1.5rem',
    accent_stripe: 'linear-gradient(to right, #8B5CF6, #EC4899, #F43F5E)',
  },
  {
    id: 'academic_classic',
    name: 'Academic Classic',
    category: 'Academic',
    description: 'Scholarly crimson and warm parchment suitable for thesis, research, and papers',
    palette: COLOR_PALETTES[6],
    font_pairing: FONT_PAIRINGS[4], // Merriweather / Source
    card_style: 'bordered',
    border_radius: '0.75rem',
    accent_stripe: 'linear-gradient(to right, #991B1B, #D97706)',
  },
  {
    id: 'cyber_neon',
    name: 'Cyber Dark',
    category: 'Creative',
    description: 'Deep black cybernetic aesthetic with glowing cyan accents and monospaced tech feel',
    palette: COLOR_PALETTES[7],
    font_pairing: FONT_PAIRINGS[3], // Space Grotesk
    card_style: 'bordered',
    border_radius: '1rem',
    accent_stripe: 'linear-gradient(to right, #06B6D4, #10B981, #A855F7)',
  },
  {
    id: 'data_insights',
    name: 'Data Analytics',
    category: 'Data & Analytics',
    description: 'High-clarity cobalt cards designed to highlight KPIs, charts, and metrics',
    palette: COLOR_PALETTES[8],
    font_pairing: FONT_PAIRINGS[1], // Jakarta
    card_style: 'elevated',
    border_radius: '1rem',
    accent_stripe: 'linear-gradient(to right, #3B82F6, #6366F1, #10B981)',
  },
  {
    id: 'sunset_horizon',
    name: 'Sunset Horizon',
    category: 'Colorful',
    description: 'Inspiring warm amber-orange gradient with dynamic startup energy',
    palette: COLOR_PALETTES[9],
    font_pairing: FONT_PAIRINGS[5], // Outfit / Jakarta
    card_style: 'modern',
    border_radius: '1.25rem',
    accent_stripe: 'linear-gradient(to right, #EA580C, #F97316, #FBBF24)',
  },
  {
    id: 'nordic_frost',
    name: 'Nordic Frost',
    category: 'Modern',
    description: 'Scandinavian muted greys and ice blue tones with crisp structured layouts',
    palette: COLOR_PALETTES[10],
    font_pairing: FONT_PAIRINGS[0], // Inter
    card_style: 'flat',
    border_radius: '0.875rem',
    accent_stripe: 'linear-gradient(to right, #475569, #0EA5E9)',
  },
  {
    id: 'velvet_night',
    name: 'Warm Taupe Cashmere',
    category: 'Elegant',
    description: 'Luxurious Warm Taupe #8C7D70 surfaces with rich pearl ivory accents and prominent typography',
    palette: COLOR_PALETTES[11],
    font_pairing: FONT_PAIRINGS[2], // Playfair
    card_style: 'elevated',
    border_radius: '1.25rem',
    accent_stripe: 'linear-gradient(to right, #8C7D70, #9E8F82, #FFFFFF)',
  },
];

export const DEFAULT_THEME: PresentationTheme = PRESENTATION_THEMES[0];

export const getThemeById = (id?: string): PresentationTheme => {
  if (!id) return DEFAULT_THEME;
  return PRESENTATION_THEMES.find((t) => t.id === id) || DEFAULT_THEME;
};

// Dynamically inject Google Fonts if not yet loaded
const loadedFontUrls = new Set<string>();

export const loadGoogleFont = (fontPairingOrName?: FontPairing | string) => {
  if (!fontPairingOrName || typeof document === 'undefined') return;

  let url = '';
  if (typeof fontPairingOrName === 'string') {
    if (fontPairingOrName.startsWith('http')) {
      url = fontPairingOrName;
    } else {
      url = `https://fonts.googleapis.com/css2?family=${fontPairingOrName.replace(/\s+/g, '+')}:wght@400;600;700;800&display=swap`;
    }
  } else if (fontPairingOrName.google_fonts_url) {
    url = fontPairingOrName.google_fonts_url;
  }

  if (!url || loadedFontUrls.has(url)) return;

  const existingLink = document.querySelector(`link[href="${url}"]`);
  if (existingLink) {
    loadedFontUrls.add(url);
    return;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
  loadedFontUrls.add(url);
};
