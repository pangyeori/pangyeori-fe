import type { AuthUser } from "@/types/auth";

const ACCESS_TOKEN_KEY = "pangyeori_access_token";
const USER_KEY = "pangyeori_user";

function storageFor(rememberMe: boolean) {
  return rememberMe ? localStorage : sessionStorage;
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function persistSignUpSession(
  accessToken: string,
  user: AuthUser,
  rememberMe: boolean,
) {
  clearSession();
  const storage = storageFor(rememberMe);
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(ACCESS_TOKEN_KEY) ??
    sessionStorage.getItem(ACCESS_TOKEN_KEY)
  );
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw =
    localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}
