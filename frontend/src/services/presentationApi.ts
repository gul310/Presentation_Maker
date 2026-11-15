import { apiFetch, getAuthToken, getGuestSessionId } from './api';
import type {
  Presentation,
  PresentationDetail,
  PresentationCreateInput,
  PresentationGenerateInput,
  DocumentContentResponse,
  Slide,
  SlideImage,
  SlideTeachMeResponse,
  SlideTranslationResponse,
} from '../types/presentation';

const API_BASE_URL = '/api';

export const uploadDocumentSource = async (file: File): Promise<DocumentContentResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const guestSessionId = getGuestSessionId();

  const headers: Record<string, string> = {
    'X-Guest-Session-ID': guestSessionId,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/upload-source`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.message || `Upload Error (${response.status})`;
    throw new Error(errorMsg);
  }

  return data as DocumentContentResponse;
};

export const createPresentation = async (
  input: PresentationCreateInput
): Promise<PresentationDetail> => {
  return apiFetch<PresentationDetail>('/presentations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

export const generatePresentation = async (
  input: PresentationGenerateInput,
  onProgress?: (stage: string, message: string) => void
): Promise<PresentationDetail> => {
  const content = (input.source_content || input.prompt || '').trim();
  const titleHint = input.title_hint || input.source_name || (content.length > 60 ? content.substring(0, 60) + '...' : content);

  const payload: PresentationGenerateInput = {
    ...input,
    prompt: content,
    source_content: content,
    custom_prompt: input.custom_prompt,
    title_hint: titleHint,
    source_name: input.source_name || titleHint,
  };

  if (onProgress) {
    onProgress('preparing', 'Preparing your presentation...');
  }

  // Submit generation job request
  const submitRes = await apiFetch<any>('/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  // If backend responded with immediate presentation (e.g. sync mode or fast path)
  if (submitRes.slides && submitRes.id) {
    return submitRes as PresentationDetail;
  }

  const jobId = submitRes.job_id || submitRes.id;
  if (!jobId) {
    throw new Error('Server did not return a valid generation job ID.');
  }

  if (onProgress && submitRes.progress_stage && submitRes.progress_message) {
    onProgress(submitRes.progress_stage, submitRes.progress_message);
  }

  // Poll job status every 1.5 seconds (up to 4 minutes / 160 attempts)
  const maxAttempts = 160;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const job = await apiFetch<any>(`/generate/job/${jobId}`);

      if (onProgress && job.progress_stage && job.progress_message) {
        onProgress(job.progress_stage, job.progress_message);
      }

      if (job.status === 'completed' && job.presentation) {
        return job.presentation as PresentationDetail;
      }

      if (job.status === 'failed') {
        const error = new Error(job.error || 'Failed to generate presentation.');
        (error as any).data = {
          detail: job.error,
          error_code: job.error_code,
          message: job.error
        };
        throw error;
      }
    } catch (pollErr: any) {
      if (pollErr.status && pollErr.status < 500) {
        throw pollErr;
      }
      console.warn('Transient poll check error, retrying...', pollErr.message);
    }
  }

  throw new Error('Generation is taking longer than usual. Please check your Dashboard shortly.');
};

export const listPresentations = async (): Promise<Presentation[]> => {
  return apiFetch<Presentation[]>('/presentations');
};

export const getPresentations = listPresentations;

export const getPresentation = async (id: string | number): Promise<PresentationDetail> => {
  return apiFetch<PresentationDetail>(`/presentations/${id}`);
};

export const updatePresentation = async (
  id: string | number,
  data: Partial<Presentation>
): Promise<Presentation> => {
  return apiFetch<Presentation>(`/presentations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deletePresentation = async (id: string | number): Promise<void> => {
  await apiFetch(`/presentations/${id}`, {
    method: 'DELETE',
  });
};

export const createSlide = async (
  presentationId: string | number,
  slideData: Partial<Slide>
): Promise<Slide> => {
  return apiFetch<Slide>(`/presentations/${presentationId}/slides`, {
    method: 'POST',
    body: JSON.stringify(slideData),
  });
};

export const updateSlide = async (
  presentationId: string | number,
  slideId: string | number,
  slideData: Partial<Slide>
): Promise<Slide> => {
  return apiFetch<Slide>(`/presentations/${presentationId}/slides/${slideId}`, {
    method: 'PUT',
    body: JSON.stringify(slideData),
  });
};

export const deleteSlide = async (
  presentationId: string | number,
  slideId: string | number
): Promise<void> => {
  await apiFetch(`/presentations/${presentationId}/slides/${slideId}`, {
    method: 'DELETE',
  });
};

export const reorderSlides = async (
  presentationId: string | number,
  reorderedSlides: { id: string | number; slide_number: number }[]
): Promise<Slide[]> => {
  return apiFetch<Slide[]>(`/presentations/${presentationId}/reorder`, {
    method: 'POST',
    body: JSON.stringify({ reordered_slides: reorderedSlides }),
  });
};

export const teachSlide = async (
  presentationId: string | number,
  slideId: string | number,
  language?: string
): Promise<SlideTeachMeResponse> => {
  return apiFetch<SlideTeachMeResponse>(`/presentation/${presentationId}/slides/${slideId}/teach`, {
    method: 'POST',
    body: JSON.stringify({ language }),
  });
};

export const refineSlide = async (
  presentationId: string | number,
  slideId: string | number,
  action: 'expand' | 'summarize' | 'improve_clarity' | 'custom',
  customInstruction?: string
): Promise<Slide> => {
  return apiFetch<Slide>(`/presentation/${presentationId}/slides/${slideId}/refine`, {
    method: 'POST',
    body: JSON.stringify({
      action,
      custom_instruction: customInstruction,
    }),
  });
};

export const duplicatePresentation = async (id: string | number): Promise<Presentation> => {
  return apiFetch<Presentation>(`/presentations/${id}/duplicate`, {
    method: 'POST',
  });
};

export const renamePresentation = async (id: string | number, title: string): Promise<Presentation> => {
  return apiFetch<Presentation>(`/presentations/${id}/rename`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  });
};

