import type { User } from "@cleandrop/shared";

const ACCESS_KEY = "cleandrop.access";
const REFRESH_KEY = "cleandrop.refresh";
const USER_KEY = "cleandrop.user";

export interface AuthSnapshot {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export function readAuth(): AuthSnapshot | null {
  const accessToken = localStorage.getItem(ACCESS_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  const userJson = localStorage.getItem(USER_KEY);
  if (!accessToken || !refreshToken || !userJson) return null;
  try {
    const user = JSON.parse(userJson) as User;
    return { accessToken, refreshToken, user };
  } catch {
    return null;
  }
}

export function writeAuth(snapshot: AuthSnapshot): void {
  localStorage.setItem(ACCESS_KEY, snapshot.accessToken);
  localStorage.setItem(REFRESH_KEY, snapshot.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(snapshot.user));
}

/** Updates just the token pair (e.g. after axios single-flight refresh). */
export function writeTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearAuth(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export const AUTH_STORAGE_KEYS = {
  access: ACCESS_KEY,
  refresh: REFRESH_KEY,
  user: USER_KEY,
} as const;
