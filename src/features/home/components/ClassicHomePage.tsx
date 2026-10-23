import Image from "next/image";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { HomeActions } from "@/features/home/components/HomeActions";
import { HomeMotion } from "@/features/home/components/HomeMotion";
import { HomeScene } from "@/features/home/components/HomeScene";
import { TopicExplorer } from "@/features/home/components/TopicExplorer";
import styles from "@/features/home/components/Home.module.css";

const steps = [
  { number: "01", label: "YOUR QUESTION", title: "좋은 토론은, 좋은 질문에서.", description: "평소 궁금했던 주제를 꺼내보세요. 내 입장을 정하고 상대를 초대하면 준비 끝이에요.", image: "owl-thinking", tags: ["주제 정하기", "입장 선택"] },
  { number: "02", label: "TWO PERSPECTIVES", title: "다른 생각에, 귀 기울이는 시간.", description: "주장과 반론을 차례로 나누고, 자유 토론에서 더 깊이 이야기해요. 생각의 차이가 선명해져요.", image: "owl-comparing-documents", tags: ["주장과 반론", "자유 토론"] },
  { number: "03", label: "A NEW PERSPECTIVE", title: "대화 끝에, 한 뼘 더 넓은 시야.", description: "AI 판정으로 양쪽의 논리와 근거를 돌아봐요. 놓쳤던 관점을 발견하는 것까지가 토론이니까요.", image: "owl-judge-gavel", tags: ["AI 판정", "토론 돌아보기"] },
];

export default function HomePage() {
  return (
    <div className={styles.home}>
      <a href="#home-content" className={styles.skipLink}>본문으로 건너뛰기</a>
      <SiteHeader />
      <HomeMotion>
        <main id="home-content" tabIndex={-1}>
          <section className={styles.hero} aria-labelledby="hero-title">
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}><span className={styles.statusDot} />서로 다른 생각이 만나는 곳</p>
                <h1 id="hero-title">생각은 다르게.<br />대화는 <span className={styles.heroAccent}>깊게.<svg viewBox="0 0 190 15" fill="none" aria-hidden="true"><path d="M3 10C52 0 128 1 186 9M28 13C76 6 137 6 170 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></span></h1>
                <p className={styles.heroDescription}>정답을 겨루기보다, 서로의 이유를 만나는 시간.<br className={styles.desktopBreak} /> AI 토론 파트너 판겨리와 새로운 관점을 발견해요.</p>
                <HomeActions />
                <div className={styles.heroFootnote}><span aria-hidden="true">✦</span> 당신의 생각에 귀 기울일 준비가 됐어요.</div>
              </div>
              <HomeScene />
            </div>
            <div className={styles.heroBottom}>
              <span>작은 궁금증이, 깊은 대화가 되도록.</span>
              <a href="#how-it-works">판겨리 알아보기 <span aria-hidden="true">↓</span></a>
            </div>
          </section>

          <div className={styles.principles} aria-label="판겨리의 토론 원칙">
            <span>서로 다른 관점 <i aria-hidden="true">✳</i></span>
            <span>근거 있는 대화 <i aria-hidden="true">✳</i></span>
            <span>생각의 발견 <i aria-hidden="true">✳</i></span>
            <span>AI와 함께하는 토론 <i aria-hidden="true">✳</i></span>
          </div>

          <section id="how-it-works" className={styles.journey} aria-labelledby="journey-title">
            <div className={styles.sectionHeading} data-reveal>
              <div><p className={styles.eyebrow}>A LITTLE QUESTION, A BIG CONVERSATION</p><h2 id="journey-title">생각을 꺼내는 순간,<br />토론은 이미 시작됐어요.</h2></div>
              <p>어려운 말도, 거창한 준비도 필요 없어요.<br />궁금한 마음 하나면 충분해요.</p>
            </div>
            <ol className={styles.steps}>
              {steps.map((step) => (
                <li key={step.number} className={styles.step} data-reveal>
                  <div className={styles.stepVisual}>
                    <span className={styles.stepNumber}>{step.number}</span>
                    <div className={styles.stepCircle} />
                    <Image src={`/images/mascot/${step.image}.png`} alt="" width={512} height={512} sizes="(max-width: 640px) 200px, 240px" className={styles.stepImage} />
                    <div className={styles.stepTags}>{step.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                  </div>
                  <p className={styles.stepLabel}>{step.label}</p>
                  <h3>{step.title}</h3>
                  <p className={styles.stepDescription}>{step.description}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.explore} aria-labelledby="explore-title">
            <div className={styles.exploreInner}>
              <div className={styles.exploreIntro} data-reveal>
                <p className={styles.eyebrow}>THERE’S ALWAYS ANOTHER SIDE</p>
                <h2 id="explore-title">같은 질문.<br /><span>다른 두 개의 시선.</span></h2>
                <p>당연하다고 생각했던 것도<br />반대편에서 보면 새로워져요.<br />어떤 이야기부터 나눠볼까요?</p>
                <div className={styles.exploreMascot}><Image src="/images/mascot/owl-holding-star.png" alt="별을 안고 새로운 생각을 응원하는 판겨리" width={512} height={512} sizes="160px" /><span>생각이 달라도 괜찮아!</span></div>
              </div>
              <TopicExplorer />
            </div>
          </section>

          <section className={styles.closing} aria-labelledby="closing-title">
            <div className={styles.closingInner} data-reveal>
              <div className={styles.closingArt} aria-hidden="true"><div /><Image src="/images/mascot/owl-welcoming.png" alt="" width={512} height={512} sizes="(max-width: 640px) 180px, 260px" /><span>HELLO, NEW PERSPECTIVE!</span></div>
              <div className={styles.closingCopy}><p className={styles.eyebrow}>YOUR NEXT CONVERSATION STARTS HERE</p><h2 id="closing-title">당신의 생각이 궁금해요.</h2><p>혼자만의 생각을, 함께 나누는 이야기로.<br />첫 번째 대화에 판겨리가 함께할게요.</p><HomeActions variant="closing" /></div>
              <span className={styles.closingSpark} aria-hidden="true">✳</span>
            </div>
          </section>
        </main>
      </HomeMotion>
      <SiteFooter variant="full" />
    </div>
  );
}
