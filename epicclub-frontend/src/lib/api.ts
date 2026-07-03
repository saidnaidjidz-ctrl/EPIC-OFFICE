import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

// ─── Constants ────────────────────────────────────────────────────────────────

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ─── Axios Instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,          // Always send httpOnly cookies
  timeout: 60_000,                // 60s to handle Render free-tier cold starts
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
// Attaches CSRF token and JWT access token if present

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Read CSRF token from meta tag (set by SSR layout)
    if (typeof document !== 'undefined') {
      const csrfToken = document
        .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
        ?.getAttribute('content');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    // Attach Bearer Access Token if present
    const sessionToken = Cookies.get('epicclub_session');
    if (sessionToken) {
      config.headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
// Handles 401 → refresh → retry, and 403 → redirect

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  refreshQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      p.resolve();
    }
  });
  refreshQueue = [];
};

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // ── 401 Unauthorized → try refresh ──────────────────────────────────────
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Queue this request while refresh is in progress
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = Cookies.get('epicclub_refresh');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call backend refresh endpoint with the refresh token in the body
        const res = await axios.post<{
          success: boolean;
          tokens: { accessToken: string; refreshToken: string };
        }>(
          `${API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken },
          { withCredentials: true }
        );

        const newTokens = res.data.tokens;
        const cookieOpts: Cookies.CookieAttributes = {
          expires: 1 / 96, // 15 min
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        };
        Cookies.set('epicclub_session', newTokens.accessToken, cookieOpts);
        Cookies.set('epicclub_refresh', newTokens.refreshToken, {
          expires: 7, // 7 days
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        });

        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Refresh failed — clear auth state and redirect to login
        if (typeof window !== 'undefined') {
          const { useAuthStore } = await import('@/store/authStore');
          useAuthStore.getState().logout();
          if (!originalRequest.url?.includes('/auth/me') && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login?session=expired';
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 403 Forbidden ────────────────────────────────────────────────────────
    if (error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        window.location.href = '/403';
      }
    }

    // ── Normalize error shape ────────────────────────────────────────────────
    const apiError = {
      message:
        (error.response?.data as { message?: string })?.message ||
        error.message ||
        'An unexpected error occurred',
      status: error.response?.status,
      errors: (error.response?.data as { errors?: unknown[] })?.errors,
      code: (error.response?.data as { code?: string })?.code,
    };

    return Promise.reject(apiError);
  }
);

// ─── Typed Request Helpers ────────────────────────────────────────────────────

export const apiClient = {
  get: <T>(url: string, params?: Record<string, unknown>): Promise<T> =>
    api.get<T>(url, { params }).then((r) => r.data),

  post: <T>(url: string, data?: unknown): Promise<T> =>
    api.post<T>(url, data).then((r) => r.data),

  patch: <T>(url: string, data?: unknown): Promise<T> =>
    api.patch<T>(url, data).then((r) => r.data),

  put: <T>(url: string, data?: unknown): Promise<T> =>
    api.put<T>(url, data).then((r) => r.data),

  delete: <T>(url: string): Promise<T> =>
    api.delete<T>(url).then((r) => r.data),
};

export default api;
