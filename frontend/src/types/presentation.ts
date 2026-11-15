export type SourceType = "prompt" | "document";

export type VisualLayoutType = 
  | "standard"
  | "title"
  | "section_header"
  | "two_column"
  | "conclusion"
  | "process_flow"
  | "flowchart"
  | "timeline"
  | "comparison"
  | "stats_grid"
  | "cards_grid"
  | "table"
  | "hierarchy"
  | "architecture"
  | "diagram"
  | "quote"
  | "image_text"
  | "image";

export interface VisualStepItem {
  step: number;
  label: string;
  description: string;
}

export interface VisualTimelineItem {
  period: string;
  title: string;
  description: string;
}

export interface VisualComparisonColumn {
  heading: string;
  badge?: string;
  points: string[];
}

export interface VisualStatItem {
  metric: string;
  label: string;
  description?: string;
  trend?: string;
}

export interface VisualCardItem {
  title: string;
  description: string;
  icon_name?: string;
}

export interface VisualTableRow {
  [key: string]: string;
}

export interface VisualTableData {
  headers: string[];
  rows: string[][];
}

export interface SlideImage {
  provider: "unsplash" | "custom" | string;
  photo_id?: string;
  url: string;
  regular_url?: string;
  small_url?: string;
  thumb_url?: string;
  download_location?: string;
  photographer_name: string;
  photographer_profile_url: string;
  photo_page_url: string;
  alt_text?: string;
  width?: number;
  height?: number;
  orientation?: "landscape" | "portrait" | "squarish";
  position?: "hero" | "split_left" | "split_right" | "card" | "background";
  selection_reason?: string;
  selected_at?: string;
}

export interface SlideContent {
  subtitle?: string;
  bullet_points?: string[];
  body?: string;
  image?: SlideImage;
  image_url?: string;
  visual_type?: VisualLayoutType;
  steps?: VisualStepItem[];
  timeline_items?: VisualTimelineItem[];
  comparison_columns?: VisualComparisonColumn[];
  stats?: VisualStatItem[];
  cards?: VisualCardItem[];
  table_data?: VisualTableData;
  hierarchy_levels?: { level: number; title: string; subtitle?: string; items?: string[] }[];
  [key: string]: any;
}

export interface Slide {
  id: string | number;
  presentation_id?: string | number;
  slide_number: number;
  title: string;
  content: SlideContent;
  image?: SlideImage;
  image_url?: string;
  layout_type: string;
  speaker_notes?: string;
  source_reference?: string;
  translations?: Record<string, {
    title: string;
    content: SlideContent;
    speaker_notes?: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface Presentation {
  id: string | number;
  user_id?: string | number | null;
  guest_session_id?: string | null;
  title: string;
  source_type: SourceType;
  source_name?: string | null;
  language: string;
  preferred_language?: string;
  audience?: string | null;
  presentation_type?: string | null;
  tone?: string | null;
  slide_count: number;
  status: string;
  
  // Public Sharing & Templates
  visibility?: "private" | "public";
  is_template?: boolean;
  original_presentation_id?: string | number | null;
  
  // Engagement & Metrics
  views_count?: number;
  template_use_count?: number;
  average_rating?: number;
  ratings_count?: number;
  reviews_count?: number;
  
  marketplace?: {
    is_for_sale?: boolean;
    price?: number;
    sales_count?: number;
    published_at?: string;
  };

  theme?: import('../constants/themes').PresentationTheme;
  slides?: Slide[];

  created_at: string;
  updated_at: string;
}

export interface PresentationDetail extends Presentation {
  slides: Slide[];
}

export interface SlideTranslationResponse {
  presentation_id: string | number;
  slide_id: string | number;
  slide_number?: number;
  title: string;
  content: SlideContent;
  speaker_notes?: string;
  target_language: string;
  target_language_code?: string;
  is_original?: boolean;
  cached?: boolean;
}

export interface DocumentSection {
  section_number: number;
  title: string;
  content: string;
}

export interface DocumentContentResponse {
  filename: string;
  file_type: string;
  file_size_bytes: number;
  character_count: number;
  word_count: number;
  page_or_slide_count: number;
  detected_title?: string;
  extracted_text_preview: string;
  sections: DocumentSection[];
}

export interface PresentationCreateInput {
  title: string;
  source_type: SourceType;
  source_name?: string;
  source_content: string;
  language?: string;
  audience?: string;
  presentation_type?: string;
  tone?: string;
  slide_count?: number;
}

export interface PresentationGenerateInput {
  source_type: SourceType;
  prompt?: string;
  custom_prompt?: string;
  source_content?: string;
  source_name?: string;
  title_hint?: string;
  slide_count?: number;
  language?: string;
  audience?: string;
  presentation_type?: string;
  tone?: string;
}

export interface KeyTermItem {
  term: string;
  definition: string;
}

export interface SlideTeachMeResponse {
  presentation_id: string | number;
  slide_id: string | number;
  slide_title: string;
  explanation: string;
  key_terms: KeyTermItem[];
  simple_example?: string;
  summary: string;
  language: string;
}

