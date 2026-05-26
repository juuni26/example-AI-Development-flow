import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import type { RefreshResponse } from "@cleandrop/shared";
import { clearAuth, readAuth, writeTokens } from "./auth-store";
import { notifyAuthChange } from "./use-auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const snapshot = readAuth();
  if (snapshot) {
    config.headers.Authorization = `Bearer ${snapshot.accessToken}`;
  }
  return config;
});

// --- Single-flight refresh -------------------------------------------------
//
// The first 401 starts a refresh; any subsequent 401s that arrive before that
// refresh resolves piggyback on the same promise. Once the refresh resolves,
// every queued request is retried exactly once. If the refresh itself fails,
// the session is dead — clear state and notify the router.

let pendingRefresh: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const snapshot = readAuth();
  if (!snapshot) throw new Error("no refresh token available");
  // Use a bare axios instance so the interceptor does not recurse on us.
  const res = await axios.post<RefreshResponse>(
    `${API_URL}/auth/refresh`,
    { refreshToken: snapshot.refreshToken },
    { headers: { "Content-Type": "application/json" } },
  );
  writeTokens(res.data.accessToken, res.data.refreshToken);
  notifyAuthChange();
  return res.data.accessToken;
}

function getOrStartRefresh(): Promise<string> {
  if (!pendingRefresh) {
    pendingRefresh = performRefresh().finally(() => {
      pendingRefresh = null;
    });
  }
  return pendingRefresh;
}

// Notify the router when the session dies for real (refresh failed or no
// refresh token). The interceptor wires this up; the router subscribes.
type SessionExpiryHandler = () => void;
const expiryHandlers = new Set<SessionExpiryHandler>();

export function onSessionExpired(handler: SessionExpiryHandler): () => void {
  expiryHandlers.add(handler);
  return () => {
    expiryHandlers.delete(handler);
  };
}

function dispatchSessionExpired(): void {
  clearAuth();
  notifyAuthChange();
  for (const handler of expiryHandlers) handler();
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;
    const status = error.response?.status;
    const url = original?.url ?? "";

    const isAuthEndpoint =
      url.includes("/auth/login") || url.includes("/auth/refresh") || url.includes("/auth/logout");

    // Only attempt refresh on first 401 for non-auth endpoints.
    if (status !== 401 || !original || original._retried || isAuthEndpoint) {
      if (status === 401 && !isAuthEndpoint) {
        dispatchSessionExpired();
      }
      return Promise.reject(error);
    }

    original._retried = true;
    try {
      const newAccess = await getOrStartRefresh();
      const retryConfig: AxiosRequestConfig = {
        ...original,
        headers: { ...(original.headers as object), Authorization: `Bearer ${newAccess}` },
      };
      return await api.request(retryConfig);
    } catch {
      dispatchSessionExpired();
      return Promise.reject(error);
    }
  },
);
