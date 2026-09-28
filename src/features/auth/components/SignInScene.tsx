"use client";

import Image from "next/image";
import type { PointerEvent } from "react";

import styles from "./SignInScene.module.css";

export function SignInScene() {
  function moveScene(event: PointerEvent<HTMLDivElement>) {
    if (
      event.pointerType !== "mouse" ||
      !window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches
    ) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
    event.currentTarget.style.setProperty("--pointer-x", String(x));
    event.currentTarget.style.setProperty("--pointer-y", String(y));
  }

  function resetScene(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.removeProperty("--pointer-x");
    event.currentTarget.style.removeProperty("--pointer-y");
  }

  return (
    <div
      aria-hidden="true"
      className={styles.scene}
      onPointerMove={moveScene}
      onPointerLeave={resetScene}
      onPointerCancel={resetScene}
    >
      <div className={styles.stage}>
        <div className={styles.ground} />
        <div className={`${styles.layer} ${styles.halo}`}>
          <div className={styles.ring} />
        </div>
        <div className={`${styles.layer} ${styles.orbit}`}>
          <div className={styles.orbitRing} />
        </div>
        <div className={`${styles.layer} ${styles.thought}`}>
          <div className={`${styles.card} ${styles.float}`}>
            <div className={styles.label}><span className={styles.dot} />나의 생각</div>
            <p>저는 이렇게 생각해요.</p>
          </div>
        </div>
        <div className={`${styles.layer} ${styles.perspective}`}>
          <div className={`${styles.card} ${styles.float}`}>
            <div className={styles.label}><span className={styles.outlineDot} />또 다른 시선</div>
            <p>그 이유가 궁금해요.</p>
          </div>
        </div>
        <div className={`${styles.layer} ${styles.sphere}`}><div className={styles.float} /></div>
        <div className={`${styles.layer} ${styles.cube}`}><div className={styles.float} /></div>
        <div className={`${styles.layer} ${styles.smallSphere}`}><div className={styles.float} /></div>
        <div className={`${styles.layer} ${styles.spark}`}><div className={styles.float}>✦</div></div>
        <div className={`${styles.layer} ${styles.mascot}`}>
          <div className={styles.float}>
            <Image
              src="/images/mascot/owl-welcoming.png"
              alt=""
              width={512}
              height={512}
              sizes="(min-width: 1024px) 240px, (min-width: 640px) 112px, 96px"
              loading="eager"
              className={styles.image}
              draggable={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
