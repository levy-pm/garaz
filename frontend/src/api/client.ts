import axios from 'axios';

export const API_UNAUTHORIZED_EVENT = 'motometr:unauthorized';

function resolveApiBaseUrl() {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!envBaseUrl) return '/api';
  if (envBaseUrl.startsWith('/')) return envBaseUrl;

  // In production we prefer same-origin API to preserve session cookies.
  if (typeof window !== 'undefined') {
    try {
      const parsed = new URL(envBaseUrl);
      const sameOrigin = parsed.origin === window.location.origin;
      const allowCrossOrigin = import.meta.env.VITE_ALLOW_CROSS_ORIGIN_API === '1';
      if (!sameOrigin && !allowCrossOrigin) return '/api';
    } catch {
      return '/api';
    }
  }

  return envBaseUrl;
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
});

api.interceptors.response.use(
  response => response,
  error => {
    if (typeof window !== 'undefined' && error?.response?.status === 401) {
      window.dispatchEvent(new CustomEvent(API_UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);

export function extractApiError(err: any, fallback = 'Wystapil blad') {
  const data = err?.response?.data;

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }
  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error;
  }
  if (Array.isArray(data?.errors) && data.errors.length > 0 && typeof data.errors[0]?.msg === 'string') {
    return data.errors[0].msg;
  }
  if (typeof err?.message === 'string' && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

export default api;
