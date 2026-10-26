"use client";

import { useRef, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMotionPreference } from "./useMotionPreference";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function AtelierMotion({ children }: { children: ReactNode }) {
  const reduced = useMotionPreference();
  const root = useRef<HTMLDivElement>(null);
  const unfolded = useRef(false);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(min-width: 900px) and (min-height: 680px) and (prefers-reduced-motion: no-preference)", () => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-story-card]", root.current);
      const stage = root.current?.querySelector<HTMLElement>("[data-story-stage]");
      if (!stage || cards.length !== 3 || unfolded.current) return;
      // Flat, opaque layers cannot intersect like rotating 3D planes. Scroll only
      // starts this timeline; elapsed time completes it even if scrolling stops.
      const timeline = gsap.timeline({
        defaults: { duration: 0.95, ease: "power3.inOut", force3D: false },
        onStart: () => { unfolded.current = true; },
        scrollTrigger: { id: "atelier-unfold", trigger: stage, start: "top 65%", once: true, toggleActions: "play none none none" },
      });
      timeline.fromTo(cards[0], { xPercent: 88, rotation: -9, y: 24 }, { xPercent: 0, rotation: 0, y: 0 }, 0)
        .fromTo(cards[1], { rotation: 0, y: 12 }, { rotation: 0, y: 0 }, 0.06)
        .fromTo(cards[2], { xPercent: -88, rotation: 9, y: 24 }, { xPercent: 0, rotation: 0, y: 0 }, 0.12)
        .fromTo("[data-story-progress]", { scaleX: 0 }, { scaleX: 1, duration: 1.07, ease: "power2.out" }, 0);
      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener("load", refresh, { once: true });
      let active = true;
      void document.fonts.ready.then(() => { if (active) refresh(); });
      return () => { active = false; window.removeEventListener("load", refresh); };
    });
    return () => media.revert();
  }, { scope: root });

  return <MotionConfig reducedMotion={reduced ? "always" : "never"}><div ref={root}>{children}</div></MotionConfig>;
}
