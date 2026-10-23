"use client";

import Image from "next/image";
import { useEffect, useRef, type PointerEvent } from "react";
import styles from "./Home.module.css";

export function HomeScene() {
  const scene = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);

  function move(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - left) / width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - top) / height * 2 - 1));
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      scene.current?.style.setProperty("--scene-x", String(x));
      scene.current?.style.setProperty("--scene-y", String(y));
      frame.current = null;
    });
  }

  function reset() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    scene.current?.style.removeProperty("--scene-x");
    scene.current?.style.removeProperty("--scene-y");
  }

  return (
    <div ref={scene} className={styles.scene} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>
      <div className={styles.sceneBackdrop} aria-hidden="true"><span /><span /></div>
      <div className={styles.orbit} aria-hidden="true" />
      <div className={styles.orbitSmall} aria-hidden="true" />
      <div className={styles.sceneTopline}><span aria-hidden="true">✦</span> YOUR AI DEBATE PARTNER</div>
      <div className={`${styles.sceneLayer} ${styles.sceneGreeting}`}><span>반가워요,<br />저는 <strong>판겨리</strong>예요!</span><span aria-hidden="true">✳</span></div>
      <div className={`${styles.sceneLayer} ${styles.sceneMascot}`}><Image src="/images/mascot/owl-judge-gavel.png" alt="판사봉을 들고 대화를 기다리는 부엉이 판겨리" width={512} height={512} sizes="(max-width: 640px) 270px, (max-width: 1024px) 340px, 380px" loading="eager" fetchPriority="high" draggable={false} /></div>
      <div className={`${styles.sceneLayer} ${styles.opinionOne}`} aria-hidden="true"><span className={styles.opinionLabel}><i />나의 생각</span><p>저는 이렇게 생각해요.</p><span className={styles.miniLines}><i /><i /></span></div>
      <div className={`${styles.sceneLayer} ${styles.opinionTwo}`} aria-hidden="true"><span className={styles.opinionLabel}><i />새로운 관점</span><p>그렇게 볼 수도 있겠네요!</p><span className={styles.miniLines}><i /><i /></span></div>
      <span className={styles.sceneSpark} aria-hidden="true">✳</span>
      <span className={styles.sceneDot} aria-hidden="true" />
      <div className={styles.sceneCaption}><span>서로의 이유를 듣고</span><strong>생각의 사이를 잇다.</strong></div>
    </div>
  );
}
