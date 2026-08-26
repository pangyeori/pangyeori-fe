"use client";
"use no memo";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch, type SubmitErrorHandler } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { confirmPasswordReset } from "@/features/auth/api/passwordReset";
import {
  AuthCardHeader,
  FormAlert,
} from "@/features/auth/components/shared/AuthFormChrome";
import { useFieldFeedback } from "@/features/auth/hooks/useFieldFeedback";
import {
  passwordResetConfirmSchema,
  type PasswordResetConfirmValues,
} from "@/features/auth/schemas/passwordResetSchema";
import {
  clearPasswordResetSession,
  usePasswordResetSession,
} from "@/features/auth/store/passwordResetSession";
import { ApiError } from "@/lib/api/client";

export function NewPasswordForm() {
  const router = useRouter();
  const session = usePasswordResetSession();
  const [resetComplete, setResetComplete] = useState(false);
  const form = useForm<PasswordResetConfirmValues>({
    resolver: zodResolver(passwordResetConfirmSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { password: "", passwordConfirm: "" },
  });
  const [password, passwordConfirm] = useWatch({
    control: form.control,
    name: ["password", "passwordConfirm"],
  });
  const feedback = useFieldFeedback(form.formState, { showWhileDirty: true });

  useEffect(() => {
    if (!session && !resetComplete) {
      router.replace("/password/reset");
    }
  }, [resetComplete, router, session]);

  const confirmMutation = useMutation({
    mutationFn: (values: PasswordResetConfirmValues) => {
      if (!session) throw new Error("비밀번호 재설정 토큰이 없습니다.");
      return confirmPasswordReset({
        passwordResetToken: session.passwordResetToken,
        newPassword: values.password,
      });
    },
    onSuccess: () => {
      setResetComplete(true);
      clearPasswordResetSession();
    },
  });

  if (resetComplete) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <div className="reset-success-icon mx-auto flex size-14 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success-fg)] ring-8 ring-[var(--success-soft)]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              className="reset-success-check"
              d="m5 12.5 4.2 4.2L19 7"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <AuthCardHeader
          title="비밀번호가 변경됐어요"
          description="새로운 비밀번호로 다시 로그인해주세요"
        />
        <Link
          href="/signin"
          className="inline-flex h-[52px] items-center justify-center rounded-xl bg-[var(--btn-primary)] px-5 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(17,24,39,0.16)] transition hover:bg-[var(--btn-primary-hover)]"
        >
          로그인하기
        </Link>
      </div>
    );
  }

  if (!session) return null;

  const { ref: passwordRef, ...passwordField } = form.register("password");
  const { ref: passwordConfirmRef, ...passwordConfirmField } =
    form.register("passwordConfirm");
  const passwordFocus = feedback.bindFocus("password");
  const passwordConfirmFocus = feedback.bindFocus("passwordConfirm");
  const handleInvalid: SubmitErrorHandler<PasswordResetConfirmValues> = (
    errors,
  ) => {
    if (errors.password) {
      form.setFocus("password");
      return;
    }
    if (errors.passwordConfirm) form.setFocus("passwordConfirm");
  };
  const serverError =
    confirmMutation.error instanceof ApiError
      ? confirmMutation.error.message
      : confirmMutation.error
        ? "비밀번호 재설정에 실패했습니다."
        : null;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={form.handleSubmit((values) => {
        confirmMutation.reset();
        confirmMutation.mutate(values);
      }, handleInvalid)}
      noValidate
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[var(--ink)] px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-white">
          STEP 2 OF 2
        </span>
        <span className="text-xs font-medium text-[var(--ink-faint)]">
          새 비밀번호
        </span>
      </div>

      <AuthCardHeader
        title="새 비밀번호 설정"
        description={`${session.email} 계정에 사용할 비밀번호를 입력하세요`}
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)]/70 p-4 sm:p-5">
        <PasswordInput
          label="새 비밀번호"
          autoComplete="new-password"
          placeholder="8~64자, 특수문자 포함"
          error={feedback.errorOf("password")}
          isValid={feedback.validOf("password", password)}
          name={passwordField.name}
          onChange={passwordField.onChange}
          onBlur={(event) => {
            passwordFocus.onBlurCapture();
            void passwordField.onBlur(event);
          }}
          onFocus={passwordFocus.onFocus}
          ref={passwordRef}
        />
        <PasswordInput
          label="새 비밀번호 확인"
          autoComplete="new-password"
          placeholder="비밀번호를 한 번 더 입력하세요"
          error={feedback.errorOf("passwordConfirm")}
          isValid={feedback.validOf("passwordConfirm", passwordConfirm)}
          name={passwordConfirmField.name}
          onChange={passwordConfirmField.onChange}
          onBlur={(event) => {
            passwordConfirmFocus.onBlurCapture();
            void passwordConfirmField.onBlur(event);
          }}
          onFocus={passwordConfirmFocus.onFocus}
          ref={passwordConfirmRef}
        />
      </div>

      <p className="-mt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
        8~64자이며 특수문자를 하나 이상 포함해야 합니다.
      </p>
      {serverError ? <FormAlert>{serverError}</FormAlert> : null}

      <Button
        type="submit"
        className="!h-[52px] rounded-xl shadow-[0_8px_20px_rgba(17,24,39,0.16)]"
        loading={confirmMutation.isPending}
      >
        비밀번호 변경하기
      </Button>
      <button
        type="button"
        className="text-sm font-semibold text-[var(--ink-muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
        onClick={() => {
          clearPasswordResetSession();
          router.replace("/password/reset");
        }}
      >
        이메일 인증 다시 하기
      </button>
    </form>
  );
}
