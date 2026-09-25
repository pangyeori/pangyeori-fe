"use client";

import { useRef, useState } from "react";

export function RefreshButton({
  label = "새로고침",
  onRefresh,
}: {
  label?: string;
  onRefresh: () => Promise<unknown>;
}) {
  const iconRef = useRef<SVGSVGElement>(null);
  const [refreshing, setRefreshing] = useState(false);

  return (
    <button
      type="button"
      className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-blue)] disabled:opacity-40"
      aria-label={label}
      title="새로고침"
      disabled={refreshing}
      onClick={async () => {
        setRefreshing(true);
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          iconRef.current?.animate(
            [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
            { duration: 600, easing: "ease-in-out" },
          );
        }
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
        }
      }}
    >
      <span className="flex h-[22px] w-[22px] origin-center items-center justify-center motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:rotate-[30deg]">
        <svg
          ref={iconRef}
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{ transformBox: "view-box", transformOrigin: "center" }}
        >
          <path
            d="M20 12a8 8 0 1 1-1.1-4M15.4 8h3.5V4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
