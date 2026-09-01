import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

type FieldTone = "default" | "error" | "success";
export type FieldAppearance = "box" | "underline";

export function fieldToneClass(
  tone: FieldTone,
  appearance: FieldAppearance = "box",
) {
  if (appearance === "underline") {
    if (tone === "error") {
      return "border-[var(--danger)] focus:border-[var(--danger)]";
    }
    if (tone === "success") {
      return "border-[var(--success)] focus:border-[var(--success)]";
    }
    return "border-[var(--line-strong)] hover:border-[var(--ink-muted)] focus:border-[var(--ink-muted)]";
  }
  if (tone === "error") {
    return "border-[var(--danger)] focus:ring-[var(--danger-soft)]";
  }
  if (tone === "success") {
    return "border-[var(--success)] focus:ring-[var(--success-soft)]";
  }
  return "border-[var(--line)] hover:border-[var(--line-strong)] focus:border-[var(--brand-blue)] focus:ring-[var(--brand-blue-soft)]";
}

export function resolveFieldTone(error?: string, isValid?: boolean): FieldTone {
  if (error) return "error";
  if (isValid) return "success";
  return "default";
}

export function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type FieldShellProps = {
  label: string;
  htmlFor?: string;
  error?: string;
  successMessage?: string;
  hideLabel?: boolean;
  children: ReactNode;
};

export function FieldShell({
  label,
  htmlFor,
  error,
  successMessage,
  hideLabel = false,
  children,
}: FieldShellProps) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className={hideLabel ? "sr-only" : "text-sm font-medium text-[var(--ink)]"}
      >
        {label}
      </label>
      {children}
      {error ? (
        <span
          id={htmlFor ? `${htmlFor}-error` : undefined}
          className="text-xs text-[var(--danger)]"
          role="alert"
        >
          {error}
        </span>
      ) : successMessage ? (
        <span className="text-xs text-[var(--success-fg)]">{successMessage}</span>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  isValid?: boolean;
  successMessage?: string;
  trailing?: ReactNode;
  floatingLabel?: boolean;
  appearance?: FieldAppearance;
  showClear?: boolean;
  onClear?: () => void;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    isValid = false,
    successMessage,
    trailing,
    floatingLabel = false,
    appearance = "box",
    showClear = false,
    onClear,
    id,
    placeholder,
    className = "",
    ...props
  },
  ref,
) {
  const inputId = id ?? props.name;
  const tone = resolveFieldTone(error, isValid);
  const showCheck = tone === "success" && !trailing && !showClear;
  const isUnderline = appearance === "underline";

  return (
    <FieldShell
      label={label}
      htmlFor={inputId}
      error={error}
      successMessage={!error && isValid ? successMessage : undefined}
      hideLabel={floatingLabel}
    >
      <div className="relative flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            id={inputId}
            ref={ref}
            placeholder={floatingLabel ? " " : placeholder}
            className={`peer w-full border text-[15px] text-[var(--ink)] outline-none transition duration-200 placeholder:text-[var(--ink-faint)] ${
              isUnderline
                ? "h-14 rounded-none border-x-0 border-t-0 bg-transparent pb-0.5 pl-0 focus:ring-0"
                : "h-12 rounded-lg bg-white px-3.5 focus:ring-2"
            } ${
              floatingLabel ? "pt-4.5" : ""
            } ${
              showCheck || showClear ? "pr-11" : ""
            } ${fieldToneClass(tone, appearance)} ${className}`}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error && inputId ? `${inputId}-error` : undefined
            }
            {...props}
          />
          {floatingLabel ? (
            <label
              htmlFor={inputId}
              className={`pointer-events-none absolute top-2 text-[11px] font-medium text-[var(--ink-muted)] transition-all duration-150 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[17px] peer-placeholder-shown:text-[var(--ink-faint)] peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[11px] ${isUnderline ? "left-0" : "left-3.5"}`}
            >
              {label}
            </label>
          ) : null}
          {showCheck ? (
            <span className="pointer-events-none absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--success)]">
              <CheckIcon />
            </span>
          ) : null}
          {showClear && onClear ? (
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[var(--ink-faint)] transition hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--ink-muted)]"
              onClick={onClear}
              aria-label={`${label} 입력 지우기`}
            >
              <ClearIcon />
            </button>
          ) : null}
        </div>
        {trailing}
      </div>
    </FieldShell>
  );
});

export function ClearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.16" />
      <path
        d="m9 9 6 6m0-6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
