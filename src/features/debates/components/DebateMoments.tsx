"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { DebateStage, DebateVerdict, Position } from "../api/debates";
import { latestVerdict, nextDebateMoment, type DebateMoment, type MomentSnapshot } from "../debatePresentation";
import styles from "./DebateMoments.module.css";

const images = {
  turn: "/images/mascot/owl-welcoming.png",
  result: "/images/mascot/owl-judge-gavel.png",
  draw: "/images/mascot/owl-justice-scales.png",
  defeat: "/images/mascot/owl-sad-sweat.png",
  victory: "/images/mascot/owl-celebrating-confetti.png",
};

export function DebateMoments({ stage, verdicts, myPosition }: {
  stage: DebateStage; verdicts: DebateVerdict[] | undefined; myPosition: Position | undefined;
}) {
  const previous = useRef<MomentSnapshot | null>(null);
  const seen = useRef(new Set<string>());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [moment, setMoment] = useState<DebateMoment | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!myPosition || !verdicts) return;
    const next = { stage, verdict: latestVerdict(verdicts), myPosition };
    const cue = nextDebateMoment(previous.current, next);
    previous.current = next;
    if (!cue || seen.current.has(cue.key)) return;
    seen.current.add(cue.key);
    timers.current.forEach(clearTimeout);
    // Schedule outside the effect; the current visual cue owns its timers, not polling renders.
    timers.current = [setTimeout(() => {
      setMoment(cue);
      setLeaving(false);
    }, 0), setTimeout(() => setLeaving(true), cue.scene === "turn" ? 1500 : 2600),
    setTimeout(() => setMoment(null), cue.scene === "turn" ? 1760 : 2860)];
  }, [stage, verdicts, myPosition]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return <>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{moment ? `${moment.caption}. ${moment.title}` : ""}</span>
    {moment ? (
      <div key={moment.key} className={`${styles.moment} ${leaving ? styles.leaving : ""}`} data-scene={moment.scene} data-position={moment.position} data-debate-moment aria-hidden="true">
        <div className={styles.stage}>
          <span className={styles.caption}>{moment.caption}</span>
          <div className={styles.art}>
            <span className={styles.burst} />
            <span className={styles.ring} />
            <Image src={images[moment.scene]} alt="" width={400} height={400} sizes="(max-width: 600px) 65vw, 300px" priority />
            {moment.scene === "result" ? <span className={styles.impact}>탕!</span> : null}
          </div>
          <strong>{moment.title}</strong>
        </div>
      </div>
    ) : null}
  </>;
}
