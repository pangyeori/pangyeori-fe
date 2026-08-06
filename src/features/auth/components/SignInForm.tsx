"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  AuthCardHeader,
  AuthDivider,
  AuthSwitchLink,
  FormAlert,
} from "@/features/auth/components/shared/AuthFormChrome";
import { KakaoAuthButton } from "@/features/auth/components/shared/KakaoAuthButton";
import { useFieldFeedback } from "@/features/auth/hooks/useFieldFeedback";
import { useSignIn } from "@/features/auth/hooks/useSignIn";
import {
  signInSchema,
  type SignInFormValues,
} from "@/features/auth/schemas/signInSchema";
import { ApiError } from "@/lib/api/client";

export function SignInForm() {
  const signInMutation = useSignIn();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const { register, handleSubmit, watch, formState } = form;
  const { bindFocus, errorOf, validOf } = useFieldFeedback(formState);

  const email = watch("email");
  const password = watch("password");
  const emailField = register("email");
  const passwordField = register("password");
  const emailFocus = bindFocus("email");
  const passwordFocus = bindFocus("password");

  const serverError =
    signInMutation.error instanceof ApiError
      ? signInMutation.error.message
      : signInMutation.error
        ? "로그인에 실패했습니다. 잠시 후 다시 시도해주세요."
        : null;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((values) => {
        signInMutation.reset();
        signInMutation.mutate({
          email: values.email,
          password: values.password,
          rememberMe: values.rememberMe,
        });
      })}
      noValidate
    >
      <AuthCardHeader title="로그인" description="계정으로 로그인하세요" />

      <Input
        label="이메일"
        type="email"
        autoComplete="email"
        placeholder="juintin@kakao.com"
        error={errorOf("email")}
        isValid={validOf("email", email)}
        name={emailField.name}
        onChange={emailField.onChange}
        onBlur={(event) => {
          emailFocus.onBlurCapture();
          void emailField.onBlur(event);
        }}
        onFocus={emailFocus.onFocus}
        ref={emailField.ref}
      />

      <PasswordInput
        label="비밀번호"
        autoComplete="current-password"
        placeholder="••••••••"
        error={errorOf("password")}
        isValid={validOf("password", password)}
        name={passwordField.name}
        onChange={passwordField.onChange}
        onBlur={(event) => {
          passwordFocus.onBlurCapture();
          void passwordField.onBlur(event);
        }}
        onFocus={passwordFocus.onFocus}
        ref={passwordField.ref}
      />

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
          <input
            type="checkbox"
            className="size-4 rounded border-[var(--line)] accent-[var(--ink)]"
            {...register("rememberMe")}
          />
          로그인 상태 유지
        </label>
        <Link
          href="/password/reset"
          className="text-sm text-[var(--ink-muted)] underline-offset-2 hover:underline"
        >
          비밀번호 찾기
        </Link>
      </div>

      {serverError ? <FormAlert>{serverError}</FormAlert> : null}

      <Button type="submit" loading={signInMutation.isPending}>
        로그인
      </Button>

      <AuthDivider />

      <KakaoAuthButton label="카카오계정으로 로그인" />

      <AuthSwitchLink
        prompt="아직 계정이 없으신가요?"
        href="/register"
        linkLabel="회원가입"
        accent="danger"
      />
    </form>
  );
}
