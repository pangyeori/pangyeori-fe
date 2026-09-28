"use client";
"use no memo";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  AuthCardHeader,
  AuthSwitchLink,
  FormAlert,
} from "@/features/auth/components/shared/AuthFormChrome";
import { useSignIn } from "@/features/auth/hooks/useSignIn";
import {
  signInSchema,
  type SignInFormValues,
} from "@/features/auth/schemas/signInSchema";
import { ApiError } from "@/lib/api/client";

// Issue #28: 로그인 화면은 서버의 기술 메시지 대신 사용자 안내 문구를 사용한다.
function getRequestError(error: Error | null) {
  if (!error) return undefined;
  if (error instanceof ApiError) {
    if (error.status === 401 || error.code === "INVALID_CREDENTIALS") {
      return "로그인에 실패했습니다. 이메일 또는 비밀번호를 확인해주세요.";
    }
    if (error.status === 429) {
      return "로그인 시도가 많습니다. 잠시 후 다시 시도해주세요.";
    }
  }
  return "로그인에 실패했습니다. 잠시 후 다시 시도해주세요.";
}

export function SignInForm({ notice, next }: { notice?: string; next?: string }) {
  const signInMutation = useSignIn(next);

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { register, handleSubmit, formState, setFocus, setValue } = form;
  const [email, password] = useWatch({
    control: form.control,
    name: ["email", "password"],
  });
  const { ref: emailRef, ...emailField } = register("email");
  const { ref: passwordRef, ...passwordField } = register("password");
  const emailError = formState.isSubmitted
    ? formState.errors.email?.message
    : undefined;
  const passwordError = formState.isSubmitted
    ? formState.errors.password?.message
    : undefined;
  const credentialError =
    emailError && passwordError && !email?.trim() && !password
      ? "이메일과 비밀번호를 입력해주세요."
      : emailError ?? passwordError;

  const requestError = getRequestError(signInMutation.error);
  const errorMessage = credentialError ?? requestError;
  const errorDescription = errorMessage ? "signin-credentials-error" : undefined;
  const invalidCredentials =
    signInMutation.error instanceof ApiError &&
    (signInMutation.error.status === 401 ||
      signInMutation.error.code === "INVALID_CREDENTIALS");

  function clearRequestError() {
    if (signInMutation.error) signInMutation.reset();
  }

  return (
    <form
      className="flex flex-col gap-4"
      aria-busy={signInMutation.isPending}
      onSubmit={(event) => {
        if (signInMutation.isPending) {
          event.preventDefault();
          return;
        }
        signInMutation.reset();
        void handleSubmit((values) => signInMutation.mutate(values))(event);
      }}
      noValidate
    >
      <AuthCardHeader title="로그인" description="다시 만나 반가워요. 토론을 이어가 볼까요?" />

      {notice ? <FormAlert tone="success">{notice}</FormAlert> : null}

      <fieldset disabled={signInMutation.isPending} className="contents">
        <legend className="sr-only">로그인 정보</legend>
        <Input
          label="이메일"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          floatingLabel
          appearance="underline"
          showClear={Boolean(email)}
          onClear={() => {
            clearRequestError();
            setValue("email", "", {
              shouldDirty: true,
              shouldValidate: formState.isSubmitted,
            });
            setFocus("email");
          }}
          aria-invalid={Boolean(emailError) || invalidCredentials}
          aria-describedby={errorDescription}
          name={emailField.name}
          onChange={(event) => {
            clearRequestError();
            void emailField.onChange(event);
          }}
          onBlur={emailField.onBlur}
          ref={emailRef}
        />

        <PasswordInput
          label="비밀번호"
          autoComplete="current-password"
          floatingLabel
          appearance="underline"
          showClear={Boolean(password)}
          onClear={() => {
            clearRequestError();
            setValue("password", "", {
              shouldDirty: true,
              shouldValidate: formState.isSubmitted,
            });
            setFocus("password");
          }}
          aria-invalid={Boolean(passwordError) || invalidCredentials}
          aria-describedby={errorDescription}
          name={passwordField.name}
          onChange={(event) => {
            clearRequestError();
            void passwordField.onChange(event);
          }}
          onBlur={passwordField.onBlur}
          ref={passwordRef}
        />
      </fieldset>

      <p
        id="signin-credentials-error"
        className="min-h-15 break-keep text-[13px] leading-5 text-[var(--danger)] sm:min-h-10 sm:text-sm"
        role="alert"
        aria-atomic="true"
      >
        {errorMessage}
      </p>

      <div className="flex justify-end">
        <Link
          href="/password/reset"
          className="text-sm text-[var(--ink-muted)] underline-offset-2 hover:underline"
        >
          비밀번호 재설정
        </Link>
      </div>

      <Button type="submit" loading={signInMutation.isPending}>
        로그인
      </Button>

      <div className="pt-2">
        <AuthSwitchLink
          prompt="처음 오셨나요?"
          href="/register"
          linkLabel="회원가입"
          accent="danger"
        />
      </div>
    </form>
  );
}
