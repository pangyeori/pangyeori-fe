"use client";
"use no memo";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormAlert } from "@/features/auth/components/shared/AuthFormChrome";
import { usePasswordVerification } from "@/features/mypage/hooks/useAccountSettings";
import {
  passwordVerificationSchema,
  type PasswordVerificationFormValues,
} from "@/features/mypage/schemas/accountSchema";
import { ApiError } from "@/lib/api/client";

export function PasswordVerificationForm() {
  const router = useRouter();
  const mutation = usePasswordVerification();
  const form = useForm<PasswordVerificationFormValues>({
    resolver: zodResolver(passwordVerificationSchema),
    defaultValues: { currentPassword: "" },
  });
  const serverError =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error?.message;

  return (
    <form
      className="mx-auto max-w-xl"
      onSubmit={form.handleSubmit((values) =>
        mutation.mutate(values, {
          onSuccess: () => router.replace("/mypage/edit"),
        }),
      )}
      noValidate
    >
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,0.06)] sm:p-8">
        <div className="mb-6 rounded-xl border border-[var(--brand-blue-soft)] bg-[var(--surface-muted)] px-4 py-3.5">
          <p className="text-sm font-semibold text-[var(--ink)]">
            안전한 정보 변경을 위한 확인 단계입니다
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
            로그인할 때 사용한 현재 비밀번호를 입력해주세요.
          </p>
        </div>

        <PasswordInput
          label="현재 비밀번호"
          autoComplete="current-password"
          placeholder="현재 비밀번호를 입력해주세요."
          autoFocus
          error={form.formState.errors.currentPassword?.message}
          {...form.register("currentPassword", {
            onChange: () => mutation.reset(),
          })}
        />
      </section>

      {serverError ? (
        <div className="mt-5">
          <FormAlert>{serverError}</FormAlert>
        </div>
      ) : null}

      <div className="mt-6 flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          className="!w-auto"
          disabled={mutation.isPending}
          onClick={() => router.replace("/mypage")}
        >
          취소
        </Button>
        <Button type="submit" className="!w-auto" loading={mutation.isPending}>
          확인 후 계속
        </Button>
      </div>
    </form>
  );
}
