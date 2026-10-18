export type Terms = {
  termsId: string;
  type: string;
  version: number;
  title: string;
  content: string;
  required: boolean;
  effectiveAt: string;
};

// Selection is bound to a document, never to its type or list position.
export function selectedTermsIds(terms: Terms[], selected: string[]) {
  const ids = new Set(selected);
  return terms.filter((term) => ids.has(term.termsId)).map((term) => term.termsId);
}

export function canAgreeToTerms(terms: Terms[], selected: string[]) {
  return terms.length > 0 && terms.every((term) => !term.required || selected.includes(term.termsId));
}

export function needsTermsRefresh(code: string | null) {
  return code === "TERMS_NOT_LATEST" || code === "REQUIRED_TERMS_NOT_AGREED" || code === "TERMS_NOT_FOUND";
}

export function formatTermsEffectiveAt(value: string) {
  // Backend LocalDateTime is UTC, not browser local time.
  const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}
