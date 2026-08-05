import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "kakao" | "outline" | "success";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  loading?: boolean;
  variant?: ButtonVariant;
};

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--btn-primary)] text-white hover:bg-[var(--btn-primary-hover)]",
  kakao:
    "bg-[var(--kakao)] text-[var(--kakao-fg)] hover:brightness-95",
  outline:
    "border border-[var(--line)] bg-white text-[var(--ink)] hover:bg-[var(--surface-muted)]",
  success:
    "bg-[var(--success)] text-white hover:brightness-95",
};

export function Button({
  children,
  loading = false,
  disabled,
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-blue)] disabled:cursor-not-allowed disabled:opacity-60 ${variantClass[variant]} ${className}`}
      {...props}
    >
      {loading ? "처리 중…" : children}
    </button>
  );
}
