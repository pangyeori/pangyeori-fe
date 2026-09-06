"use client";

import { useRef, useState, type ChangeEvent } from "react";

import {
  PROFILE_IMAGE_ACCEPT,
  validateProfileImage,
} from "@/features/mypage/api/profileImage";
import { ProfileAvatar } from "@/features/mypage/components/ProfileAvatar";
import { useProfileImage } from "@/features/mypage/hooks/useProfileImage";

type ProfileImageEditorProps = {
  nickname: string;
  profileImageUrl: string | null;
};

export function ProfileImageEditor({
  nickname,
  profileImageUrl,
}: ProfileImageEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const { uploadMutation, deleteMutation } = useProfileImage();
  const isPending = uploadMutation.isPending || deleteMutation.isPending;
  const mutationError = uploadMutation.error ?? deleteMutation.error;
  const message = clientError ?? mutationError?.message ?? null;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    uploadMutation.reset();
    deleteMutation.reset();
    const validationMessage = validateProfileImage(file);
    setClientError(validationMessage);
    if (!validationMessage) uploadMutation.mutate(file);
  };

  const handleDelete = () => {
    setClientError(null);
    uploadMutation.reset();
    deleteMutation.reset();
    deleteMutation.mutate();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <ProfileAvatar
          key={profileImageUrl ?? "default-profile"}
          nickname={nickname}
          profileImageUrl={profileImageUrl}
        />
        {isPending ? (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs font-semibold text-white"
            role="status"
          >
            처리 중…
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PROFILE_IMAGE_ACCEPT}
        className="sr-only"
        aria-label="프로필 이미지 파일 선택"
        disabled={isPending}
        onChange={handleFileChange}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-blue)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          onClick={() => {
            setClientError(null);
            uploadMutation.reset();
            deleteMutation.reset();
            inputRef.current?.click();
          }}
        >
          {profileImageUrl ? "이미지 변경" : "이미지 등록"}
        </button>
        {profileImageUrl ? (
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={handleDelete}
          >
            삭제
          </button>
        ) : null}
      </div>
      <p className="text-center text-xs text-[var(--ink-muted)]">
        PNG, JPG, WebP · 최대 5MB
      </p>
      <div className="min-h-5 max-w-64 text-center" aria-live="polite">
        {message ? (
          <p className="text-xs font-medium text-[var(--danger)]" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
