"use client";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/AuthProvider";
import styles from "./ScrollHome.module.css";

const label = <>토론 시작하기 <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" /></svg></>;

export function StoryAction() {
  const { isAuthenticated, isReady } = useAuth();
  return isReady
    ? <Link className={styles.cta} data-story-cta href={isAuthenticated ? "/debates/new" : "/signin"}>{label}</Link>
    : <><button type="button" className={`${styles.cta} ${styles.pendingCta}`} disabled aria-busy="true">{label}</button><noscript><a className={styles.cta} data-story-cta href="/signin">{label}</a></noscript></>;
}
