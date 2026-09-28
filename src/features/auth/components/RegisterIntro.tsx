import { RegisterScene } from "./RegisterScene";

export function RegisterIntro() {
  return (
    <div className="mx-auto flex max-w-md items-center gap-3 lg:block lg:max-w-lg">
      <div className="min-w-0 flex-1">
        <p className="mb-3 hidden text-xs font-semibold tracking-widest text-[var(--ink-muted)] lg:block">
          생각을 나누는 공간, 판겨리
        </p>
        <h1 className="text-[22px] font-bold leading-snug tracking-tight text-[var(--ink)] sm:text-3xl lg:text-[40px]">
          당신의 첫 생각이,
          <br />
          <span className="text-[#287c70]">새로운 대화의 시작.</span>
        </h1>
        <p className="mt-3 hidden max-w-sm text-[15px] leading-7 text-[var(--ink-muted)] lg:block">
          처음 오신 당신을 환영해요.
          <br />
          나만의 이름으로, 함께 생각을 나눠봐요.
        </p>
      </div>
      <RegisterScene />
      <ol className="mt-6 hidden items-center justify-between gap-2 border-t border-[var(--line)] pt-5 text-xs text-[var(--ink-muted)] lg:flex">
        {["나만의 이름", "이메일 인증", "첫 토론 시작"].map((step, index) => (
          <li key={step} className="flex items-center gap-2">
            <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[10px] font-semibold text-[#287c70]">
              {String(index + 1).padStart(2, "0")}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
