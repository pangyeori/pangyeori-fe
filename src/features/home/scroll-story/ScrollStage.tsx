"use client";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useMotionPreference } from "../atelier/useMotionPreference";
import { ArgumentCards } from "./ArgumentCards";
import type { StoryScene } from "./createStoryScene";
import { sceneTitles, storyState, type StoryPhase } from "./storyContent";
import styles from "./ScrollHome.module.css";

const query = "(min-height: 650px) and (min-width: 340px)";
const subscribe = (notify: () => void) => {
  const media = matchMedia(query); media.addEventListener("change", notify);
  // Canvas text cannot inherit browser text-only scaling. Use semantic HTML
  // when the root text is enlarged, without adding another on-page control.
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  Object.assign(probe.style, { position: "fixed", width: "1rem", height: "1rem", visibility: "hidden", pointerEvents: "none" });
  document.body.append(probe);
  const observer = new ResizeObserver(notify); observer.observe(probe);
  return () => { media.removeEventListener("change", notify); observer.disconnect(); probe.remove(); };
};
const snapshot = () => matchMedia(query).matches && parseFloat(getComputedStyle(document.documentElement).fontSize) <= 24;

export function ScrollStage({ children }: { children: ReactNode }) {
  const container = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<StoryScene | null>(null);
  const phaseRef = useRef<StoryPhase>(0);
  const progressRef = useRef(0);
  const restorePhase = useRef<StoryPhase | null>(null);
  const resumeProgress = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<StoryPhase>(0);
  const reduced = useMotionPreference();
  const eligible = useSyncExternalStore(subscribe, snapshot, () => false);
  const enabled = eligible && !reduced && !failed;
  const enhanced = ready && enabled;

  useEffect(() => {
    const key = "pangyeori-home-scene";
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type === "reload" || navigation?.type === "back_forward") {
      try {
        const stored = sessionStorage.getItem(key);
        const value = stored === null ? NaN : Number(stored);
        if (Number.isFinite(value) && value >= 0 && value <= 1) {
          resumeProgress.current = value; progressRef.current = value;
        }
      } catch { /* Storage can be unavailable in private browser policies. */ }
    }
    const persist = () => {
      const rect = container.current?.getBoundingClientRect();
      try {
        if (container.current?.dataset.enhanced === "true" && rect && rect.top <= 0 && rect.bottom > 0) sessionStorage.setItem(key, String(progressRef.current));
        else sessionStorage.removeItem(key);
      } catch { /* Native scroll restoration remains available. */ }
    };
    window.addEventListener("pagehide", persist);
    return () => window.removeEventListener("pagehide", persist);
  }, []);

  useEffect(() => {
    const retainScene = () => {
      const element = container.current;
      const rect = element?.getBoundingClientRect();
      if (element?.dataset.enhanced === "true" && rect && rect.top <= 0 && rect.bottom > 0) restorePhase.current = phaseRef.current;
    };
    const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
    const sizeQuery = matchMedia(query);
    reducedQuery.addEventListener("change", retainScene); sizeQuery.addEventListener("change", retainScene);
    return () => { reducedQuery.removeEventListener("change", retainScene); sizeQuery.removeEventListener("change", retainScene); };
  }, []);

  useEffect(() => {
    if (!enabled || !host.current) return;
    const element = host.current;
    let cancelled = false;
    // Fonts are ready before drawing the Korean screen and argument textures.
    void Promise.all([import("./createStoryScene"), document.fonts.ready]).then(([module]) => {
      if (cancelled) return;
      try {
        runtime.current = module.createStoryScene(element, () => {
          const rect = container.current?.getBoundingClientRect();
          if (rect && rect.top <= 0 && rect.bottom > 0) restorePhase.current = phaseRef.current;
          setFailed(true);
        });
        setReady(true);
      } catch { setFailed(true); }
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; runtime.current?.dispose(); runtime.current = null; };
  }, [enabled]);

  useEffect(() => {
    if (!enhanced || !container.current) return;
    const element = container.current;
    let cancelled = false;
    let trigger: import("gsap/ScrollTrigger").ScrollTrigger | undefined;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const update = (progress: number, animate: boolean) => {
        progressRef.current = progress;
        runtime.current?.setProgress(progress, animate);
        const current = storyState(progress).phase;
        if (current !== phaseRef.current) { phaseRef.current = current; setPhase(current); }
      };
      trigger = ScrollTrigger.create({
        id: "home-conversation", trigger: element, start: "top top", end: "bottom bottom",
        onUpdate: (self) => update(self.progress, true),
        onRefresh: (self) => update(self.progress, false),
      });
      if (resumeProgress.current !== null) {
        const target = resumeProgress.current; resumeProgress.current = null;
        trigger.scroll(trigger.start + (trigger.end - trigger.start) * target);
        update(target, false);
      } else update(trigger.progress, false);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true; trigger?.kill();
      const rect = element.getBoundingClientRect();
      if (rect.top <= 0 && rect.bottom > 0) restorePhase.current = phaseRef.current;
    };
  }, [enhanced]);

  useEffect(() => {
    if (enhanced || restorePhase.current === null) return;
    const target = restorePhase.current; restorePhase.current = null;
    const frame = requestAnimationFrame(() => container.current?.querySelector(`[data-static-phase="${target}"]`)?.scrollIntoView({ block: "center" }));
    return () => cancelAnimationFrame(frame);
  }, [enhanced]);

  return <section ref={container} id="conversation-story" className={styles.story} data-scroll-story data-enhanced={enhanced} data-scene={phase} aria-label="대화에서 AI 판정까지">
    <div className={styles.sticky}>
      <div className={styles.liveStage} aria-hidden="true">
        <h2>{sceneTitles[phase]}</h2>
        <div ref={host} className={styles.canvasHost} data-story-host>
          <ArgumentCards active={phase === 1} />
          <div className={styles.stageMascot} data-story-mascot>
            {(["owl-thinking.png", "owl-comparing-documents.png", "owl-holding-star.png"] as const).map((file, index) =>
              <Image key={file} src={`/images/mascot/${file}`} width={512} height={512} sizes="(max-width: 767px) 230px, 350px" alt="" data-active={phase === index} loading="eager" />
            )}
          </div>
        </div>
      </div>
    </div>
    <div className={styles.semanticStory}>{children}</div>
  </section>;
}
