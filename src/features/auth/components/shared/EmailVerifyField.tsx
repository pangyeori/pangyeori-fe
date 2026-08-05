"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEventHandler,
  type FocusEventHandler,
  type Ref,
} from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  confirmEmailVerification,
  EMAIL_CODE_TTL_SECONDS,
  requestEmailVerification,
} from "@/features/auth/api/emailVerification";
import { ApiError } from "@/lib/api/client";

type EmailVerifyFieldProps = {
  email: string;
  emailError?: string;
  /** 제출 시 이메일 인증 미완료 등 — 형식 오류보다 낮은 우선순위 */
  verifyRequiredError?: string;
  emailValid: boolean;
  emailVerified: boolean;
  onVerifiedChange: (verified: boolean) => void;
  name: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onBlur: FocusEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  inputRef: Ref<HTMLInputElement>;
  emailLabel?: string;
  emailPlaceholder?: string;
  confirmVariant?: "primary" | "success";
  timerPrefix?: string;
};

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

/**
 * 이메일 영역 헬퍼는 주 문제 하나만 표시한다.
 * 우선순위: 형식 오류 > 발송 실패 > 인증 필요 > 성공 메시지
 */
function resolveEmailFeedback(input: {
  emailError?: string;
  sendError?: string | null;
  verifyRequiredError?: string;
  emailVerified: boolean;
  sentNotice?: string | null;
}) {
  if (input.emailError) {
    return { tone: "error" as const, text: input.emailError };
  }
  if (input.sendError) {
    return { tone: "error" as const, text: input.sendError };
  }
  if (!input.emailVerified && input.verifyRequiredError) {
    return { tone: "error" as const, text: input.verifyRequiredError };
  }
  if (input.emailVerified) {
    return {
      tone: "success" as const,
      text: "이메일 인증이 완료되었습니다.",
    };
  }
  if (input.sentNotice) {
    return { tone: "success" as const, text: input.sentNotice };
  }
  return null;
}

export function EmailVerifyField({
  email,
  emailError,
  verifyRequiredError,
  emailValid,
  emailVerified,
  onVerifiedChange,
  name,
  onChange,
  onBlur,
  onFocus,
  inputRef,
  emailLabel = "이메일",
  emailPlaceholder = "juintin@kakao.com",
  confirmVariant = "primary",
  timerPrefix = "남은 시간",
}: EmailVerifyFieldProps) {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sentNotice, setSentNotice] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [remaining]);

  const resetVerificationUi = useCallback(() => {
    setSent(false);
    setCode("");
    setRemaining(0);
    setSentNotice(null);
    setSendError(null);
    setCodeError(null);
    onVerifiedChange(false);
  }, [onVerifiedChange]);

  const handleEmailChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    onChange(event);
    resetVerificationUi();
  };

  const handleRequest = useCallback(async () => {
    setSendError(null);
    setCodeError(null);
    setSentNotice(null);

    if (!emailValid) {
      // 형식 오류는 폼 emailError가 담당. 없을 때만 보조 문구.
      if (!emailError) {
        setSendError("이메일 형식으로 입력해주세요.");
      }
      return;
    }

    setRequesting(true);
    try {
      await requestEmailVerification(email);
      setSent(true);
      setRemaining(EMAIL_CODE_TTL_SECONDS);
      setSentNotice("인증번호를 발송했습니다. 이메일을 확인해주세요.");
      onVerifiedChange(false);
    } catch (err) {
      setSendError(
        err instanceof ApiError
          ? err.message
          : "인증번호 발송에 실패했습니다.",
      );
    } finally {
      setRequesting(false);
    }
  }, [email, emailError, emailValid, onVerifiedChange]);

  const handleConfirm = useCallback(async () => {
    setCodeError(null);
    setSendError(null);

    if (code.trim().length !== 6) {
      setCodeError("인증번호 6자리를 입력해주세요.");
      return;
    }

    setConfirming(true);
    try {
      await confirmEmailVerification(email, code.trim());
      onVerifiedChange(true);
      setSentNotice(null);
      setRemaining(0);
    } catch (err) {
      onVerifiedChange(false);
      setCodeError(
        err instanceof ApiError
          ? err.message
          : "인증번호 확인에 실패했습니다.",
      );
    } finally {
      setConfirming(false);
    }
  }, [code, email, onVerifiedChange]);

  const emailFeedback = resolveEmailFeedback({
    emailError,
    sendError,
    verifyRequiredError,
    emailVerified,
    sentNotice,
  });

  return (
    <div className="flex flex-col gap-3">
      <Input
        label={emailLabel}
        type="email"
        autoComplete="email"
        placeholder={emailPlaceholder}
        error={
          emailFeedback?.tone === "error" ? emailFeedback.text : undefined
        }
        isValid={
          emailFeedback?.tone === "success"
            ? true
            : emailValid && !emailFeedback
        }
        successMessage={
          emailFeedback?.tone === "success" ? emailFeedback.text : undefined
        }
        trailing={
          <Button
            type="button"
            variant="outline"
            className="!h-12 !w-auto shrink-0 px-4"
            disabled={emailVerified || requesting}
            loading={requesting}
            onClick={handleRequest}
          >
            {sent && !emailVerified ? "재전송" : "인증"}
          </Button>
        }
        name={name}
        onChange={handleEmailChange}
        onBlur={onBlur}
        onFocus={onFocus}
        ref={inputRef}
      />

      {sent && !emailVerified ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setCodeError(null);
              }}
              inputMode="numeric"
              maxLength={6}
              placeholder="인증번호 6자리"
              className={`h-12 min-w-0 flex-1 rounded-lg border bg-white px-3.5 text-[15px] outline-none focus:ring-2 ${
                codeError
                  ? "border-[var(--danger)] focus:ring-[var(--danger-soft)]"
                  : "border-[var(--line)] focus:border-[var(--brand-blue)] focus:ring-[var(--brand-blue-soft)]"
              }`}
              aria-invalid={Boolean(codeError)}
              aria-label="이메일 인증번호"
            />
            <Button
              type="button"
              variant={confirmVariant}
              className="!h-12 !w-auto shrink-0 px-4"
              loading={confirming}
              onClick={handleConfirm}
            >
              확인
            </Button>
          </div>
          {codeError ? (
            <p className="text-xs text-[var(--danger)]" role="alert">
              {codeError}
            </p>
          ) : (
            <p className="text-xs text-[var(--ink-muted)]">
              {timerPrefix} {formatSeconds(remaining)}
              {remaining === 0 ? " · 만료되었습니다. 재전송해주세요." : ""}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
