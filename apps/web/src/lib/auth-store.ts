import type { User } from "@cleandrop/shared";

const ACCESS_KEY = "cleandrop.access";
const USER_KEY = "cleandrop.user";

export interface AuthSnapshot {
  accessToken: string;
  user: User;
}

export function readAuth(): AuthSnapshot | null {
  const accessToken = localStorage.getItem(ACCESS_KEY);
  const userJson = localStorage.getItem(USER_KEY);
  if (!accessToken || !userJson) return null;
  try {
    const user = JSON.parse(userJson) as User;
    return { accessToken, user };
  } catch {
    return null;
  }
}

export function writeAuth(snapshot: AuthSnapshot): void {
  localStorage.setItem(ACCESS_KEY, snapshot.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(snapshot.user));
}

export function clearAuth(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(USER_KEY);
}
