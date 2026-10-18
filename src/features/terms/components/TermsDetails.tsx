import Markdown from "react-markdown";
import { formatTermsEffectiveAt, type Terms } from "@/features/terms/terms";

export function TermsDetails({ term }: { term: Terms }) {
  return (
    <details className="mt-2 text-sm text-[var(--ink-muted)]">
      <summary className="w-fit cursor-pointer rounded underline underline-offset-4 focus-visible:outline-2">
        {term.title} 전문 보기
      </summary>
      <p className="mt-3 text-xs">버전 {term.version} · 시행일 {formatTermsEffectiveAt(term.effectiveAt)} (한국 시간)</p>
      <div className="mt-3 max-h-80 overflow-y-auto break-words rounded-lg border border-[var(--line)] bg-white p-4 leading-relaxed [&_a]:text-[var(--brand-blue)] [&_a]:underline [&_h1]:mb-3 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:my-3 [&_h2]:font-bold [&_h3]:my-2 [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5" tabIndex={0} aria-label={`${term.title} 본문`}>
        <Markdown skipHtml disallowedElements={["img"]}>{term.content}</Markdown>
      </div>
    </details>
  );
}
