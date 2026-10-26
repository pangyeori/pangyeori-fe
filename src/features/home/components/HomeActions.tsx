"use client";

import Link from "next/link";

import { useAuth } from "@/features/auth/context/AuthProvider";
import styles from "./Home.module.css";

export function HomeActions({ variant = "hero" }: { variant?: "hero" | "closing" }) {
  const { isAuthenticated, isReady } = useAuth();
  const debateHref = isAuthenticated ? "/debates/new" : "/signin";
  const closing = variant === "closing";

  return (
    <div className={styles.actions}>
      {isReady ? (
        <Link href={debateHref} className={`${styles.primaryAction} ${closing ? styles.lightAction : ""}`}>
          {closing ? "첫 토론 시작하기" : "토론 시작하기"}<ArrowIcon />
        </Link>
      ) : (
        <button type="button" disabled aria-busy="true" className={`${styles.primaryAction} ${closing ? styles.lightAction : ""}`}>
          {closing ? "첫 토론 시작하기" : "토론 시작하기"}<ArrowIcon />
        </button>
      )}
      {!closing && <a href="#how-it-works" className={styles.secondaryAction}>어떻게 시작하나요? <span aria-hidden="true">↗</span></a>}
    </div>
  );
}

function ArrowIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
