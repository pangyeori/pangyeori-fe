"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";

import {
  CheckIcon,
  FieldShell,
  fieldToneClass,
  resolveFieldTone,
} from "@/components/ui/Input";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  error?: string;
  isValid?: boolean;
  successMessage?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      label,
      error,
      isValid = false,
      successMessage,
      id,
      className = "",
      ...props
    },
    ref,
  ) {
    const [visible, setVisible] = useState(false);
    const inputId = id ?? props.name;
    const tone = resolveFieldTone(error, isValid);

    return (
      <FieldShell
        label={label}
        htmlFor={inputId}
        error={error}
        successMessage={!error && isValid ? successMessage : undefined}
      >
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={visible ? "text" : "password"}
            className={`h-12 w-full rounded-lg border bg-white px-3.5 pr-20 text-[15px] text-[var(--ink)] outline-none transition duration-200 placeholder:text-[var(--ink-faint)] focus:ring-2 ${fieldToneClass(tone)} ${className}`}
            aria-invalid={Boolean(error)}
            aria-describedby={error && inputId ? `${inputId}-error` : undefined}
            {...props}
          />
          <div className="absolute inset-y-0 right-0 flex items-center">
            {tone === "success" ? (
              <span className="flex w-9 items-center justify-center text-[var(--success)]">
                <CheckIcon />
              </span>
            ) : null}
            <button
              type="button"
              className="flex w-11 items-center justify-center text-[var(--ink-faint)] transition hover:text-[var(--ink-muted)]"
              onClick={() => setVisible((prev) => !prev)}
              aria-label={visible ? "비밀번호 숨기기" : "비밀번호 표시"}
            >
              {visible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>
      </FieldShell>
    );
  },
);

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M10.6 10.6a2.5 2.5 0 003.5 3.5M9.9 5.1A10.4 10.4 0 0112 5c6.5 0 10 7 10 7a17.6 17.6 0 01-4.1 4.8M6.1 6.1A17.3 17.3 0 002 12s3.5 7 10 7c1.4 0 2.7-.3 3.9-.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
