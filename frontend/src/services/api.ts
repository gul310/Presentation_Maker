const API_BASE_URL = '/api';

// Helper to get or create a persistent anonymous device/session ID for guest rate limiting
export const getGuestSessionId = (): string => {
  let sessionId = localStorage.getItem('presentai_guest_session_id');
  if (!sessionId) {
    sessionId = 'guest_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('presentai_guest_session_id', sessionId);
  }
  return sessionId;
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('presentai_jwt_token');
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('presentai_jwt_token', token);
  } else {
    localStorage.removeItem('presentai_jwt_token');
  }
};

export const purgeSession = () => {
  localStorage.removeItem('presentai_jwt_token');
  const newGuestId = 'guest_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  localStorage.setItem('presentai_guest_session_id', newGuestId);
};

export const apiFetch = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  const guestSessionId = getGuestSessionId();

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    'X-Guest-Session-ID': guestSessionId,
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && endpoint !== '/auth/login') {
      // Clear invalid/expired session token immediately
      purgeSession();
    }
    const errorMsg = data.detail || data.message || `API Error (${response.status})`;
    const error: any = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
};
