"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  clearSession,
  getAccessToken,
  getStoredUser,
  persistSignUpSession,
} from "@/features/auth/lib/session";
import type { AuthUser } from "@/types/auth";

const AUTH_EVENT = "pangyeori-auth";

type AuthSnapshot = {
  user: AuthUser | null;
  accessToken: string | null;
};

type AuthContextValue = AuthSnapshot & {
  isReady: boolean;
  isAuthenticated: boolean;
  setSession: (
    accessToken: string,
    user: AuthUser,
    rememberMe: boolean,
  ) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const SERVER_SNAPSHOT: AuthSnapshot = { user: null, accessToken: null };

let cachedClientSnapshot: AuthSnapshot = SERVER_SNAPSHOT;

function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener(AUTH_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(AUTH_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function sameUser(a: AuthUser | null, b: AuthUser | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id && a.email === b.email && a.nickname === b.nickname;
}

function getClientSnapshot(): AuthSnapshot {
  const accessToken = getAccessToken();
  const user = getStoredUser();

  if (
    cachedClientSnapshot.accessToken === accessToken &&
    sameUser(cachedClientSnapshot.user, user)
  ) {
    return cachedClientSnapshot;
  }

  cachedClientSnapshot = { user, accessToken };
  return cachedClientSnapshot;
}

function getServerSnapshot(): AuthSnapshot {
  return SERVER_SNAPSHOT;
}

function emitAuthChange() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const setSession = useCallback(
    (token: string, nextUser: AuthUser, rememberMe: boolean) => {
      persistSignUpSession(token, nextUser, rememberMe);
      emitAuthChange();
    },
    [],
  );

  const clearAuth = useCallback(() => {
    clearSession();
    emitAuthChange();
  }, []);

  const value = useMemo(
    () => ({
      ...snapshot,
      isReady: true,
      isAuthenticated: Boolean(snapshot.user && snapshot.accessToken),
      setSession,
      clearAuth,
    }),
    [snapshot, setSession, clearAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth는 AuthProvider 안에서만 사용할 수 있습니다.");
  }
  return ctx;
}
