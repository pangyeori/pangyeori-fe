import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

type FieldTone = "default" | "error" | "success";

export function fieldToneClass(tone: FieldTone) {
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
  children: ReactNode;
};

export function FieldShell({
  label,
  htmlFor,
  error,
  successMessage,
  children,
}: FieldShellProps) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--ink)]">
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
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    isValid = false,
    successMessage,
    trailing,
    id,
    className = "",
    ...props
  },
  ref,
) {
  const inputId = id ?? props.name;
  const tone = resolveFieldTone(error, isValid);
  const showCheck = tone === "success" && !trailing;

  return (
    <FieldShell
      label={label}
      htmlFor={inputId}
      error={error}
      successMessage={!error && isValid ? successMessage : undefined}
    >
      <div className="relative flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            id={inputId}
            ref={ref}
            className={`h-12 w-full rounded-lg border bg-white px-3.5 text-[15px] text-[var(--ink)] outline-none transition duration-200 placeholder:text-[var(--ink-faint)] focus:ring-2 ${
              showCheck ? "pr-11" : ""
            } ${fieldToneClass(tone)} ${className}`}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error && inputId ? `${inputId}-error` : undefined
            }
            {...props}
          />
          {showCheck ? (
            <span className="pointer-events-none absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--success)]">
              <CheckIcon />
            </span>
          ) : null}
        </div>
        {trailing}
      </div>
    </FieldShell>
  );
});
