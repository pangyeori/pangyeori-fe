import Image from "next/image";
import { exampleVerdict, sceneTitles, storyMessages, storyTopic } from "./storyContent";
import { ArgumentCards } from "./ArgumentCards";
import styles from "./ScrollHome.module.css";

export function StaticStory() {
  return <div className={styles.staticStory} data-static-story>
    <article data-static-phase="0"><div className={styles.staticHeading}><span>대화</span><h2>{sceneTitles[0]}</h2></div><div className={styles.staticChat}><p className={styles.staticTopic}>{storyTopic}</p>{storyMessages.map((message, index) => <div key={index} className={styles.staticMessage} data-side={message.side}><span>{message.name}</span><p>{message.text}</p></div>)}</div></article>
    <article data-static-phase="1"><div className={styles.staticHeading}><span>검토</span><h2>{sceneTitles[1]}</h2></div><div className={styles.staticReview}><ArgumentCards presentation="static" /><Image src="/images/mascot/owl-comparing-documents.png" width={512} height={512} sizes="260px" alt="양쪽의 주장을 나란히 살펴보는 판겨리" /></div></article>
    <article data-static-phase="2"><div className={styles.staticHeading}><span>AI 판정</span><h2>{sceneTitles[2]}</h2></div><div className={styles.staticVerdict}><Image src="/images/home/scroll-verdict-refined.webp" width={597} height={769} sizes="130px" alt="" /><div><h3>판겨리 AI · 최종 판정</h3><p>{exampleVerdict}</p></div></div></article>
  </div>;
}
