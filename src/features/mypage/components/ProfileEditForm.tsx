"use client";
"use no memo";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { checkNicknameDuplicate } from "@/features/auth/api/nickname";
import { FormAlert } from "@/features/auth/components/shared/AuthFormChrome";
import { useAuth } from "@/features/auth/context/AuthProvider";
import { updateProfile } from "@/features/mypage/api/account";
import {
  createProfileImageUploadUrl,
  deleteProfileImage,
  PROFILE_IMAGE_ACCEPT,
  uploadProfileImageToStorage,
  validateProfileImage,
} from "@/features/mypage/api/profileImage";
import { ProfileAvatar } from "@/features/mypage/components/ProfileAvatar";
import { useAccountWithdrawal } from "@/features/mypage/hooks/useAccountSettings";
import {
  nicknameUpdateSchema,
  type NicknameUpdateFormValues,
} from "@/features/mypage/schemas/accountSchema";
import { ApiError } from "@/lib/api/client";
import type { UserProfile } from "@/types/user";

export function ProfileEditForm({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const withdrawal = useAccountWithdrawal();
  const form = useForm<NicknameUpdateFormValues>({
    resolver: zodResolver(nicknameUpdateSchema),
    mode: "onChange",
    defaultValues: { nickname: profile.nickname },
  });
  const nickname = useWatch({ control: form.control, name: "nickname" });

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ nickname }: NicknameUpdateFormValues) => {
      if (!accessToken) throw new Error("로그인이 필요합니다.");
      const nextNickname = nickname.trim();

      if (nextNickname !== profile.nickname) {
        const { duplicated } = await checkNicknameDuplicate(nextNickname);
        if (duplicated) {
          form.setError("nickname", {
            type: "server",
            message: "이미 사용 중인 닉네임입니다.",
          });
          throw new Error("닉네임을 다시 확인해주세요.");
        }
      }

      let profileImageKey: string | undefined;
      if (imageFile) {
        const upload = await createProfileImageUploadUrl(imageFile, accessToken);
        await uploadProfileImageToStorage(upload.uploadUrl, imageFile);
        profileImageKey = upload.objectKey;
      }

      if (nextNickname !== profile.nickname || profileImageKey) {
        await updateProfile(
          {
            ...(nextNickname !== profile.nickname
              ? { nickname: nextNickname }
              : {}),
            ...(profileImageKey ? { profileImageKey } : {}),
          },
          accessToken,
        );
      }
      if (removeImage && profile.profileImageKey) {
        await deleteProfileImage(accessToken);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      router.replace("/mypage");
    },
  });

  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const message = validateProfileImage(file);
    setImageError(message);
    if (message) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveImage(false);
    saveMutation.reset();
  };

  const resetImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setImageFile(null);
    setRemoveImage(true);
    setImageError(null);
    saveMutation.reset();
  };

  const shownImage = removeImage ? null : (previewUrl ?? profile.profileImageUrl);
  const errorMessage =
    saveMutation.error instanceof ApiError
      ? saveMutation.error.message
      : saveMutation.error?.message;

  return (
    <>
      <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))} noValidate>
        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,0.06)] sm:p-8">
          <h2 className="text-base font-bold text-[var(--ink)]">프로필 이미지</h2>
          <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
            <ProfileAvatar nickname={nickname || profile.nickname} profileImageUrl={shownImage} />
            <div className="text-center sm:text-left">
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                <Button type="button" variant="outline" className="!h-10 !w-auto" onClick={() => fileInputRef.current?.click()}>
                  이미지 변경
                </Button>
                <Button type="button" variant="outline" className="!h-10 !w-auto" disabled={!shownImage} onClick={resetImage}>
                  기본 이미지로
                </Button>
              </div>
              <p className="mt-3 text-sm text-[var(--ink-muted)]">PNG, JPG, WebP · 최대 5MB</p>
              {imageError ? <p className="mt-1 text-sm text-[var(--danger)]" role="alert">{imageError}</p> : null}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept={PROFILE_IMAGE_ACCEPT} className="sr-only" onChange={handleImage} />
        </section>

        <section className="mt-5 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,0.06)] sm:p-8">
          <h2 className="text-base font-bold text-[var(--ink)]">기본 정보</h2>
          <div className="mt-5 grid gap-5">
            <Input label="닉네임" placeholder="변경할 닉네임을 입력해주세요." error={form.formState.errors.nickname?.message} {...form.register("nickname", { onChange: () => saveMutation.reset() })} />
            <Input label="이메일" value={profile.email} disabled readOnly className="disabled:bg-[var(--surface-muted)]" />
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">비밀번호</p>
              <div className="mt-1.5 flex h-12 items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] px-3.5">
                <span className="text-[var(--ink-faint)]">••••••••</span>
                <button type="button" className="text-sm font-semibold text-[var(--brand-blue)]" onClick={() => router.push("/mypage/password")}>변경하기</button>
              </div>
            </div>
            <div className="flex justify-end border-t border-[var(--line)] pt-5">
              <button type="button" className="text-sm font-semibold text-[var(--danger)] underline-offset-4 hover:underline" onClick={() => setWithdrawOpen(true)}>
                계정 탈퇴 <span aria-hidden>›</span>
              </button>
            </div>
          </div>
        </section>

        {errorMessage ? <div className="mt-5"><FormAlert>{errorMessage}</FormAlert></div> : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" className="!w-auto" disabled={saveMutation.isPending} onClick={() => setCancelOpen(true)}>취소</Button>
          <Button type="submit" className="!w-auto" loading={saveMutation.isPending}>저장</Button>
        </div>
      </form>

      <Modal open={cancelOpen} title="수정을 취소하시겠어요?" onClose={() => setCancelOpen(false)}>
        <p>작성 중인 변경사항은 저장되지 않습니다.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" className="!w-auto" onClick={() => setCancelOpen(false)}>계속 작성</Button>
          <Button type="button" className="!w-auto" onClick={() => router.push("/mypage")}>수정 취소</Button>
        </div>
      </Modal>

      <Modal open={withdrawOpen} title="정말 탈퇴하시겠어요?🥺" onClose={() => !withdrawal.isPending && setWithdrawOpen(false)}>
        <p><strong className="text-[var(--ink)]">{profile.nickname}</strong> 계정은 탈퇴 후 복구할 수 없으며 모든 기기에서 로그아웃됩니다.</p>
        {withdrawal.error ? <div className="mt-4"><FormAlert>{withdrawal.error.message}</FormAlert></div> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" className="!w-auto" disabled={withdrawal.isPending} onClick={() => setWithdrawOpen(false)}>취소</Button>
          <Button type="button" className="!w-auto bg-[var(--danger)] hover:brightness-90" loading={withdrawal.isPending} onClick={() => withdrawal.mutate()}>탈퇴하기</Button>
        </div>
      </Modal>
    </>
  );
}
