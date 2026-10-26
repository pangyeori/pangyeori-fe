"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useMotionPreference } from '../atelier/useMotionPreference';
import { discoveryTopics, type DiscoveryTopic } from './topicContent';
import type { TopicScene } from './createTopicScene';
import { TopicPoster } from './TopicPoster';
import styles from './TopicDiscovery.module.css';

export function TopicDiscovery() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const runtime = useRef<TopicScene | null>(null);
  const [eligible, setEligible] = useState(false);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduced = useMotionPreference();
  const enhanced = eligible && !reduced;

  useEffect(() => {
    const measure = () => setEligible(innerHeight >= 650 && innerWidth >= 340 && (probe.current?.offsetHeight ?? 32) <= 24);
    const observer = new ResizeObserver(measure);
    if (probe.current) observer.observe(probe.current);
    window.addEventListener('resize', measure);
    measure();
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  useEffect(() => {
    if (!section.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); observer.disconnect(); }
    }, { rootMargin: '200px' });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = section.current, rail = track.current;
    if (!enhanced || !root || !rail) return;
    let frame = 0, distance = 0;
    const cards = [...rail.querySelectorAll<HTMLElement>('[data-topic-card]')];
    const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
    const update = () => {
      frame = 0;
      const progress = Math.max(0, Math.min(1, -root.getBoundingClientRect().top / Math.max(1, root.offsetHeight - innerHeight)));
      // Each stop has time to turn and read before moving to the next card.
      const stage = progress * cards.length;
      const index = Math.min(cards.length - 1, Math.floor(stage));
      const position = Math.min(cards.length - 1, index + smooth((stage - index - .65) / .35));
      rail.style.setProperty('--shift', `${-distance * position / (cards.length - 1)}px`);
      cards.forEach((card, i) => {
        const turn = smooth((stage - i - .08) / .48);
        card.style.setProperty('--flip', `${turn * 180}deg`);
        card.dataset.face = turn <= 0 ? 'front' : turn >= 1 ? 'back' : 'turning';
      });
      root.dataset.progress = progress.toFixed(3);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => {
      const first = rail.firstElementChild as HTMLElement;
      const last = rail.lastElementChild as HTMLElement;
      distance = Math.max(0, last.offsetLeft - first.offsetLeft);
      root.style.setProperty('--travel', `${Math.max(distance * 1.4, innerHeight * 2.4)}px`);
      schedule();
    };
    const resize = new ResizeObserver(measure);
    resize.observe(rail);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure);
    measure();
    return () => {
      cancelAnimationFrame(frame); resize.disconnect();
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', measure);
      root.style.removeProperty('--travel'); rail.style.removeProperty('--shift'); delete root.dataset.progress;
      cards.forEach(card => { card.style.removeProperty('--flip'); delete card.dataset.face; });
    };
  }, [enhanced]);

  useEffect(() => {
    if (!near || !enhanced || failed || !host.current || !track.current) return;
    const element = host.current;
    const visuals = [...track.current.querySelectorAll<HTMLElement>('[data-topic-visual]')];
    let cancelled = false;
    void import('./createTopicScene').then(({ createTopicScene }) => {
      if (cancelled) return;
      try {
        runtime.current = createTopicScene(element, visuals, () => setFailed(true));
        setReady(true);
      } catch { setFailed(true); }
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; runtime.current?.dispose(); runtime.current = null; setReady(false); };
  }, [near, enhanced, failed]);

  return <section ref={section} className={styles.section} aria-labelledby="discovery-title" data-topic-discovery data-enhanced={enhanced}>
    <span ref={probe} className={styles.probe} aria-hidden="true" />
    <div className={styles.sticky}>
      <div className={styles.headingGroup}>
        <h2 id="discovery-title" className={styles.heading}>이런 생각도,<br />토론이 될까요?</h2>
        <p className={styles.description}>가까운 이야기에서 새로운 관점을 만나보세요.</p>
      </div>
      <div className={styles.viewport} data-rendered={ready && enhanced}>
        <div ref={track} className={styles.track} data-topic-track>
          {discoveryTopics.map((topic, index) => <article key={topic.id} className={styles.card} data-topic-card={topic.id}>
            <div className={styles.rotator} data-topic-rotator>
              <div className={styles.front} data-topic-front>
                <div className={styles.copy}>
                  <p className={styles.label}>{topic.label}</p>
                  <h3 className={styles.question}>{topic.question}</h3>
                </div>
                <div className={styles.visual} data-topic-visual aria-hidden="true"><TopicPoster topic={index as DiscoveryTopic} /></div>
              </div>
              <div className={styles.back} data-topic-back>
                <div className={`${styles.copy} ${styles.backCopy}`} aria-hidden="true">
                  <p className={styles.label}>{topic.label}</p>
                  <p className={styles.question}>{topic.question}</p>
                </div>
                <div className={styles.companion} data-topic-companion>
                  <Image src={topic.mascot} alt={topic.mascotAlt} width={768} height={768}
                    sizes="(max-width: 767px) 80vw, 440px"
                    loading={near ? 'eager' : 'lazy'} data-topic-owl />
                </div>
              </div>
            </div>
          </article>)}
        </div>
        <div ref={host} className={styles.host} data-topic-host aria-hidden="true" />
      </div>
    </div>
  </section>;
}
