"use client";

import { Button } from "@/components/ui/Button";

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 4C7.03 4 3 7.13 3 11c0 2.45 1.6 4.6 4.02 5.84-.17.62-.61 2.25-.7 2.6-.1.4.15.4.31.29.13-.09 2.1-1.42 2.95-2.01.76.11 1.56.18 2.42.18 4.97 0 9-3.13 9-7S16.97 4 12 4Z"
      />
    </svg>
  );
}

type KakaoAuthButtonProps = {
  label: string;
  pendingMessage?: string;
};

export function KakaoAuthButton({
  label,
  pendingMessage = "카카오 연동은 준비 중입니다.",
}: KakaoAuthButtonProps) {
  return (
    <Button
      type="button"
      variant="kakao"
      onClick={() => {
        window.alert(pendingMessage);
      }}
    >
      <KakaoIcon />
      {label}
    </Button>
  );
}
