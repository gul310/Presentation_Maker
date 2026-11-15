import { apiFetch } from './api';
import type {
  PracticeSession,
  PracticeSlideResult,
  PracticeReportResponse,
  PracticeHistoryItem,
} from '../types/practice';

export const createPracticeSession = async (
  presentationId: string | number
): Promise<PracticeSession> => {
  return apiFetch<PracticeSession>('/practice/sessions', {
    method: 'POST',
    body: JSON.stringify({ presentation_id: presentationId }),
  });
};

export const getPracticeSession = async (
  sessionId: string | number
): Promise<PracticeSession> => {
  return apiFetch<PracticeSession>(`/practice/sessions/${sessionId}`);
};

export const saveSlideTranscript = async (
  sessionId: string | number,
  slideId: string | number,
  transcript: string,
  durationSeconds: number,
  completionStatus: 'completed' | 'skipped' = 'completed'
): Promise<PracticeSlideResult> => {
  return apiFetch<PracticeSlideResult>(`/practice/sessions/${sessionId}/slides/${slideId}`, {
    method: 'PUT',
    body: JSON.stringify({
      transcript,
      duration_seconds: durationSeconds,
      completion_status: completionStatus,
    }),
  });
};

export const finishPracticeSession = async (
  sessionId: string | number,
  language?: string
): Promise<PracticeReportResponse> => {
  return apiFetch<PracticeReportResponse>(`/practice/sessions/${sessionId}/finish`, {
    method: 'POST',
    body: JSON.stringify({ language }),
  });
};

export const getPracticeReport = async (
  sessionId: string | number
): Promise<PracticeReportResponse> => {
  return apiFetch<PracticeReportResponse>(`/practice/sessions/${sessionId}/report`);
};

export const getPracticeHistory = async (): Promise<PracticeHistoryItem[]> => {
  return apiFetch<PracticeHistoryItem[]>('/practice/history');
};
