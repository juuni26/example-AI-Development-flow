import { useSyncExternalStore } from "react";
import { AUTH_STORAGE_KEYS, clearAuth, writeAuth, type AuthSnapshot } from "./auth-store";

const subscribers = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  // Cross-tab sync: if another tab logs in or out, mirror that here.
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === AUTH_STORAGE_KEYS.access ||
      e.key === AUTH_STORAGE_KEYS.user ||
      e.key === AUTH_STORAGE_KEYS.refresh
    ) {
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    subscribers.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function notify(): void {
  for (const s of subscribers) s();
}

// useSyncExternalStore requires reference-stable snapshots. We cache by the
// raw localStorage *strings* — only running JSON.parse when the user blob
// actually changes. This is the difference between parsing JSON 60×/sec
// during noisy parent re-renders and parsing once per real change.
let cachedAccess: string | null = null;
let cachedRefresh: string | null = null;
let cachedUserJson: string | null = null;
let cachedSnapshot: AuthSnapshot | null = null;

function getStableSnapshot(): AuthSnapshot | null {
  const access = localStorage.getItem(AUTH_STORAGE_KEYS.access);
  const refresh = localStorage.getItem(AUTH_STORAGE_KEYS.refresh);
  const userJson = localStorage.getItem(AUTH_STORAGE_KEYS.user);

  if (!access || !refresh || !userJson) {
    cachedAccess = null;
    cachedRefresh = null;
    cachedUserJson = null;
    cachedSnapshot = null;
    return null;
  }

  if (
    access === cachedAccess &&
    refresh === cachedRefresh &&
    userJson === cachedUserJson &&
    cachedSnapshot
  ) {
    return cachedSnapshot;
  }

  try {
    const user = JSON.parse(userJson) as AuthSnapshot["user"];
    cachedAccess = access;
    cachedRefresh = refresh;
    cachedUserJson = userJson;
    cachedSnapshot = { accessToken: access, refreshToken: refresh, user };
    return cachedSnapshot;
  } catch {
    cachedSnapshot = null;
    return null;
  }
}

export function useAuth(): {
  auth: AuthSnapshot | null;
  setAuth: (snapshot: AuthSnapshot) => void;
  signOut: () => void;
} {
  const auth = useSyncExternalStore(subscribe, getStableSnapshot, () => null);
  return {
    auth,
    setAuth: (snapshot) => {
      writeAuth(snapshot);
      notify();
    },
    signOut: () => {
      clearAuth();
      notify();
    },
  };
}

/** Imperative side-channel for non-React code (axios interceptor) to nuke auth. */
export function notifyAuthChange(): void {
  notify();
}
