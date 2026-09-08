"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import {
  PROFILE_IMAGE_ACCEPT,
  validateProfileImage,
} from "@/features/mypage/api/profileImage";
import { ProfileImageCropDialog } from "@/features/mypage/components/ProfileImageCropDialog";
import { ProfileAvatar } from "@/features/mypage/components/ProfileAvatar";
import { useProfileImage } from "@/features/mypage/hooks/useProfileImage";

type ProfileImageEditorProps = {
  compact?: boolean;
  nickname: string;
  profileImageUrl: string | null;
};

export function ProfileImageEditor({
  nickname,
  profileImageUrl,
  compact = false,
}: ProfileImageEditorProps) {
  const [source, setSource] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const saveLock = useRef(false);
  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source);
    },
    [source],
  );
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
    setSaved(false);
    if (!validationMessage) setSource(URL.createObjectURL(file));
  };

  const handleDelete = () => {
    setClientError(null);
    uploadMutation.reset();
    deleteMutation.reset();
    deleteMutation.mutate();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        aria-label="프로필 이미지 변경"
        aria-haspopup="dialog"
        disabled={isPending}
        onClick={() => {
          setClientError(null);
          setSaved(false);
          uploadMutation.reset();
          deleteMutation.reset();
          inputRef.current?.click();
        }}
        className="group relative shrink-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand-blue)] disabled:cursor-wait"
      >
        <ProfileAvatar
          key={profileImageUrl ?? "default-profile"}
          nickname={nickname}
          profileImageUrl={profileImageUrl}
        />
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/55 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100 [@media(hover:none)]:bg-black/25">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M4 6h4l2-3h4l2 3h4v14H4z" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="4" />
          </svg>
          사진 변경
        </span>
        {isPending ? (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs font-semibold text-white"
            role="status"
          >
            처리 중…
          </div>
        ) : null}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={PROFILE_IMAGE_ACCEPT}
        className="sr-only"
        aria-label="프로필 이미지 파일 선택"
        disabled={isPending}
        onChange={handleFileChange}
      />
      {!compact ? (
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
      ) : null}
      {!compact ? (
        <p className="text-center text-xs text-[var(--ink-muted)]">
          PNG, JPG, WebP · 최대 5MB
        </p>
      ) : null}
      <div
        className={`${compact ? "" : "min-h-5"} max-w-64 text-center`}
        aria-live="polite"
      >
        {saved ? (
          <p className="text-xs text-[var(--ink-muted)]">
            프로필 이미지를 변경했습니다.
          </p>
        ) : null}
        {message && !source ? (
          <p className="text-xs font-medium text-[var(--danger)]" role="alert">
            {message}
          </p>
        ) : null}
      </div>
      {source ? (
        <ProfileImageCropDialog
          key={source}
          source={source}
          saving={isPending}
          error={mutationError?.message ?? null}
          onClose={() => {
            if (!saveLock.current) {
              setSource(null);
              uploadMutation.reset();
            }
          }}
          onEdit={() => uploadMutation.reset()}
          onSave={(file) => {
            if (saveLock.current) return;
            saveLock.current = true;
            uploadMutation.mutate(file, {
              onSuccess: () => {
                setSource(null);
                setSaved(true);
              },
              onSettled: () => {
                saveLock.current = false;
              },
            });
          }}
        />
      ) : null}
    </div>
  );
}
