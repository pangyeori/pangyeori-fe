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
import { isSessionRejected, sessionRetryDelay } from "@/features/auth/sessionRecovery";
import type { SignInResponse } from "@/types/auth";

type AuthSnapshot = {
  accessToken: string | null;
  sessionKey: string | null;
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
  sessionKey: null,
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

function getAccessTokenExpiresAt(accessToken: string) {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const decoded = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof decoded.exp === "number" && Number.isFinite(decoded.exp) ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

function toSnapshot(session: SignInResponse): AuthSnapshot {
  if (!session || typeof session.accessToken !== "string" || !session.accessToken.trim()
    || typeof session.tokenType !== "string" || !session.tokenType.trim()) {
    throw new Error("로그인 정보를 확인하지 못했습니다.");
  }
  return {
    accessToken: session.accessToken,
    sessionKey: session.accessToken,
    tokenType: session.tokenType,
    accessTokenExpiresAt: getAccessTokenExpiresAt(session.accessToken),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(EMPTY_SESSION);
  const [isReady, setIsReady] = useState(false);
  const sessionRevision = useRef(0);

  const setSession = useCallback((session: SignInResponse) => {
    const next = toSnapshot(session);
    sessionRevision.current += 1;
    setSnapshot(next);
    setIsReady(true);
  }, []);

  const clearAuth = useCallback(() => {
    sessionRevision.current += 1;
    setSnapshot(EMPTY_SESSION);
    setIsReady(true);
  }, []);

  useEffect(() => {
    let active = true;
    const revision = sessionRevision.current;

    requestBootstrapSession()
      .then((session) => {
        if (active && revision === sessionRevision.current) setSession(session);
      })
      .catch(() => {
        if (active && revision === sessionRevision.current) clearAuth();
      });

    return () => {
      active = false;
    };
  }, [clearAuth, setSession]);

  useEffect(() => {
    const expiresAt = snapshot.accessTokenExpiresAt;
    if (!expiresAt) return;
    let active = true;
    let failures = 0;
    const revision = sessionRevision.current;
    const isCurrent = () => active && revision === sessionRevision.current;
    let refreshTimer: ReturnType<typeof setTimeout>;

    const refresh = async () => {
      if (!isCurrent()) return;
      try {
        const session = await refreshAccessToken();
        if (!isCurrent()) return;
        const next = toSnapshot(session);
        // Invalidate old callbacks while retaining the signed-in session identity.
        sessionRevision.current += 1;
        setSnapshot(current => ({ ...next, sessionKey: current.sessionKey }));
      } catch (error) {
        if (!isCurrent()) return;
        if (isSessionRejected(error) || Date.now() >= expiresAt) {
          clearAuth();
          return;
        }
        refreshTimer = setTimeout(refresh, sessionRetryDelay(failures++, expiresAt, Date.now()));
      }
    };

    const refreshIn = Math.max(
      expiresAt - Date.now() - 60_000,
      1000,
    );

    refreshTimer = setTimeout(refresh, refreshIn);
    // A stalled request cannot keep an expired access token alive indefinitely.
    const expiryTimer = setTimeout(() => {
      if (isCurrent()) clearAuth();
    }, Math.max(0, expiresAt - Date.now()));

    return () => {
      active = false;
      clearTimeout(refreshTimer);
      clearTimeout(expiryTimer);
    };
  }, [clearAuth, snapshot]);

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
