import Image from "next/image";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { StoryAction } from "./StoryAction";
import { StaticStory } from "./StaticStory";
import { HomeHeader } from "./HomeHeader";
import { HeroCourt } from "./HeroCourt";
import { ScrollStage } from "./ScrollStage";
import { TopicDiscovery } from "./TopicDiscovery";
import { homeFont } from "./homeFont";
import styles from "./ScrollHome.module.css";

export function ScrollHome() {
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#home-main">본문으로 건너뛰기</a>
      <HomeHeader><SiteHeader /></HomeHeader>
      <main id="home-main" className={`${styles.main} ${homeFont.variable}`} tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>AI가 함께하는 1:1 토론</p>
            <h1 id="home-title">생각이 달라도,<br /><span>대화는 즐겁게.</span></h1>
            <p className={styles.heroDescription}>서로의 생각을 나누고,<br />판겨리와 함께 토론을 돌아봐요.</p>
            <div className={styles.heroActions}>
              <StoryAction />
              <a href="#conversation-story" className={styles.textLink}>토론 살펴보기 <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 4v12m-5-5 5 5 5-5" /></svg></a>
            </div>
          </div>
          <HeroCourt />
        </section>
        <ScrollStage><StaticStory /></ScrollStage>
        <TopicDiscovery />
        <section id="start-debate" className={styles.closing} aria-labelledby="start-title">
          <Image src="/images/mascot/owl-welcoming.png" width={512} height={512} sizes="144px" alt="날개를 펼쳐 반기는 판겨리" />
          <h2 id="start-title">이제, 내 생각을<br />꺼낼 차례.</h2>
          <p>가벼운 질문 하나부터 시작해보세요.</p>
          <StoryAction />
        </section>
      </main>
      <SiteFooter variant="full" />
    </div>
  );
}
