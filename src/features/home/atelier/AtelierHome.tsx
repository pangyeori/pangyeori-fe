import Image from "next/image";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AtelierMotion } from "./AtelierMotion";
import { CourtroomScene } from "./CourtroomScene";
import { PerspectiveDeck } from "./PerspectiveDeck";
import { AtelierAction } from "./AtelierAction";
import styles from "./Atelier.module.css";

const steps = [
  { color: "questionCard", image: "owl-thinking", alt: "토론 주제를 고민하는 판겨리", label: "토론의 시작", title: "궁금한 이야기 하나!", description: <>주제를 정하고, 내 입장을 골라요.<br />{" "}일상의 작은 궁금증도 좋아요.</>, quote: "나는 이렇게 생각해!" },
  { color: "dialogueCard", image: "owl-comparing-documents", alt: "양쪽 주장을 비교하는 판겨리", label: "1:1 토론", title: "서로의 이유를 들어요.", description: <>주장과 반론, 그리고 자유 토론.<br />{" "}내 생각에 근거를 더해보세요.</>, quote: "그렇게 볼 수도 있겠네?" },
  { color: "discoveryCard", image: "owl-judge-gavel", alt: "판사 망치를 든 판겨리", label: "AI 판정", title: "판겨리, 판정을 부탁해!", description: <>AI 판정으로 논리와 근거를 돌아봐요.<br />{" "}토론이 끝나도 발견은 남으니까요.</>, quote: "어떤 주장이 설득력 있었을까?" },
];

export function AtelierHome({ refined = false }: { refined?: boolean }) {
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#atelier-main">본문으로 건너뛰기</a>
      <SiteHeader />
      <AtelierMotion>
        <main className={`${styles.atelier} ${refined ? styles.refined : ""}`} data-home-variant={refined ? "refined" : "comic"} id="atelier-main" tabIndex={-1}>
          <section className={styles.hero} aria-labelledby="atelier-title">
            <div className={styles.heroCopy}>
              <p className={styles.kicker}><span aria-hidden="true">✦</span> 생각은 자유롭게, 판정은 AI와 함께</p>
              <h1 id="atelier-title">서로 다른 생각,<br /><em>판겨리</em>가 들어볼게요.</h1>
              <p className={styles.heroDescription}>친구와 의견이 갈리는 순간부터 진지한 논쟁까지.<br />{" "}1:1로 토론하고, AI 판정으로 새로운 관점을 발견하세요.</p>
              <div className={styles.heroActions}><AtelierAction /><a className={styles.secondaryAction} href="#perspective-story">어떻게 진행되나요? <span aria-hidden="true">↓</span></a></div>
              <div className={styles.heroChips}><span>01 주제 고르기</span><i aria-hidden="true">→</i><span>02 서로 토론하기</span><i aria-hidden="true">→</i><span>03 AI 판정</span></div>
            </div>
            <CourtroomScene />
          </section>
          <div className={styles.chapterStrip} aria-hidden="true"><span>작은 질문도 환영해요</span><b>✦</b><span>다른 생각은 새로운 발견</span><b>✦</b><span>마지막은 AI 판정으로</span></div>

          <section id="perspective-story" className={styles.story} aria-labelledby="story-title">
            <div className={styles.storyHeading}><div><span className={styles.micro}>판겨리의 토론 안내서</span><h2 id="story-title">질문에서 판정까지,<br /><span>세 컷이면 알 수 있어요.</span></h2></div><p>복잡할 필요 없어요.<br />생각을 꺼내면, 판겨리가 함께할게요.</p></div>
            <div className={styles.storyStage} data-story-stage>
              <div className={styles.storyCards}>{steps.map((step, index) => <article key={step.image} className={`${styles.storyCard} ${styles[step.color]}`} data-story-card>
                <div className={styles.cardTop}><span>0{index + 1}</span><span>{step.label}</span><span aria-hidden="true">✦</span></div>
                <div className={styles.comicImage}><span>{step.quote}</span><Image src={`/images/mascot/${step.image}.png`} alt={step.alt} width={512} height={512} sizes="(max-width: 760px) 180px, 200px" /></div>
                <div className={styles.cardCopy}><h3>{step.title}</h3><p className={styles.cardDescription}>{step.description}</p></div>
              </article>)}</div>
              <div className={styles.storyProgress} aria-hidden="true"><span>질문</span><div><i data-story-progress /></div><span>AI 판정</span></div>
            </div>
          </section>

          <section className={styles.playground} aria-labelledby="deck-title">
            <PerspectiveDeck>
              <div className={styles.playgroundHeading}><span className={styles.micro}>생각 뒤집어보기</span><h2 id="deck-title">같은 질문에도<br /><em>두 가지 이야기가!</em></h2><p>일상부터 기술, 사회 이야기까지.<br />카드를 톡 눌러 반대쪽 생각도 만나보세요.</p></div>
            </PerspectiveDeck>
          </section>

          <section className={styles.invitation} aria-labelledby="invitation-title">
            <div className={styles.invitationInner}><Image src="/images/mascot/owl-welcoming.png" alt="날개를 펼쳐 반기는 판겨리" width={512} height={512} sizes="(max-width: 760px) 150px, 220px" /><div><span className={styles.micro}>오늘의 첫 토론, 함께할까요?</span><h2 id="invitation-title">당신의 생각을<br />들려줄 차례예요.</h2><p>판겨리는 벌써 들을 준비가 됐어요.</p></div><AtelierAction closing /></div>
          </section>
        </main>
      </AtelierMotion>
      <SiteFooter variant="full" />
    </div>
  );
}
