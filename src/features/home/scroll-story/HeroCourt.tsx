"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useMotionPreference } from "../atelier/useMotionPreference";
import styles from "./HeroCourt.module.css";

export function HeroCourt() {
  const [greeting, setGreeting] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useMotionPreference();
  const court = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = court.current;
    if (!element || reduced) return;
    let inView = false;
    const update = () => {
      element.dataset.floating = String(inView && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio >= .25;
      update();
    }, { threshold: [0, .25] });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      delete element.dataset.floating;
    };
  }, [reduced]);

  return (
    <div ref={court} className={styles.court} data-hero-court data-paused={paused}>
      <div className={styles.shadow} aria-hidden="true" />
      <div className={styles.character} data-hero-float>
        <motion.button
          type="button" className={styles.judge} data-hero-judge
          aria-label={reduced ? "판겨리에게 인사하기" : "판겨리 움직임 일시정지"}
          aria-pressed={reduced ? undefined : paused}
          onClick={() => { setGreeting((value) => value + 1); if (!reduced) setPaused((value) => !value); }}
          whileHover={reduced ? undefined : { y: -2 }} whileTap={reduced ? undefined : { scale: .99 }}
        >
          <motion.span key={greeting} className={styles.judgeArt}
            animate={!reduced && !paused && greeting > 0 ? { rotate: [0, -1.5, 1, 0], y: [0, -3, 0] } : { rotate: 0, y: 0 }}
            transition={{ duration: .65 }}
          >
            <Image src="/images/mascot/owl-judge-gavel.png" width={512} height={512} sizes="(max-width: 767px) 280px, 380px" alt="망치를 들고 두 이야기를 듣는 판겨리" priority onLoad={() => { if (court.current) court.current.dataset.ready = "true"; }} />
          </motion.span>
        </motion.button>
      </div>
      <p className={styles.greeting} aria-live="polite" data-hero-greeting>{greeting ? reduced ? "반가워요! 어떤 생각을 들려줄 건가요?" : paused ? "반가워요! 움직임을 잠시 멈췄어요." : "움직임을 다시 재생해요." : ""}</p>
    </div>
  );
}
