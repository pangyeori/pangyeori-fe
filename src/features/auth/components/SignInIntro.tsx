import { SignInScene } from "./SignInScene";

export function SignInIntro() {
  return (
    <div className="mx-auto flex max-w-md items-center gap-3 lg:block lg:max-w-lg">
      <div className="min-w-0 flex-1">
        <p className="mb-3 hidden text-xs font-semibold tracking-widest text-[var(--ink-muted)] lg:block">
          생각을 나누는 공간, 판겨리
        </p>
        <h1 className="text-[22px] font-bold leading-snug tracking-tight text-[var(--ink)] sm:text-3xl lg:text-[40px]">
          서로 다른 생각이,
          <br />
          <span className="text-[var(--brand-blue)]">더 나은 토론으로.</span>
        </h1>
        <p className="mt-3 hidden max-w-sm text-[15px] leading-7 text-[var(--ink-muted)] lg:block">
          당신의 생각을 들려주세요.
          <br />
          AI 판사와 함께 서로의 의견을 살펴봐요.
        </p>
      </div>

      <SignInScene />
      <ol className="mt-6 hidden items-center justify-between gap-2 border-t border-[var(--line)] pt-5 text-xs text-[var(--ink-muted)] lg:flex">
        {["의견 나누기", "근거 살펴보기", "AI 판정"].map((step, index) => (
          <li key={step} className="flex items-center gap-2">
            <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[10px] font-semibold text-[var(--brand-blue)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
