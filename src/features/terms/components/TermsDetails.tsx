"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Markdown from "react-markdown";
import { formatTermsEffectiveAt, type Terms } from "@/features/terms/terms";

export function TermsDetails({ term }: { term: Terms }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const triggerElement = trigger.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      triggerElement?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={trigger} type="button" onClick={() => setOpen(true)}
        aria-label={`${term.title} 보기`} aria-haspopup="dialog"
        className="shrink-0 rounded py-1 text-sm text-[var(--ink-muted)] underline underline-offset-4 hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-4">
        보기
      </button>
      {open ? createPortal(
        <dialog ref={dialog} aria-labelledby={titleId} aria-modal="true" onClose={() => setOpen(false)}
          onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
          className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl border border-[var(--line)] bg-white p-0 text-[var(--ink)] shadow-2xl backdrop:bg-black/45">
          <div className="flex max-h-[85dvh] flex-col" onClick={(event) => event.stopPropagation()}>
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-5">
              <div>
                <p className="mb-2 text-xs font-medium text-[var(--ink-muted)]">{term.required ? "필수 약관" : "선택 약관"}</p>
                <h2 id={titleId} className="text-lg font-bold leading-snug sm:text-xl">{term.title}</h2>
                <p className="mt-2 text-xs leading-relaxed text-[var(--ink-muted)]">{formatTermsEffectiveAt(term.effectiveAt)}</p>
              </div>
              <button type="button" autoFocus aria-label="약관 모달 닫기" onClick={() => setOpen(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] focus-visible:outline-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </header>
            <div tabIndex={0} aria-label={`${term.title} 본문`}
              className="min-h-0 overflow-y-auto overscroll-contain break-words px-6 py-5 text-sm leading-7 [&_a]:underline [&_h1]:mb-4 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&>:first-child]:mt-0">
              <Markdown skipHtml disallowedElements={["img"]}>{term.content}</Markdown>
            </div>
            <footer className="shrink-0 border-t border-[var(--line)] px-6 py-4">
              <button type="button" onClick={() => setOpen(false)} className="w-full rounded-xl bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2">닫기</button>
            </footer>
          </div>
        </dialog>, document.body,
      ) : null}
    </>
  );
}
