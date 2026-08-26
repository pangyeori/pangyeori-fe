"use client";

import { useSyncExternalStore } from "react";

type PasswordResetSession = {
  email: string;
  passwordResetToken: string;
};

let session: PasswordResetSession | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function setPasswordResetSession(next: PasswordResetSession) {
  session = next;
  emitChange();
}

export function clearPasswordResetSession() {
  session = null;
  emitChange();
}

export function usePasswordResetSession() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => session,
    () => null,
  );
}
