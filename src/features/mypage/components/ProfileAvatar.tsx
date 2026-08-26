"use client";

import { useState } from "react";

type ProfileAvatarProps = {
  nickname: string;
  profileImageUrl: string | null;
};

function DefaultProfileIcon() {
  return (
    <svg
      viewBox="0 0 96 96"
      aria-hidden="true"
      className="h-full w-full text-[var(--ink-faint)]"
    >
      <circle cx="48" cy="35" r="17" fill="currentColor" />
      <path
        d="M18 86c2.6-19 13.8-29 30-29s27.4 10 30 29"
        fill="currentColor"
      />
    </svg>
  );
}

export function ProfileAvatar({
  nickname,
  profileImageUrl,
}: ProfileAvatarProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const shouldShowImage = Boolean(profileImageUrl) && !hasImageError;

  return (
    <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-muted)] ring-1 ring-[var(--line)] sm:size-32">
      {shouldShowImage ? (
        // 외부 이미지 호스트가 정해지지 않아 브라우저 기본 이미지 로딩을 사용한다.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profileImageUrl ?? undefined}
          alt={`${nickname}님의 프로필`}
          className="h-full w-full object-cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <DefaultProfileIcon />
      )}
    </div>
  );
}
