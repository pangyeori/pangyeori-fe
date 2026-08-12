"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState, type ChangeEventHandler } from "react";
import { useForm, type SubmitErrorHandler } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { checkNicknameDuplicate } from "@/features/auth/api/nickname";
import {
  AuthCardHeader,
  AuthDivider,
  AuthSwitchLink,
  FormAlert,
} from "@/features/auth/components/shared/AuthFormChrome";
import { EmailVerifyField } from "@/features/auth/components/shared/EmailVerifyField";
import { KakaoAuthButton } from "@/features/auth/components/shared/KakaoAuthButton";
import { TermsAgreement } from "@/features/auth/components/shared/TermsAgreement";
import { useFieldFeedback } from "@/features/auth/hooks/useFieldFeedback";
import { useRegister } from "@/features/auth/hooks/useRegister";
import {
  nicknameSchema,
  registerSchema,
  type RegisterFormValues,
} from "@/features/auth/schemas/registerSchema";
import { ApiError } from "@/lib/api/client";

export function RegisterForm() {
  const registerMutation = useRegister();
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [nicknameSuccess, setNicknameSuccess] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      nickname: "",
      nicknameChecked: false,
      email: "",
      password: "",
      passwordConfirm: "",
      agreeService: false,
      agreePrivacy: false,
      agreeMarketing: false,
      emailVerified: false,
    },
  });

  const {
    register,
    handleSubmit,
    clearErrors,
    getValues,
    setError,
    setFocus,
    setValue,
    watch,
    formState,
  } = form;

  const { errors, isSubmitted } = formState;
  const { bindFocus, errorOf, validOf } = useFieldFeedback(formState, {
    showWhileDirty: true,
  });

  const email = watch("email");
  const nickname = watch("nickname");
  const nicknameChecked = watch("nicknameChecked");
  const password = watch("password");
  const passwordConfirm = watch("passwordConfirm");
  const emailVerified = watch("emailVerified");
  const agreeService = watch("agreeService");
  const agreePrivacy = watch("agreePrivacy");
  const agreeMarketing = watch("agreeMarketing");

  const onVerifiedChange = useCallback(
    (verified: boolean) => {
      setValue("emailVerified", verified, {
        shouldDirty: true,
        shouldValidate: isSubmitted,
      });
    },
    [isSubmitted, setValue],
  );

  const handleNicknameChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    nicknameField.onChange(event);
    setNicknameSuccess(null);
    setValue("nicknameChecked", false, {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    });
    clearErrors("nickname");
  };

  const handleNicknameCheck = useCallback(async () => {
    setNicknameSuccess(null);
    clearErrors("nickname");

    const requestedNickname = getValues("nickname").trim();
    const parsedNickname = nicknameSchema.safeParse(requestedNickname);
    if (!parsedNickname.success) {
      setError("nickname", {
        type: "validation",
        message: parsedNickname.error.issues[0]?.message,
      });
      return;
    }

    setCheckingNickname(true);

    try {
      const result = await checkNicknameDuplicate(requestedNickname);

      if (getValues("nickname").trim() !== requestedNickname) return;

      if (result.duplicated) {
        setValue("nicknameChecked", false);
        setError("nickname", {
          type: "server",
          message: "이미 사용 중인 닉네임입니다.",
        });
        return;
      }

      setValue("nicknameChecked", true, { shouldValidate: true });
      setNicknameSuccess("사용 가능한 닉네임입니다.");
    } catch (error) {
      if (getValues("nickname").trim() !== requestedNickname) return;

      setValue("nicknameChecked", false);
      setError("nickname", {
        type: "server",
        message:
          error instanceof ApiError
            ? error.message
            : "닉네임 중복 확인에 실패했습니다.",
      });
    } finally {
      setCheckingNickname(false);
    }
  }, [clearErrors, getValues, setError, setValue]);

  const serverError =
    registerMutation.error instanceof ApiError
      ? registerMutation.error.message
      : registerMutation.error
        ? "회원가입에 실패했습니다. 잠시 후 다시 시도해주세요."
        : null;

  const emailField = register("email");
  const nicknameField = register("nickname");
  const passwordField = register("password");
  const passwordConfirmField = register("passwordConfirm");
  const nicknameFocus = bindFocus("nickname");
  const emailFocus = bindFocus("email");
  const passwordFocus = bindFocus("password");
  const passwordConfirmFocus = bindFocus("passwordConfirm");
  const nicknameError = errorOf("nickname");
  const nicknameCheckMessage = "닉네임 중복 확인을 완료해주세요.";
  const nicknameFormatValid = nicknameSchema.safeParse(nickname.trim()).success;
  const nicknameCheckRequired =
    nicknameFormatValid &&
    !nicknameChecked &&
    (!nicknameError || nicknameError === nicknameCheckMessage);
  const nicknameBlockingError =
    nicknameError && nicknameError !== nicknameCheckMessage
      ? nicknameError
      : undefined;

  const handleInvalid: SubmitErrorHandler<RegisterFormValues> = (
    fieldErrors,
  ) => {
    if (fieldErrors.nickname) {
      setFocus("nickname");
      return;
    }
    if (fieldErrors.email || fieldErrors.emailVerified) {
      setFocus("email");
      return;
    }
    if (fieldErrors.password) {
      setFocus("password");
      return;
    }
    if (fieldErrors.passwordConfirm) {
      setFocus("passwordConfirm");
    }
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(
        (formValues) => {
          registerMutation.reset();
          registerMutation.mutate({
            nickname: formValues.nickname,
            email: formValues.email,
            password: formValues.password,
          });
        },
        handleInvalid,
      )}
      noValidate
    >
      <AuthCardHeader
        title="회원가입"
        description="무료로 계정을 만들고 토론을 시작하세요"
      />

      <Input
        label="닉네임"
        autoComplete="nickname"
        placeholder="2~12자, 특수문자 불가"
        error={nicknameBlockingError}
        isValid={Boolean(nicknameSuccess) || nicknameCheckRequired}
        successMessage={
          nicknameSuccess ?? (nicknameCheckRequired ? nicknameCheckMessage : undefined)
        }
        trailing={
          <Button
            type="button"
            variant="outline"
            className="!h-12 !w-auto shrink-0 px-4"
            disabled={Boolean(nicknameSuccess) || checkingNickname}
            loading={checkingNickname}
            onClick={handleNicknameCheck}
          >
            {nicknameSuccess ? "확인 완료" : "확인"}
          </Button>
        }
        name={nicknameField.name}
        onChange={handleNicknameChange}
        onBlur={(event) => {
          nicknameFocus.onBlurCapture();
          void nicknameField.onBlur(event);
        }}
        onFocus={nicknameFocus.onFocus}
        ref={nicknameField.ref}
      />

      <EmailVerifyField
        email={email}
        emailError={errorOf("email")}
        verifyRequiredError={
          isSubmitted && !emailVerified
            ? errors.emailVerified?.message
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
      />

      <PasswordInput
        label="비밀번호"
        autoComplete="new-password"
        placeholder="8자 이상"
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

      <PasswordInput
        label="비밀번호 확인"
        autoComplete="new-password"
        placeholder="비밀번호를 다시 입력하세요"
        error={errorOf("passwordConfirm")}
        isValid={validOf("passwordConfirm", passwordConfirm)}
        name={passwordConfirmField.name}
        onChange={passwordConfirmField.onChange}
        onBlur={(event) => {
          passwordConfirmFocus.onBlurCapture();
          void passwordConfirmField.onBlur(event);
        }}
        onFocus={passwordConfirmFocus.onFocus}
        ref={passwordConfirmField.ref}
      />

      <TermsAgreement
        value={{
          service: agreeService,
          privacy: agreePrivacy,
          marketing: agreeMarketing,
        }}
        onChange={(next) => {
          setValue("agreeService", next.service, {
            shouldValidate: isSubmitted,
          });
          setValue("agreePrivacy", next.privacy, {
            shouldValidate: isSubmitted,
          });
          setValue("agreeMarketing", next.marketing, {
            shouldValidate: isSubmitted,
          });
        }}
        error={
          isSubmitted ? errors.agreeService?.message : undefined
        }
      />

      {serverError ? <FormAlert>{serverError}</FormAlert> : null}

      {registerMutation.isSuccess ? (
        <FormAlert tone="success">
          회원가입이 완료되었습니다. 로그인 화면으로 이동합니다.
        </FormAlert>
      ) : null}

      <Button
        type="submit"
        disabled={!agreeService || !agreePrivacy}
        loading={registerMutation.isPending}
      >
        회원가입
      </Button>

      <AuthDivider />

      <KakaoAuthButton
        label="카카오계정으로 회원가입"
        pendingMessage="카카오 회원가입은 준비 중입니다."
      />

      <AuthSwitchLink
        prompt="이미 계정이 있으신가요?"
        href="/signin"
        linkLabel="로그인"
        accent="blue"
      />
    </form>
  );
}
