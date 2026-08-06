"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { requestTemporaryPassword } from "@/features/auth/api/emailVerification";
import {
  AuthCardHeader,
  FormAlert,
} from "@/features/auth/components/shared/AuthFormChrome";
import { EmailVerifyField } from "@/features/auth/components/shared/EmailVerifyField";
import { useFieldFeedback } from "@/features/auth/hooks/useFieldFeedback";
import { ApiError } from "@/lib/api/client";

const passwordResetSchema = z
  .object({
    email: z
      .string()
      .min(1, "이메일을 입력해주세요.")
      .email("이메일 형식으로 입력해주세요."),
    emailVerified: z.boolean(),
  })
  .refine((data) => data.emailVerified, {
    message: "이메일 인증을 완료해주세요.",
    path: ["emailVerified"],
  });

type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;

export function PasswordResetForm() {
  const [emailVerified, setEmailVerified] = useState(false);
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null);

  const form = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      email: "",
      emailVerified: false,
    },
  });

  const { register, handleSubmit, setValue, watch, formState } = form;
  const { isSubmitted } = formState;
  const { bindFocus, errorOf, validOf } = useFieldFeedback(formState);

  const email = watch("email");
  const emailField = register("email");
  const emailFocus = bindFocus("email");

  const onVerifiedChange = useCallback(
    (verified: boolean) => {
      setEmailVerified(verified);
      setValue("emailVerified", verified, {
        shouldValidate: isSubmitted,
      });
      if (!verified) {
        setIssuedPassword(null);
      }
    },
    [isSubmitted, setValue],
  );

  const resetMutation = useMutation({
    mutationFn: () => requestTemporaryPassword(email),
    onSuccess: (data) => {
      setIssuedPassword(data.temporaryPassword ?? null);
    },
  });

  const serverError =
    resetMutation.error instanceof ApiError
      ? resetMutation.error.message
      : resetMutation.error
        ? "임시 비밀번호 발급에 실패했습니다."
        : null;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={handleSubmit(() => {
        if (!emailVerified) return;
        resetMutation.reset();
        setIssuedPassword(null);
        resetMutation.mutate();
      })}
      noValidate
    >
      <AuthCardHeader
        title="비밀번호 찾기"
        description="가입한 이메일로 임시 비밀번호를 받을 수 있습니다"
      />

      <EmailVerifyField
        email={email}
        emailError={errorOf("email")}
        verifyRequiredError={
          isSubmitted && !emailVerified
            ? "이메일 인증을 완료해주세요."
            : undefined
        }
        emailValid={validOf("email", email)}
        emailVerified={emailVerified}
        onVerifiedChange={onVerifiedChange}
        name={emailField.name}
        onChange={emailField.onChange}
        onBlur={(event) => {
          emailFocus.onBlurCapture();
          emailField.onBlur(event);
        }}
        onFocus={emailFocus.onFocus}
        inputRef={emailField.ref}
        emailLabel="이메일을 입력해 주세요."
        emailPlaceholder="email@example.com"
        confirmVariant="success"
        timerPrefix="재전송까지"
      />

      {serverError ? <FormAlert>{serverError}</FormAlert> : null}

      {issuedPassword ? (
        <FormAlert tone="success">
          임시 비밀번호가 발급되었습니다. (로컬 mock:{" "}
          <strong>{issuedPassword}</strong>) 로그인 후 비밀번호를 변경하세요.
        </FormAlert>
      ) : null}

      <Button
        type="submit"
        disabled={!emailVerified}
        loading={resetMutation.isPending}
      >
        임시 비밀번호 발급받기
      </Button>

      <p className="text-center text-sm text-[var(--ink-muted)]">
        <Link
          href="/signin"
          className="font-semibold text-[var(--brand-blue)] underline-offset-2 hover:underline"
        >
          로그인으로 돌아가기
        </Link>
      </p>
    </form>
  );
}
