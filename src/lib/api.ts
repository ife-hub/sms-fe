import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth-store";
import { isTokenExpiring } from "@/lib/jwt";
import type { LoginResponse } from "@/types";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/** Bare client with no interceptors. Used only for /auth/refresh so it can never recurse. */
const refreshClient = axios.create({ baseURL, withCredentials: true });

export const api = axios.create({
  baseURL,
  withCredentials: true, // sends the httpOnly refresh cookie
  headers: { "Content-Type": "application/json" },
});

/** One in-flight refresh shared by every request that finds the token expired. */
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<LoginResponse>("/auth/refresh")
      .then(({ data }) => {
        useAuthStore.getState().setSession(data.accessToken, data.user);
        return data.accessToken;
      })
      .catch((error) => {
        useAuthStore.getState().clear();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.assign("/login?reason=expired");
        }
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/** Called once on app start to restore a session from the refresh cookie. */
export async function bootstrapSession() {
  try {
    const { data } = await refreshClient.post<LoginResponse>("/auth/refresh");
    useAuthStore.getState().setSession(data.accessToken, data.user);
  } catch {
    useAuthStore.getState().clear();
  }
}

const PUBLIC_PATHS = ["/auth/login", "/auth/refresh", "/auth/forgot-password"];

// Request interceptor: attach the access token, refreshing it first if it has expired.
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (PUBLIC_PATHS.some((p) => config.url?.startsWith(p))) return config;

  let token = useAuthStore.getState().accessToken;
  if (!token || isTokenExpiring(token)) {
    token = await refreshAccessToken();
  }
  config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

// Safety net: if the server still answers 401 (e.g. revoked session), refresh once and retry.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isPublic = PUBLIC_PATHS.some((p) => original?.url?.startsWith(p));
    if (error.response?.status === 401 && original && !original._retried && !isPublic) {
      original._retried = true;
      const token = await refreshAccessToken();
      original.headers.set("Authorization", `Bearer ${token}`);
      return api(original);
    }
    return Promise.reject(error);
  },
);

/** Pull a human-readable message out of an API error. */
export function getErrorMessage(error: unknown, fallback = "Something went wrong. Try again.") {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data.message.join(", ");
    if (data?.message) return data.message;
  }
  return fallback;
}

export function getStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
