"use client";

import { useRef, useEffect, useCallback, type PointerEvent } from "react";
import { useMotionPreference } from "../atelier/useMotionPreference";
import styles from "./ArgumentCards.module.css";

export function ArgumentCards({ active = true, presentation = "stage" }: { active?: boolean; presentation?: "stage" | "static" }) {
  const reduced = useMotionPreference();
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const reset = useCallback(() => {
    cancelAnimationFrame(frame.current); frame.current = 0;
    root.current?.querySelectorAll<HTMLElement>("[data-argument-card]").forEach((card) => {
      card.style.removeProperty("--tilt-x"); card.style.removeProperty("--tilt-y");
    });
  }, []);
  useEffect(() => { if (!active || reduced) reset(); return () => cancelAnimationFrame(frame.current); }, [active, reduced, reset]);
  const move = (event: PointerEvent<HTMLElement>) => {
    if (reduced || event.pointerType !== "mouse") return;
    const card = event.currentTarget, rect = card.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      card.style.setProperty("--tilt-x", `${(0.5 - y) * 5}deg`);
      card.style.setProperty("--tilt-y", `${(x - 0.5) * 6}deg`);
      frame.current = 0;
    });
  };
  return <div ref={root} className={styles.deck} data-argument-deck data-active={active} data-presentation={presentation}>
    {(["focus", "distraction"] as const).map((tone, index) => <article key={tone} className={styles.card} data-argument-card data-tone={tone} onPointerMove={move} onPointerLeave={reset}>
      <div className={styles.entrance}><div className={styles.tilt} data-card-tilt>
        <div className={styles.face}>
          <p className={styles.top}>참여자 {index === 0 ? "A · 찬성" : "B · 반대"}</p>
          <h3>{index === 0 ? <>음악이 주는<br /><strong>집중</strong></> : <>가사가 주는<br /><strong>방해</strong></>}</h3>
        </div>
      </div></div>
    </article>)}
  </div>;
}
