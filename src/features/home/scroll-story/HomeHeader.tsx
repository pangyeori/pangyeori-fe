"use client";

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './HomeHeader.module.css';

// Keep the shared header intact; only the home page changes its scroll behavior.
export function HomeHeader({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let previous = Math.max(0, scrollY), distance = 0, frame = 0;
    const show = () => { element.dataset.hidden = 'false'; distance = 0; };
    const update = () => {
      frame = 0;
      const y = Math.max(0, Math.min(scrollY, document.documentElement.scrollHeight - innerHeight));
      const delta = y - previous;
      if (Math.sign(delta) !== Math.sign(distance)) distance = 0;
      distance += delta; previous = y;
      if (y < element.offsetHeight || element.contains(document.activeElement)) show();
      else if (Math.abs(distance) >= 12) element.dataset.hidden = String(distance > 0);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    element.addEventListener('focusin', show);
    window.addEventListener('scroll', schedule, { passive: true });
    return () => { cancelAnimationFrame(frame); element.removeEventListener('focusin', show); window.removeEventListener('scroll', schedule); };
  }, []);
  return <div ref={root} className={styles.header} data-home-header>{children}</div>;
}
