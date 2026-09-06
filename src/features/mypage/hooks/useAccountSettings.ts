"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthProvider";
import {
  changePassword,
  type ChangePasswordRequest,
} from "@/features/mypage/api/account";

function useFinishSession() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clearAuth } = useAuth();

  return () => {
    clearAuth();
    queryClient.clear();
    router.replace("/signin?reason=password-changed");
  };
}

export function usePasswordChange() {
  const { accessToken } = useAuth();
  const finishSession = useFinishSession();

  return useMutation({
    mutationFn: async (body: ChangePasswordRequest) => {
      if (!accessToken) throw new Error("로그인이 필요합니다.");
      await changePassword(body, accessToken);
    },
    onSuccess: finishSession,
  });
}
