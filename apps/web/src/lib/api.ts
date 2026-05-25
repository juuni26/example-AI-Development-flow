import axios, { AxiosError, type AxiosInstance } from "axios";
import { clearAuth, readAuth } from "./auth-store";

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

// Subscribers are notified when the interceptor decides the session is dead.
// The router hooks into this to redirect to /login without prop-drilling.
type SessionExpiryHandler = () => void;
const expiryHandlers = new Set<SessionExpiryHandler>();

export function onSessionExpired(handler: SessionExpiryHandler): () => void {
  expiryHandlers.add(handler);
  return () => expiryHandlers.delete(handler);
}

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    // The refresh-token rotation interceptor lands in slice #3. Until then,
    // a 401 just clears state and bounces to /login.
    if (error.response?.status === 401) {
      clearAuth();
      for (const handler of expiryHandlers) handler();
    }
    return Promise.reject(error);
  },
);
