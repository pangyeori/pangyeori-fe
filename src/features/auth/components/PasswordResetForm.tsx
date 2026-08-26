"use client";
"use no memo";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { issuePasswordResetToken } from "@/features/auth/api/passwordReset";
import {
  AuthCardHeader,
  FormAlert,
} from "@/features/auth/components/shared/AuthFormChrome";
import { EmailVerifyField } from "@/features/auth/components/shared/EmailVerifyField";
import { useFieldFeedback } from "@/features/auth/hooks/useFieldFeedback";
import {
  passwordResetRequestSchema,
  type PasswordResetRequestValues,
} from "@/features/auth/schemas/passwordResetSchema";
import {
  clearPasswordResetSession,
  setPasswordResetSession,
} from "@/features/auth/store/passwordResetSession";
import { ApiError } from "@/lib/api/client";

export function PasswordResetForm() {
  const router = useRouter();
  const [emailVerified, setEmailVerified] = useState(false);
  const form = useForm<PasswordResetRequestValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { email: "" },
  });
  const email = useWatch({ control: form.control, name: "email" });
  const feedback = useFieldFeedback(form.formState);

  useEffect(() => {
    clearPasswordResetSession();
  }, []);

  const continueMutation = useMutation({
    mutationFn: (requestedEmail: string) =>
      issuePasswordResetToken(requestedEmail),
    onSuccess: (data, requestedEmail) => {
      setPasswordResetSession({
        email: requestedEmail,
        passwordResetToken: data.passwordResetToken,
      });
      router.push("/password/reset/new");
    },
  });

  const serverError =
    continueMutation.error instanceof ApiError
      ? continueMutation.error.message
      : continueMutation.error
        ? "비밀번호 재설정 토큰 발급에 실패했습니다."
        : null;
  const { ref: emailRef, ...emailField } = form.register("email");
  const emailFocus = feedback.bindFocus("email");

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={form.handleSubmit((values) => {
        if (!emailVerified) return;
        continueMutation.reset();
        continueMutation.mutate(values.email.trim());
      })}
      noValidate
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[var(--ink)] px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-white">
          STEP 1 OF 2
        </span>
        <span className="text-xs font-medium text-[var(--ink-faint)]">
          계정 확인
        </span>
      </div>

      <AuthCardHeader
        title="비밀번호 재설정"
        description="이메일로 받은 6자리 인증번호를 입력해주세요"
      />

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)]/70 p-4 sm:p-5">
        <EmailVerifyField
          email={email}
          emailError={feedback.errorOf("email")}
          emailValid={feedback.validOf("email", email)}
          emailVerified={emailVerified}
          onVerifiedChange={setEmailVerified}
          name={emailField.name}
          onChange={emailField.onChange}
          onBlur={(event) => {
            emailFocus.onBlurCapture();
            void emailField.onBlur(event);
          }}
          onFocus={emailFocus.onFocus}
          inputRef={emailRef}
          emailLabel="이메일"
          emailPlaceholder="email@example.com"
          timerPrefix="남은 시간"
        />
      </div>

      {serverError ? <FormAlert>{serverError}</FormAlert> : null}

      <Button
        type="submit"
        className="!h-[52px] rounded-xl shadow-[0_8px_20px_rgba(17,24,39,0.16)]"
        disabled={!emailVerified}
        loading={continueMutation.isPending}
      >
        재설정 계속하기
      </Button>

      <p className="text-center text-sm text-[var(--ink-muted)]">
        비밀번호가 기억났나요?{" "}
        <Link
          href="/signin"
          className="font-semibold text-[var(--ink)] underline-offset-4 hover:underline"
        >
          로그인
        </Link>
      </p>
    </form>
  );
}
