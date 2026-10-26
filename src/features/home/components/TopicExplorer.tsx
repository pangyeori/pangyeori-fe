"use client";

import { useState } from "react";
import styles from "./Home.module.css";

// Editorial prompts illustrate opposing perspectives, not live rooms or AI output.
const topics = [
  { category: "일상 속 발견", icon: "☕", title: "일주일에 나흘만 일한다면,\n우리는 더 행복해질까요?", pro: "충분한 휴식이 더 좋은 몰입을 만들어요.", con: "줄어든 시간만큼 업무 부담이 커질 수 있어요." },
  { category: "기술과 미래", icon: "✳", title: "AI가 만든 그림도,\n예술이라고 부를 수 있을까요?", pro: "새로운 도구도 창작의 가능성을 넓혀줘요.", con: "예술에는 창작자의 경험과 의도가 중요해요." },
  { category: "우리의 사회", icon: "◎", title: "도심에 차 없는 거리가\n더 많아져야 할까요?", pro: "보행자에게 더 안전하고 쾌적한 공간이 돼요.", con: "이동이 불편해지는 사람들도 고려해야 해요." },
];

export function TopicExplorer() {
  const [selected, setSelected] = useState(0);
  const topic = topics[selected];

  return (
    <div className={styles.topicExplorer} data-reveal>
      <div className={styles.topicOptions} role="group" aria-label="토론 주제 예시 선택">
        {topics.map((item, index) => <button key={item.category} type="button" aria-pressed={selected === index} aria-controls="topic-preview" onClick={() => setSelected(index)}>{item.category}</button>)}
      </div>
      <div id="topic-preview" className={styles.topicCard} aria-live="polite" aria-atomic="true">
        <div key={selected} className={styles.topicContent}>
          <div className={styles.topicMeta}><span>함께 생각해 볼 질문</span><span>0{selected + 1} / 03</span></div>
          <span className={styles.topicIcon} aria-hidden="true">{topic.icon}</span>
          <h3>{topic.title}</h3>
          <div className={styles.perspectives}>
            <div><span className={styles.proLabel}>하나의 시선</span><p>{topic.pro}</p></div>
            <span className={styles.perspectiveConnector} aria-hidden="true">↔</span>
            <div><span className={styles.conLabel}>또 다른 시선</span><p>{topic.con}</p></div>
          </div>
          <div className={styles.topicNote}><span aria-hidden="true">✦</span><p>정답보다 궁금한 건, 당신이 그렇게 생각한 이유.</p></div>
        </div>
      </div>
      <p className={styles.exampleNote}>토론 주제 예시예요. 직접 토론방을 만들어 원하는 주제로 이야기할 수 있어요.</p>
    </div>
  );
}
