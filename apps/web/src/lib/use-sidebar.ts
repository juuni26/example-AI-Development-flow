import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cleandrop.sidebar-collapsed";

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function useSidebarCollapsed(): {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (next: boolean) => void;
} {
  const [collapsed, setCollapsedState] = useState<boolean>(readInitial);

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Storage might be unavailable (Safari private mode, quota); the toggle
      // still works for this session, just not persisted.
    }
  }, []);

  const toggle = useCallback(() => setCollapsed(!collapsed), [collapsed, setCollapsed]);

  // Cross-tab sync — if the user toggles in one tab, mirror in the other.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setCollapsedState(e.newValue === "1");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { collapsed, toggle, setCollapsed };
}
