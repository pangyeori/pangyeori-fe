"use client";

import { TermsDetails } from "@/features/terms/components/TermsDetails";
import { selectedTermsIds, type Terms } from "@/features/terms/terms";

export function TermsAgreement({ terms, value, onChange, disabled = false, error }: {
  terms: Terms[]; value: string[]; onChange: (next: string[]) => void; disabled?: boolean; error?: string;
}) {
  const selected = selectedTermsIds(terms, value);
  return (
    <fieldset disabled={disabled} className="min-w-0 rounded-xl border border-[var(--line)] bg-white p-4 sm:p-5">
      <legend className="sr-only">약관 동의</legend>
      <p aria-hidden="true" className="mb-4 text-[15px] font-semibold tracking-tight">약관 동의</p>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2.5 text-[13px] font-semibold leading-5 sm:text-sm">
        <input type="checkbox" className="size-4 shrink-0 accent-[var(--ink)]" checked={terms.length > 0 && selected.length === terms.length}
          onChange={(event) => onChange(event.target.checked ? terms.map((term) => term.termsId) : [])} />
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span>전체 동의</span>
          {terms.some((term) => !term.required) ? <span className="text-xs font-normal text-[var(--ink-muted)]">선택 항목 포함</span> : null}
        </span>
      </label>
      <div>
        {terms.map((term) => (
          <div key={term.termsId} className="flex min-h-11 items-center justify-between gap-3">
            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 py-2.5 text-[13px] leading-5 sm:text-sm">
              <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--ink)]" checked={selected.includes(term.termsId)}
                onChange={(event) => onChange(event.target.checked ? [...selected, term.termsId] : selected.filter((id) => id !== term.termsId))} />
              <span className="break-keep"><span className="mr-1.5 text-[var(--ink-muted)]">[{term.required ? "필수" : "선택"}]</span>{term.title}</span>
            </label>
            <TermsDetails term={term} />
          </div>
        ))}
      </div>
      {error ? <p className="mt-3 text-xs text-[var(--danger)]" role="alert">{error}</p> : null}
    </fieldset>
  );
}
