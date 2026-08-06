"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { signOutRequest } from "@/features/auth/api/signOut";
import { useAuth } from "@/features/auth/context/AuthProvider";

export function useSignOut() {
  const router = useRouter();
  const { accessToken, clearAuth } = useAuth();

  return useMutation({
    mutationFn: async () => {
      try {
        await signOutRequest(accessToken);
      } catch {
        // 서버 로그아웃 실패해도 로컬 세션은 제거한다.
      }
    },
    onSettled: () => {
      clearAuth();
      router.push("/signin");
    },
  });
}
