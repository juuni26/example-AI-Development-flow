import { useSyncExternalStore } from "react";
import { clearAuth, readAuth, writeAuth, type AuthSnapshot } from "./auth-store";

const subscribers = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  // Cross-tab sync: if another tab logs in or out, mirror that here.
  const onStorage = (e: StorageEvent) => {
    if (e.key === "cleandrop.access" || e.key === "cleandrop.user") cb();
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

// Cached snapshot: useSyncExternalStore requires reference-stable reads, but
// readAuth() reconstructs the object on every call. We cache the last result
// and only mint a new object when the underlying values actually change.
let cachedSnapshot: AuthSnapshot | null = null;
function getStableSnapshot(): AuthSnapshot | null {
  const next = readAuth();
  if (next === null) {
    cachedSnapshot = null;
    return null;
  }
  if (
    cachedSnapshot &&
    cachedSnapshot.accessToken === next.accessToken &&
    cachedSnapshot.refreshToken === next.refreshToken &&
    cachedSnapshot.user.id === next.user.id &&
    cachedSnapshot.user.email === next.user.email &&
    cachedSnapshot.user.role === next.user.role
  ) {
    return cachedSnapshot;
  }
  cachedSnapshot = next;
  return next;
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
