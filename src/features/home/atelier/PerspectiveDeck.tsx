"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useMotionPreference } from "./useMotionPreference";
import styles from "./Atelier.module.css";

// Editorial examples only. These are neither live debates nor generated verdicts.
const questions = [
  { label: "일상", symbol: "↗", question: "일주일에 나흘만\n일해도 괜찮을까요?", front: "충분히 쉬면,\n더 깊이 몰입할 수 있어요.", back: "시간이 줄어든 만큼,\n하루의 부담이 커질 수도 있죠.", note: "휴식의 가치와 일의 밀도, 당신은 어느 쪽에 주목하나요?", axes: ["휴식과 집중", "일정과 업무량"], color: "lime" },
  { label: "기술", symbol: "✳", question: "AI가 그린 그림도\n예술이 될 수 있을까요?", front: "새로운 도구는,\n새로운 상상을 열어줘요.", back: "작품을 만든 경험과 의도도\n예술의 일부 아닐까요?", note: "작품의 결과와 창작의 과정, 무엇이 더 중요할까요?", axes: ["표현의 가능성", "창작자의 의도"], color: "lilac" },
  { label: "사회", symbol: "◎", question: "차 없는 거리가\n더 많아져야 할까요?", front: "사람에게 돌려준 거리,\n도시가 더 쾌적해질 거예요.", back: "이동이 불편해질 사람들의\n목소리도 들어야 해요.", note: "모두에게 좋은 변화가 되려면 무엇이 필요할까요?", axes: ["쾌적한 거리", "이동의 편리함"], color: "peach" },
];

export function PerspectiveDeck({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const reduced = useMotionPreference();
  const topic = questions[selected];
  const choose = (index: number) => { setSelected(index); setFlipped(false); };

  return (
    <div className={styles.perspectiveWorkbench}>
      <div className={styles.perspectiveIntro}>
        {children}
        <div className={styles.topicContext} data-topic-context aria-live="polite" aria-atomic="true">
          <div className={styles.topicAxes}><span>이번 질문의 쟁점</span><div>{topic.axes.map((axis) => <strong key={axis}>{axis}</strong>)}</div></div>
          <div className={styles.mascotPrompt}>
            <Image src="/images/mascot/owl-thinking.png" width={512} height={512} sizes="(max-width: 760px) 76px, 96px" alt="" />
            <div><span>판겨리의 질문</span><p>{topic.note}</p></div>
          </div>
        </div>
        <p className={styles.exploreHint}><span aria-hidden="true">↔</span> 정답을 고르기 전에, 양쪽의 이유부터.</p>
      </div>
    <div className={styles.deck}>
      <LayoutGroup id="perspective-topics">
        <div className={styles.deckTabs} role="group" aria-label="질문 주제 선택">
          {questions.map((item, index) => <button type="button" key={item.label} aria-pressed={selected === index} aria-controls="perspective-card" onClick={() => choose(index)}>{selected === index && <motion.span className={styles.activeTab} layoutId={reduced ? undefined : "topic-pill"} transition={{ type: "spring", stiffness: 380, damping: 32 }} />}<span className={styles.tabText}>{item.label}</span><span className={styles.tabIndex}>0{index + 1}</span></button>)}
        </div>
      </LayoutGroup>
      <div className={styles.deckStage}>
        <div className={styles.deckShadowOne} aria-hidden="true" /><div className={styles.deckShadowTwo} aria-hidden="true" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={selected} initial={{ opacity: 0, y: reduced ? 0 : 15, rotate: reduced ? 0 : -3 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -12, rotate: reduced ? 0 : 3 }} transition={{ duration: reduced ? 0 : 0.22 }}>
            <button id="perspective-card" type="button" className={styles.flipButton} onClick={() => setFlipped((value) => !value)} aria-pressed={flipped} aria-describedby="perspective-copy" aria-label={`${topic.question.replace("\n", " ")} — ${flipped ? "처음 시선 보기" : "다른 시선 보기"}`}>
              <motion.div className={styles.flipInner} data-flip-inner data-color={topic.color} animate={{ rotateY: reduced ? 0 : flipped ? 180 : 0 }} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 80, damping: 17 }}>
                <div className={styles.cardFace} aria-hidden={flipped} style={reduced ? { visibility: flipped ? "hidden" : "visible" } : undefined}>
                  <div className={styles.faceMeta}><span>토론 카드 / 0{selected + 1}</span><span>첫 번째 생각</span></div>
                  <span className={styles.faceSymbol} aria-hidden="true">{topic.symbol}</span><h3>{topic.question}</h3><span className={styles.faceDivider} /><p>{topic.front}</p><span className={styles.flipHint}>눌러서 다른 시선 만나기 <span aria-hidden="true">↻</span></span>
                </div>
                <div className={`${styles.cardFace} ${styles.cardBack}`} aria-hidden={!flipped} style={reduced ? { transform: "none", visibility: flipped ? "visible" : "hidden" } : undefined}>
                  <div className={styles.faceMeta}><span>다르게 생각해보면</span><span>또 다른 생각</span></div>
                  <span className={styles.faceSymbol} aria-hidden="true">↔</span><h3>{topic.back}</h3><span className={styles.faceDivider} /><p>{topic.note}</p><span className={styles.flipHint}>처음 시선으로 돌아가기 <span aria-hidden="true">↻</span></span>
                </div>
              </motion.div>
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
      <p id="perspective-copy" className="sr-only" aria-live="polite">{flipped ? `${topic.back} ${topic.note}` : topic.front}</p>
      <p className={styles.deckCaption}>{flipped ? "다른 관점을 발견했어요. 당신의 생각은 어떤가요?" : "토론 주제 예시 · 카드를 눌러 양쪽의 관점을 만나보세요."}</p>
    </div>
    </div>
  );
}
