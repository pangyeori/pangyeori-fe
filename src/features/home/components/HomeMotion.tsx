"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Content stays visible without JavaScript. Only offscreen sections are enhanced.
export function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const elements = root.current?.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!elements || !("IntersectionObserver" in window)) return;
    const revealAll = () => elements.forEach((element) => element.removeAttribute("data-pending"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.removeAttribute("data-pending");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    if (!media.matches) {
      elements.forEach((element) => {
        if (element.getBoundingClientRect().top >= window.innerHeight) {
          element.setAttribute("data-pending", "true");
          observer.observe(element);
        }
      });
    }
    const onPreferenceChange = () => { observer.disconnect(); revealAll(); };
    // A focused link must never be hidden inside an unrevealed section.
    const onFocus = (event: FocusEvent) => {
      if (event.target instanceof Element) event.target.closest("[data-pending]")?.removeAttribute("data-pending");
    };
    const container = root.current;
    container?.addEventListener("focusin", onFocus);
    media.addEventListener("change", onPreferenceChange);
    return () => {
      observer.disconnect();
      revealAll();
      container?.removeEventListener("focusin", onFocus);
      media.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return <div ref={root}>{children}</div>;
}
