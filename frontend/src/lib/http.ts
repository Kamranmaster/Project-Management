import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

/**
 * Authentication uses the httpOnly `accessToken` / `refreshToken` cookies set by
 * the backend. Tokens are never read or stored by JavaScript.
 */
export const http = axios.create({ baseURL, withCredentials: true });

// Separate instance without interceptors so a failing refresh can't recurse.
const refreshClient = axios.create({ baseURL, withCredentials: true });

// Requests where a 401 means "wrong credentials / bad token", not "session expired".
const NO_REFRESH_ENDPOINTS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh-token",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/logout",
];

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<void> | null = null;
let onSessionExpired: () => void = () => {};

/** Registered once at startup (see main.tsx) to clear auth state when refresh fails. */
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

/**
 * Single-flight refresh: concurrent 401s share one refresh request. This matters
 * because the backend rotates the refresh token, so a second parallel refresh
 * would present an already-replaced token and fail.
 */
function refreshSession(): Promise<void> {
  refreshPromise ??= refreshClient
    .post("/auth/refresh-token")
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const url = original?.url ?? "";

    const shouldRefresh =
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !NO_REFRESH_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));

    if (!shouldRefresh) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      await refreshSession();
    } catch {
      onSessionExpired();
      return Promise.reject(error);
    }

    return http(original);
  },
);
