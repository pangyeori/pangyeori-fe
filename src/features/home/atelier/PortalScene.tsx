"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { createPrism } from "./createPrism";
import { useMotionPreference } from "./useMotionPreference";
import styles from "./Portal.module.css";

export function PortalScene() {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof createPrism> | null>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [greeting, setGreeting] = useState(false);
  const reduced = useMotionPreference();

  useEffect(() => {
    const element = host.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    // Three.js is a separate chunk: the page and mascot render before it loads.
    void import("./createPrism").then(({ createPrism }) => {
      if (cancelled) return;
      try {
        control.current = createPrism(element);
        control.current.setPaused(pausedRef.current);
      } catch {
        // CSS artwork remains visible when WebGL is unavailable.
        element.dataset.prismState = "fallback";
      }
    }).catch(() => { if (!cancelled) element.dataset.prismState = "fallback"; });
    return () => { cancelled = true; control.current?.dispose(); control.current = null; };
  }, [reduced]);

  useEffect(() => { pausedRef.current = paused; control.current?.setPaused(paused); }, [paused]);

  return (
    <div className={styles.portalScene}>
      <div ref={host} className={styles.prismHost} data-prism-host aria-hidden="true"><div className={styles.prismFallback} /></div>
      <div className={styles.portalOrbit} aria-hidden="true" />
      <span className={styles.portalCoordinate} aria-hidden="true">35° DIFFERENT / 100% YOU</span>
      <span className={styles.portalStar} aria-hidden="true">✧</span>
      <div className={styles.mascotPosition}>
        <motion.button type="button" className={styles.mascotButton} onClick={() => setGreeting(!greeting)} aria-label="판겨리에게 인사하기" aria-pressed={greeting} whileHover={reduced ? undefined : { y: -6 }} whileTap={reduced ? undefined : { scale: 0.95 }}>
          <motion.div animate={{ rotate: reduced ? 0 : greeting ? [0, -8, 7, -4, 0] : 0 }} transition={{ duration: 0.65 }}>
            <Image src={greeting ? "/images/mascot/owl-welcoming.png" : "/images/mascot/owl-holding-star.png"} alt="" width={512} height={512} sizes="(max-width: 760px) 200px, 260px" loading="eager" fetchPriority="high" draggable={false} />
          </motion.div>
        </motion.button>
        <div className={styles.greeting} aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={String(greeting)} initial={{ opacity: 0, y: reduced ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>{greeting ? "반가워요! 당신의 생각이 궁금해요." : "별처럼 반짝이는 생각, 같이 나눠요."}</motion.p>
          </AnimatePresence>
        </div>
      </div>
      <button className={styles.pause} type="button" aria-pressed={paused || Boolean(reduced)} disabled={Boolean(reduced)} onClick={() => setPaused(!paused)}>{reduced ? "움직임 최소화 적용 중" : paused ? "빛의 움직임 재생" : "빛의 움직임 멈추기"}<span aria-hidden="true">{paused || reduced ? "▷" : "Ⅱ"}</span></button>
    </div>
  );
}
