"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { refreshAccessToken } from "@/features/auth/api/refresh";
import type { SignInResponse } from "@/types/auth";

type AuthSnapshot = {
  accessToken: string | null;
  tokenType: string;
  accessTokenExpiresAt: number | null;
};

type AuthContextValue = AuthSnapshot & {
  isReady: boolean;
  isAuthenticated: boolean;
  setSession: (session: SignInResponse) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const EMPTY_SESSION: AuthSnapshot = {
  accessToken: null,
  tokenType: "Bearer",
  accessTokenExpiresAt: null,
};

let bootstrapRequest: Promise<SignInResponse> | null = null;

function requestBootstrapSession() {
  bootstrapRequest ??= refreshAccessToken().finally(() => {
    bootstrapRequest = null;
  });
  return bootstrapRequest;
}

function toSnapshot(session: SignInResponse): AuthSnapshot {
  return {
    accessToken: session.accessToken,
    tokenType: session.tokenType,
    accessTokenExpiresAt: Date.now() + session.accessTokenExpiresIn * 1000,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(EMPTY_SESSION);
  const [isReady, setIsReady] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSession = useCallback((session: SignInResponse) => {
    setSnapshot(toSnapshot(session));
  }, []);

  const clearAuth = useCallback(() => {
    setSnapshot(EMPTY_SESSION);
  }, []);

  useEffect(() => {
    let active = true;

    requestBootstrapSession()
      .then((session) => {
        if (active) setSession(session);
      })
      .catch(() => {
        if (active) clearAuth();
      })
      .finally(() => {
        if (active) setIsReady(true);
      });

    return () => {
      active = false;
    };
  }, [clearAuth, setSession]);

  useEffect(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    if (!snapshot.accessTokenExpiresAt) return;

    const refreshIn = Math.max(
      snapshot.accessTokenExpiresAt - Date.now() - 60_000,
      0,
    );

    refreshTimer.current = setTimeout(() => {
      refreshAccessToken().then(setSession).catch(clearAuth);
    }, refreshIn);

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [clearAuth, setSession, snapshot.accessTokenExpiresAt]);

  const value = useMemo(
    () => ({
      ...snapshot,
      isReady,
      isAuthenticated: Boolean(snapshot.accessToken),
      setSession,
      clearAuth,
    }),
    [snapshot, isReady, setSession, clearAuth],
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