export const translateSlide = async (
  presentationId: string | number,
  slideId: string | number,
  targetLanguage: string
): Promise<SlideTranslationResponse> => {
  return apiFetch<SlideTranslationResponse>(`/presentations/${presentationId}/slides/${slideId}/translate`, {
    method: 'POST',
    body: JSON.stringify({ target_language: targetLanguage }),
  });
};

export const translateDeck = async (
  presentationId: string | number,
  targetLanguage: string
): Promise<{ presentation_id: string; target_language: string; slides: SlideTranslationResponse[] }> => {
  return apiFetch<{ presentation_id: string; target_language: string; slides: SlideTranslationResponse[] }>(
    `/presentations/${presentationId}/translate-deck`,
    {
      method: 'POST',
      body: JSON.stringify({ target_language: targetLanguage }),
    }
  );
};

export type ExportFormat = 'pptx' | 'pdf' | 'json' | 'notes' | 'png' | 'html' | 'package';

export const downloadPresentationExport = async (
  presentationId: string | number,
  format: ExportFormat,
  title: string,
  slideNumber?: number,
  language?: string
): Promise<void> => {
  const token = getAuthToken();
  const guestSessionId = getGuestSessionId();

  const headers: Record<string, string> = {
    'X-Guest-Session-ID': guestSessionId,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const params = new URLSearchParams();
  if (slideNumber !== undefined) params.append('slide', String(slideNumber));
  if (language) params.append('language', language);
  const query = params.toString() ? `?${params.toString()}` : '';
  const url = `${API_BASE_URL}/presentation/${presentationId}/export/${format}${query}`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.detail || `Export failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;

  const contentDisp = response.headers.get('content-disposition');
  let filename = `${title.replace(/\s+/g, '_')}.${format === 'notes' ? 'txt' : (format === 'package' ? 'zip' : format)}`;
  if (contentDisp) {
    const fnStarMatch = contentDisp.match(/filename\*=UTF-8''([^;\s]+)/i);
    if (fnStarMatch && fnStarMatch[1]) {
      try {
        filename = decodeURIComponent(fnStarMatch[1]);
      } catch {
        filename = fnStarMatch[1];
      }
    } else {
      const match = contentDisp.match(/filename="?([^";]+)"?/i);
      if (match && match[1]) {
        filename = match[1];
      }
    }
  }

  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

// ==============================================================================
// Unsplash Image Search, Attachment, and Attribution Services
// ==============================================================================

export interface UnsplashSearchResult {
  query: string;
  page: number;
  per_page: number;
  orientation: string;
  total: number;
  results: SlideImage[];
  rate_limit_remaining: number | null;
}

export const searchUnsplashImages = async (
  query: string,
  page: number = 1,
  perPage: number = 12,
  orientation: string = 'landscape'
): Promise<UnsplashSearchResult> => {
  const params = new URLSearchParams({
    query,
    page: String(page),
    per_page: String(perPage),
    orientation,
  });
  return apiFetch<UnsplashSearchResult>(`/images/search?${params.toString()}`);
};

export const getUnsplashStatus = async (): Promise<{
  status: string;
  configured: boolean;
  rate_limit_total: number | null;
  rate_limit_remaining: number | null;
  provider: string;
}> => {
  return apiFetch(`/images/status`);
};

export const updateSlideImage = async (
  presentationId: string | number,
  slideId: string | number,
  image: Partial<SlideImage>
): Promise<{ message: string; image: SlideImage; slide: Slide }> => {
  return apiFetch(`/presentation/${presentationId}/slides/${slideId}/image`, {
    method: 'POST',
    body: JSON.stringify({ image }),
  });
};

export const removeSlideImage = async (
  presentationId: string | number,
  slideId: string | number
): Promise<{ message: string; slide: Slide }> => {
  return apiFetch(`/presentation/${presentationId}/slides/${slideId}/image`, {
    method: 'DELETE',
  });
};

export const trackImageDownload = async (downloadLocation: string): Promise<void> => {
  if (!downloadLocation) return;
  try {
    await apiFetch(`/images/track-download`, {
      method: 'POST',
      body: JSON.stringify({ download_location: downloadLocation }),
    });
  } catch {
    // Non-fatal tracking
  }
};

