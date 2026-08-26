"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEventHandler,
  type ChangeEventHandler,
  type FocusEvent,
  type FocusEventHandler,
  type KeyboardEventHandler,
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
  timerPrefix?: string;
};

type PinTone = "idle" | "checking" | "success" | "error";

const RESEND_COOLDOWN_SECONDS = 60;

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

/**
 * 이메일 영역 헬퍼는 주 문제 하나만 표시한다.
 * 우선순위: 형식 오류 > 발송 실패 > 인증 완료 > 발송 안내 > 인증 필요
 */
function resolveEmailFeedback(input: {
  emailError?: string;
  sendError?: string | null;
  verifyRequiredError?: string;
  emailValid: boolean;
  emailVerified: boolean;
  sentNotice?: string | null;
}) {
  if (input.emailError) {
    return { tone: "error" as const, text: input.emailError };
  }
  if (input.sendError) {
    return { tone: "error" as const, text: input.sendError };
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
  if (input.emailValid && !input.emailVerified) {
    return {
      tone: "success" as const,
      text: input.verifyRequiredError ?? "이메일 인증을 완료해주세요.",
    };
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
  emailPlaceholder = "email@example.com",
  timerPrefix = "남은 시간",
}: EmailVerifyFieldProps) {
  const [code, setCode] = useState<string[]>(() => Array(6).fill(""));
  const [sent, setSent] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sentNotice, setSentNotice] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [pinTone, setPinTone] = useState<PinTone>("idle");
  const [pinExiting, setPinExiting] = useState(false);
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const confirmingRef = useRef(false);
  const currentEmailRef = useRef(email);
  const successTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    currentEmailRef.current = email;
  }, [email]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [remaining]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  const resetVerificationUi = useCallback(() => {
    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setSent(false);
    setCode(Array(6).fill(""));
    setRemaining(0);
    setResendCooldown(0);
    setSentNotice(null);
    setSendError(null);
    setCodeError(null);
    setPinTone("idle");
    setPinExiting(false);
    onVerifiedChange(false);
  }, [onVerifiedChange]);

  const handleEmailChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    onChange(event);
    resetVerificationUi();
  };

  const handleRequest = useCallback(async () => {
    setSendError(null);
    setCodeError(null);
    setPinTone("idle");
    setPinExiting(false);
    setSentNotice(null);

    if (!emailValid) {
      // 형식 오류는 폼 emailError가 담당. 없을 때만 보조 문구.
      if (!emailError) {
        setSendError("이메일 형식으로 입력해주세요.");
      }
      return;
    }

    const requestedEmail = email;
    setRequesting(true);
    try {
      await requestEmailVerification(requestedEmail);
      if (currentEmailRef.current !== requestedEmail) return;

      setSent(true);
      setCode(Array(6).fill(""));
      setRemaining(EMAIL_CODE_TTL_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setSentNotice("인증번호를 발송했습니다. 이메일을 확인해주세요.");
      onVerifiedChange(false);
      window.requestAnimationFrame(() => codeInputRefs.current[0]?.focus());
    } catch (err) {
      if (currentEmailRef.current !== requestedEmail) return;

      setSendError(
        err instanceof ApiError
          ? err.message
          : "인증번호 발송에 실패했습니다.",
      );
    } finally {
      setRequesting(false);
    }
  }, [email, emailError, emailValid, onVerifiedChange]);

  const handleConfirm = useCallback(async (completedCode: string) => {
    if (confirmingRef.current) return;

    const requestedEmail = email;
    setCodeError(null);
    setSendError(null);
    setPinTone("checking");
    confirmingRef.current = true;
    setConfirming(true);
    try {
      await confirmEmailVerification(requestedEmail, completedCode);
      if (currentEmailRef.current !== requestedEmail) return;

      setPinTone("success");
      setSentNotice(null);
      setRemaining(0);
      successTimerRef.current = window.setTimeout(() => {
        setPinExiting(true);
        successTimerRef.current = null;
        exitTimerRef.current = window.setTimeout(() => {
          if (currentEmailRef.current === requestedEmail) {
            onVerifiedChange(true);
          }
          exitTimerRef.current = null;
        }, 300);
      }, 450);
    } catch (err) {
      if (currentEmailRef.current !== requestedEmail) return;

      onVerifiedChange(false);
      setPinTone("error");
      setCodeError(
        err instanceof ApiError
          ? err.message
          : "인증번호 확인에 실패했습니다.",
      );
    } finally {
      confirmingRef.current = false;
      setConfirming(false);
    }
  }, [email, onVerifiedChange]);

  const updateCode = useCallback(
    (nextCode: string[], focusIndex?: number) => {
      setCode(nextCode);
      setCodeError(null);
      setPinTone("idle");

      if (focusIndex !== undefined) {
        codeInputRefs.current[focusIndex]?.focus();
      }

      const completedCode = nextCode.join("");
      if (completedCode.length === 6) {
        void handleConfirm(completedCode);
      }
    },
    [handleConfirm],
  );

  const handleCodeChange = useCallback(
    (index: number, value: string) => {
      const digit = value.replace(/\D/g, "").slice(-1);
      const nextCode = [...code];
      nextCode[index] = digit;
      updateCode(nextCode, digit && index < 5 ? index + 1 : undefined);
    },
    [code, updateCode],
  );

  const handleCodeKeyDown = useCallback(
    (index: number): KeyboardEventHandler<HTMLInputElement> =>
      (event) => {
        if (event.key === "Backspace" && !code[index] && index > 0) {
          const nextCode = [...code];
          nextCode[index - 1] = "";
          updateCode(nextCode, index - 1);
        }
      },
    [code, updateCode],
  );

  const handleCodePaste: ClipboardEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const digits = event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);
      if (!digits) return;

      event.preventDefault();
      const nextCode = Array.from({ length: 6 }, (_, index) =>
        digits[index] ?? "",
      );
      updateCode(nextCode, Math.min(digits.length, 5));
    },
    [updateCode],
  );

  const handleCodeFocus = useCallback(
    (index: number, event: FocusEvent<HTMLInputElement>) => {
      if (index === 0 && pinTone === "error") {
        setCode(Array(6).fill(""));
        setCodeError(null);
        setPinTone("idle");
        return;
      }

      event.currentTarget.select();
    },
    [pinTone],
  );

  const emailFeedback = resolveEmailFeedback({
    emailError,
    sendError,
    verifyRequiredError,
    emailValid,
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
        disabled={emailVerified}
        className="disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:text-[var(--ink-muted)]"
        trailing={
          <Button
            type="button"
            variant="outline"
            className="!h-12 !w-[96px] shrink-0 whitespace-nowrap px-2 !text-[13px] tabular-nums"
            disabled={emailVerified || requesting || resendCooldown > 0}
            loading={requesting}
            onClick={handleRequest}
          >
            {sent && !emailVerified ? (
              resendCooldown > 0 ? (
                <span className="inline-flex items-center justify-center whitespace-nowrap leading-none">
                  <span>재전송(</span>
                  <span className="inline-block text-right">
                    {resendCooldown}
                  </span>
                  <span>초)</span>
                </span>
              ) : (
                "재전송"
              )
            ) : (
              "인증"
            )}
          </Button>
        }
        name={name}
        onChange={handleEmailChange}
        onBlur={onBlur}
        onFocus={onFocus}
        ref={inputRef}
      />

      {sent && !emailVerified ? (
        <div
          className={`${pinExiting ? "pin-field-exit" : "pin-field-enter"} flex flex-col gap-2`}
          aria-live="polite"
        >
          <div className="grid grid-cols-6 gap-2">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  codeInputRefs.current[index] = element;
                }}
                value={digit}
                onChange={(event) => handleCodeChange(index, event.target.value)}
                onKeyDown={handleCodeKeyDown(index)}
                onPaste={handleCodePaste}
                onFocus={(event) => handleCodeFocus(index, event)}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                disabled={confirming || pinTone === "success"}
                className={`h-12 min-w-0 rounded-lg border text-center text-lg font-semibold outline-none transition-[border-color,background-color,color] duration-300 focus:ring-1 disabled:cursor-wait ${
                  pinTone === "success"
                    ? "border-[var(--success)] bg-[var(--success-bg)] text-[var(--success-fg)]"
                    : pinTone === "error"
                      ? "border-[var(--danger)] bg-[var(--danger-bg)] text-[var(--danger)] focus:ring-0"
                      : pinTone === "checking"
                        ? "border-[var(--success)] bg-[var(--success-bg)] text-[var(--success-fg)]"
                        : "border-[var(--line)] bg-white text-[var(--ink)] focus:border-[var(--brand-blue)] focus:ring-[var(--brand-blue-soft)]"
                }`}
                aria-invalid={Boolean(codeError)}
                aria-label={`이메일 인증번호 ${index + 1}번째 자리`}
              />
            ))}
          </div>
          {pinTone === "success" ? (
            <p className="text-xs font-medium text-[var(--success-fg)]" role="status">
              인증번호가 확인되었습니다.
            </p>
          ) : codeError ? (
            <p className="text-xs text-[var(--danger)]" role="alert">
              {codeError} 처음 칸을 누르면 다시 입력할 수 있습니다.
            </p>
          ) : (
            <p className="text-xs text-[var(--ink-muted)]">
              {confirming
                ? "인증번호를 확인하고 있습니다."
                : `${timerPrefix} ${formatSeconds(remaining)}`}
              {!confirming && remaining === 0
                ? " · 만료되었습니다. 재전송해주세요."
                : ""}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
