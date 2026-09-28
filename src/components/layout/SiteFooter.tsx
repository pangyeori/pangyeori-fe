import Link from "next/link";

const contact = {
  email: "watergon1126@naver.com",
  phone: "010-2521-1546",
  phoneHref: "tel:+821025211546",
  github: "https://github.com/pangyeori",
};

const linkStyle = "rounded-sm transition-colors hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand-blue)]";

export function SiteFooter({ variant = "compact" }: { variant?: "full" | "compact" }) {
  const full = variant === "full";

  return (
    <footer className="shrink-0 border-t border-[var(--line)] bg-white" data-footer-variant={variant}>
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        {full ? (
          <>
            <div className="grid gap-9 py-10 sm:grid-cols-2 sm:gap-10 sm:py-12 lg:grid-cols-[1.4fr_1fr_0.6fr]">
              <div>
                <Link href="/" className={`${linkStyle} inline-block text-xl font-bold tracking-tight text-[var(--ink)]`} aria-label="판겨리 홈">판겨리<span aria-hidden="true" className="text-[var(--brand-blue)]">.</span></Link>
                <p className="mt-3 text-sm font-medium text-[var(--ink)]">생각을 나누고, 더 나은 답을 만나요.</p>
                <p className="mt-2 max-w-xs break-keep text-[13px] leading-6 text-[var(--ink-muted)]">서로 다른 의견이 만나는 1:1 토론 공간.<br />AI와 함께 논리와 근거를 살펴봐요.</p>
              </div>
              <div>
                <h2 className="text-xs font-semibold text-[var(--ink)]">문의하기</h2>
                <address className="mt-4 space-y-3 text-sm not-italic text-[var(--ink-muted)]">
                  <p><a href={`mailto:${contact.email}`} className={`${linkStyle} break-all`}>{contact.email}</a></p>
                  <p><a href={contact.phoneHref} className={`${linkStyle} tabular-nums`}>{contact.phone}</a></p>
                </address>
              </div>
              <nav aria-label="프로젝트 링크">
                <h2 className="text-xs font-semibold text-[var(--ink)]">함께 만드는 판겨리</h2>
                <a href={contact.github} target="_blank" rel="noopener noreferrer" className={`${linkStyle} mt-4 inline-flex items-center gap-2 text-sm text-[var(--ink-muted)]`}>
                  <GithubIcon />GitHub<span aria-hidden="true">↗</span><span className="sr-only"> (새 탭에서 열림)</span>
                </a>
              </nav>
            </div>
            <div className="flex flex-col gap-2 border-t border-[var(--line)] py-5 text-xs leading-5 text-[var(--ink-muted)] sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <p className="break-keep">AI 판정은 토론을 돕기 위한 참고 정보입니다.</p>
              <p className="shrink-0">© 판겨리</p>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-5 text-xs text-[var(--ink-muted)]">
            <div className="flex items-center gap-3">
              <Link href="/" aria-label="판겨리 홈" className={`${linkStyle} text-sm font-semibold text-[var(--ink)]`}>판겨리</Link>
              <span>© 판겨리</span>
            </div>
            <a href={`mailto:${contact.email}`} className={`${linkStyle} inline-flex min-h-6 items-center`}>문의하기<span aria-hidden="true" className="ml-1.5">↗</span></a>
          </div>
        )}
      </div>
    </footer>
  );
}

function GithubIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.5-.29-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.8 10.8 0 0 1 5.63 0c2.15-1.45 3.1-1.15 3.1-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.64 5.27-5.15 5.55.4.35.76 1.03.76 2.08v3.11c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />
    </svg>
  );
}
