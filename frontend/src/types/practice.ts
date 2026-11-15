export interface PracticeSlideResult {
  id: string | number;
  practice_session_id?: string | number;
  slide_id: string | number;
  transcript: string;
  duration_seconds: number;
  words_spoken: number;
  words_per_minute?: number;
  completion_status: string;
  score?: number;
  feedback?: any;
  created_at?: string;
}

export interface PracticeSession {
  id: string | number;
  user_id?: string | number | null;
  guest_session_id?: string | null;
  presentation_id: string | number;
  presentation_title?: string;
  started_at: string;
  completed_at?: string;
  duration_seconds: number;
  total_slides: number;
  completed_slides: number;
  status: string;
  overall_score?: number;
  created_at: string;
  updated_at: string;
}

export interface PracticeSlideEvaluation {
  slide_number: number;
  score: number;
  what_went_well?: string;
  what_to_improve?: string;
  missing_points?: string[];
  pacing_feedback?: string;
}

export interface PracticeEvaluation {
  overall_score: number;
  delivery_score?: number;
  content_score?: number;
  structure_score?: number;
  clarity_score?: number;
  timing_score?: number;
  strengths: string[];
  weaknesses?: string[];
  areas_for_improvement?: string[];
  recommendations?: string[];
  slide_feedback?: PracticeSlideEvaluation[];
  slide_evaluations?: any[];
  summary: string;
}

export interface PracticeComparison {
  previous_session_id?: string | number;
  previous_score?: number;
  score_delta?: number;
  previous_wpm?: number;
  wpm_delta?: number;
  previous_completion_rate?: number;
  completion_rate_delta?: number;
}

export interface PracticeMetrics {
  total_speaking_time_seconds: number;
  total_words_spoken: number;
  average_wpm?: number;
  completion_percentage: number;
}

export interface PracticeReportResponse {
  session?: PracticeSession;
  session_id?: string | number;
  presentation_id?: string | number;
  presentation_title: string;
  language?: string;
  duration_seconds?: number;
  total_slides?: number;
  completed_slides?: number;
  overall_score?: number;
  metrics?: PracticeMetrics;
  report?: any;
  evaluation?: PracticeEvaluation;
  slide_results: PracticeSlideResult[];
  comparison?: PracticeComparison;
}

export interface PracticeHistoryItem {
  id: string | number;
  presentation_id: string | number;
  presentation_title: string;
  language?: string;
  started_at: string;
  duration_seconds: number;
  overall_score?: number;
  status: string;
  completed_slides: number;
  total_slides: number;
}
