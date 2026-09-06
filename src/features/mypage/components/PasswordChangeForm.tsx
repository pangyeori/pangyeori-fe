"use client";
"use no memo";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormAlert } from "@/features/auth/components/shared/AuthFormChrome";
import { usePasswordChange } from "@/features/mypage/hooks/useAccountSettings";
import {
  passwordChangeSchema,
  type PasswordChangeFormValues,
} from "@/features/mypage/schemas/accountSchema";
import { ApiError } from "@/lib/api/client";

export function PasswordChangeForm() {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const mutation = usePasswordChange();
  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      newPasswordConfirm: "",
    },
  });
  const serverError =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error?.message;

  return (
    <>
      <form
        onSubmit={form.handleSubmit((values) => {
          mutation.reset();
          mutation.mutate({
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
          });
        })}
        noValidate
      >
        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,0.06)] sm:p-8">
          <div
            className="mb-6 rounded-xl border border-[var(--brand-blue-soft)] bg-[var(--surface-muted)] px-4 py-3.5"
            role="note"
          >
            <p className="text-sm font-semibold text-[var(--ink)]">
              변경 후 다시 로그인이 필요합니다
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
              비밀번호를 변경하면 보안을 위해 모든 기기에서 로그아웃됩니다.
              새 비밀번호로 다시 로그인해주세요.
            </p>
          </div>

          <div className="grid gap-5">
            <PasswordInput
              label="현재 비밀번호"
              autoComplete="current-password"
              placeholder="본인 확인을 위해 현재 비밀번호를 입력해주세요."
              error={form.formState.errors.currentPassword?.message}
              {...form.register("currentPassword", {
                onChange: () => mutation.reset(),
              })}
            />
            <div>
              <PasswordInput
                label="새 비밀번호"
                autoComplete="new-password"
                placeholder="새 비밀번호를 입력해주세요."
                error={form.formState.errors.newPassword?.message}
                {...form.register("newPassword", {
                  onChange: () => mutation.reset(),
                })}
              />
              <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                8~64자이며 특수문자를 1개 이상 포함해주세요.
              </p>
            </div>
            <PasswordInput
              label="새 비밀번호 확인"
              autoComplete="new-password"
              placeholder="새 비밀번호를 다시 입력해주세요."
              error={form.formState.errors.newPasswordConfirm?.message}
              {...form.register("newPasswordConfirm", {
                onChange: () => mutation.reset(),
              })}
            />
          </div>
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
            onClick={() => setCancelOpen(true)}
          >
            취소
          </Button>
          <Button type="submit" className="!w-auto" loading={mutation.isPending}>
            변경하고 로그아웃
          </Button>
        </div>
      </form>

      <Modal
        open={cancelOpen}
        title="비밀번호 변경을 취소하시겠어요?"
        onClose={() => setCancelOpen(false)}
      >
        <p>입력한 내용은 저장되지 않습니다.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" className="!w-auto" onClick={() => setCancelOpen(false)}>
            계속 작성
          </Button>
          <Button type="button" className="!w-auto" onClick={() => router.push("/mypage")}>
            변경 취소
          </Button>
        </div>
      </Modal>
    </>
  );
}
