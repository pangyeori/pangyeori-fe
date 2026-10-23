"use client";

import Link from "next/link";
import { motion, useSpring } from "motion/react";
import { useAuth } from "@/features/auth/context/AuthProvider";
import type { PointerEvent } from "react";
import { useMotionPreference } from "./useMotionPreference";
import styles from "./Atelier.module.css";

export function AtelierAction({ closing = false }: { closing?: boolean }) {
  const { isAuthenticated, isReady } = useAuth();
  const reduced = useMotionPreference();
  const x = useSpring(0, { stiffness: 240, damping: 18, mass: 0.5 });
  const y = useSpring(0, { stiffness: 240, damping: 18, mass: 0.5 });
  const reset = () => { x.set(0); y.set(0); };
  function attract(event: PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - bounds.left - bounds.width / 2) * 0.12);
    y.set((event.clientY - bounds.top - bounds.height / 2) * 0.18);
  }
  const label = closing ? "내 토론 시작하기" : "토론 시작하기";
  return (
    <div className={styles.magneticArea} onPointerMove={attract} onPointerLeave={reset} onPointerCancel={reset} onBlur={reset}>
      <motion.div style={{ x: reduced ? 0 : x, y: reduced ? 0 : y }}>
        {isReady ? <Link className={styles.cta} data-atelier-cta href={isAuthenticated ? "/debates/new" : "/signin"}>{label}<span aria-hidden="true">↗</span></Link> : <button type="button" className={styles.cta} disabled aria-busy="true">{label}<span aria-hidden="true">↗</span></button>}
      </motion.div>
    </div>
  );
}
