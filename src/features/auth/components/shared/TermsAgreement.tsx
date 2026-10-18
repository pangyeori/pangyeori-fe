"use client";

import { TermsDetails } from "@/features/terms/components/TermsDetails";
import { selectedTermsIds, type Terms } from "@/features/terms/terms";

export function TermsAgreement({ terms, value, onChange, disabled = false, error }: {
  terms: Terms[]; value: string[]; onChange: (next: string[]) => void; disabled?: boolean; error?: string;
}) {
  const selected = selectedTermsIds(terms, value);
  return (
    <fieldset disabled={disabled} className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
      <legend className="px-1 text-sm font-semibold">약관 동의</legend>
      <label className="flex items-center gap-2.5 text-sm font-medium">
        <input type="checkbox" className="size-4 accent-[var(--ink)]" checked={terms.length > 0 && selected.length === terms.length}
          onChange={(event) => onChange(event.target.checked ? terms.map((term) => term.termsId) : [])} />
        전체 동의{terms.some((term) => !term.required) ? " (선택 항목 포함)" : ""}
      </label>
      {terms.map((term) => (
        <div key={term.termsId} className="flex items-start justify-between gap-4">
          <label className="flex min-w-0 items-start gap-2.5 pt-1 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--ink)]" checked={selected.includes(term.termsId)}
              onChange={(event) => onChange(event.target.checked ? [...selected, term.termsId] : selected.filter((id) => id !== term.termsId))} />
            <span>[{term.required ? "필수" : "선택"}] {term.title}</span>
          </label>
          <TermsDetails term={term} />
        </div>
      ))}
      {error ? <p className="text-xs text-[var(--danger)]" role="alert">{error}</p> : null}
    </fieldset>
  );
}
