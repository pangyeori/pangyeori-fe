"use client";

import Image from "next/image";
import type { PointerEvent } from "react";

import motion from "./SignInScene.module.css";
import styles from "./RegisterScene.module.css";

export function RegisterScene() {
  function moveScene(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || !window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
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
    <div aria-hidden="true" className={`${motion.scene} ${styles.scene}`} onPointerMove={moveScene} onPointerLeave={resetScene} onPointerCancel={resetScene}>
      <div className={motion.stage}>
        <div className={motion.ground} />
        <div className={`${motion.layer} ${styles.frame}`}><div className={styles.frameShape} /></div>
        <div className={`${motion.layer} ${styles.outline}`}><div className={styles.outlineShape} /></div>
        <div className={`${motion.layer} ${styles.welcome}`}>
          <div className={`${motion.float} ${styles.card}`}>
            <div className={styles.label}><span className={styles.badge}>✦</span>반가워요!</div>
            <p>당신의 자리를 준비했어요.</p>
          </div>
        </div>
        <div className={`${motion.layer} ${styles.nameCard}`}>
          <div className={`${motion.float} ${styles.card}`}>
            <div className={styles.label}><span className={styles.avatar}>☺</span>나만의 시작</div>
            <p>어떤 이름으로 만날까요?</p>
          </div>
        </div>
        <div className={`${motion.layer} ${styles.star}`}><div className={motion.float}>✦</div></div>
        <div className={`${motion.layer} ${styles.pearl}`}><div className={motion.float} /></div>
        <div className={`${motion.layer} ${styles.confetti}`}><div className={motion.float} /></div>
        <div className={`${motion.layer} ${motion.mascot}`}>
          <div className={motion.float}>
            <Image src="/images/mascot/owl-holding-star.png" alt="" width={512} height={512} sizes="(min-width: 1024px) 240px, (min-width: 640px) 112px, 96px" loading="eager" className={motion.image} draggable={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
