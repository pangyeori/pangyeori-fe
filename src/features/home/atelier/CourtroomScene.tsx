"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "motion/react";
import { useMotionPreference } from "./useMotionPreference";
import styles from "./Atelier.module.css";

export function CourtroomScene() {
  const [greeted, setGreeted] = useState(false);
  const [take, setTake] = useState(0);
  const reduced = useMotionPreference();

  return (
    <div className={styles.courtroom}>
      <div className={styles.sceneTop}><span><i /> 판겨리의 작은 토론 법정</span><span aria-hidden="true">✳</span></div>
      <div className={styles.sceneArt}>
        <span className={styles.sceneSun} aria-hidden="true">✦</span>
        <div className={`${styles.speech} ${styles.speechLeft}`}><span>나의 주장</span><strong>내 생각은<br />조금 달라!</strong></div>
        <div className={`${styles.speech} ${styles.speechRight}`}><span>상대의 주장</span><strong>이런 이유도<br />있지 않을까?</strong></div>
        <span className={styles.sceneSpark} aria-hidden="true">✧</span>
        <motion.button type="button" className={styles.judgeButton} data-judge-button aria-label="판겨리에게 인사하기" onClick={() => { setGreeted(true); setTake((value) => value + 1); }} whileHover={reduced ? undefined : { y: -5 }} whileTap={reduced ? undefined : { scale: 0.97 }}>
          <motion.span key={take} className={styles.judgeImage} animate={!reduced && take > 0 ? { rotate: [0, -8, 6, -3, 0], y: [0, -14, 0, -5, 0] } : { rotate: 0, y: 0 }} transition={{ duration: 0.65 }}>
            <Image src="/images/mascot/owl-judge-gavel.png" alt="판사 망치를 들고 양쪽 이야기를 듣는 판겨리" width={512} height={512} sizes="(max-width: 760px) 230px, 310px" priority />
          </motion.span>
        </motion.button>
        {greeted && <motion.span key={`hello-${take}`} className={styles.helloBurst} aria-hidden="true" initial={reduced ? false : { scale: 0.4, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: -9, opacity: 1 }} transition={{ type: "spring", stiffness: 360, damping: 16 }}>반가워!</motion.span>}
        <div className={styles.judgeBench} aria-hidden="true"><span>AI 토론 판정</span><i>✦</i></div>
      </div>
      <div className={styles.sceneCaption}><span className={styles.captionDot} aria-hidden="true" /><p aria-live="polite" data-judge-message>{greeted ? "반가워요! 양쪽의 이야기를 들려주세요." : "판겨리를 톡! 눌러 인사해보세요."}</p><span aria-hidden="true">↖</span></div>
    </div>
  );
}
